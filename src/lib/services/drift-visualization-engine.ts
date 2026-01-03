import { createServiceClient } from "@/lib/supabase/server";
import type { LatentTendencyName, LatentTendency, BehaviorFieldDimension, BehaviorFieldVector } from "@/lib/types/emergent-behavior";
import {
  PersonalityDomain,
  DriftEvent,
  DriftEventType,
  DriftDirection,
  DriftMagnitude,
  PermanenceLevel,
  CausalFactor,
  CausalFactorType,
  VisibilityLevel,
  PersonalityTimeline,
  PersonalitySnapshot,
  DomainState,
  EvolutionPhase,
  TrajectoryAnalysis,
  TraitConstellation,
  ConstellationStar,
  ConstellationConnection,
  InfluenceField,
  FieldType,
  DomainCluster,
  ClusterElement,
  AbstractVisualization,
  VisualizationType,
  GlobalVisualizationMetrics,
  DirectionalIndicator,
  NarrativeExplanation,
  ReversibilityAssessment,
  ReversibilityStatus,
  ReversibilityFactor,
  PrivacySettings,
  DriftVisualizationConfig,
  DRIFT_DIRECTION_PHRASES,
  CAUSAL_FACTOR_NARRATIVES,
  REVERSIBILITY_DESCRIPTIONS,
  DEFAULT_PRIVACY_SETTINGS,
  DEFAULT_DRIFT_VISUALIZATION_CONFIG,
  DOMAIN_DISPLAY_NAMES,
  DOMAIN_DESCRIPTIONS,
  DOMAIN_COLORS,
  MAGNITUDE_TO_INTENSITY,
  EVOLUTION_PHASE_DESCRIPTIONS,
} from "@/lib/types/drift-visualization";

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const ALL_DOMAINS: PersonalityDomain[] = [
  "emotional_core", "social_dynamics", "cognitive_style", "relational_patterns",
  "expressive_tendencies", "resilience_adaptation", "curiosity_exploration", "boundary_maintenance"
];

export class DriftVisualizationEngine {
  private supabase: Awaited<ReturnType<typeof createServiceClient>> | null = null;
  private config: DriftVisualizationConfig = DEFAULT_DRIFT_VISUALIZATION_CONFIG;

  private async getClient() {
    if (!this.supabase) {
      this.supabase = await createServiceClient();
    }
    return this.supabase;
  }

  async initializeDriftVisualization(characterId: string): Promise<ServiceResult<void>> {
    const client = await this.getClient();

    const { data: existing } = await client
      .from("drift_visualization_configs")
      .select("id")
      .eq("character_id", characterId)
      .single();

    if (existing) return { success: true };

    await client.from("drift_visualization_configs").insert({
      character_id: characterId,
      color_scheme: DEFAULT_DRIFT_VISUALIZATION_CONFIG.colorScheme,
    });

    await client.from("drift_privacy_settings").insert({
      character_id: characterId,
      domain_visibility: Object.fromEntries(DEFAULT_PRIVACY_SETTINGS.domainVisibility),
      event_type_visibility: Object.fromEntries(DEFAULT_PRIVACY_SETTINGS.eventTypeVisibility),
    });

    await this.createInitialSnapshot(characterId);
    await this.generateInitialConstellations(characterId);
    await this.generateInitialClusters(characterId);

    return { success: true };
  }

  async detectAndRecordDriftEvent(
    characterId: string,
    tendencies: Map<LatentTendencyName, LatentTendency>,
    behaviorField: Map<BehaviorFieldDimension, BehaviorFieldVector>,
    previousSnapshot?: PersonalitySnapshot
  ): Promise<ServiceResult<DriftEvent | null>> {
    const client = await this.getClient();
    const now = Date.now();

    const currentDomainStates = this.computeDomainStates(tendencies, behaviorField);
    const driftAnalysis = this.analyzeDrift(currentDomainStates, previousSnapshot?.domainStates);

    if (driftAnalysis.magnitude === "subtle" && driftAnalysis.significance < this.config.significanceThreshold) {
      return { success: true, data: null };
    }

    const causalFactors = this.inferCausalFactors(tendencies, behaviorField);
    const direction = this.determineDirection(driftAnalysis.primaryChange);
    const humanReadableDescription = this.generateHumanReadableDescription(
      driftAnalysis.primaryDomain,
      direction,
      driftAnalysis.magnitude
    );
    const narrativeExplanation = this.generateNarrativeExplanation(
      causalFactors,
      direction,
      driftAnalysis.primaryDomain
    );

    const eventType = this.determineEventType(driftAnalysis);
    const permanenceLevel = this.assessPermanence(tendencies, driftAnalysis);

    const { data: event } = await client.from("drift_events")
      .insert({
        character_id: characterId,
        event_type: eventType,
        occurred_at: now,
        time_range_start: now - 86400000,
        time_range_end: now,
        affected_domains: driftAnalysis.affectedDomains,
        primary_domain: driftAnalysis.primaryDomain,
        direction,
        magnitude: driftAnalysis.magnitude,
        permanence_level: permanenceLevel,
        causal_factors: causalFactors,
        significance: driftAnalysis.significance,
        human_readable_description: humanReadableDescription,
        narrative_explanation: narrativeExplanation,
      })
      .select()
      .single();

    if (event) {
      await this.createReversibilityAssessment(characterId, event.id, permanenceLevel, tendencies);
      await this.createNarrativeExplanation(characterId, event.id, causalFactors, direction, driftAnalysis);
      await this.updateConstellations(characterId, currentDomainStates);
      await this.updateClusters(characterId, currentDomainStates);

      return { success: true, data: event as DriftEvent };
    }

    return { success: true, data: null };
  }

