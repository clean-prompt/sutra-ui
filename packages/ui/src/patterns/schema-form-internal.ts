/** Private helpers shared by the schema form modules: type inference, path and pattern helpers, default labels, the form context and field ids. */
import * as React from "react";
import { capitalize } from "../lib/text";
import type { SchemaFieldSaveStatus, SchemaFormErrors, SchemaFormLabels, SchemaFormSchema, SchemaFormType } from "./schema-form-types";

export function isEmpty(v: unknown) {
  return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
}

export function inferType(schema: SchemaFormSchema): SchemaFormType | undefined {
  if (schema.type) return schema.type;
  if (schema.properties) return "object";
  if (schema.items) return "array";
  if (schema.enum) return typeof schema.enum[0] === "number" ? "number" : "string";
  return undefined;
}

/** Tests a schema `pattern`; an invalid pattern can't be checked, so it never fails (or throws). */
export function matchesPattern(pattern: string, value: string) {
  try {
    return new RegExp(pattern).test(value);
  } catch {
    return true;
  }
}

export function joinPath(base: string, seg: string | number) {
  return base ? `${base}.${seg}` : String(seg);
}

/** Validate a value against a schema. Returns `{ [path]: message }`; paths are dotted (`servers.0.url`), root is `""`. */

export function humanize(key: string) {
  return capitalize(key.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2"));
}


export const defaultLabels: Required<SchemaFormLabels> = {
  saving: "Saving…",
  saved: "Saved",
  notSaved: "Not saved",
  add: (item) => `Add ${item.toLowerCase()}`,
  remove: (item, n) => `Remove ${item} ${n}`,
  sections: "Sections",
  all: "All",
  search: "Search settings",
  searchPlaceholder: "Search settings…",
  noMatch: (query) => `No settings match “${query}”`,
  errors: "errors",
  fixFields: (count) => `Fix ${count} ${count === 1 ? "field" : "fields"} to continue`,
};

export interface SchemaFormCtx {
  errors: SchemaFormErrors;
  showError: (path: string) => boolean;
  touch: (path: string) => void;
  status: Record<string, SchemaFieldSaveStatus>;
  disabledFields: Record<string, string>;
  disabled: boolean;
  idPrefix: string;
  labels: Required<SchemaFormLabels>;
}

export const SchemaFormContext = React.createContext<SchemaFormCtx>({
  errors: {},
  showError: () => true,
  touch: () => {},
  status: {},
  disabledFields: {},
  disabled: false,
  idPrefix: "sf",
  labels: defaultLabels,
});

export function fieldId(prefix: string, path: string) {
  return `${prefix}-${path.replace(/[^\w-]/g, "_") || "root"}`;
}

