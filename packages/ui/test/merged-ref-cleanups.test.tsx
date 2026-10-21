import * as React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChatConversation, ChatConversationContent } from "../src/kits/ai/chat-conversation";
import { PdfThumbnail } from "../src/kits/editor/pdf-viewer-thumbnail";
import { VideoPlayer } from "../src/kits/media/video-player";
import { MentionInput } from "../src/kits/workspace/entity-mention";
import { SutradharSting } from "../src/assets/sutradhar-sting";

/*
 * Components that forward a ref to a node they also need themselves merge the two refs. A React 19 ref callback may return a
 * cleanup function; the merge must pass it through (the cleanup runs on unmount, and the callback is not also called with
 * null), which a hand-written merge that drops the return value does not.
 */
function cleanupRef<T>() {
  const log: string[] = [];
  const ref = (node: T | null) => {
    log.push(node ? "attach" : "null");
    return () => void log.push("cleanup");
  };
  return { ref: ref as unknown as React.Ref<T>, log };
}

const cases: [string, (ref: React.Ref<never>) => React.ReactElement][] = [
  ["ChatConversationContent", (ref) => (
    <ChatConversation>
      <ChatConversationContent ref={ref as React.Ref<HTMLDivElement>} />
    </ChatConversation>
  )],
  ["PdfThumbnail", (ref) => <PdfThumbnail ref={ref as React.Ref<HTMLDivElement>} />],
  ["VideoPlayer", (ref) => <VideoPlayer ref={ref as React.Ref<HTMLDivElement>} src="/clip.mp4" />],
  ["VideoPlayer videoRef", (ref) => <VideoPlayer videoRef={ref as React.Ref<HTMLVideoElement>} src="/clip.mp4" />],
  ["MentionInput", (ref) => <MentionInput ref={ref as React.Ref<HTMLTextAreaElement>} value="" onValueChange={() => {}} />],
  ["SutradharSting", (ref) => <SutradharSting ref={ref as React.Ref<SVGSVGElement>} />],
];

describe("forwarded refs keep their React 19 cleanup when the component merges them", () => {
  // jsdom has no Element.scrollTo (the chat viewport scrolls to the end on mount).
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};

  // Tests run under StrictMode, which mounts twice (attach, cleanup, attach): the invariant is that every attach is
  // matched by a cleanup once unmounted, and that the callback is never also called with null.
  it.each(cases)("%s", (_name, element) => {
    const { ref, log } = cleanupRef<Element>();
    const { unmount } = render(element(ref as React.Ref<never>));
    expect(log[0]).toBe("attach");
    unmount();
    expect(log).not.toContain("null");
    expect(log.at(-1)).toBe("cleanup");
    expect(log.filter((l) => l === "attach")).toHaveLength(log.filter((l) => l === "cleanup").length);
  });
});
