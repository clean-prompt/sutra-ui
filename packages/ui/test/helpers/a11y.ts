import axe from "axe-core";

export interface AxeOptions {
  /** Extra rule ids to disable for this run (document why at the call site). */
  disable?: string[];
}

/** Run axe on a container and return violations (color-contrast skipped: jsdom has no layout). */
export async function axeViolations(container: Element, options: AxeOptions = {}) {
  const rules: Record<string, { enabled: boolean }> = {
    "color-contrast": { enabled: false },
    region: { enabled: false },
  };
  for (const id of options.disable ?? []) rules[id] = { enabled: false };
  const result = await axe.run(container, { rules });
  return result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`);
}
