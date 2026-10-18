import * as React from "react";
import {
  Button,
  Calendar,
  Checkbox,
  CheckboxCard,
  CheckboxField,
  CheckboxGroup,
  CheckboxGroupItem,
  CheckboxGroupSelectAll,
  Combobox,
  type ComboboxOption,
  DatePicker,
  type DateRange,
  DateRangePicker,
  Dropzone,
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldHint,
  FieldLabel,
  FieldLegend,
  Fieldset,
  FileUpload,
  FileUploadDropzone,
  FileUploadList,
  FileUploadTrigger,
  type FileRejection,
  formatBytes,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
  Label,
  NumberInput,
  OTPField,
  PasswordInput,
  PasswordStrength,
  RadioCard,
  RadioField,
  RadioGroup,
  RadioGroupField,
  RadioGroupItem,
  RangeSlider,
  Rating,
  RatingSummary,
  SearchInput,
  SegmentedControl,
  SegmentedControlItem,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  SimpleSelect,
  Slider,
  Switch,
  SwitchField,
  SwitchGroup,
  TagInput,
  Textarea,
  type UploadFile,
} from "@sutra/ui";
import {
  RiAlignCenter,
  RiAlignLeft,
  RiAlignRight,
  RiArrowUpLine,
  RiAtLine,
  RiBankCardLine,
  RiBuildingLine,
  RiCalendarLine,
  RiCheckLine,
  RiCloseLine,
  RiComputerLine,
  RiFileCopyLine,
  RiGlobalLine,
  RiGridLine,
  RiHeartFill,
  RiImageLine,
  RiListCheck,
  RiLockLine,
  RiMailLine,
  RiMoonLine,
  RiPaypalLine,
  RiSendPlaneLine,
  RiSunLine,
  RiUserLine,
} from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

/* ------------------------------------------------------------------ */
/* Shared sample data                                                  */
/* ------------------------------------------------------------------ */

const timezones = [
  { value: "pst", label: "Pacific Time (PT)", description: "UTC−08:00" },
  { value: "est", label: "Eastern Time (ET)", description: "UTC−05:00" },
  { value: "gmt", label: "Greenwich Mean Time", description: "UTC±00:00" },
  { value: "cet", label: "Central European Time", description: "UTC+01:00" },
  { value: "kst", label: "Korea Standard Time", description: "UTC+09:00" },
];

const frameworks: ComboboxOption[] = [
  { value: "react", label: "React", group: "Frontend" },
  { value: "vue", label: "Vue", group: "Frontend" },
  { value: "svelte", label: "Svelte", group: "Frontend" },
  { value: "solid", label: "SolidJS", group: "Frontend" },
  { value: "express", label: "Express", group: "Backend", keywords: ["node"] },
  { value: "fastapi", label: "FastAPI", group: "Backend", keywords: ["python"] },
  { value: "rails", label: "Ruby on Rails", group: "Backend", keywords: ["ruby"] },
  { value: "phoenix", label: "Phoenix", group: "Backend", keywords: ["elixir"], disabled: true },
];

