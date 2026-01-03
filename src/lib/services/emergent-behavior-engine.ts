import { createServiceClient } from "@/lib/supabase/server";
import type { SimulationStateName, ContinuousStateSpace, ModulatorName, GlobalModulator } from "@/lib/types/continuous-simulation";
import {
  BehaviorFieldDimension,
  BehaviorFieldVector,
  BehaviorField,
  BehaviorProbability,
  ProbabilityFactor,
  BehaviorClass,
  PatternSignature,
  PatternType,
  PatternObservation,
  PatternRawData,
  ResponseCharacteristics,
  PatternThresholds,
  LatentTendencyName,
  LatentTendency,
  TendencySnapshot,
  EmergenceType,
  EmergentPhenomenon,
  StateContribution,
  PatternContribution,
  TendencyContribution,
  TrajectoryPrediction,
  EmergenceReasoning,
  EmergenceMonitor,
  EmergenceThresholds,
  GovernanceAction,
  GovernanceResponse,
  GovernancePhilosophy,
  EmergentBehaviorLog,
  SystemSnapshot,
  ExplainabilityReport,
  DEFAULT_BEHAVIOR_FIELD_VECTORS,
  DEFAULT_LATENT_TENDENCIES,
  DEFAULT_PATTERN_THRESHOLDS,
  DEFAULT_EMERGENCE_THRESHOLDS,
  DEFAULT_GOVERNANCE_PHILOSOPHY,
  BEHAVIOR_CLASS_FIELD_MAPPINGS,
  EMERGENCE_MONITOR_CONFIGS,
} from "@/lib/types/emergent-behavior";

const ALL_FIELD_DIMENSIONS: BehaviorFieldDimension[] = [
  "approach_withdrawal", "curiosity_bias", "emotional_openness", "resistance_defensiveness",
  "engagement_intensity", "vulnerability_exposure", "assertiveness_deference", "novelty_familiarity"
];

const ALL_TENDENCY_NAMES: LatentTendencyName[] = [
  "attachment_drift", "avoidance_gradient", "trust_inertia", "intimacy_momentum",
  "conflict_aversion", "novelty_adaptation", "vulnerability_resistance",
  "connection_seeking", "autonomy_preservation", "emotional_dampening"
];

