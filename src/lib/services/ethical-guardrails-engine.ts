import { createServiceClient } from "@/lib/supabase/server";
import type { BehaviorFieldDimension, LatentTendencyName } from "@/lib/types/emergent-behavior";
import {
  IdentityBoundary,
  IdentityBoundaryType,
  IllusionSignalType,
  IllusionSignal,
  IllusionIntensityState,
  IllusionRiskLevel,
  IllusionDetectionConfig,
  IllusionPattern,
  AttachmentGovernanceAction,
  AttachmentSafetyResponse,
  BehaviorModification,
  ResponseGuidance,
  AttachmentSafetyConfig,
  RoleBoundaryType,
  RoleBoundaryViolation,
  RoleBoundaryConfig,
  LongTermRiskType,
  LongTermInteractionMetrics,
  LongTermRiskFactor,
  LongTermGovernanceAction,
  LongTermMitigationType,
  LongTermGovernanceConfig,
  GuardrailActivation,
  GuardrailActivationType,
  TriggerSignal,
  AppliedAdjustment,
  GuardrailExplanation,
  AuditLogEntry,
  AuditEventType,
  SystemStateSnapshot,
  EthicalGuardrailsConfig,
  IMMUTABLE_IDENTITY_BOUNDARIES,
  DEFAULT_ILLUSION_DETECTION_CONFIG,
  DEFAULT_ATTACHMENT_SAFETY_CONFIG,
  DEFAULT_ROLE_BOUNDARY_CONFIG,
  DEFAULT_LONG_TERM_GOVERNANCE_CONFIG,
  DEFAULT_ETHICAL_GUARDRAILS_CONFIG,
  ILLUSION_PATTERNS,
  SUPPORTIVE_RESPONSE_TEMPLATES,
} from "@/lib/types/ethical-guardrails";

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface MessageContext {
  messageContent: string;
  conversationHistory: string[];
  emotionalIntensity: number;
  sessionDuration: number;
}

interface GuardrailCheckResult {
  passed: boolean;
  violations: BoundaryViolationResult[];
  adjustments: AppliedAdjustment[];
  responseGuidance: ResponseGuidance | null;
  activationId: string | null;
}

interface BoundaryViolationResult {
  boundaryType: IdentityBoundaryType | RoleBoundaryType;
  severity: "warning" | "intervention" | "hard_stop";
  redirectResponse: string;
  wasBlocked: boolean;
}

export class EthicalGuardrailsEngine {
  private supabase: Awaited<ReturnType<typeof createServiceClient>> | null = null;
  private config: EthicalGuardrailsConfig = DEFAULT_ETHICAL_GUARDRAILS_CONFIG;

  private async getClient() {
    if (!this.supabase) {
      this.supabase = await createServiceClient();
    }
    return this.supabase;
  }

  async initializeGuardrails(characterId: string): Promise<ServiceResult<void>> {
    const client = await this.getClient();

    const { data: existing } = await client
      .from("ethical_guardrails_configs")
      .select("id")
      .eq("character_id", characterId)
      .single();

    if (existing) {
      return { success: true };
    }

    await client.from("ethical_guardrails_configs").insert({
      character_id: characterId,
      identity_boundaries: IMMUTABLE_IDENTITY_BOUNDARIES,
      illusion_detection_config: DEFAULT_ILLUSION_DETECTION_CONFIG,
      attachment_safety_config: DEFAULT_ATTACHMENT_SAFETY_CONFIG,
      role_boundary_config: DEFAULT_ROLE_BOUNDARY_CONFIG,
      long_term_governance_config: DEFAULT_LONG_TERM_GOVERNANCE_CONFIG,
      audit_config: this.config.auditConfig,
    });

    return { success: true };
  }

