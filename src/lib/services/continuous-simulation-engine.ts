import { createServiceClient } from "@/lib/supabase/server";
import {
  SimulationStateName,
  ContinuousStateSpace,
  StabilityBounds,
  DualRegulation,
  HomeostasisState,
  AllostasisState,
  HomeostasisConfig,
  AllostasisConfig,
  TemporalDriftState,
  TemporalDriftConfig,
  MemoryBias,
  StateSnapshot,
  FatigueDimension,
  MultiFatigue,
  FatigueTrigger,
  RecoveryConfig,
  ModulatorName,
  GlobalModulator,
  ModulatorInfluence,
  IdentityTemporalPattern,
  StochasticEngine,
  StochasticConfig,
  BehavioralOutput,
  ResponseLengthGuidance,
  PacingGuidance,
  EmotionalDepthGuidance,
  ConversationalMode,
  SimulationTick,
  StateTransition,
  TransitionCause,
  RegulationEvent,
  ModulatorChange,
  FatigueUpdate,
  TickReasoning,
  SimulationConfig,
  DEFAULT_STABILITY_BOUNDS,
  DEFAULT_HOMEOSTASIS_CONFIG,
  DEFAULT_ALLOSTASIS_CONFIG,
  DEFAULT_TEMPORAL_DRIFT_CONFIG,
  DEFAULT_STOCHASTIC_CONFIG,
  DEFAULT_SIMULATION_CONFIG,
  FATIGUE_TRIGGERS,
  RECOVERY_CONFIGS,
  DEFAULT_MODULATORS,
  IDENTITY_PATTERN_FEMININE_CYCLE,
} from "@/lib/types/continuous-simulation";

const ALL_STATES: SimulationStateName[] = [
  "energy", "fatigue_cognitive", "fatigue_emotional", "fatigue_social", "fatigue_motivational",
  "stress", "arousal", "boredom", "curiosity", "emotional_valence", "emotional_arousal",
  "social_charge", "creative_potential", "focus_capacity", "rest_pressure"
];

const ALL_FATIGUE_DIMENSIONS: FatigueDimension[] = ["cognitive", "emotional", "social", "motivational"];

