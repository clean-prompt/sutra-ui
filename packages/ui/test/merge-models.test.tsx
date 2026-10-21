/** Model state parts merged onto shared bases: model state vocabulary and glyph, ModelStatePill, ModelSelect, ProviderModelPicker. */
import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ModelStateGlyph,
  ModelStatePill,
  modelStateLabels,
  modelStateRank,
  normalizeModelState,
  type ModelStateInput,
} from "../src/kits/ai/model-state";
import { ModelSelect, ModelSelectOption, modelWaitHint, rankModels, type PickerModel } from "../src/kits/ai/model-select";
import { ModelPicker, ModelStateGlyph as PickerGlyph, modelStateLabels as pickerLabels } from "../src/kits/ai/model-picker";
import { DownloadBadge, ModelStatePill as RowPill, ModelTable, modelActionsFor, type ModelInfo } from "../src/kits/ops/model-row";
import { PromptInputModelSelect } from "../src/kits/ai/prompt-input";
import { ProviderModelPicker, type RoutingProvider } from "../src/kits/agent-admin/model-routing";
import { axeViolations } from "./helpers/a11y";

describe("model state vocabulary", () => {
  it("normalizes legacy spellings and unknown values", () => {
    expect(normalizeModelState("asleep")).toBe("sleeping");
    expect(normalizeModelState("loading")).toBe("starting");
    expect(normalizeModelState("downloading")).toBe("downloading");
    expect(normalizeModelState("constructor")).toBe("stopped");
    expect(normalizeModelState(undefined)).toBe("stopped");
    expect(modelStateLabels.asleep).toBe("Sleeping");
    expect(modelStateLabels.loading).toBe("Starting");
    expect(modelStateRank.ready).toBeLessThan(modelStateRank.failed);
  });

  it("is one implementation re-exported from the old modules", () => {
    expect(PickerGlyph).toBe(ModelStateGlyph);
    expect(pickerLabels).toBe(modelStateLabels);
    expect(RowPill).toBe(ModelStatePill);
  });

  it("ranks and hints legacy and canonical states alike", () => {
    const ms: { name: string; state: ModelStateInput }[] = [
      { name: "c", state: "stopped" },
      { name: "b", state: "asleep" },
      { name: "a", state: "loading" },
      { name: "d", state: "ready" },
      { name: "e", state: "downloading" },
    ];
    expect(rankModels(ms).map((m) => m.name)).toEqual(["d", "a", "b", "e", "c"]);
    expect(modelWaitHint({ state: "asleep", warmSeconds: 4 })).toBe("wakes in ~4s");
    expect(modelWaitHint({ state: "sleeping", warmSeconds: 4 })).toBe("wakes in ~4s");
    expect(modelWaitHint({ state: "downloading" })).toBe("downloading weights…");
  });
});

