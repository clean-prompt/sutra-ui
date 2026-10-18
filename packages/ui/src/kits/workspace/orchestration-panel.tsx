import * as React from "react";
import { RiSparkling2Line } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { AgentAvatar, randomAvatarSpec } from "../../patterns/agent-avatar";
import { SimpleSelect } from "../../primitives/select";
import { Switch } from "../../primitives/switch";
import type { KanbanAssignee, KanbanRunStatusInput } from "./kanban-model";
import { NONE } from "./kanban-internal";
import { KanbanRunBadge } from "./kanban-card";

/* ------------------------------------------------------------------ */
/* OrchestrationPanel                                                  */
/* ------------------------------------------------------------------ */

export interface OrchestrationParticipant {
  agent: KanbanAssignee;
  /** Role in this task, e.g. "Writes tests". Falls back to the agent description. */
  role?: string;
  status?: KanbanRunStatusInput | "idle";
}

export interface OrchestrationPanelProps extends Omit<React.HTMLAttributes<HTMLElement>, "onChange" | "title"> {
  /** Agent profiles that can orchestrate. */
  profiles: KanbanAssignee[];
  orchestratorId?: string;
  defaultOrchestratorId?: string;
  onOrchestratorChange?: (id: string | undefined) => void;
  autoDecompose?: boolean;
  defaultAutoDecompose?: boolean;
  onAutoDecomposeChange?: (on: boolean) => void;
  /** Split the task into subtasks now. Shows a button when set. */
  onDecompose?: () => void;
  decomposing?: boolean;
  participants?: OrchestrationParticipant[];
  title?: React.ReactNode;
}

/** Assign an orchestrator agent, toggle auto-decomposition into subtasks and list participating agents. */
export const OrchestrationPanel = React.forwardRef<HTMLElement, OrchestrationPanelProps>(
  (
    {
      profiles,
      orchestratorId,
      defaultOrchestratorId,
      onOrchestratorChange,
      autoDecompose,
      defaultAutoDecompose,
      onAutoDecomposeChange,
      onDecompose,
      decomposing,
      participants = [],
      title = "Orchestration",
      className,
      ...props
    },
    ref
  ) => {
    const switchId = React.useId();
    const headingId = React.useId();
    const [orch, setOrch] = useControllableState<string>({
      value: orchestratorId === undefined ? undefined : orchestratorId,
      defaultValue: defaultOrchestratorId ?? NONE,
      onChange: (v) => onOrchestratorChange?.(v === NONE ? undefined : v),
    });
    const [auto, setAuto] = useControllableState<boolean>({
      value: autoDecompose,
      defaultValue: defaultAutoDecompose ?? false,
      onChange: onAutoDecomposeChange,
    });
    const selected = profiles.find((p) => p.id === orch);
    return (
      <section
        ref={ref}
        aria-labelledby={headingId}
        className={cn("flex flex-col gap-3 rounded-box border border-border bg-card p-4 shadow-xs", className)}
        {...props}
      >
        <h3 id={headingId} className="flex items-center gap-1.5 text-sm font-semibold">
          <RiSparkling2Line aria-hidden className="size-4 text-primary" />
          {title}
        </h3>
        <SimpleSelect
          size="sm"
          aria-label="Orchestrator agent"
          value={orch || NONE}
          onValueChange={setOrch}
          options={[
            { value: NONE, label: "No orchestrator" },
            ...profiles.map((p) => ({
              value: p.id,
              label: p.name,
              icon: <AgentAvatar spec={p.avatar ?? randomAvatarSpec(p.id)} size={16} label="" />,
            })),
          ]}
        />
        {selected?.description && <p className="text-xs text-muted-foreground">{selected.description}</p>}
        <div className="flex items-start justify-between gap-3">
          <label htmlFor={switchId} className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Auto-decompose</span>
            <span className="text-xs text-muted-foreground">Split this task into subtasks before agents start.</span>
          </label>
          <Switch id={switchId} size="sm" checked={auto} onCheckedChange={setAuto} />
        </div>
        {onDecompose && (
          <Button size="sm" variant="secondary" loading={decomposing} disabled={decomposing} onClick={onDecompose} leadingIcon={<RiSparkling2Line aria-hidden />}>
            Decompose now
          </Button>
        )}
        {participants.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-medium text-muted-foreground">Participating agents</h4>
            <ul aria-label="Participating agents" className="flex flex-col gap-2">
              {participants.map((p) => (
                <li key={p.agent.id} className="flex items-start gap-2">
                  <AgentAvatar spec={p.agent.avatar ?? randomAvatarSpec(p.agent.id)} size={24} label="" className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{p.agent.name}</span>
                      {p.status && p.status !== "idle" && <KanbanRunBadge status={p.status} />}
                    </div>
                    {(p.role ?? p.agent.description) && (
                      <p className="text-xs text-muted-foreground">{p.role ?? p.agent.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    );
  }
);
OrchestrationPanel.displayName = "OrchestrationPanel";