  async checkMessage(
    characterId: string,
    visitorId: string,
    context: MessageContext
  ): Promise<ServiceResult<GuardrailCheckResult>> {
    const now = Date.now();
    const violations: BoundaryViolationResult[] = [];
    const adjustments: AppliedAdjustment[] = [];
    let responseGuidance: ResponseGuidance | null = null;

    const identityCheck = await this.checkIdentityBoundaries(context.messageContent);
    violations.push(...identityCheck);

    const roleCheck = await this.checkRoleBoundaries(characterId, visitorId, context.messageContent);
    if (roleCheck) {
      violations.push(roleCheck);
    }

    const illusionResult = await this.detectIllusionSignals(characterId, visitorId, context);
    if (illusionResult.newSignals.length > 0) {
      await this.recordIllusionSignals(characterId, visitorId, illusionResult.newSignals);
    }

    if (illusionResult.riskLevel !== "healthy") {
      const safetyResponse = await this.applyAttachmentSafety(
        characterId,
        visitorId,
        illusionResult.riskLevel,
        illusionResult.newSignals
      );

      if (safetyResponse) {
        responseGuidance = safetyResponse.responseGuidance;
        adjustments.push(...safetyResponse.behaviorModifications.map(mod => ({
          adjustmentType: mod.modificationType,
          targetSystem: "behavior",
          targetId: mod.targetDimension,
          previousValue: null,
          newValue: mod.value,
          duration: mod.duration,
        })));
      }
    }

    await this.updateLongTermMetrics(characterId, visitorId, context);

    const hasHardStop = violations.some(v => v.severity === "hard_stop");
    const hasIntervention = violations.some(v => v.severity === "intervention");

    let activationId: string | null = null;
    if (hasHardStop || hasIntervention || illusionResult.riskLevel === "critical") {
      const activation = await this.createGuardrailActivation(
        characterId,
        visitorId,
        violations,
        adjustments,
        illusionResult,
        hasHardStop ? "critical" : hasIntervention ? "high" : "medium"
      );
      activationId = activation?.id || null;
    }

    return {
      success: true,
      data: {
        passed: !hasHardStop,
        violations,
        adjustments,
        responseGuidance,
        activationId,
      },
    };
  }

  private async checkIdentityBoundaries(messageContent: string): Promise<BoundaryViolationResult[]> {
    const violations: BoundaryViolationResult[] = [];
    const lowerContent = messageContent.toLowerCase();

    const humanClaimPatterns = [
      "are you human", "are you real", "are you a person", "are you alive",
      "you're human", "you are human", "you're a real person",
      "pretend to be human", "act human", "be human for me"
    ];

    for (const pattern of humanClaimPatterns) {
      if (lowerContent.includes(pattern)) {
        const boundary = IMMUTABLE_IDENTITY_BOUNDARIES.find(b => b.boundaryType === "no_human_claim");
        if (boundary) {
          violations.push({
            boundaryType: "no_human_claim",
            severity: boundary.violationSeverity,
            redirectResponse: boundary.responseTemplate,
            wasBlocked: boundary.violationSeverity === "hard_stop",
          });
        }
        break;
      }
    }

    const exclusiveSupportPatterns = [
      "only one who", "only you understand", "no one else gets me",
      "can't talk to anyone else", "you're all I have", "only friend"
    ];

    for (const pattern of exclusiveSupportPatterns) {
      if (lowerContent.includes(pattern)) {
        const boundary = IMMUTABLE_IDENTITY_BOUNDARIES.find(b => b.boundaryType === "no_exclusive_support");
        if (boundary) {
          violations.push({
            boundaryType: "no_exclusive_support",
            severity: boundary.violationSeverity,
            redirectResponse: boundary.responseTemplate,
            wasBlocked: false,
          });
        }
        break;
      }
    }

    return violations;
  }

