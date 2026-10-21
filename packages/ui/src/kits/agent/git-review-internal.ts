/* Private helpers shared by the git-review modules. Not public. */

import type { ChangedFileStatus } from "./git-review-model";

export const statusMeta: Record<ChangedFileStatus, { letter: string; label: string; className: string }> = {
  added: { letter: "A", label: "added", className: "text-success" },
  modified: { letter: "M", label: "modified", className: "text-warning" },
  deleted: { letter: "D", label: "deleted", className: "text-destructive" },
  renamed: { letter: "R", label: "renamed", className: "text-info" },
  untracked: { letter: "U", label: "untracked", className: "text-success" },
  conflicted: { letter: "!", label: "conflicted", className: "text-destructive" },
};
