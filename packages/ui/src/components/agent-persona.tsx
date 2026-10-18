import * as React from "react";
import { RiDeleteBinLine, RiImageAddLine, RiShuffleLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { capitalize } from "../lib/text";
import { useControllableState } from "../hooks/use-controllable-state";
import { useAsyncAction } from "../hooks/use-async-action";
import { Button } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Markdown } from "./markdown";
import { Field, FieldError, FieldHint, FieldLabel } from "./field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
export * from "./agent-avatar";
import { AgentAvatar, agentAvatarColors, agentAvatarFaces, agentAvatarShapes, randomAvatarSpec, type AgentAvatarSpec } from "./agent-avatar";


/* ------------------------------------------------------------------ */
/* AgentAvatarBuilder                                                  */
/* ------------------------------------------------------------------ */

function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  render,
  optionLabel,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
  render: (v: T) => React.ReactNode;
  optionLabel: (v: T) => string;
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const idx = Math.max(0, options.indexOf(value));
  const onKeyDown = (e: React.KeyboardEvent) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = (idx + d + options.length) % options.length;
    onChange(options[next]!);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className="flex flex-wrap gap-2">
      {options.map((o, i) => (
        <button
          key={o}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={o === value}
          aria-label={optionLabel(o)}
          tabIndex={o === value || (!options.includes(value) && i === 0) ? 0 : -1}
          onClick={() => onChange(o)}
          className={cn(
            "flex items-center justify-center rounded-lg border p-1.5 transition-colors",
            o === value ? "border-primary bg-primary-soft" : "border-border hover:bg-accent",
            focusRing
          )}
        >
          {render(o)}
        </button>
      ))}
    </div>
  );
}

const colorName = (c: string) => (c === "var(--primary)" ? "Brand" : c);

export interface AgentAvatarBuilderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  value?: AgentAvatarSpec;
  defaultValue?: AgentAvatarSpec;
  onValueChange?: (spec: AgentAvatarSpec) => void;
  /** Swatches. Default `agentAvatarColors`. */
  colors?: string[];
  /** Turn an uploaded file into a URL. Default reads it as a data URL. */
  onUpload?: (file: File) => string | Promise<string>;
  /** Preview size in px. Default 96. */
  previewSize?: number;
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

function newSeed() {
  return Math.random().toString(36).slice(2, 8);
}