const countries: ComboboxOption[] = [
  { value: "kr", label: "South Korea" },
  { value: "jp", label: "Japan" },
  { value: "us", label: "United States" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
  { value: "br", label: "Brazil" },
  { value: "in", label: "India" },
  { value: "ca", label: "Canada" },
];

function formatDate(date: Date | undefined) {
  return date ? date.toLocaleDateString(undefined, { dateStyle: "medium" }) : "none";
}

function Value({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground">
      Value: <span className="font-mono text-foreground">{children}</span>
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Demos                                                               */
/* ------------------------------------------------------------------ */

function InputDemo() {
  const [email, setEmail] = React.useState("ada@lovelace.dev");
  return (
    <div className="grid w-full gap-8 md:grid-cols-2">
      <div className="space-y-3">
        <DemoLabel>Sizes</DemoLabel>
        <Input size="sm" placeholder="Small" aria-label="Small input" />
        <Input size="md" placeholder="Medium (default)" aria-label="Medium input" />
        <Input size="lg" placeholder="Large" aria-label="Large input" />
      </div>
      <div className="space-y-3">
        <DemoLabel>Icons, addons and clear</DemoLabel>
        <Input
          leadingIcon={<RiMailLine />}
          placeholder="you@company.com"
          clearable
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email"
        />
        <Input prefix="https://" suffix=".com" placeholder="your-site" aria-label="Website" />
        <Input leadingIcon={<RiUserLine />} trailingIcon={<RiCheckLine className="text-success" />} defaultValue="adalovelace" aria-label="Username" />
      </div>
      <div className="space-y-3">
        <DemoLabel>States</DemoLabel>
        <Input invalid defaultValue="not-an-email" aria-label="Invalid input" />
        <Input disabled placeholder="Disabled" aria-label="Disabled input" />
        <Input readOnly defaultValue="Read only value" aria-label="Read-only input" />
      </div>
      <div className="space-y-3">
        <DemoLabel>Controlled</DemoLabel>
        <Value>{email || "(empty)"}</Value>
      </div>
    </div>
  );
}

function SearchInputDemo() {
  const [query, setQuery] = React.useState("");
  return (
    <div className="w-full max-w-sm space-y-3">
      <SearchInput hotkey="mod+k" placeholder="Search docs…" value={query} onChange={(e) => setQuery(e.target.value)} onClear={() => setQuery("")} aria-label="Search docs" />
      <SearchInput hotkey="/" size="sm" placeholder="Filter members" aria-label="Filter members" />
      <Value>{query || "(empty)"}</Value>
    </div>
  );
}

function InputOTPDemo() {
  const [code, setCode] = React.useState("");
  return (
    <div className="grid w-full gap-8 md:grid-cols-2">
      <div className="space-y-3">
        <DemoLabel>OTPField, grouped 3 + 3 (controlled)</DemoLabel>
        <OTPField length={6} groupSize={3} value={code} onChange={setCode} aria-label="Verification code" />
        <Value>{code || "(empty)"}</Value>
      </div>
      <div className="space-y-3">
        <DemoLabel>Composed InputOTP, small</DemoLabel>
        <InputOTP maxLength={4} size="sm" aria-label="PIN">
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
        </InputOTP>
      </div>
      <div className="space-y-3">
        <DemoLabel>Large</DemoLabel>
        <OTPField length={4} size="lg" aria-label="Large code" />
      </div>
      <div className="space-y-3">
        <DemoLabel>Invalid / disabled</DemoLabel>
        <OTPField length={6} invalid defaultValue="123" aria-label="Invalid code" />
        <OTPField length={6} disabled aria-label="Disabled code" />
      </div>
    </div>
  );
}

function TextareaDemo() {
  const [bio, setBio] = React.useState("Product designer in Seoul. I like type, maps and slow coffee.");
  return (
    <div className="grid w-full gap-8 md:grid-cols-2">
      <div className="space-y-2">
        <DemoLabel>Default</DemoLabel>
        <Textarea placeholder="Leave a comment…" aria-label="Comment" />
      </div>
      <div className="space-y-2">
        <DemoLabel>Auto-resize (2–6 rows) with counter</DemoLabel>
        <Textarea autoResize minRows={2} maxRows={6} showCount maxLength={160} value={bio} onChange={(e) => setBio(e.target.value)} aria-label="Bio" />
        <Value>{bio.length} chars</Value>
      </div>
      <div className="space-y-2">
        <DemoLabel>Invalid</DemoLabel>
        <Textarea invalid defaultValue="Too short" aria-label="Invalid textarea" />
      </div>
      <div className="space-y-2">
        <DemoLabel>Disabled</DemoLabel>
        <Textarea disabled placeholder="Comments are closed" aria-label="Disabled textarea" />
      </div>
    </div>
  );
}

function NumberInputDemo() {
  const [qty, setQty] = React.useState<number | null>(2);
  const [price, setPrice] = React.useState<number | null>(49.99);
  return (
    <div className="grid w-full gap-8 md:grid-cols-2">
      <div className="space-y-2">
        <DemoLabel>Split layout, 1–10</DemoLabel>
        <NumberInput layout="split" min={1} max={10} value={qty} onValueChange={setQty} aria-label="Quantity" />
        <Value>{String(qty)}</Value>
      </div>
      <div className="space-y-2">
        <DemoLabel>Stacked, currency formatting</DemoLabel>
        <NumberInput
          layout="stacked"
          min={0}
          step={0.5}
          precision={2}
          formatOptions={{ style: "currency", currency: "USD" }}
          value={price}
          onValueChange={setPrice}
          aria-label="Price"
        />
        <Value>{String(price)}</Value>
      </div>
      <div className="space-y-2">
        <DemoLabel>Sizes</DemoLabel>
        <div className="flex flex-wrap items-center gap-3">
          <NumberInput size="sm" defaultValue={1} wrapperClassName="w-28" aria-label="Small number" />
          <NumberInput size="md" defaultValue={2} wrapperClassName="w-32" aria-label="Medium number" />
          <NumberInput size="lg" defaultValue={3} wrapperClassName="w-36" aria-label="Large number" />
        </div>
      </div>
      <div className="space-y-2">
        <DemoLabel>Percent / invalid / disabled</DemoLabel>
        <NumberInput defaultValue={0.25} step={0.05} min={0} max={1} formatOptions={{ style: "percent" }} aria-label="Discount" />
        <NumberInput invalid defaultValue={120} max={100} aria-label="Invalid number" />
        <NumberInput disabled defaultValue={5} aria-label="Disabled number" />
      </div>
    </div>
  );
}

function TagInputDemo() {
  const [tags, setTags] = React.useState(["design", "react"]);
  const [rejected, setRejected] = React.useState<string | null>(null);
  return (
    <div className="grid w-full gap-8 md:grid-cols-2">
      <div className="space-y-2">
        <DemoLabel>Controlled, max 5 tags</DemoLabel>
        <TagInput
          value={tags}
          onValueChange={setTags}
          max={5}
          placeholder="Add a topic…"
          onReject={(tag, reason) => setRejected(`"${tag}" rejected: ${reason}`)}
          aria-label="Topics"
        />
        <Value>{JSON.stringify(tags)}</Value>
        {rejected && <p className="text-xs text-destructive">{rejected}</p>}
      </div>
      <div className="space-y-2">
        <DemoLabel>Suggestions only</DemoLabel>
        <TagInput
          suggestions={["Engineering", "Design", "Marketing", "Sales", "Support", "Finance"]}
          restrictToSuggestions
          defaultValue={["Design"]}
          placeholder="Pick teams…"
          aria-label="Teams"
        />
      </div>
      <div className="space-y-2">
        <DemoLabel>Email validation, small</DemoLabel>
        <TagInput
          size="sm"
          separators={[",", " "]}
          addOnBlur
          validate={(tag) => /^\S+@\S+\.\S+$/.test(tag)}
          placeholder="name@company.com"
          aria-label="Invite emails"
        />
      </div>
      <div className="space-y-2">
        <DemoLabel>Invalid / disabled</DemoLabel>
        <TagInput invalid defaultValue={["urgent"]} aria-label="Invalid tags" />
        <TagInput disabled defaultValue={["archived", "2024"]} aria-label="Disabled tags" />
      </div>
    </div>
  );
}

function CheckboxDemo() {
  const [terms, setTerms] = React.useState<boolean | "indeterminate">(false);
  const [notify, setNotify] = React.useState<string[]>(["mentions"]);
  const [addons, setAddons] = React.useState<string[]>(["backups"]);
  return (
    <div className="grid w-full gap-8 md:grid-cols-2">
      <div className="space-y-3">
        <DemoLabel>Bare checkbox: states and sizes</DemoLabel>
        <div className="flex flex-wrap items-center gap-4">
          <Checkbox aria-label="Unchecked" />
          <Checkbox defaultChecked aria-label="Checked" />
          <Checkbox checked="indeterminate" aria-label="Indeterminate" />
          <Checkbox size="sm" defaultChecked aria-label="Small" />
          <Checkbox invalid aria-label="Invalid" />
          <Checkbox disabled defaultChecked aria-label="Disabled" />
        </div>
        <CheckboxField
          label="I agree to the terms of service"
          description="You can withdraw consent at any time."
          checked={terms}
          onCheckedChange={setTerms}
        />
        <Value>{String(terms)}</Value>
      </div>
      <div className="space-y-3">
        <DemoLabel>CheckboxGroup with select all</DemoLabel>
        <CheckboxGroup label="Email me about" value={notify} onValueChange={setNotify}>
          <CheckboxGroupSelectAll />
          <CheckboxGroupItem value="mentions" label="Mentions" description="When someone @mentions you." />
          <CheckboxGroupItem value="replies" label="Replies" />
          <CheckboxGroupItem value="digest" label="Weekly digest" />
          <CheckboxGroupItem value="billing" label="Billing" disabled />
        </CheckboxGroup>
        <Value>{JSON.stringify(notify)}</Value>
      </div>
      <div className="space-y-3">
        <DemoLabel>Horizontal, from options</DemoLabel>
        <CheckboxGroup
          orientation="horizontal"
          defaultValue={["mon", "wed"]}
          aria-label="Days"
          options={[
            { value: "mon", label: "Mon" },
            { value: "tue", label: "Tue" },
            { value: "wed", label: "Wed" },
            { value: "thu", label: "Thu" },
            { value: "fri", label: "Fri" },
          ]}
        />
      </div>
      <div className="space-y-3 md:col-span-2">
        <DemoLabel>CheckboxCard</DemoLabel>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { value: "backups", label: "Daily backups", description: "$4 / month", icon: <RiFileCopyLine className="size-5" /> },
            { value: "cdn", label: "Global CDN", description: "$9 / month", icon: <RiGlobalLine className="size-5" /> },
            { value: "sso", label: "SAML SSO", description: "Enterprise only", icon: <RiLockLine className="size-5" />, disabled: true },
          ].map((a) => (
            <CheckboxCard
              key={a.value}
              label={a.label}
              description={a.description}
              icon={a.icon}
              disabled={a.disabled}
              checked={addons.includes(a.value)}
              onCheckedChange={(c) =>
                setAddons((prev) => (c === true ? [...prev, a.value] : prev.filter((v) => v !== a.value)))
              }
            />
          ))}
        </div>
        <Value>{JSON.stringify(addons)}</Value>
      </div>
    </div>
  );
}

function RadioDemo() {
  const [plan, setPlan] = React.useState("pro");
  const [payment, setPayment] = React.useState("card");
  return (
    <div className="grid w-full gap-8 md:grid-cols-2">
      <div className="space-y-3">
        <DemoLabel>RadioGroup + RadioField</DemoLabel>
        <RadioGroup value={plan} onValueChange={setPlan} aria-label="Plan">
          <RadioField value="free" label="Free" description="For personal projects." />
          <RadioField value="pro" label="Pro" description="For growing teams." />
          <RadioField value="enterprise" label="Enterprise" description="Contact sales." disabled />
        </RadioGroup>
        <Value>{plan}</Value>
      </div>
      <div className="space-y-3">
        <DemoLabel>Bare items, horizontal, small / invalid</DemoLabel>
        <RadioGroup orientation="horizontal" defaultValue="m" aria-label="Size">
          {["s", "m", "l", "xl"].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <RadioGroupItem value={s} id={`size-${s}`} size="sm" />
              <Label htmlFor={`size-${s}`}>{s.toUpperCase()}</Label>
            </div>
          ))}
        </RadioGroup>
        <RadioGroup invalid aria-label="Required choice" orientation="horizontal">
          <RadioField value="yes" label="Yes" />
          <RadioField value="no" label="No" />
        </RadioGroup>
      </div>
      <div className="space-y-3 md:col-span-2">
        <DemoLabel>RadioCard</DemoLabel>
        <RadioGroup value={payment} onValueChange={setPayment} className="grid gap-3 sm:grid-cols-3" aria-label="Payment method">
          <RadioCard value="card" label="Card" description="Visa, Mastercard, Amex" icon={<RiBankCardLine className="size-5" />} />
          <RadioCard value="paypal" label="PayPal" description="Pay with your account" icon={<RiPaypalLine className="size-5" />} />
          <RadioCard value="invoice" label="Invoice" description="Net 30 terms" icon={<RiBuildingLine className="size-5" />} indicatorPosition="start" />
        </RadioGroup>
        <Value>{payment}</Value>
      </div>
      <div className="space-y-3 md:col-span-2">
        <DemoLabel>RadioGroupField (data-driven, card variant)</DemoLabel>
        <RadioGroupField
          label="Deployment region"
          description="Choose where your data is stored."
          variant="card"
          defaultValue="ap"
          orientation="horizontal"
          options={[
            { value: "us", label: "US East", description: "Virginia" },
            { value: "eu", label: "EU West", description: "Frankfurt" },
            { value: "ap", label: "Asia Pacific", description: "Seoul" },
          ]}
        />
      </div>
    </div>
  );
}

