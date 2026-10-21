import * as React from "react";
import { InlineCode, SegmentedControl } from "@cleanprompt/sutra-ui";

/** The in-app motion setting: follow the system, always reduce, or always play. */
export type MotionSetting = "system" | "reduce" | "full";

const STORAGE_KEY = "sutra-playground-motion";

function readStored(): MotionSetting {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "reduce" || value === "full" ? value : "system";
  } catch {
    return "system";
  }
}

function readAttribute(): MotionSetting {
  const value = document.documentElement.getAttribute("data-motion");
  return value === "reduce" || value === "full" ? value : "system";
}

/** Put the remembered choice on `<html>` before the first render, so a reload does not flash the wrong motion. */
export function applyStoredMotion() {
  const value = readStored();
  if (value !== "system") document.documentElement.setAttribute("data-motion", value);
}

/** Set `<html data-motion>` ("system" removes it, which follows the operating system) and remember it. */
export function setMotionSetting(value: MotionSetting) {
  const root = document.documentElement;
  if (value === "system") root.removeAttribute("data-motion");
  else root.setAttribute("data-motion", value);
  try {
    if (value === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* storage unavailable: the choice lasts until the page closes */
  }
}

const OPTIONS = [
  { value: "system", label: "System" },
  { value: "reduce", label: "Reduce" },
  { value: "full", label: "Full" },
] as const;

/** System / Reduce / Full switch for the whole playground (the attribute is on `<html>`, portals included). */
export function MotionSettingControl() {
  const [value, setValue] = React.useState<MotionSetting>(readAttribute);
  return (
    <div className="space-y-2">
      <SegmentedControl
        size="sm"
        aria-label="Motion setting"
        value={value}
        onValueChange={(next) => {
          const setting = next as MotionSetting;
          setValue(setting);
          setMotionSetting(setting);
        }}
        options={OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
      />
      <p className="max-w-prose text-sm text-muted-foreground">
        <InlineCode>System</InlineCode> follows the operating system (the default). <InlineCode>Reduce</InlineCode> applies the whole net even where the system
        allows motion. <InlineCode>Full</InlineCode> plays motion even where the system asks for less: it overrides an accessibility setting, so offer it only
        as an explicit choice in your own settings, never as a default.
      </p>
    </div>
  );
}
