import { createServiceClient } from "@/lib/supabase/server";
import type {
  Character,
  CharacterCreateInput,
  CharacterUpdateInput,
  CharacterFull,
  CharacterCloneOptions,
  DNATrait,
  DNATraitRule,
  CharacterMemory,
  VoiceProfile,
  VisualProfile,
  SubscriptionPlan,
} from "@/lib/types/character";
import { TOKEN_COSTS, SUBSCRIPTION_LIMITS } from "@/lib/types/character";
import { DNAService } from "./dna-service";
import { MemoryService } from "./memory-service";
import { TokenService } from "./token-service";

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export class CharacterService {
  private supabase: Awaited<ReturnType<typeof createServiceClient>> | null = null;

  private async getClient() {
    if (!this.supabase) {
      this.supabase = await createServiceClient();
    }
    return this.supabase;
  }

  async getCharacter(characterId: string, userId: string): Promise<ServiceResult<Character>> {
    const client = await this.getClient();

    const { data, error } = await client
      .from("character_dna")
      .select("*")
      .eq("id", characterId)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return { success: false, error: "Character not found", code: "NOT_FOUND" };
    }

    if (data.user_id !== userId && data.visibility === "private") {
      return { success: false, error: "Access denied", code: "FORBIDDEN" };
    }

    return { success: true, data: this.mapToCharacter(data) };
  }

  async getCharacterFull(characterId: string, userId: string): Promise<ServiceResult<CharacterFull>> {
    const client = await this.getClient();

    const charResult = await this.getCharacter(characterId, userId);
    if (!charResult.success || !charResult.data) {
      return charResult as ServiceResult<CharacterFull>;
    }

    const [traitsResult, rulesResult, memoriesResult, voiceResult, visualResult] = await Promise.all([
      client.from("dna_traits").select("*").eq("character_id", characterId),
      client.from("dna_trait_rules").select("*").eq("character_id", characterId).eq("is_active", true),
      client.from("character_memories").select("*").eq("character_id", characterId).order("created_at", { ascending: false }),
      client.from("character_voice_profiles").select("*").eq("character_id", characterId).eq("is_active", true).single(),
      client.from("character_visual_profiles").select("*").eq("character_id", characterId).eq("is_active", true).single(),
    ]);

    const traits = (traitsResult.data || []).map(this.mapToTrait);
    const rules = (rulesResult.data || []).map(this.mapToTraitRule);
    const memories = (memoriesResult.data || []).map(this.mapToMemory);

    const coreMemories = memories.filter(m => m.memoryType === "core");
    const longTermMemories = memories.filter(m => m.memoryType === "long_term");
    const shortTermCount = memories.filter(m => m.memoryType === "short_term").length;

    const fullCharacter: CharacterFull = {
      ...charResult.data,
      dna: {
        traits,
        rules,
        currentVersion: charResult.data.metadata.version,
      },
      memories: {
        core: coreMemories,
        longTerm: longTermMemories,
        shortTermCount,
      },
      voiceProfile: voiceResult.data ? this.mapToVoiceProfile(voiceResult.data) : null,
      visualProfile: visualResult.data ? this.mapToVisualProfile(visualResult.data) : null,
    };

    return { success: true, data: fullCharacter };
  }

  async listCharacters(userId: string, options?: {
    includeDemo?: boolean;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ServiceResult<{ characters: Character[]; total: number }>> {
    const client = await this.getClient();

    let query = client
      .from("character_dna")
      .select("*", { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (options?.includeDemo) {
      query = query.or(`user_id.eq.${userId},is_demo.eq.true`);
    } else {
      query = query.eq("user_id", userId);
    }

    if (options?.status) {
      query = query.eq("status", options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return {
      success: true,
      data: {
        characters: (data || []).map(this.mapToCharacter),
        total: count || 0,
      },
    };
  }

  async createCharacter(
    userId: string,
    input: CharacterCreateInput,
    plan: SubscriptionPlan
  ): Promise<ServiceResult<CharacterFull>> {
    const client = await this.getClient();
    const limits = SUBSCRIPTION_LIMITS[plan];

    if (!limits.canCreate) {
      return { success: false, error: "Subscription does not allow character creation", code: "FORBIDDEN" };
    }

    const { count } = await client
      .from("character_dna")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_demo", false)
      .is("deleted_at", null);

    if (limits.maxCharacters !== -1 && (count || 0) >= limits.maxCharacters) {
      return { success: false, error: "Character limit reached", code: "LIMIT_REACHED" };
    }

    const tokenService = new TokenService();
    const tokenResult = await tokenService.useTokens(userId, TOKEN_COSTS.character_creation, "character_creation", {
      description: `Created character: ${input.name}`,
    });

    if (!tokenResult.success) {
      return { success: false, error: tokenResult.error || "Insufficient tokens", code: "INSUFFICIENT_TOKENS" };
    }

    const { data: character, error: charError } = await client
      .from("character_dna")
      .insert({
        user_id: userId,
        name: input.name,
        public_description: input.publicDescription || null,
        creator_notes: input.creatorNotes || null,
        avatar_url: input.avatarUrl || null,
        visibility: input.visibility || "private",
        creation_mode: input.creationMode,
        status: "active",
        version: 1,
      })
      .select()
      .single();

    if (charError || !character) {
      return { success: false, error: charError?.message || "Failed to create character", code: "DB_ERROR" };
    }

    const dnaService = new DNAService();
    await dnaService.initializeDNA(character.id, input.initialDNA, input.creationMode);

    await client.from("dna_versions").insert({
      character_id: character.id,
      version: 1,
      traits_snapshot: input.initialDNA || {},
      change_reason: "Initial creation",
    });

    await this.logAction(character.id, userId, "character_created", {
      name: input.name,
      creationMode: input.creationMode,
    }, TOKEN_COSTS.character_creation);

    return this.getCharacterFull(character.id, userId);
  }

  async updateCharacter(
    characterId: string,
    userId: string,
    input: CharacterUpdateInput
  ): Promise<ServiceResult<Character>> {
    const client = await this.getClient();

    const { data: existing } = await client
      .from("character_dna")
      .select("user_id, status")
      .eq("id", characterId)
      .is("deleted_at", null)
      .single();

    if (!existing) {
      return { success: false, error: "Character not found", code: "NOT_FOUND" };
    }

    if (existing.user_id !== userId) {
      return { success: false, error: "Access denied", code: "FORBIDDEN" };
    }

    if (existing.status === "locked") {
      return { success: false, error: "Character is locked", code: "LOCKED" };
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) updateData.name = input.name;
    if (input.publicDescription !== undefined) updateData.public_description = input.publicDescription;
    if (input.creatorNotes !== undefined) updateData.creator_notes = input.creatorNotes;
    if (input.avatarUrl !== undefined) updateData.avatar_url = input.avatarUrl;
    if (input.visibility !== undefined) updateData.visibility = input.visibility;
    if (input.status !== undefined) updateData.status = input.status;

    const { data, error } = await client
      .from("character_dna")
      .update(updateData)
      .eq("id", characterId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    await this.logAction(characterId, userId, "character_updated", { changes: Object.keys(updateData) }, 0);

    return { success: true, data: this.mapToCharacter(data) };
  }

  async deleteCharacter(characterId: string, userId: string): Promise<ServiceResult<void>> {
    const client = await this.getClient();

    const { data: existing } = await client
      .from("character_dna")
      .select("user_id, is_demo")
      .eq("id", characterId)
      .is("deleted_at", null)
      .single();

    if (!existing) {
      return { success: false, error: "Character not found", code: "NOT_FOUND" };
    }

    if (existing.user_id !== userId) {
      return { success: false, error: "Access denied", code: "FORBIDDEN" };
    }

    if (existing.is_demo) {
      return { success: false, error: "Cannot delete demo characters", code: "FORBIDDEN" };
    }

    const { error } = await client
      .from("character_dna")
      .update({ deleted_at: new Date().toISOString(), status: "archived" })
      .eq("id", characterId);

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    await this.logAction(characterId, userId, "character_deleted", {}, 0);

    return { success: true };
  }

  async cloneCharacter(
    sourceCharacterId: string,
    userId: string,
    options: CharacterCloneOptions,
    plan: SubscriptionPlan
  ): Promise<ServiceResult<CharacterFull>> {
    const limits = SUBSCRIPTION_LIMITS[plan];

    if (!limits.canClone) {
      return { success: false, error: "Subscription does not allow cloning", code: "FORBIDDEN" };
    }

    const sourceResult = await this.getCharacterFull(sourceCharacterId, userId);
    if (!sourceResult.success || !sourceResult.data) {
      return { success: false, error: "Source character not found", code: "NOT_FOUND" };
    }

    const source = sourceResult.data;

    if (source.state.visibility === "private" && source.userId !== userId) {
      return { success: false, error: "Cannot clone private character", code: "FORBIDDEN" };
    }

    const tokenService = new TokenService();
    const tokenResult = await tokenService.useTokens(userId, TOKEN_COSTS.character_clone, "character_clone", {
      description: `Cloned character: ${source.identity.name} -> ${options.newName}`,
      referenceId: sourceCharacterId,
    });

    if (!tokenResult.success) {
      return { success: false, error: "Insufficient tokens", code: "INSUFFICIENT_TOKENS" };
    }

    const client = await this.getClient();

    const { data: newChar, error: charError } = await client
      .from("character_dna")
      .insert({
        user_id: userId,
        name: options.newName,
        public_description: source.identity.publicDescription,
        creator_notes: null,
        avatar_url: source.presentation.avatarUrl,
        visibility: "private",
        creation_mode: source.state.creationMode,
        status: "active",
        version: 1,
        forked_from: sourceCharacterId,
      })
      .select()
      .single();

    if (charError || !newChar) {
      return { success: false, error: "Failed to clone character", code: "DB_ERROR" };
    }

    await client
      .from("character_dna")
      .update({ fork_count: source.metadata.forkCount + 1 })
      .eq("id", sourceCharacterId);

    if (options.includeDNA && source.dna.traits.length > 0) {
      const traitInserts = source.dna.traits.map(t => ({
        character_id: newChar.id,
        category: t.category,
        domain: t.domain,
        trait_key: t.traitKey,
        trait_value: t.traitValue,
        influence_weight: t.influenceWeight,
        resistance: t.resistance,
        volatility: t.volatility,
        is_locked: false,
        min_value: t.minValue,
        max_value: t.maxValue,
        description: t.description,
      }));

      await client.from("dna_traits").insert(traitInserts);

      await client.from("dna_versions").insert({
        character_id: newChar.id,
        version: 1,
        traits_snapshot: { traits: traitInserts },
        change_reason: `Cloned from ${source.identity.name}`,
      });
    }

    if (options.includeMemories) {
      const memoryService = new MemoryService();
      const memoryTypes = options.memoryTypes || ["core", "long_term"];
      
      for (const memory of [...source.memories.core, ...source.memories.longTerm]) {
        if (memoryTypes.includes(memory.memoryType)) {
          await memoryService.createMemory(newChar.id, {
            memoryType: memory.memoryType,
            importance: memory.importance,
            content: memory.content,
            contextData: { ...memory.contextData, clonedFrom: memory.id },
            emotionalImpact: memory.emotionalImpact,
            isImmutable: memory.memoryType === "core",
          });
        }
      }
    }

    if (options.includeVoiceProfile && source.voiceProfile) {
      await client.from("character_voice_profiles").insert({
        character_id: newChar.id,
        voice_style: source.voiceProfile.voiceStyle,
        pitch_base: source.voiceProfile.pitchBase,
        speed_base: source.voiceProfile.speedBase,
        emotional_modulation: source.voiceProfile.emotionalModulation,
        accent_reference: source.voiceProfile.accentReference,
        custom_params: source.voiceProfile.customParams,
        is_active: true,
      });
    }

    if (options.includeVisualProfile && source.visualProfile) {
      await client.from("character_visual_profiles").insert({
        character_id: newChar.id,
        avatar_style: source.visualProfile.avatarStyle,
        base_appearance: source.visualProfile.baseAppearance,
        facial_features: source.visualProfile.facialFeatures,
        expression_mappings: source.visualProfile.expressionMappings,
        style_references: source.visualProfile.styleReferences,
        color_palette: source.visualProfile.colorPalette,
        custom_params: source.visualProfile.customParams,
        is_active: true,
      });
    }

    await this.logAction(newChar.id, userId, "character_cloned", {
      sourceCharacterId,
      options,
    }, TOKEN_COSTS.character_clone);

    return this.getCharacterFull(newChar.id, userId);
  }

  async recordInteraction(characterId: string): Promise<void> {
    const client = await this.getClient();

    await client
      .from("character_dna")
      .update({
        last_interaction_at: new Date().toISOString(),
        interaction_count: client.sql`interaction_count + 1`,
      })
      .eq("id", characterId);
  }

  private async logAction(
    characterId: string,
    userId: string,
    actionType: string,
    actionData: Record<string, unknown>,
    tokenCost: number,
    options?: {
      traitsInvolved?: Array<{ traitId: string; traitKey: string; value: number; influence: number }>;
      memoriesInvolved?: string[];
      reasoningMetadata?: Record<string, unknown>;
      responseTimeMs?: number;
    }
  ): Promise<void> {
    const client = await this.getClient();

    await client.from("character_action_log").insert({
      character_id: characterId,
      user_id: userId,
      action_type: actionType,
      action_data: actionData,
      traits_involved: options?.traitsInvolved || [],
      memories_involved: options?.memoriesInvolved || [],
      reasoning_metadata: options?.reasoningMetadata || {},
      token_cost: tokenCost,
      response_time_ms: options?.responseTimeMs || null,
    });
  }

  private mapToCharacter(row: Record<string, unknown>): Character {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      identity: {
        name: row.name as string,
        publicDescription: row.public_description as string | null,
        creatorNotes: row.creator_notes as string | null,
      },
      presentation: {
        avatarUrl: row.avatar_url as string | null,
        voiceProfileId: null,
        visualProfileId: null,
      },
      state: {
        status: row.status as "active" | "archived" | "locked",
        visibility: row.visibility as "private" | "shared" | "public",
        creationMode: row.creation_mode as "standard" | "advanced",
      },
      metadata: {
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
        lastInteractionAt: row.last_interaction_at as string | null,
        version: row.version as number,
        forkedFrom: row.forked_from as string | null,
        forkCount: row.fork_count as number,
        interactionCount: row.interaction_count as number,
      },
      isDemo: row.is_demo as boolean,
    };
  }

  private mapToTrait(row: Record<string, unknown>): DNATrait {
    return {
      id: row.id as string,
      characterId: row.character_id as string,
      domain: row.domain as DNATrait["domain"],
      category: row.category as DNATrait["category"],
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

  private mapToMemory(row: Record<string, unknown>): CharacterMemory {
    return {
      id: row.id as string,
      characterId: row.character_id as string,
      memoryType: row.memory_type as CharacterMemory["memoryType"],
      importance: row.importance as CharacterMemory["importance"],
      content: row.content as string,
      contentHash: row.content_hash as string | null,
      contextData: row.context_data as CharacterMemory["contextData"],
      emotionalImpact: row.emotional_impact as CharacterMemory["emotionalImpact"],
      affectedTraits: row.affected_traits as CharacterMemory["affectedTraits"],
      isImmutable: row.is_immutable as boolean,
      expiresAt: row.expires_at as string | null,
      accessedCount: row.accessed_count as number,
      lastAccessedAt: row.last_accessed_at as string | null,
      sourceType: row.source_type as string | null,
      sourceReferenceId: row.source_reference_id as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private mapToVoiceProfile(row: Record<string, unknown>): VoiceProfile {
    return {
      id: row.id as string,
      characterId: row.character_id as string,
      voiceStyle: row.voice_style as VoiceProfile["voiceStyle"],
      pitchBase: Number(row.pitch_base),
      speedBase: Number(row.speed_base),
      emotionalModulation: row.emotional_modulation as Record<string, number>,
      accentReference: row.accent_reference as string | null,
      vendorVoiceId: row.vendor_voice_id as string | null,
      vendorMetadata: row.vendor_metadata as Record<string, unknown>,
      customParams: row.custom_params as Record<string, unknown>,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private mapToVisualProfile(row: Record<string, unknown>): VisualProfile {
    return {
      id: row.id as string,
      characterId: row.character_id as string,
      avatarStyle: row.avatar_style as VisualProfile["avatarStyle"],
      baseAppearance: row.base_appearance as VisualProfile["baseAppearance"],
      facialFeatures: row.facial_features as VisualProfile["facialFeatures"],
      expressionMappings: row.expression_mappings as Record<string, VisualProfile["expressionMappings"][string]>,
      styleReferences: row.style_references as VisualProfile["styleReferences"],
      colorPalette: row.color_palette as VisualProfile["colorPalette"],
      vendorAvatarId: row.vendor_avatar_id as string | null,
      vendorMetadata: row.vendor_metadata as Record<string, unknown>,
      customParams: row.custom_params as Record<string, unknown>,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}

export const characterService = new CharacterService();
