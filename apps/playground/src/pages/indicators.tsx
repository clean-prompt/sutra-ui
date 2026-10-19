import * as React from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  ChipGroup,
  Countdown,
  Progress,
  ProgressCircle,
  ProgressSegments,
  Skeleton,
  Spinner,
  StatusBadge,
  StatusDot,
  Steps,
  type BadgeColor,
  type Tone,
  type StatusBadgeStatus,
  type StepIndicatorStep,
} from "@sutra/ui";
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiBankCardLine,
  RiCheckLine,
  RiFireLine,
  RiMapPinLine,
  RiRestartLine,
  RiShieldCheckLine,
  RiStarFill,
  RiUserLine,
} from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

const chipTones = ["neutral", "primary", "success", "warning", "destructive", "info"] as const;
const badgeColors: BadgeColor[] = [
  "neutral", "primary", "success", "warning", "destructive", "info", "gray", "blue", "purple", "pink", "orange",
];
const statuses: StatusBadgeStatus[] = [
  "online", "offline", "busy", "away", "active", "inactive", "pending",
  "success", "error", "warning", "info", "draft", "processing",
];
const spinnerVariants = ["ring", "dots", "bars", "pulse"] as const;
const spinnerSizes = ["xs", "sm", "md", "lg", "xl"] as const;
const progressTones: Tone[] = ["primary", "success", "warning", "destructive", "info", "neutral"];

const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function RemovableChips() {
  const [tags, setTags] = React.useState(["Design", "Frontend", "Accessibility", "Research"]);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <Chip key={tag} onRemove={() => setTags((t) => t.filter((x) => x !== tag))} removeLabel={`Remove ${tag}`}>
          {tag}
        </Chip>
      ))}
      <Chip
        variant="soft"
        color="brand"
        avatar={<img src="https://i.pravatar.cc/80?img=47" alt="" />}
        onRemove={() => {}}
        removeLabel="Remove Olivia"
      >
        Olivia Rhye
      </Chip>
      {tags.length < 4 ? (
        <Button size="xs" variant="ghost" leadingIcon={<RiRestartLine />} onClick={() => setTags(["Design", "Frontend", "Accessibility", "Research"])}>
          Reset
        </Button>
      ) : null}
    </div>
  );
}

function SelectableChips() {
  const [cuisine, setCuisine] = React.useState<string | null>("italian");
  const [amenities, setAmenities] = React.useState<string[]>(["wifi", "parking"]);
  const [favorite, setFavorite] = React.useState(false);
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <DemoLabel>ChipGroup type="single" — {cuisine ?? "none"}</DemoLabel>
        <ChipGroup value={cuisine} onValueChange={setCuisine}>
          <Chip value="italian">Italian</Chip>
          <Chip value="japanese">Japanese</Chip>
          <Chip value="mexican">Mexican</Chip>
          <Chip value="indian">Indian</Chip>
        </ChipGroup>
      </div>
      <div className="space-y-2">
        <DemoLabel>ChipGroup type="multiple" variant="soft" — {amenities.join(", ") || "none"}</DemoLabel>
        <ChipGroup type="multiple" variant="soft" value={amenities} onValueChange={setAmenities}>
          <Chip value="wifi">Free Wi-Fi</Chip>
          <Chip value="parking">Parking</Chip>
          <Chip value="pool">Pool</Chip>
          <Chip value="pets">Pet friendly</Chip>
          <Chip value="gym" disabled>
            Gym
          </Chip>
        </ChipGroup>
      </div>
      <div className="space-y-2">
        <DemoLabel>Standalone toggle</DemoLabel>
        <Chip
          selected={favorite}
          onSelectedChange={setFavorite}
          color="warning"
          leadingIcon={<RiStarFill />}
        >
          {favorite ? "Favorited" : "Add to favorites"}
        </Chip>
      </div>
    </div>
  );
}

const checkoutSteps: StepIndicatorStep[] = [
  { title: "Account", description: "Create your login", icon: <RiUserLine /> },
  { title: "Shipping", description: "Where should we send it?", icon: <RiMapPinLine /> },
  { title: "Payment", description: "Card or bank transfer", icon: <RiBankCardLine /> },
  { title: "Review", description: "Confirm and place order", icon: <RiShieldCheckLine /> },
];

