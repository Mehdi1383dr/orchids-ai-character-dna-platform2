"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { Sparkles, Clock, TrendingUp, Shield, Eye, EyeOff, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  PersonalityTimeline,
  DriftEvent,
  TraitConstellation,
  DomainCluster,
  DirectionalIndicator,
  ReversibilityAssessment,
  PersonalityDomain,
  EvolutionPhase,
} from "@/lib/types/drift-visualization";
import {
  DOMAIN_DISPLAY_NAMES,
  DOMAIN_COLORS,
  EVOLUTION_PHASE_DESCRIPTIONS,
  REVERSIBILITY_DESCRIPTIONS,
} from "@/lib/types/drift-visualization";

interface PersonalityDriftVisualizationProps {
  characterId: string;
  characterName: string;
  timeline?: PersonalityTimeline;
  constellations?: TraitConstellation[];
  clusters?: DomainCluster[];
  indicators?: DirectionalIndicator[];
  isLoading?: boolean;
  isCreator?: boolean;
}

export function PersonalityDriftVisualization({
  characterId,
  characterName,
  timeline,
  constellations = [],
  clusters = [],
  indicators = [],
  isLoading = false,
  isCreator = false,
}: PersonalityDriftVisualizationProps) {
  const [activeView, setActiveView] = useState<"timeline" | "constellation" | "clusters">("constellation");
  const [selectedEvent, setSelectedEvent] = useState<DriftEvent | null>(null);
  const [hoveredDomain, setHoveredDomain] = useState<PersonalityDomain | null>(null);
  const [breathingPhase, setBreathingPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBreathingPhase((prev) => (prev + 0.02) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const evolutionPhase = timeline?.currentSnapshot?.evolutionPhase || "forming";
  const overallStability = timeline?.currentSnapshot?.overallStability || 80;

  if (isLoading) {
    return (
      <div className="w-full h-[600px] rounded-2xl glass flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="w-8 h-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl glass overflow-hidden">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {characterName}&apos;s Evolution
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {EVOLUTION_PHASE_DESCRIPTIONS[evolutionPhase]}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StabilityIndicator stability={overallStability} />
          </div>
        </div>

        <div className="flex gap-2">
          {(["constellation", "clusters", "timeline"] as const).map((view) => (
            <Button
              key={view}
              variant={activeView === view ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveView(view)}
              className={activeView === view ? "gradient-primary border-0" : ""}
            >
              {view === "constellation" && "Constellations"}
              {view === "clusters" && "Domains"}
              {view === "timeline" && "Timeline"}
            </Button>
          ))}
        </div>
      </div>

      <div className="relative">
        <AnimatePresence mode="wait">
          {activeView === "constellation" && (
            <ConstellationView
              key="constellation"
              constellations={constellations}
              breathingPhase={breathingPhase}
              hoveredDomain={hoveredDomain}
              onHoverDomain={setHoveredDomain}
            />
          )}
          {activeView === "clusters" && (
            <ClustersView
              key="clusters"
              clusters={clusters}
              breathingPhase={breathingPhase}
              hoveredDomain={hoveredDomain}
              onHoverDomain={setHoveredDomain}
            />
          )}
          {activeView === "timeline" && (
            <TimelineView
              key="timeline"
              events={timeline?.events || []}
              selectedEvent={selectedEvent}
              onSelectEvent={setSelectedEvent}
              isCreator={isCreator}
            />
          )}
        </AnimatePresence>
      </div>

      {indicators.length > 0 && (
        <div className="p-6 border-t border-border/50">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Evolution</h3>
          <div className="flex flex-wrap gap-2">
            {indicators.slice(0, 3).map((indicator) => (
              <DirectionalBadge key={indicator.indicatorId} indicator={indicator} />
            ))}
          </div>
        </div>
      )}

      {selectedEvent && (
        <EventDetailPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          isCreator={isCreator}
        />
      )}
    </div>
  );
}

function StabilityIndicator({ stability }: { stability: number }) {
  const color = stability > 70 ? "text-emerald-400" : stability > 40 ? "text-amber-400" : "text-rose-400";
  const bgColor = stability > 70 ? "bg-emerald-400/20" : stability > 40 ? "bg-amber-400/20" : "bg-rose-400/20";

  return (
    <div className={`px-3 py-1.5 rounded-full ${bgColor} flex items-center gap-2`}>
      <div className={`w-2 h-2 rounded-full ${color.replace("text-", "bg-")}`} />
      <span className={`text-xs font-medium ${color}`}>
        {stability > 70 ? "Stable" : stability > 40 ? "Evolving" : "Transforming"}
      </span>
    </div>
  );
}

function ConstellationView({
  constellations,
  breathingPhase,
  hoveredDomain,
  onHoverDomain,
}: {
  constellations: TraitConstellation[];
  breathingPhase: number;
  hoveredDomain: PersonalityDomain | null;
  onHoverDomain: (domain: PersonalityDomain | null) => void;
}) {
  const canvasWidth = 500;
  const canvasHeight = 400;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative h-[400px] overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at center, oklch(0.15 0.03 280) 0%, oklch(0.08 0.01 260) 100%)",
      }}
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} className="absolute inset-0">
        <defs>
          {constellations.flatMap((constellation) =>
            constellation.stars.map((star) => (
              <radialGradient key={`grad-${star.id}`} id={`starGrad-${star.id}`}>
                <stop offset="0%" stopColor={star.color} stopOpacity={0.9} />
                <stop offset="50%" stopColor={star.color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={star.color} stopOpacity={0} />
              </radialGradient>
            ))
          )}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {constellations.map((constellation, ci) => {
          const offsetX = (ci % 2) * 100 - 50;
          const offsetY = Math.floor(ci / 2) * 80 - 40;

          return (
            <g key={constellation.constellationId} transform={`translate(${centerX + offsetX}, ${centerY + offsetY})`}>
              {constellation.connections.map((conn, i) => {
                const fromStar = constellation.stars.find((s) => s.id === conn.fromStarId);
                const toStar = constellation.stars.find((s) => s.id === conn.toStarId);
                if (!fromStar || !toStar) return null;

                const opacity = 0.2 + conn.strength * 0.3 + Math.sin(breathingPhase + i) * 0.1;

                return (
                  <line
                    key={`${conn.fromStarId}-${conn.toStarId}`}
                    x1={fromStar.position.x}
                    y1={fromStar.position.y}
                    x2={toStar.position.x}
                    y2={toStar.position.y}
                    stroke={conn.connectionType === "tension" ? "oklch(0.7 0.15 350)" : "oklch(0.7 0.1 280)"}
                    strokeWidth={conn.strength * 2}
                    strokeOpacity={opacity}
                    strokeDasharray={conn.connectionType === "tension" ? "4 4" : "none"}
                  />
                );
              })}

              {constellation.stars.map((star) => {
                const pulseScale = 1 + Math.sin(breathingPhase * star.pulseRate * 2) * 0.15;
                const isHovered = hoveredDomain === star.domain;
                const size = star.size * pulseScale * (isHovered ? 1.3 : 1);

                return (
                  <g
                    key={star.id}
                    onMouseEnter={() => onHoverDomain(star.domain)}
                    onMouseLeave={() => onHoverDomain(null)}
                    style={{ cursor: "pointer" }}
                  >
                    <circle
                      cx={star.position.x}
                      cy={star.position.y}
                      r={size * 2}
                      fill={`url(#starGrad-${star.id})`}
                      opacity={star.brightness * 0.5}
                    />
                    <circle
                      cx={star.position.x}
                      cy={star.position.y}
                      r={size}
                      fill={star.color}
                      filter="url(#glow)"
                      opacity={star.brightness}
                    />
                    {star.isCore && (
                      <circle
                        cx={star.position.x}
                        cy={star.position.y}
                        r={size * 0.4}
                        fill="white"
                        opacity={0.8}
                      />
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      {hoveredDomain && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 left-4 right-4 glass rounded-lg p-3"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: DOMAIN_COLORS[hoveredDomain].primary }}
            />
            <span className="font-medium text-sm">{DOMAIN_DISPLAY_NAMES[hoveredDomain]}</span>
          </div>
        </motion.div>
      )}

      <div className="absolute top-4 right-4 flex flex-col gap-1">
        {constellations.map((c) => (
          <div key={c.constellationId} className="text-xs text-muted-foreground/60 text-right">
            {c.name}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ClustersView({
  clusters,
  breathingPhase,
  hoveredDomain,
  onHoverDomain,
}: {
  clusters: DomainCluster[];
  breathingPhase: number;
  hoveredDomain: PersonalityDomain | null;
  onHoverDomain: (domain: PersonalityDomain | null) => void;
}) {
  const canvasWidth = 500;
  const canvasHeight = 400;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative h-[400px] overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at center, oklch(0.12 0.02 260) 0%, oklch(0.06 0.01 240) 100%)",
      }}
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} className="absolute inset-0">
        <defs>
          {clusters.map((cluster) => (
            <radialGradient key={`clusterGrad-${cluster.clusterId}`} id={`clusterGrad-${cluster.clusterId}`}>
              <stop offset="0%" stopColor={cluster.dominantColor} stopOpacity={0.6} />
              <stop offset="60%" stopColor={cluster.secondaryColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={cluster.secondaryColor} stopOpacity={0} />
            </radialGradient>
          ))}
        </defs>

        {clusters.map((cluster) => {
          const pulseScale = 1 + Math.sin(breathingPhase * cluster.pulseIntensity * 3) * 0.1;
          const isHovered = hoveredDomain === cluster.domain;
          const size = cluster.size * pulseScale * (isHovered ? 1.2 : 1);
          const x = centerX + cluster.position.x * 2;
          const y = centerY + cluster.position.y * 2;

          return (
            <g
              key={cluster.clusterId}
              onMouseEnter={() => onHoverDomain(cluster.domain)}
              onMouseLeave={() => onHoverDomain(null)}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={x}
                cy={y}
                r={size * 1.5}
                fill={`url(#clusterGrad-${cluster.clusterId})`}
              />
              <circle
                cx={x}
                cy={y}
                r={size * 0.8}
                fill={cluster.dominantColor}
                opacity={0.4 + cluster.cohesion * 0.4}
              />
              <circle
                cx={x}
                cy={y}
                r={size * 0.3}
                fill={cluster.dominantColor}
                opacity={0.8}
              />
              <text
                x={x}
                y={y + size + 15}
                textAnchor="middle"
                fill="currentColor"
                className="text-[10px] fill-muted-foreground"
                opacity={isHovered ? 1 : 0.6}
              >
                {cluster.displayName}
              </text>
            </g>
          );
        })}

        {clusters.map((cluster, i) => {
          const nextCluster = clusters[(i + 1) % clusters.length];
          const x1 = centerX + cluster.position.x * 2;
          const y1 = centerY + cluster.position.y * 2;
          const x2 = centerX + nextCluster.position.x * 2;
          const y2 = centerY + nextCluster.position.y * 2;

          return (
            <line
              key={`connection-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="oklch(0.5 0.05 280)"
              strokeWidth={1}
              strokeOpacity={0.15 + Math.sin(breathingPhase + i) * 0.05}
              strokeDasharray="4 8"
            />
          );
        })}
      </svg>
    </motion.div>
  );
}

function TimelineView({
  events,
  selectedEvent,
  onSelectEvent,
  isCreator,
}: {
  events: DriftEvent[];
  selectedEvent: DriftEvent | null;
  onSelectEvent: (event: DriftEvent | null) => void;
  isCreator: boolean;
}) {
  if (events.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-[400px] flex items-center justify-center"
      >
        <div className="text-center text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No significant changes recorded yet</p>
          <p className="text-sm mt-1">Evolution events will appear as the character develops</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-[400px] overflow-y-auto p-6"
    >
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

        {events.map((event, index) => {
          const domainColor = DOMAIN_COLORS[event.primary_domain as PersonalityDomain];
          const isSelected = selectedEvent?.id === event.id;

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`relative pl-10 pb-6 cursor-pointer group`}
              onClick={() => onSelectEvent(isSelected ? null : event)}
            >
              <div
                className="absolute left-2 w-5 h-5 rounded-full border-2 bg-background transition-all group-hover:scale-110"
                style={{
                  borderColor: domainColor?.primary || "var(--primary)",
                  boxShadow: isSelected ? `0 0 12px ${domainColor?.glow || "var(--primary)"}` : "none",
                }}
              />

              <div
                className={`glass rounded-lg p-4 transition-all ${
                  isSelected ? "ring-1 ring-primary" : "hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{event.human_readable_description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatEventTime(Number(event.occurred_at))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <MagnitudeBadge magnitude={event.magnitude as DriftEvent["magnitude"]} />
                    <ChevronRight
                      className={`w-4 h-4 text-muted-foreground transition-transform ${
                        isSelected ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </div>

                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-4 pt-4 border-t border-border/50"
                  >
                    <p className="text-sm text-muted-foreground">{event.narrative_explanation}</p>
                    {isCreator && event.causal_factors && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Contributing Factors</p>
                        <div className="flex flex-wrap gap-2">
                          {(event.causal_factors as Array<{ factorType: string; description: string }>).map((factor, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground"
                            >
                              {factor.description}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function DirectionalBadge({ indicator }: { indicator: DirectionalIndicator }) {
  const domainColor = DOMAIN_COLORS[indicator.domain];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-sm"
    >
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: domainColor?.primary || "var(--primary)" }}
      />
      <span className="text-muted-foreground">
        {DOMAIN_DISPLAY_NAMES[indicator.domain]}:
      </span>
      <span className="font-medium">{indicator.humanReadablePhrase}</span>
      <span className="text-xs text-muted-foreground">({indicator.timeframe})</span>
    </motion.div>
  );
}

function MagnitudeBadge({ magnitude }: { magnitude: string }) {
  const colors = {
    subtle: "bg-slate-500/20 text-slate-400",
    noticeable: "bg-blue-500/20 text-blue-400",
    significant: "bg-amber-500/20 text-amber-400",
    profound: "bg-purple-500/20 text-purple-400",
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[magnitude as keyof typeof colors] || colors.subtle}`}>
      {magnitude}
    </span>
  );
}

function EventDetailPanel({
  event,
  onClose,
  isCreator,
}: {
  event: DriftEvent;
  onClose: () => void;
  isCreator: boolean;
}) {
  const domainColor = DOMAIN_COLORS[event.primary_domain as PersonalityDomain];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-x-4 bottom-4 md:inset-auto md:right-4 md:bottom-4 md:w-96 glass rounded-xl p-5 shadow-xl z-50"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: domainColor?.primary || "var(--primary)" }}
          />
          <h3 className="font-semibold">{DOMAIN_DISPLAY_NAMES[event.primary_domain as PersonalityDomain]}</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          &times;
        </Button>
      </div>

      <p className="text-sm mb-4">{event.narrative_explanation}</p>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          <span>{event.magnitude}</span>
        </div>
        <div className="flex items-center gap-1">
          <Shield className="w-3 h-3" />
          <span>{event.permanence_level}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{formatEventTime(Number(event.occurred_at))}</span>
        </div>
      </div>

      {isCreator && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="w-3 h-3" />
            <span>Visibility: {event.visibility_level}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function formatEventTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const hours = diff / 3600000;

  if (hours < 1) return "Just now";
  if (hours < 24) return `${Math.round(hours)}h ago`;
  if (hours < 168) return `${Math.round(hours / 24)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
