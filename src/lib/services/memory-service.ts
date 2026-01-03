import { createServiceClient } from "@/lib/supabase/server";
import { createHash } from "crypto";
import type {
  CharacterMemory,
  MemoryCreateInput,
  MemoryType,
  MemoryImportance,
  MemoryContext,
  EmotionalImpact,
  AffectedTrait,
} from "@/lib/types/character";
import { TOKEN_COSTS, SUBSCRIPTION_LIMITS, SubscriptionPlan } from "@/lib/types/character";
import { TokenService } from "./token-service";
import { DNAService } from "./dna-service";

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

const MEMORY_TOKEN_COSTS: Record<MemoryType, number> = {
  short_term: TOKEN_COSTS.memory_add_short,
  long_term: TOKEN_COSTS.memory_add_long,
  core: TOKEN_COSTS.memory_add_core,
};

const SHORT_TERM_EXPIRY_HOURS = 24;
const MAX_SHORT_TERM_MEMORIES = 50;
const MAX_LONG_TERM_MEMORIES_PER_DAY = 10;

export class MemoryService {
  private supabase: Awaited<ReturnType<typeof createServiceClient>> | null = null;

  private async getClient() {
    if (!this.supabase) {
      this.supabase = await createServiceClient();
    }
    return this.supabase;
  }

  async getMemories(
    characterId: string,
    options?: {
      type?: MemoryType;
      importance?: MemoryImportance;
      limit?: number;
      includeExpired?: boolean;
    }
  ): Promise<ServiceResult<CharacterMemory[]>> {
    const client = await this.getClient();

    let query = client
      .from("character_memories")
      .select("*")
      .eq("character_id", characterId)
      .order("created_at", { ascending: false });

    if (options?.type) {
      query = query.eq("memory_type", options.type);
    }

    if (options?.importance) {
      query = query.eq("importance", options.importance);
    }

    if (!options?.includeExpired) {
      query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true, data: (data || []).map(this.mapToMemory) };
  }

