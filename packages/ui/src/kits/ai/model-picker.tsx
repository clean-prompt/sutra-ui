import * as React from "react";
import { ModelSelect, type ModelSelectProps, type PickerModel } from "./model-select";
import type { ModelStateInput } from "./model-state";

export { ModelStateGlyph, modelStateLabels, type ModelLifecycleState, type ModelStateGlyphProps } from "./model-state";
export { modelWaitHint, rankModels } from "./model-select";

/* ------------------------------------------------------------------ */
/* ModelPicker                                                         */
/* ------------------------------------------------------------------ */

/** A `PickerModel` whose lifecycle `state` is required. */
export interface ModelPickerModel extends PickerModel {
  state: ModelStateInput;
}

export interface ModelPickerProps extends Omit<ModelSelectProps, "models"> {
  /** Models to choose from, each with an id, name, provider, lifecycle state and optional badges. */
  models: ModelPickerModel[];
}

/** `ModelSelect` preset for composers: opens upward, lifecycle glyphs, wait hints, badges, search, grouping and per-model warm-up. */
export const ModelPicker = React.forwardRef<HTMLButtonElement, ModelPickerProps>(function ModelPicker({ side = "top", ...props }, ref) {
  return <ModelSelect ref={ref} side={side} {...props} />;
});
ModelPicker.displayName = "ModelPicker";
