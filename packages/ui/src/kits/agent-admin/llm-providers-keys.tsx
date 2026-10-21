/** LLM provider env keys: the ProviderKeysGroups. */
import * as React from "react";
import { RiAddLine, RiExternalLinkLine } from "@remixicon/react";
import { cn, focusRing, hitArea } from "../../lib/cn";
import { isSafeHref } from "../../lib/validate";
import { Button } from "../../primitives/button";
import { Badge } from "../../primitives/badge";
import { Input, PasswordInput } from "../../primitives/input";
import { SecretRow } from "./secret-row";
import { ProviderLogo } from "./llm-providers-logo";

/* ------------------------------------------------------------------ */
/* ProviderKeysGroups                                                  */
/* ------------------------------------------------------------------ */

export interface ProviderEnvKey {
  /** Environment variable name, e.g. `NIMBUS_API_KEY`. */
  name: string;
  /** Current value; empty or undefined means unset. */
  value?: string;
  description?: React.ReactNode;
}

export interface ProviderKeyGroup {
  id: string;
  name: string;
  monogram?: string;
  color?: string;
  /** Lower comes first. */
  priority?: number;
  docsUrl?: string;
  keys: ProviderEnvKey[];
}

export interface ProviderKeysGroupsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Provider groups, each with the environment keys it needs and whether they are set. */
  groups: ProviderKeyGroup[];
  /** User-added environment keys listed in the custom section. */
  customKeys?: ProviderEnvKey[];
  /** Store a key. May return a promise; a rejection is shown under the input. */
  onSetKey?: (name: string, value: string) => void | Promise<void>;
  /** Called with the key name when the user clears a stored key. */
  onClearKey?: (name: string) => void;
  /** Called with the name and value when the user adds a custom key. */
  onAddCustomKey?: (name: string, value: string) => void;
  /** Hide the custom keys section. */
  hideCustom?: boolean;
}

function EnvKeyRow({ k, onSet, onClear }: { k: ProviderEnvKey; onSet?: (name: string, value: string) => void | Promise<void>; onClear?: (name: string) => void }) {
  return (
    <SecretRow
      layout="inline"
      name={k.name}
      isSet={!!k.value}
      value={k.value}
      description={k.description}
      onSave={onSet ? (value) => onSet(k.name, value) : undefined}
      onClear={onClear ? () => onClear(k.name) : undefined}
    />
  );
}

const ENV_NAME = /^[A-Z_][A-Z0-9_]*$/;

/** Environment keys grouped into provider cards (sorted by priority) plus a custom keys section. */
export const ProviderKeysGroups = React.forwardRef<HTMLDivElement, ProviderKeysGroupsProps>(
  ({ groups, customKeys = [], onSetKey, onClearKey, onAddCustomKey, hideCustom, className, ...props }, ref) => {
    const id = React.useId();
    const [name, setName] = React.useState("");
    const [value, setValue] = React.useState("");
    const sorted = React.useMemo(
      () => groups.map((g, i) => ({ g, i })).sort((a, b) => (a.g.priority ?? 1e9) - (b.g.priority ?? 1e9) || a.i - b.i).map((x) => x.g),
      [groups]
    );
    const nameInvalid = name !== "" && !ENV_NAME.test(name);
    return (
      <div ref={ref} data-slot="provider-keys-groups" className={cn("grid w-full grid-cols-1 gap-4", className)} {...props}>
        {sorted.map((g) => {
          const setCount = g.keys.filter((k) => k.value).length;
          return (
            <section key={g.id} aria-labelledby={`${id}-${g.id}`} data-slot="provider-key-group" className="overflow-hidden rounded-box border border-border bg-card shadow-xs">
              <header className="flex items-center gap-3 border-b border-border px-4 py-3">
                <ProviderLogo name={g.name} monogram={g.monogram} color={g.color} size="sm" />
                <h3 id={`${id}-${g.id}`} className="flex-1 text-sm font-semibold text-foreground">
                  {g.name}
                </h3>
                <Badge size="sm" color={setCount > 0 ? "success" : "neutral"}>
                  <bdi dir="ltr">{setCount}/{g.keys.length} set</bdi>
                </Badge>
                {g.docsUrl && isSafeHref(g.docsUrl) && (
                  <a href={g.docsUrl} target="_blank" rel="noreferrer noopener" className={cn(hitArea, "inline-flex items-center gap-1 rounded-xs text-xs font-medium text-primary hover:underline", focusRing)}>
                    Get a key
                    <RiExternalLinkLine aria-hidden className="size-3" />
                  </a>
                )}
              </header>
              <ul className="divide-y divide-border">
                {g.keys.map((k) => (
                  <EnvKeyRow key={k.name} k={k} onSet={onSetKey} onClear={onClearKey} />
                ))}
              </ul>
            </section>
          );
        })}
        {!hideCustom && (
          <section aria-labelledby={`${id}-custom`} className="overflow-hidden rounded-box border border-dashed border-border-strong bg-card">
            <header className="border-b border-border px-4 py-3">
              <h3 id={`${id}-custom`} className="text-sm font-semibold text-foreground">
                Custom keys
              </h3>
              <p className="text-xs text-muted-foreground">Extra environment variables passed to the agent.</p>
            </header>
            {customKeys.length > 0 && (
              <ul className="divide-y divide-border">
                {customKeys.map((k) => (
                  <EnvKeyRow key={k.name} k={k} onSet={onSetKey} onClear={onClearKey} />
                ))}
              </ul>
            )}
            {onAddCustomKey && (
              <form
                className="flex flex-wrap items-start gap-2 border-t border-border px-4 py-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!ENV_NAME.test(name) || !value) return;
                  onAddCustomKey(name, value);
                  setName("");
                  setValue("");
                }}
              >
                <div className="grid min-w-40 flex-1 gap-1">
                  <Input
                    size="sm"
                    aria-label="Variable name"
                    placeholder="MY_VARIABLE"
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    className="font-mono"
                    invalid={nameInvalid}
                  />
                  {nameInvalid && <p className="text-xs text-destructive">Use A–Z, 0–9 and _.</p>}
                </div>
                <PasswordInput size="sm" aria-label="Variable value" placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} wrapperClassName="min-w-40 flex-1" className="font-mono" />
                <Button type="submit" size="sm" variant="secondary" leadingIcon={<RiAddLine aria-hidden />} disabled={!ENV_NAME.test(name) || !value}>
                  Add
                </Button>
              </form>
            )}
          </section>
        )}
      </div>
    );
  }
);
ProviderKeysGroups.displayName = "ProviderKeysGroups";
