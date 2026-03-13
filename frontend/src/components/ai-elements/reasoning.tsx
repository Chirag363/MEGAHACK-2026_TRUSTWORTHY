"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  CircleDotIcon,
  CpuIcon,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ComponentProps,
} from "react";

// ─── Agent label map ───────────────────────────────────────────────────────

const AGENT_LABELS: Record<string, string> = {
  supervisor_agent: "Supervisor",
  data_cleaning_agent: "Data Cleaning",
  feature_analysis_agent: "Feature Analysis",
  visualization_agent: "Visualization",
  insight_generation_agent: "Insight Generation",
  recommendation_agent: "Recommendations",
  casual_convo_agent: "Casual Conversation",
};

export function agentLabel(name: string): string {
  return AGENT_LABELS[name] ?? name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type AgentStep = {
  agent: string;
  label: string;
  status: "running" | "done";
  startTime: number;
  durationMs?: number;
};

// ─── Context ────────────────────────────────────────────────────────────────

interface ReasoningCtx {
  isStreaming: boolean;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}

const ReasoningContext = createContext<ReasoningCtx | null>(null);

function useReasoning() {
  const ctx = useContext(ReasoningContext);
  if (!ctx) throw new Error("Must be used inside <Reasoning>");
  return ctx;
}

// ─── Reasoning ──────────────────────────────────────────────────────────────

export type ReasoningProps = Omit<ComponentProps<typeof Collapsible>, "open" | "onOpenChange"> & {
  isStreaming?: boolean;
};

export function Reasoning({ isStreaming = false, className, children, ...props }: ReasoningProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Auto-open when pipeline starts, auto-collapse when tokens begin flowing.
  useEffect(() => {
    if (isStreaming) setIsOpen(true);
    else setIsOpen(false);
  }, [isStreaming]);

  return (
    <ReasoningContext.Provider value={{ isStreaming, isOpen, setIsOpen }}>
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className={cn(
          "w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.025]",
          className
        )}
        {...props}
      >
        {children}
      </Collapsible>
    </ReasoningContext.Provider>
  );
}

// ─── ReasoningTrigger ────────────────────────────────────────────────────────

export type ReasoningTriggerProps = ComponentProps<typeof CollapsibleTrigger>;

export function ReasoningTrigger({ className, ...props }: ReasoningTriggerProps) {
  const { isStreaming, isOpen } = useReasoning();

  return (
    <CollapsibleTrigger
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-white/5",
        className
      )}
      {...props}
    >
      <CpuIcon className="size-3.5 shrink-0 text-cyan-400/70" />
      <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
        {isStreaming ? "Agent pipeline running" : "Agent pipeline"}
      </span>
      {isStreaming && (
        <span className="flex gap-0.5">
          {[0, 150, 300].map((d) => (
            <span
              key={d}
              className="size-1 rounded-full bg-cyan-400/70 animate-bounce"
              style={{ animationDelay: `${d}ms` }}
            />
          ))}
        </span>
      )}
      <ChevronDownIcon
        className={cn(
          "size-3.5 shrink-0 text-white/30 transition-transform duration-200",
          isOpen && "rotate-180"
        )}
      />
    </CollapsibleTrigger>
  );
}

// ─── ReasoningContent ────────────────────────────────────────────────────────

export type ReasoningContentProps = {
  steps: AgentStep[];
  className?: string;
};

export function ReasoningContent({ steps, className }: ReasoningContentProps) {
  const { isStreaming } = useReasoning();

  if (steps.length === 0) return null;

  return (
    <CollapsibleContent>
      <div
        className={cn(
          "flex flex-col gap-0 border-t border-white/8 px-3 py-2",
          className
        )}
      >
        {steps.map((step, i) => {
          const isRunning = step.status === "running";
          const isDone = step.status === "done";
          const isLast = i === steps.length - 1;

          return (
            <div key={step.agent} className="flex items-start gap-2.5 py-1">
              {/* Timeline connector */}
              <div className="flex flex-col items-center">
                {isDone ? (
                  <CheckCircle2Icon className="size-3.5 mt-0.5 shrink-0 text-emerald-400/80" />
                ) : (
                  <CircleDotIcon
                    className={cn(
                      "size-3.5 mt-0.5 shrink-0",
                      isRunning ? "text-cyan-400 animate-pulse" : "text-white/20"
                    )}
                  />
                )}
                {!isLast && (
                  <div className="mt-0.5 w-px flex-1 bg-white/10" style={{ minHeight: "10px" }} />
                )}
              </div>

              {/* Step info */}
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "text-[11px] font-medium leading-tight",
                      isDone ? "text-white/60" : isRunning ? "text-white/90" : "text-white/30"
                    )}
                  >
                    {step.label}
                  </span>
                  {isDone && step.durationMs !== undefined && (
                    <span className="text-[10px] text-white/25">
                      {step.durationMs < 1000
                        ? `${step.durationMs}ms`
                        : `${(step.durationMs / 1000).toFixed(1)}s`}
                    </span>
                  )}
                  {isRunning && (
                    <span className="text-[10px] text-cyan-400/60 animate-pulse">running…</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isStreaming && (
          <p className="mt-1 text-[10px] text-white/25 pl-6">
            Generating report…
          </p>
        )}
      </div>
    </CollapsibleContent>
  );
}