  async generatePersonalityTimeline(
    characterId: string,
    viewerLevel: VisibilityLevel = "creator_only"
  ): Promise<ServiceResult<PersonalityTimeline>> {
    const client = await this.getClient();
    const now = Date.now();

    const { data: config } = await client
      .from("drift_visualization_configs")
      .select("*")
      .eq("character_id", characterId)
      .single();

    const timelineDepth = config?.timeline_depth_days || 90;
    const maxEvents = config?.max_events_displayed || 20;
    const startTime = now - timelineDepth * 86400000;

    const { data: privacy } = await client
      .from("drift_privacy_settings")
      .select("*")
      .eq("character_id", characterId)
      .single();

    const { data: events } = await client
      .from("drift_events")
      .select("*")
      .eq("character_id", characterId)
      .gte("occurred_at", startTime)
      .order("occurred_at", { ascending: false })
      .limit(maxEvents);

    const filteredEvents = this.filterEventsByVisibility(
      (events || []) as DriftEvent[],
      viewerLevel,
      privacy
    );

    const { data: snapshots } = await client
      .from("personality_snapshots")
      .select("*")
      .eq("character_id", characterId)
      .order("timestamp", { ascending: false })
      .limit(10);

    const currentSnapshot = snapshots?.[0] ? this.parseSnapshot(snapshots[0]) : await this.createCurrentSnapshot(characterId);
    const historicalSnapshots = (snapshots || []).slice(1).map(s => this.parseSnapshot(s));

    const overallTrajectory = this.analyzeTrajectory(filteredEvents, currentSnapshot);

    return {
      success: true,
      data: {
        characterId,
        events: filteredEvents,
        currentSnapshot,
        historicalSnapshots,
        overallTrajectory,
        generatedAt: now,
      },
    };
  }

  async generateAbstractVisualization(
    characterId: string,
    visualizationType: VisualizationType = "combined"
  ): Promise<ServiceResult<AbstractVisualization>> {
    const client = await this.getClient();
    const now = Date.now();

    const { data: constellations } = await client
      .from("trait_constellations")
      .select("*")
      .eq("character_id", characterId);

    const { data: fields } = await client
      .from("influence_fields")
      .select("*")
      .eq("character_id", characterId);

    const { data: clusters } = await client
      .from("domain_clusters")
      .select("*")
      .eq("character_id", characterId);

    const parsedConstellations = (constellations || []).map(c => this.parseConstellation(c));
    const parsedFields = (fields || []).map(f => this.parseInfluenceField(f));
    const parsedClusters = (clusters || []).map(c => this.parseCluster(c));

    const globalMetrics = this.calculateGlobalMetrics(parsedConstellations, parsedClusters);

    return {
      success: true,
      data: {
        characterId,
        visualizationType,
        constellations: parsedConstellations,
        influenceFields: parsedFields,
        domainClusters: parsedClusters,
        globalMetrics,
        animationState: {
          isAnimating: true,
          currentPhase: "idle",
          transitionProgress: 0,
          breathingCycle: 0,
        },
        generatedAt: now,
      },
    };
  }

  async getDirectionalIndicators(characterId: string): Promise<ServiceResult<DirectionalIndicator[]>> {
    const client = await this.getClient();
    const now = Date.now();

    const { data: recentEvents } = await client
      .from("drift_events")
      .select("*")
      .eq("character_id", characterId)
      .gte("occurred_at", now - 30 * 86400000)
      .order("significance", { ascending: false })
      .limit(5);

    const indicators: DirectionalIndicator[] = (recentEvents || []).map((event, index) => ({
      indicatorId: `indicator_${index}`,
      domain: event.primary_domain as PersonalityDomain,
      direction: event.direction as DriftDirection,
      humanReadablePhrase: DRIFT_DIRECTION_PHRASES[event.direction as DriftDirection]?.[
        MAGNITUDE_TO_INTENSITY[event.magnitude as DriftMagnitude]
      ] || "experiencing change",
      intensity: MAGNITUDE_TO_INTENSITY[event.magnitude as DriftMagnitude],
      timeframe: this.formatTimeframe(now - Number(event.occurred_at)),
      confidence: Number(event.significance),
    }));

    return { success: true, data: indicators };
  }

