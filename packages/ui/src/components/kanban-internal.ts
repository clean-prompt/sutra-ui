/* Private constants shared by the kanban modules. Not re-exported from the kanban barrel. */

import type { KanbanPriority } from "./kanban-model";

export const priorityOrder: KanbanPriority[] = ["urgent", "high", "medium", "low", "none"];
export const priorityLabel: Record<KanbanPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "No priority",
};

export const NONE = "__none";
