import * as React from "react";
import {
  brands,
  neutrals,
  radiusModes,
  themeStyles,
  cn,
  focusRing,
  useTheme,
  Button,
  SegmentedControl,
  SimpleSelect,
  SimpleTooltip,
  Popover,
  PopoverContent,
  PopoverTrigger,
  type Brand,
  type SutraTheme,
} from "@sutra/ui";
import { RiMoonLine, RiPaletteLine, RiSunLine } from "@sutra/ui/icons";

/** Brand-500 swatch colors. Hardcoded because the default brand has no data-brand selector to scope. */
export const brandSwatch: Record<Brand, string> = {
  indigo: "#615fff",
  blue: "#2b7fff",
  sky: "#00a6f4",
  cyan: "#00b8db",
  violet: "#8e51ff",
  rose: "#ff2056",
  lime: "#7ccf00",
  green: "#00c950",
  yellow: "#f0b100",
  orange: "#ff6900",
  red: "#fb2c36",
};

const STORAGE_KEY = "sutra-playground-theme";

function readStoredTheme(): Partial<SutraTheme> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<SutraTheme>;
  } catch {
    return {};
  }
}

/** `useTheme` plus localStorage persistence. */
export function usePersistedTheme() {
  const value = useTheme(readStoredTheme());
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value.theme));
    } catch {
      /* storage unavailable */
    }
  }, [value.theme]);
  return value;
}

type ThemeApi = ReturnType<typeof useTheme>;

const title = (s: string) => s[0]!.toUpperCase() + s.slice(1);

function StyleControl({ theme, setTheme, fullWidth }: ThemeApi & { fullWidth?: boolean }) {
  return (
    <SegmentedControl
      aria-label="Visual style"
      size="sm"
      fullWidth={fullWidth}
      value={theme.style ?? "default"}
      onValueChange={(style) => style && setTheme({ style: style as SutraTheme["style"] })}
      options={themeStyles.map((st) => ({ value: st, label: title(st) }))}
    />
  );
}

function BrandSwatches({ theme, setTheme }: ThemeApi) {
  const paper = theme.style === "paper";
  return (
    <div
      role="radiogroup"
      aria-label="Brand color"
      title={paper ? "The paper style uses ink as its accent, so the brand color has no effect" : undefined}
      className={cn("flex flex-wrap items-center gap-1", paper && "opacity-40")}
    >
      {brands.map((brand) => (
        <SimpleTooltip key={brand} content={title(brand)}>
          <button
            type="button"
            role="radio"
            aria-checked={theme.brand === brand}
            aria-label={title(brand)}
            disabled={paper}
            onClick={() => setTheme({ brand })}
            className={cn(
              "size-5 rounded-full ring-offset-2 ring-offset-background transition-shadow",
              theme.brand === brand ? "ring-2 ring-foreground/70" : "hover:ring-2 hover:ring-border-strong",
              focusRing
            )}
            style={{ backgroundColor: brandSwatch[brand] }}
          />
        </SimpleTooltip>
      ))}
    </div>
  );
}

function NeutralSelect({ theme, setTheme, className }: ThemeApi & { className?: string }) {
  return (
    <SimpleSelect
      aria-label="Neutral palette"
      size="sm"
      className={className}
      value={theme.neutral}
      onValueChange={(neutral) => setTheme({ neutral: neutral as SutraTheme["neutral"] })}
      options={neutrals.map((n) => ({ value: n, label: title(n) }))}
    />
  );
}

function RadiusControl({ theme, setTheme, fullWidth }: ThemeApi & { fullWidth?: boolean }) {
  return (
    <SegmentedControl
      aria-label="Corner radius"
      size="sm"
      fullWidth={fullWidth}
      value={theme.radius}
      onValueChange={(radius) => radius && setTheme({ radius: radius as SutraTheme["radius"] })}
      options={radiusModes.map((r) => ({ value: r, label: title(r) }))}
    />
  );
}

function ModeToggle({ theme, setTheme }: ThemeApi) {
  const dark = theme.mode === "dark";
  return (
    <SimpleTooltip content={dark ? "Light mode" : "Dark mode"} shortcut="mod+shift+l">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Toggle dark mode"
        onClick={() => setTheme({ mode: dark ? "light" : "dark" })}
      >
        {dark ? <RiSunLine /> : <RiMoonLine />}
      </Button>
    </SimpleTooltip>
  );
}

/** Theme controls for the top bar: inline on wide screens, in a popover on narrow ones. */
export function ThemeControls(api: ThemeApi) {
  // The paper style sets every colour token itself (ink as the accent, its own neutrals), so the brand colour and the
  // neutral palette have no effect there: hide them instead of showing dead controls.
  const paper = api.theme.style === "paper";
  return (
    <div className="flex items-center gap-3">
      <div className="hidden items-center gap-3 min-[1440px]:flex">
        <StyleControl {...api} />
        {paper ? null : <BrandSwatches {...api} />}
        {paper ? null : <NeutralSelect {...api} className="w-28" />}
        <RadiusControl {...api} />
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Theme settings" className="min-[1440px]:hidden">
            <RiPaletteLine />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-4 p-4">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Style</p>
            <StyleControl {...api} fullWidth />
          </div>
          {paper ? null : (
            <>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Brand</p>
                <BrandSwatches {...api} />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Neutral</p>
                <NeutralSelect {...api} className="w-full" />
              </div>
            </>
          )}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Radius</p>
            <RadiusControl {...api} fullWidth />
          </div>
        </PopoverContent>
      </Popover>
      <ModeToggle {...api} />
    </div>
  );
}