  async getReversibilityAssessment(
    characterId: string,
    eventId: string
  ): Promise<ServiceResult<ReversibilityAssessment | null>> {
    const client = await this.getClient();

    const { data } = await client
      .from("reversibility_assessments")
      .select("*")
      .eq("character_id", characterId)
      .eq("drift_event_id", eventId)
      .single();

    if (!data) return { success: true, data: null };

    return {
      success: true,
      data: {
        assessmentId: data.assessment_id,
        driftEventId: data.drift_event_id,
        currentStatus: data.current_status as ReversibilityStatus,
        stabilizationProgress: Number(data.stabilization_progress),
        estimatedTimeToStabilize: data.estimated_time_to_stabilize,
        factors: data.factors as ReversibilityFactor[],
        guidance: REVERSIBILITY_DESCRIPTIONS[data.current_status as ReversibilityStatus],
      },
    };
  }

  async updatePrivacySettings(
    characterId: string,
    settings: Partial<PrivacySettings>
  ): Promise<ServiceResult<void>> {
    const client = await this.getClient();

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (settings.globalVisibility) updateData.global_visibility = settings.globalVisibility;
    if (settings.showMagnitude !== undefined) updateData.show_magnitude = settings.showMagnitude;
    if (settings.showCausalFactors !== undefined) updateData.show_causal_factors = settings.showCausalFactors;
    if (settings.showReversibility !== undefined) updateData.show_reversibility = settings.showReversibility;
    if (settings.showTimeline !== undefined) updateData.show_timeline = settings.showTimeline;
    if (settings.showConstellations !== undefined) updateData.show_constellations = settings.showConstellations;
    if (settings.allowExport !== undefined) updateData.allow_export = settings.allowExport;

    if (settings.domainVisibility) {
      updateData.domain_visibility = Object.fromEntries(settings.domainVisibility);
    }
    if (settings.eventTypeVisibility) {
      updateData.event_type_visibility = Object.fromEntries(settings.eventTypeVisibility);
    }

    await client.from("drift_privacy_settings")
      .update(updateData)
      .eq("character_id", characterId);

    return { success: true };
  }

  async getPrivacySettings(characterId: string): Promise<ServiceResult<PrivacySettings>> {
    const client = await this.getClient();

    const { data } = await client
      .from("drift_privacy_settings")
      .select("*")
      .eq("character_id", characterId)
      .single();

    if (!data) {
      return {
        success: true,
        data: {
          characterId,
          ...DEFAULT_PRIVACY_SETTINGS,
          lastUpdatedAt: Date.now(),
        },
      };
    }

    return {
      success: true,
      data: {
        characterId,
        globalVisibility: data.global_visibility as VisibilityLevel,
        domainVisibility: new Map(Object.entries(data.domain_visibility || {})) as Map<PersonalityDomain, VisibilityLevel>,
        eventTypeVisibility: new Map(Object.entries(data.event_type_visibility || {})) as Map<DriftEventType, VisibilityLevel>,
        showMagnitude: data.show_magnitude,
        showCausalFactors: data.show_causal_factors,
        showReversibility: data.show_reversibility,
        showTimeline: data.show_timeline,
        showConstellations: data.show_constellations,
        allowExport: data.allow_export,
        lastUpdatedAt: new Date(data.updated_at).getTime(),
      },
    };
  }

  private computeDomainStates(
    tendencies: Map<LatentTendencyName, LatentTendency>,
    behaviorField: Map<BehaviorFieldDimension, BehaviorFieldVector>
  ): Map<PersonalityDomain, DomainState> {
    const states = new Map<PersonalityDomain, DomainState>();

    const domainMapping: Record<PersonalityDomain, { tendencies: LatentTendencyName[]; fields: BehaviorFieldDimension[] }> = {
      emotional_core: { tendencies: ["emotional_dampening", "vulnerability_resistance"], fields: ["emotional_openness", "vulnerability_exposure"] },
      social_dynamics: { tendencies: ["connection_seeking", "autonomy_preservation"], fields: ["approach_withdrawal", "engagement_intensity"] },
      cognitive_style: { tendencies: ["novelty_adaptation"], fields: ["curiosity_bias", "novelty_familiarity"] },
      relational_patterns: { tendencies: ["attachment_drift", "trust_inertia", "intimacy_momentum"], fields: ["approach_withdrawal"] },
      expressive_tendencies: { tendencies: [], fields: ["assertiveness_deference", "engagement_intensity"] },
      resilience_adaptation: { tendencies: ["avoidance_gradient", "conflict_aversion"], fields: ["resistance_defensiveness"] },
      curiosity_exploration: { tendencies: ["novelty_adaptation"], fields: ["curiosity_bias", "novelty_familiarity"] },
      boundary_maintenance: { tendencies: ["vulnerability_resistance", "autonomy_preservation"], fields: ["resistance_defensiveness"] },
    };

    for (const domain of ALL_DOMAINS) {
      const mapping = domainMapping[domain];
      let totalValue = 0;
      let totalVelocity = 0;
      let count = 0;

      for (const tendencyName of mapping.tendencies) {
        const tendency = tendencies.get(tendencyName);
        if (tendency) {
          totalValue += tendency.currentValue;
          totalVelocity += tendency.velocity;
          count++;
        }
      }

      for (const fieldName of mapping.fields) {
        const field = behaviorField.get(fieldName);
        if (field) {
          totalValue += (field.value - field.bounds.min) / (field.bounds.max - field.bounds.min) * 100;
          totalVelocity += field.momentum;
          count++;
        }
      }

      const avgValue = count > 0 ? totalValue / count : 50;
      const avgVelocity = count > 0 ? totalVelocity / count : 0;

      states.set(domain, {
        domain,
        position: avgValue,
        velocity: avgVelocity,
        stability: Math.max(0, 100 - Math.abs(avgVelocity) * 10),
        recentTrend: avgVelocity > 0.5 ? "growing" : avgVelocity < -0.5 ? "softening" : "stable",
      });
    }

    return states;
  }

