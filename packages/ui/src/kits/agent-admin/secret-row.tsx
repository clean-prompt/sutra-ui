/* Private to the agent-admin kit: the masked-secret row shared by ProviderKeysGroups (env keys) and ToolsetProviderDrawer (credentials). */
import * as React from "react";
import { RiCheckLine, RiDeleteBinLine, RiErrorWarningLine, RiExternalLinkLine } from "@remixicon/react";
import { useAsyncAction } from "../../hooks/use-async-action";
import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { PasswordInput } from "../../primitives/input";
import { SecretField, SecretText } from "../identity/secret";

export interface SecretRowProps {
  /** Key name (env variable or credential key); used for data attributes and the inline layout's labels. */
  name: string;
  /** Visible label of the stacked layout. */
  label?: string;
  /** Whether a value is stored. */
  isSet: boolean;
  /** Masked or stored value to show when set. */
  value?: string;
  description?: React.ReactNode;
  optional?: boolean;
  getKeyUrl?: string;
  /**
   * `inline`: a list row (name on the left; masked value + clear, or input + Save, on the right).
   * `stacked`: a labelled field with a Set badge, Replace / Remove and a "Get a key" link.
   */
  layout?: "inline" | "stacked";
  /** Store a value. May return a promise; a rejection is shown under the input. */
  onSave?: (value: string) => void | Promise<void>;
  onClear?: () => void;
}

/** Masked secret with set / replace / clear and an async save that leaves edit mode on success and shows errors. */
export function SecretRow({
  name,
  label = name,
  isSet,
  value,
  description,
  optional,
  getKeyUrl,
  layout = "stacked",
  onSave,
  onClear,
}: SecretRowProps) {
  const [editing, setEditing] = React.useState(!isSet);
  const [draft, setDraft] = React.useState("");
  const { run: save, busy, error } = useAsyncAction(async (next: string) => onSave?.(next), {
    onSuccess: () => {
      setDraft("");
      setEditing(false);
    },
    fallbackMessage: "Could not save the key",
  });
  const inputId = React.useId();
  React.useEffect(() => setEditing(!isSet), [isSet]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    await save(draft.trim());
  };
  const errorText = error ? (
    <p role="alert" className="inline-flex items-center gap-1 text-xs text-destructive">
      <RiErrorWarningLine aria-hidden className="size-3.5" />
      {error}
    </p>
  ) : null;

  if (layout === "inline") {
    return (
      <li data-slot="env-key-row" data-set={isSet || undefined} className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-center">
        <div className="min-w-0">
          <code className="block truncate font-mono text-xs font-medium text-foreground">{name}</code>
          {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
        </div>
        {isSet ? (
          <div className="flex min-w-0 items-center gap-1">
            <SecretText value={value ?? ""} label={name} variant="field" className="min-w-0 flex-1" />
            {onClear && (
              <Button variant="ghost" size="icon-sm" aria-label={`Clear ${name}`} onClick={onClear}>
                <RiDeleteBinLine aria-hidden />
              </Button>
            )}
          </div>
        ) : (
          <div className="grid min-w-0 gap-1">
            <form className="flex min-w-0 items-center gap-2" onSubmit={submit}>
              <PasswordInput
                size="sm"
                aria-label={`Value for ${name}`}
                placeholder="Not set"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoComplete="off"
                className="font-mono"
              />
              <Button type="submit" size="sm" variant="secondary" disabled={!draft.trim() || !onSave} loading={busy}>
                Save
              </Button>
            </form>
            {errorText}
          </div>
        )}
      </li>
    );
  }

  const link = getKeyUrl ? (
    <a href={getKeyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
      Get a key
      <RiExternalLinkLine aria-hidden className="size-3" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  ) : null;

  if (isSet && !editing) {
    return (
      <div className="space-y-1.5" data-credential={name} data-set="true">
        <SecretField label={label} value={value ?? "••••••••••••"} revealable={value != null} copyable={false} description={description} />
        <div className="flex items-center gap-2">
          <Badge size="sm" color="success" leadingIcon={<RiCheckLine aria-hidden className="size-3" />}>
            Set
          </Badge>
          <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>
            Replace
          </Button>
          {onClear && (
            <Button size="xs" variant="ghost" className="text-destructive" onClick={onClear}>
              Remove
            </Button>
          )}
          <span className="ml-auto">{link}</span>
        </div>
      </div>
    );
  }
  return (
    <form className="space-y-1.5" data-credential={name} data-set="false" onSubmit={submit}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
          {optional && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
        </label>
        {link}
      </div>
      <div className="flex gap-2">
        <PasswordInput id={inputId} size="sm" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Paste key" autoComplete="off" className="flex-1" wrapperClassName="flex-1" />
        <Button type="submit" size="sm" disabled={!draft.trim()} loading={busy}>
          Save
        </Button>
        {isSet && (
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        )}
      </div>
      {errorText}
      {!isSet && <p className="text-xs text-warning-soft-foreground">Not set</p>}
      {description != null && <p className="text-xs text-muted-foreground">{description}</p>}
    </form>
  );
}
