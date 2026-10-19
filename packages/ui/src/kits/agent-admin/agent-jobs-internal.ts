/** Private helpers shared by the agent-jobs modules (time coercion, select options). */
import { toMs as toValidMs } from "../../lib/time";
import type { SelectOption } from "../../primitives/select";

export type TimeLike = Date | number | string;

export const toMs = (t: TimeLike) => toValidMs(t) ?? NaN;

export const toSelectOptions = (opts?: (string | SelectOption)[]): SelectOption[] => (opts ?? []).map((o) => (typeof o === "string" ? { value: o, label: o } : o));