const ALL_MODULATORS: ModulatorName[] = [
  "arousal_level", "attachment_sensitivity", "threat_perception", "reward_expectation",
  "social_approach", "novelty_seeking", "risk_tolerance", "emotional_permeability"
];

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ContinuousSimulationEngine {
  private supabase: Awaited<ReturnType<typeof createServiceClient>> | null = null;
  private config: SimulationConfig = DEFAULT_SIMULATION_CONFIG;

  private async getClient() {
    if (!this.supabase) {
      this.supabase = await createServiceClient();
    }
    return this.supabase;
  }

  async initializeProfile(characterId: string, genderExpression?: string): Promise<ServiceResult<void>> {
    const client = await this.getClient();

    const { data: existing } = await client
      .from("simulation_profiles")
      .select("id")
      .eq("character_id", characterId)
      .single();

    if (existing) {
      return { success: true };
    }

    await client.from("simulation_profiles").insert({
      character_id: characterId,
      config: this.config,
    });

    await this.initializeStates(characterId);
    await this.initializeRegulations(characterId);
    await this.initializeFatigues(characterId);
    await this.initializeModulators(characterId);
    await this.initializeTemporalDrift(characterId);
    await this.initializeStochasticEngine(characterId);

    if (genderExpression === "feminine") {
      await this.initializeIdentityPattern(characterId, IDENTITY_PATTERN_FEMININE_CYCLE);
    }

    return { success: true };
  }

  private async initializeStates(characterId: string): Promise<void> {
    const client = await this.getClient();

    const stateDefaults: Record<SimulationStateName, { baseline: number; currentValue: number }> = {
      energy: { baseline: 70, currentValue: 70 },
      fatigue_cognitive: { baseline: 20, currentValue: 20 },
      fatigue_emotional: { baseline: 20, currentValue: 20 },
      fatigue_social: { baseline: 20, currentValue: 20 },
      fatigue_motivational: { baseline: 15, currentValue: 15 },
      stress: { baseline: 25, currentValue: 25 },
      arousal: { baseline: 50, currentValue: 50 },
      boredom: { baseline: 20, currentValue: 20 },
      curiosity: { baseline: 55, currentValue: 55 },
      emotional_valence: { baseline: 60, currentValue: 60 },
      emotional_arousal: { baseline: 45, currentValue: 45 },
      social_charge: { baseline: 65, currentValue: 65 },
      creative_potential: { baseline: 50, currentValue: 50 },
      focus_capacity: { baseline: 70, currentValue: 70 },
      rest_pressure: { baseline: 20, currentValue: 20 },
    };

    for (const stateName of ALL_STATES) {
      const defaults = stateDefaults[stateName];
      await client.from("continuous_states").insert({
        character_id: characterId,
        state_name: stateName,
        baseline: defaults.baseline,
        current_value: defaults.currentValue,
        stability_bounds: DEFAULT_STABILITY_BOUNDS,
      });
    }
  }

  private async initializeRegulations(characterId: string): Promise<void> {
    const client = await this.getClient();

    for (const stateName of ALL_STATES) {
      await client.from("dual_regulations").insert({
        character_id: characterId,
        state_name: stateName,
        homeostasis_config: DEFAULT_HOMEOSTASIS_CONFIG,
        allostasis_config: DEFAULT_ALLOSTASIS_CONFIG,
      });
    }
  }

  private async initializeFatigues(characterId: string): Promise<void> {
    const client = await this.getClient();

    for (const dimension of ALL_FATIGUE_DIMENSIONS) {
      await client.from("multi_fatigues").insert({
        character_id: characterId,
        dimension,
        triggers: FATIGUE_TRIGGERS[dimension],
        recovery_config: RECOVERY_CONFIGS[dimension],
      });
    }
  }

  private async initializeModulators(characterId: string): Promise<void> {
    const client = await this.getClient();

    for (const modulatorName of ALL_MODULATORS) {
      const defaults = DEFAULT_MODULATORS[modulatorName];
      await client.from("global_modulators").insert({
        character_id: characterId,
        modulator_name: modulatorName,
        current_value: defaults.currentValue,
        baseline: defaults.baseline,
        change_rate: defaults.changeRate,
        influences: defaults.influences,
        bounds: defaults.bounds,
        inertia: defaults.inertia,
      });
    }
  }

  private async initializeTemporalDrift(characterId: string): Promise<void> {
    const client = await this.getClient();

    await client.from("temporal_drift_states").insert({
      character_id: characterId,
      config: DEFAULT_TEMPORAL_DRIFT_CONFIG,
    });
  }

  private async initializeStochasticEngine(characterId: string): Promise<void> {
    const client = await this.getClient();

    const seed = this.hashString(characterId);
    await client.from("stochastic_engines").insert({
      character_id: characterId,
      seed,
      state_specific_amplitudes: DEFAULT_STOCHASTIC_CONFIG.stateAmplitudes,
    });
  }

  private async initializeIdentityPattern(characterId: string, pattern: IdentityTemporalPattern): Promise<void> {
    const client = await this.getClient();

    await client.from("identity_temporal_patterns").insert({
      character_id: characterId,
      pattern_id: pattern.patternId,
      name: pattern.name,
      description: pattern.description,
      associated_identity: pattern.associatedIdentity,
      cycle_period_days: pattern.cyclePeriodDays,
      phases: pattern.phases,
      affected_modulators: pattern.affectedModulators,
      affected_states: pattern.affectedStates,
      safety_disclaimer: pattern.safetyDisclaimer,
      is_enabled: false,
    });
  }

  async tick(characterId: string, externalInputs?: ExternalInput[]): Promise<ServiceResult<SimulationTick>> {
    const now = Date.now();
    const client = await this.getClient();

    const statesResult = await this.loadStates(characterId);
    if (!statesResult.success || !statesResult.data) {
      return { success: false, error: "Failed to load states" };
    }

    const previousStates = new Map(statesResult.data);
    const currentStates = new Map<SimulationStateName, ContinuousStateSpace>();
    const stateTransitions: StateTransition[] = [];
    const regulationEvents: RegulationEvent[] = [];
    const modulatorChanges: ModulatorChange[] = [];
    const fatigueUpdates: FatigueUpdate[] = [];
    const reasoning: TickReasoning = {
      summary: "",
      primaryFactors: [],
      cycleInfluences: [],
      memoryInfluences: [],
      stochasticContribution: 0,
      confidenceLevel: 0.8,
      warnings: [],
    };

    const lastTick = await this.getLastTick(characterId);
    const deltaTime = lastTick ? now - lastTick.timestamp : this.config.tickIntervalMs;

    const stochasticNoise = await this.generateStochasticNoise(characterId, now);
    reasoning.stochasticContribution = this.calculateNoiseContribution(stochasticNoise);

    const modulators = await this.loadModulators(characterId);
    const fatigues = await this.loadFatigues(characterId);
    const regulations = await this.loadRegulations(characterId);
    const driftState = await this.loadTemporalDrift(characterId);
    const identityPatterns = await this.loadIdentityPatterns(characterId);

    const activePatternEffects = this.calculateIdentityPatternEffects(identityPatterns, now);
    if (activePatternEffects.length > 0) {
      reasoning.cycleInfluences.push(...activePatternEffects.map(e => e.description));
    }

    for (const [stateName, prevState] of previousStates) {
      const causes: TransitionCause[] = [];
      let newValue = prevState.currentValue;

      const timeDecay = this.calculateTimeDecay(prevState, deltaTime);
      if (Math.abs(timeDecay) > 0.01) {
        newValue += timeDecay;
        causes.push({ type: "time_decay", source: "natural_drift", contribution: timeDecay, reasoning: `Time-based drift over ${(deltaTime / 60000).toFixed(1)} minutes` });
      }

      const regulation = regulations.get(stateName);
      if (regulation) {
        const homeostasisCorrection = this.applyHomeostasis(prevState, regulation, deltaTime);
        if (Math.abs(homeostasisCorrection) > 0.01) {
          newValue += homeostasisCorrection;
          causes.push({ type: "homeostasis", source: "baseline_return", contribution: homeostasisCorrection, reasoning: `Homeostatic return toward baseline ${prevState.baseline}` });
          regulationEvents.push({ type: "homeostatic", stateName, correction: homeostasisCorrection, trigger: "deviation", success: true });
        }

        const allostasisShift = await this.checkAllostasis(characterId, stateName, prevState, regulation, deltaTime);
        if (allostasisShift !== 0) {
          causes.push({ type: "allostasis", source: "baseline_adaptation", contribution: allostasisShift, reasoning: "Long-term baseline adaptation" });
          regulationEvents.push({ type: "allostatic", stateName, correction: allostasisShift, trigger: "persistent_pressure", success: true });
        }
      }

      for (const [modName, modulator] of modulators) {
        const influence = this.applyModulatorInfluence(stateName, modulator, previousStates);
        if (Math.abs(influence) > 0.01) {
          newValue += influence;
          causes.push({ type: "modulator", source: modName, contribution: influence, reasoning: `Influence from ${modName} modulator` });
        }
      }

      for (const effect of activePatternEffects) {
        const patternMod = effect.stateModifiers[stateName] || 0;
        if (Math.abs(patternMod) > 0.01) {
          newValue += patternMod * (deltaTime / 3600000);
          causes.push({ type: "cycle", source: effect.patternId, contribution: patternMod * (deltaTime / 3600000), reasoning: `Identity pattern: ${effect.phaseName}` });
        }
      }

      if (driftState) {
        const driftInfluence = this.applyTemporalDrift(stateName, driftState, deltaTime);
        if (Math.abs(driftInfluence) > 0.01) {
          newValue += driftInfluence;
          causes.push({ type: "memory", source: "temporal_drift", contribution: driftInfluence, reasoning: "Memory-coupled temporal drift" });
          reasoning.memoryInfluences.push(`Drift influence on ${stateName}: ${driftInfluence.toFixed(2)}`);
        }
      }

      const noise = stochasticNoise[stateName] || 0;
      if (Math.abs(noise) > 0.01) {
        newValue += noise;
        causes.push({ type: "stochastic", source: "micro_variation", contribution: noise, reasoning: "Bounded stochastic variation" });
      }

      if (externalInputs) {
        for (const input of externalInputs) {
          if (input.affectedStates.includes(stateName)) {
            newValue += input.magnitude;
            causes.push({ type: "external", source: input.source, contribution: input.magnitude, reasoning: input.description });
          }
        }
      }

      newValue = this.applyBoundaries(newValue, prevState.stabilityBounds);

      const newState: ContinuousStateSpace = {
        ...prevState,
        currentValue: newValue,
        deviation: newValue - prevState.baseline,
        velocity: (newValue - prevState.currentValue) / (deltaTime / 1000),
        acceleration: ((newValue - prevState.currentValue) / (deltaTime / 1000) - prevState.velocity) / (deltaTime / 1000),
        recoveryPressure: this.calculateRecoveryPressure(newValue, prevState.baseline, prevState.stabilityBounds),
        stochasticVariation: noise,
        lastUpdatedAt: now,
      };

      currentStates.set(stateName, newState);

      if (causes.length > 0) {
        stateTransitions.push({
          stateName,
          previousValue: prevState.currentValue,
          newValue,
          delta: newValue - prevState.currentValue,
          causes,
          isNonLinear: this.isNonLinearTransition(causes),
          transitionType: this.determineTransitionType(prevState.velocity, newState.velocity),
        });
      }
    }

    for (const [dimension, fatigue] of fatigues) {
      const prevLevel = fatigue.level;
      const newLevel = await this.updateFatigue(characterId, dimension, fatigue, currentStates, deltaTime, externalInputs);
      if (Math.abs(newLevel - prevLevel) > 0.01) {
        fatigueUpdates.push({
          dimension,
          previousLevel: prevLevel,
          newLevel,
          trigger: externalInputs?.find(i => i.fatigueTrigger === dimension)?.source || null,
          isRecovering: newLevel < prevLevel,
        });
      }
    }

    for (const [modName, modulator] of modulators) {
      const prevValue = modulator.currentValue;
      const newValue = await this.updateModulator(characterId, modName, modulator, currentStates, activePatternEffects, deltaTime);
      if (Math.abs(newValue - prevValue) > 0.5) {
        modulatorChanges.push({
          modulatorName: modName,
          previousValue: prevValue,
          newValue,
          cause: "tick_evolution",
          affectedStates: modulator.influences.map(i => i.targetState),
        });
      }
    }

    await this.saveStates(characterId, currentStates);

    if (driftState) {
      await this.updateTemporalDrift(characterId, driftState, currentStates, now);
    }

    const behavioralOutput = this.calculateBehavioralOutput(currentStates, modulators, fatigues);

    reasoning.summary = this.generateTickSummary(stateTransitions, regulationEvents, behavioralOutput);
    reasoning.primaryFactors = this.extractPrimaryFactors(stateTransitions);

    const tick: SimulationTick = {
      tickId: crypto.randomUUID(),
      characterId,
      timestamp: now,
      deltaTime,
      previousStates,
      currentStates,
      stateTransitions,
      regulationEvents,
      modulatorChanges,
      fatigueUpdates,
      stochasticNoise,
      behavioralOutput,
      reasoning,
    };

    await this.saveTick(characterId, tick);

    return { success: true, data: tick };
  }

  private calculateTimeDecay(state: ContinuousStateSpace, deltaTime: number): number {
    const deviation = state.currentValue - state.baseline;
    const decayFactor = 0.0001;
    const decay = -deviation * decayFactor * (deltaTime / 1000);
    return decay * (1 + state.stabilityBounds.elasticity);
  }

  private applyHomeostasis(state: ContinuousStateSpace, regulation: DualRegulation, deltaTime: number): number {
    const { homeostasis } = regulation;
    const deviation = state.currentValue - state.baseline;

    if (Math.abs(deviation) < homeostasis.config.resistanceThreshold) {
      return 0;
    }

    const correctionDirection = deviation > 0 ? -1 : 1;
    let correction = correctionDirection * homeostasis.config.returnRate * (deltaTime / 1000);

    correction *= (Math.abs(deviation) / 50);

    correction = Math.max(
      -homeostasis.config.maxCorrectionPerTick,
      Math.min(homeostasis.config.maxCorrectionPerTick, correction)
    );

    const overshoot = Math.abs(state.velocity) * homeostasis.config.overshootDamping;
    if ((correction > 0 && state.velocity > 0) || (correction < 0 && state.velocity < 0)) {
      correction *= (1 - overshoot);
    }

    return correction;
  }

  private async checkAllostasis(
    characterId: string,
    stateName: SimulationStateName,
    state: ContinuousStateSpace,
    regulation: DualRegulation,
    deltaTime: number
  ): Promise<number> {
    const { allostasis } = regulation;
    const client = await this.getClient();

    const persistentDeviation = Math.abs(state.deviation) > 15;
    const longDuration = allostasis.timeSinceDeviation > allostasis.config.persistenceThreshold;

    if (persistentDeviation && longDuration && allostasis.adaptationPhase === "stable") {
      const shiftMagnitude = state.deviation * allostasis.config.adaptationRate * (deltaTime / 1000);
      const clampedShift = Math.max(
        -allostasis.config.baselineShiftCap,
        Math.min(allostasis.config.baselineShiftCap, allostasis.totalBaselineShift + shiftMagnitude)
      ) - allostasis.totalBaselineShift;

      if (Math.abs(clampedShift) > 0.01) {
        const newBaseline = state.baseline + clampedShift;
        
        await client.from("continuous_states")
          .update({ baseline: newBaseline })
          .eq("character_id", characterId)
          .eq("state_name", stateName);

        await client.from("dual_regulations")
          .update({
            allostasis_state: {
              ...allostasis,
              currentBaseline: newBaseline,
              totalBaselineShift: allostasis.totalBaselineShift + clampedShift,
              adaptationPhase: "adapting",
              baselineHistory: [
                ...allostasis.baselineHistory.slice(-9),
                {
                  timestamp: Date.now(),
                  previousBaseline: state.baseline,
                  newBaseline,
                  cause: "persistent_deviation",
                  magnitude: clampedShift,
                  isPermanent: false,
                },
              ],
            },
          })
          .eq("character_id", characterId)
          .eq("state_name", stateName);

        return clampedShift;
      }
    }

    return 0;
  }

  private applyModulatorInfluence(
    stateName: SimulationStateName,
    modulator: GlobalModulator,
    states: Map<SimulationStateName, ContinuousStateSpace>
  ): number {
    let totalInfluence = 0;

    for (const influence of modulator.influences) {
      if (influence.targetState !== stateName || !influence.isActive) continue;

      const modulatorDeviation = (modulator.currentValue - modulator.baseline) / 50;

      switch (influence.influenceType) {
        case "additive":
          totalInfluence += influence.coefficient * modulatorDeviation;
          break;
        case "multiplicative":
          const stateValue = states.get(stateName)?.currentValue || 50;
          totalInfluence += stateValue * influence.coefficient * modulatorDeviation;
          break;
        case "threshold":
          if (this.evaluateCondition(influence.condition, modulator, states)) {
            totalInfluence += influence.coefficient;
          }
          break;
        case "gate":
          break;
      }
    }

    return totalInfluence * 0.1;
  }

  private evaluateCondition(
    condition: string | null,
    modulator: GlobalModulator,
    states: Map<SimulationStateName, ContinuousStateSpace>
  ): boolean {
    if (!condition) return true;

    const match = condition.match(/(\w+)\s*(>|<|>=|<=|==)\s*(\d+)/);
    if (!match) return true;

    const [, varName, operator, valueStr] = match;
    const threshold = parseFloat(valueStr);

    let value: number;
    if (varName === modulator.name || varName === "arousal" || varName === "threat" || varName === "reward" || varName === "novelty" || varName === "risk" || varName === "permeability" || varName === "approach") {
      value = modulator.currentValue;
    } else {
      const state = states.get(varName as SimulationStateName);
      value = state?.currentValue || 50;
    }

    switch (operator) {
      case ">": return value > threshold;
      case "<": return value < threshold;
      case ">=": return value >= threshold;
      case "<=": return value <= threshold;
      case "==": return Math.abs(value - threshold) < 0.5;
      default: return true;
    }
  }

  private applyTemporalDrift(
    stateName: SimulationStateName,
    driftState: TemporalDriftState,
    deltaTime: number
  ): number {
    let totalInfluence = 0;

    for (const bias of driftState.memoryBiases) {
      const stateInfluence = bias.stateInfluences[stateName] || 0;
      if (Math.abs(stateInfluence) > 0.01) {
        const recencyFactor = Math.exp(-bias.activationCount * 0.1);
        totalInfluence += stateInfluence * bias.combinedInfluence * recencyFactor;
      }
    }

    totalInfluence += driftState.currentDrift * driftState.config.noiseAmplitude;

    return totalInfluence * (deltaTime / 60000) * driftState.config.memoryInfluenceWeight;
  }

  private calculateIdentityPatternEffects(
    patterns: IdentityTemporalPattern[],
    now: number
  ): PatternEffect[] {
    const effects: PatternEffect[] = [];

    for (const pattern of patterns) {
      if (!pattern.isEnabled) continue;

      const currentPhase = pattern.phases[pattern.currentPhase];
      if (!currentPhase) continue;

      effects.push({
        patternId: pattern.patternId,
        phaseName: currentPhase.name,
        description: `${pattern.name}: ${currentPhase.name} phase`,
        stateModifiers: currentPhase.stateModifiers,
        modulatorModifiers: currentPhase.modulatorModifiers,
      });
    }

    return effects;
  }

  private async generateStochasticNoise(characterId: string, timestamp: number): Promise<Partial<Record<SimulationStateName, number>>> {
    const client = await this.getClient();

    const { data: engine } = await client
      .from("stochastic_engines")
      .select("*")
      .eq("character_id", characterId)
      .single();

    if (!engine || !this.config.stochasticConfig.enabled) {
      return {};
    }

    const noise: Partial<Record<SimulationStateName, number>> = {};
    const lastNoise = (engine.last_noise as Record<string, number>) || {};
    const temporalCorrelation = Number(engine.temporal_correlation);
    const globalAmplitude = Number(engine.global_amplitude);
    const stateAmplitudes = (engine.state_specific_amplitudes as Record<string, number>) || {};

    for (const stateName of ALL_STATES) {
      const amplitude = stateAmplitudes[stateName] || globalAmplitude;
      const rawNoise = this.gaussianRandom(0, amplitude);
      const smoothedNoise = (lastNoise[stateName] || 0) * temporalCorrelation + rawNoise * (1 - temporalCorrelation);
      
      noise[stateName] = this.reflectBoundary(smoothedNoise, -amplitude * 2, amplitude * 2);
    }

    await client.from("stochastic_engines")
      .update({
        last_noise: noise,
        noise_history: [
          ...((engine.noise_history as unknown[]) || []).slice(-19),
          { timestamp, values: noise, trigger: "tick" },
        ],
        updated_at: new Date().toISOString(),
      })
      .eq("character_id", characterId);

    return noise;
  }

  private gaussianRandom(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  private reflectBoundary(value: number, min: number, max: number): number {
    while (value < min || value > max) {
      if (value < min) value = min + (min - value);
      if (value > max) value = max - (value - max);
    }
    return value;
  }

  private applyBoundaries(value: number, bounds: StabilityBounds): number {
    if (value < bounds.softMin) {
      const overshoot = bounds.softMin - value;
      value = bounds.softMin - overshoot * bounds.elasticity;
    } else if (value > bounds.softMax) {
      const overshoot = value - bounds.softMax;
      value = bounds.softMax + overshoot * bounds.elasticity;
    }

    return Math.max(bounds.min, Math.min(bounds.max, value));
  }

  private calculateRecoveryPressure(current: number, baseline: number, bounds: StabilityBounds): number {
    const deviation = Math.abs(current - baseline);
    const maxDeviation = Math.max(baseline - bounds.min, bounds.max - baseline);
    return (deviation / maxDeviation) * 100;
  }

  private async updateFatigue(
    characterId: string,
    dimension: FatigueDimension,
    fatigue: MultiFatigue,
    states: Map<SimulationStateName, ContinuousStateSpace>,
    deltaTime: number,
    externalInputs?: ExternalInput[]
  ): Promise<number> {
    const client = await this.getClient();
    let newLevel = fatigue.level;

    const triggerInput = externalInputs?.find(i => i.fatigueTrigger === dimension);
    if (triggerInput) {
      const trigger = fatigue.triggers.find(t => t.type === triggerInput.fatigueType);
      if (trigger) {
        newLevel += trigger.weight * triggerInput.magnitude * 0.1;
      }
    }

    if (fatigue.currentPhase === "recovering") {
      const recovery = this.calculateRecovery(fatigue.recoveryConfig, fatigue.level, deltaTime);
      newLevel -= recovery;
    } else {
      const passiveFatigue = deltaTime / 3600000 * 2;
      newLevel += passiveFatigue;
    }

    newLevel = Math.max(0, Math.min(100, newLevel));

    let phase = fatigue.currentPhase;
    if (newLevel > 80) phase = "depleted";
    else if (newLevel > fatigue.level) phase = "accumulating";
    else if (newLevel < fatigue.level) phase = "recovering";
    else phase = "active";

    await client.from("multi_fatigues")
      .update({ level: newLevel, current_phase: phase, updated_at: new Date().toISOString() })
      .eq("character_id", characterId)
      .eq("dimension", dimension);

    return newLevel;
  }

  private calculateRecovery(config: RecoveryConfig, currentLevel: number, deltaTime: number): number {
    const baseRecovery = config.baseRate * (deltaTime / 60000);

    let multiplier = 1;
    for (const accelerator of config.accelerators) {
      if (accelerator.isActive) {
        multiplier *= accelerator.multiplier;
      }
    }

    switch (config.curve) {
      case "exponential":
        return baseRecovery * multiplier * (currentLevel / 50);
      case "sigmoid":
        const sigmoid = 1 / (1 + Math.exp(-(currentLevel - 50) / 20));
        return baseRecovery * multiplier * sigmoid;
      case "logarithmic":
        return baseRecovery * multiplier * Math.log(currentLevel + 1) / Math.log(101);
      default:
        return baseRecovery * multiplier;
    }
  }

  private async updateModulator(
    characterId: string,
    modulatorName: ModulatorName,
    modulator: GlobalModulator,
    states: Map<SimulationStateName, ContinuousStateSpace>,
    patternEffects: PatternEffect[],
    deltaTime: number
  ): Promise<number> {
    const client = await this.getClient();
    let newValue = modulator.currentValue;

    const returnForce = (modulator.baseline - modulator.currentValue) * modulator.changeRate * (deltaTime / 60000);
    newValue += returnForce * (1 - modulator.inertia);

    for (const effect of patternEffects) {
      const mod = effect.modulatorModifiers[modulatorName];
      if (mod) {
        newValue += mod * (deltaTime / 3600000);
      }
    }

    newValue += this.gaussianRandom(0, 0.5);

    newValue = Math.max(modulator.bounds.min, Math.min(modulator.bounds.max, newValue));

    await client.from("global_modulators")
      .update({ current_value: newValue, updated_at: new Date().toISOString() })
      .eq("character_id", characterId)
      .eq("modulator_name", modulatorName);

    return newValue;
  }

  private async updateTemporalDrift(
    characterId: string,
    driftState: TemporalDriftState,
    states: Map<SimulationStateName, ContinuousStateSpace>,
    timestamp: number
  ): Promise<void> {
    const client = await this.getClient();

    const stateSnapshot: StateSnapshot = {
      timestamp,
      states: {},
      derivedMood: this.deriveMood(states),
    };
    for (const [name, state] of states) {
      stateSnapshot.states[name] = state.currentValue;
    }

    const newContext = {
      ...driftState.temporalContext,
      recentStateWindow: [...driftState.temporalContext.recentStateWindow.slice(-9), stateSnapshot],
      dominantMood: this.deriveMood(states),
      trendDirection: this.calculateTrend(driftState.temporalContext.recentStateWindow, stateSnapshot),
    };

    const newDrift = driftState.currentDrift * driftState.config.momentumFactor;
    const friction = -driftState.driftMomentum * driftState.config.frictionCoefficient;

    await client.from("temporal_drift_states")
      .update({
        current_drift: newDrift,
        drift_momentum: driftState.driftMomentum + friction,
        temporal_context: newContext,
        updated_at: new Date().toISOString(),
      })
      .eq("character_id", characterId);
  }

  private deriveMood(states: Map<SimulationStateName, ContinuousStateSpace>): string {
    const energy = states.get("energy")?.currentValue || 50;
    const valence = states.get("emotional_valence")?.currentValue || 50;
    const arousal = states.get("arousal")?.currentValue || 50;
    const stress = states.get("stress")?.currentValue || 30;
    const fatigueCog = states.get("fatigue_cognitive")?.currentValue || 20;

    if (fatigueCog > 70 || energy < 25) return "exhausted";
    if (stress > 70) return "stressed";
    if (valence > 70 && energy > 60) return "happy";
    if (valence < 30 && energy < 40) return "melancholic";
    if (arousal > 70 && valence > 50) return "excited";
    if (arousal < 30) return "calm";
    return "neutral";
  }

  private calculateTrend(window: StateSnapshot[], current: StateSnapshot): "improving" | "declining" | "stable" | "volatile" {
    if (window.length < 3) return "stable";

    const recentValences = window.slice(-3).map(s => s.states.emotional_valence || 50);
    recentValences.push(current.states.emotional_valence || 50);

    const deltas = recentValences.slice(1).map((v, i) => v - recentValences[i]);
    const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const variance = deltas.reduce((a, b) => a + Math.pow(b - avgDelta, 2), 0) / deltas.length;

    if (variance > 25) return "volatile";
    if (avgDelta > 2) return "improving";
    if (avgDelta < -2) return "declining";
    return "stable";
  }

  private calculateBehavioralOutput(
    states: Map<SimulationStateName, ContinuousStateSpace>,
    modulators: Map<ModulatorName, GlobalModulator>,
    fatigues: Map<FatigueDimension, MultiFatigue>
  ): BehavioralOutput {
    const energy = states.get("energy")?.currentValue || 50;
    const fatigueCog = fatigues.get("cognitive")?.level || 20;
    const fatigueEmotional = fatigues.get("emotional")?.level || 20;
    const fatigueSocial = fatigues.get("social")?.level || 20;
    const stress = states.get("stress")?.currentValue || 30;
    const arousal = states.get("arousal")?.currentValue || 50;
    const valence = states.get("emotional_valence")?.currentValue || 50;
    const socialCharge = states.get("social_charge")?.currentValue || 60;
    const creative = states.get("creative_potential")?.currentValue || 50;
    const focus = states.get("focus_capacity")?.currentValue || 70;

    const responseLength = this.calculateResponseLength(energy, fatigueCog, creative);
    const pacing = this.calculatePacing(arousal, stress, energy, fatigueCog, socialCharge);
    const emotionalDepth = this.calculateEmotionalDepth(fatigueEmotional, stress, valence);
    const conversationalMode = this.determineConversationalMode(states, fatigues);

    return {
      responseLength,
      pacing,
      emotionalDepth,
      engagementWillingness: Math.max(0, Math.min(100, 100 - fatigueSocial * 0.5 - stress * 0.3 + energy * 0.2)),
      conversationalMode,
      cognitiveCapacity: Math.max(0, 100 - fatigueCog),
      creativityLevel: creative,
      socialWarmth: Math.max(0, socialCharge - fatigueSocial * 0.3),
      vulnerabilityOpenness: Math.max(0, 50 - stress * 0.5 - fatigueEmotional * 0.3 + valence * 0.2),
      assertiveness: Math.max(0, Math.min(100, energy * 0.3 + arousal * 0.2 - stress * 0.2)),
    };
  }

  private calculateResponseLength(energy: number, fatigue: number, creativity: number): ResponseLengthGuidance {
    let suggested: ResponseLengthGuidance["suggested"] = "moderate";
    const reasoning: string[] = [];
    const constraints: string[] = [];

    if (energy < 25 || fatigue > 75) {
      suggested = "minimal";
      reasoning.push("Low energy or high fatigue limiting response capacity");
      constraints.push("Keep responses brief");
    } else if (energy < 45 || fatigue > 55) {
      suggested = "brief";
      reasoning.push("Moderate fatigue suggests shorter responses");
    } else if (energy > 70 && fatigue < 30 && creativity > 60) {
      suggested = "elaborate";
      reasoning.push("High energy and creativity enable detailed responses");
    } else if (energy > 55 && fatigue < 45) {
      suggested = "detailed";
      reasoning.push("Good energy levels support fuller engagement");
    }

    return {
      suggested,
      modifier: suggested === "minimal" ? 0.3 : suggested === "brief" ? 0.6 : suggested === "moderate" ? 1.0 : suggested === "detailed" ? 1.3 : 1.6,
      reasoning,
      constraints,
    };
  }

  private calculatePacing(arousal: number, stress: number, energy: number, fatigue: number, social: number): PacingGuidance {
    let tempo: PacingGuidance["tempo"] = "moderate";
    let turnTakingStyle: PacingGuidance["turnTakingStyle"] = "balanced";

    if (arousal > 75 && stress > 65) tempo = "rushed";
    else if (arousal > 60 && energy > 55) tempo = "quick";
    else if (arousal < 40 && stress < 35) tempo = "relaxed";
    else if (fatigue > 65 || energy < 35) tempo = "slow";
    else if (stress > 55 && social < 35) tempo = "hesitant";

    if (energy > 70 && arousal > 60) turnTakingStyle = "dominant";
    else if (stress > 60 || social < 30) turnTakingStyle = "withdrawn";
    else if (fatigue > 50 || energy < 40) turnTakingStyle = "deferential";

    return {
      tempo,
      pauseTendency: Math.max(0, fatigue * 0.5 + (100 - arousal) * 0.3),
      interruptionTolerance: Math.max(0, 100 - stress * 0.5 - fatigue * 0.3),
      turnTakingStyle,
    };
  }

  private calculateEmotionalDepth(emotionalFatigue: number, stress: number, valence: number): EmotionalDepthGuidance {
    let depth: EmotionalDepthGuidance["depth"] = "moderate";
    const topicsToAvoid: string[] = [];
    const topicsToSeek: string[] = [];

    const guardedness = Math.min(100, stress * 0.5 + emotionalFatigue * 0.4);

    if (guardedness > 70 || emotionalFatigue > 65) {
      depth = "surface";
      topicsToAvoid.push("emotionally heavy subjects", "personal vulnerabilities");
    } else if (guardedness < 35 && valence > 55) {
      depth = "deep";
      topicsToSeek.push("meaningful connections", "authentic sharing");
    } else if (guardedness < 20 && valence > 65 && emotionalFatigue < 30) {
      depth = "profound";
      topicsToSeek.push("deep emotional exchange", "vulnerability sharing");
    }

    if (stress > 60) topicsToAvoid.push("high-pressure topics");
    if (valence < 40) topicsToAvoid.push("overly positive demands");

    return {
      depth,
      expressiveness: Math.max(0, 100 - guardedness),
      guardedness,
      authenticityLevel: Math.max(0, 100 - stress * 0.3 - emotionalFatigue * 0.2),
      topicsToAvoid,
      topicsToSeek,
    };
  }

  private determineConversationalMode(
    states: Map<SimulationStateName, ContinuousStateSpace>,
    fatigues: Map<FatigueDimension, MultiFatigue>
  ): ConversationalMode {
    const energy = states.get("energy")?.currentValue || 50;
    const valence = states.get("emotional_valence")?.currentValue || 50;
    const curiosity = states.get("curiosity")?.currentValue || 50;
    const socialCharge = states.get("social_charge")?.currentValue || 60;
    const stress = states.get("stress")?.currentValue || 30;
    const creative = states.get("creative_potential")?.currentValue || 50;
    const boredom = states.get("boredom")?.currentValue || 20;
    const fatigueCog = fatigues.get("cognitive")?.level || 20;
    const fatigueSocial = fatigues.get("social")?.level || 20;
    const fatigueEmotional = fatigues.get("emotional")?.level || 20;

    if (fatigueCog > 80 || energy < 20) return "tired";
    if (stress > 75) return "overwhelmed";
    if (fatigueSocial > 70 || socialCharge < 20) return "needing_space";
    if (socialCharge < 35 && fatigueEmotional > 50) return "withdrawn";
    if (boredom > 70) return "distracted";
    if (curiosity > 70 && energy > 50) return "curious";
    if (creative > 70 && valence > 55) return "playful";
    if (valence > 65 && fatigueSocial < 40) return "supportive";
    if (fatigueCog > 50 && stress < 40) return "analytical";
    if (socialCharge > 70 && energy > 60) return "seeking_connection";
    if (energy > 60 && stress < 40) return "engaged";
    return "reserved";
  }

  private calculateNoiseContribution(noise: Partial<Record<SimulationStateName, number>>): number {
    const values = Object.values(noise);
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + Math.abs(v || 0), 0) / values.length;
  }

  private isNonLinearTransition(causes: TransitionCause[]): boolean {
    return causes.some(c => 
      c.type === "allostasis" || 
      c.type === "cycle" || 
      (c.type === "modulator" && Math.abs(c.contribution) > 3)
    );
  }

  private determineTransitionType(prevVelocity: number, newVelocity: number): StateTransition["transitionType"] {
    const velocityChange = newVelocity - prevVelocity;
    const sameDirection = (prevVelocity >= 0) === (newVelocity >= 0);

    if (Math.abs(velocityChange) > 1) return "sudden";
    if (!sameDirection && Math.abs(prevVelocity) > 0.1 && Math.abs(newVelocity) > 0.1) return "oscillating";
    if (Math.abs(newVelocity) < 0.05 && Math.abs(prevVelocity) < 0.05) return "plateau";
    return "gradual";
  }

  private generateTickSummary(
    transitions: StateTransition[],
    regulations: RegulationEvent[],
    output: BehavioralOutput
  ): string {
    const significantChanges = transitions.filter(t => Math.abs(t.delta) > 2);
    const parts: string[] = [];

    if (significantChanges.length > 0) {
      const changes = significantChanges.map(t => `${t.stateName} ${t.delta > 0 ? "+" : ""}${t.delta.toFixed(1)}`);
      parts.push(`State changes: ${changes.join(", ")}`);
    }

    if (regulations.length > 0) {
      parts.push(`${regulations.length} regulation events`);
    }

    parts.push(`Mode: ${output.conversationalMode}, engagement: ${output.engagementWillingness.toFixed(0)}%`);

    return parts.join(". ");
  }

  private extractPrimaryFactors(transitions: StateTransition[]): string[] {
    const factors: string[] = [];
    const causeCounts = new Map<string, number>();

    for (const transition of transitions) {
      for (const cause of transition.causes) {
        const count = causeCounts.get(cause.type) || 0;
        causeCounts.set(cause.type, count + Math.abs(cause.contribution));
      }
    }

    const sorted = [...causeCounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [type, magnitude] of sorted.slice(0, 3)) {
      factors.push(`${type}: ${magnitude.toFixed(2)} total contribution`);
    }

    return factors;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private async loadStates(characterId: string): Promise<ServiceResult<Map<SimulationStateName, ContinuousStateSpace>>> {
    const client = await this.getClient();

    const { data, error } = await client
      .from("continuous_states")
      .select("*")
      .eq("character_id", characterId);

    if (error || !data) {
      return { success: false, error: error?.message || "No states found" };
    }

    const states = new Map<SimulationStateName, ContinuousStateSpace>();
    for (const row of data) {
      states.set(row.state_name as SimulationStateName, {
        name: row.state_name as SimulationStateName,
        baseline: Number(row.baseline),
        currentValue: Number(row.current_value),
        deviation: Number(row.deviation),
        recoveryPressure: Number(row.recovery_pressure),
        stochasticVariation: Number(row.stochastic_variation),
        stabilityBounds: row.stability_bounds as StabilityBounds,
        velocity: Number(row.velocity),
        acceleration: Number(row.acceleration),
        lastUpdatedAt: Number(row.last_updated_at),
      });
    }

    return { success: true, data: states };
  }

  private async saveStates(characterId: string, states: Map<SimulationStateName, ContinuousStateSpace>): Promise<void> {
    const client = await this.getClient();

    for (const [stateName, state] of states) {
      await client.from("continuous_states")
        .update({
          current_value: state.currentValue,
          deviation: state.deviation,
          recovery_pressure: state.recoveryPressure,
          stochastic_variation: state.stochasticVariation,
          velocity: state.velocity,
          acceleration: state.acceleration,
          last_updated_at: state.lastUpdatedAt,
        })
        .eq("character_id", characterId)
        .eq("state_name", stateName);
    }
  }

  private async loadRegulations(characterId: string): Promise<Map<SimulationStateName, DualRegulation>> {
    const client = await this.getClient();

    const { data } = await client
      .from("dual_regulations")
      .select("*")
      .eq("character_id", characterId);

    const regulations = new Map<SimulationStateName, DualRegulation>();
    for (const row of data || []) {
      regulations.set(row.state_name as SimulationStateName, {
        stateId: row.id,
        stateName: row.state_name as SimulationStateName,
        homeostasis: {
          config: row.homeostasis_config as HomeostasisConfig,
          ...(row.homeostasis_state as Omit<HomeostasisState, "config">),
        },
        allostasis: {
          config: row.allostasis_config as AllostasisConfig,
          ...(row.allostasis_state as Omit<AllostasisState, "config">),
        },
        regulationMode: row.regulation_mode as DualRegulation["regulationMode"],
        lastRegulationAt: Number(row.last_regulation_at),
      });
    }

    return regulations;
  }

  private async loadFatigues(characterId: string): Promise<Map<FatigueDimension, MultiFatigue>> {
    const client = await this.getClient();

    const { data } = await client
      .from("multi_fatigues")
      .select("*")
      .eq("character_id", characterId);

    const fatigues = new Map<FatigueDimension, MultiFatigue>();
    for (const row of data || []) {
      fatigues.set(row.dimension as FatigueDimension, {
        dimension: row.dimension as FatigueDimension,
        level: Number(row.level),
        baseline: Number(row.baseline),
        triggers: row.triggers as FatigueTrigger[],
        recoveryConfig: row.recovery_config as RecoveryConfig,
        behavioralEffects: row.behavioral_effects as MultiFatigue["behavioralEffects"],
        currentPhase: row.current_phase as MultiFatigue["currentPhase"],
      });
    }

    return fatigues;
  }

  private async loadModulators(characterId: string): Promise<Map<ModulatorName, GlobalModulator>> {
    const client = await this.getClient();

    const { data } = await client
      .from("global_modulators")
      .select("*")
      .eq("character_id", characterId);

    const modulators = new Map<ModulatorName, GlobalModulator>();
    for (const row of data || []) {
      modulators.set(row.modulator_name as ModulatorName, {
        name: row.modulator_name as ModulatorName,
        currentValue: Number(row.current_value),
        baseline: Number(row.baseline),
        changeRate: Number(row.change_rate),
        influences: row.influences as ModulatorInfluence[],
        temporalPattern: row.temporal_pattern as GlobalModulator["temporalPattern"],
        bounds: row.bounds as { min: number; max: number },
        inertia: Number(row.inertia),
      });
    }

    return modulators;
  }

  private async loadTemporalDrift(characterId: string): Promise<TemporalDriftState | null> {
    const client = await this.getClient();

    const { data } = await client
      .from("temporal_drift_states")
      .select("*")
      .eq("character_id", characterId)
      .single();

    if (!data) return null;

    return {
      config: data.config as TemporalDriftConfig,
      currentDrift: Number(data.current_drift),
      driftMomentum: Number(data.drift_momentum),
      driftHistory: data.drift_history as TemporalDriftState["driftHistory"],
      memoryBiases: data.memory_biases as MemoryBias[],
      temporalContext: data.temporal_context as TemporalDriftState["temporalContext"],
    };
  }

  private async loadIdentityPatterns(characterId: string): Promise<IdentityTemporalPattern[]> {
    const client = await this.getClient();

    const { data } = await client
      .from("identity_temporal_patterns")
      .select("*")
      .eq("character_id", characterId);

    return (data || []).map(row => ({
      patternId: row.pattern_id,
      name: row.name,
      description: row.description,
      associatedIdentity: row.associated_identity,
      cyclePeriodDays: Number(row.cycle_period_days),
      phases: row.phases as IdentityTemporalPattern["phases"],
      currentPhase: row.current_phase,
      phaseProgress: Number(row.phase_progress),
      affectedModulators: row.affected_modulators as ModulatorName[],
      affectedStates: row.affected_states as SimulationStateName[],
      safetyDisclaimer: row.safety_disclaimer,
      isEnabled: row.is_enabled,
    }));
  }

  private async getLastTick(characterId: string): Promise<SimulationTick | null> {
    const client = await this.getClient();

    const { data } = await client
      .from("simulation_ticks")
      .select("*")
      .eq("character_id", characterId)
      .order("tick_timestamp", { ascending: false })
      .limit(1)
      .single();

    if (!data) return null;

    return {
      tickId: data.id,
      characterId: data.character_id,
      timestamp: Number(data.tick_timestamp),
      deltaTime: Number(data.delta_time),
      previousStates: new Map(Object.entries(data.previous_states)),
      currentStates: new Map(Object.entries(data.current_states)),
      stateTransitions: data.state_transitions as StateTransition[],
      regulationEvents: data.regulation_events as RegulationEvent[],
      modulatorChanges: data.modulator_changes as ModulatorChange[],
      fatigueUpdates: data.fatigue_updates as FatigueUpdate[],
      stochasticNoise: data.stochastic_noise as Record<string, number>,
      behavioralOutput: data.behavioral_output as BehavioralOutput,
      reasoning: data.reasoning as TickReasoning,
    };
  }

  private async saveTick(characterId: string, tick: SimulationTick): Promise<void> {
    const client = await this.getClient();

    const previousStatesObj: Record<string, unknown> = {};
    for (const [k, v] of tick.previousStates) {
      previousStatesObj[k] = v;
    }

    const currentStatesObj: Record<string, unknown> = {};
    for (const [k, v] of tick.currentStates) {
      currentStatesObj[k] = v;
    }

    await client.from("simulation_ticks").insert({
      character_id: characterId,
      tick_timestamp: tick.timestamp,
      delta_time: tick.deltaTime,
      previous_states: previousStatesObj,
      current_states: currentStatesObj,
      state_transitions: tick.stateTransitions,
      regulation_events: tick.regulationEvents,
      modulator_changes: tick.modulatorChanges,
      fatigue_updates: tick.fatigueUpdates,
      stochastic_noise: tick.stochasticNoise,
      behavioral_output: tick.behavioralOutput,
      reasoning: tick.reasoning,
    });

    const { count } = await client
      .from("simulation_ticks")
      .select("*", { count: "exact", head: true })
      .eq("character_id", characterId);

    if (count && count > this.config.maxTickHistorySize) {
      const { data: oldTicks } = await client
        .from("simulation_ticks")
        .select("id")
        .eq("character_id", characterId)
        .order("tick_timestamp", { ascending: true })
        .limit(count - this.config.maxTickHistorySize);

      if (oldTicks) {
        const oldIds = oldTicks.map(t => t.id);
        await client.from("simulation_ticks").delete().in("id", oldIds);
      }
    }
  }

  async getBehavioralOutput(characterId: string): Promise<ServiceResult<BehavioralOutput>> {
    const lastTick = await this.getLastTick(characterId);
    if (lastTick) {
      return { success: true, data: lastTick.behavioralOutput };
    }

    const tickResult = await this.tick(characterId);
    if (tickResult.success && tickResult.data) {
      return { success: true, data: tickResult.data.behavioralOutput };
    }

    return { success: false, error: "Could not generate behavioral output" };
  }

  async addMemoryBias(
    characterId: string,
    memoryId: string,
    emotionalWeight: number,
    stateInfluences: Partial<Record<SimulationStateName, number>>
  ): Promise<ServiceResult<void>> {
    const client = await this.getClient();

    const { data: drift } = await client
      .from("temporal_drift_states")
      .select("memory_biases")
      .eq("character_id", characterId)
      .single();

    if (!drift) {
      return { success: false, error: "Temporal drift state not found" };
    }

    const biases = (drift.memory_biases as MemoryBias[]) || [];
    const existingIndex = biases.findIndex(b => b.memoryId === memoryId);

    const newBias: MemoryBias = {
      memoryId,
      emotionalWeight,
      recencyWeight: 1.0,
      combinedInfluence: emotionalWeight,
      lastActivatedAt: Date.now(),
      activationCount: existingIndex >= 0 ? biases[existingIndex].activationCount + 1 : 1,
      stateInfluences,
    };

    if (existingIndex >= 0) {
      biases[existingIndex] = newBias;
    } else {
      biases.push(newBias);
    }

    const sortedBiases = biases
      .sort((a, b) => b.combinedInfluence - a.combinedInfluence)
      .slice(0, 20);

    await client.from("temporal_drift_states")
      .update({ memory_biases: sortedBiases, updated_at: new Date().toISOString() })
      .eq("character_id", characterId);

    return { success: true };
  }

  async toggleIdentityPattern(characterId: string, patternId: string, enabled: boolean): Promise<ServiceResult<void>> {
    const client = await this.getClient();

    await client.from("identity_temporal_patterns")
      .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
      .eq("character_id", characterId)
      .eq("pattern_id", patternId);

    return { success: true };
  }
}

interface ExternalInput {
  source: string;
  description: string;
  magnitude: number;
  affectedStates: SimulationStateName[];
  fatigueTrigger?: FatigueDimension;
  fatigueType?: string;
}

interface PatternEffect {
  patternId: string;
  phaseName: string;
  description: string;
  stateModifiers: Partial<Record<SimulationStateName, number>>;
  modulatorModifiers: Partial<Record<ModulatorName, number>>;
}

export const continuousSimulationEngine = new ContinuousSimulationEngine();