function SwitchDemo() {
  const [wifi, setWifi] = React.useState(true);
  const [prefs, setPrefs] = React.useState<Record<string, boolean>>({ push: true, email: false, sms: false });
  return (
    <div className="grid w-full gap-8 md:grid-cols-2">
      <div className="space-y-3">
        <DemoLabel>Sizes, icons and states</DemoLabel>
        <div className="flex flex-wrap items-center gap-4">
          <Switch size="sm" defaultChecked aria-label="Small" />
          <Switch size="md" defaultChecked aria-label="Medium" />
          <Switch size="lg" defaultChecked aria-label="Large" />
          <Switch
            size="lg"
            checkedIcon={<RiMoonLine className="text-primary" />}
            uncheckedIcon={<RiSunLine className="text-warning" />}
            aria-label="Dark mode"
          />
          <Switch invalid aria-label="Invalid" />
          <Switch disabled defaultChecked aria-label="Disabled" />
        </div>
        <SwitchField label="Wi-Fi" description="Connect to known networks automatically." labelPosition="left" checked={wifi} onCheckedChange={setWifi} />
        <SwitchField label="Remember me" labelPosition="right" defaultChecked />
        <Value>{String(wifi)}</Value>
      </div>
      <div className="space-y-3">
        <DemoLabel>SwitchGroup (card)</DemoLabel>
        <SwitchGroup
          legend="Notifications"
          description="Choose how we reach you."
          variant="card"
          value={prefs}
          onValueChange={setPrefs}
          options={[
            { value: "push", label: "Push", description: "On your devices." },
            { value: "email", label: "Email", description: "Sent to ada@lovelace.dev." },
            { value: "sms", label: "SMS", description: "Requires a verified number.", disabled: true },
          ]}
        />
        <Value>{JSON.stringify(prefs)}</Value>
      </div>
    </div>
  );
}

