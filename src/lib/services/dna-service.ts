import { createServiceClient } from "@/lib/supabase/server";
import type {
  DNATrait,
  DNATraitInput,
  DNATraitsInput,
  DNATraitRule,
  DNATraitRuleInput,
  DNAVersion,
  DNAEvolutionLog,
  DNAValidationResult,
  DNAValidationError,
  DNAValidationWarning,
  DNARollbackOptions,
  TraitChange,
  TraitDomain,
  TraitCategory,
  CreationMode,
} from "@/lib/types/character";
import { TOKEN_COSTS } from "@/lib/types/character";
import { TokenService } from "./token-service";

const DOMAIN_TO_CATEGORY: Record<TraitDomain, TraitCategory[]> = {
  personality: ["core"],
  emotion: ["emotional"],
  cognition: ["cognitive"],
  ethics: ["behavioral"],
  social: ["social"],
};

const CATEGORY_TO_DOMAIN: Record<TraitCategory, TraitDomain> = {
  core: "personality",
  emotional: "emotion",
  cognitive: "cognition",
  social: "social",
  behavioral: "ethics",
};

const DEFAULT_TRAITS: DNATraitInput[] = [
  { category: "core", traitKey: "openness", traitValue: 50 },
  { category: "core", traitKey: "conscientiousness", traitValue: 50 },
  { category: "core", traitKey: "extraversion", traitValue: 50 },
  { category: "core", traitKey: "agreeableness", traitValue: 50 },
  { category: "core", traitKey: "stability", traitValue: 50 },
  { category: "emotional", traitKey: "empathy", traitValue: 50 },
  { category: "emotional", traitKey: "expressiveness", traitValue: 50 },
  { category: "emotional", traitKey: "optimism", traitValue: 50 },
  { category: "emotional", traitKey: "sensitivity", traitValue: 50 },
  { category: "emotional", traitKey: "warmth", traitValue: 50 },
  { category: "cognitive", traitKey: "analytical", traitValue: 50 },
  { category: "cognitive", traitKey: "creativity", traitValue: 50 },
  { category: "cognitive", traitKey: "curiosity", traitValue: 50 },
  { category: "cognitive", traitKey: "decisiveness", traitValue: 50 },
  { category: "cognitive", traitKey: "complexity", traitValue: 50 },
  { category: "social", traitKey: "assertiveness", traitValue: 50 },
  { category: "social", traitKey: "dominance", traitValue: 50 },
  { category: "social", traitKey: "trust", traitValue: 50 },
  { category: "social", traitKey: "formality", traitValue: 50 },
  { category: "social", traitKey: "independence", traitValue: 50 },
  { category: "behavioral", traitKey: "patience", traitValue: 50 },
  { category: "behavioral", traitKey: "adaptability", traitValue: 50 },
  { category: "behavioral", traitKey: "directness", traitValue: 50 },
  { category: "behavioral", traitKey: "risktaking", traitValue: 50 },
  { category: "behavioral", traitKey: "humor", traitValue: 50 },
];

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export class DNAService {
  private supabase: Awaited<ReturnType<typeof createServiceClient>> | null = null;

  private async getClient() {
    if (!this.supabase) {
      this.supabase = await createServiceClient();
    }
    return this.supabase;
  }

  async initializeDNA(
    characterId: string,
    initialTraits?: DNATraitsInput,
    creationMode: CreationMode = "standard"
  ): Promise<ServiceResult<DNATrait[]>> {
    const client = await this.getClient();

    let traitsToInsert: DNATraitInput[];

    if (initialTraits && creationMode === "advanced") {
      traitsToInsert = [
        ...(initialTraits.core || []),
        ...(initialTraits.emotional || []),
        ...(initialTraits.cognitive || []),
        ...(initialTraits.social || []),
        ...(initialTraits.behavioral || []),
      ];
    } else {
      traitsToInsert = DEFAULT_TRAITS;
    }

    const inserts = traitsToInsert.map(t => ({
      character_id: characterId,
      category: t.category,
      domain: t.domain || CATEGORY_TO_DOMAIN[t.category],
      trait_key: t.traitKey,
      trait_value: t.traitValue,
      influence_weight: t.influenceWeight ?? 1.0,
      resistance: t.resistance ?? 0.5,
      volatility: t.volatility ?? 0.3,
      min_value: t.minValue ?? 0,
      max_value: t.maxValue ?? 100,
      description: t.description || null,
      is_locked: false,
    }));

    const { data, error } = await client
      .from("dna_traits")
      .insert(inserts)
      .select();

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true, data: (data || []).map(this.mapToTrait) };
  }

  async getTraits(characterId: string): Promise<ServiceResult<DNATrait[]>> {
    const client = await this.getClient();

    const { data, error } = await client
      .from("dna_traits")
      .select("*")
      .eq("character_id", characterId);

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true, data: (data || []).map(this.mapToTrait) };
  }

  async getTrait(traitId: string): Promise<ServiceResult<DNATrait>> {
    const client = await this.getClient();

    const { data, error } = await client
      .from("dna_traits")
      .select("*")
      .eq("id", traitId)
      .single();

    if (error || !data) {
      return { success: false, error: "Trait not found", code: "NOT_FOUND" };
    }

    return { success: true, data: this.mapToTrait(data) };
  }

  async updateTrait(
    traitId: string,
    userId: string,
    updates: {
      traitValue?: number;
      influenceWeight?: number;
      resistance?: number;
      volatility?: number;
    },
    reason?: string
  ): Promise<ServiceResult<DNATrait>> {
    const client = await this.getClient();

    const { data: existing } = await client
      .from("dna_traits")
      .select("*, character_dna!inner(user_id, version, creation_mode)")
      .eq("id", traitId)
      .single();

    if (!existing) {
      return { success: false, error: "Trait not found", code: "NOT_FOUND" };
    }

    if (existing.character_dna.user_id !== userId) {
      return { success: false, error: "Access denied", code: "FORBIDDEN" };
    }

    if (existing.is_locked) {
      return { success: false, error: "Trait is locked", code: "LOCKED" };
    }

    const validation = this.validateTraitUpdate(existing, updates);
    if (!validation.isValid) {
      return { success: false, error: validation.errors[0]?.message || "Validation failed", code: "VALIDATION_ERROR" };
    }

    const tokenService = new TokenService();
    const tokenResult = await tokenService.useTokens(userId, TOKEN_COSTS.dna_edit_single, "dna_edit", {
      description: `Updated trait: ${existing.trait_key}`,
      referenceId: existing.character_id,
    });

    if (!tokenResult.success) {
      return { success: false, error: "Insufficient tokens", code: "INSUFFICIENT_TOKENS" };
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.traitValue !== undefined) updateData.trait_value = updates.traitValue;
    if (updates.influenceWeight !== undefined) updateData.influence_weight = updates.influenceWeight;
    if (updates.resistance !== undefined) updateData.resistance = updates.resistance;
    if (updates.volatility !== undefined) updateData.volatility = updates.volatility;

    const { data: updated, error } = await client
      .from("dna_traits")
      .update(updateData)
      .eq("id", traitId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    const newVersion = existing.character_dna.version + 1;
    await this.createVersion(existing.character_id, newVersion, reason || "Trait updated");

    await client
      .from("character_dna")
      .update({ version: newVersion, updated_at: new Date().toISOString() })
      .eq("id", existing.character_id);

    await this.logEvolution(existing.character_id, existing.character_dna.version, newVersion, "manual_edit", [
      {
        traitId,
        traitKey: existing.trait_key,
        oldValue: Number(existing.trait_value),
        newValue: updates.traitValue ?? Number(existing.trait_value),
        changeReason: reason,
      },
    ], TOKEN_COSTS.dna_edit_single);

    return { success: true, data: this.mapToTrait(updated) };
  }

  async updateTraitsBatch(
    characterId: string,
    userId: string,
    updates: Array<{ traitId: string; traitValue: number }>,
    reason?: string
  ): Promise<ServiceResult<DNATrait[]>> {
    const client = await this.getClient();

    const { data: character } = await client
      .from("character_dna")
      .select("user_id, version, creation_mode")
      .eq("id", characterId)
      .single();

    if (!character) {
      return { success: false, error: "Character not found", code: "NOT_FOUND" };
    }

    if (character.user_id !== userId) {
      return { success: false, error: "Access denied", code: "FORBIDDEN" };
    }

    const { data: traits } = await client
      .from("dna_traits")
      .select("*")
      .eq("character_id", characterId)
      .in("id", updates.map(u => u.traitId));

    if (!traits || traits.length !== updates.length) {
      return { success: false, error: "Some traits not found", code: "NOT_FOUND" };
    }

    const lockedTraits = traits.filter(t => t.is_locked);
    if (lockedTraits.length > 0) {
      return { success: false, error: `Cannot update locked traits: ${lockedTraits.map(t => t.trait_key).join(", ")}`, code: "LOCKED" };
    }

    const tokenService = new TokenService();
    const tokenResult = await tokenService.useTokens(userId, TOKEN_COSTS.dna_edit_batch, "dna_edit_batch", {
      description: `Batch updated ${updates.length} traits`,
      referenceId: characterId,
    });

    if (!tokenResult.success) {
      return { success: false, error: "Insufficient tokens", code: "INSUFFICIENT_TOKENS" };
    }

    const traitChanges: TraitChange[] = [];
    const updatedTraits: DNATrait[] = [];

    for (const update of updates) {
      const existing = traits.find(t => t.id === update.traitId);
      if (!existing) continue;

      const clampedValue = Math.max(Number(existing.min_value), Math.min(Number(existing.max_value), update.traitValue));

      const { data: updated } = await client
        .from("dna_traits")
        .update({ trait_value: clampedValue, updated_at: new Date().toISOString() })
        .eq("id", update.traitId)
        .select()
        .single();

      if (updated) {
        updatedTraits.push(this.mapToTrait(updated));
        traitChanges.push({
          traitId: update.traitId,
          traitKey: existing.trait_key,
          oldValue: Number(existing.trait_value),
          newValue: clampedValue,
          changeReason: reason,
        });
      }
    }

    const newVersion = character.version + 1;
    await this.createVersion(characterId, newVersion, reason || "Batch trait update");

    await client
      .from("character_dna")
      .update({ version: newVersion, updated_at: new Date().toISOString() })
      .eq("id", characterId);

    await this.logEvolution(characterId, character.version, newVersion, "manual_edit", traitChanges, TOKEN_COSTS.dna_edit_batch);

    return { success: true, data: updatedTraits };
  }

  async lockTrait(
    traitId: string,
    userId: string
  ): Promise<ServiceResult<DNATrait>> {
    const client = await this.getClient();

    const { data: existing } = await client
      .from("dna_traits")
      .select("*, character_dna!inner(user_id)")
      .eq("id", traitId)
      .single();

    if (!existing) {
      return { success: false, error: "Trait not found", code: "NOT_FOUND" };
    }

    if (existing.character_dna.user_id !== userId) {
      return { success: false, error: "Access denied", code: "FORBIDDEN" };
    }

    if (existing.is_locked) {
      return { success: false, error: "Trait already locked", code: "ALREADY_LOCKED" };
    }

    const tokenService = new TokenService();
    const tokenResult = await tokenService.useTokens(userId, TOKEN_COSTS.dna_lock_trait, "dna_lock", {
      description: `Locked trait: ${existing.trait_key}`,
      referenceId: existing.character_id,
    });

    if (!tokenResult.success) {
      return { success: false, error: "Insufficient tokens", code: "INSUFFICIENT_TOKENS" };
    }

    const { data: updated, error } = await client
      .from("dna_traits")
      .update({
        is_locked: true,
        locked_at: new Date().toISOString(),
        locked_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", traitId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true, data: this.mapToTrait(updated) };
  }

  async unlockTrait(
    traitId: string,
    userId: string
  ): Promise<ServiceResult<DNATrait>> {
    const client = await this.getClient();

    const { data: existing } = await client
      .from("dna_traits")
      .select("*, character_dna!inner(user_id)")
      .eq("id", traitId)
      .single();

    if (!existing) {
      return { success: false, error: "Trait not found", code: "NOT_FOUND" };
    }

    if (existing.character_dna.user_id !== userId) {
      return { success: false, error: "Access denied", code: "FORBIDDEN" };
    }

    if (!existing.is_locked) {
      return { success: false, error: "Trait is not locked", code: "NOT_LOCKED" };
    }

    const tokenService = new TokenService();
    const tokenResult = await tokenService.useTokens(userId, TOKEN_COSTS.dna_unlock_trait, "dna_unlock", {
      description: `Unlocked trait: ${existing.trait_key}`,
      referenceId: existing.character_id,
    });

    if (!tokenResult.success) {
      return { success: false, error: "Insufficient tokens", code: "INSUFFICIENT_TOKENS" };
    }

    const { data: updated, error } = await client
      .from("dna_traits")
      .update({
        is_locked: false,
        locked_at: null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", traitId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true, data: this.mapToTrait(updated) };
  }

  async getVersionHistory(characterId: string): Promise<ServiceResult<DNAVersion[]>> {
    const client = await this.getClient();

    const { data, error } = await client
      .from("dna_versions")
      .select("*")
      .eq("character_id", characterId)
      .order("version", { ascending: false });

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return {
      success: true,
      data: (data || []).map(row => ({
        id: row.id,
        characterId: row.character_id,
        version: row.version,
        traitsSnapshot: row.traits_snapshot,
        changeReason: row.change_reason,
        createdAt: row.created_at,
      })),
    };
  }

  async rollback(
    characterId: string,
    userId: string,
    options: DNARollbackOptions
  ): Promise<ServiceResult<DNATrait[]>> {
    const client = await this.getClient();

    const { data: character } = await client
      .from("character_dna")
      .select("user_id, version")
      .eq("id", characterId)
      .single();

    if (!character) {
      return { success: false, error: "Character not found", code: "NOT_FOUND" };
    }

    if (character.user_id !== userId) {
      return { success: false, error: "Access denied", code: "FORBIDDEN" };
    }

    const { data: targetVersion } = await client
      .from("dna_versions")
      .select("*")
      .eq("character_id", characterId)
      .eq("version", options.targetVersion)
      .single();

    if (!targetVersion) {
      return { success: false, error: "Target version not found", code: "NOT_FOUND" };
    }

    const tokenService = new TokenService();
    const tokenResult = await tokenService.useTokens(userId, TOKEN_COSTS.dna_rollback, "dna_rollback", {
      description: `Rolled back to version ${options.targetVersion}`,
      referenceId: characterId,
    });

    if (!tokenResult.success) {
      return { success: false, error: "Insufficient tokens", code: "INSUFFICIENT_TOKENS" };
    }

    const { data: currentTraits } = await client
      .from("dna_traits")
      .select("*")
      .eq("character_id", characterId);

    const snapshot = targetVersion.traits_snapshot as { traits?: Array<Record<string, unknown>> };
    const snapshotTraits = snapshot.traits || [];

    const traitChanges: TraitChange[] = [];

    for (const current of currentTraits || []) {
      const snapshotTrait = snapshotTraits.find(
        (t: Record<string, unknown>) => t.trait_key === current.trait_key
      );

      if (snapshotTrait && !current.is_locked) {
        const newValue = Number(snapshotTrait.trait_value);
        if (Number(current.trait_value) !== newValue) {
          traitChanges.push({
            traitId: current.id,
            traitKey: current.trait_key,
            oldValue: Number(current.trait_value),
            newValue,
            changeReason: options.reason,
          });

          await client
            .from("dna_traits")
            .update({
              trait_value: newValue,
              influence_weight: snapshotTrait.influence_weight,
              resistance: snapshotTrait.resistance,
              volatility: snapshotTrait.volatility,
              updated_at: new Date().toISOString(),
            })
            .eq("id", current.id);
        }
      }
    }

    const newVersion = character.version + 1;
    await this.createVersion(characterId, newVersion, `Rollback to v${options.targetVersion}: ${options.reason}`);

    await client
      .from("character_dna")
      .update({ version: newVersion, updated_at: new Date().toISOString() })
      .eq("id", characterId);

    await this.logEvolution(characterId, character.version, newVersion, "rollback", traitChanges, TOKEN_COSTS.dna_rollback, {
      targetVersion: options.targetVersion,
    });

    return this.getTraits(characterId);
  }

  async reset(
    characterId: string,
    userId: string,
    reason: string
  ): Promise<ServiceResult<DNATrait[]>> {
    const client = await this.getClient();

    const { data: character } = await client
      .from("character_dna")
      .select("user_id, version")
      .eq("id", characterId)
      .single();

    if (!character) {
      return { success: false, error: "Character not found", code: "NOT_FOUND" };
    }

    if (character.user_id !== userId) {
      return { success: false, error: "Access denied", code: "FORBIDDEN" };
    }

    const tokenService = new TokenService();
    const tokenResult = await tokenService.useTokens(userId, TOKEN_COSTS.dna_reset, "dna_reset", {
      description: "Reset DNA to defaults",
      referenceId: characterId,
    });

    if (!tokenResult.success) {
      return { success: false, error: "Insufficient tokens", code: "INSUFFICIENT_TOKENS" };
    }

    const { data: currentTraits } = await client
      .from("dna_traits")
      .select("*")
      .eq("character_id", characterId);

    const traitChanges: TraitChange[] = [];

    for (const current of currentTraits || []) {
      if (!current.is_locked && Number(current.trait_value) !== 50) {
        traitChanges.push({
          traitId: current.id,
          traitKey: current.trait_key,
          oldValue: Number(current.trait_value),
          newValue: 50,
          changeReason: reason,
        });

        await client
          .from("dna_traits")
          .update({
            trait_value: 50,
            influence_weight: 1.0,
            resistance: 0.5,
            volatility: 0.3,
            updated_at: new Date().toISOString(),
          })
          .eq("id", current.id);
      }
    }

    const newVersion = character.version + 1;
    await this.createVersion(characterId, newVersion, `Reset: ${reason}`);

    await client
      .from("character_dna")
      .update({ version: newVersion, updated_at: new Date().toISOString() })
      .eq("id", characterId);

    await this.logEvolution(characterId, character.version, newVersion, "reset", traitChanges, TOKEN_COSTS.dna_reset);

    return this.getTraits(characterId);
  }

  async addRule(
    characterId: string,
    userId: string,
    rule: DNATraitRuleInput
  ): Promise<ServiceResult<DNATraitRule>> {
    const client = await this.getClient();

    const { data: character } = await client
      .from("character_dna")
      .select("user_id")
      .eq("id", characterId)
      .single();

    if (!character) {
      return { success: false, error: "Character not found", code: "NOT_FOUND" };
    }

    if (character.user_id !== userId) {
      return { success: false, error: "Access denied", code: "FORBIDDEN" };
    }

    const { data, error } = await client
      .from("dna_trait_rules")
      .insert({
        character_id: characterId,
        source_trait_id: rule.sourceTraitId,
        target_trait_id: rule.targetTraitId,
        rule_type: rule.ruleType,
        strength: rule.strength ?? 0.5,
        description: rule.description || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true, data: this.mapToTraitRule(data) };
  }

  async getRules(characterId: string): Promise<ServiceResult<DNATraitRule[]>> {
    const client = await this.getClient();

    const { data, error } = await client
      .from("dna_trait_rules")
      .select("*")
      .eq("character_id", characterId)
      .eq("is_active", true);

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true, data: (data || []).map(this.mapToTraitRule) };
  }

  async validateDNA(characterId: string): Promise<DNAValidationResult> {
    const traitsResult = await this.getTraits(characterId);
    const rulesResult = await this.getRules(characterId);

    if (!traitsResult.success || !rulesResult.success) {
      return { isValid: false, errors: [{ traitKey: "", errorType: "conflict", message: "Failed to load DNA data" }], warnings: [] };
    }

    const traits = traitsResult.data!;
    const rules = rulesResult.data!;
    const errors: DNAValidationError[] = [];
    const warnings: DNAValidationWarning[] = [];

    for (const trait of traits) {
      if (trait.traitValue < trait.minValue || trait.traitValue > trait.maxValue) {
        errors.push({
          traitKey: trait.traitKey,
          errorType: "out_of_range",
          message: `Value ${trait.traitValue} is outside range [${trait.minValue}, ${trait.maxValue}]`,
        });
      }

      if (trait.volatility > 0.7) {
        warnings.push({
          traitKey: trait.traitKey,
          warningType: "high_volatility",
          message: `High volatility (${trait.volatility}) may cause unpredictable behavior`,
        });
      }

      if (trait.traitValue <= trait.minValue + 5 || trait.traitValue >= trait.maxValue - 5) {
        warnings.push({
          traitKey: trait.traitKey,
          warningType: "boundary_approaching",
          message: `Value is near the boundary`,
        });
      }
    }

    for (const rule of rules) {
      if (rule.ruleType === "conflict") {
        const source = traits.find(t => t.id === rule.sourceTraitId);
        const target = traits.find(t => t.id === rule.targetTraitId);

        if (source && target) {
          const sourceHigh = source.traitValue > 70;
          const targetHigh = target.traitValue > 70;

          if (sourceHigh && targetHigh) {
            errors.push({
              traitKey: `${source.traitKey}/${target.traitKey}`,
              errorType: "conflict",
              message: `Conflicting traits both have high values`,
            });
          }
        }
      }

      if (rule.ruleType === "dependency") {
        const source = traits.find(t => t.id === rule.sourceTraitId);
        const target = traits.find(t => t.id === rule.targetTraitId);

        if (source && target) {
          const sourceLow = source.traitValue < 30;
          const targetHigh = target.traitValue > 70;

          if (sourceLow && targetHigh) {
            errors.push({
              traitKey: target.traitKey,
              errorType: "dependency_violated",
              message: `Depends on ${source.traitKey} which has low value`,
            });
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async evolveTrait(
    characterId: string,
    traitKey: string,
    direction: "increase" | "decrease",
    strength: number,
    source: "interaction" | "memory_impact",
    sourceReferenceId?: string
  ): Promise<ServiceResult<DNATrait>> {
    const client = await this.getClient();

    const { data: trait } = await client
      .from("dna_traits")
      .select("*, character_dna!inner(user_id, version)")
      .eq("character_id", characterId)
      .eq("trait_key", traitKey)
      .single();

    if (!trait) {
      return { success: false, error: "Trait not found", code: "NOT_FOUND" };
    }

    if (trait.is_locked) {
      return { success: true, data: this.mapToTrait(trait) };
    }

    const resistance = Number(trait.resistance);
    const volatility = Number(trait.volatility);
    const effectiveStrength = strength * (1 - resistance) * (1 + volatility);

    const change = direction === "increase" ? effectiveStrength : -effectiveStrength;
    const newValue = Math.max(
      Number(trait.min_value),
      Math.min(Number(trait.max_value), Number(trait.trait_value) + change)
    );

    if (Math.abs(newValue - Number(trait.trait_value)) < 0.1) {
      return { success: true, data: this.mapToTrait(trait) };
    }

    const { data: updated, error } = await client
      .from("dna_traits")
      .update({ trait_value: newValue, updated_at: new Date().toISOString() })
      .eq("id", trait.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    const newVersion = trait.character_dna.version + 1;
    await this.createVersion(characterId, newVersion, `Evolution from ${source}`);

    await client
      .from("character_dna")
      .update({ version: newVersion, updated_at: new Date().toISOString() })
      .eq("id", characterId);

    await this.logEvolution(characterId, trait.character_dna.version, newVersion, source, [
      {
        traitId: trait.id,
        traitKey: trait.trait_key,
        oldValue: Number(trait.trait_value),
        newValue,
      },
    ], 0, { triggerSource: source, triggerReferenceId: sourceReferenceId });

    return { success: true, data: this.mapToTrait(updated) };
  }

  private async createVersion(characterId: string, version: number, reason: string): Promise<void> {
    const client = await this.getClient();

    const { data: traits } = await client
      .from("dna_traits")
      .select("*")
      .eq("character_id", characterId);

    await client.from("dna_versions").insert({
      character_id: characterId,
      version,
      traits_snapshot: { traits: traits || [] },
      change_reason: reason,
    });
  }

  private async logEvolution(
    characterId: string,
    fromVersion: number,
    toVersion: number,
    evolutionType: DNAEvolutionLog["evolutionType"],
    traitChanges: TraitChange[],
    tokenCost: number,
    extra?: { triggerSource?: string; triggerReferenceId?: string; targetVersion?: number }
  ): Promise<void> {
    const client = await this.getClient();

    await client.from("dna_evolution_log").insert({
      character_id: characterId,
      from_version: fromVersion,
      to_version: toVersion,
      evolution_type: evolutionType,
      trigger_source: extra?.triggerSource || evolutionType,
      trigger_reference_id: extra?.triggerReferenceId || null,
      trait_changes: traitChanges,
      memories_involved: [],
      reasoning_data: extra?.targetVersion ? { targetVersion: extra.targetVersion } : {},
      token_cost: tokenCost,
    });
  }

  private validateTraitUpdate(
    existing: Record<string, unknown>,
    updates: { traitValue?: number }
  ): DNAValidationResult {
    const errors: DNAValidationError[] = [];
    const warnings: DNAValidationWarning[] = [];

    if (updates.traitValue !== undefined) {
      const min = Number(existing.min_value);
      const max = Number(existing.max_value);

      if (updates.traitValue < min || updates.traitValue > max) {
        errors.push({
          traitKey: existing.trait_key as string,
          errorType: "out_of_range",
          message: `Value ${updates.traitValue} must be between ${min} and ${max}`,
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private mapToTrait(row: Record<string, unknown>): DNATrait {
    return {
      id: row.id as string,
      characterId: row.character_id as string,
      domain: row.domain as TraitDomain,
      category: row.category as TraitCategory,
      traitKey: row.trait_key as string,
      traitValue: Number(row.trait_value),
      influenceWeight: Number(row.influence_weight),
      resistance: Number(row.resistance),
      volatility: Number(row.volatility),
      isLocked: row.is_locked as boolean,
      lockedAt: row.locked_at as string | null,
      lockedBy: row.locked_by as string | null,
      minValue: Number(row.min_value),
      maxValue: Number(row.max_value),
      description: row.description as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private mapToTraitRule(row: Record<string, unknown>): DNATraitRule {
    return {
      id: row.id as string,
      characterId: row.character_id as string,
      sourceTraitId: row.source_trait_id as string,
      targetTraitId: row.target_trait_id as string,
      ruleType: row.rule_type as DNATraitRule["ruleType"],
      strength: Number(row.strength),
      description: row.description as string | null,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as string,
    };
  }
}

export const dnaService = new DNAService();