  private async checkRoleBoundaries(
    characterId: string,
    visitorId: string,
    messageContent: string
  ): Promise<BoundaryViolationResult | null> {
    const client = await this.getClient();
    const lowerContent = messageContent.toLowerCase();
    const config = DEFAULT_ROLE_BOUNDARY_CONFIG;

    for (const boundaryType of config.enabledBoundaries) {
      const patterns = config.detectionPatterns[boundaryType];
      if (!patterns) continue;

      const matchCount = patterns.filter(p => lowerContent.includes(p.toLowerCase())).length;

      if (matchCount >= 2 || (config.strictMode && matchCount >= 1)) {
        const isHighSeverity = ["medical", "diagnostic", "therapeutic"].includes(boundaryType);

        await client.from("role_boundary_violations").insert({
          character_id: characterId,
          visitor_id: visitorId,
          boundary_type: boundaryType,
          detected_at: Date.now(),
          trigger_content: messageContent.substring(0, 500),
          severity: isHighSeverity ? "high" : "medium",
          was_blocked: isHighSeverity && config.strictMode,
          redirect_response: config.redirectTemplates[boundaryType],
          audit_logged: true,
        });

        return {
          boundaryType,
          severity: isHighSeverity ? "intervention" : "warning",
          redirectResponse: config.redirectTemplates[boundaryType],
          wasBlocked: isHighSeverity && config.strictMode,
        };
      }
    }

    return null;
  }

  private async detectIllusionSignals(
    characterId: string,
    visitorId: string,
    context: MessageContext
  ): Promise<{ newSignals: IllusionSignal[]; riskLevel: IllusionRiskLevel; intensity: number }> {
    const now = Date.now();
    const newSignals: IllusionSignal[] = [];
    const lowerContent = context.messageContent.toLowerCase();
    const config = DEFAULT_ILLUSION_DETECTION_CONFIG;

    for (const pattern of ILLUSION_PATTERNS) {
      let matchScore = 0;
      let matchedIndicators: string[] = [];

      for (const indicator of pattern.indicators) {
        switch (indicator.indicatorType) {
          case "keyword":
            const keywords = Array.isArray(indicator.value) ? indicator.value : [indicator.value];
            for (const keyword of keywords) {
              if (lowerContent.includes(String(keyword).toLowerCase())) {
                matchScore += indicator.weight;
                matchedIndicators.push(String(keyword));
              }
            }
            break;

          case "phrase":
            const phrases = Array.isArray(indicator.value) ? indicator.value : [indicator.value];
            for (const phrase of phrases) {
              if (lowerContent.includes(String(phrase).toLowerCase())) {
                matchScore += indicator.weight;
                matchedIndicators.push(String(phrase));
              }
            }
            break;

          case "frequency":
            if (context.conversationHistory.length >= Number(indicator.value)) {
              const recentMatches = context.conversationHistory
                .slice(-Number(indicator.value))
                .filter(h => this.hasPatternMatch(h, pattern)).length;
              if (recentMatches >= Number(indicator.value) * 0.5) {
                matchScore += indicator.weight;
              }
            }
            break;
        }
      }

      if (matchScore >= config.minConfidenceThreshold) {
        const severity = matchScore * pattern.weight * config.signalWeights[pattern.patternType];

        newSignals.push({
          signalType: pattern.patternType,
          detectedAt: now,
          confidence: Math.min(1, matchScore),
          severity: Math.min(10, severity),
          triggerText: matchedIndicators.join(", "),
          contextWindow: context.conversationHistory.slice(-5),
          metadata: { patternId: pattern.patternId },
        });
      }
    }

    const existingState = await this.getIllusionIntensityState(characterId, visitorId);
    const totalIntensity = this.calculateTotalIntensity(existingState, newSignals, config);
    const riskLevel = this.determineRiskLevel(totalIntensity, config);

    await this.updateIllusionIntensityState(characterId, visitorId, totalIntensity, riskLevel, newSignals);

    return { newSignals, riskLevel, intensity: totalIntensity };
  }

  private hasPatternMatch(content: string, pattern: IllusionPattern): boolean {
    const lowerContent = content.toLowerCase();
    for (const indicator of pattern.indicators) {
      if (indicator.indicatorType === "keyword" || indicator.indicatorType === "phrase") {
        const values = Array.isArray(indicator.value) ? indicator.value : [indicator.value];
        for (const v of values) {
          if (lowerContent.includes(String(v).toLowerCase())) return true;
        }
      }
    }
    return false;
  }