  private analyzeDrift(
    currentStates: Map<PersonalityDomain, DomainState>,
    previousStates?: Map<PersonalityDomain, DomainState>
  ): {
    primaryDomain: PersonalityDomain;
    primaryChange: number;
    affectedDomains: PersonalityDomain[];
    magnitude: DriftMagnitude;
    significance: number;
  } {
    const changes: { domain: PersonalityDomain; change: number }[] = [];

    for (const [domain, state] of currentStates) {
      const previousState = previousStates?.get(domain);
      const change = previousState ? state.position - previousState.position : state.velocity * 10;
      changes.push({ domain, change: Math.abs(change) });
    }

    changes.sort((a, b) => b.change - a.change);

    const primaryDomain = changes[0]?.domain || "emotional_core";
    const primaryChange = changes[0]?.change || 0;
    const affectedDomains = changes.filter(c => c.change > 5).map(c => c.domain);
    const totalChange = changes.reduce((sum, c) => sum + c.change, 0);

    let magnitude: DriftMagnitude = "subtle";
    if (totalChange > 50) magnitude = "profound";
    else if (totalChange > 30) magnitude = "significant";
    else if (totalChange > 15) magnitude = "noticeable";

    const currentState = currentStates.get(primaryDomain);
    const significance = Math.min(1, (primaryChange / 50) * (currentState?.velocity ? Math.abs(currentState.velocity) + 1 : 1));

    return { primaryDomain, primaryChange, affectedDomains, magnitude, significance };
  }

  private inferCausalFactors(
    tendencies: Map<LatentTendencyName, LatentTendency>,
    behaviorField: Map<BehaviorFieldDimension, BehaviorFieldVector>
  ): CausalFactor[] {
    const factors: CausalFactor[] = [];

    let maxVelocityTendency: { name: LatentTendencyName; velocity: number } | null = null;
    for (const [name, tendency] of tendencies) {
      if (!maxVelocityTendency || Math.abs(tendency.velocity) > Math.abs(maxVelocityTendency.velocity)) {
        maxVelocityTendency = { name, velocity: tendency.velocity };
      }
    }

    if (maxVelocityTendency && Math.abs(maxVelocityTendency.velocity) > 0.1) {
      const narratives = CAUSAL_FACTOR_NARRATIVES.interaction_pattern;
      factors.push({
        factorType: "interaction_pattern",
        contribution: Math.min(1, Math.abs(maxVelocityTendency.velocity) * 2),
        description: narratives[Math.floor(Math.random() * narratives.length)],
        timeframe: "over recent interactions",
        confidence: 0.7,
      });
    }

    const stressTendencies = ["avoidance_gradient", "vulnerability_resistance", "conflict_aversion"];
    const stressValues = stressTendencies.map(name => tendencies.get(name as LatentTendencyName)?.currentValue || 50);
    const avgStress = stressValues.reduce((a, b) => a + b, 0) / stressValues.length;

    if (avgStress > 60) {
      const narratives = CAUSAL_FACTOR_NARRATIVES.stress_exposure;
      factors.push({
        factorType: "stress_exposure",
        contribution: (avgStress - 50) / 50,
        description: narratives[Math.floor(Math.random() * narratives.length)],
        timeframe: "during challenging periods",
        confidence: 0.65,
      });
    } else if (avgStress < 40) {
      const narratives = CAUSAL_FACTOR_NARRATIVES.rest_recovery;
      factors.push({
        factorType: "rest_recovery",
        contribution: (50 - avgStress) / 50,
        description: narratives[Math.floor(Math.random() * narratives.length)],
        timeframe: "during calmer periods",
        confidence: 0.6,
      });
    }

    const narratives = CAUSAL_FACTOR_NARRATIVES.temporal_passage;
    factors.push({
      factorType: "temporal_passage",
      contribution: 0.3,
      description: narratives[Math.floor(Math.random() * narratives.length)],
      timeframe: "naturally over time",
      confidence: 0.8,
    });

    return factors.sort((a, b) => b.contribution - a.contribution).slice(0, 3);
  }

