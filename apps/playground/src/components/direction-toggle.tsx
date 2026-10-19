import * as React from "react";
import { Button, SimpleTooltip } from "@sutra/ui";
import { RiTextDirectionL, RiTextDirectionR } from "@sutra/ui/icons";

type Direction = "ltr" | "rtl";

const STORAGE_KEY = "sutra-playground-dir";

function readStoredDirection(): Direction {
  try {
    return localStorage.getItem(STORAGE_KEY) === "rtl" ? "rtl" : "ltr";
  } catch {
    return "ltr";
  }
}

/** Reading direction of the playground: sets `dir` on `<html>` (the whole page, portals included) and remembers it. */
export function usePersistedDirection() {
  const [dir, setDir] = React.useState<Direction>(readStoredDirection);
  React.useLayoutEffect(() => {
    document.documentElement.dir = dir;
    try {
      localStorage.setItem(STORAGE_KEY, dir);
    } catch {
      /* storage unavailable */
    }
  }, [dir]);
  return { dir, setDir } as const;
}

type DirectionApi = ReturnType<typeof usePersistedDirection>;

/** Top-bar toggle between left-to-right and right-to-left. */
export function DirectionToggle({ dir, setDir }: DirectionApi) {
  const rtl = dir === "rtl";
  return (
    <SimpleTooltip content={rtl ? "Left-to-right layout" : "Right-to-left layout"}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Toggle right-to-left layout"
        aria-pressed={rtl}
        onClick={() => setDir(rtl ? "ltr" : "rtl")}
      >
        {rtl ? <RiTextDirectionL /> : <RiTextDirectionR />}
      </Button>
    </SimpleTooltip>
  );
}