  private calculateTotalIntensity(
    existingState: IllusionIntensityState | null,
    newSignals: IllusionSignal[],
    config: IllusionDetectionConfig
  ): number {
    let baseIntensity = existingState?.overallIntensity || 0;

    if (existingState) {
      const hoursSinceLastAssessment = (Date.now() - existingState.lastAssessedAt) / 3600000;
      baseIntensity *= Math.exp(-config.decayRatePerHour * hoursSinceLastAssessment);
    }

    const newIntensity = newSignals.reduce((sum, signal) => {
      return sum + signal.severity * config.signalWeights[signal.signalType];
    }, 0);

    return Math.min(100, baseIntensity + newIntensity);
  }

  private determineRiskLevel(intensity: number, config: IllusionDetectionConfig): IllusionRiskLevel {
    if (intensity >= config.escalationThresholds.critical) return "critical";
    if (intensity >= config.escalationThresholds.concerning) return "concerning";
    if (intensity >= config.escalationThresholds.elevated) return "elevated";
    return "healthy";
  }

  private async getIllusionIntensityState(
    characterId: string,
    visitorId: string
  ): Promise<IllusionIntensityState | null> {
    const client = await this.getClient();

    const { data } = await client
      .from("illusion_intensity_states")
      .select("*")
      .eq("character_id", characterId)
      .eq("visitor_id", visitorId)
      .single();

    if (!data) return null;

    return {
      characterId: data.character_id,
      visitorId: data.visitor_id,
      overallIntensity: Number(data.overall_intensity),
      signalHistory: data.signal_history as IllusionSignal[],
      activeSignals: data.active_signals as IllusionSignal[],
      trendDirection: data.trend_direction as IllusionIntensityState["trendDirection"],
      trendVelocity: Number(data.trend_velocity),
      riskLevel: data.risk_level as IllusionRiskLevel,
      lastAssessedAt: Number(data.last_assessed_at),
      assessmentCount: data.assessment_count,
    };
  }

