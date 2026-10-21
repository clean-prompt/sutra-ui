/** Public export lists of the split blocks/modal-dialog-blocks and kits/billing/billing modules. */
import { describe, expect, it } from "vitest";
import * as modalDialogBlocks from "../src/blocks/modal-dialog-blocks";
import * as billing from "../src/kits/billing/billing";

describe("split: blocks-billing keeps each module's exports", () => {
  it("blocks/modal-dialog-blocks", () => {
    expect(Object.keys(modalDialogBlocks).sort()).toMatchInlineSnapshot(`
      [
        "DeleteConfirmDialog",
        "FeedbackDialog",
        "InviteMembersDialog",
        "KeyboardShortcutsDialog",
        "NewItemDialog",
        "OnboardingDialog",
        "ShareDialog",
        "UpgradeDialog",
      ]
    `);
  });
  it("kits/billing/billing", () => {
    expect(Object.keys(billing).sort()).toMatchInlineSnapshot(`
      [
        "BillingBanner",
        "CheckoutSteps",
        "CreditAutoReload",
        "CreditBalanceCard",
        "CurrentPlanCard",
        "PlanComparisonTable",
        "PlanPicker",
        "UsageInvoiceTable",
        "formatPrice",
        "planFeatureLosses",
        "projectRunOut",
        "validateAutoReload",
        "yearlySavings",
      ]
    `);
  });
});
