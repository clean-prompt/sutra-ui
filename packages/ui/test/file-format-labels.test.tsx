import { render } from "@testing-library/react";
import { FileFormatIcon } from "../src/assets/file-format";

const labelOf = (ext: string, label?: string) => {
  const { container } = render(<FileFormatIcon ext={ext} label={label} />);
  return container.querySelector("text")?.textContent;
};

describe("FileFormatIcon labels", () => {
  it("uses a short form for the extensions that do not fit the badge", () => {
    expect(labelOf("numbers")).toBe("NUM");
    expect(labelOf("sketch")).toBe("SKTCH");
    expect(labelOf("sqlite")).toBe("SQLT");
    expect(labelOf("svelte")).toBe("SVLT");
  });

  it("keeps the uppercased extension when it fits and cuts unknown long ones at five letters", () => {
    expect(labelOf("pdf")).toBe("PDF");
    expect(labelOf("ipynb")).toBe("IPYNB");
    expect(labelOf("woff2")).toBe("WOFF2");
    expect(labelOf("build.gradle")).toBe("GRADL");
  });

  it("lets an explicit label win over the short form", () => {
    expect(labelOf("numbers", "numbers")).toBe("NUMBE");
    expect(labelOf("sketch", "sk")).toBe("SK");
  });
});