function SelectDemo() {
  const [tz, setTz] = React.useState("kst");
  const [role, setRole] = React.useState<string>();
  return (
    <div className="grid w-full gap-8 md:grid-cols-2">
      <div className="space-y-2">
        <DemoLabel>Compound, with groups</DemoLabel>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger leadingIcon={<RiUserLine className="size-4" />} aria-label="Role">
            <SelectValue placeholder="Assign a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Workspace</SelectLabel>
              <SelectItem value="owner" description="Full access, including billing.">Owner</SelectItem>
              <SelectItem value="admin" description="Manage members and settings.">Admin</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Project</SelectLabel>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
              <SelectItem value="guest" disabled>Guest</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Value>{role ?? "none"}</Value>
      </div>
      <div className="space-y-2">
        <DemoLabel>SimpleSelect (data-driven)</DemoLabel>
        <SimpleSelect options={timezones} value={tz} onValueChange={setTz} leadingIcon={<RiGlobalLine className="size-4" />} aria-label="Timezone" />
        <Value>{tz}</Value>
      </div>
      <div className="space-y-2">
        <DemoLabel>Sizes</DemoLabel>
        <SimpleSelect size="sm" options={timezones} placeholder="Small" aria-label="Small select" />
        <SimpleSelect size="lg" options={timezones} placeholder="Large" aria-label="Large select" />
      </div>
      <div className="space-y-2">
        <DemoLabel>Invalid / disabled</DemoLabel>
        <SimpleSelect invalid options={timezones} placeholder="Pick a timezone" aria-label="Invalid select" />
        <SimpleSelect disabled options={timezones} defaultValue="gmt" aria-label="Disabled select" />
      </div>
    </div>
  );
}

function DatePickerDemo() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  return (
    <div className="grid w-full gap-8 md:grid-cols-2">
      <div className="space-y-2">
        <DemoLabel>Controlled, clearable</DemoLabel>
        <DatePicker value={date} onValueChange={setDate} clearable aria-label="Due date" />
        <Value>{formatDate(date)}</Value>
      </div>
      <div className="space-y-2">
        <DemoLabel>Birthday: dropdown caption, past dates only</DemoLabel>
        <DatePicker captionLayout="dropdown" placeholder="Date of birth" disabledDates={{ after: new Date() }} formatOptions={{ dateStyle: "long" }} aria-label="Date of birth" />
      </div>
      <div className="space-y-2">
        <DemoLabel>Weekdays only, small</DemoLabel>
        <DatePicker size="sm" placeholder="Pick a weekday" disabledDates={{ dayOfWeek: [0, 6] }} aria-label="Weekday" />
      </div>
      <div className="space-y-2">
        <DemoLabel>Invalid / disabled</DemoLabel>
        <DatePicker invalid placeholder="Required" aria-label="Invalid date" />
        <DatePicker disabled defaultValue={new Date(2026, 0, 1)} aria-label="Disabled date" />
      </div>
    </div>
  );
}

function DateRangePickerDemo() {
  const [range, setRange] = React.useState<DateRange | undefined>(() => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 6);
    return { from, to };
  });
  return (
    <div className="grid w-full gap-8 md:grid-cols-2">
      <div className="space-y-2">
        <DemoLabel>With presets (controlled)</DemoLabel>
        <DateRangePicker value={range} onValueChange={setRange} clearable aria-label="Report period" />
        <Value>
          {formatDate(range?.from)} → {formatDate(range?.to)}
        </Value>
      </div>
      <div className="space-y-2">
        <DemoLabel>No presets, one month</DemoLabel>
        <DateRangePicker presets={[]} numberOfMonths={1} placeholder="Check-in – check-out" disabledDates={{ before: new Date() }} aria-label="Stay" />
      </div>
    </div>
  );
}