function StepsDemo() {
  const [current, setCurrent] = React.useState(1);
  const done = current >= checkoutSteps.length;
  const controls = (
    <div className="flex items-center justify-between gap-3">
      <Button
        variant="secondary"
        size="sm"
        leadingIcon={<RiArrowLeftLine />}
        disabled={current === 0}
        onClick={() => setCurrent((c) => Math.max(0, c - 1))}
      >
        Back
      </Button>
      <span className="text-sm text-muted-foreground">
        {done ? "All steps complete" : `Step ${current + 1} of ${checkoutSteps.length}`}
      </span>
      {done ? (
        <Button size="sm" variant="secondary" leadingIcon={<RiRestartLine />} onClick={() => setCurrent(0)}>
          Restart
        </Button>
      ) : (
        <Button
          size="sm"
          trailingIcon={current === checkoutSteps.length - 1 ? <RiCheckLine /> : <RiArrowRightLine />}
          onClick={() => setCurrent((c) => Math.min(checkoutSteps.length, c + 1))}
        >
          {current === checkoutSteps.length - 1 ? "Place order" : "Next"}
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <DemoLabel>Horizontal · circles · click a completed step to go back</DemoLabel>
        <Steps steps={checkoutSteps} current={current} onStepClick={setCurrent} />
        {controls}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <DemoLabel>Vertical (shares state)</DemoLabel>
          <Steps steps={checkoutSteps} current={current} orientation="vertical" onStepClick={setCurrent} />
        </div>
        <div className="space-y-8">
          <div className="space-y-3">
            <DemoLabel>variant="bars"</DemoLabel>
            <Steps steps={checkoutSteps} current={current} variant="bars" />
          </div>
          <div className="space-y-3">
            <DemoLabel>variant="dots"</DemoLabel>
            <Steps steps={checkoutSteps} current={current} variant="dots" />
          </div>
          <div className="space-y-3">
            <DemoLabel>Unrestricted clicking (restrictToCompleted=false)</DemoLabel>
            <Steps
              steps={checkoutSteps.map(({ title }) => ({ title }))}
              current={current}
              variant="dots"
              onStepClick={setCurrent}
              restrictToCompleted={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressDemo() {
  const [value, setValue] = React.useState(64);
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <DemoLabel className="mr-2">Value: {value}%</DemoLabel>
        {[0, 25, 64, 100].map((v) => (
          <Button key={v} size="xs" variant={value === v ? "soft" : "ghost"} onClick={() => setValue(v)}>
            {v}%
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <DemoLabel>Linear</DemoLabel>
          <Progress value={value} label="Uploading design-system.fig" showValue="top" />
          <Progress value={value} showValue="right" aria-label="Storage used" />
          <Progress
            value={value * 12.8}
            max={1280}
            label="Monthly API calls"
            showValue="top"
            formatValue={(v, max) => `${Math.round(v)} / ${max}`}
            color="info"
          />
          <Progress indeterminate label="Syncing…" />
        </div>
        <div className="space-y-5">
          <DemoLabel>Sizes &amp; colors</DemoLabel>
          {(["xs", "sm", "md", "lg"] as const).map((size, i) => (
            <Progress key={size} size={size} value={Math.max(8, value - i * 12)} tone={progressTones[i]} aria-label={`${size} progress`} />
          ))}
          <Progress size="sm" value={value} tone="destructive" aria-label="Destructive" />
          <Progress size="sm" value={value} tone="neutral" aria-label="Neutral" />
        </div>
      </div>

      <div className="space-y-3">
        <DemoLabel>ProgressCircle</DemoLabel>
        <div className="flex flex-wrap items-center gap-6">
          <ProgressCircle value={value} size={48} strokeWidth={5} label="Small" />
          <ProgressCircle value={value} label="Default" />
          <ProgressCircle value={value} size={88} strokeWidth={8} tone="success" label="Success" />
          <ProgressCircle value={value} size={88} strokeWidth={8} gradient label="Gradient" />
          <ProgressCircle value={value} size={88} strokeWidth={8} tone="warning" label="Streak">
            <span className="flex flex-col items-center leading-none">
              <RiFireLine className="size-5 text-warning" aria-hidden />
              <span className="mt-1 text-xs font-semibold">{Math.round(value / 10)}d</span>
            </span>
          </ProgressCircle>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <DemoLabel>ProgressSegments · password strength</DemoLabel>
          {[1, 2, 3, 4].map((v) => (
            <ProgressSegments
              key={v}
              value={v}
              color={v === 1 ? "destructive" : v === 2 ? "warning" : v === 3 ? "info" : "success"}
              label={`Strength ${v} of 4`}
            />
          ))}
        </div>
        <div className="space-y-3">
          <DemoLabel>ProgressSegments · 10 segments, value relative to max=100</DemoLabel>
          <ProgressSegments segments={10} value={value} max={100} size="lg" label="Course progress" />
          <ProgressSegments segments={10} value={value} max={100} size="sm" tone="neutral" label="Course progress small" />
        </div>
      </div>
    </div>
  );
}

function SkeletonDemo() {
  const [loading, setLoading] = React.useState(true);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <DemoLabel>Card loading composition</DemoLabel>
        <Button size="xs" variant="ghost" onClick={() => setLoading((l) => !l)}>
          {loading ? "Show content" : "Show skeleton"}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1].map((i) =>
          loading ? (
            <Card key={i} className="space-y-4 p-5" aria-busy="true">
              <Skeleton className="h-36 rounded-md" shimmer={i === 0} />
              <div className="flex items-center gap-3">
                <Skeleton shape="circle" shimmer={i === 0} />
                <div className="flex-1 space-y-2">
                  <Skeleton shape="text" width="45%" shimmer={i === 0} />
                  <Skeleton shape="text" width="30%" shimmer={i === 0} />
                </div>
              </div>
              <Skeleton shape="text" lines={3} shimmer={i === 0} />
            </Card>
          ) : (
            <Card key={i} className="space-y-4 p-5">
              <div
                aria-hidden
                className={
                  i === 0
                    ? "h-36 rounded-md bg-gradient-to-br from-brand-400 to-brand-700"
                    : "h-36 rounded-md bg-gradient-to-br from-brand-200 via-brand-400 to-brand-600"
                }
              />
              <div className="flex items-center gap-3">
                <Avatar src={`https://i.pravatar.cc/80?img=${i === 0 ? 47 : 12}`} name={i === 0 ? "Olivia Rhye" : "Phoenix Baker"} />
                <div className="leading-tight">
                  <p className="text-sm font-semibold">{i === 0 ? "Olivia Rhye" : "Phoenix Baker"}</p>
                  <p className="text-xs text-muted-foreground">{i === 0 ? "2 hours ago" : "Yesterday"}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {i === 0
                  ? "We shipped the new onboarding flow. Activation is up 18% week over week, mostly from the shorter workspace setup."
                  : "Notes from the design review: tighten the empty states, unify icon sizes and move filters into the toolbar."}
              </p>
            </Card>
          )
        )}
      </div>
      <p className="text-xs text-muted-foreground">Left card uses the shimmer sweep (default); right uses shimmer={"{false}"} for a pulse.</p>
    </div>
  );
}

function CountdownUrgencyDemo() {
  // A deadline relative to when the demo mounted, so the final stretch is reachable without waiting.
  const [deadline, setDeadline] = React.useState(() => Date.now() + 25_000);
  return (
    <div className="@container w-full space-y-6">
      <div className="grid grid-cols-1 gap-6 @lg:grid-cols-2">
        <div className="space-y-2">
          <DemoLabel>Segments · urgentBelow={"{15000}"} (warning tone in the last 15 s)</DemoLabel>
          <Countdown target={deadline} urgentBelow={15_000} size="sm" />
        </div>
        <div className="space-y-2">
          <DemoLabel>Compact · same deadline</DemoLabel>
          <Countdown target={deadline} urgentBelow={15_000} format="compact" />
        </div>
        <div className="space-y-2">
          <DemoLabel>Already inside the final stretch</DemoLabel>
          <Countdown target={Date.now() + 3_600_000} urgentBelow={7_200_000} size="sm" hideSeconds />
        </div>
        <div className="space-y-2">
          <DemoLabel>Without urgentBelow</DemoLabel>
          <Countdown target={Date.now() + 3_600_000} size="sm" hideSeconds />
        </div>
      </div>
      <Button size="sm" variant="secondary" onClick={() => setDeadline(Date.now() + 25_000)}>
        Restart the 25 s deadline
      </Button>
      <div className="max-w-56 space-y-2">
        <DemoLabel>Narrow container</DemoLabel>
        <Countdown target={Date.now() + 90_000} urgentBelow={120_000} size="sm" />
      </div>
    </div>
  );
}

export function IndicatorsPage() {
  return (
    <PageIntro
      eyebrow="Components"
      title="Indicators"
      description="Chips, badges, status, loading and progress indicators."
    >
      <Demo id="chip" title="Chip" description="Interactive pills: removable tags, toggles and single or multiple selection groups." align="start">
        <div className="space-y-8">
          <div className="space-y-3">
            <DemoLabel>Variants × colors</DemoLabel>
            {(["outline", "soft", "solid"] as const).map((variant) => (
              <div key={variant} className="flex flex-wrap items-center gap-2">
                <span className="w-14 text-xs text-muted-foreground">{variant}</span>
                {chipTones.map((tone) => (
                  <Chip key={tone} variant={variant} tone={tone}>
                    {label(tone)}
                  </Chip>
                ))}
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <DemoLabel>Sizes</DemoLabel>
            <div className="flex flex-wrap items-center gap-2">
              <Chip size="sm">Small</Chip>
              <Chip size="md">Medium</Chip>
              <Chip size="lg">Large</Chip>
              <Chip size="md" leadingIcon={<RiMapPinLine />}>
                Lisbon
              </Chip>
            </div>
          </div>
          <div className="space-y-3">
            <DemoLabel>Removable (Backspace / Delete also removes)</DemoLabel>
            <RemovableChips />
          </div>
          <SelectableChips />
        </div>
      </Demo>

      <Demo id="badge" title="Badge" description="Compact labels for status, category or count." align="start">
        <div className="space-y-6">
          {(["soft", "solid", "outline"] as const).map((variant) => (
            <div key={variant} className="space-y-2">
              <DemoLabel>{variant}</DemoLabel>
              <div className="flex flex-wrap gap-2">
                {badgeColors.map((color) => (
                  <Badge key={color} variant={variant} color={color}>
                    {label(color)}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
          <div className="space-y-2">
            <DemoLabel>dot</DemoLabel>
            <div className="flex flex-wrap gap-2">
              {badgeColors.map((color) => (
                <Badge key={color} variant="dot" color={color}>
                  {label(color)}
                </Badge>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <DemoLabel>Sizes</DemoLabel>
              <div className="flex flex-wrap items-center gap-2">
                <Badge size="sm" tone="primary">Small</Badge>
                <Badge size="md" tone="primary">Medium</Badge>
                <Badge size="lg" tone="primary">Large</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <DemoLabel>Icons, counts &amp; removable</DemoLabel>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="success" leadingIcon={<RiCheckLine />}>Verified</Badge>
                <Badge color="orange" trailingIcon={<RiFireLine />}>Trending</Badge>
                <Badge variant="solid" tone="destructive" size="sm">99+</Badge>
                <Badge variant="outline" onRemove={() => {}} removeLabel="Remove React">React</Badge>
              </div>
            </div>
          </div>
        </div>
      </Demo>

      <Demo id="status-badge" title="Status badge" description="Status pill with a colored dot. processing pulses by default." align="start">
        <div className="space-y-6">
          {(["soft", "outline", "plain"] as const).map((variant) => (
            <div key={variant} className="space-y-2">
              <DemoLabel>{variant}</DemoLabel>
              <div className="flex flex-wrap items-center gap-2">
                {statuses.map((status) => (
                  <StatusBadge key={status} status={status} variant={variant} />
                ))}
              </div>
            </div>
          ))}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <DemoLabel>Sizes &amp; custom label</DemoLabel>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status="success" size="sm" label="Deployed" />
                <StatusBadge status="processing" size="md" label="Building" />
                <StatusBadge status="error" size="lg" label="Build failed" />
                <StatusBadge status="online" pulse label="Live" />
              </div>
            </div>
            <div className="space-y-2">
              <DemoLabel>StatusDot</DemoLabel>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-2"><StatusDot status="online" size="sm" /> API</span>
                <span className="inline-flex items-center gap-2"><StatusDot status="warning" /> Webhooks</span>
                <span className="inline-flex items-center gap-2"><StatusDot status="error" size="lg" pulse /> Search</span>
                <span className="inline-flex items-center gap-2"><StatusDot status="processing" /> Indexing</span>
              </div>
            </div>
          </div>
        </div>
      </Demo>

      <Demo id="spinner" title="Spinner" description="Four variants in five sizes. Spinners use currentColor." align="start">
        <div className="overflow-x-auto">
          <div className="grid grid-cols-[3.5rem_repeat(5,minmax(2.25rem,1fr))] items-center gap-y-6">
            <span />
            {spinnerSizes.map((size) => (
              <DemoLabel key={size} className="text-center">{size}</DemoLabel>
            ))}
            {spinnerVariants.map((variant) => (
              <React.Fragment key={variant}>
                <DemoLabel>{variant}</DemoLabel>
                {spinnerSizes.map((size) => (
                  <div key={size} className="flex justify-center">
                    <Spinner variant={variant} size={size} />
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <DemoLabel>Recolored</DemoLabel>
          <Spinner className="text-success" />
          <Spinner variant="dots" className="text-warning" />
          <Spinner variant="bars" className="text-destructive" />
          <Spinner variant="pulse" className="text-muted-foreground" />
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner size="sm" className="text-current" label="Saving" /> Saving changes…
          </span>
        </div>
      </Demo>

      <Demo id="progress" title="Progress" description="Linear bars, circular rings and segmented bars." align="start">
        <ProgressDemo />
      </Demo>

      <Demo id="countdown-urgency" title="Countdown urgency" description="Countdown urgentBelow: in the final stretch (the given number of milliseconds) the countdown takes the warning tone and sets data-urgent. It switches back off once the time is up." align="start">
        <CountdownUrgencyDemo />
      </Demo>

      <Demo id="skeleton" title="Skeleton" description="Shimmering placeholders composed to match the real layout." align="start">
        <SkeletonDemo />
      </Demo>

      <Demo id="steps" title="Steps" description="Step indicator for multi-step flows, horizontal or vertical." align="start">
        <StepsDemo />
      </Demo>
    </PageIntro>
  );
}
