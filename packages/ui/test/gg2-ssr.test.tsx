/** The components of the wheel / carousel / wizard / morph pill / flip group render on the server without touching `window`. */
import * as React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnimatedList } from "../src/patterns/animated-list";
import { Carousel } from "../src/patterns/carousel";
import { MorphPill } from "../src/patterns/morph-pill";
import { ReorderableList } from "../src/patterns/reorderable-list";
import { StepWizard } from "../src/patterns/step-wizard";
import { WheelPicker, WheelPickerGroup } from "../src/primitives/wheel-picker";

describe("server rendering", () => {
  it("renders every component to a string", () => {
    const html = renderToString(
      <div>
        <WheelPicker aria-label="Fruit" options={["a", "b", "c"]} defaultValue="b" />
        <WheelPickerGroup aria-label="Time" columns={[{ id: "h", label: "Hours", options: ["1", "2"] }]} />
        <Carousel label="Slides" autoplay progress>
          <div>One</div>
          <div>Two</div>
        </Carousel>
        <StepWizard steps={[{ id: "a", title: "A", content: <p>First</p> }, { id: "b", title: "B", content: <p>Second</p> }]} />
        <MorphPill states={{ idle: <span>Idle</span>, busy: <span>Busy</span> }} />
        <AnimatedList items={["x", "y"]} getKey={(i) => i} renderItem={(i) => <span>{i}</span>} flip />
        <ReorderableList items={["x", "y"]} getKey={(i) => i} renderItem={(i) => <span>{i}</span>} onReorder={() => {}} />
      </div>
    );
    for (const text of ["role=\"listbox\"", "aria-roledescription=\"carousel\"", "Step 1 of 2", "Idle", "data-slot=\"animated-list\"", "Reorder x"]) expect(html).toContain(text);
  });
});
