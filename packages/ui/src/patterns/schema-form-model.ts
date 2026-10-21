/** Schema form model: validation of a value against a schema, and the default value a schema describes. */
import { isEmail, isHttpUrl } from "../lib/validate";
import { inferType, isEmpty, joinPath, matchesPattern } from "./schema-form-internal";
import type { SchemaFormErrors, SchemaFormSchema } from "./schema-form-types";

export function validateAgainstSchema(schema: SchemaFormSchema, value: unknown, path = ""): SchemaFormErrors {
  const errors: SchemaFormErrors = {};
  const type = inferType(schema);
  if (value === undefined || value === null || value === "") return errors;

  switch (type) {
    case "string": {
      if (typeof value !== "string") {
        errors[path] = "Must be text";
        break;
      }
      if (schema.minLength != null && value.length < schema.minLength) errors[path] = `Must be at least ${schema.minLength} characters`;
      else if (schema.maxLength != null && value.length > schema.maxLength) errors[path] = `Must be at most ${schema.maxLength} characters`;
      else if (schema.pattern && !matchesPattern(schema.pattern, value)) errors[path] = "Invalid format";
      else if (schema.format === "email" && !isEmail(value)) errors[path] = "Enter a valid email address";
      else if (schema.format === "uri" && !isHttpUrl(value)) errors[path] = "Enter a valid URL";
      break;
    }
    case "number":
    case "integer": {
      if (typeof value !== "number" || Number.isNaN(value)) {
        errors[path] = "Must be a number";
        break;
      }
      if (type === "integer" && !Number.isInteger(value)) errors[path] = "Must be a whole number";
      else if (schema.minimum != null && value < schema.minimum) errors[path] = `Must be at least ${schema.minimum}`;
      else if (schema.maximum != null && value > schema.maximum) errors[path] = `Must be at most ${schema.maximum}`;
      break;
    }
    case "boolean":
      if (typeof value !== "boolean") errors[path] = "Must be true or false";
      break;
    case "array": {
      if (!Array.isArray(value)) {
        errors[path] = "Must be a list";
        break;
      }
      if (schema.minItems != null && value.length < schema.minItems) errors[path] = `Add at least ${schema.minItems} ${schema.minItems === 1 ? "item" : "items"}`;
      else if (schema.maxItems != null && value.length > schema.maxItems) errors[path] = `At most ${schema.maxItems} items`;
      if (schema.items) value.forEach((item, i) => Object.assign(errors, validateAgainstSchema(schema.items!, item, joinPath(path, i))));
      break;
    }
    case "object": {
      if (typeof value !== "object" || Array.isArray(value)) {
        errors[path] = "Must be an object";
        break;
      }
      const obj = value as Record<string, unknown>;
      for (const key of schema.required ?? []) {
        if (isEmpty(obj[key])) errors[joinPath(path, key)] = "Required";
      }
      for (const [key, sub] of Object.entries(schema.properties ?? {})) {
        if (errors[joinPath(path, key)]) continue;
        Object.assign(errors, validateAgainstSchema(sub, obj[key], joinPath(path, key)));
      }
      break;
    }
  }
  if (schema.enum && !errors[path] && !schema.enum.includes(value as string | number)) errors[path] = "Choose one of the allowed values";
  return errors;
}

/** Build a value from the schema's `default`s (objects recurse; arrays default to []). */
export function schemaDefaults(schema: SchemaFormSchema): unknown {
  if (schema.default !== undefined) return schema.default;
  const type = inferType(schema);
  if (type === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, sub] of Object.entries(schema.properties ?? {})) {
      const d = schemaDefaults(sub);
      if (d !== undefined) out[k] = d;
    }
    return out;
  }
  if (type === "array") return [];
  return undefined;
}
