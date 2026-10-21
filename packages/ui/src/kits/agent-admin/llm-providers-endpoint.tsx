/** Custom LLM endpoint: the CustomEndpointForm. */
import * as React from "react";
import { cn } from "../../lib/cn";
import { pluralize } from "../../lib/format";
import { isHttpUrl } from "../../lib/validate";
import { errorMessage, useAsyncAction } from "../../hooks/use-async-action";
import { Button } from "../../primitives/button";
import { Badge } from "../../primitives/badge";
import { Input, PasswordInput } from "../../primitives/input";
import { Label } from "../../primitives/label";
import { SimpleSelect } from "../../primitives/select";
import { KeyValueRowsInput } from "./key-value-rows-internal";
import { InlineAlert } from "../../primitives/inline-alert";

/* ------------------------------------------------------------------ */
/* CustomEndpointForm                                                  */
/* ------------------------------------------------------------------ */

export type CustomEndpointApiMode = "openai" | "anthropic" | "other";

export interface CustomEndpointHeader {
  key: string;
  value: string;
}

export interface CustomEndpointValues {
  name: string;
  baseUrl: string;
  apiMode: CustomEndpointApiMode;
  headers: CustomEndpointHeader[];
  apiKey: string;
}

export interface CustomEndpointTestResult {
  ok: boolean;
  latencyMs?: number;
  models?: string[];
  error?: string;
}

export interface CustomEndpointFormProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "defaultValue"> {
  /** Initial field values (base URL, key, model id and so on). */
  defaultValues?: Partial<CustomEndpointValues>;
  /** Tests the endpoint with the current values and resolves with the result; shows a Test button when set. */
  onTest?: (values: CustomEndpointValues) => Promise<CustomEndpointTestResult>;
  /** Called with the valid values when the user submits the form. */
  onSave?: (values: CustomEndpointValues) => void;
  /** Called when the user presses Cancel; the button is hidden when unset. */
  onCancel?: () => void;
  /** Label of the submit button. */
  submitLabel?: string;
}

export const customEndpointApiModes: { value: CustomEndpointApiMode; label: string }[] = [
  { value: "openai", label: "OpenAI-compatible" },
  { value: "anthropic", label: "Anthropic Messages" },
  { value: "other", label: "Other" },
];

/** Form for an OpenAI/Anthropic-compatible endpoint with headers, key and a "Test connection" probe. */
export const CustomEndpointForm = React.forwardRef<HTMLFormElement, CustomEndpointFormProps>(
  ({ defaultValues, onTest, onSave, onCancel, submitLabel = "Save endpoint", className, ...props }, ref) => {
    const id = React.useId();
    const [values, setValues] = React.useState<CustomEndpointValues>({
      name: defaultValues?.name ?? "",
      baseUrl: defaultValues?.baseUrl ?? "",
      apiMode: defaultValues?.apiMode ?? "openai",
      headers: defaultValues?.headers ?? [],
      apiKey: defaultValues?.apiKey ?? "",
    });
    const [result, setResult] = React.useState<CustomEndpointTestResult | null>(null);
    const [touched, setTouched] = React.useState(false);
    const set = <K extends keyof CustomEndpointValues>(k: K, v: CustomEndpointValues[K]) => {
      setValues((s) => ({ ...s, [k]: v }));
      setResult(null);
      resetTest();
    };
    const urlInvalid = values.baseUrl.trim() !== "" && !isHttpUrl(values.baseUrl.trim());
    const canSubmit = values.name.trim() !== "" && isHttpUrl(values.baseUrl.trim());
    const clean = (): CustomEndpointValues => ({
      ...values,
      name: values.name.trim(),
      baseUrl: values.baseUrl.trim().replace(/\/+$/, ""),
      headers: values.headers.filter((h) => h.key.trim()),
    });

    const { run: runTest, busy: testing, reset: resetTest } = useAsyncAction((v: CustomEndpointValues) => onTest?.(v), {
      onSuccess: (r) => {
        if (r) setResult(r);
      },
      onError: (e) => setResult({ ok: false, error: errorMessage(e, "Connection failed") }),
    });

    const test = () => {
      if (!onTest || !isHttpUrl(values.baseUrl.trim())) return;
      setResult(null);
      void runTest(clean());
    };

    return (
      <form
        ref={ref}
        noValidate
        data-slot="custom-endpoint-form"
        className={cn("grid w-full grid-cols-1 gap-4", className)}
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (canSubmit) onSave?.(clean());
        }}
        {...props}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid grid-cols-1 gap-1.5">
            <Label htmlFor={`${id}-name`} required>
              Name
            </Label>
            <Input
              id={`${id}-name`}
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="My gateway"
              invalid={touched && !values.name.trim()}
            />
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            <Label id={`${id}-mode-label`}>API mode</Label>
            <SimpleSelect
              aria-labelledby={`${id}-mode-label`}
              value={values.apiMode}
              onValueChange={(v) => set("apiMode", v as CustomEndpointApiMode)}
              options={customEndpointApiModes}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          <Label htmlFor={`${id}-url`} required>
            Base URL
          </Label>
          <Input
            id={`${id}-url`}
            type="url"
            value={values.baseUrl}
            onChange={(e) => set("baseUrl", e.target.value)}
            placeholder="https://llm.example.internal/v1"
            className="font-mono"
            invalid={urlInvalid || (touched && !values.baseUrl.trim())}
            aria-describedby={urlInvalid ? `${id}-url-err` : undefined}
          />
          {urlInvalid && (
            <p id={`${id}-url-err`} className="text-xs text-destructive">
              Enter an http(s) URL.
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          <Label htmlFor={`${id}-key`}>API key</Label>
          <PasswordInput
            id={`${id}-key`}
            value={values.apiKey}
            onChange={(e) => set("apiKey", e.target.value)}
            placeholder="Optional"
            autoComplete="off"
            className="font-mono"
          />
        </div>
        <fieldset className="grid grid-cols-1 gap-2">
          <legend className="mb-1.5 text-sm font-medium text-foreground">Headers</legend>
          <KeyValueRowsInput
            label="Header"
            keyLabel="name"
            rowSlot="endpoint-header-row"
            keyPlaceholder="X-Header"
            addLabel="Add header"
            emptyState={<p className="text-xs text-muted-foreground">No extra headers</p>}
            value={values.headers}
            onValueChange={(headers) => set("headers", headers)}
          />
        </fieldset>
        {result && (
          <InlineAlert variant={result.ok ? "success" : "destructive"} data-slot="endpoint-test-result">
            {result.ok ? (
              <div className="space-y-1.5">
                <p>
                  Connected
                  {result.latencyMs != null && <> · {Math.round(result.latencyMs)} ms</>}
                  {result.models && (
                    <>
                      {" "}
                      · {result.models.length} {pluralize(result.models.length, "model")} found
                    </>
                  )}
                </p>
                {result.models && result.models.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {result.models.slice(0, 8).map((m) => (
                      <Badge key={m} size="sm" variant="outline" className="font-mono">
                        {m}
                      </Badge>
                    ))}
                    {result.models.length > 8 && <span className="text-xs">+{result.models.length - 8} more</span>}
                  </div>
                )}
              </div>
            ) : (
              <p>{result.error ?? "Connection failed."}</p>
            )}
          </InlineAlert>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="secondary" onClick={test} loading={testing} disabled={!onTest || !isHttpUrl(values.baseUrl.trim())}>
            Test connection
          </Button>
          <div className="flex gap-2">
            {onCancel && (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit">{submitLabel}</Button>
          </div>
        </div>
      </form>
    );
  }
);
CustomEndpointForm.displayName = "CustomEndpointForm";