describe("ModelStateGlyph", () => {
  it("draws every state with a shape name, forwards the ref and emits the given state", () => {
    const ref = React.createRef<SVGSVGElement>();
    const { container } = render(
      <div>
        <ModelStateGlyph ref={ref} state="downloading" />
        <ModelStateGlyph state="asleep" />
        <ModelStateGlyph state="loading" />
      </div>
    );
    expect(ref.current).toBeInstanceOf(SVGSVGElement);
    const glyphs = [...container.querySelectorAll("svg")];
    expect(glyphs.map((g) => g.getAttribute("data-glyph"))).toEqual(["download", "moon", "spinner"]);
    expect(glyphs.map((g) => g.getAttribute("data-state"))).toEqual(["downloading", "asleep", "loading"]);
    expect(screen.getByRole("img", { name: "Downloading" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Sleeping" })).toBeInTheDocument();
  });
});

describe("ModelStatePill & DownloadBadge on Badge / Progress", () => {
  it("renders the shared glyph inside a Badge and accepts legacy states", async () => {
    const { container } = render(
      <div>
        <ModelStatePill state="loading" detail="12s" />
        <ModelStatePill state="starting" size="sm" />
        <DownloadBadge status="downloading" progress={42} size="8 GB" />
        <DownloadBadge status="missing" />
      </div>
    );
    const pills = container.querySelectorAll("span[data-state]");
    expect(pills).toHaveLength(2);
    expect(pills[0]).toHaveTextContent("Model state: Starting");
    expect(pills[0]).toHaveTextContent("12s");
    expect(pills[0]).toHaveClass("rounded-control");
    expect(pills[0].querySelector("svg")).toHaveAttribute("data-glyph", "spinner");
    expect(pills[1]).toHaveClass("h-5");
    expect(pills[0].querySelector("svg")!.parentElement).toHaveAttribute("aria-hidden");
    const bar = screen.getByRole("progressbar", { name: "Download progress" });
    expect(bar).toHaveAttribute("aria-valuenow", "42");
    expect(container.querySelector('[data-status="missing"]')).toHaveClass("border-dashed");
    expect(screen.getByText("8 GB")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("keeps ModelTable logic working for legacy and canonical states", () => {
    const models: ModelInfo[] = [
      { name: "a-1", state: "loading" },
      { name: "b-1", state: "starting" },
      { name: "c-1", state: "stopped" },
    ];
    expect(modelActionsFor(models[0])).toEqual(["stop"]);
    expect(modelActionsFor(models[1])).toEqual(["stop"]);
    const { container } = render(<ModelTable models={models} grouped={false} filter="serving" />);
    expect([...container.querySelectorAll("tr[data-model]")].map((r) => r.getAttribute("data-state"))).toEqual(["loading", "starting"]);
  });
});

describe("ModelSelect", () => {
  const models: PickerModel[] = [
    { id: "z", name: "Zeta", description: "Fast and small", provider: "Acme" },
    { id: "a", name: "Alpha", badge: "New", icon: <svg data-testid="alpha-icon" /> },
    { id: "s", name: "Sigma", state: "asleep", warmSeconds: 5 },
  ];

  it("takes a custom trigger, keeps order when unranked and renders stateless rows", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onWarmUp = vi.fn();
    render(
      <ModelSelect
        models={models}
        ranked={false}
        onWarmUp={onWarmUp}
        onValueChange={onValueChange}
        trigger={({ selected }) => <button type="button">Pick: {selected?.name ?? "none"}</button>}
      />
    );
    await user.click(screen.getByRole("button", { name: "Pick: none" }));
    const pop = await screen.findByRole("dialog");
    const names = within(pop)
      .getAllByRole("button")
      .filter((b) => b.hasAttribute("data-model-option"))
      .map((b) => b.querySelector(".font-medium")?.textContent);
    expect(names).toEqual(["Zeta", "Alpha", "Sigma"]);
    expect(within(pop).getByText("Fast and small")).toBeInTheDocument();
    expect(within(pop).getByText("Acme")).toBeInTheDocument();
    expect(within(pop).getByText("New")).toBeInTheDocument();
    expect(within(pop).getByTestId("alpha-icon")).toBeInTheDocument();
    expect(within(pop).getByText("wakes in ~5s")).toBeInTheDocument();
    expect(within(pop).getAllByRole("button", { name: /^Warm up/ })).toHaveLength(1);
    await user.type(within(pop).getByRole("searchbox"), "acme");
    expect(within(pop).queryByText("Alpha")).toBeNull();
    await user.click(within(pop).getByRole("button", { name: /Zeta/ }));
    expect(onValueChange).toHaveBeenCalledWith("z");
    expect(screen.getByRole("button", { name: "Pick: Zeta" })).toBeInTheDocument();
  });

  it("ModelPicker is the preset: canonical and legacy states read the same", async () => {
    const user = userEvent.setup();
    render(
      <ModelPicker
        models={[
          { id: "x", name: "Xi", state: "sleeping" },
          { id: "y", name: "Ypsilon", state: "asleep" },
        ]}
        defaultValue="x"
      />
    );
    await user.click(screen.getByRole("button", { name: "Model: Xi, Sleeping" }));
    const pop = await screen.findByRole("dialog");
    expect(within(pop).getAllByRole("img", { name: "Sleeping" })).toHaveLength(2);
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("ModelSelectOption shows a blocked reason over the hint", () => {
    render(<ModelSelectOption model={{ id: "b", name: "Beta", state: "ready", blockedReason: "no quota" }} />);
    expect(screen.getByText("Unavailable: no quota")).toHaveClass("text-destructive");
  });
});

describe("PromptInputModelSelect shared rows", () => {
  it("renders state glyphs, badges and disables blocked models", async () => {
    const user = userEvent.setup();
    render(
      <PromptInputModelSelect
        models={[
          { id: "a", name: "Alpha", badge: "Pro", description: "Best for code" },
          { id: "b", name: "Beta", state: "ready" },
          { id: "c", name: "Gamma", blockedReason: "Upgrade" },
        ]}
      />
    );
    await user.click(screen.getByRole("button", { name: /Alpha/ }));
    const alpha = await screen.findByRole("menuitemradio", { name: /Alpha/ });
    expect(within(alpha).getByText("Pro")).toHaveClass("truncate");
    expect(within(alpha).getByText("Best for code")).toBeInTheDocument();
    const beta = screen.getByRole("menuitemradio", { name: /Beta/ });
    expect(within(beta).getByRole("img", { name: "Ready" })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: /Gamma/ })).toHaveAttribute("data-disabled");
  });
});

describe("ProviderModelPicker shared state pieces", () => {
  it("shows the state glyph and wait hint when a routing model has a state", () => {
    const providers: RoutingProvider[] = [
      {
        id: "local",
        name: "Local",
        configured: true,
        models: [
          { id: "q", name: "Qwen", state: "ready" },
          { id: "l", name: "Llama", state: "stopped", warmSeconds: 30 },
          { id: "c", name: "Cloud" },
        ],
      },
    ];
    render(<ProviderModelPicker providers={providers} />);
    expect(screen.getByRole("img", { name: "Ready" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Stopped" })).toBeInTheDocument();
    expect(screen.getByText("needs warm-up ~30s")).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(2);
  });
});
