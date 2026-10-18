import { normalizeDensity } from "../src/lib/cn";
import { isTerminalStatus, normalizeTaskStatus, taskStatusTone, TASK_STATUSES } from "../src/lib/status";
import { normalizeTone, toneClass, toneClasses, TONES } from "../src/lib/tone";

describe("normalizeTone", () => {
  it("keeps canonical tones", () => {
    for (const t of TONES) expect(normalizeTone(t)).toBe(t);
  });

  it("maps legacy spellings", () => {
    expect(normalizeTone("brand")).toBe("primary");
    expect(normalizeTone("default")).toBe("neutral");
    expect(normalizeTone("muted")).toBe("neutral");
    expect(normalizeTone("warn")).toBe("warning");
    for (const t of ["danger", "error", "critical", "failure"] as const) expect(normalizeTone(t)).toBe("destructive");
  });

  it("falls back for unknown or missing input", () => {
    expect(normalizeTone(undefined)).toBe("neutral");
    expect(normalizeTone(null, "info")).toBe("info");
    expect(normalizeTone("rainbow", "primary")).toBe("primary");
  });

  it("has classes for every tone in every style", () => {
    for (const style of Object.keys(toneClasses) as (keyof typeof toneClasses)[]) {
      for (const t of TONES) expect(toneClasses[style][t]).toMatch(/\S/);
    }
    expect(toneClass("soft", "danger")).toBe(toneClasses.soft.destructive);
  });
});

describe("normalizeTaskStatus", () => {
  it("keeps canonical statuses", () => {
    for (const s of TASK_STATUSES) expect(normalizeTaskStatus(s)).toBe(s);
  });

  it("maps legacy spellings", () => {
    expect(normalizeTaskStatus("cancelled")).toBe("canceled");
    for (const s of ["done", "complete", "completed", "success"] as const) expect(normalizeTaskStatus(s)).toBe("succeeded");
    for (const s of ["error", "failure"] as const) expect(normalizeTaskStatus(s)).toBe("failed");
    for (const s of ["in_progress", "progress", "active"] as const) expect(normalizeTaskStatus(s)).toBe("running");
    for (const s of ["queued", "waiting", "idle"] as const) expect(normalizeTaskStatus(s)).toBe("pending");
  });

  it("knows terminal states and default tones", () => {
    expect(isTerminalStatus("done")).toBe(true);
    expect(isTerminalStatus("cancelled")).toBe(true);
    expect(isTerminalStatus("running")).toBe(false);
    expect(taskStatusTone[normalizeTaskStatus("error")]).toBe("destructive");
  });
});

describe("normalizeDensity", () => {
  it("maps legacy density inputs", () => {
    expect(normalizeDensity(true)).toBe("compact");
    expect(normalizeDensity(false)).toBe("normal");
    expect(normalizeDensity(undefined, "relaxed")).toBe("relaxed");
    expect(normalizeDensity("comfortable")).toBe("relaxed");
    expect(normalizeDensity("compact")).toBe("compact");
  });
});

describe("normalizers ignore prototype keys", () => {
  it("returns the fallback for Object.prototype names", () => {
    for (const key of ["toString", "constructor", "hasOwnProperty", "__proto__"]) {
      expect(normalizeTone(key)).toBe("neutral");
      expect(normalizeTaskStatus(key)).toBe("pending");
    }
  });
});
