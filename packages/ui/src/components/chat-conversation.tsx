import * as React from "react";
import { RiArrowDownLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { useResizeObserver } from "../hooks/use-resize-observer";
import { Button, type ButtonProps } from "./button";

export interface UseStickToBottomOptions {
  /** Distance in px from the bottom that still counts as "at bottom". */
  threshold?: number;
  /** Scroll behavior used when content grows while stuck to the bottom. */
  resize?: ScrollBehavior;
  /** Scroll behavior for the first jump to the bottom on mount. */
  initial?: ScrollBehavior | false;
}

export interface StickToBottomState {
  /** Attach to the scrolling element. */
  scrollRef: (node: HTMLElement | null) => void;
  /** Attach to the element wrapping the messages; its size changes trigger auto-scroll. */
  contentRef: (node: HTMLElement | null) => void;
  isAtBottom: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

/** Keep a scroller pinned to the bottom while content grows, until the user scrolls up. */
export function useStickToBottom({
  threshold = 64,
  resize = "smooth",
  initial = "instant",
}: UseStickToBottomOptions = {}): StickToBottomState {
  const [scrollEl, setScrollEl] = React.useState<HTMLElement | null>(null);
  const [contentEl, setContentEl] = React.useState<HTMLElement | null>(null);
  const [isAtBottom, setIsAtBottom] = React.useState(true);
  const stuck = React.useRef(true);
  const lastTop = React.useRef(0);

  const scrollToBottom = React.useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      if (!scrollEl) return;
      stuck.current = true;
      setIsAtBottom(true);
      scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior });
    },
    [scrollEl]
  );

  React.useEffect(() => {
    if (!scrollEl) return;
    if (initial !== false) scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: initial });
    lastTop.current = scrollEl.scrollTop;

    const onScroll = () => {
      const top = scrollEl.scrollTop;
      const distance = scrollEl.scrollHeight - top - scrollEl.clientHeight;
      const atBottom = distance <= threshold;
      if (atBottom) stuck.current = true;
      else if (top < lastTop.current - 1) stuck.current = false;
      lastTop.current = top;
      setIsAtBottom(atBottom || stuck.current);
    };
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < 0 && scrollEl.scrollHeight > scrollEl.clientHeight) {
        stuck.current = false;
      }
    };
    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    scrollEl.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      scrollEl.removeEventListener("scroll", onScroll);
      scrollEl.removeEventListener("wheel", onWheel);
    };
    // `initial` only matters on mount of the scroller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollEl, threshold]);

  const onResize = () => {
    if (!scrollEl) return;
    if (stuck.current) {
      scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: resize });
    } else {
      const distance = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;
      setIsAtBottom(distance <= threshold);
    }
  };
  useResizeObserver(contentEl ?? scrollEl, onResize);
  useResizeObserver(contentEl ? scrollEl : null, onResize);

  return { scrollRef: setScrollEl, contentRef: setContentEl, isAtBottom, scrollToBottom };
}

const ChatConversationContext = React.createContext<StickToBottomState | null>(null);

/** Access the enclosing ChatConversation's scroll state. */
export function useChatConversation() {
  const ctx = React.useContext(ChatConversationContext);
  if (!ctx) throw new Error("useChatConversation must be used within <ChatConversation>");
  return ctx;
}

function setRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as React.RefObject<T | null>).current = value;
}

export interface ChatConversationProps extends React.HTMLAttributes<HTMLDivElement>, UseStickToBottomOptions {}

/** Message viewport with stick-to-bottom scrolling. Give it a height (or place it in a flex column). */
export const ChatConversation = React.forwardRef<HTMLDivElement, ChatConversationProps>(
  ({ threshold, resize, initial, className, ...props }, ref) => {
    const state = useStickToBottom({ threshold, resize, initial });
    return (
      <ChatConversationContext.Provider value={state}>
        <div ref={ref} className={cn("relative min-h-0 flex-1 overflow-hidden", className)} {...props} />
      </ChatConversationContext.Provider>
    );
  }
);
ChatConversation.displayName = "ChatConversation";

export interface ChatConversationContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Classes for the scrolling viewport (the outer element). `className` styles the inner message column. */
  viewportClassName?: string;
}

/** Scrollable message column. Put ChatMessage elements inside. */
export const ChatConversationContent = React.forwardRef<HTMLDivElement, ChatConversationContentProps>(
  ({ viewportClassName, className, ...props }, ref) => {
    const { scrollRef, contentRef } = useChatConversation();
    const setViewport = React.useCallback(
      (node: HTMLDivElement | null) => {
        scrollRef(node);
        setRef(ref, node);
      },
      [scrollRef, ref]
    );
    return (
      <div
        ref={setViewport}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        className={cn("scrollbar-thin absolute inset-0 overflow-y-auto overscroll-contain", viewportClassName)}
      >
        <div
          ref={contentRef}
          className={cn("mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6", className)}
          {...props}
        />
      </div>
    );
  }
);
ChatConversationContent.displayName = "ChatConversationContent";

export type ChatScrollButtonProps = Omit<ButtonProps, "children"> & { label?: string };

/** Floating "jump to latest" button, shown when the viewport is scrolled away from the bottom. */
export const ChatScrollButton = React.forwardRef<HTMLButtonElement, ChatScrollButtonProps>(
  ({ label = "Scroll to bottom", className, onClick, ...props }, ref) => {
    const { isAtBottom, scrollToBottom } = useChatConversation();
    return (
      <Button
        ref={ref}
        variant="secondary"
        size="icon-sm"
        aria-label={label}
        title={label}
        aria-hidden={isAtBottom || undefined}
        tabIndex={isAtBottom ? -1 : undefined}
        data-state={isAtBottom ? "hidden" : "visible"}
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented) scrollToBottom("smooth");
        }}
        className={cn(
          "absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-background/90 shadow-md backdrop-blur-sm transition-[opacity,transform,background-color] duration-200",
          "data-[state=hidden]:pointer-events-none data-[state=hidden]:translate-y-2 data-[state=hidden]:opacity-0",
          className
        )}
        {...props}
      >
        <RiArrowDownLine />
      </Button>
    );
  }
);
ChatScrollButton.displayName = "ChatScrollButton";

export interface ChatEmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
}

/** Centered welcome state for a new conversation; pass suggestions as children. */
export const ChatEmptyState = React.forwardRef<HTMLDivElement, ChatEmptyStateProps>(
  ({ icon, title, description, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-4 px-4 py-12 text-center", className)}
      {...props}
    >
      {icon && (
        <div className="flex size-12 items-center justify-center rounded-box border border-border bg-card text-foreground shadow-sm [&_svg]:size-6">
          {icon}
        </div>
      )}
      {(title || description) && (
        <div className="flex flex-col gap-1.5">
          {title && <h2 className="text-display-xs font-semibold tracking-tight text-foreground text-balance">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground text-pretty">{description}</p>}
        </div>
      )}
      {children && <div className="mt-2 w-full">{children}</div>}
    </div>
  )
);
ChatEmptyState.displayName = "ChatEmptyState";