  async getMemory(memoryId: string): Promise<ServiceResult<CharacterMemory>> {
    const client = await this.getClient();

    const { data, error } = await client
      .from("character_memories")
      .select("*")
      .eq("id", memoryId)
      .single();

    if (error || !data) {
      return { success: false, error: "Memory not found", code: "NOT_FOUND" };
    }

    await client
      .from("character_memories")
      .update({
        accessed_count: data.accessed_count + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq("id", memoryId);

    return { success: true, data: this.mapToMemory(data) };
  }

  async createMemory(
    characterId: string,
    input: MemoryCreateInput,
    userId?: string,
    plan?: SubscriptionPlan
  ): Promise<ServiceResult<CharacterMemory>> {
    const client = await this.getClient();

    if (plan) {
      const limits = SUBSCRIPTION_LIMITS[plan];
      const { count } = await client
        .from("character_memories")
        .select("*", { count: "exact", head: true })
        .eq("character_id", characterId);

      if (limits.maxMemories !== -1 && (count || 0) >= limits.maxMemories) {
        return { success: false, error: "Memory limit reached", code: "LIMIT_REACHED" };
      }
    }

    if (userId) {
      const tokenCost = MEMORY_TOKEN_COSTS[input.memoryType];
      const tokenService = new TokenService();
      const tokenResult = await tokenService.useTokens(userId, tokenCost, "memory_add", {
        description: `Added ${input.memoryType} memory`,
        referenceId: characterId,
      });

      if (!tokenResult.success) {
        return { success: false, error: "Insufficient tokens", code: "INSUFFICIENT_TOKENS" };
      }
    }

    const contentHash = this.hashContent(input.content);

    const { data: existing } = await client
      .from("character_memories")
      .select("id")
      .eq("character_id", characterId)
      .eq("content_hash", contentHash)
      .single();

    if (existing) {
      return { success: false, error: "Duplicate memory content", code: "DUPLICATE" };
    }

    let expiresAt = input.expiresAt;
    if (input.memoryType === "short_term" && !expiresAt) {
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + SHORT_TERM_EXPIRY_HOURS);
      expiresAt = expiry.toISOString();
    }

    if (input.memoryType === "short_term") {
      await this.enforceShortTermLimit(characterId);
    }

    const { data: traits } = await client
      .from("dna_traits")
      .select("id, trait_key")
      .eq("character_id", characterId);

    const affectedTraits: AffectedTrait[] = [];
    if (input.affectedTraits && traits) {
      for (const affected of input.affectedTraits) {
        const trait = traits.find(t => t.trait_key === affected.traitKey);
        if (trait) {
          affectedTraits.push({
            traitId: trait.id,
            traitKey: affected.traitKey,
            impactStrength: affected.impactStrength,
            direction: affected.direction,
          });
        }
      }
    }

    const { data, error } = await client
      .from("character_memories")
      .insert({
        character_id: characterId,
        memory_type: input.memoryType,
        importance: input.importance || "medium",
        content: input.content,
        content_hash: contentHash,
        context_data: input.contextData || {},
        emotional_impact: input.emotionalImpact || {},
        affected_traits: affectedTraits,
        is_immutable: input.isImmutable || input.memoryType === "core",
        expires_at: expiresAt || null,
        source_type: input.sourceType || null,
        source_reference_id: input.sourceReferenceId || null,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    if (affectedTraits.length > 0 && input.memoryType !== "short_term") {
      await this.applyMemoryImpact(characterId, affectedTraits, data.id);
    }

    return { success: true, data: this.mapToMemory(data) };
  }

  async updateMemory(
    memoryId: string,
    userId: string,
    updates: {
      importance?: MemoryImportance;
      contextData?: MemoryContext;
      emotionalImpact?: EmotionalImpact;
    }
  ): Promise<ServiceResult<CharacterMemory>> {
    const client = await this.getClient();

    const { data: existing } = await client
      .from("character_memories")
      .select("*, character_dna!inner(user_id)")
      .eq("id", memoryId)
      .single();

    if (!existing) {
      return { success: false, error: "Memory not found", code: "NOT_FOUND" };
    }

    if (existing.character_dna.user_id !== userId) {
      return { success: false, error: "Access denied", code: "FORBIDDEN" };
    }

    if (existing.is_immutable) {
      return { success: false, error: "Memory is immutable", code: "IMMUTABLE" };
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.importance !== undefined) updateData.importance = updates.importance;
    if (updates.contextData !== undefined) updateData.context_data = updates.contextData;
    if (updates.emotionalImpact !== undefined) updateData.emotional_impact = updates.emotionalImpact;

    const { data, error } = await client
      .from("character_memories")
      .update(updateData)
      .eq("id", memoryId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true, data: this.mapToMemory(data) };
  }

  async deleteMemory(memoryId: string, userId: string): Promise<ServiceResult<void>> {
    const client = await this.getClient();

    const { data: existing } = await client
      .from("character_memories")
      .select("*, character_dna!inner(user_id)")
      .eq("id", memoryId)
      .single();

    if (!existing) {
      return { success: false, error: "Memory not found", code: "NOT_FOUND" };
    }

    if (existing.character_dna.user_id !== userId) {
      return { success: false, error: "Access denied", code: "FORBIDDEN" };
    }

    if (existing.is_immutable) {
      return { success: false, error: "Cannot delete immutable memory", code: "IMMUTABLE" };
    }

    const { error } = await client
      .from("character_memories")
      .delete()
      .eq("id", memoryId);

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true };
  }

  async promoteMemory(
    memoryId: string,
    userId: string,
    targetType: "long_term" | "core"
  ): Promise<ServiceResult<CharacterMemory>> {
    const client = await this.getClient();

    const { data: existing } = await client
      .from("character_memories")
      .select("*, character_dna!inner(user_id)")
      .eq("id", memoryId)
      .single();

    if (!existing) {
      return { success: false, error: "Memory not found", code: "NOT_FOUND" };
    }

    if (existing.character_dna.user_id !== userId) {
      return { success: false, error: "Access denied", code: "FORBIDDEN" };
    }

    const currentType = existing.memory_type as MemoryType;
    const typeOrder: MemoryType[] = ["short_term", "long_term", "core"];
    const currentIndex = typeOrder.indexOf(currentType);
    const targetIndex = typeOrder.indexOf(targetType);

    if (targetIndex <= currentIndex) {
      return { success: false, error: "Can only promote to higher memory tier", code: "INVALID_PROMOTION" };
    }

    const tokenCost = MEMORY_TOKEN_COSTS[targetType];
    const tokenService = new TokenService();
    const tokenResult = await tokenService.useTokens(userId, tokenCost, "memory_promote", {
      description: `Promoted memory to ${targetType}`,
      referenceId: existing.character_id,
    });

    if (!tokenResult.success) {
      return { success: false, error: "Insufficient tokens", code: "INSUFFICIENT_TOKENS" };
    }

    const { data, error } = await client
      .from("character_memories")
      .update({
        memory_type: targetType,
        expires_at: null,
        is_immutable: targetType === "core",
        updated_at: new Date().toISOString(),
      })
      .eq("id", memoryId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true, data: this.mapToMemory(data) };
  }

  async searchMemories(
    characterId: string,
    query: string,
    options?: {
      type?: MemoryType;
      limit?: number;
    }
  ): Promise<ServiceResult<CharacterMemory[]>> {
    const client = await this.getClient();

    let dbQuery = client
      .from("character_memories")
      .select("*")
      .eq("character_id", characterId)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .ilike("content", `%${query}%`)
      .order("importance", { ascending: false })
      .order("created_at", { ascending: false });

    if (options?.type) {
      dbQuery = dbQuery.eq("memory_type", options.type);
    }

    if (options?.limit) {
      dbQuery = dbQuery.limit(options.limit);
    }

    const { data, error } = await dbQuery;

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true, data: (data || []).map(this.mapToMemory) };
  }

  async getRelevantMemories(
    characterId: string,
    context: {
      topic?: string;
      emotionalState?: string;
      traitKeys?: string[];
    },
    limit: number = 10
  ): Promise<ServiceResult<CharacterMemory[]>> {
    const client = await this.getClient();

    const { data: allMemories, error } = await client
      .from("character_memories")
      .select("*")
      .eq("character_id", characterId)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("importance", { ascending: false })
      .order("accessed_count", { ascending: false });

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    const memories = (allMemories || []).map(this.mapToMemory);
    const scored = memories.map(memory => {
      let score = 0;

      if (memory.memoryType === "core") score += 100;
      else if (memory.memoryType === "long_term") score += 50;
      else score += 10;

      const importanceScore: Record<MemoryImportance, number> = {
        critical: 40,
        high: 30,
        medium: 20,
        low: 10,
      };
      score += importanceScore[memory.importance];

      if (context.topic && memory.contextData.topic === context.topic) {
        score += 25;
      }

      if (context.emotionalState && memory.emotionalImpact.primaryEmotion === context.emotionalState) {
        score += 20;
      }

      if (context.traitKeys) {
        const matchingTraits = memory.affectedTraits.filter(t =>
          context.traitKeys!.includes(t.traitKey)
        );
        score += matchingTraits.length * 15;
      }

      const daysSinceAccess = memory.lastAccessedAt
        ? (Date.now() - new Date(memory.lastAccessedAt).getTime()) / (1000 * 60 * 60 * 24)
        : 30;
      score -= Math.min(daysSinceAccess, 30);

      return { memory, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const relevant = scored.slice(0, limit).map(s => s.memory);

    for (const memory of relevant) {
      await client
        .from("character_memories")
        .update({
          accessed_count: memory.accessedCount + 1,
          last_accessed_at: new Date().toISOString(),
        })
        .eq("id", memory.id);
    }

    return { success: true, data: relevant };
  }

  async summarizeMemories(
    characterId: string,
    type: MemoryType
  ): Promise<ServiceResult<{ summary: string; count: number }>> {
    const memoriesResult = await this.getMemories(characterId, { type });

    if (!memoriesResult.success || !memoriesResult.data) {
      return { success: false, error: "Failed to get memories", code: "DB_ERROR" };
    }

    const memories = memoriesResult.data;
    const count = memories.length;

    const topics = new Map<string, number>();
    const emotions = new Map<string, number>();

    for (const memory of memories) {
      if (memory.contextData.topic) {
        topics.set(
          memory.contextData.topic,
          (topics.get(memory.contextData.topic) || 0) + 1
        );
      }
      if (memory.emotionalImpact.primaryEmotion) {
        emotions.set(
          memory.emotionalImpact.primaryEmotion,
          (emotions.get(memory.emotionalImpact.primaryEmotion) || 0) + 1
        );
      }
    }

    const topTopics = Array.from(topics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic]) => topic);

    const topEmotions = Array.from(emotions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([emotion]) => emotion);

    const summary = [
      `${count} ${type.replace("_", " ")} memories.`,
      topTopics.length > 0 ? `Main topics: ${topTopics.join(", ")}.` : "",
      topEmotions.length > 0 ? `Dominant emotions: ${topEmotions.join(", ")}.` : "",
    ].filter(Boolean).join(" ");

    return { success: true, data: { summary, count } };
  }

  async cleanupExpiredMemories(): Promise<ServiceResult<{ deleted: number }>> {
    const client = await this.getClient();

    const { data, error } = await client
      .from("character_memories")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .select("id");

    if (error) {
      return { success: false, error: error.message, code: "DB_ERROR" };
    }

    return { success: true, data: { deleted: data?.length || 0 } };
  }

  private async enforceShortTermLimit(characterId: string): Promise<void> {
    const client = await this.getClient();

    const { data: memories } = await client
      .from("character_memories")
      .select("id")
      .eq("character_id", characterId)
      .eq("memory_type", "short_term")
      .order("created_at", { ascending: true });

    if (memories && memories.length >= MAX_SHORT_TERM_MEMORIES) {
      const toDelete = memories.slice(0, memories.length - MAX_SHORT_TERM_MEMORIES + 1);
      await client
        .from("character_memories")
        .delete()
        .in("id", toDelete.map(m => m.id));
    }
  }

  private async applyMemoryImpact(
    characterId: string,
    affectedTraits: AffectedTrait[],
    memoryId: string
  ): Promise<void> {
    const dnaService = new DNAService();

    for (const affected of affectedTraits) {
      await dnaService.evolveTrait(
        characterId,
        affected.traitKey,
        affected.direction === "increase" ? "increase" : "decrease",
        affected.impactStrength,
        "memory_impact",
        memoryId
      );
    }
  }

  private hashContent(content: string): string {
    return createHash("sha256").update(content.toLowerCase().trim()).digest("hex");
  }

  private mapToMemory(row: Record<string, unknown>): CharacterMemory {
    return {
      id: row.id as string,
      characterId: row.character_id as string,
      memoryType: row.memory_type as MemoryType,
      importance: row.importance as MemoryImportance,
      content: row.content as string,
      contentHash: row.content_hash as string | null,
      contextData: (row.context_data as MemoryContext) || {},
      emotionalImpact: (row.emotional_impact as EmotionalImpact) || {},
      affectedTraits: (row.affected_traits as AffectedTrait[]) || [],
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
}

export const memoryService = new MemoryService();