  private determineDirection(primaryChange: number): DriftDirection {
    if (Math.abs(primaryChange) < 5) return "neutral_fluctuation";
    return primaryChange > 0 ? "toward_openness" : "toward_reservation";
  }

  private generateHumanReadableDescription(
    domain: PersonalityDomain,
    direction: DriftDirection,
    magnitude: DriftMagnitude
  ): string {
    const domainName = DOMAIN_DISPLAY_NAMES[domain];
    const intensity = MAGNITUDE_TO_INTENSITY[magnitude];
    const phrase = DRIFT_DIRECTION_PHRASES[direction]?.[intensity] || "experiencing subtle change";

    return `${domainName}: ${phrase}`;
  }

  private generateNarrativeExplanation(
    causalFactors: CausalFactor[],
    direction: DriftDirection,
    domain: PersonalityDomain
  ): string {
    const domainName = DOMAIN_DISPLAY_NAMES[domain].toLowerCase();
    const primaryFactor = causalFactors[0];

    if (!primaryFactor) {
      return `The character's ${domainName} has been evolving naturally through ongoing experiences.`;
    }

    return `${primaryFactor.description} a gradual shift in ${domainName}. ${
      causalFactors.length > 1 
        ? `This was reinforced by ${causalFactors[1].description.toLowerCase()}.` 
        : ""
    }`;
  }

  private determineEventType(driftAnalysis: {
    magnitude: DriftMagnitude;
    primaryChange: number;
    significance: number;
  }): DriftEventType {
    if (driftAnalysis.magnitude === "profound") return "significant_change";
    if (driftAnalysis.significance > 0.8) return "crystallization";
    if (driftAnalysis.primaryChange < 0 && driftAnalysis.magnitude !== "subtle") return "softening";
    if (Math.abs(driftAnalysis.primaryChange) < 10) return "stabilization";
    return "gradual_shift";
  }

  private assessPermanence(
    tendencies: Map<LatentTendencyName, LatentTendency>,
    driftAnalysis: { magnitude: DriftMagnitude; significance: number }
  ): PermanenceLevel {
    const avgInertia = Array.from(tendencies.values()).reduce((sum, t) => sum + t.inertia, 0) / tendencies.size;

    if (driftAnalysis.magnitude === "profound" && avgInertia > 0.9) return "crystallized";
    if (driftAnalysis.significance > 0.7 && avgInertia > 0.85) return "established";
    if (driftAnalysis.significance > 0.5) return "stabilizing";
    if (driftAnalysis.magnitude !== "subtle") return "forming";
    return "transient";
  }

  private async createInitialSnapshot(characterId: string): Promise<void> {
    const client = await this.getClient();
    const now = Date.now();

    const domainStates: Record<string, DomainState> = {};
    for (const domain of ALL_DOMAINS) {
      domainStates[domain] = {
        domain,
        position: 50,
        velocity: 0,
        stability: 80,
        recentTrend: "stable",
      };
    }

    await client.from("personality_snapshots").insert({
      character_id: characterId,
      snapshot_id: `snapshot_${now}`,
      timestamp: now,
      domain_states: domainStates,
      overall_stability: 80,
      evolution_phase: "forming",
      character_essence: "A character beginning their journey of development",
    });
  }

  private async createCurrentSnapshot(characterId: string): Promise<PersonalitySnapshot> {
    const now = Date.now();
    const domainStates = new Map<PersonalityDomain, DomainState>();

    for (const domain of ALL_DOMAINS) {
      domainStates.set(domain, {
        domain,
        position: 50,
        velocity: 0,
        stability: 80,
        recentTrend: "stable",
      });
    }

    return {
      snapshotId: `snapshot_${now}`,
      timestamp: now,
      domainStates,
      overallStability: 80,
      evolutionPhase: "forming",
      characterEssence: "A character in the process of becoming",
    };
  }

