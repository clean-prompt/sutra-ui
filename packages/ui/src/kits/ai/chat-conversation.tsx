import * as React from "react";
import { RiArrowDownLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { type StickToBottomState, type UseStickToBottomOptions, useStickToBottom } from "../../hooks/use-stick-to-bottom";
import { Button, type ButtonProps } from "../../primitives/button";
import { EmptyState } from "../../primitives/empty-state";
import { assignRef as setRef } from "../../lib/refs";

export { useStickToBottom, type StickToBottomState, type UseStickToBottomOptions } from "../../hooks/use-stick-to-bottom";

const ChatConversationContext = React.createContext<StickToBottomState | null>(null);

/** Access the enclosing ChatConversation's scroll state. */
export function useChatConversation() {
  const ctx = React.useContext(ChatConversationContext);
  if (!ctx) throw new Error("useChatConversation must be used within <ChatConversation>");
  return ctx;
}

export interface ChatConversationProps extends React.HTMLAttributes<HTMLDivElement>, UseStickToBottomOptions {}

/** Message viewport with stick-to-bottom scrolling. Give it a height (or place it in a flex column). */
export const ChatConversation = React.forwardRef<HTMLDivElement, ChatConversationProps>(
  ({ threshold, resize, initial, className, ...props }, ref) => {
    const state = useStickToBottom({ threshold, resize, initial });
    return (
      <ChatConversationContext.Provider value={state}>
        <div ref={ref} data-slot="chat-conversation" className={cn("relative min-h-0 flex-1 overflow-hidden", className)} {...props} />
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
        data-slot="chat-conversation-viewport"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        className={cn("scrollbar-thin absolute inset-0 overflow-y-auto overscroll-contain", viewportClassName)}
      >
        <div
          ref={contentRef}
          data-slot="chat-conversation-content"
          className={cn(
            "mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6",
            // The newest message rises in; earlier ones stay put. motion-safe because the global reduced-motion net acts on the element that carries the class, not on the child this variant reaches. A decorative last child (a Skeleton is aria-hidden) keeps its own loop.
            "motion-safe:[&>:last-child:not([aria-hidden])]:animate-fade-up",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
ChatConversationContent.displayName = "ChatConversationContent";

export interface ChatScrollButtonProps extends Omit<ButtonProps, "children"> {
  /** Accessible name and tooltip of the button. Default "Scroll to bottom". */
  label?: string;
}

/** Floating "jump to latest" button, shown when the viewport is scrolled away from the bottom. */
export const ChatScrollButton = React.forwardRef<HTMLButtonElement, ChatScrollButtonProps>(
  ({ label = "Scroll to bottom", className, onClick, ...props }, ref) => {
    const { isAtBottom, scrollToBottom } = useChatConversation();
    return (
      <Button
        ref={ref}
        data-slot="chat-scroll-button"
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
          "absolute bottom-4 start-1/2 z-10 -translate-x-1/2 rtl:translate-x-1/2 rounded-full bg-background/90 shadow-md backdrop-blur-sm transition-[opacity,transform,translate,scale,rotate,background-color] duration-200",
          "data-[state=hidden]:pointer-events-none data-[state=hidden]:translate-y-2 data-[state=hidden]:opacity-0",
          className
        )}
        {...props}
      >
        <RiArrowDownLine aria-hidden />
      </Button>
    );
  }
);
ChatScrollButton.displayName = "ChatScrollButton";

export interface ChatEmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Icon above the title. */
  icon?: React.ReactNode;
  /** Heading of the empty state. */
  title?: React.ReactNode;
  /** Helper text under the heading. */
  description?: React.ReactNode;
}

/** Centered welcome state for a new conversation; pass suggestions as children. A preset of `EmptyState variant="welcome"`. */
export const ChatEmptyState = React.forwardRef<HTMLDivElement, ChatEmptyStateProps>(
  ({ icon, title, description, ...props }, ref) => (
    <EmptyState
      ref={ref as React.Ref<HTMLElement>}
      variant="welcome"
      icon={icon || undefined}
      title={title || undefined}
      description={description || undefined}
      {...props}
    />
  )
);
ChatEmptyState.displayName = "ChatEmptyState";
