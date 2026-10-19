import * as React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RiGlobalLine, RiServerLine } from "@remixicon/react";
import { deviceIcon, deviceIcons } from "../src/assets/device-icons";
import { WorldMap } from "../src/kits/geo/world-map";
import { Globe } from "../src/kits/geo/globe";

afterEach(cleanup);

const markers = [{ id: "a", point: { lat: 37.57, lng: 126.98 }, label: "Seoul" }];

describe("dataTable", () => {
  it("renders the hidden tables by default and skips them when false", () => {
    for (const Map of [WorldMap, Globe]) {
      const { container, unmount } = render(<Map markers={markers} />);
      expect(container.querySelector('[data-slot="geo-table-markers"]')).not.toBeNull();
      unmount();
      const off = render(<Map markers={markers} dataTable={false} />);
      expect(off.container.querySelector('[data-slot^="geo-table"]')).toBeNull();
      off.unmount();
    }
  });
});

describe("deviceIcon", () => {
  it("looks kinds up case-insensitively and falls back to the globe", () => {
    expect(deviceIcon("server")).toBe(RiServerLine);
    expect(deviceIcon(" Server ")).toBe(RiServerLine);
    expect(deviceIcon("toString")).toBe(RiGlobalLine);
    expect(deviceIcon(undefined)).toBe(RiGlobalLine);
    expect(deviceIcon("fridge", deviceIcons.desktop)).toBe(deviceIcons.desktop);
  });
});