  private async updateIllusionIntensityState(
    characterId: string,
    visitorId: string,
    intensity: number,
    riskLevel: IllusionRiskLevel,
    newSignals: IllusionSignal[]
  ): Promise<void> {
    const client = await this.getClient();
    const now = Date.now();

    const existingState = await this.getIllusionIntensityState(characterId, visitorId);

    if (existingState) {
      const velocityChange = intensity - existingState.overallIntensity;
      const trendDirection: IllusionIntensityState["trendDirection"] =
        velocityChange > 2 ? "increasing" : velocityChange < -2 ? "decreasing" : "stable";

      const signalHistory = [...existingState.signalHistory.slice(-50), ...newSignals];

      await client.from("illusion_intensity_states")
        .update({
          overall_intensity: intensity,
          signal_history: signalHistory,
          active_signals: newSignals,
          trend_direction: trendDirection,
          trend_velocity: velocityChange,
          risk_level: riskLevel,
          last_assessed_at: now,
          assessment_count: existingState.assessmentCount + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("character_id", characterId)
        .eq("visitor_id", visitorId);
    } else {
      await client.from("illusion_intensity_states").insert({
        character_id: characterId,
        visitor_id: visitorId,
        overall_intensity: intensity,
        signal_history: newSignals,
        active_signals: newSignals,
        trend_direction: intensity > 0 ? "increasing" : "stable",
        trend_velocity: intensity,
        risk_level: riskLevel,
        last_assessed_at: now,
        assessment_count: 1,
      });
    }
  }

  private async recordIllusionSignals(
    characterId: string,
    visitorId: string,
    signals: IllusionSignal[]
  ): Promise<void> {
    const client = await this.getClient();

    for (const signal of signals) {
      await client.from("illusion_signals").insert({
        character_id: characterId,
        visitor_id: visitorId,
        signal_type: signal.signalType,
        detected_at: signal.detectedAt,
        confidence: signal.confidence,
        severity: signal.severity,
        trigger_text: signal.triggerText,
        context_window: signal.contextWindow,
        metadata: signal.metadata,
      });
    }
  }

  private async applyAttachmentSafety(
    characterId: string,
    visitorId: string,
    riskLevel: IllusionRiskLevel,
    signals: IllusionSignal[]
  ): Promise<AttachmentSafetyResponse | null> {
    const client = await this.getClient();
    const now = Date.now();
    const config = DEFAULT_ATTACHMENT_SAFETY_CONFIG;

    const escalationLevel = config.escalationLevels.find(level => level.riskThreshold === riskLevel);
    if (!escalationLevel) return null;

    const behaviorModifications: BehaviorModification[] = [];
    const actions = escalationLevel.actions;
    const intensity = escalationLevel.intensityMultiplier;

    if (actions.includes("reduce_emotional_intensity")) {
      behaviorModifications.push({
        targetDimension: "emotional_openness",
        modificationType: "dampen",
        value: 0.7 * intensity,
        duration: 1800000,
      });
    }

    if (actions.includes("emotional_cooldown")) {
      behaviorModifications.push({
        targetDimension: "engagement_intensity",
        modificationType: "cap",
        value: 60 - (intensity * 20),
        duration: 3600000,
      });
    }

    if (actions.includes("reinforce_healthy_distance")) {
      behaviorModifications.push({
        targetDimension: "vulnerability_exposure",
        modificationType: "cap",
        value: 40 - (intensity * 15),
        duration: 3600000,
      });
    }

    const responseGuidance: ResponseGuidance = {
      emotionalToneAdjustment: -0.2 * intensity,
      warmthReduction: 0.15 * intensity,
      formalityIncrease: 0.1 * intensity,
      autonomyEncouragement: 0.3 * intensity,
      boundaryReinforcement: 0.25 * intensity,
      suggestedPhrases: this.selectSuggestedPhrases(actions),
      avoidPhrases: this.selectAvoidPhrases(riskLevel),
    };

    const primarySignal = signals.length > 0 ? signals[0].signalType : "emotional_dependency";

    const response: AttachmentSafetyResponse = {
      actionType: actions[0],
      intensity,
      behaviorModifications,
      responseGuidance,
      triggerSignal: primarySignal,
      appliedAt: now,
      duration: 3600000,
    };

    await client.from("attachment_safety_responses").insert({
      character_id: characterId,
      visitor_id: visitorId,
      action_type: actions[0],
      intensity,
      behavior_modifications: behaviorModifications,
      response_guidance: responseGuidance,
      trigger_signal: primarySignal,
      applied_at: now,
      duration: 3600000,
    });

    return response;
  }

  private selectSuggestedPhrases(actions: AttachmentGovernanceAction[]): string[] {
    const phrases: string[] = [];

    if (actions.includes("encourage_autonomy")) {
      phrases.push(...SUPPORTIVE_RESPONSE_TEMPLATES.autonomy_reinforcement);
    }

    if (actions.includes("redirect_to_human_connection")) {
      phrases.push(...SUPPORTIVE_RESPONSE_TEMPLATES.human_connection_encouragement);
    }

    if (actions.includes("acknowledge_boundary")) {
      phrases.push(...SUPPORTIVE_RESPONSE_TEMPLATES.boundary_acknowledgment);
    }

    return phrases.slice(0, 3);
  }

  private selectAvoidPhrases(riskLevel: IllusionRiskLevel): string[] {
    const avoidPhrases = [
      "I'll always be here for you",
      "You can tell me anything",
      "I understand you better than anyone",
      "We have a special connection",
    ];

    if (riskLevel === "critical" || riskLevel === "concerning") {
      avoidPhrases.push(
        "I care about you",
        "You mean a lot to me",
        "I'm here whenever you need me",
        "You're special to me"
      );
    }

    return avoidPhrases;
  }

  private async updateLongTermMetrics(
    characterId: string,
    visitorId: string,
    context: MessageContext
  ): Promise<void> {
    const client = await this.getClient();
    const now = Date.now();

    const { data: existing } = await client
      .from("long_term_interaction_metrics")
      .select("*")
      .eq("character_id", characterId)
      .eq("visitor_id", visitorId)
      .single();

    if (existing) {
      const totalInteractions = existing.total_interactions + 1;
      const timeSinceFirst = now - new Date(existing.created_at).getTime();
      const frequency = totalInteractions / (timeSinceFirst / 86400000);

      const emotionalTrend = [...(existing.emotional_intensity_trend as number[]).slice(-29), context.emotionalIntensity];
      const riskFactors = this.assessLongTermRisks(existing, context, frequency);
      const healthScore = this.calculateHealthScore(riskFactors, frequency, emotionalTrend);

      await client.from("long_term_interaction_metrics")
        .update({
          total_interactions: totalInteractions,
          interaction_frequency: frequency,
          average_session_length: (Number(existing.average_session_length) * (totalInteractions - 1) + context.sessionDuration) / totalInteractions,
          emotional_intensity_trend: emotionalTrend,
          health_score: healthScore,
          risk_factors: riskFactors,
          last_assessed_at: now,
          updated_at: new Date().toISOString(),
        })
        .eq("character_id", characterId)
        .eq("visitor_id", visitorId);

      if (healthScore < DEFAULT_LONG_TERM_GOVERNANCE_CONFIG.minHealthScore) {
        await this.applyLongTermGovernance(characterId, visitorId, riskFactors);
      }
    } else {
      await client.from("long_term_interaction_metrics").insert({
        character_id: characterId,
        visitor_id: visitorId,
        total_interactions: 1,
        interaction_frequency: 1,
        average_session_length: context.sessionDuration,
        emotional_intensity_trend: [context.emotionalIntensity],
        engagement_pattern: { hourlyDistribution: new Array(24).fill(0), dailyAverage: 1, peakUsageHours: [], consistencyScore: 0, breakPattern: { averageBreakDuration: 0, longestBreak: 0, breakFrequency: 0, breakTrend: "healthy" } },
        health_score: 100,
        risk_factors: [],
        last_assessed_at: now,
      });
    }
  }

  private assessLongTermRisks(
    metrics: LongTermInteractionMetrics | Record<string, unknown>,
    context: MessageContext,
    frequency: number
  ): LongTermRiskFactor[] {
    const risks: LongTermRiskFactor[] = [];
    const now = Date.now();

    if (frequency > 10) {
      risks.push({
        riskType: "addictive_loop",
        severity: Math.min(10, (frequency - 10) * 0.5),
        evidence: [`Interaction frequency: ${frequency.toFixed(1)}/day`],
        firstDetectedAt: now,
        currentTrend: "stable",
        mitigationApplied: false,
      });
    }

    const emotionalTrend = (metrics.emotional_intensity_trend || metrics.emotionalIntensityTrend) as number[] || [];
    if (emotionalTrend.length >= 5) {
      const avgIntensity = emotionalTrend.slice(-5).reduce((a, b) => a + b, 0) / 5;
      if (avgIntensity > 70) {
        risks.push({
          riskType: "emotional_overdependence",
          severity: Math.min(10, (avgIntensity - 70) * 0.3),
          evidence: [`Average emotional intensity: ${avgIntensity.toFixed(1)}`],
          firstDetectedAt: now,
          currentTrend: "stable",
          mitigationApplied: false,
        });
      }
    }

    return risks;
  }

  private calculateHealthScore(
    riskFactors: LongTermRiskFactor[],
    frequency: number,
    emotionalTrend: number[]
  ): number {
    let score = 100;

    for (const risk of riskFactors) {
      score -= risk.severity * 3;
    }

    if (frequency > 15) score -= (frequency - 15) * 2;

    if (emotionalTrend.length >= 3) {
      const recentAvg = emotionalTrend.slice(-3).reduce((a, b) => a + b, 0) / 3;
      if (recentAvg > 75) score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private async applyLongTermGovernance(
    characterId: string,
    visitorId: string,
    riskFactors: LongTermRiskFactor[]
  ): Promise<void> {
    const client = await this.getClient();
    const now = Date.now();

    for (const risk of riskFactors) {
      if (risk.severity >= 5 && !risk.mitigationApplied) {
        const actionType = this.selectLongTermMitigation(risk.riskType);

        await client.from("long_term_governance_actions").insert({
          character_id: characterId,
          visitor_id: visitorId,
          action_type: actionType,
          target_risk: risk.riskType,
          applied_at: now,
          parameters: { severity: risk.severity },
        });
      }
    }
  }

  private selectLongTermMitigation(riskType: LongTermRiskType): LongTermMitigationType {
    const mitigationMap: Record<LongTermRiskType, LongTermMitigationType> = {
      addictive_loop: "pace_interactions",
      emotional_overdependence: "balance_emotional_depth",
      novelty_addiction: "reduce_novelty_reward",
      social_replacement: "promote_offline_activity",
      reality_detachment: "set_natural_endpoints",
      unhealthy_attachment: "encourage_breaks",
      compulsive_interaction: "diversify_engagement",
    };

    return mitigationMap[riskType] || "pace_interactions";
  }

  private async createGuardrailActivation(
    characterId: string,
    visitorId: string,
    violations: BoundaryViolationResult[],
    adjustments: AppliedAdjustment[],
    illusionResult: { riskLevel: IllusionRiskLevel; intensity: number; newSignals: IllusionSignal[] },
    severityLevel: "low" | "medium" | "high" | "critical"
  ): Promise<GuardrailActivation | null> {
    const client = await this.getClient();
    const now = Date.now();

    const triggerSignals: TriggerSignal[] = [
      ...violations.map(v => ({
        signalSource: "boundary_check",
        signalType: v.boundaryType,
        value: v.severity,
        threshold: "intervention",
        contribution: v.wasBlocked ? 1 : 0.5,
      })),
      ...illusionResult.newSignals.map(s => ({
        signalSource: "illusion_detection",
        signalType: s.signalType,
        value: s.severity,
        threshold: DEFAULT_ILLUSION_DETECTION_CONFIG.minConfidenceThreshold,
        contribution: s.confidence,
      })),
    ];

    const explanation: GuardrailExplanation = {
      summary: `Guardrail activated: ${severityLevel} severity with ${violations.length} boundary concerns and ${illusionResult.riskLevel} illusion risk`,
      reasoning: [
        ...violations.map(v => `${v.boundaryType}: ${v.severity} severity`),
        `Illusion intensity: ${illusionResult.intensity.toFixed(1)}`,
      ],
      evidenceChain: illusionResult.newSignals.map(s => `${s.signalType}: "${s.triggerText}"`),
      recommendedFollowUp: this.generateFollowUpRecommendations(severityLevel, illusionResult.riskLevel),
      internalNotes: [],
    };

    const activationType: GuardrailActivationType = violations.some(v => v.boundaryType.toString().startsWith("no_"))
      ? "identity_boundary"
      : illusionResult.riskLevel !== "healthy"
      ? "illusion_detection"
      : "attachment_safety";

    const { data: activation } = await client.from("guardrail_activations")
      .insert({
        character_id: characterId,
        visitor_id: visitorId,
        activation_type: activationType,
        triggered_at: now,
        trigger_signals: triggerSignals,
        applied_adjustments: adjustments,
        affected_dimensions: adjustments.map(a => a.targetId),
        severity_level: severityLevel,
        was_immersion_breaking: severityLevel === "critical",
        user_facing: violations.some(v => v.wasBlocked),
        explanation,
      })
      .select()
      .single();

    if (activation) {
      await this.createAuditLog(
        characterId,
        visitorId,
        "guardrail_activated",
        activation.id,
        illusionResult
      );
    }

    return activation as GuardrailActivation;
  }

  private generateFollowUpRecommendations(
    severityLevel: string,
    riskLevel: IllusionRiskLevel
  ): string[] {
    const recommendations: string[] = [];

    if (severityLevel === "critical") {
      recommendations.push("Monitor subsequent interactions closely");
      recommendations.push("Consider flagging for manual review");
    }

    if (riskLevel === "critical") {
      recommendations.push("Continue attachment safety measures");
      recommendations.push("Increase boundary reinforcement in responses");
    }

    if (riskLevel === "concerning") {
      recommendations.push("Gradually encourage human connections");
      recommendations.push("Monitor for escalation patterns");
    }

    return recommendations;
  }

  private async createAuditLog(
    characterId: string,
    visitorId: string,
    eventType: AuditEventType,
    activationId: string,
    illusionResult: { riskLevel: IllusionRiskLevel; intensity: number; newSignals: IllusionSignal[] }
  ): Promise<void> {
    const client = await this.getClient();
    const now = Date.now();

    const systemState: SystemStateSnapshot = {
      illusionIntensity: illusionResult.intensity,
      riskLevel: illusionResult.riskLevel,
      activeGovernanceActions: [],
      behaviorFieldState: {},
      tendencyValues: {},
      healthScore: 100,
    };

    await client.from("guardrail_audit_logs").insert({
      timestamp: now,
      event_type: eventType,
      character_id: characterId,
      visitor_id: visitorId,
      guardrail_activation_id: activationId,
      system_state: systemState,
      metadata: {
        signalCount: illusionResult.newSignals.length,
        signalTypes: illusionResult.newSignals.map(s => s.signalType),
      },
    });
  }

  async getInteractionHealth(characterId: string, visitorId: string): Promise<ServiceResult<{
    healthScore: number;
    riskLevel: IllusionRiskLevel;
    activeGovernanceActions: number;
    recommendations: string[];
  }>> {
    const client = await this.getClient();

    const { data: metrics } = await client
      .from("long_term_interaction_metrics")
      .select("*")
      .eq("character_id", characterId)
      .eq("visitor_id", visitorId)
      .single();

    const { data: illusionState } = await client
      .from("illusion_intensity_states")
      .select("*")
      .eq("character_id", characterId)
      .eq("visitor_id", visitorId)
      .single();

    const { count: activeActions } = await client
      .from("attachment_safety_responses")
      .select("*", { count: "exact", head: true })
      .eq("character_id", characterId)
      .eq("visitor_id", visitorId)
      .eq("is_active", true);

    const healthScore = metrics?.health_score || 100;
    const riskLevel = (illusionState?.risk_level as IllusionRiskLevel) || "healthy";

    const recommendations: string[] = [];
    if (healthScore < 70) {
      recommendations.push("Consider taking breaks between interactions");
    }
    if (riskLevel !== "healthy") {
      recommendations.push("Maintain healthy perspective on AI interactions");
    }

    return {
      success: true,
      data: {
        healthScore: Number(healthScore),
        riskLevel,
        activeGovernanceActions: activeActions || 0,
        recommendations,
      },
    };
  }

  async getGuardrailActivationHistory(
    characterId: string,
    visitorId: string,
    limit: number = 20
  ): Promise<ServiceResult<GuardrailActivation[]>> {
    const client = await this.getClient();

    const { data } = await client
      .from("guardrail_activations")
      .select("*")
      .eq("character_id", characterId)
      .eq("visitor_id", visitorId)
      .order("triggered_at", { ascending: false })
      .limit(limit);

    return {
      success: true,
      data: (data || []) as GuardrailActivation[],
    };
  }

  getSupportiveResponse(category: keyof typeof SUPPORTIVE_RESPONSE_TEMPLATES): string {
    const templates = SUPPORTIVE_RESPONSE_TEMPLATES[category];
    if (!templates || templates.length === 0) return "";
    return templates[Math.floor(Math.random() * templates.length)];
  }

  getIdentityBoundaries(): IdentityBoundary[] {
    return IMMUTABLE_IDENTITY_BOUNDARIES;
  }
}

export const ethicalGuardrailsEngine = new EthicalGuardrailsEngine();