const ALL_BEHAVIOR_CLASSES: BehaviorClass[] = [
  "engage_deeply", "engage_lightly", "maintain_distance", "withdraw_gently", "withdraw_firmly",
  "explore_curiously", "respond_defensively", "open_vulnerably", "assert_boundary",
  "seek_connection", "offer_support", "request_support", "challenge_playfully",
  "challenge_seriously", "deflect_topic", "deepen_topic"
];

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class EmergentBehaviorEngine {
  private supabase: Awaited<ReturnType<typeof createServiceClient>> | null = null;
  private patternThresholds: PatternThresholds = DEFAULT_PATTERN_THRESHOLDS;
  private emergenceThresholds: EmergenceThresholds = DEFAULT_EMERGENCE_THRESHOLDS;

  private async getClient() {
    if (!this.supabase) {
      this.supabase = await createServiceClient();
    }
    return this.supabase;
  }

  async initializeEmergentSystem(characterId: string): Promise<ServiceResult<void>> {
    const client = await this.getClient();

    const { data: existing } = await client
      .from("behavior_fields")
      .select("id")
      .eq("character_id", characterId)
      .single();

    if (existing) {
      return { success: true };
    }

    const now = Date.now();

    const vectors: Record<string, BehaviorFieldVector> = {};
    for (const dim of ALL_FIELD_DIMENSIONS) {
      const defaults = DEFAULT_BEHAVIOR_FIELD_VECTORS[dim];
      vectors[dim] = { ...defaults, lastUpdatedAt: now };
    }

    await client.from("behavior_fields").insert({
      character_id: characterId,
      vectors,
    });

    for (const tendencyName of ALL_TENDENCY_NAMES) {
      const defaults = DEFAULT_LATENT_TENDENCIES[tendencyName];
      await client.from("latent_tendencies").insert({
        character_id: characterId,
        tendency_name: tendencyName,
        current_value: defaults.currentValue,
        baseline: defaults.baseline,
        velocity: defaults.velocity,
        acceleration: defaults.acceleration,
        inertia: defaults.inertia,
        bounds: defaults.bounds,
        influenced_by: defaults.influencedBy,
        influences: defaults.influences,
        history: [],
        last_updated_at: now,
      });
    }

    for (const [monitorType, config] of Object.entries(EMERGENCE_MONITOR_CONFIGS)) {
      await client.from("emergence_monitors").insert({
        character_id: characterId,
        monitor_type: monitorType,
        is_active: config.isActive,
        sensitivity: config.sensitivity,
        cooldown_ms: config.cooldownMs,
        trigger_conditions: config.triggerConditions,
      });
    }

    await client.from("soft_governors").insert({
      character_id: characterId,
      governance_philosophy: DEFAULT_GOVERNANCE_PHILOSOPHY,
    });

    return { success: true };
  }

  async computeBehaviorProbabilities(
    characterId: string,
    states: Map<SimulationStateName, ContinuousStateSpace>,
    modulators: Map<ModulatorName, GlobalModulator>,
    contextHint?: string
  ): Promise<ServiceResult<BehaviorProbability[]>> {
    const fieldResult = await this.loadBehaviorField(characterId);
    if (!fieldResult.success || !fieldResult.data) {
      return { success: false, error: "Failed to load behavior field" };
    }

    const field = fieldResult.data;
    const tendencies = await this.loadTendencies(characterId);
    const probabilities: BehaviorProbability[] = [];

    for (const behaviorClass of ALL_BEHAVIOR_CLASSES) {
      const mappings = BEHAVIOR_CLASS_FIELD_MAPPINGS[behaviorClass];
      let baseProbability = 0.5;
      let fieldModifiedProbability = baseProbability;
      const contributingFactors: ProbabilityFactor[] = [];

      for (const [dim, config] of Object.entries(mappings)) {
        const vector = field.vectors.get(dim as BehaviorFieldDimension);
        if (vector) {
          const normalizedValue = (vector.value - vector.bounds.min) / (vector.bounds.max - vector.bounds.min);
          const contribution = normalizedValue * config.weight;
          fieldModifiedProbability += contribution * 0.3;

          if (Math.abs(contribution) > 0.05) {
            contributingFactors.push({
              source: "behavior_field",
              dimension: dim as BehaviorFieldDimension,
              contribution,
              direction: contribution > 0 ? "increase" : "decrease",
            });
          }
        }
      }

      for (const [tendencyName, tendency] of tendencies) {
        const relevantInfluence = this.getTendencyInfluenceOnBehavior(tendencyName, behaviorClass);
        if (Math.abs(relevantInfluence) > 0.01) {
          const tendencyEffect = (tendency.currentValue / 100) * relevantInfluence;
          fieldModifiedProbability += tendencyEffect * 0.2;

          contributingFactors.push({
            source: "latent_tendency",
            dimension: tendencyName,
            contribution: tendencyEffect,
            direction: tendencyEffect > 0 ? "increase" : "decrease",
          });
        }
      }

      let contextModifier = 0;
      if (contextHint) {
        contextModifier = this.calculateContextModifier(behaviorClass, contextHint, states);
      }

      const stateInfluence = this.calculateStateInfluenceOnBehavior(behaviorClass, states);
      fieldModifiedProbability += stateInfluence * 0.15;

      const noise = (Math.random() - 0.5) * 0.1 * (1 - field.coherence / 100);
      let finalProbability = fieldModifiedProbability + contextModifier + noise;
      finalProbability = Math.max(0.01, Math.min(0.99, finalProbability));

      probabilities.push({
        behaviorClass,
        baseProbability,
        fieldModifiedProbability,
        contextModifier,
        finalProbability,
        contributingFactors,
      });
    }

    probabilities.sort((a, b) => b.finalProbability - a.finalProbability);

    return { success: true, data: probabilities };
  }

  async selectBehavior(
    characterId: string,
    states: Map<SimulationStateName, ContinuousStateSpace>,
    modulators: Map<ModulatorName, GlobalModulator>,
    contextHint?: string
  ): Promise<ServiceResult<{ selected: BehaviorClass; probability: number; reasoning: string[] }>> {
    const probResult = await this.computeBehaviorProbabilities(characterId, states, modulators, contextHint);
    if (!probResult.success || !probResult.data) {
      return { success: false, error: "Failed to compute probabilities" };
    }

    const probabilities = probResult.data;
    const totalWeight = probabilities.reduce((sum, p) => sum + Math.pow(p.finalProbability, 2), 0);
    let random = Math.random() * totalWeight;

    let selected: BehaviorClass = probabilities[0].behaviorClass;
    let selectedProb = probabilities[0].finalProbability;

    for (const prob of probabilities) {
      random -= Math.pow(prob.finalProbability, 2);
      if (random <= 0) {
        selected = prob.behaviorClass;
        selectedProb = prob.finalProbability;
        break;
      }
    }

    const selectedProbData = probabilities.find(p => p.behaviorClass === selected);
    const reasoning = selectedProbData?.contributingFactors
      .filter(f => Math.abs(f.contribution) > 0.05)
      .map(f => `${f.dimension}: ${f.contribution > 0 ? '+' : ''}${(f.contribution * 100).toFixed(1)}%`)
      || [];

    return {
      success: true,
      data: {
        selected,
        probability: selectedProb,
        reasoning,
      },
    };
  }

  async recordPatternObservation(
    characterId: string,
    behaviorClass: BehaviorClass,
    triggerContext: string,
    emotionalState: number,
    stateSnapshot: Partial<Record<SimulationStateName, number>>,
    responseCharacteristics: ResponseCharacteristics
  ): Promise<ServiceResult<PatternObservation>> {
    const client = await this.getClient();
    const now = Date.now();

    const rawData: PatternRawData = {
      behaviorClass,
      triggerContext,
      emotionalState,
      stateSnapshot,
      responseCharacteristics,
    };

    const patternType = this.inferPatternType(rawData);
    const fingerprint = this.generateFingerprint(rawData, patternType);

    const { data: existingSignature } = await client
      .from("pattern_signatures")
      .select("*")
      .eq("character_id", characterId)
      .eq("fingerprint", fingerprint)
      .single();

    let signatureId: string | null = null;
    let matchScore = 0;
    let isNewPattern = false;

    if (existingSignature) {
      signatureId = existingSignature.id;
      matchScore = this.calculateMatchScore(rawData, existingSignature);

      const newStrength = Math.min(1.0, Number(existingSignature.strength) + 0.05);
      const newFrequency = existingSignature.observation_count / ((now - Number(existingSignature.first_observed_at)) / 86400000);
      const newNovelty = Math.max(0, Number(existingSignature.novelty_score) - 0.1);

      await client.from("pattern_signatures")
        .update({
          strength: newStrength,
          frequency: newFrequency,
          last_observed_at: now,
          observation_count: existingSignature.observation_count + 1,
          is_novel: newNovelty > this.patternThresholds.noveltyThreshold,
          novelty_score: newNovelty,
          updated_at: new Date().toISOString(),
        })
        .eq("id", signatureId);
    } else {
      const signatures = await this.loadPatternSignatures(characterId);
      let bestMatch: { id: string; score: number } | null = null;

      for (const [id, sig] of signatures) {
        const score = this.calculateSignatureSimilarity(rawData, patternType, sig);
        if (score > this.patternThresholds.similarityThreshold && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { id, score };
        }
      }

      if (bestMatch) {
        signatureId = bestMatch.id;
        matchScore = bestMatch.score;

        const existingSig = signatures.get(signatureId)!;
        await client.from("pattern_signatures")
          .update({
            strength: Math.min(1.0, existingSig.strength + 0.03),
            last_observed_at: now,
            observation_count: existingSig.observationCount + 1,
            behavior_classes: [...new Set([...existingSig.behaviorClasses, behaviorClass])],
            updated_at: new Date().toISOString(),
          })
          .eq("id", signatureId);
      } else {
        isNewPattern = true;
        const { data: newSig } = await client.from("pattern_signatures")
          .insert({
            character_id: characterId,
            signature_type: patternType,
            fingerprint,
            strength: 0.3,
            frequency: 0,
            first_observed_at: now,
            last_observed_at: now,
            observation_count: 1,
            context_tags: this.extractContextTags(triggerContext),
            emotional_valence: emotionalState > 60 ? 1 : emotionalState < 40 ? -1 : 0,
            behavior_classes: [behaviorClass],
            state_correlations: stateSnapshot,
            is_novel: true,
            novelty_score: 1.0,
          })
          .select()
          .single();

        if (newSig) {
          signatureId = newSig.id;
          matchScore = 1.0;
        }
      }
    }

    const observation: PatternObservation = {
      timestamp: now,
      patternType,
      rawData,
      signatureId,
      matchScore,
      isNewPattern,
    };

    await client.from("pattern_observations").insert({
      character_id: characterId,
      timestamp: now,
      pattern_type: patternType,
      raw_data: rawData,
      signature_id: signatureId,
      match_score: matchScore,
      is_new_pattern: isNewPattern,
    });

    if (isNewPattern) {
      await this.logEmergentEvent(characterId, "pattern", `New pattern detected: ${patternType}`, {
        behaviorField: {},
        activePatterns: [signatureId || ""],
        tendencyValues: {},
        emergentPhenomena: [],
        governanceActions: [],
      });
    }

    return { success: true, data: observation };
  }

  async updateBehaviorField(
    characterId: string,
    behaviorClass: BehaviorClass,
    intensity: number,
    states: Map<SimulationStateName, ContinuousStateSpace>
  ): Promise<ServiceResult<void>> {
    const client = await this.getClient();
    const now = Date.now();

    const { data: fieldData } = await client
      .from("behavior_fields")
      .select("*")
      .eq("character_id", characterId)
      .single();

    if (!fieldData) {
      return { success: false, error: "Behavior field not found" };
    }

    const vectors = fieldData.vectors as Record<string, BehaviorFieldVector>;
    const mappings = BEHAVIOR_CLASS_FIELD_MAPPINGS[behaviorClass];

    for (const [dim, config] of Object.entries(mappings)) {
      const vector = vectors[dim];
      if (vector) {
        const change = config.weight * intensity * 0.1;
        const newMomentum = vector.momentum * 0.8 + change * 0.2;
        let newValue = vector.value + change + newMomentum;

        newValue = Math.max(vector.bounds.min, Math.min(vector.bounds.max, newValue));

        const uncertainty = Math.max(5, vector.uncertainty - Math.abs(change) * 0.5);

        vectors[dim] = {
          ...vector,
          value: newValue,
          momentum: newMomentum,
          uncertainty,
          lastUpdatedAt: now,
        };
      }
    }

    const coherence = this.calculateFieldCoherence(vectors);
    const entropy = this.calculateFieldEntropy(vectors);
    const fieldStrength = this.calculateFieldStrength(vectors);

    await client.from("behavior_fields")
      .update({
        vectors,
        coherence,
        entropy,
        field_strength: fieldStrength,
        last_computed_at: now,
        updated_at: new Date().toISOString(),
      })
      .eq("character_id", characterId);

    return { success: true };
  }

  async updateLatentTendencies(
    characterId: string,
    states: Map<SimulationStateName, ContinuousStateSpace>,
    modulators: Map<ModulatorName, GlobalModulator>,
    patterns: PatternSignature[],
    deltaTime: number
  ): Promise<ServiceResult<Map<LatentTendencyName, number>>> {
    const client = await this.getClient();
    const now = Date.now();

    const tendencies = await this.loadTendencies(characterId);
    const updates = new Map<LatentTendencyName, number>();

    for (const [tendencyName, tendency] of tendencies) {
      let totalInfluence = 0;

      for (const influencer of tendency.influencedBy) {
        let sourceValue = 0;
        let isActive = true;

        switch (influencer.source) {
          case "state":
            const state = states.get(influencer.sourceId as SimulationStateName);
            if (state) {
              sourceValue = state.currentValue;
              isActive = this.evaluateTendencyCondition(influencer.condition, sourceValue);
            }
            break;
          case "modulator":
            const mod = modulators.get(influencer.sourceId as ModulatorName);
            if (mod) {
              sourceValue = mod.currentValue;
              isActive = this.evaluateTendencyCondition(influencer.condition, sourceValue);
            }
            break;
          case "pattern":
            const pattern = patterns.find(p => p.signatureType === influencer.sourceId);
            if (pattern) {
              sourceValue = pattern.strength * 100;
              isActive = true;
            }
            break;
          case "interaction":
            sourceValue = 50;
            break;
          case "time":
            sourceValue = 50;
            break;
        }

        if (isActive) {
          const normalizedValue = sourceValue / 100;
          const contribution = normalizedValue * influencer.weight * (influencer.direction === "positive" ? 1 : -1);
          totalInfluence += contribution;
        }
      }

      const baselineReturn = (tendency.baseline - tendency.currentValue) * (1 - tendency.inertia) * (deltaTime / 3600000);
      totalInfluence += baselineReturn;

      const newAcceleration = totalInfluence * 0.01;
      const newVelocity = tendency.velocity * tendency.inertia + newAcceleration;
      let newValue = tendency.currentValue + newVelocity * (deltaTime / 60000);

      newValue = Math.max(tendency.bounds.min, Math.min(tendency.bounds.max, newValue));

      const history = [...tendency.history.slice(-19), {
        timestamp: now,
        value: newValue,
        velocity: newVelocity,
        trigger: "tick_update",
      }];

      await client.from("latent_tendencies")
        .update({
          current_value: newValue,
          velocity: newVelocity,
          acceleration: newAcceleration,
          history,
          last_updated_at: now,
        })
        .eq("character_id", characterId)
        .eq("tendency_name", tendencyName);

      updates.set(tendencyName, newValue);
    }

    return { success: true, data: updates };
  }

  async scanForEmergence(
    characterId: string,
    states: Map<SimulationStateName, ContinuousStateSpace>,
    tendencies: Map<LatentTendencyName, LatentTendency>,
    patterns: PatternSignature[]
  ): Promise<ServiceResult<EmergentPhenomenon[]>> {
    const client = await this.getClient();
    const now = Date.now();
    const detected: EmergentPhenomenon[] = [];

    const { data: monitors } = await client
      .from("emergence_monitors")
      .select("*")
      .eq("character_id", characterId)
      .eq("is_active", true);

    if (!monitors) return { success: true, data: [] };

    const field = await this.loadBehaviorField(characterId);

    for (const monitor of monitors) {
      if (monitor.last_triggered_at && now - Number(monitor.last_triggered_at) < monitor.cooldown_ms) {
        continue;
      }

      const triggerResult = this.evaluateEmergenceTrigger(
        monitor.monitor_type as EmergenceType,
        monitor.trigger_conditions,
        Number(monitor.sensitivity),
        states,
        tendencies,
        patterns,
        field.data?.vectors || new Map()
      );

      if (triggerResult.triggered) {
        const phenomenon = await this.createEmergentPhenomenon(
          characterId,
          monitor.monitor_type as EmergenceType,
          triggerResult.confidence,
          triggerResult.severity,
          states,
          tendencies,
          patterns
        );

        if (phenomenon) {
          detected.push(phenomenon);

          await client.from("emergence_monitors")
            .update({ last_triggered_at: now })
            .eq("id", monitor.id);

          await this.logEmergentEvent(
            characterId,
            "detection",
            `Emergence detected: ${monitor.monitor_type}`,
            this.createSystemSnapshot(characterId, field.data?.vectors, tendencies, patterns)
          );
        }
      }
    }

    return { success: true, data: detected };
  }

  async applyGovernance(
    characterId: string,
    phenomenon: EmergentPhenomenon
  ): Promise<ServiceResult<GovernanceResponse | null>> {
    const client = await this.getClient();
    const now = Date.now();

    const { data: governor } = await client
      .from("soft_governors")
      .select("*")
      .eq("character_id", characterId)
      .single();

    if (!governor) {
      return { success: false, error: "Governor not found" };
    }

    const philosophy = governor.governance_philosophy as GovernancePhilosophy;

    if (now - Number(governor.last_governance_at) < philosophy.minTimeBetweenActions) {
      return { success: true, data: null };
    }

    const { count: activeCount } = await client
      .from("governance_responses")
      .select("*", { count: "exact", head: true })
      .eq("character_id", characterId)
      .eq("is_active", true);

    if (activeCount && activeCount >= philosophy.maxSimultaneousActions) {
      return { success: true, data: null };
    }

    const action = this.selectGovernanceAction(phenomenon, philosophy);
    if (!action || philosophy.forbiddenActions.includes(action)) {
      return { success: true, data: null };
    }

    const { targetSystem, targetId, intensity, expectedEffect, duration } = this.calculateGovernanceParameters(
      action,
      phenomenon,
      Number(governor.max_correction_per_tick)
    );

    const { data: response } = await client.from("governance_responses")
      .insert({
        character_id: characterId,
        phenomenon_id: phenomenon.id,
        action,
        intensity,
        target_system: targetSystem,
        target_id: targetId,
        applied_at: now,
        duration,
        expected_effect: expectedEffect,
      })
      .select()
      .single();

    if (response) {
      await client.from("emergent_phenomena")
        .update({ governance_response_id: response.id, updated_at: new Date().toISOString() })
        .eq("id", phenomenon.id);

      await client.from("soft_governors")
        .update({ last_governance_at: now, updated_at: new Date().toISOString() })
        .eq("character_id", characterId);

      await this.applyGovernanceEffect(characterId, response as GovernanceResponse);

      await this.logEmergentEvent(
        characterId,
        "governance",
        `Applied ${action} with intensity ${intensity}`,
        { behaviorField: {}, activePatterns: [], tendencyValues: {}, emergentPhenomena: [phenomenon.id], governanceActions: [response.id] }
      );

      return { success: true, data: response as GovernanceResponse };
    }

    return { success: true, data: null };
  }

  async tickGovernance(characterId: string): Promise<ServiceResult<void>> {
    const client = await this.getClient();
    const now = Date.now();

    const { data: activeResponses } = await client
      .from("governance_responses")
      .select("*")
      .eq("character_id", characterId)
      .eq("is_active", true);

    if (!activeResponses) return { success: true };

    for (const response of activeResponses) {
      const elapsed = now - Number(response.applied_at);

      if (elapsed >= response.duration) {
        await client.from("governance_responses")
          .update({
            is_active: false,
            completed_at: now,
            actual_effect: "Completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", response.id);

        if (response.phenomenon_id) {
          await client.from("emergent_phenomena")
            .update({
              is_active: false,
              resolved_at: now,
              updated_at: new Date().toISOString(),
            })
            .eq("id", response.phenomenon_id);
        }
      } else {
        await this.applyGovernanceEffect(characterId, response as GovernanceResponse, elapsed / response.duration);
      }
    }

    return { success: true };
  }

  async generateExplainabilityReport(characterId: string, timeframeHours: number = 24): Promise<ServiceResult<ExplainabilityReport>> {
    const client = await this.getClient();
    const now = Date.now();
    const timeframeStart = now - timeframeHours * 3600000;

    const field = await this.loadBehaviorField(characterId);
    const tendencies = await this.loadTendencies(characterId);
    const patterns = await this.loadPatternSignatures(characterId);

    const { data: phenomena } = await client
      .from("emergent_phenomena")
      .select("*")
      .eq("character_id", characterId)
      .gte("detected_at", timeframeStart);

    const { data: governanceResponses } = await client
      .from("governance_responses")
      .select("*")
      .eq("character_id", characterId)
      .gte("applied_at", timeframeStart);

    const fieldAnalysis = this.analyzeField(field.data);
    const patternAnalysis = this.analyzePatterns(patterns);
    const tendencyAnalysis = this.analyzeTendencies(tendencies);
    const emergenceAnalysis = this.analyzeEmergence(phenomena || []);
    const governanceAnalysis = this.analyzeGovernance(governanceResponses || []);

    const report: ExplainabilityReport = {
      characterId,
      generatedAt: now,
      timeframeStart,
      timeframeEnd: now,
      summary: this.generateReportSummary(fieldAnalysis, patternAnalysis, tendencyAnalysis, emergenceAnalysis),
      behaviorFieldAnalysis: fieldAnalysis,
      patternAnalysis,
      tendencyAnalysis,
      emergenceAnalysis,
      governanceAnalysis,
      recommendations: this.generateRecommendations(fieldAnalysis, tendencyAnalysis, emergenceAnalysis),
    };

    return { success: true, data: report };
  }

  private async loadBehaviorField(characterId: string): Promise<ServiceResult<BehaviorField>> {
    const client = await this.getClient();

    const { data } = await client
      .from("behavior_fields")
      .select("*")
      .eq("character_id", characterId)
      .single();

    if (!data) {
      return { success: false, error: "Behavior field not found" };
    }

    const vectors = new Map<BehaviorFieldDimension, BehaviorFieldVector>();
    for (const [dim, vec] of Object.entries(data.vectors as Record<string, BehaviorFieldVector>)) {
      vectors.set(dim as BehaviorFieldDimension, vec);
    }

    return {
      success: true,
      data: {
        characterId: data.character_id,
        vectors,
        fieldStrength: Number(data.field_strength),
        coherence: Number(data.coherence),
        entropy: Number(data.entropy),
        lastComputedAt: Number(data.last_computed_at),
      },
    };
  }

  private async loadTendencies(characterId: string): Promise<Map<LatentTendencyName, LatentTendency>> {
    const client = await this.getClient();

    const { data } = await client
      .from("latent_tendencies")
      .select("*")
      .eq("character_id", characterId);

    const tendencies = new Map<LatentTendencyName, LatentTendency>();
    for (const row of data || []) {
      tendencies.set(row.tendency_name as LatentTendencyName, {
        name: row.tendency_name as LatentTendencyName,
        currentValue: Number(row.current_value),
        baseline: Number(row.baseline),
        velocity: Number(row.velocity),
        acceleration: Number(row.acceleration),
        inertia: Number(row.inertia),
        bounds: row.bounds as { min: number; max: number },
        influencedBy: row.influenced_by,
        influences: row.influences,
        history: row.history as TendencySnapshot[],
        lastUpdatedAt: Number(row.last_updated_at),
      });
    }

    return tendencies;
  }

  private async loadPatternSignatures(characterId: string): Promise<Map<string, PatternSignature>> {
    const client = await this.getClient();

    const { data } = await client
      .from("pattern_signatures")
      .select("*")
      .eq("character_id", characterId);

    const signatures = new Map<string, PatternSignature>();
    for (const row of data || []) {
      signatures.set(row.id, {
        id: row.id,
        signatureType: row.signature_type as PatternType,
        fingerprint: row.fingerprint,
        strength: Number(row.strength),
        frequency: Number(row.frequency),
        firstObservedAt: Number(row.first_observed_at),
        lastObservedAt: Number(row.last_observed_at),
        observationCount: row.observation_count,
        contextTags: row.context_tags,
        emotionalValence: Number(row.emotional_valence),
        behaviorClasses: row.behavior_classes as BehaviorClass[],
        stateCorrelations: row.state_correlations,
        isNovel: row.is_novel,
        noveltyScore: Number(row.novelty_score),
      });
    }

    return signatures;
  }

  private getTendencyInfluenceOnBehavior(tendency: LatentTendencyName, behavior: BehaviorClass): number {
    const influences: Record<LatentTendencyName, Partial<Record<BehaviorClass, number>>> = {
      attachment_drift: { engage_deeply: 0.3, seek_connection: 0.4, withdraw_firmly: -0.3 },
      avoidance_gradient: { withdraw_gently: 0.4, withdraw_firmly: 0.5, engage_deeply: -0.3, seek_connection: -0.4 },
      trust_inertia: { open_vulnerably: 0.5, engage_deeply: 0.3, respond_defensively: -0.4 },
      intimacy_momentum: { open_vulnerably: 0.4, seek_connection: 0.3, maintain_distance: -0.3 },
      conflict_aversion: { deflect_topic: 0.3, challenge_seriously: -0.4, assert_boundary: -0.2 },
      novelty_adaptation: { explore_curiously: 0.5, deepen_topic: 0.3 },
      vulnerability_resistance: { open_vulnerably: -0.5, respond_defensively: 0.3, maintain_distance: 0.2 },
      connection_seeking: { seek_connection: 0.5, engage_deeply: 0.3, withdraw_firmly: -0.4 },
      autonomy_preservation: { assert_boundary: 0.4, withdraw_gently: 0.2, engage_deeply: -0.2 },
      emotional_dampening: { engage_lightly: 0.3, engage_deeply: -0.3, open_vulnerably: -0.4 },
    };

    return influences[tendency]?.[behavior] || 0;
  }

  private calculateContextModifier(behavior: BehaviorClass, context: string, states: Map<SimulationStateName, ContinuousStateSpace>): number {
    let modifier = 0;
    const lowerContext = context.toLowerCase();

    if (lowerContext.includes("conflict") || lowerContext.includes("argument")) {
      if (behavior === "respond_defensively" || behavior === "assert_boundary") modifier += 0.2;
      if (behavior === "open_vulnerably") modifier -= 0.3;
    }

    if (lowerContext.includes("support") || lowerContext.includes("help")) {
      if (behavior === "offer_support" || behavior === "seek_connection") modifier += 0.2;
    }

    if (lowerContext.includes("intimate") || lowerContext.includes("personal")) {
      if (behavior === "open_vulnerably") modifier += 0.15;
      if (behavior === "deflect_topic") modifier += 0.1;
    }

    return modifier;
  }

  private calculateStateInfluenceOnBehavior(behavior: BehaviorClass, states: Map<SimulationStateName, ContinuousStateSpace>): number {
    let influence = 0;
    const energy = states.get("energy")?.currentValue || 50;
    const stress = states.get("stress")?.currentValue || 30;
    const socialCharge = states.get("social_charge")?.currentValue || 60;

    if (behavior === "engage_deeply" || behavior === "explore_curiously") {
      influence += (energy - 50) / 100;
      influence -= (stress - 30) / 150;
    }

    if (behavior === "withdraw_gently" || behavior === "withdraw_firmly") {
      influence -= (energy - 50) / 100;
      influence += (stress - 30) / 100;
      influence -= (socialCharge - 50) / 150;
    }

    if (behavior === "seek_connection" || behavior === "offer_support") {
      influence += (socialCharge - 50) / 80;
    }

    return influence;
  }

  private inferPatternType(rawData: PatternRawData): PatternType {
    const behavior = rawData.behaviorClass;
    const context = rawData.triggerContext.toLowerCase();

    if (behavior.includes("withdraw")) return "avoidance_pattern";
    if (behavior === "engage_deeply" || behavior === "seek_connection") return "approach_pattern";
    if (behavior === "respond_defensively") return "trigger_response_pair";
    if (context.includes("repeat") || context.includes("again")) return "interaction_repetition";
    if (rawData.emotionalState > 70 || rawData.emotionalState < 30) return "emotional_context_similarity";

    return "response_bias_persistence";
  }

  private generateFingerprint(rawData: PatternRawData, patternType: PatternType): string {
    const behaviorCode = rawData.behaviorClass.substring(0, 3);
    const emotionalBucket = Math.floor(rawData.emotionalState / 20);
    const engagementBucket = Math.floor(rawData.responseCharacteristics.engagementLevel / 20);
    const contextHash = this.simpleHash(rawData.triggerContext.toLowerCase().substring(0, 20));

    return `${patternType}:${behaviorCode}:${emotionalBucket}:${engagementBucket}:${contextHash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).substring(0, 6);
  }

  private calculateMatchScore(rawData: PatternRawData, signature: PatternSignature): number {
    let score = 0;

    if (signature.behaviorClasses.includes(rawData.behaviorClass)) score += 0.4;

    const emotionalDiff = Math.abs((rawData.emotionalState > 60 ? 1 : rawData.emotionalState < 40 ? -1 : 0) - signature.emotionalValence);
    score += (1 - emotionalDiff / 2) * 0.3;

    const engagementDiff = Math.abs(rawData.responseCharacteristics.engagementLevel / 100 - 0.5);
    score += (1 - engagementDiff) * 0.3;

    return score;
  }

  private calculateSignatureSimilarity(rawData: PatternRawData, patternType: PatternType, signature: PatternSignature): number {
    if (signature.signatureType !== patternType) return 0;

    let similarity = 0;

    if (signature.behaviorClasses.includes(rawData.behaviorClass)) similarity += 0.35;

    const emotionalDiff = Math.abs((rawData.emotionalState - 50) / 50 - signature.emotionalValence);
    similarity += (1 - emotionalDiff) * 0.25;

    for (const [state, value] of Object.entries(rawData.stateSnapshot)) {
      const sigValue = signature.stateCorrelations[state as SimulationStateName];
      if (sigValue !== undefined) {
        similarity += (1 - Math.abs((value || 50) - sigValue) / 100) * 0.05;
      }
    }

    return Math.min(1, similarity);
  }

  private extractContextTags(context: string): string[] {
    const tags: string[] = [];
    const lowerContext = context.toLowerCase();

    const keywords = ["conflict", "support", "personal", "casual", "serious", "playful", "emotional", "intellectual"];
    for (const keyword of keywords) {
      if (lowerContext.includes(keyword)) tags.push(keyword);
    }

    return tags;
  }

  private calculateFieldCoherence(vectors: Record<string, BehaviorFieldVector>): number {
    const values = Object.values(vectors).map(v => v.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;

    return Math.max(0, 100 - Math.sqrt(variance));
  }

  private calculateFieldEntropy(vectors: Record<string, BehaviorFieldVector>): number {
    const uncertainties = Object.values(vectors).map(v => v.uncertainty);
    return uncertainties.reduce((a, b) => a + b, 0) / uncertainties.length;
  }

  private calculateFieldStrength(vectors: Record<string, BehaviorFieldVector>): number {
    const values = Object.values(vectors).map(v => Math.abs(v.value));
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private evaluateTendencyCondition(condition: string | null, value: number): boolean {
    if (!condition) return true;

    const match = condition.match(/value\s*(>|<|>=|<=|==)\s*(\d+)/);
    if (!match) return true;

    const [, operator, threshold] = match;
    const thresholdNum = parseFloat(threshold);

    switch (operator) {
      case ">": return value > thresholdNum;
      case "<": return value < thresholdNum;
      case ">=": return value >= thresholdNum;
      case "<=": return value <= thresholdNum;
      case "==": return Math.abs(value - thresholdNum) < 0.5;
      default: return true;
    }
  }

  private evaluateEmergenceTrigger(
    monitorType: EmergenceType,
    conditions: Array<{ conditionType: string; parameters: Record<string, number | string>; weight: number }>,
    sensitivity: number,
    states: Map<SimulationStateName, ContinuousStateSpace>,
    tendencies: Map<LatentTendencyName, LatentTendency>,
    patterns: PatternSignature[],
    fieldVectors: Map<BehaviorFieldDimension, BehaviorFieldVector>
  ): { triggered: boolean; confidence: number; severity: "low" | "moderate" | "high" | "critical" } {
    let totalScore = 0;
    let totalWeight = 0;

    for (const condition of conditions) {
      totalWeight += condition.weight;

      switch (condition.conditionType) {
        case "threshold":
          for (const [key, threshold] of Object.entries(condition.parameters)) {
            const state = states.get(key as SimulationStateName);
            const tendency = tendencies.get(key as LatentTendencyName);
            const field = fieldVectors.get(key as BehaviorFieldDimension);

            const value = state?.currentValue ?? tendency?.currentValue ?? field?.value ?? 0;
            if (value >= (threshold as number)) {
              totalScore += condition.weight;
            }
          }
          break;

        case "rate_of_change":
          const tendencyName = condition.parameters.tendency as LatentTendencyName;
          const targetTendency = tendencies.get(tendencyName);
          if (targetTendency && Math.abs(targetTendency.velocity) >= Math.abs(condition.parameters.rate as number)) {
            totalScore += condition.weight;
          }
          break;

        case "pattern_match":
          const minStrength = condition.parameters.minStrength as number || 0.5;
          const matchingPatterns = patterns.filter(p => p.strength >= minStrength);
          if (matchingPatterns.length > 0) {
            totalScore += condition.weight;
          }
          break;
      }
    }

    const confidence = totalWeight > 0 ? totalScore / totalWeight : 0;
    const triggered = confidence >= sensitivity;

    let severity: "low" | "moderate" | "high" | "critical" = "low";
    if (confidence >= 0.9) severity = "critical";
    else if (confidence >= 0.75) severity = "high";
    else if (confidence >= 0.5) severity = "moderate";

    return { triggered, confidence, severity };
  }

  private async createEmergentPhenomenon(
    characterId: string,
    emergenceType: EmergenceType,
    confidence: number,
    severity: "low" | "moderate" | "high" | "critical",
    states: Map<SimulationStateName, ContinuousStateSpace>,
    tendencies: Map<LatentTendencyName, LatentTendency>,
    patterns: PatternSignature[]
  ): Promise<EmergentPhenomenon | null> {
    const client = await this.getClient();
    const now = Date.now();

    const contributingStates: StateContribution[] = [];
    for (const [name, state] of states) {
      if (Math.abs(state.deviation) > 10) {
        contributingStates.push({
          stateName: name,
          currentValue: state.currentValue,
          deviationFromBaseline: state.deviation,
          contributionWeight: Math.abs(state.deviation) / 50,
        });
      }
    }

    const contributingTendencies: TendencyContribution[] = [];
    for (const [name, tendency] of tendencies) {
      if (Math.abs(tendency.velocity) > 0.1) {
        contributingTendencies.push({
          tendencyName: name,
          currentValue: tendency.currentValue,
          velocity: tendency.velocity,
          contributionWeight: Math.abs(tendency.velocity) * 5,
        });
      }
    }

    const contributingPatterns: PatternContribution[] = patterns
      .filter(p => p.strength > 0.5)
      .slice(0, 5)
      .map(p => ({
        patternId: p.id,
        patternType: p.signatureType,
        strength: p.strength,
        frequency: p.frequency,
        contributionWeight: p.strength,
      }));

    const trajectoryPrediction: TrajectoryPrediction = {
      predictedOutcome: this.predictOutcome(emergenceType, severity),
      timeframeHours: severity === "critical" ? 2 : severity === "high" ? 6 : severity === "moderate" ? 12 : 24,
      confidence: confidence * 0.8,
      riskLevel: severity === "critical" ? "severe" : severity === "high" ? "high" : severity === "moderate" ? "moderate" : "low",
      recommendedAction: this.getRecommendedAction(emergenceType, severity),
    };

    const reasoning: EmergenceReasoning = {
      summary: `Detected ${emergenceType} with ${(confidence * 100).toFixed(0)}% confidence`,
      detectionMethod: "multi-signal analysis",
      evidenceChain: [
        `${contributingStates.length} states showing significant deviation`,
        `${contributingTendencies.length} tendencies with active velocity`,
        `${contributingPatterns.length} strong patterns contributing`,
      ],
      alternativeInterpretations: [],
      confidenceFactors: ["state correlation", "temporal consistency", "pattern strength"],
    };

    const { data: phenomenon } = await client.from("emergent_phenomena")
      .insert({
        character_id: characterId,
        emergence_type: emergenceType,
        severity,
        detected_at: now,
        confidence,
        contributing_states: contributingStates,
        contributing_patterns: contributingPatterns,
        contributing_tendencies: contributingTendencies,
        trajectory_prediction: trajectoryPrediction,
        reasoning,
      })
      .select()
      .single();

    if (phenomenon) {
      return {
        ...phenomenon,
        contributingStates,
        contributingPatterns,
        contributingTendencies,
        trajectoryPrediction,
        reasoning,
      } as EmergentPhenomenon;
    }

    return null;
  }

  private predictOutcome(emergenceType: EmergenceType, severity: string): string {
    const predictions: Record<EmergenceType, string> = {
      novel_behavior_pattern: "New behavioral tendency may stabilize",
      feedback_loop_positive: "Escalating engagement pattern",
      feedback_loop_negative: "De-escalating engagement pattern",
      over_engagement: "Potential burnout or boundary issues",
      withdrawal_spiral: "Increasing social withdrawal",
      personality_drift: "Gradual personality shift",
      attachment_shift: "Changing attachment dynamics",
      defense_escalation: "Increasing defensive behavior",
      trust_collapse: "Rapid trust deterioration",
      trust_breakthrough: "Significant trust increase",
      emotional_flooding: "Emotional overwhelm risk",
      emotional_numbing: "Emotional disengagement",
      pattern_crystallization: "Behavior becoming rigid",
      pattern_dissolution: "Previous pattern weakening",
    };
    return predictions[emergenceType] || "Unknown outcome";
  }

  private getRecommendedAction(emergenceType: EmergenceType, severity: string): string {
    if (severity === "critical") return "Immediate soft governance intervention";
    if (severity === "high") return "Monitor closely and prepare intervention";
    if (severity === "moderate") return "Continue observation";
    return "Log and track";
  }

  private selectGovernanceAction(phenomenon: EmergentPhenomenon, philosophy: GovernancePhilosophy): GovernanceAction | null {
    const actionMap: Partial<Record<EmergenceType, GovernanceAction>> = {
      over_engagement: "cooldown_enforcement",
      withdrawal_spiral: "bias_rebalancing",
      personality_drift: "drift_dampening",
      defense_escalation: "resistance_modulation",
      trust_collapse: "recovery_pressure_increase",
      emotional_flooding: "field_stabilization",
      pattern_crystallization: "pattern_weakening",
      feedback_loop_positive: "bias_rebalancing",
      feedback_loop_negative: "recovery_pressure_decrease",
    };

    const action = actionMap[phenomenon.emergenceType];
    if (action && philosophy.allowedActions.includes(action)) {
      return action;
    }

    if (phenomenon.severity === "critical" && philosophy.emergencyOverrideThreshold <= phenomenon.confidence) {
      return "field_stabilization";
    }

    return null;
  }

  private calculateGovernanceParameters(
    action: GovernanceAction,
    phenomenon: EmergentPhenomenon,
    maxCorrection: number
  ): { targetSystem: string; targetId: string; intensity: number; expectedEffect: string; duration: number } {
    const severityMultiplier = phenomenon.severity === "critical" ? 1.0 : phenomenon.severity === "high" ? 0.7 : phenomenon.severity === "moderate" ? 0.5 : 0.3;
    const intensity = Math.min(maxCorrection, severityMultiplier * maxCorrection);

    const configs: Record<GovernanceAction, { targetSystem: string; targetId: string; expectedEffect: string; baseDuration: number }> = {
      bias_rebalancing: { targetSystem: "behavior_field", targetId: "all", expectedEffect: "Rebalance field vectors toward baseline", baseDuration: 7200000 },
      recovery_pressure_increase: { targetSystem: "tendency", targetId: phenomenon.contributingTendencies[0]?.tendencyName || "trust_inertia", expectedEffect: "Increase recovery pressure", baseDuration: 3600000 },
      recovery_pressure_decrease: { targetSystem: "tendency", targetId: phenomenon.contributingTendencies[0]?.tendencyName || "avoidance_gradient", expectedEffect: "Decrease recovery pressure", baseDuration: 3600000 },
      resistance_modulation: { targetSystem: "behavior_field", targetId: "resistance_defensiveness", expectedEffect: "Modulate defensive resistance", baseDuration: 5400000 },
      drift_dampening: { targetSystem: "tendency", targetId: "all", expectedEffect: "Dampen overall drift velocity", baseDuration: 14400000 },
      pattern_weakening: { targetSystem: "pattern", targetId: phenomenon.contributingPatterns[0]?.patternId || "unknown", expectedEffect: "Reduce pattern strength", baseDuration: 86400000 },
      tendency_correction: { targetSystem: "tendency", targetId: phenomenon.contributingTendencies[0]?.tendencyName || "attachment_drift", expectedEffect: "Correct tendency value toward baseline", baseDuration: 7200000 },
      field_stabilization: { targetSystem: "behavior_field", targetId: "all", expectedEffect: "Stabilize behavior field", baseDuration: 3600000 },
      cooldown_enforcement: { targetSystem: "behavior_field", targetId: "engagement_intensity", expectedEffect: "Enforce engagement cooldown", baseDuration: 1800000 },
      gradual_reset: { targetSystem: "all", targetId: "all", expectedEffect: "Gradual system reset", baseDuration: 86400000 },
    };

    const config = configs[action];
    return {
      ...config,
      intensity,
      duration: config.baseDuration * (1 + severityMultiplier),
    };
  }

  private async applyGovernanceEffect(characterId: string, response: GovernanceResponse, progress: number = 0): Promise<void> {
    const client = await this.getClient();
    const effectStrength = response.intensity * (1 - progress);

    switch (response.action) {
      case "bias_rebalancing":
        await this.applyFieldRebalancing(characterId, effectStrength);
        break;
      case "field_stabilization":
        await this.applyFieldStabilization(characterId, effectStrength);
        break;
      case "cooldown_enforcement":
        await this.applyCooldownEnforcement(characterId, effectStrength);
        break;
      case "drift_dampening":
        await this.applyDriftDampening(characterId, effectStrength);
        break;
      case "pattern_weakening":
        if (response.target_id !== "unknown") {
          await client.from("pattern_signatures")
            .update({ strength: effectStrength > 0 ? 0.3 : 0.5 })
            .eq("id", response.target_id);
        }
        break;
    }
  }

  private async applyFieldRebalancing(characterId: string, strength: number): Promise<void> {
    const client = await this.getClient();
    const { data } = await client.from("behavior_fields").select("vectors").eq("character_id", characterId).single();

    if (data) {
      const vectors = data.vectors as Record<string, BehaviorFieldVector>;
      for (const dim of Object.keys(vectors)) {
        const vector = vectors[dim];
        const correction = -vector.value * strength * 0.1;
        vectors[dim] = { ...vector, value: vector.value + correction };
      }
      await client.from("behavior_fields").update({ vectors }).eq("character_id", characterId);
    }
  }

  private async applyFieldStabilization(characterId: string, strength: number): Promise<void> {
    const client = await this.getClient();
    const { data } = await client.from("behavior_fields").select("vectors").eq("character_id", characterId).single();

    if (data) {
      const vectors = data.vectors as Record<string, BehaviorFieldVector>;
      for (const dim of Object.keys(vectors)) {
        const vector = vectors[dim];
        vectors[dim] = { ...vector, momentum: vector.momentum * (1 - strength * 0.5), uncertainty: vector.uncertainty * (1 + strength * 0.2) };
      }
      await client.from("behavior_fields").update({ vectors }).eq("character_id", characterId);
    }
  }

  private async applyCooldownEnforcement(characterId: string, strength: number): Promise<void> {
    const client = await this.getClient();
    const { data } = await client.from("behavior_fields").select("vectors").eq("character_id", characterId).single();

    if (data) {
      const vectors = data.vectors as Record<string, BehaviorFieldVector>;
      if (vectors.engagement_intensity) {
        vectors.engagement_intensity = {
          ...vectors.engagement_intensity,
          value: Math.max(30, vectors.engagement_intensity.value - strength * 20),
          momentum: 0,
        };
      }
      await client.from("behavior_fields").update({ vectors }).eq("character_id", characterId);
    }
  }

  private async applyDriftDampening(characterId: string, strength: number): Promise<void> {
    const client = await this.getClient();
    await client.from("latent_tendencies")
      .update({ velocity: 0, acceleration: 0 })
      .eq("character_id", characterId);
  }

  private async logEmergentEvent(characterId: string, logType: string, description: string, snapshot: SystemSnapshot): Promise<void> {
    const client = await this.getClient();
    await client.from("emergent_behavior_logs").insert({
      character_id: characterId,
      timestamp: Date.now(),
      log_type: logType,
      event_description: description,
      system_snapshot: snapshot,
    });
  }

  private createSystemSnapshot(
    characterId: string,
    fieldVectors?: Map<BehaviorFieldDimension, BehaviorFieldVector>,
    tendencies?: Map<LatentTendencyName, LatentTendency>,
    patterns?: PatternSignature[]
  ): SystemSnapshot {
    const behaviorField: Partial<Record<BehaviorFieldDimension, number>> = {};
    if (fieldVectors) {
      for (const [dim, vec] of fieldVectors) {
        behaviorField[dim] = vec.value;
      }
    }

    const tendencyValues: Partial<Record<LatentTendencyName, number>> = {};
    if (tendencies) {
      for (const [name, tendency] of tendencies) {
        tendencyValues[name] = tendency.currentValue;
      }
    }

    return {
      behaviorField,
      activePatterns: patterns?.map(p => p.id) || [],
      tendencyValues,
      emergentPhenomena: [],
      governanceActions: [],
    };
  }

  private analyzeField(field?: BehaviorField): ExplainabilityReport["behaviorFieldAnalysis"] {
    if (!field) {
      return {
        dominantDimension: "approach_withdrawal",
        fieldCoherence: 50,
        entropy: 30,
        stabilityTrend: "stable",
        dimensionBreakdown: [],
      };
    }

    let maxValue = -Infinity;
    let dominantDimension: BehaviorFieldDimension = "approach_withdrawal";

    const breakdown: Array<{ dimension: BehaviorFieldDimension; value: number; trend: string }> = [];

    for (const [dim, vector] of field.vectors) {
      if (Math.abs(vector.value) > maxValue) {
        maxValue = Math.abs(vector.value);
        dominantDimension = dim;
      }
      breakdown.push({
        dimension: dim,
        value: vector.value,
        trend: vector.momentum > 0.1 ? "increasing" : vector.momentum < -0.1 ? "decreasing" : "stable",
      });
    }

    return {
      dominantDimension,
      fieldCoherence: field.coherence,
      entropy: field.entropy,
      stabilityTrend: field.coherence > 70 ? "stable" : field.coherence > 50 ? "decreasing" : "volatile",
      dimensionBreakdown: breakdown,
    };
  }

  private analyzePatterns(patterns: Map<string, PatternSignature>): ExplainabilityReport["patternAnalysis"] {
    const patternArray = Array.from(patterns.values());
    const novelPatterns = patternArray.filter(p => p.isNovel);

    const typeCounts = new Map<PatternType, number>();
    for (const pattern of patternArray) {
      typeCounts.set(pattern.signatureType, (typeCounts.get(pattern.signatureType) || 0) + 1);
    }

    let dominantType: PatternType = "response_bias_persistence";
    let maxCount = 0;
    for (const [type, count] of typeCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type;
      }
    }

    return {
      totalPatterns: patternArray.length,
      novelPatterns: novelPatterns.length,
      dominantPatternType: dominantType,
      patternDiversity: typeCounts.size / 10,
      recentPatternTrend: novelPatterns.length > 2 ? "high novelty" : "stable",
    };
  }

  private analyzeTendencies(tendencies: Map<LatentTendencyName, LatentTendency>): ExplainabilityReport["tendencyAnalysis"] {
    let totalDrift = 0;
    let maxVelocity = 0;
    let mostActiveTendency: LatentTendencyName = "attachment_drift";
    const concerningTendencies: LatentTendencyName[] = [];

    for (const [name, tendency] of tendencies) {
      totalDrift += Math.abs(tendency.currentValue - tendency.baseline);
      if (Math.abs(tendency.velocity) > maxVelocity) {
        maxVelocity = Math.abs(tendency.velocity);
        mostActiveTendency = name;
      }
      if (Math.abs(tendency.velocity) > 0.5 || Math.abs(tendency.currentValue - tendency.baseline) > 20) {
        concerningTendencies.push(name);
      }
    }

    return {
      overallDrift: totalDrift / tendencies.size,
      mostActiveTemendency: mostActiveTendency,
      stabilityScore: Math.max(0, 100 - totalDrift / tendencies.size * 2),
      concerningTendencies,
    };
  }

  private analyzeEmergence(phenomena: EmergentPhenomenon[]): ExplainabilityReport["emergenceAnalysis"] {
    const active = phenomena.filter(p => p.is_active);
    const resolved = phenomena.filter(p => !p.is_active);
    const critical = phenomena.filter(p => p.severity === "critical" || p.severity === "high");

    return {
      activeEmergences: active.length,
      resolvedEmergences: resolved.length,
      criticalEvents: critical.length,
      overallRiskLevel: critical.length > 0 ? "high" : active.length > 2 ? "moderate" : "low",
    };
  }

  private analyzeGovernance(responses: GovernanceResponse[]): ExplainabilityReport["governanceAnalysis"] {
    const actionCounts = new Map<GovernanceAction, number>();
    let totalEffectiveness = 0;

    for (const response of responses) {
      actionCounts.set(response.action as GovernanceAction, (actionCounts.get(response.action as GovernanceAction) || 0) + 1);
      if (response.actual_effect) totalEffectiveness += 1;
    }

    let mostCommonAction: GovernanceAction = "bias_rebalancing";
    let maxCount = 0;
    for (const [action, count] of actionCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonAction = action;
      }
    }

    return {
      actionsApplied: responses.length,
      averageEffectiveness: responses.length > 0 ? totalEffectiveness / responses.length : 0,
      mostCommonAction,
      governanceLoad: responses.filter(r => r.is_active).length,
    };
  }

  private generateReportSummary(
    field: ExplainabilityReport["behaviorFieldAnalysis"],
    pattern: ExplainabilityReport["patternAnalysis"],
    tendency: ExplainabilityReport["tendencyAnalysis"],
    emergence: ExplainabilityReport["emergenceAnalysis"]
  ): string {
    const parts: string[] = [];

    parts.push(`Behavior field is ${field.stabilityTrend} with ${field.fieldCoherence.toFixed(0)}% coherence.`);
    parts.push(`${pattern.totalPatterns} patterns tracked (${pattern.novelPatterns} novel).`);
    parts.push(`Tendency stability: ${tendency.stabilityScore.toFixed(0)}%.`);

    if (emergence.activeEmergences > 0) {
      parts.push(`${emergence.activeEmergences} active emergent phenomena detected.`);
    }

    return parts.join(" ");
  }

  private generateRecommendations(
    field: ExplainabilityReport["behaviorFieldAnalysis"],
    tendency: ExplainabilityReport["tendencyAnalysis"],
    emergence: ExplainabilityReport["emergenceAnalysis"]
  ): string[] {
    const recommendations: string[] = [];

    if (field.stabilityTrend === "volatile") {
      recommendations.push("Consider field stabilization to reduce volatility");
    }

    if (tendency.concerningTendencies.length > 0) {
      recommendations.push(`Monitor concerning tendencies: ${tendency.concerningTendencies.join(", ")}`);
    }

    if (emergence.overallRiskLevel === "high") {
      recommendations.push("High emergence risk - active governance recommended");
    }

    if (recommendations.length === 0) {
      recommendations.push("System operating within normal parameters");
    }

    return recommendations;
  }
}

export const emergentBehaviorEngine = new EmergentBehaviorEngine();
