/** Schema form types: the JSON-Schema-like schema, the error map, the per-field save status and the translatable labels. */

export type SchemaFormType = "string" | "number" | "integer" | "boolean" | "array" | "object";

/** JSON-Schema-like description of a value. */
export interface SchemaFormSchema {
  type?: SchemaFormType;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: (string | number)[];
  /** Display labels for `enum` values (same order). */
  enumLabels?: string[];
  /** password | uri | email | textarea | any other hint. */
  format?: string;
  placeholder?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  properties?: Record<string, SchemaFormSchema>;
  required?: string[];
  items?: SchemaFormSchema;
  minItems?: number;
  maxItems?: number;
  readOnly?: boolean;
  /** Treat as a secret (masked input). */
  "x-secret"?: boolean;
  /** Category used for section navigation (top-level fields). */
  "x-category"?: string;
  /** Disables the field and shows the reason. */
  "x-disabled-reason"?: string;
}

export type SchemaFormErrors = Record<string, string>;

export type SchemaFieldSaveStatus = "saving" | "saved" | "error";

/** Texts of the form chrome (English by default); pass any of them to translate the form. Validation messages are not covered. */
export interface SchemaFormLabels {
  /** Per-field status while autosaving. Default "Saving…". */
  saving?: string;
  /** Per-field status after a save. Default "Saved". */
  saved?: string;
  /** Per-field status after a failed save. Default "Not saved". */
  notSaved?: string;
  /** Add-item button; gets the singular item name. Default "Add item". */
  add?: (item: string) => string;
  /** Name of a remove button (n is 1-based). Default "Remove item n". */
  remove?: (item: string, n: number) => string;
  /** Name of the section navigation. Default "Sections". */
  sections?: string;
  /** Section filter that shows every section. Default "All". */
  all?: string;
  /** Name of the search field. Default "Search settings". */
  search?: string;
  /** Placeholder of the search field. Default "Search settings…". */
  searchPlaceholder?: string;
  /** Message when a search matches nothing. */
  noMatch?: (query: string) => string;
  /** Screen-reader suffix of a section's error count. Default "errors". */
  errors?: string;
  /** Message beside the submit button while fields are invalid. */
  fixFields?: (count: number) => string;
}
