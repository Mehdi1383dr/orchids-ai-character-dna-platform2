import { createServiceClient } from "@/lib/supabase/server";
import type {
  InternalState,
  InternalStateSnapshot,
  DerivedMood,
  ResponseTone,
  StateModifier,
  BehavioralCycle,
  CycleType,
  CyclePhase,
  CyclePhaseStatus,
  FatigueState,
  BoredomState,
  InteractionImpact,
  StateEvolutionEvent,
  StateEvolutionReasoning,
  MemoryMoodLink,
  ResponseInfluence,
  IdentityExpression,
  GenderExpression,
  DEFAULT_INTERNAL_STATE,
  DEFAULT_IDENTITY_EXPRESSION,
  CIRCADIAN_CYCLE,
  HORMONAL_RHYTHM_CYCLE,
  ENERGY_WAVE_CYCLE,
  FOCUS_RHYTHM_CYCLE,
  EMOTIONAL_TIDE_CYCLE,
  SAFETY_DISCLAIMERS,
} from "@/lib/types/internal-state";

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export class InternalStateService {
  private supabase: Awaited<ReturnType<typeof createServiceClient>> | null = null;

  private async getClient() {
    if (!this.supabase) {
      this.supabase = await createServiceClient();
    }
    return this.supabase;
  }

  async initializeInternalState(characterId: string): Promise<ServiceResult<InternalStateSnapshot>> {
    const client = await this.getClient();

    const { data: existing } = await client
      .from("character_internal_state")
      .select("*")
      .eq("character_id", characterId)
      .single();

    if (existing) {
      return { success: true, data: this.mapToStateSnapshot(existing) };
    }

    const { data, error } = await client
      .from("character_internal_state")
      .insert({
        character_id: characterId,
        ...this.stateToDbColumns(DEFAULT_INTERNAL_STATE),
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    await this.initializeFatigueState(characterId);
    await this.initializeBoredomState(characterId);

    return { success: true, data: this.mapToStateSnapshot(data) };
  }

  async getInternalState(characterId: string): Promise<ServiceResult<InternalStateSnapshot>> {
    const client = await this.getClient();

    const { data, error } = await client
      .from("character_internal_state")
      .select("*")
      .eq("character_id", characterId)
      .single();

    if (error || !data) {
      return this.initializeInternalState(characterId);
    }

    await this.applyTimeBasedEvolution(characterId);

    const { data: updated } = await client
      .from("character_internal_state")
      .select("*")
      .eq("character_id", characterId)
      .single();

    return { success: true, data: this.mapToStateSnapshot(updated || data) };
  }

  async updateInternalState(
    characterId: string,
    updates: Partial<InternalState>
  ): Promise<ServiceResult<InternalStateSnapshot>> {
    const client = await this.getClient();

    const currentResult = await this.getInternalState(characterId);
    if (!currentResult.success || !currentResult.data) {
      return currentResult;
    }

    const previousState = currentResult.data.state;
    const newState = { ...previousState };

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key in newState) {
        (newState as Record<string, number>)[key] = this.clampState(value);
      }
    }

    const derivedMood = this.calculateDerivedMood(newState);

    const { data, error } = await client
      .from("character_internal_state")
      .update({
        ...this.stateToDbColumns(newState),
        derived_mood: derivedMood,
        updated_at: new Date().toISOString(),
      })
      .eq("character_id", characterId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true, data: this.mapToStateSnapshot(data) };
  }

  async processInteraction(
    characterId: string,
    impact: InteractionImpact
  ): Promise<ServiceResult<InternalStateSnapshot>> {
    const client = await this.getClient();

    const stateResult = await this.getInternalState(characterId);
    if (!stateResult.success || !stateResult.data) {
      return stateResult;
    }

    const currentState = stateResult.data.state;
    const previousState = { ...currentState };

    currentState.energyLevel = this.clampState(currentState.energyLevel - impact.energyCost);
    currentState.mentalFatigue = this.clampState(currentState.mentalFatigue + impact.mentalLoad);
    currentState.stressAccumulation = this.clampState(
      currentState.stressAccumulation + impact.emotionalIntensity * 0.3
    );
    currentState.socialBattery = this.clampState(currentState.socialBattery - impact.socialDemand);

    if (impact.noveltyProvided > 50) {
      currentState.boredomLevel = this.clampState(currentState.boredomLevel - impact.noveltyProvided * 0.5);
      currentState.curiosityNeed = this.clampState(currentState.curiosityNeed - impact.noveltyProvided * 0.3);
      currentState.noveltyHunger = this.clampState(currentState.noveltyHunger - impact.noveltyProvided * 0.4);
    } else {
      currentState.boredomLevel = this.clampState(currentState.boredomLevel + 5);
    }

    if (impact.creativityEngaged > 50) {
      currentState.creativeDrive = this.clampState(currentState.creativeDrive + 10);
    }

    if (currentState.energyLevel < 30 || currentState.mentalFatigue > 70) {
      currentState.restNeed = this.clampState(currentState.restNeed + 15);
    }

    const derivedMood = this.calculateDerivedMood(currentState);

    await client
      .from("character_internal_state")
      .update({
        ...this.stateToDbColumns(currentState),
        derived_mood: derivedMood,
        last_interaction_at: new Date().toISOString(),
        interactions_since_rest: stateResult.data.interactionsSinceRest + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("character_id", characterId);

    await this.updateFatigueFromInteraction(characterId, impact);
    await this.updateBoredomFromInteraction(characterId, impact);

    await this.logStateEvolution(characterId, {
      eventType: "interaction",
      previousState,
      newState: currentState,
      trigger: "user_interaction",
      reasoningData: {
        primaryCause: "User interaction",
        contributingFactors: [
          `Energy cost: ${impact.energyCost}`,
          `Mental load: ${impact.mentalLoad}`,
          `Novelty: ${impact.noveltyProvided}`,
        ],
        cycleInfluences: [],
        memoryInfluences: [],
        fatigueFactors: [`Duration: ${impact.durationMinutes} minutes`],
        boredomFactors: impact.noveltyProvided < 30 ? ["Low novelty interaction"] : [],
        recoveryFactors: [],
      },
    });

    return this.getInternalState(characterId);
  }

  async applyRest(characterId: string, restQuality: number = 50): Promise<ServiceResult<InternalStateSnapshot>> {
    const client = await this.getClient();

    const stateResult = await this.getInternalState(characterId);
    if (!stateResult.success || !stateResult.data) {
      return stateResult;
    }

    const currentState = stateResult.data.state;
    const previousState = { ...currentState };

    const recoveryMultiplier = restQuality / 50;

    currentState.energyLevel = this.clampState(currentState.energyLevel + 30 * recoveryMultiplier);
    currentState.mentalFatigue = this.clampState(currentState.mentalFatigue - 40 * recoveryMultiplier);
    currentState.stressAccumulation = this.clampState(currentState.stressAccumulation - 20 * recoveryMultiplier);
    currentState.restNeed = this.clampState(currentState.restNeed - 50 * recoveryMultiplier);
    currentState.socialBattery = this.clampState(currentState.socialBattery + 20 * recoveryMultiplier);

    const derivedMood = this.calculateDerivedMood(currentState);

    await client
      .from("character_internal_state")
      .update({
        ...this.stateToDbColumns(currentState),
        derived_mood: derivedMood,
        interactions_since_rest: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("character_id", characterId);

    await client
      .from("character_fatigue_state")
      .update({
        mental_fatigue_level: Math.max(0, Number(currentState.mentalFatigue)),
        last_rest_at: new Date().toISOString(),
        burnout_risk: Math.max(0, (stateResult.data as InternalStateSnapshot).derivedMood.moodIntensity < 30 ? 20 : 5),
        updated_at: new Date().toISOString(),
      })
      .eq("character_id", characterId);

    await this.logStateEvolution(characterId, {
      eventType: "rest",
      previousState,
      newState: currentState,
      trigger: "rest_period",
      reasoningData: {
        primaryCause: "Rest period applied",
        contributingFactors: [`Rest quality: ${restQuality}%`],
        cycleInfluences: [],
        memoryInfluences: [],
        fatigueFactors: [],
        boredomFactors: [],
        recoveryFactors: ["Energy restored", "Fatigue reduced", "Stress lowered"],
      },
    });

    return this.getInternalState(characterId);
  }

  async injectNovelty(characterId: string, noveltyAmount: number): Promise<ServiceResult<InternalStateSnapshot>> {
    const client = await this.getClient();

    const stateResult = await this.getInternalState(characterId);
    if (!stateResult.success || !stateResult.data) {
      return stateResult;
    }

    const currentState = stateResult.data.state;
    const previousState = { ...currentState };

    currentState.boredomLevel = this.clampState(currentState.boredomLevel - noveltyAmount * 0.8);
    currentState.curiosityNeed = this.clampState(currentState.curiosityNeed - noveltyAmount * 0.5);
    currentState.noveltyHunger = this.clampState(currentState.noveltyHunger - noveltyAmount * 0.6);
    currentState.creativeDrive = this.clampState(currentState.creativeDrive + noveltyAmount * 0.3);
    currentState.energyLevel = this.clampState(currentState.energyLevel + noveltyAmount * 0.2);

    const derivedMood = this.calculateDerivedMood(currentState);

    await client
      .from("character_internal_state")
      .update({
        ...this.stateToDbColumns(currentState),
        derived_mood: derivedMood,
        time_since_novelty_minutes: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("character_id", characterId);

    await client
      .from("character_boredom_state")
      .update({
        boredom_level: currentState.boredomLevel,
        last_novelty_at: new Date().toISOString(),
        novelty_deficit: Math.max(0, (stateResult.data as InternalStateSnapshot).state.noveltyHunger - noveltyAmount),
        curiosity_satisfaction: Math.min(100, 50 + noveltyAmount * 0.5),
        updated_at: new Date().toISOString(),
      })
      .eq("character_id", characterId);

    await this.logStateEvolution(characterId, {
      eventType: "novelty_injection",
      previousState,
      newState: currentState,
      trigger: "novelty_event",
      reasoningData: {
        primaryCause: "Novel experience introduced",
        contributingFactors: [`Novelty amount: ${noveltyAmount}`],
        cycleInfluences: [],
        memoryInfluences: [],
        fatigueFactors: [],
        boredomFactors: ["Boredom reduced", "Curiosity satisfied"],
        recoveryFactors: [],
      },
    });

    return this.getInternalState(characterId);
  }

  async initializeCycle(
    characterId: string,
    cycleType: CycleType,
    genderExpression?: GenderExpression
  ): Promise<ServiceResult<BehavioralCycle>> {
    const client = await this.getClient();

    const cycleConfig = this.getCycleConfig(cycleType);

    if (cycleType === "hormonal_rhythm" && genderExpression !== "feminine") {
      return { success: false, error: "Hormonal rhythm cycle requires feminine gender expression", code: "INVALID_CONFIG" };
    }

    const { data: existing } = await client
      .from("behavioral_cycles")
      .select("*")
      .eq("character_id", characterId)
      .eq("cycle_type", cycleType)
      .single();

    if (existing) {
      return { success: true, data: this.mapToBehavioralCycle(existing) };
    }

    const { data, error } = await client
      .from("behavioral_cycles")
      .insert({
        character_id: characterId,
        cycle_type: cycleType,
        name: cycleConfig.name,
        description: cycleConfig.description,
        period_days: cycleConfig.periodDays,
        phases: cycleConfig.phases,
        safety_disclaimer: cycleConfig.disclaimer,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true, data: this.mapToBehavioralCycle(data) };
  }

  async getActiveCycles(characterId: string): Promise<ServiceResult<BehavioralCycle[]>> {
    const client = await this.getClient();

    const { data, error } = await client
      .from("behavioral_cycles")
      .select("*")
      .eq("character_id", characterId)
      .eq("is_enabled", true);

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true, data: (data || []).map(this.mapToBehavioralCycle) };
  }

  async advanceCyclePhase(characterId: string, cycleType: CycleType): Promise<ServiceResult<BehavioralCycle>> {
    const client = await this.getClient();

    const { data: cycle } = await client
      .from("behavioral_cycles")
      .select("*")
      .eq("character_id", characterId)
      .eq("cycle_type", cycleType)
      .single();

    if (!cycle) {
      return { success: false, error: "Cycle not found", code: "NOT_FOUND" };
    }

    const phases = cycle.phases as CyclePhase[];
    const nextPhase = (cycle.current_phase + 1) % phases.length;

    const { data, error } = await client
      .from("behavioral_cycles")
      .update({
        current_phase: nextPhase,
        phase_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", cycle.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    await this.applyCyclePhaseModifiers(characterId, cycleType, phases[nextPhase]);

    return { success: true, data: this.mapToBehavioralCycle(data) };
  }

  async toggleCycle(characterId: string, cycleType: CycleType, enabled: boolean): Promise<ServiceResult<BehavioralCycle>> {
    const client = await this.getClient();

    const { data, error } = await client
      .from("behavioral_cycles")
      .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
      .eq("character_id", characterId)
      .eq("cycle_type", cycleType)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true, data: this.mapToBehavioralCycle(data) };
  }

  async getIdentityExpression(characterId: string): Promise<ServiceResult<IdentityExpression>> {
    const client = await this.getClient();

    const { data, error } = await client
      .from("character_identity_expression")
      .select("*")
      .eq("character_id", characterId)
      .single();

    if (error || !data) {
      return this.initializeIdentityExpression(characterId);
    }

    return { success: true, data: this.mapToIdentityExpression(data) };
  }

  async updateIdentityExpression(
    characterId: string,
    updates: Partial<IdentityExpression>
  ): Promise<ServiceResult<IdentityExpression>> {
    const client = await this.getClient();

    const currentResult = await this.getIdentityExpression(characterId);
    if (!currentResult.success) {
      return currentResult;
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (updates.genderExpression !== undefined) updateData.gender_expression = updates.genderExpression;
    if (updates.pronouns !== undefined) updateData.pronouns = updates.pronouns;
    if (updates.attachmentStyle !== undefined) updateData.attachment_style = updates.attachmentStyle;
    if (updates.socialBoundaries !== undefined) updateData.social_boundaries = updates.socialBoundaries;
    if (updates.intimacyTolerance !== undefined) updateData.intimacy_tolerance = updates.intimacyTolerance;
    if (updates.personalSpaceNeeds !== undefined) updateData.personal_space_needs = updates.personalSpaceNeeds;
    if (updates.emotionalOpennessDefault !== undefined) updateData.emotional_openness_default = updates.emotionalOpennessDefault;
    if (updates.vulnerabilityComfort !== undefined) updateData.vulnerability_comfort = updates.vulnerabilityComfort;

    const { data, error } = await client
      .from("character_identity_expression")
      .update(updateData)
      .eq("character_id", characterId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    if (updates.genderExpression === "feminine") {
      await this.initializeCycle(characterId, "hormonal_rhythm", "feminine");
    } else if (updates.genderExpression && updates.genderExpression !== "feminine") {
      await this.toggleCycle(characterId, "hormonal_rhythm", false);
    }

    return { success: true, data: this.mapToIdentityExpression(data) };
  }

  async createMemoryMoodLink(
    characterId: string,
    memoryId: string,
    emotionalValence: number,
    emotionalArousal: number,
    stressContribution: number
  ): Promise<ServiceResult<MemoryMoodLink>> {
    const client = await this.getClient();

    const { data, error } = await client
      .from("memory_mood_links")
      .insert({
        character_id: characterId,
        memory_id: memoryId,
        emotional_valence: emotionalValence,
        emotional_arousal: emotionalArousal,
        stress_contribution: stressContribution,
        trigger_probability: Math.abs(emotionalValence) * emotionalArousal * 0.2,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true, data: this.mapToMemoryMoodLink(data) };
  }

  async triggerMemoryMoodEffect(characterId: string, memoryId: string): Promise<ServiceResult<InternalStateSnapshot>> {
    const client = await this.getClient();

    const { data: link } = await client
      .from("memory_mood_links")
      .select("*")
      .eq("character_id", characterId)
      .eq("memory_id", memoryId)
      .single();

    if (!link) {
      return { success: false, error: "Memory mood link not found", code: "NOT_FOUND" };
    }

    const stateResult = await this.getInternalState(characterId);
    if (!stateResult.success || !stateResult.data) {
      return stateResult;
    }

    const currentState = stateResult.data.state;
    const previousState = { ...currentState };

    const valence = Number(link.emotional_valence);
    const arousal = Number(link.emotional_arousal);
    const stress = Number(link.stress_contribution);

    currentState.emotionalBaseline = this.clampState(currentState.emotionalBaseline + valence * 10);
    currentState.stressAccumulation = this.clampState(currentState.stressAccumulation + stress);

    if (arousal > 0.5) {
      currentState.energyLevel = this.clampState(currentState.energyLevel + (arousal - 0.5) * 20);
    }

    if (valence < 0) {
      currentState.socialBattery = this.clampState(currentState.socialBattery - Math.abs(valence) * 15);
    }

    const derivedMood = this.calculateDerivedMood(currentState);

    await client
      .from("character_internal_state")
      .update({
        ...this.stateToDbColumns(currentState),
        derived_mood: derivedMood,
        updated_at: new Date().toISOString(),
      })
      .eq("character_id", characterId);

    await client
      .from("memory_mood_links")
      .update({ last_triggered_at: new Date().toISOString() })
      .eq("id", link.id);

    await this.logStateEvolution(characterId, {
      eventType: "memory_trigger",
      previousState,
      newState: currentState,
      trigger: "memory_recall",
      triggerReferenceId: memoryId,
      memoriesInvolved: [memoryId],
      reasoningData: {
        primaryCause: "Memory recall triggered mood change",
        contributingFactors: [
          `Emotional valence: ${valence}`,
          `Arousal: ${arousal}`,
          `Stress contribution: ${stress}`,
        ],
        cycleInfluences: [],
        memoryInfluences: [{ memoryId, emotionalWeight: Math.abs(valence), relevance: arousal }],
        fatigueFactors: [],
        boredomFactors: [],
        recoveryFactors: [],
      },
    });

    return this.getInternalState(characterId);
  }

  async getResponseInfluence(characterId: string): Promise<ServiceResult<ResponseInfluence>> {
    const stateResult = await this.getInternalState(characterId);
    if (!stateResult.success || !stateResult.data) {
      return { success: false, error: "Could not get internal state", code: "STATE_ERROR" };
    }

    const state = stateResult.data.state;
    const mood = stateResult.data.derivedMood;

    const influence: ResponseInfluence = {
      suggestedLength: this.calculateSuggestedLength(state, mood),
      toneGuidance: this.calculateToneGuidance(state, mood),
      engagementCues: this.generateEngagementCues(state, mood),
      avoidanceTopics: this.determineAvoidanceTopics(state),
      energyConservationMode: state.energyLevel < 30 || state.mentalFatigue > 70,
      creativityBoostActive: state.creativeDrive > 70 && state.energyLevel > 50,
      emotionalGuardUp: state.stressAccumulation > 60 || state.socialBattery < 30,
      seekingNovelty: state.boredomLevel > 60 || state.noveltyHunger > 70,
      needsRest: state.restNeed > 70 || state.mentalFatigue > 80,
      socialBatteryLow: state.socialBattery < 30,
    };

    return { success: true, data: influence };
  }

  private async applyTimeBasedEvolution(characterId: string): Promise<void> {
    const client = await this.getClient();

    const { data: state } = await client
      .from("character_internal_state")
      .select("*")
      .eq("character_id", characterId)
      .single();

    if (!state || !state.last_interaction_at) return;

    const lastInteraction = new Date(state.last_interaction_at);
    const now = new Date();
    const hoursSince = (now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60);

    if (hoursSince < 0.1) return;

    const currentState: InternalState = {
      energyLevel: Number(state.energy_level),
      mentalFatigue: Number(state.mental_fatigue),
      boredomLevel: Number(state.boredom_level),
      curiosityNeed: Number(state.curiosity_need),
      emotionalBaseline: Number(state.emotional_baseline),
      stressAccumulation: Number(state.stress_accumulation),
      socialBattery: Number(state.social_battery),
      creativeDrive: Number(state.creative_drive),
      restNeed: Number(state.rest_need),
      noveltyHunger: Number(state.novelty_hunger),
    };

    const previousState = { ...currentState };

    const naturalRecovery = Math.min(hoursSince * 2, 30);
    currentState.energyLevel = this.clampState(currentState.energyLevel + naturalRecovery * 0.5);
    currentState.mentalFatigue = this.clampState(currentState.mentalFatigue - naturalRecovery * 0.3);
    currentState.stressAccumulation = this.clampState(currentState.stressAccumulation - naturalRecovery * 0.2);
    currentState.socialBattery = this.clampState(currentState.socialBattery + naturalRecovery * 0.4);

    currentState.boredomLevel = this.clampState(currentState.boredomLevel + hoursSince * 0.5);
    currentState.noveltyHunger = this.clampState(currentState.noveltyHunger + hoursSince * 0.3);
    currentState.curiosityNeed = this.clampState(currentState.curiosityNeed + hoursSince * 0.2);

    await this.applyCycleEffects(characterId, currentState);

    const derivedMood = this.calculateDerivedMood(currentState);

    await client
      .from("character_internal_state")
      .update({
        ...this.stateToDbColumns(currentState),
        derived_mood: derivedMood,
        time_since_novelty_minutes: Math.floor(hoursSince * 60),
        updated_at: new Date().toISOString(),
      })
      .eq("character_id", characterId);

    if (hoursSince > 1) {
      await this.logStateEvolution(characterId, {
        eventType: "time_decay",
        previousState,
        newState: currentState,
        trigger: "time_passage",
        reasoningData: {
          primaryCause: `${hoursSince.toFixed(1)} hours since last interaction`,
          contributingFactors: ["Natural recovery", "Boredom accumulation"],
          cycleInfluences: [],
          memoryInfluences: [],
          fatigueFactors: ["Natural fatigue recovery"],
          boredomFactors: ["Time-based boredom increase"],
          recoveryFactors: ["Passive energy restoration"],
        },
      });
    }
  }

  private async applyCycleEffects(characterId: string, state: InternalState): Promise<void> {
    const cyclesResult = await this.getActiveCycles(characterId);
    if (!cyclesResult.success || !cyclesResult.data) return;

    for (const cycle of cyclesResult.data) {
      const phases = cycle.phases;
      const currentPhase = phases[cycle.currentPhase];
      
      if (!currentPhase?.stateModifiers) continue;

      for (const [key, value] of Object.entries(currentPhase.stateModifiers)) {
        if (key in state && typeof value === "number") {
          (state as Record<string, number>)[key] = this.clampState(
            (state as Record<string, number>)[key] + value * 0.1
          );
        }
      }
    }
  }

  private async applyCyclePhaseModifiers(
    characterId: string,
    cycleType: CycleType,
    phase: CyclePhase
  ): Promise<void> {
    const client = await this.getClient();

    await client
      .from("state_modifiers")
      .update({ is_active: false })
      .eq("character_id", characterId)
      .eq("source", `cycle_${cycleType}`);

    if (!phase.stateModifiers) return;

    for (const [targetState, value] of Object.entries(phase.stateModifiers)) {
      if (typeof value !== "number") continue;

      await client.from("state_modifiers").insert({
        character_id: characterId,
        modifier_type: "cycle_based",
        target_state: targetState,
        value,
        source: `cycle_${cycleType}`,
        decay_rate: 0,
      });
    }

    const stateResult = await this.getInternalState(characterId);
    if (stateResult.success && stateResult.data) {
      const currentState = stateResult.data.state;

      for (const [key, value] of Object.entries(phase.stateModifiers)) {
        if (key in currentState && typeof value === "number") {
          (currentState as Record<string, number>)[key] = this.clampState(
            (currentState as Record<string, number>)[key] + value
          );
        }
      }

      await this.updateInternalState(characterId, currentState);

      await this.logStateEvolution(characterId, {
        eventType: "cycle_shift",
        previousState: stateResult.data.state,
        newState: currentState,
        trigger: `${cycleType}_phase_change`,
        cyclesInvolved: [cycleType],
        reasoningData: {
          primaryCause: `Entered ${phase.name} phase of ${cycleType} cycle`,
          contributingFactors: phase.behavioralNotes,
          cycleInfluences: [{ cycleType, phase: phase.name, contribution: 1.0 }],
          memoryInfluences: [],
          fatigueFactors: [],
          boredomFactors: [],
          recoveryFactors: [],
        },
      });
    }
  }

  private async initializeIdentityExpression(characterId: string): Promise<ServiceResult<IdentityExpression>> {
    const client = await this.getClient();

    const { data, error } = await client
      .from("character_identity_expression")
      .insert({
        character_id: characterId,
        ...this.identityToDbColumns(DEFAULT_IDENTITY_EXPRESSION),
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true, data: this.mapToIdentityExpression(data) };
  }

  private async initializeFatigueState(characterId: string): Promise<void> {
    const client = await this.getClient();

    await client.from("character_fatigue_state").insert({
      character_id: characterId,
    });
  }

  private async initializeBoredomState(characterId: string): Promise<void> {
    const client = await this.getClient();

    await client.from("character_boredom_state").insert({
      character_id: characterId,
    });
  }

  private async updateFatigueFromInteraction(characterId: string, impact: InteractionImpact): Promise<void> {
    const client = await this.getClient();

    const { data: fatigue } = await client
      .from("character_fatigue_state")
      .select("*")
      .eq("character_id", characterId)
      .single();

    if (!fatigue) return;

    const mentalIncrease = impact.mentalLoad * 0.5;
    const conversationIncrease = impact.durationMinutes * 0.2;
    const emotionalIncrease = impact.emotionalIntensity * 0.3;

    const newMentalFatigue = Math.min(100, Number(fatigue.mental_fatigue_level) + mentalIncrease);
    const newConversationFatigue = Math.min(100, Number(fatigue.conversation_fatigue) + conversationIncrease);
    const newEmotionalFatigue = Math.min(100, Number(fatigue.emotional_fatigue) + emotionalIncrease);

    const avgFatigue = (newMentalFatigue + newConversationFatigue + newEmotionalFatigue) / 3;
    const burnoutRisk = avgFatigue > Number(fatigue.fatigue_threshold) ? Math.min(100, avgFatigue - Number(fatigue.fatigue_threshold) + 20) : 0;

    await client
      .from("character_fatigue_state")
      .update({
        mental_fatigue_level: newMentalFatigue,
        conversation_fatigue: newConversationFatigue,
        emotional_fatigue: newEmotionalFatigue,
        rest_needed: Math.max(Number(fatigue.rest_needed), avgFatigue * 0.5),
        burnout_risk: burnoutRisk,
        updated_at: new Date().toISOString(),
      })
      .eq("character_id", characterId);
  }

  private async updateBoredomFromInteraction(characterId: string, impact: InteractionImpact): Promise<void> {
    const client = await this.getClient();

    const { data: boredom } = await client
      .from("character_boredom_state")
      .select("*")
      .eq("character_id", characterId)
      .single();

    if (!boredom) return;

    const topicSaturation = (boredom.topic_saturation as Record<string, number>) || {};
    const topic = impact.topicCategory || "general";
    topicSaturation[topic] = (topicSaturation[topic] || 0) + 1;

    const isNovel = impact.noveltyProvided > 50;
    const newBoredomLevel = isNovel
      ? Math.max(0, Number(boredom.boredom_level) - impact.noveltyProvided * 0.5)
      : Math.min(100, Number(boredom.boredom_level) + 5);

    await client
      .from("character_boredom_state")
      .update({
        boredom_level: newBoredomLevel,
        topic_saturation: topicSaturation,
        last_novelty_at: isNovel ? new Date().toISOString() : boredom.last_novelty_at,
        novelty_deficit: isNovel ? 0 : Math.min(100, Number(boredom.novelty_deficit) + 5),
        curiosity_satisfaction: isNovel ? Math.min(100, 50 + impact.noveltyProvided * 0.3) : Math.max(0, Number(boredom.curiosity_satisfaction) - 5),
        updated_at: new Date().toISOString(),
      })
      .eq("character_id", characterId);
  }

  private async logStateEvolution(
    characterId: string,
    event: Omit<StateEvolutionEvent, "id" | "characterId" | "createdAt">
  ): Promise<void> {
    const client = await this.getClient();

    await client.from("state_evolution_events").insert({
      character_id: characterId,
      event_type: event.eventType,
      previous_state: event.previousState,
      new_state: event.newState,
      trigger: event.trigger,
      trigger_reference_id: event.triggerReferenceId || null,
      cycles_involved: event.cyclesInvolved || [],
      memories_involved: event.memoriesInvolved || [],
      reasoning_data: event.reasoningData,
    });
  }

  private calculateDerivedMood(state: InternalState): DerivedMood {
    const valence = (state.emotionalBaseline - 50) / 50;
    const energy = state.energyLevel / 100;
    const fatigue = state.mentalFatigue / 100;
    const stress = state.stressAccumulation / 100;
    const social = state.socialBattery / 100;

    const intensity = Math.sqrt(Math.pow(valence, 2) + Math.pow(energy - fatigue, 2)) * 100;
    const stability = 100 - state.stressAccumulation * 0.5 - Math.abs(valence) * 20;

    let primaryMood: string;
    if (fatigue > 0.7 || state.restNeed > 70) {
      primaryMood = "tired";
    } else if (stress > 0.6) {
      primaryMood = "stressed";
    } else if (state.boredomLevel > 70) {
      primaryMood = "bored";
    } else if (valence > 0.3 && energy > 0.6) {
      primaryMood = "happy";
    } else if (valence < -0.3 && energy < 0.4) {
      primaryMood = "melancholic";
    } else if (energy > 0.7 && state.creativeDrive > 60) {
      primaryMood = "inspired";
    } else if (social < 0.3) {
      primaryMood = "withdrawn";
    } else {
      primaryMood = "neutral";
    }

    let suggestedTone: ResponseTone;
    if (fatigue > 0.7) suggestedTone = "tired";
    else if (state.boredomLevel > 60) suggestedTone = "distracted";
    else if (valence > 0.4 && energy > 0.6) suggestedTone = "enthusiastic";
    else if (valence > 0.2) suggestedTone = "warm";
    else if (state.creativeDrive > 70) suggestedTone = "playful";
    else if (stress > 0.5) suggestedTone = "reserved";
    else if (state.curiosityNeed > 60) suggestedTone = "contemplative";
    else suggestedTone = "neutral";

    const engagementLevel = Math.max(10, 100 - fatigue * 50 - state.boredomLevel * 0.3 - (100 - state.socialBattery) * 0.2);

    let responseLengthModifier = 1.0;
    if (fatigue > 0.6) responseLengthModifier -= 0.3;
    if (state.boredomLevel > 50) responseLengthModifier -= 0.2;
    if (energy > 0.7 && state.creativeDrive > 60) responseLengthModifier += 0.3;
    responseLengthModifier = Math.max(0.3, Math.min(1.5, responseLengthModifier));

    const creativityBoost = state.creativeDrive > 70 && energy > 0.5 ? (state.creativeDrive - 70) * 2 : 0;

    return {
      primaryMood,
      moodIntensity: Math.round(intensity),
      moodValence: valence,
      moodStability: Math.round(stability),
      suggestedTone,
      engagementLevel: Math.round(engagementLevel),
      responseLengthModifier,
      creativityBoost,
    };
  }

  private calculateSuggestedLength(state: InternalState, mood: DerivedMood): ResponseInfluence["suggestedLength"] {
    if (state.mentalFatigue > 70 || state.energyLevel < 30) return "brief";
    if (state.boredomLevel > 60) return "brief";
    if (mood.creativityBoost > 20 && state.energyLevel > 60) return "elaborate";
    if (mood.engagementLevel > 70) return "detailed";
    return "moderate";
  }

  private calculateToneGuidance(state: InternalState, mood: DerivedMood): ResponseTone[] {
    const tones: ResponseTone[] = [mood.suggestedTone];

    if (state.emotionalBaseline > 70 && state.socialBattery > 50) tones.push("warm");
    if (state.creativeDrive > 60 && state.energyLevel > 50) tones.push("playful");
    if (state.stressAccumulation > 50) tones.push("serious");
    if (state.socialBattery < 40) tones.push("reserved");

    return [...new Set(tones)];
  }

  private generateEngagementCues(state: InternalState, mood: DerivedMood): string[] {
    const cues: string[] = [];

    if (state.curiosityNeed > 60) cues.push("Ask follow-up questions");
    if (state.noveltyHunger > 60) cues.push("Introduce new perspectives");
    if (state.boredomLevel > 50) cues.push("Change topic or approach");
    if (mood.creativityBoost > 10) cues.push("Explore creative tangents");
    if (state.socialBattery < 40) cues.push("Keep interactions brief");
    if (state.restNeed > 60) cues.push("Suggest taking a break");

    return cues;
  }

  private determineAvoidanceTopics(state: InternalState): string[] {
    const topics: string[] = [];

    if (state.stressAccumulation > 70) topics.push("high-pressure topics");
    if (state.mentalFatigue > 70) topics.push("complex analytical problems");
    if (state.emotionalBaseline < 30) topics.push("emotionally heavy subjects");
    if (state.socialBattery < 30) topics.push("social obligations");

    return topics;
  }

  private getCycleConfig(cycleType: CycleType): {
    name: string;
    description: string;
    periodDays: number;
    phases: CyclePhase[];
    disclaimer: string;
  } {
    switch (cycleType) {
      case "circadian":
        return {
          name: "Daily Rhythm",
          description: "Natural daily energy and focus patterns",
          periodDays: 1,
          phases: CIRCADIAN_CYCLE,
          disclaimer: SAFETY_DISCLAIMERS.cycles,
        };
      case "energy_wave":
        return {
          name: "Energy Wave",
          description: "Multi-day energy fluctuation pattern",
          periodDays: 10,
          phases: ENERGY_WAVE_CYCLE,
          disclaimer: SAFETY_DISCLAIMERS.cycles,
        };
      case "focus_rhythm":
        return {
          name: "Focus Rhythm",
          description: "Concentration and attention patterns",
          periodDays: 6,
          phases: FOCUS_RHYTHM_CYCLE,
          disclaimer: SAFETY_DISCLAIMERS.cycles,
        };
      case "emotional_tide":
        return {
          name: "Emotional Tide",
          description: "Emotional sensitivity fluctuations",
          periodDays: 9,
          phases: EMOTIONAL_TIDE_CYCLE,
          disclaimer: SAFETY_DISCLAIMERS.cycles,
        };
      case "hormonal_rhythm":
        return {
          name: "Monthly Rhythm",
          description: "Cyclical behavioral pattern for feminine-expressing characters",
          periodDays: 28,
          phases: HORMONAL_RHYTHM_CYCLE,
          disclaimer: SAFETY_DISCLAIMERS.hormonal,
        };
      default:
        return {
          name: "Custom Cycle",
          description: "Custom behavioral cycle",
          periodDays: 7,
          phases: [],
          disclaimer: SAFETY_DISCLAIMERS.cycles,
        };
    }
  }

  private clampState(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  private stateToDbColumns(state: InternalState): Record<string, number> {
    return {
      energy_level: state.energyLevel,
      mental_fatigue: state.mentalFatigue,
      boredom_level: state.boredomLevel,
      curiosity_need: state.curiosityNeed,
      emotional_baseline: state.emotionalBaseline,
      stress_accumulation: state.stressAccumulation,
      social_battery: state.socialBattery,
      creative_drive: state.creativeDrive,
      rest_need: state.restNeed,
      novelty_hunger: state.noveltyHunger,
    };
  }

  private identityToDbColumns(identity: IdentityExpression): Record<string, unknown> {
    return {
      gender_expression: identity.genderExpression,
      pronouns: identity.pronouns,
      attachment_style: identity.attachmentStyle,
      social_boundaries: identity.socialBoundaries,
      intimacy_tolerance: identity.intimacyTolerance,
      personal_space_needs: identity.personalSpaceNeeds,
      emotional_openness_default: identity.emotionalOpennessDefault,
      vulnerability_comfort: identity.vulnerabilityComfort,
    };
  }

  private mapToStateSnapshot(row: Record<string, unknown>): InternalStateSnapshot {
    return {
      id: row.id as string,
      characterId: row.character_id as string,
      state: {
        energyLevel: Number(row.energy_level),
        mentalFatigue: Number(row.mental_fatigue),
        boredomLevel: Number(row.boredom_level),
        curiosityNeed: Number(row.curiosity_need),
        emotionalBaseline: Number(row.emotional_baseline),
        stressAccumulation: Number(row.stress_accumulation),
        socialBattery: Number(row.social_battery),
        creativeDrive: Number(row.creative_drive),
        restNeed: Number(row.rest_need),
        noveltyHunger: Number(row.novelty_hunger),
      },
      derivedMood: row.derived_mood as DerivedMood,
      activeModifiers: (row.active_modifiers as StateModifier[]) || [],
      cyclePhases: (row.cycle_phases as CyclePhaseStatus) || {},
      lastInteractionAt: row.last_interaction_at as string | null,
      interactionsSinceRest: row.interactions_since_rest as number,
      consecutiveSimilarTopics: row.consecutive_similar_topics as number,
      timeSinceNovelty: row.time_since_novelty_minutes as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private mapToBehavioralCycle(row: Record<string, unknown>): BehavioralCycle {
    return {
      id: row.id as string,
      characterId: row.character_id as string,
      cycleType: row.cycle_type as CycleType,
      name: row.name as string,
      description: row.description as string,
      isEnabled: row.is_enabled as boolean,
      periodDays: Number(row.period_days),
      currentPhase: row.current_phase as number,
      phaseStartedAt: row.phase_started_at as string,
      phases: row.phases as CyclePhase[],
      affectedStates: row.affected_states as BehavioralCycle["affectedStates"],
      safetyDisclaimer: row.safety_disclaimer as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private mapToIdentityExpression(row: Record<string, unknown>): IdentityExpression {
    return {
      genderExpression: row.gender_expression as GenderExpression,
      pronouns: row.pronouns as string[],
      attachmentStyle: row.attachment_style as IdentityExpression["attachmentStyle"],
      socialBoundaries: row.social_boundaries as IdentityExpression["socialBoundaries"],
      intimacyTolerance: row.intimacy_tolerance as IdentityExpression["intimacyTolerance"],
      personalSpaceNeeds: Number(row.personal_space_needs),
      emotionalOpennessDefault: Number(row.emotional_openness_default),
      vulnerabilityComfort: Number(row.vulnerability_comfort),
    };
  }

  private mapToMemoryMoodLink(row: Record<string, unknown>): MemoryMoodLink {
    return {
      memoryId: row.memory_id as string,
      characterId: row.character_id as string,
      emotionalValence: Number(row.emotional_valence),
      emotionalArousal: Number(row.emotional_arousal),
      stressContribution: Number(row.stress_contribution),
      triggerProbability: Number(row.trigger_probability),
      lastTriggeredAt: row.last_triggered_at as string | null,
      triggerConditions: row.trigger_conditions as MemoryMoodLink["triggerConditions"],
      moodEffectOnRecall: row.mood_effect_on_recall as MemoryMoodLink["moodEffectOnRecall"],
      createdAt: row.created_at as string,
    };
  }
}

export const internalStateService = new InternalStateService();
