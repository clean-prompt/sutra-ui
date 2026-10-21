/** Public export lists of the split patterns modules (chart, tiling-layout). */
import { describe, expect, it } from "vitest";

import * as chart from "../src/patterns/chart";
import * as tilingLayout from "../src/patterns/tiling-layout";

describe("split patterns keep their public surface", () => {
  it("patterns/chart", () => {
    expect(Object.keys(chart).sort()).toMatchInlineSnapshot(`
      [
        "AreaChart",
        "BarChart",
        "ChartContainer",
        "ChartLegend",
        "ChartTooltip",
        "DonutChart",
        "FunnelChart",
        "LineChart",
        "RadarChart",
        "ScatterChart",
        "WaterfallChart",
        "formatTimeTick",
        "monotonePath",
        "niceTicks",
        "resolveChartColor",
        "stackSeries",
        "timeTicks",
      ]
    `);
  });

  it("patterns/tiling-layout", () => {
    expect(Object.keys(tilingLayout).sort()).toMatchInlineSnapshot(`
      [
        "FloatingPanes",
        "LayoutPresetPicker",
        "LayoutThumbnail",
        "TilingLayout",
        "ZoneEditor",
        "addPane",
        "closePane",
        "createLayoutId",
        "createSplitNode",
        "createTabsNode",
        "equalizeSplit",
        "fillLayoutSlots",
        "findNode",
        "findPane",
        "findParent",
        "isLayoutNode",
        "isSameLayoutShape",
        "layoutPresets",
        "listGroups",
        "listPanes",
        "movePane",
        "normalizeLayout",
        "parseLayout",
        "removeGroup",
        "resizeSplit",
        "serializeLayout",
        "setActiveTab",
        "splitGroup",
        "splitPane",
        "toZoneLayout",
      ]
    `);
  });
});
