import * as React from "react";
import { Button, Carousel, InlineCode, Text } from "@cleanprompt/sutra-ui";
import { RiBarChartBoxLine, RiCalendarCheckLine, RiMailLine, RiNotification3Line, RiTaskLine } from "@cleanprompt/sutra-ui/icons";
import { Demo, DemoLabel } from "../components/demo";

const stories = [
  { icon: <RiTaskLine />, title: "Plan your week", text: "Drag tasks onto days and let the calendar keep the rest in order." },
  { icon: <RiMailLine />, title: "Clear the inbox", text: "Swipe to archive, snooze or reply, and get to zero by lunch." },
  { icon: <RiCalendarCheckLine />, title: "Build a habit", text: "A streak that survives a missed day, with a timer for the days you do it." },
  { icon: <RiBarChartBoxLine />, title: "Watch the numbers", text: "Spending, sleep and focus time on one page, updated as you go." },
  { icon: <RiNotification3Line />, title: "Stay in the loop", text: "Quiet notifications, grouped by what needs you first." },
];

/** One element per slide: a Carousel takes its slides as direct children, not inside a fragment. */
const slides = () =>
  stories.map((s) => (
        <div key={s.title} className="flex h-full min-h-36 flex-col justify-between gap-3 rounded-box border border-border bg-card p-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-muted text-foreground [&>svg]:size-5">{s.icon}</span>
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-semibold" title={s.title}>
              {s.title}
            </p>
            <p className="text-sm text-muted-foreground">{s.text}</p>
          </div>
        </div>
  ));

function ControlledCarousel() {
  const [index, setIndex] = React.useState(0);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setIndex(stories.length - 1)}>
          Jump to the last
        </Button>
        <Text size="sm" tone="neutral" aria-live="polite">
          Showing slide {index + 1} of {stories.length}
        </Text>
      </div>
      <Carousel label="Controlled stories" value={index} onValueChange={setIndex}>
        {slides()}
      </Carousel>
    </div>
  );
}

/** Carousel: scroll-snap strip with arrows, dots, keys, autoplay that can be paused. */
export function CarouselDemo() {
  const [loading, setLoading] = React.useState(true);
  return (
    <Demo
      id="carousel"
      title="Carousel"
      description={
        <>
          A native <InlineCode>scroll-snap</InlineCode> strip: swipe, trackpad and wheel just work, and the slide in view is found with an IntersectionObserver.
          Keyboard: Tab to the strip, then Arrow keys, Home and End (the arrow buttons and dots work the same). <InlineCode>autoplay</InlineCode> pauses on
          hover and focus, has a visible pause button, and starts paused under reduced motion (press play to opt in).
        </>
      }
      align="start"
      canvasClassName="@container"
    >
      <div className="grid grid-cols-1 gap-8 @3xl:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <DemoLabel>Default: arrows and dots</DemoLabel>
          <Carousel label="Product stories">
            {slides()}
          </Carousel>
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>autoplay (3 s) with progress, pause button and loop</DemoLabel>
          <Carousel label="Auto-playing stories" autoplay={3000} progress loop>
            {slides()}
          </Carousel>
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>Peek: slideClassName="basis-4/5", align="center"</DemoLabel>
          <Carousel label="Peeking stories" slideClassName="basis-4/5" align="center" dots={false}>
            {slides()}
          </Carousel>
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>Controlled (value, onValueChange)</DemoLabel>
          <ControlledCarousel />
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>Narrow container</DemoLabel>
          <div className="w-60 max-w-full">
            <Carousel label="Narrow stories">
              {slides()}
            </Carousel>
          </div>
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>Loading, then empty</DemoLabel>
          <Button size="sm" variant="outline" onClick={() => setLoading((l) => !l)}>
            {loading ? "Show empty" : "Show loading"}
          </Button>
          <Carousel label="Loading stories" loading={loading} emptyState="No stories yet">
            {null}
          </Carousel>
        </div>
      </div>
    </Demo>
  );
}