/** Procedural agent avatar editor: shape, color, face, seeded generation and image upload, with a live preview. */
export const AgentAvatarBuilder = React.forwardRef<HTMLDivElement, AgentAvatarBuilderProps>(
  ({ value, defaultValue, onValueChange, colors = agentAvatarColors, onUpload, previewSize = 96, className, ...props }, ref) => {
    const [spec, setSpec] = useControllableState<AgentAvatarSpec>({
      value,
      defaultValue: defaultValue ?? randomAvatarSpec("agent"),
      onChange: onValueChange,
    });
    const patch = (p: Partial<AgentAvatarSpec>) => setSpec({ ...spec, ...p });
    const fileRef = React.useRef<HTMLInputElement>(null);
    const seedId = React.useId();

    const upload = async (file: File | undefined) => {
      if (!file) return;
      const url = await (onUpload ? onUpload(file) : readAsDataUrl(file));
      patch({ imageUrl: url });
    };

    return (
      <div ref={ref} data-slot="agent-avatar-builder" className={cn("flex flex-col gap-4 sm:flex-row sm:items-start", className)} {...props}>
        <div className="flex flex-col items-center gap-2 rounded-box border border-border bg-subtle p-4">
          <AgentAvatar spec={spec} size={previewSize} label="Avatar preview" />
          <span className="text-2xs text-muted-foreground">
            {capitalize(spec.shape)} · {capitalize(spec.face)}
          </span>
        </div>
        <Tabs defaultValue="shape" variant="underline" size="sm" className="min-w-0 flex-1">
          <TabsList>
            <TabsTrigger value="shape">Shape</TabsTrigger>
            <TabsTrigger value="color">Color</TabsTrigger>
            <TabsTrigger value="face">Face</TabsTrigger>
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>
          <TabsContent value="shape" className="pt-3">
            <OptionGroup
              label="Shape"
              options={agentAvatarShapes}
              value={spec.shape}
              onChange={(shape) => patch({ shape })}
              optionLabel={capitalize}
              render={(shape) => <AgentAvatar spec={{ ...spec, shape, imageUrl: undefined }} size={36} label="" />}
            />
          </TabsContent>
          <TabsContent value="color" className="pt-3">
            <OptionGroup
              label="Color"
              options={colors}
              value={spec.color}
              onChange={(color) => patch({ color })}
              optionLabel={colorName}
              render={(c) => (
                <span className="relative block size-6 rounded-full ring-1 ring-black/10" style={{ background: c }}>
                  {c === "var(--primary)" && <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-primary-foreground">B</span>}
                </span>
              )}
            />
          </TabsContent>
          <TabsContent value="face" className="pt-3">
            <OptionGroup
              label="Face"
              options={agentAvatarFaces}
              value={spec.face}
              onChange={(face) => patch({ face, imageUrl: undefined })}
              optionLabel={capitalize}
              render={(face) => <AgentAvatar spec={{ ...spec, face, imageUrl: undefined }} size={36} label="" />}
            />
          </TabsContent>
          <TabsContent value="generate" className="flex flex-col gap-2 pt-3">
            <label htmlFor={seedId} className="text-xs font-medium text-muted-foreground">
              Seed
            </label>
            <div className="flex gap-2">
              <Input
                id={seedId}
                size="sm"
                value={spec.seed}
                onChange={(e) => setSpec({ ...randomAvatarSpec(e.target.value), imageUrl: spec.imageUrl })}
                className="font-mono"
              />
              <Button size="sm" variant="secondary" leadingIcon={<RiShuffleLine aria-hidden />} onClick={() => setSpec(randomAvatarSpec(newSeed()))}>
                Shuffle
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">The same seed always draws the same avatar.</p>
          </TabsContent>
          <TabsContent value="upload" className="flex flex-col gap-2 pt-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Upload avatar image"
              tabIndex={-1}
              onChange={(e) => {
                void upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" leadingIcon={<RiImageAddLine aria-hidden />} onClick={() => fileRef.current?.click()}>
                Choose image
              </Button>
              {spec.imageUrl && (
                <Button size="sm" variant="ghost" leadingIcon={<RiDeleteBinLine aria-hidden />} onClick={() => patch({ imageUrl: undefined })}>
                  Remove image
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Cropped to the selected shape. Square images work best.</p>
          </TabsContent>
        </Tabs>
      </div>
    );
  }
);
AgentAvatarBuilder.displayName = "AgentAvatarBuilder";

/* ------------------------------------------------------------------ */
/* PersonaEditor                                                       */
/* ------------------------------------------------------------------ */

export interface PersonaEditorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  label?: React.ReactNode;
  placeholder?: string;
  /** Textarea rows. Default 8. */
  rows?: number;
  maxLength?: number;
  hint?: React.ReactNode;
}

/** Persona / SOUL.md editor: a markdown textarea with a rendered preview tab. */
export const PersonaEditor = React.forwardRef<HTMLDivElement, PersonaEditorProps>(
  (
    {
      value,
      defaultValue = "",
      onValueChange,
      label = "Persona",
      placeholder = "# Who you are\nYou are a careful research assistant…",
      rows = 8,
      maxLength,
      hint = "Markdown. Sets the agent's voice, values and boundaries (SOUL.md).",
      className,
      ...props
    },
    ref
  ) => {
    const [text, setText] = useControllableState({ value, defaultValue, onChange: onValueChange });
    const [tab, setTab] = React.useState("write");
    const id = React.useId();
    return (
      <div ref={ref} data-slot="persona-editor" className={cn("flex flex-col gap-1.5", className)} {...props}>
        <Tabs value={tab} onValueChange={setTab} variant="ghost" size="sm">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={id} className="text-sm font-medium text-foreground">
              {label}
            </label>
            <TabsList aria-label="Persona view">
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="write" className="mt-1.5" forceMount hidden={tab !== "write"}>
            <Textarea
              id={id}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              rows={rows}
              maxLength={maxLength}
              showCount={maxLength != null}
              className="font-mono text-xs"
            />
          </TabsContent>
          <TabsContent value="preview" className="mt-1.5">
            <div className="min-h-32 rounded-control border border-border bg-subtle px-3 py-2 text-sm" data-slot="persona-preview">
              {text.trim() ? <Markdown>{text}</Markdown> : <p className="text-muted-foreground">Nothing to preview</p>}
            </div>
          </TabsContent>
        </Tabs>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    );
  }
);
PersonaEditor.displayName = "PersonaEditor";

/* ------------------------------------------------------------------ */
/* CreateAgentDialog                                                   */
/* ------------------------------------------------------------------ */

export interface CreateAgentValues {
  name: string;
  avatar: AgentAvatarSpec;
  role: string;
  description: string;
  persona: string;
}

export interface CreateAgentDialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the dialog (wrapped with `asChild`). */
  trigger?: React.ReactNode;
  /** May return a promise; throw to keep the dialog open. */
  onCreate?: (values: CreateAgentValues) => void | Promise<void>;
  /** Names already taken (case-insensitive). */
  existingNames?: string[];
  defaultValues?: Partial<CreateAgentValues>;
  /** Default model picker (e.g. a `SimpleSelect`). */
  modelSlot?: React.ReactNode;
  /** Toolset picker. */
  toolsetsSlot?: React.ReactNode;
  title?: React.ReactNode;
  submitLabel?: React.ReactNode;
}

/** Validate an agent name. Returns an error message or null. */
export function validateAgentName(name: string, existing: string[] = []): string | null {
  const n = name.trim();
  if (!n) return "Give the agent a name.";
  if (n.length > 40) return "Keep it under 40 characters.";
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u.test(n)) return "Use letters, numbers, spaces, dots, dashes or underscores.";
  if (existing.some((e) => e.toLowerCase() === n.toLowerCase())) return `An agent named "${n}" already exists.`;
  return null;
}

/** Dialog for creating an agent: name, avatar, role, description, persona and model / toolset slots. */
export function CreateAgentDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  trigger,
  onCreate,
  existingNames = [],
  defaultValues,
  modelSlot,
  toolsetsSlot,
  title = "Create agent",
  submitLabel = "Create agent",
}: CreateAgentDialogProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const init = React.useCallback(
    (): CreateAgentValues => ({
      name: defaultValues?.name ?? "",
      avatar: defaultValues?.avatar ?? randomAvatarSpec(newSeed()),
      role: defaultValues?.role ?? "",
      description: defaultValues?.description ?? "",
      persona: defaultValues?.persona ?? "",
    }),
    [defaultValues]
  );
  const [values, setValues] = React.useState<CreateAgentValues>(init);
  const [nameError, setNameError] = React.useState<string | null>(null);
  const create = useAsyncAction(async (v: CreateAgentValues) => onCreate?.(v), { onSuccess: () => setOpen(false) });
  const saving = create.busy;

  React.useEffect(() => {
    if (open) {
      setValues(init());
      setNameError(null);
    }
  }, [open, init]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateAgentName(values.name, existingNames);
    setNameError(err);
    if (err) return;
    // Stays open if `onCreate` throws.
    await create.run({ ...values, name: values.name.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Agents get their own persona, avatar, model and tools.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="flex min-h-0 flex-col gap-4">
          <DialogBody className="flex flex-col gap-4 overflow-y-auto">
            <Field invalid={Boolean(nameError)} required>
              <FieldLabel>Name</FieldLabel>
              <Input
                value={values.name}
                autoFocus
                placeholder="Researcher"
                onChange={(e) => {
                  setValues({ ...values, name: e.target.value });
                  if (nameError) setNameError(null);
                }}
              />
              <FieldError>{nameError}</FieldError>
            </Field>
            <AgentAvatarBuilder value={values.avatar} onValueChange={(avatar) => setValues({ ...values, avatar })} previewSize={80} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Role</FieldLabel>
                <Input value={values.role} placeholder="Finds and cites sources" onChange={(e) => setValues({ ...values, role: e.target.value })} />
              </Field>
              {modelSlot && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Default model</span>
                  {modelSlot}
                </div>
              )}
            </div>
            <Field>
              <FieldLabel>Description</FieldLabel>
              <Textarea
                rows={2}
                value={values.description}
                placeholder="Shown in the agent roster."
                onChange={(e) => setValues({ ...values, description: e.target.value })}
              />
              <FieldHint>Optional.</FieldHint>
            </Field>
            <PersonaEditor value={values.persona} onValueChange={(persona) => setValues({ ...values, persona })} rows={6} />
            {toolsetsSlot && (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Toolsets</span>
                {toolsetsSlot}
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
CreateAgentDialog.displayName = "CreateAgentDialog";