  private async generateInitialConstellations(characterId: string): Promise<void> {
    const client = await this.getClient();

    const constellationGroups: { domains: PersonalityDomain[]; name: string; description: string }[] = [
      { domains: ["emotional_core", "relational_patterns"], name: "Heart Center", description: "The emotional foundation and relational tendencies" },
      { domains: ["social_dynamics", "expressive_tendencies"], name: "Social Presence", description: "How the character engages with and expresses to others" },
      { domains: ["cognitive_style", "curiosity_exploration"], name: "Mind Flow", description: "Thinking patterns and drive to explore" },
      { domains: ["resilience_adaptation", "boundary_maintenance"], name: "Inner Shield", description: "Protective and adaptive capacities" },
    ];

    for (const group of constellationGroups) {
      const stars: ConstellationStar[] = group.domains.map((domain, i) => {
        const colors = DOMAIN_COLORS[domain];
        const angle = (i / group.domains.length) * Math.PI * 2;
        const radius = 30 + Math.random() * 20;

        return {
          id: `star_${domain}`,
          traitName: DOMAIN_DISPLAY_NAMES[domain],
          domain,
          position: {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
            z: Math.random() * 10 - 5,
          },
          brightness: 0.6 + Math.random() * 0.3,
          size: 8 + Math.random() * 4,
          color: colors.primary,
          pulseRate: 0.5 + Math.random() * 0.5,
          isCore: i === 0,
        };
      });

      const connections: ConstellationConnection[] = [];
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          connections.push({
            fromStarId: stars[i].id,
            toStarId: stars[j].id,
            strength: 0.5 + Math.random() * 0.3,
            connectionType: Math.random() > 0.7 ? "tension" : Math.random() > 0.4 ? "reinforcing" : "balancing",
            visible: true,
          });
        }
      }

