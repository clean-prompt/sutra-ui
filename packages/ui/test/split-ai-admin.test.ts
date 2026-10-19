import { describe, expect, it } from "vitest";
import * as agentJobs from "../src/kits/agent-admin/agent-jobs";
import * as promptInput from "../src/kits/ai/prompt-input";

describe("split ai-admin: public surface unchanged", () => {
  it("agent-jobs", () => {
    expect(Object.keys(agentJobs).sort()).toMatchInlineSnapshot(`
      [
        "AgentJobForm",
        "BlueprintCard",
        "BlueprintGallery",
        "DeliveryPlatformIcon",
        "DeliveryTargetPicker",
        "JobDetail",
        "JobList",
        "JobNextRun",
        "JobRow",
        "JobStatePill",
        "NameCheckboxPicker",
        "RunHistory",
        "agentJobState",
        "deliveryPlatformMeta",
        "deliveryTargetIssue",
        "fillBlueprintTemplate",
        "formatDeliveryTarget",
        "validateAgentJob",
      ]
    `);
  });
  it("prompt-input", () => {
    expect(Object.keys(promptInput).sort()).toMatchInlineSnapshot(`
      [
        "PromptInput",
        "PromptInputAddContextMenu",
        "PromptInputAttachButton",
        "PromptInputAttachments",
        "PromptInputButton",
        "PromptInputContextChip",
        "PromptInputDropOverlay",
        "PromptInputModelPill",
        "PromptInputModelSelect",
        "PromptInputRestoredDraft",
        "PromptInputSubmit",
        "PromptInputTextarea",
        "PromptInputToolbar",
        "PromptInputTools",
        "formatContextRange",
        "highlightTextSegments",
        "mentionHighlightRules",
        "usePromptInput",
        "useTextareaMirror",
      ]
    `);
  });
});
