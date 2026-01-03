import { createServiceClient } from "@/lib/supabase/server";
import type {
  DNALayer,
  ExtendedDNATrait,
  ExtendedTraitKey,
  TriggerCondition,
  TraitModifier,
  BehavioralProfile,
  BehavioralProfileType,
  CharacterBehavioralState,
  TraitEvolutionEvent,
  DNAExplainability,
  EvolutionReasoning,
  SafetyCheckResult,
  EXTENDED_TRAIT_DEFINITIONS,
  BEHAVIORAL_PROFILES,
  SAFETY_RULES,
} from "@/lib/types/extended-dna";

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export class ExtendedDNAService {
  private supabase: Awaited<ReturnType<typeof createServiceClient>> | null = null;

  private async getClient() {
    if (!this.supabase) {
      this.supabase = await createServiceClient();
    }
    return this.supabase;
  }

  async initializeExtendedDNA(
    characterId: string,
    layer?: DNALayer
  ): Promise<ServiceResult<ExtendedDNATrait[]>> {
    const client = await this.getClient();
    const { EXTENDED_TRAIT_DEFINITIONS } = await import("@/lib/types/extended-dna");

    const traitsToInsert = layer
      ? EXTENDED_TRAIT_DEFINITIONS.filter(t => t.layer === layer)
      : EXTENDED_TRAIT_DEFINITIONS;

    const inserts = traitsToInsert.map(t => ({
      character_id: characterId,
      layer: t.layer,
      category: this.layerToCategory(t.layer),
      domain: this.layerToDomain(t.layer),
      trait_key: t.traitKey,
      trait_value: t.traitValue,
      influence_weight: t.influenceStrength,
      resistance: t.resistance,
      volatility: t.volatility,
      min_value: t.minValue,
      max_value: t.maxValue,
      baseline_value: t.baselineValue,
      current_modifier: 0,
      trigger_conditions: t.triggerConditions,
      decay_rate: t.decayRate,
      reinforcement_multiplier: t.reinforcementMultiplier,
      label: t.label,
      description: t.description,
      opposites: t.opposites,
      safety_flags: t.safetyFlags,
      is_locked: false,
    }));

    const { data, error } = await client
      .from("dna_traits")
      .insert(inserts)
      .select();

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    await this.initializeBehavioralState(characterId);

    return { success: true, data: (data || []).map(this.mapToExtendedTrait) };
  }

  async getExtendedTraits(
    characterId: string,
    layer?: DNALayer
  ): Promise<ServiceResult<ExtendedDNATrait[]>> {
    const client = await this.getClient();

    let query = client
      .from("dna_traits")
      .select("*")
      .eq("character_id", characterId);

    if (layer) {
      query = query.eq("layer", layer);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true, data: (data || []).map(this.mapToExtendedTrait) };
  }

  async applyTraitDecay(characterId: string): Promise<ServiceResult<TraitEvolutionEvent[]>> {
    const client = await this.getClient();

    const { data: traits } = await client
      .from("dna_traits")
      .select("*")
      .eq("character_id", characterId)
      .eq("is_locked", false);

    if (!traits || traits.length === 0) {
      return { success: true, data: [] };
    }

    const events: TraitEvolutionEvent[] = [];
    const now = new Date();

    for (const trait of traits) {
      const lastDecay = trait.last_decay_at ? new Date(trait.last_decay_at) : null;
      const hoursSinceDecay = lastDecay
        ? (now.getTime() - lastDecay.getTime()) / (1000 * 60 * 60)
        : 24;

      if (hoursSinceDecay < 1) continue;

      const decayRate = Number(trait.decay_rate);
      const currentValue = Number(trait.trait_value);
      const baselineValue = Number(trait.baseline_value);

      if (Math.abs(currentValue - baselineValue) < 1) continue;

      const direction = currentValue > baselineValue ? -1 : 1;
      const decayAmount = decayRate * hoursSinceDecay * direction;
      let newValue = currentValue + decayAmount;

      if ((direction === -1 && newValue < baselineValue) ||
          (direction === 1 && newValue > baselineValue)) {
        newValue = baselineValue;
      }

      newValue = Math.max(Number(trait.min_value), Math.min(Number(trait.max_value), newValue));

      await client
        .from("dna_traits")
        .update({
          trait_value: newValue,
          last_decay_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", trait.id);

      const event = await this.logEvolutionEvent(characterId, trait.id, {
        eventType: "decay",
        previousValue: currentValue,
        newValue,
        modifier: decayAmount,
        source: "natural_decay",
        isReversible: true,
        reasoningData: {
          primaryFactors: ["Time-based decay toward baseline"],
          contributingTraits: [],
          memoriesReferenced: [],
          safetyChecks: [],
          confidenceScore: 1.0,
        },
      });

      if (event.data) {
        events.push(event.data);
      }
    }

    return { success: true, data: events };
  }

  async reinforceTrait(
    characterId: string,
    traitKey: string,
    strength: number,
    source: string,
    sourceReferenceId?: string
  ): Promise<ServiceResult<TraitEvolutionEvent>> {
    const client = await this.getClient();

    const { data: trait } = await client
      .from("dna_traits")
      .select("*")
      .eq("character_id", characterId)
      .eq("trait_key", traitKey)
      .single();

    if (!trait) {
      return { success: false, error: "Trait not found", code: "NOT_FOUND" };
    }

    if (trait.is_locked) {
      return { success: false, error: "Trait is locked", code: "LOCKED" };
    }

    const multiplier = Number(trait.reinforcement_multiplier);
    const resistance = Number(trait.resistance);
    const volatility = Number(trait.volatility);
    const currentValue = Number(trait.trait_value);

    const effectiveStrength = strength * multiplier * (1 - resistance) * (1 + volatility * 0.5);
    const newValue = Math.max(
      Number(trait.min_value),
      Math.min(Number(trait.max_value), currentValue + effectiveStrength)
    );

    await client
      .from("dna_traits")
      .update({
        trait_value: newValue,
        last_reinforcement_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", trait.id);

    return this.logEvolutionEvent(characterId, trait.id, {
      eventType: "reinforcement",
      previousValue: currentValue,
      newValue,
      modifier: effectiveStrength,
      source,
      sourceReferenceId,
      isReversible: true,
      reasoningData: {
        primaryFactors: [`Reinforcement from ${source}`],
        contributingTraits: [{ traitKey, value: currentValue, contribution: effectiveStrength }],
        memoriesReferenced: [],
        safetyChecks: [],
        confidenceScore: 0.9,
      },
    });
  }

  async evaluateTriggers(
    characterId: string,
    context: {
      emotionalState?: string;
      stressLevel?: number;
      interactionType?: string;
      contextTags?: string[];
      memoryRecall?: string;
    }
  ): Promise<ServiceResult<TraitEvolutionEvent[]>> {
    const client = await this.getClient();

    const { data: traits } = await client
      .from("dna_traits")
      .select("*")
      .eq("character_id", characterId);

    if (!traits) {
      return { success: true, data: [] };
    }

    const events: TraitEvolutionEvent[] = [];

    for (const trait of traits) {
      const triggers = trait.trigger_conditions as TriggerCondition[];
      if (!triggers || triggers.length === 0) continue;

      for (const trigger of triggers) {
        const triggered = this.evaluateTriggerCondition(trigger, context);
        if (!triggered) continue;

        const volatility = Number(trait.volatility);
        const magnitude = volatility * 5;
        const currentValue = Number(trait.trait_value);

        let adjustment = 0;
        if (trigger.type === "stress_level" && trigger.operator === "gt") {
          adjustment = -magnitude;
        } else if (trigger.type === "emotional_state") {
          adjustment = magnitude;
        } else {
          adjustment = magnitude * 0.5;
        }

        const newValue = Math.max(
          Number(trait.min_value),
          Math.min(Number(trait.max_value), currentValue + adjustment)
        );

        if (Math.abs(newValue - currentValue) > 0.1) {
          await client
            .from("dna_traits")
            .update({
              trait_value: newValue,
              updated_at: new Date().toISOString(),
            })
            .eq("id", trait.id);

          const event = await this.logEvolutionEvent(characterId, trait.id, {
            eventType: "trigger_response",
            previousValue: currentValue,
            newValue,
            modifier: adjustment,
            source: "trigger_evaluation",
            triggerConditionsMet: [trigger],
            isReversible: true,
            reasoningData: {
              primaryFactors: [`Trigger: ${trigger.type} ${trigger.operator} ${trigger.value}`],
              contributingTraits: [{ traitKey: trait.trait_key, value: currentValue, contribution: adjustment }],
              memoriesReferenced: [],
              safetyChecks: [],
              confidenceScore: 0.85,
            },
          });

          if (event.data) {
            events.push(event.data);
          }
        }
      }
    }

    return { success: true, data: events };
  }

  async applyBehavioralProfile(
    characterId: string,
    userId: string,
    profileType: BehavioralProfileType
  ): Promise<ServiceResult<BehavioralProfile>> {
    const client = await this.getClient();
    const { BEHAVIORAL_PROFILES } = await import("@/lib/types/extended-dna");

    const profileTemplate = BEHAVIORAL_PROFILES.find(p => p.type === profileType);
    if (!profileTemplate) {
      return { success: false, error: "Profile not found", code: "NOT_FOUND" };
    }

    const safetyCheck = this.validateProfileSafety(profileTemplate);
    if (!safetyCheck.passed) {
      return { success: false, error: safetyCheck.message, code: "SAFETY_VIOLATION" };
    }

    const { data: profile, error: profileError } = await client
      .from("behavioral_profiles")
      .insert({
        character_id: characterId,
        profile_type: profileType,
        name: profileTemplate.name,
        description: profileTemplate.description,
        safety_disclaimer: profileTemplate.safetyDisclaimer,
        trait_adjustments: profileTemplate.traitAdjustments,
        trigger_patterns: profileTemplate.triggerPatterns,
        coping_behaviors: profileTemplate.copingBehaviors,
        is_reversible: profileTemplate.isReversible,
        is_non_medical: profileTemplate.isNonMedical,
        application_mode: profileTemplate.applicationMode,
        applied_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (profileError) {
      return { success: false, error: profileError.message, code: "DB_ERROR" };
    }

    for (const adjustment of profileTemplate.traitAdjustments) {
      const { data: trait } = await client
        .from("dna_traits")
        .select("*")
        .eq("character_id", characterId)
        .eq("trait_key", adjustment.traitKey)
        .single();

      if (!trait || trait.is_locked) continue;

      let newValue = Number(trait.trait_value);
      if (adjustment.adjustmentType === "relative") {
        newValue += adjustment.value;
      } else if (adjustment.adjustmentType === "absolute") {
        newValue = adjustment.value;
      } else if (adjustment.adjustmentType === "range_shift") {
        newValue += adjustment.value;
      }

      newValue = Math.max(Number(trait.min_value), Math.min(Number(trait.max_value), newValue));

      const updates: Record<string, unknown> = {
        trait_value: newValue,
        updated_at: new Date().toISOString(),
      };

      if (adjustment.volatilityModifier !== undefined) {
        updates.volatility = Math.min(0.8, Number(trait.volatility) + adjustment.volatilityModifier);
      }

      if (adjustment.resistanceModifier !== undefined) {
        updates.resistance = Math.max(0, Math.min(1, Number(trait.resistance) + adjustment.resistanceModifier));
      }

      await client.from("dna_traits").update(updates).eq("id", trait.id);

      await client.from("trait_modifiers").insert({
        character_id: characterId,
        trait_id: trait.id,
        modifier_type: "profile_based",
        value: adjustment.value,
        source: "behavioral_profile",
        source_reference_id: profile.id,
        is_active: true,
      });

      await this.logEvolutionEvent(characterId, trait.id, {
        eventType: "profile_application",
        previousValue: Number(trait.trait_value),
        newValue,
        modifier: adjustment.value,
        source: "behavioral_profile",
        sourceReferenceId: profile.id,
        isReversible: profileTemplate.isReversible,
        reasoningData: {
          primaryFactors: [`Applied ${profileTemplate.name}`],
          contributingTraits: [],
          memoriesReferenced: [],
          safetyChecks: [safetyCheck],
          confidenceScore: 1.0,
        },
      });
    }

    await this.updateBehavioralState(characterId, {
      addProfile: profile.id,
    });

    return { success: true, data: this.mapToBehavioralProfile(profile) };
  }

  async removeBehavioralProfile(
    characterId: string,
    profileId: string
  ): Promise<ServiceResult<void>> {
    const client = await this.getClient();

    const { data: profile } = await client
      .from("behavioral_profiles")
      .select("*")
      .eq("id", profileId)
      .eq("character_id", characterId)
      .single();

    if (!profile) {
      return { success: false, error: "Profile not found", code: "NOT_FOUND" };
    }

    if (!profile.is_reversible) {
      return { success: false, error: "Profile is not reversible", code: "NOT_REVERSIBLE" };
    }

    const { data: modifiers } = await client
      .from("trait_modifiers")
      .select("*")
      .eq("source_reference_id", profileId)
      .eq("source", "behavioral_profile");

    for (const modifier of modifiers || []) {
      const { data: trait } = await client
        .from("dna_traits")
        .select("*")
        .eq("id", modifier.trait_id)
        .single();

      if (trait && !trait.is_locked) {
        const revertedValue = Math.max(
          Number(trait.min_value),
          Math.min(Number(trait.max_value), Number(trait.trait_value) - Number(modifier.value))
        );

        await client
          .from("dna_traits")
          .update({ trait_value: revertedValue, updated_at: new Date().toISOString() })
          .eq("id", trait.id);
      }
    }

    await client.from("trait_modifiers").delete().eq("source_reference_id", profileId);
    await client.from("behavioral_profiles").update({ is_active: false }).eq("id", profileId);

    await this.updateBehavioralState(characterId, {
      removeProfile: profileId,
    });

    return { success: true };
  }

  async getBehavioralState(characterId: string): Promise<ServiceResult<CharacterBehavioralState>> {
    const client = await this.getClient();

    const { data, error } = await client
      .from("character_behavioral_state")
      .select("*")
      .eq("character_id", characterId)
      .single();

    if (error || !data) {
      const initResult = await this.initializeBehavioralState(characterId);
      return initResult;
    }

    return { success: true, data: this.mapToBehavioralState(data) };
  }

  async updateStressLevel(
    characterId: string,
    stressChange: number,
    source: string
  ): Promise<ServiceResult<CharacterBehavioralState>> {
    const client = await this.getClient();

    const stateResult = await this.getBehavioralState(characterId);
    if (!stateResult.success || !stateResult.data) {
      return stateResult;
    }

    const currentStress = stateResult.data.currentStressLevel;
    const newStress = Math.max(0, Math.min(100, currentStress + stressChange));

    await client
      .from("character_behavioral_state")
      .update({
        current_stress_level: newStress,
        last_state_update: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("character_id", characterId);

    if (Math.abs(newStress - currentStress) > 10) {
      await this.evaluateTriggers(characterId, { stressLevel: newStress });
    }

    return this.getBehavioralState(characterId);
  }

  async generateExplainability(
    characterId: string,
    actionId: string,
    behaviorExplained: string
  ): Promise<ServiceResult<DNAExplainability>> {
    const client = await this.getClient();

    const [traitsResult, stateResult, profilesResult] = await Promise.all([
      this.getExtendedTraits(characterId),
      this.getBehavioralState(characterId),
      client.from("behavioral_profiles").select("*").eq("character_id", characterId).eq("is_active", true),
    ]);

    const traits = traitsResult.data || [];
    const state = stateResult.data;
    const profiles = profilesResult.data || [];

    const layerContributions = this.calculateLayerContributions(traits);
    const traitInfluences = this.calculateTraitInfluences(traits);
    const profileEffects = profiles.map(p => ({
      profileId: p.id,
      profileType: p.profile_type as BehavioralProfileType,
      effectDescription: p.description,
      traitsAffected: (p.trait_adjustments as Array<{ traitKey: string }>).map(a => a.traitKey),
      intensity: 1.0,
    }));

    const safetyBoundaries = this.checkSafetyBoundaries(traits);

    const explainability: DNAExplainability = {
      characterId,
      actionId,
      timestamp: new Date().toISOString(),
      behaviorExplained,
      contributingLayers: layerContributions,
      traitInfluences,
      activeProfileEffects: profileEffects,
      triggerChain: [],
      memoryInfluences: [],
      safetyBoundaries,
      simulationDisclaimer: "This is a simulated behavioral pattern for fictional characters only. It does not represent any real medical or psychological condition.",
    };

    await client.from("dna_explainability_log").insert({
      character_id: characterId,
      action_id: actionId,
      behavior_explained: behaviorExplained,
      contributing_layers: layerContributions,
      trait_influences: traitInfluences,
      active_profile_effects: profileEffects,
      trigger_chain: [],
      memory_influences: [],
      safety_boundaries: safetyBoundaries,
      simulation_disclaimer: explainability.simulationDisclaimer,
    });

    return { success: true, data: explainability };
  }

  async addTemporaryModifier(
    characterId: string,
    traitKey: string,
    value: number,
    durationMs: number,
    source: string
  ): Promise<ServiceResult<TraitModifier>> {
    const client = await this.getClient();

    const { data: trait } = await client
      .from("dna_traits")
      .select("*")
      .eq("character_id", characterId)
      .eq("trait_key", traitKey)
      .single();

    if (!trait) {
      return { success: false, error: "Trait not found", code: "NOT_FOUND" };
    }

    const expiresAt = new Date(Date.now() + durationMs).toISOString();

    const { data: modifier, error } = await client
      .from("trait_modifiers")
      .insert({
        character_id: characterId,
        trait_id: trait.id,
        modifier_type: "temporary",
        value,
        source,
        expires_at: expiresAt,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    const newValue = Math.max(
      Number(trait.min_value),
      Math.min(Number(trait.max_value), Number(trait.trait_value) + value)
    );

    await client
      .from("dna_traits")
      .update({
        trait_value: newValue,
        current_modifier: Number(trait.current_modifier) + value,
        updated_at: new Date().toISOString(),
      })
      .eq("id", trait.id);

    return { success: true, data: this.mapToTraitModifier(modifier) };
  }

  async cleanupExpiredModifiers(characterId: string): Promise<ServiceResult<number>> {
    const client = await this.getClient();

    const { data: expiredModifiers } = await client
      .from("trait_modifiers")
      .select("*")
      .eq("character_id", characterId)
      .eq("is_active", true)
      .lt("expires_at", new Date().toISOString());

    if (!expiredModifiers || expiredModifiers.length === 0) {
      return { success: true, data: 0 };
    }

    for (const modifier of expiredModifiers) {
      const { data: trait } = await client
        .from("dna_traits")
        .select("*")
        .eq("id", modifier.trait_id)
        .single();

      if (trait) {
        const revertedValue = Math.max(
          Number(trait.min_value),
          Math.min(Number(trait.max_value), Number(trait.trait_value) - Number(modifier.value))
        );

        await client
          .from("dna_traits")
          .update({
            trait_value: revertedValue,
            current_modifier: Math.max(0, Number(trait.current_modifier) - Number(modifier.value)),
            updated_at: new Date().toISOString(),
          })
          .eq("id", trait.id);
      }

      await client
        .from("trait_modifiers")
        .update({ is_active: false })
        .eq("id", modifier.id);
    }

    return { success: true, data: expiredModifiers.length };
  }

  private async initializeBehavioralState(characterId: string): Promise<ServiceResult<CharacterBehavioralState>> {
    const client = await this.getClient();

    const { data, error } = await client
      .from("character_behavioral_state")
      .insert({
        character_id: characterId,
        active_profiles: [],
        current_stress_level: 50,
        current_emotional_state: {
          primary: "neutral",
          intensity: 50,
          valence: 0,
          arousal: 50,
          dominance: 50,
          secondary: [],
          stability: 70,
        },
        recent_triggers: [],
        active_modifiers: [],
        coping_in_progress: [],
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        const { data: existing } = await client
          .from("character_behavioral_state")
          .select("*")
          .eq("character_id", characterId)
          .single();
        if (existing) {
          return { success: true, data: this.mapToBehavioralState(existing) };
        }
      }
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true, data: this.mapToBehavioralState(data) };
  }

  private async updateBehavioralState(
    characterId: string,
    updates: {
      addProfile?: string;
      removeProfile?: string;
      stressLevel?: number;
      emotionalState?: Record<string, unknown>;
    }
  ): Promise<void> {
    const client = await this.getClient();

    const { data: state } = await client
      .from("character_behavioral_state")
      .select("*")
      .eq("character_id", characterId)
      .single();

    if (!state) return;

    const updateData: Record<string, unknown> = {
      last_state_update: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (updates.addProfile) {
      const profiles = [...(state.active_profiles || []), updates.addProfile];
      updateData.active_profiles = profiles;
    }

    if (updates.removeProfile) {
      const profiles = (state.active_profiles || []).filter((p: string) => p !== updates.removeProfile);
      updateData.active_profiles = profiles;
    }

    if (updates.stressLevel !== undefined) {
      updateData.current_stress_level = updates.stressLevel;
    }

    if (updates.emotionalState) {
      updateData.current_emotional_state = { ...state.current_emotional_state, ...updates.emotionalState };
    }

    await client
      .from("character_behavioral_state")
      .update(updateData)
      .eq("character_id", characterId);
  }

  private async logEvolutionEvent(
    characterId: string,
    traitId: string,
    event: Omit<TraitEvolutionEvent, "id" | "characterId" | "traitId" | "createdAt">
  ): Promise<ServiceResult<TraitEvolutionEvent>> {
    const client = await this.getClient();

    const { data, error } = await client
      .from("trait_evolution_events")
      .insert({
        character_id: characterId,
        trait_id: traitId,
        event_type: event.eventType,
        previous_value: event.previousValue,
        new_value: event.newValue,
        modifier: event.modifier,
        source: event.source,
        source_reference_id: event.sourceReferenceId || null,
        trigger_conditions_met: event.triggerConditionsMet || [],
        reasoning_data: event.reasoningData,
        is_reversible: event.isReversible,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true, data: this.mapToEvolutionEvent(data) };
  }

  private evaluateTriggerCondition(
    trigger: TriggerCondition,
    context: Record<string, unknown>
  ): boolean {
    const contextValue = context[trigger.type.replace("_level", "Level").replace("_state", "State")];

    switch (trigger.operator) {
      case "gt":
        return typeof contextValue === "number" && contextValue > (trigger.value as number);
      case "lt":
        return typeof contextValue === "number" && contextValue < (trigger.value as number);
      case "eq":
        return contextValue === trigger.value;
      case "contains":
        if (typeof contextValue === "string") {
          return contextValue.toLowerCase().includes((trigger.value as string).toLowerCase());
        }
        if (Array.isArray(contextValue)) {
          return contextValue.some(v => 
            typeof v === "string" && v.toLowerCase().includes((trigger.value as string).toLowerCase())
          );
        }
        return false;
      case "between":
        if (typeof contextValue === "number" && Array.isArray(trigger.value)) {
          return contextValue >= trigger.value[0] && contextValue <= trigger.value[1];
        }
        return false;
      default:
        return false;
    }
  }

  private validateProfileSafety(profile: BehavioralProfile): SafetyCheckResult {
    const { SAFETY_RULES } = require("@/lib/types/extended-dna");

    for (const term of SAFETY_RULES.prohibitedTerms) {
      if (profile.name.toLowerCase().includes(term) ||
          profile.description.toLowerCase().includes(term)) {
        return {
          checkType: "medical_language",
          passed: false,
          message: `Profile contains prohibited term: ${term}`,
          action: "blocked",
        };
      }
    }

    if (!profile.safetyDisclaimer || profile.safetyDisclaimer.length < 50) {
      return {
        checkType: "boundary",
        passed: false,
        message: "Safety disclaimer is missing or too short",
        action: "blocked",
      };
    }

    if (!profile.isNonMedical) {
      return {
        checkType: "medical_language",
        passed: false,
        message: "Profile must be marked as non-medical",
        action: "blocked",
      };
    }

    return {
      checkType: "boundary",
      passed: true,
      message: "Profile passed safety checks",
    };
  }

  private calculateLayerContributions(traits: ExtendedDNATrait[]) {
    const layers: DNALayer[] = ["personality", "cognitive", "emotional_regulation", "neuro_behavioral"];
    
    return layers.map(layer => {
      const layerTraits = traits.filter(t => t.layer === layer);
      const totalInfluence = layerTraits.reduce((sum, t) => sum + t.influenceStrength, 0);
      const avgInfluence = layerTraits.length > 0 ? totalInfluence / layerTraits.length : 0;
      const dominantTraits = layerTraits
        .sort((a, b) => b.influenceStrength - a.influenceStrength)
        .slice(0, 3)
        .map(t => t.traitKey);

      return {
        layer,
        overallInfluence: avgInfluence,
        dominantTraits,
        description: `${layer} layer contributes ${(avgInfluence * 100).toFixed(0)}% influence`,
      };
    });
  }

  private calculateTraitInfluences(traits: ExtendedDNATrait[]) {
    return traits.map(t => ({
      traitKey: t.traitKey,
      layer: t.layer,
      currentValue: t.traitValue,
      influenceWeight: t.influenceStrength,
      contribution: (t.traitValue / 100) * t.influenceStrength,
      modifiersActive: [],
      reasoning: `${t.label}: ${t.traitValue}% with ${t.influenceStrength}x influence`,
    }));
  }

  private checkSafetyBoundaries(traits: ExtendedDNATrait[]) {
    const boundaries = [];

    for (const trait of traits) {
      if (trait.traitValue >= trait.maxValue - 5) {
        boundaries.push({
          boundaryType: "high_boundary",
          description: `${trait.label} approaching maximum`,
          status: "approaching" as const,
          action: "Monitor for potential issues",
        });
      }

      if (trait.traitValue <= trait.minValue + 5) {
        boundaries.push({
          boundaryType: "low_boundary",
          description: `${trait.label} approaching minimum`,
          status: "approaching" as const,
          action: "Monitor for potential issues",
        });
      }

      if (trait.volatility > 0.7) {
        boundaries.push({
          boundaryType: "volatility",
          description: `${trait.label} has high volatility`,
          status: "enforced" as const,
          action: "Limiting rapid changes",
        });
      }
    }

    boundaries.push({
      boundaryType: "simulation",
      description: "Non-medical simulation boundary",
      status: "enforced" as const,
      action: "All behaviors are simulated patterns only",
    });

    return boundaries;
  }

  private layerToCategory(layer: DNALayer): string {
    const map: Record<DNALayer, string> = {
      personality: "core",
      cognitive: "cognitive",
      emotional_regulation: "emotional",
      neuro_behavioral: "behavioral",
    };
    return map[layer];
  }

  private layerToDomain(layer: DNALayer): string {
    const map: Record<DNALayer, string> = {
      personality: "personality",
      cognitive: "cognition",
      emotional_regulation: "emotion",
      neuro_behavioral: "ethics",
    };
    return map[layer];
  }

  private mapToExtendedTrait(row: Record<string, unknown>): ExtendedDNATrait {
    return {
      id: row.id as string,
      characterId: row.character_id as string,
      layer: (row.layer as DNALayer) || "personality",
      traitKey: row.trait_key as string,
      traitValue: Number(row.trait_value),
      influenceStrength: Number(row.influence_weight),
      resistance: Number(row.resistance),
      volatility: Number(row.volatility),
      isLocked: row.is_locked as boolean,
      lockedAt: row.locked_at as string | null,
      lockedBy: row.locked_by as string | null,
      minValue: Number(row.min_value),
      maxValue: Number(row.max_value),
      baselineValue: Number(row.baseline_value) || 50,
      currentModifier: Number(row.current_modifier) || 0,
      triggerConditions: (row.trigger_conditions as TriggerCondition[]) || [],
      decayRate: Number(row.decay_rate) || 0.01,
      reinforcementMultiplier: Number(row.reinforcement_multiplier) || 1.0,
      lastDecayAt: row.last_decay_at as string | null,
      lastReinforcementAt: row.last_reinforcement_at as string | null,
      label: (row.label as string) || row.trait_key as string,
      description: (row.description as string) || "",
      opposites: (row.opposites as [string, string]) || ["Low", "High"],
      safetyFlags: (row.safety_flags as ExtendedDNATrait["safetyFlags"]) || [],
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private mapToBehavioralProfile(row: Record<string, unknown>): BehavioralProfile {
    return {
      id: row.id as string,
      type: row.profile_type as BehavioralProfileType,
      name: row.name as string,
      description: row.description as string,
      safetyDisclaimer: row.safety_disclaimer as string,
      traitAdjustments: row.trait_adjustments as BehavioralProfile["traitAdjustments"],
      triggerPatterns: row.trigger_patterns as BehavioralProfile["triggerPatterns"],
      copingBehaviors: row.coping_behaviors as BehavioralProfile["copingBehaviors"],
      isReversible: row.is_reversible as boolean,
      isNonMedical: row.is_non_medical as boolean,
      applicationMode: row.application_mode as "gradual" | "immediate",
      createdAt: row.created_at as string,
    };
  }

  private mapToBehavioralState(row: Record<string, unknown>): CharacterBehavioralState {
    return {
      characterId: row.character_id as string,
      activeProfiles: row.active_profiles as string[],
      currentStressLevel: Number(row.current_stress_level),
      currentEmotionalState: row.current_emotional_state as CharacterBehavioralState["currentEmotionalState"],
      recentTriggers: row.recent_triggers as CharacterBehavioralState["recentTriggers"],
      activeModifiers: row.active_modifiers as TraitModifier[],
      copingInProgress: row.coping_in_progress as string[],
      lastStateUpdate: row.last_state_update as string,
    };
  }

  private mapToTraitModifier(row: Record<string, unknown>): TraitModifier {
    return {
      id: row.id as string,
      characterId: row.character_id as string,
      traitId: row.trait_id as string,
      modifierType: row.modifier_type as TraitModifier["modifierType"],
      value: Number(row.value),
      source: row.source as TraitModifier["source"],
      sourceReferenceId: row.source_reference_id as string | null,
      expiresAt: row.expires_at as string | null,
      conditions: row.conditions as TriggerCondition[],
      isActive: row.is_active as boolean,
      createdAt: row.created_at as string,
    };
  }

  private mapToEvolutionEvent(row: Record<string, unknown>): TraitEvolutionEvent {
    return {
      id: row.id as string,
      characterId: row.character_id as string,
      traitId: row.trait_id as string,
      eventType: row.event_type as TraitEvolutionEvent["eventType"],
      previousValue: Number(row.previous_value),
      newValue: Number(row.new_value),
      modifier: Number(row.modifier),
      source: row.source as string,
      sourceReferenceId: row.source_reference_id as string | null,
      triggerConditionsMet: row.trigger_conditions_met as TriggerCondition[],
      reasoningData: row.reasoning_data as EvolutionReasoning,
      isReversible: row.is_reversible as boolean,
      reversedAt: row.reversed_at as string | null,
      createdAt: row.created_at as string,
    };
  }
}

export const extendedDNAService = new ExtendedDNAService();