      await client.from("trait_constellations").insert({
        character_id: characterId,
        constellation_id: `constellation_${group.name.toLowerCase().replace(/\s/g, "_")}`,
        name: group.name,
        description: group.description,
        stars,
        connections,
        center_of_mass: { x: 0, y: 0 },
        luminosity: 0.7,
        stability: 0.75,
      });
    }
  }

  private async generateInitialClusters(characterId: string): Promise<void> {
    const client = await this.getClient();

    const clusterPositions: { domain: PersonalityDomain; x: number; y: number }[] = [
      { domain: "emotional_core", x: -60, y: -40 },
      { domain: "social_dynamics", x: 60, y: -40 },
      { domain: "cognitive_style", x: -60, y: 40 },
      { domain: "relational_patterns", x: 60, y: 40 },
      { domain: "expressive_tendencies", x: 0, y: -70 },
      { domain: "resilience_adaptation", x: 0, y: 70 },
      { domain: "curiosity_exploration", x: -80, y: 0 },
      { domain: "boundary_maintenance", x: 80, y: 0 },
    ];

    for (const pos of clusterPositions) {
      const colors = DOMAIN_COLORS[pos.domain];

      await client.from("domain_clusters").insert({
        character_id: characterId,
        cluster_id: `cluster_${pos.domain}`,
        domain: pos.domain,
        display_name: DOMAIN_DISPLAY_NAMES[pos.domain],
        description: DOMAIN_DESCRIPTIONS[pos.domain],
        position: { x: pos.x, y: pos.y },
        size: 40 + Math.random() * 20,
        cohesion: 0.6 + Math.random() * 0.3,
        elements: [
          { elementId: "core", name: "Core", value: 50, contribution: 0.5, visualWeight: 1.0 },
          { elementId: "secondary", name: "Secondary", value: 45, contribution: 0.3, visualWeight: 0.7 },
          { elementId: "tertiary", name: "Tertiary", value: 40, contribution: 0.2, visualWeight: 0.5 },
        ],
        dominant_color: colors.primary,
        secondary_color: colors.secondary,
        pulse_intensity: 0.4 + Math.random() * 0.3,
      });
    }
  }

  private async createReversibilityAssessment(
    characterId: string,
    eventId: string,
    permanenceLevel: PermanenceLevel,
    tendencies: Map<LatentTendencyName, LatentTendency>
  ): Promise<void> {
    const client = await this.getClient();

    const statusMapping: Record<PermanenceLevel, ReversibilityStatus> = {
      transient: "highly_malleable",
      forming: "still_forming",
      stabilizing: "stabilizing",
      established: "largely_set",
      crystallized: "crystallized",
    };

    const progressMapping: Record<PermanenceLevel, number> = {
      transient: 0.1,
      forming: 0.3,
      stabilizing: 0.6,
      established: 0.85,
      crystallized: 0.98,
    };

    const factors: ReversibilityFactor[] = [];
    const avgInertia = Array.from(tendencies.values()).reduce((sum, t) => sum + t.inertia, 0) / tendencies.size;

    factors.push({
      factorName: "System Inertia",
      influence: avgInertia > 0.9 ? "resists_change" : avgInertia > 0.8 ? "neutral" : "supports_change",
      weight: 0.4,
      explanation: avgInertia > 0.9 
        ? "High system inertia makes this change resistant to reversal" 
        : "Moderate inertia allows for some flexibility",
    });

    factors.push({
      factorName: "Time Factor",
      influence: permanenceLevel === "crystallized" ? "resists_change" : "supports_change",
      weight: 0.3,
      explanation: "Recent changes are more malleable than long-standing patterns",
    });

    await client.from("reversibility_assessments").insert({
      character_id: characterId,
      drift_event_id: eventId,
      assessment_id: `assessment_${Date.now()}`,
      current_status: statusMapping[permanenceLevel],
      stabilization_progress: progressMapping[permanenceLevel],
      estimated_time_to_stabilize: permanenceLevel === "transient" ? "hours to days" 
        : permanenceLevel === "forming" ? "days to weeks"
        : permanenceLevel === "stabilizing" ? "weeks to months"
        : "already stable",
      factors,
      guidance: REVERSIBILITY_DESCRIPTIONS[statusMapping[permanenceLevel]],
    });
  }

  private async createNarrativeExplanation(
    characterId: string,
    eventId: string,
    causalFactors: CausalFactor[],
    direction: DriftDirection,
    driftAnalysis: { primaryDomain: PersonalityDomain; magnitude: DriftMagnitude }
  ): Promise<void> {
    const client = await this.getClient();
    const now = Date.now();

    const domainName = DOMAIN_DISPLAY_NAMES[driftAnalysis.primaryDomain];
    const intensity = MAGNITUDE_TO_INTENSITY[driftAnalysis.magnitude];
    const directionPhrase = DRIFT_DIRECTION_PHRASES[direction]?.[intensity] || "evolving";

    const summary = `The character's ${domainName.toLowerCase()} is ${directionPhrase}.`;

    const causalStories = causalFactors.map(f => f.description).join(". ");

    const detailedNarrative = `Over time, subtle shifts in the character's inner landscape have accumulated into a meaningful change. ${
      causalStories
    } This evolution reflects the natural process of personality development through experience.`;

    const emotionalContext = driftAnalysis.magnitude === "profound" 
      ? "This represents a significant moment in the character's development, marking a notable shift in who they are becoming."
      : driftAnalysis.magnitude === "significant"
      ? "This change carries emotional weight and may influence future interactions."
      : "This is part of the character's ongoing, natural evolution.";

    const futureImplications = `As this ${
      driftAnalysis.magnitude === "subtle" ? "subtle pattern" : "change"
    } continues to develop, it may influence how the character relates to others and responds to new situations.`;

    await client.from("narrative_explanations").insert({
      character_id: characterId,
      drift_event_id: eventId,
      explanation_id: `explanation_${now}`,
      summary,
      detailed_narrative: detailedNarrative,
      causal_story: causalStories,
      emotional_context: emotionalContext,
      future_implications: futureImplications,
      generated_at: now,
    });
  }

  private async updateConstellations(
    characterId: string,
    domainStates: Map<PersonalityDomain, DomainState>
  ): Promise<void> {
    const client = await this.getClient();

    const { data: constellations } = await client
      .from("trait_constellations")
      .select("*")
      .eq("character_id", characterId);

    for (const constellation of constellations || []) {
      const stars = constellation.stars as ConstellationStar[];
      let totalBrightness = 0;

      for (const star of stars) {
        const state = domainStates.get(star.domain);
        if (state) {
          star.brightness = Math.min(1, 0.3 + state.position / 100 * 0.7);
          star.pulseRate = 0.3 + Math.abs(state.velocity) * 0.5;
          totalBrightness += star.brightness;
        }
      }

      await client.from("trait_constellations")
        .update({
          stars,
          luminosity: stars.length > 0 ? totalBrightness / stars.length : 0.5,
          updated_at: new Date().toISOString(),
        })
        .eq("id", constellation.id);
    }
  }

  private async updateClusters(
    characterId: string,
    domainStates: Map<PersonalityDomain, DomainState>
  ): Promise<void> {
    const client = await this.getClient();

    for (const [domain, state] of domainStates) {
      await client.from("domain_clusters")
        .update({
          size: 30 + state.position * 0.4,
          cohesion: state.stability / 100,
          pulse_intensity: 0.2 + Math.abs(state.velocity) * 0.3,
          updated_at: new Date().toISOString(),
        })
        .eq("character_id", characterId)
        .eq("domain", domain);
    }
  }

  private filterEventsByVisibility(
    events: DriftEvent[],
    viewerLevel: VisibilityLevel,
    privacySettings: Record<string, unknown> | null
  ): DriftEvent[] {
    const visibilityHierarchy: Record<VisibilityLevel, number> = {
      public: 0,
      creator_only: 1,
      internal: 2,
      hidden: 3,
    };

    const viewerPriority = visibilityHierarchy[viewerLevel];

    return events.filter(event => {
      const eventVisibility = visibilityHierarchy[event.visibility_level as VisibilityLevel];
      return eventVisibility <= viewerPriority;
    });
  }

  private analyzeTrajectory(events: DriftEvent[], currentSnapshot: PersonalitySnapshot): TrajectoryAnalysis {
    if (events.length === 0) {
      return {
        dominantDirection: "neutral_fluctuation",
        overallMagnitude: "subtle",
        stabilityTrend: "stable",
        predictedPhase: currentSnapshot.evolutionPhase,
        keyInfluences: ["Natural development through time"],
      };
    }

    const directionCounts = new Map<DriftDirection, number>();
    let totalMagnitude = 0;
    const magnitudeValues: Record<DriftMagnitude, number> = { subtle: 1, noticeable: 2, significant: 3, profound: 4 };

    for (const event of events) {
      const dir = event.direction as DriftDirection;
      directionCounts.set(dir, (directionCounts.get(dir) || 0) + 1);
      totalMagnitude += magnitudeValues[event.magnitude as DriftMagnitude];
    }

    let dominantDirection: DriftDirection = "neutral_fluctuation";
    let maxCount = 0;
    for (const [dir, count] of directionCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominantDirection = dir;
      }
    }

    const avgMagnitude = totalMagnitude / events.length;
    const overallMagnitude: DriftMagnitude = avgMagnitude >= 3.5 ? "profound" : avgMagnitude >= 2.5 ? "significant" : avgMagnitude >= 1.5 ? "noticeable" : "subtle";

    const keyInfluences = events
      .slice(0, 3)
      .flatMap(e => (e.causal_factors as CausalFactor[]).map(f => f.description))
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 3);

    return {
      dominantDirection,
      overallMagnitude,
      stabilityTrend: currentSnapshot.overallStability > 70 ? "increasing" : currentSnapshot.overallStability < 50 ? "decreasing" : "stable",
      predictedPhase: currentSnapshot.evolutionPhase,
      keyInfluences: keyInfluences.length > 0 ? keyInfluences : ["Natural development patterns"],
    };
  }

  private parseSnapshot(data: Record<string, unknown>): PersonalitySnapshot {
    const domainStates = new Map<PersonalityDomain, DomainState>();
    const states = data.domain_states as Record<string, DomainState>;

    for (const [domain, state] of Object.entries(states)) {
      domainStates.set(domain as PersonalityDomain, state);
    }

    return {
      snapshotId: data.snapshot_id as string,
      timestamp: Number(data.timestamp),
      domainStates,
      overallStability: Number(data.overall_stability),
      evolutionPhase: data.evolution_phase as EvolutionPhase,
      characterEssence: data.character_essence as string,
    };
  }

  private parseConstellation(data: Record<string, unknown>): TraitConstellation {
    return {
      constellationId: data.constellation_id as string,
      name: data.name as string,
      description: data.description as string,
      stars: data.stars as ConstellationStar[],
      connections: data.connections as ConstellationConnection[],
      centerOfMass: data.center_of_mass as { x: number; y: number },
      luminosity: Number(data.luminosity),
      stability: Number(data.stability),
    };
  }

  private parseInfluenceField(data: Record<string, unknown>): InfluenceField {
    return {
      fieldId: data.field_id as string,
      domain: data.domain as PersonalityDomain,
      fieldType: data.field_type as FieldType,
      center: data.center as { x: number; y: number },
      radius: Number(data.radius),
      intensity: Number(data.intensity),
      gradient: data.gradient as InfluenceField["gradient"],
      flowDirection: Number(data.flow_direction),
      turbulence: Number(data.turbulence),
    };
  }

  private parseCluster(data: Record<string, unknown>): DomainCluster {
    return {
      clusterId: data.cluster_id as string,
      domain: data.domain as PersonalityDomain,
      displayName: data.display_name as string,
      description: data.description as string,
      position: data.position as { x: number; y: number },
      size: Number(data.size),
      cohesion: Number(data.cohesion),
      elements: data.elements as ClusterElement[],
      dominantColor: data.dominant_color as string,
      secondaryColor: data.secondary_color as string,
      pulseIntensity: Number(data.pulse_intensity),
    };
  }

  private calculateGlobalMetrics(
    constellations: TraitConstellation[],
    clusters: DomainCluster[]
  ): GlobalVisualizationMetrics {
    const avgLuminosity = constellations.length > 0
      ? constellations.reduce((sum, c) => sum + c.luminosity, 0) / constellations.length
      : 0.5;

    const avgCohesion = clusters.length > 0
      ? clusters.reduce((sum, c) => sum + c.cohesion, 0) / clusters.length
      : 0.5;

    const avgStability = constellations.length > 0
      ? constellations.reduce((sum, c) => sum + c.stability, 0) / constellations.length
      : 0.5;

    return {
      overallHarmony: (avgLuminosity + avgCohesion) / 2,
      systemEntropy: 1 - avgStability,
      evolutionMomentum: clusters.reduce((sum, c) => sum + c.pulseIntensity, 0) / Math.max(1, clusters.length),
      stabilityIndex: avgStability,
      complexityScore: constellations.length * 0.2 + clusters.length * 0.1,
    };
  }

  private formatTimeframe(ms: number): string {
    const hours = ms / 3600000;
    if (hours < 1) return "just now";
    if (hours < 24) return `${Math.round(hours)} hours ago`;
    const days = hours / 24;
    if (days < 7) return `${Math.round(days)} days ago`;
    const weeks = days / 7;
    if (weeks < 4) return `${Math.round(weeks)} weeks ago`;
    return `${Math.round(days / 30)} months ago`;
  }
}

export const driftVisualizationEngine = new DriftVisualizationEngine();