function CalendarDemo() {
  const [day, setDay] = React.useState<Date | undefined>(new Date());
  const [range, setRange] = React.useState<DateRange | undefined>();
  return (
    <div className="flex w-full flex-wrap items-start gap-6">
      <div className="space-y-2">
        <DemoLabel>Single</DemoLabel>
        <div className="rounded-box border border-border bg-card shadow-xs">
          <Calendar mode="single" selected={day} onSelect={setDay} />
        </div>
        <Value>{formatDate(day)}</Value>
      </div>
      <div className="space-y-2">
        <DemoLabel>Range, two months, no weekends</DemoLabel>
        <div className="rounded-box border border-border bg-card shadow-xs">
          <Calendar mode="range" numberOfMonths={2} selected={range} onSelect={setRange} disabled={{ dayOfWeek: [0, 6] }} />
        </div>
        <Value>
          {formatDate(range?.from)} → {formatDate(range?.to)}
        </Value>
      </div>
    </div>
  );
}

function SegmentedControlDemo() {
  const [view, setView] = React.useState("list");
  return (
    <div className="grid w-full gap-8 md:grid-cols-2">
      <div className="space-y-3">
        <DemoLabel>Text (controlled)</DemoLabel>
        <SegmentedControl
          value={view}
          onValueChange={setView}
          aria-label="View"
          options={[
            { value: "list", label: "List" },
            { value: "board", label: "Board" },
            { value: "timeline", label: "Timeline" },
            { value: "calendar", label: "Calendar", disabled: true },
          ]}
        />
        <Value>{view}</Value>
      </div>
      <div className="space-y-3">
        <DemoLabel>Icon + label, icon-only</DemoLabel>
        <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl defaultValue="system" aria-label="Theme">
          <SegmentedControlItem value="light" icon={<RiSunLine className="size-4" />}>Light</SegmentedControlItem>
          <SegmentedControlItem value="dark" icon={<RiMoonLine className="size-4" />}>Dark</SegmentedControlItem>
          <SegmentedControlItem value="system" icon={<RiComputerLine className="size-4" />}>System</SegmentedControlItem>
        </SegmentedControl>
        <SegmentedControl
          defaultValue="left"
          aria-label="Alignment"
          options={[
            { value: "left", icon: <RiAlignLeft className="size-4" />, "aria-label": "Align left" },
            { value: "center", icon: <RiAlignCenter className="size-4" />, "aria-label": "Align center" },
            { value: "right", icon: <RiAlignRight className="size-4" />, "aria-label": "Align right" },
          ]}
        />
        </div>
      </div>
      <div className="space-y-3">
        <DemoLabel>Sizes</DemoLabel>
        <div className="flex flex-col items-start gap-3">
        {(["sm", "md", "lg"] as const).map((size) => (
          <SegmentedControl
            key={size}
            size={size}
            defaultValue="month"
            aria-label={`Range ${size}`}
            options={[
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
          />
        ))}
        </div>
      </div>
      <div className="space-y-3">
        <DemoLabel>Full width</DemoLabel>
        <SegmentedControl
          fullWidth
          defaultValue="grid"
          aria-label="Layout"
          options={[
            { value: "grid", label: "Grid", icon: <RiGridLine className="size-4" /> },
            { value: "list", label: "List", icon: <RiListCheck className="size-4" /> },
          ]}
        />
      </div>
    </div>
  );
}

function SliderDemo() {
  const [volume, setVolume] = React.useState([60]);
  const [price, setPrice] = React.useState([200, 800]);
  return (
    <div className="grid w-full gap-10 md:grid-cols-2">
      <div className="space-y-4">
        <DemoLabel>Slider with value bubble (controlled)</DemoLabel>
        <Slider value={volume} onValueChange={setVolume} showValue thumbLabels={["Volume"]} />
        <Value>{volume[0]}</Value>
      </div>
      <div className="space-y-4">
        <DemoLabel>RangeSlider, currency (controlled)</DemoLabel>
        <RangeSlider
          min={0}
          max={1000}
          step={10}
          value={price}
          onValueChange={setPrice}
          showValue
          formatValue={(v) => `$${v}`}
          thumbLabels={["Minimum price", "Maximum price"]}
        />
        <Value>
          ${price[0]} – ${price[1]}
        </Value>
      </div>
      <div className="space-y-6">
        <DemoLabel>Sizes</DemoLabel>
        <Slider size="sm" defaultValue={[25]} aria-label="Small slider" />
        <Slider size="md" defaultValue={[50]} aria-label="Medium slider" />
        <Slider size="lg" defaultValue={[75]} aria-label="Large slider" />
      </div>
      <div className="space-y-6">
        <DemoLabel>Marks, always-on value, disabled</DemoLabel>
        <Slider
          min={0}
          max={4}
          step={1}
          defaultValue={[2]}
          showValue="always"
          marks={[
            { value: 0, label: "XS" },
            { value: 1, label: "S" },
            { value: 2, label: "M" },
            { value: 3, label: "L" },
            { value: 4, label: "XL" },
          ]}
          formatValue={(v) => ["XS", "S", "M", "L", "XL"][v]}
          aria-label="T-shirt size"
        />
        <Slider disabled defaultValue={[40]} aria-label="Disabled slider" />
      </div>
    </div>
  );
}

function RatingDemo() {
  const [score, setScore] = React.useState(3.5);
  return (
    <div className="grid w-full gap-8 md:grid-cols-2">
      <div className="space-y-3">
        <DemoLabel>Half stars (controlled)</DemoLabel>
        <Rating value={score} onValueChange={setScore} allowHalf aria-label="Your rating" />
        <Value>{score}</Value>
        <DemoLabel>Sizes</DemoLabel>
        <Rating size="sm" defaultValue={4} aria-label="Small rating" />
        <Rating size="lg" defaultValue={4} aria-label="Large rating" />
        <DemoLabel>Custom icon, read-only, disabled</DemoLabel>
        <Rating icon={RiHeartFill} activeClassName="text-destructive" defaultValue={3} max={5} aria-label="Hearts" />
        <Rating readOnly value={4.5} allowHalf aria-label="Average rating" />
        <Rating disabled defaultValue={2} aria-label="Disabled rating" />
      </div>
      <div className="space-y-3">
        <DemoLabel>RatingSummary</DemoLabel>
        <RatingSummary average={4.3} distribution={{ 5: 812, 4: 304, 3: 96, 2: 31, 1: 22 }} className="max-w-sm" />
      </div>
    </div>
  );
}

function FileUploadDemo() {
  const [files, setFiles] = React.useState<UploadFile[]>(() => [
    {
      id: "seed",
      file: new File([new Uint8Array(284_000)], "brand-guidelines.pdf", { type: "application/pdf" }),
      status: "succeeded",
      progress: 100,
    },
  ]);
  const timers = React.useRef<number[]>([]);

  React.useEffect(() => () => timers.current.forEach(clearInterval), []);

  const simulateUpload = (added: UploadFile[]) => {
    added.forEach((item) => {
      const id = window.setInterval(() => {
        setFiles((prev) =>
          prev.map((f) => {
            if (f.id !== item.id) return f;
            const progress = Math.min(100, (f.progress ?? 0) + 12);
            if (progress >= 100) clearInterval(id);
            return { ...f, progress, status: progress >= 100 ? "succeeded" : "running" };
          })
        );
      }, 250);
      timers.current.push(id);
    });
  };

  return (
    <div className="grid w-full gap-8 md:grid-cols-2">
      <div className="space-y-3">
        <DemoLabel>Dropzone + list with simulated progress</DemoLabel>
        <FileUpload
          files={files}
          onFilesChange={setFiles}
          onFilesAdded={simulateUpload}
          accept="image/*,.pdf"
          maxSize={5 * 1024 * 1024}
          maxFiles={4}
        >
          <FileUploadDropzone />
          <FileUploadList />
        </FileUpload>
      </div>
      <div className="space-y-3">
        <DemoLabel>Button trigger, single file</DemoLabel>
        <FileUpload multiple={false} accept="image/*">
          <FileUploadTrigger leadingIcon={<RiImageLine />}>Choose avatar</FileUploadTrigger>
          <FileUploadList />
        </FileUpload>
        <DemoLabel>Disabled</DemoLabel>
        <FileUpload disabled>
          <FileUploadTrigger />
        </FileUpload>
      </div>
    </div>
  );
}

function DropzoneDemo() {
  const [accepted, setAccepted] = React.useState<File[]>([]);
  const [rejections, setRejections] = React.useState<FileRejection[]>([]);
  return (
    <div className="grid w-full gap-8 md:grid-cols-2">
      <div className="space-y-3">
        <DemoLabel>Images up to 2 MB</DemoLabel>
        <Dropzone
          accept="image/*"
          maxSize={2 * 1024 * 1024}
          onDrop={(files, rejected) => {
            setAccepted(files);
            setRejections(rejected);
          }}
        />
        {accepted.length > 0 && (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {accepted.map((f) => (
              <li key={f.name}>
                <RiCheckLine className="mr-1 inline size-3.5 text-success" />
                {f.name} · {formatBytes(f.size)}
              </li>
            ))}
          </ul>
        )}
        {rejections.length > 0 && (
          <ul className="space-y-1 text-xs text-destructive">
            {rejections.map((r) => (
              <li key={r.file.name}>
                <RiCloseLine className="mr-1 inline size-3.5" />
                {r.file.name}: {r.errors[0]?.message}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-3">
        <DemoLabel>Compact, custom copy</DemoLabel>
        <Dropzone density="compact" accept=".csv" title="Import contacts" hint="CSV, up to 1,000 rows" />
        <DemoLabel>Disabled</DemoLabel>
        <Dropzone density="compact" disabled title="Uploads paused" hint="Storage quota reached" />
      </div>
    </div>
  );
}

function ComboboxDemo() {
  const [framework, setFramework] = React.useState("react");
  const [selected, setSelected] = React.useState<string[]>(["kr", "jp"]);
  const [labels, setLabels] = React.useState<ComboboxOption[]>([
    { value: "bug", label: "bug" },
    { value: "feature", label: "feature" },
    { value: "docs", label: "docs" },
  ]);
  const [label, setLabel] = React.useState<string>();
  return (
    <div className="grid w-full gap-8 md:grid-cols-2">
      <div className="space-y-2">
        <DemoLabel>Single, grouped (controlled)</DemoLabel>
        <Combobox options={frameworks} value={framework} onValueChange={setFramework} placeholder="Select framework" aria-label="Framework" />
        <Value>{framework || "none"}</Value>
      </div>
      <div className="space-y-2">
        <DemoLabel>Multiple with chips (max 2 shown)</DemoLabel>
        <Combobox multiple options={countries} value={selected} onValueChange={setSelected} maxChips={2} placeholder="Select countries" aria-label="Countries" />
        <Value>{JSON.stringify(selected)}</Value>
      </div>
      <div className="space-y-2">
        <DemoLabel>Creatable</DemoLabel>
        <Combobox
          options={labels}
          value={label}
          onValueChange={setLabel}
          creatable
          onCreate={(q) => {
            const value = q.toLowerCase().replace(/\s+/g, "-");
            setLabels((prev) => [...prev, { value, label: q }]);
            setLabel(value);
          }}
          placeholder="Add a label"
          aria-label="Label"
        />
        <Value>{label ?? "none"}</Value>
      </div>
      <div className="space-y-2">
        <DemoLabel>Small / invalid / disabled</DemoLabel>
        <Combobox size="sm" options={countries} placeholder="Small" aria-label="Small combobox" />
        <Combobox invalid options={countries} placeholder="Required" aria-label="Invalid combobox" />
        <Combobox disabled options={countries} defaultValue="de" aria-label="Disabled combobox" />
      </div>
    </div>
  );
}

function PasswordInputDemo() {
  return (
    <div className="w-full max-w-sm space-y-3">
      <PasswordInput placeholder="Enter password" aria-label="Password" />
      <PasswordInput defaultVisible defaultValue="correct-horse-battery" aria-label="Visible password" />
      <PasswordInput size="sm" invalid defaultValue="hunter2" aria-label="Invalid password" />
      <PasswordInput disabled defaultValue="secret" aria-label="Disabled password" />
    </div>
  );
}

function PasswordStrengthDemo() {
  const [password, setPassword] = React.useState("Sutra");
  return (
    <div className="w-full max-w-sm">
      <Field>
        <FieldLabel>New password</FieldLabel>
        <PasswordInput autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <PasswordStrength password={password} />
      </Field>
    </div>
  );
}

function FieldDemo() {
  const [email, setEmail] = React.useState("ada@");
  const emailError = /^\S+@\S+\.\S+$/.test(email) ? undefined : "Enter a valid email address.";
  return (
    <div className="grid w-full gap-10 md:grid-cols-2">
      <FieldGroup>
        <Field required>
          <FieldLabel>Full name</FieldLabel>
          <Input placeholder="Ada Lovelace" leadingIcon={<RiUserLine />} />
          <FieldDescription>Shown on your public profile.</FieldDescription>
        </Field>
        <Field invalid={Boolean(emailError)}>
          <FieldLabel>Email</FieldLabel>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} leadingIcon={<RiAtLine />} />
          <FieldError>{emailError}</FieldError>
        </Field>
        <Field>
          <FieldLabel hint="(optional)">Bio</FieldLabel>
          <Textarea placeholder="A few words about you" autoResize minRows={2} />
          <FieldHint icon>Markdown is supported.</FieldHint>
        </Field>
        <Field disabled>
          <FieldLabel>Workspace URL</FieldLabel>
          <Input prefix="sutra.app/" defaultValue="acme" />
          <FieldDescription>Contact an admin to change this.</FieldDescription>
        </Field>
      </FieldGroup>
      <div className="space-y-8">
        <Fieldset>
          <FieldLegend>Preferences</FieldLegend>
          <Field orientation="horizontal">
            <Switch defaultChecked />
            <FieldContent>
              <FieldLabel>Product updates</FieldLabel>
              <FieldDescription>Monthly email with new features.</FieldDescription>
            </FieldContent>
          </Field>
          <Field orientation="horizontal">
            <Checkbox />
            <FieldContent>
              <FieldLabel>Share usage data</FieldLabel>
              <FieldDescription>Help us improve Sutra.</FieldDescription>
            </FieldContent>
          </Field>
        </Fieldset>
        <Field invalid>
          <FieldLabel>Team size</FieldLabel>
          <SimpleSelect options={[{ value: "1", label: "Just me" }, { value: "10", label: "2–10" }, { value: "50", label: "11–50" }]} placeholder="Select…" />
          <FieldError errors={[{ message: "Team size is required." }]} />
        </Field>
        <Field>
          <FieldLabel>Start date</FieldLabel>
          <DatePicker placeholder="Pick a start date" />
          <FieldHint>DatePicker and Combobox read the Field too.</FieldHint>
        </Field>
        <Field>
          <FieldLabel>Verification code</FieldLabel>
          <OTPField length={6} groupSize={3} />
          <FieldHint>We sent it to your phone.</FieldHint>
        </Field>
      </div>
    </div>
  );
}

function InputGroupDemo() {
  const [message, setMessage] = React.useState("");
  return (
    <div className="grid w-full gap-8 md:grid-cols-2">
      <div className="space-y-3">
        <DemoLabel>Text addons</DemoLabel>
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>$</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput placeholder="0.00" inputMode="decimal" aria-label="Amount" />
          <InputGroupAddon align="inline-end">
            <InputGroupText>USD</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        <InputGroup size="sm">
          <InputGroupAddon>
            <RiCalendarLine />
          </InputGroupAddon>
          <InputGroupInput size="sm" placeholder="Event name" aria-label="Event name" />
        </InputGroup>
      </div>
      <div className="space-y-3">
        <DemoLabel>Buttons</DemoLabel>
        <InputGroup>
          <InputGroupInput readOnly defaultValue="https://sutra.app/invite/8f2k" aria-label="Invite link" />
          <InputGroupAddon align="inline-end">
            <InputGroupButton leadingIcon={<RiFileCopyLine />}>Copy</InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <InputGroup>
          <InputGroupAddon>
            <RiMailLine />
          </InputGroupAddon>
          <InputGroupInput invalid defaultValue="ada@" aria-label="Invalid email" />
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="icon-xs" variant="ghost" aria-label="Send">
              <RiSendPlaneLine />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
      <div className="space-y-3 md:col-span-2">
        <DemoLabel>Textarea with block addons</DemoLabel>
        <InputGroup>
          <InputGroupAddon align="block-start">
            <InputGroupText>To: design-team@sutra.app</InputGroupText>
          </InputGroupAddon>
          <InputGroupTextarea placeholder="Write a message…" value={message} onChange={(e) => setMessage(e.target.value)} aria-label="Message" />
          <InputGroupAddon align="block-end" className="justify-between">
            <InputGroupText>{message.length} / 500</InputGroupText>
            <InputGroupButton variant="primary" size="icon-xs" aria-label="Send message" disabled={!message}>
              <RiArrowUpLine />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}

function LabelDemo() {
  return (
    <div className="grid w-full max-w-md gap-5">
      <div className="grid gap-2">
        <Label htmlFor="label-company">Company</Label>
        <Input id="label-company" placeholder="Acme Inc." />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="label-email" required>
          Work email
        </Label>
        <Input id="label-email" type="email" placeholder="you@acme.com" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="label-phone" hint="(optional)">
          Phone
        </Label>
        <Input id="label-phone" type="tel" placeholder="+82 10 1234 5678" />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="label-disabled" disabled />
        <Label htmlFor="label-disabled">Disabled peer dims the label</Label>
      </div>
      <Button className="justify-self-start" size="sm">
        Save
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/** Every form control in Sutra UI, with sizes, states and controlled examples. */
export function FormsPage() {
  return (
    <PageIntro
      eyebrow="Components"
      title="Forms"
      description="Text fields, choice controls, pickers and uploads. Every control consumes Field context for labels, hints and errors, and supports controlled and uncontrolled use."
    >
      <Demo id="input" title="Input" description="Text input with sizes, icons, text addons, a clear button and validation states." align="start">
        <InputDemo />
      </Demo>

      <Demo id="password-input" title="Password input" description="Input with a show / hide toggle." align="start">
        <PasswordInputDemo />
      </Demo>

      <Demo id="search-input" title="Search input" description="Search icon, clear button and a global hotkey (try ⌘K or /)." align="start">
        <SearchInputDemo />
      </Demo>

      <Demo id="input-otp" title="Input OTP" description="One-time codes: the ready-made OTPField or composed InputOTP slots." align="start">
        <InputOTPDemo />
      </Demo>

      <Demo id="textarea" title="Textarea" description="Multi-line input with optional auto-resize and character counter." align="start">
        <TextareaDemo />
      </Demo>

      <Demo id="number-input" title="Number input" description="Steppers, min / max clamping, precision and Intl formatting." align="start">
        <NumberInputDemo />
      </Demo>

      <Demo id="tag-input" title="Tag input" description="Free-form tags with validation, limits and suggestions." align="start">
        <TagInputDemo />
      </Demo>

      <Demo id="checkbox" title="Checkbox" description="Checkbox, CheckboxField, CheckboxGroup with select-all, and CheckboxCard." align="start">
        <CheckboxDemo />
      </Demo>

      <Demo id="radio" title="Radio" description="RadioGroup with RadioField, bare items, RadioCard and the data-driven RadioGroupField." align="start">
        <RadioDemo />
      </Demo>

      <Demo id="switch" title="Switch" description="Switch, SwitchField rows and SwitchGroup settings panels." align="start">
        <SwitchDemo />
      </Demo>

      <Demo id="select" title="Select" description="Compound Select for full control, SimpleSelect for options arrays." align="start">
        <SelectDemo />
      </Demo>

      <Demo id="date-picker" title="Date picker" description="Popover calendar with a formatted trigger." align="start">
        <DatePickerDemo />
      </Demo>

      <Demo id="date-range-picker" title="Date range picker" description="Range selection with preset shortcuts and apply / cancel." align="start">
        <DateRangePickerDemo />
      </Demo>

      <Demo id="calendar" title="Calendar" description="Inline calendar (react-day-picker) in single and range modes." align="start">
        <CalendarDemo />
      </Demo>

      <Demo id="segmented-control" title="Segmented control" description="Single choice with a sliding thumb: text, icons, sizes and full width." align="start">
        <SegmentedControlDemo />
      </Demo>

      <Demo id="slider" title="Slider" description="Single and range sliders with value bubbles and tick marks." align="start">
        <SliderDemo />
      </Demo>

      <Demo id="rating" title="Rating" description="Star input with half steps, custom icons, and a ratings summary." align="start">
        <RatingDemo />
      </Demo>

      <Demo id="file-upload" title="File upload" description="Stateful upload: dropzone or button trigger, validation and per-file progress." align="start">
        <FileUploadDemo />
      </Demo>

      <Demo id="dropzone" title="Dropzone" description="Stand-alone drop target that validates type, size and count." align="start">
        <DropzoneDemo />
      </Demo>

      <Demo id="combobox" title="Combobox" description="Searchable select: single, multiple with chips, and creatable." align="start">
        <ComboboxDemo />
      </Demo>

      <Demo id="password-strength" title="Password strength" description="Live meter and checklist wired to a password input." align="start">
        <PasswordStrengthDemo />
      </Demo>

      <Demo id="field" title="Field" description="Composes label, control, description, hint and error, and wires ids and aria automatically." align="start">
        <FieldDemo />
      </Demo>

      <Demo id="input-group" title="Input group" description="Single input surface hosting text, icon and button addons." align="start">
        <InputGroupDemo />
      </Demo>

      <Demo id="label" title="Label" description="Form label with required marker and muted hint." align="start">
        <LabelDemo />
      </Demo>
    </PageIntro>
  );
}
