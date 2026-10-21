import * as React from "react";
import { Button, InlineCode, Text, WheelPicker, WheelPickerGroup, wheelRange, type WheelPickerOption } from "@cleanprompt/sutra-ui";
import { Demo, DemoLabel } from "../components/demo";

const hours12 = wheelRange(1, 12);
const minutes = wheelRange(0, 59, { pad: 2 });
const timeColumns = [
  { id: "hour", label: "Hours", options: hours12, separator: ":" },
  { id: "minute", label: "Minutes", options: minutes },
  { id: "period", label: "AM or PM", options: ["AM", "PM"] },
];
const durationColumns = [
  { id: "h", label: "Hours", options: wheelRange(0, 23), separator: "h", className: "w-16 flex-none" },
  { id: "m", label: "Minutes", options: wheelRange(0, 59, { step: 5 }), separator: "min", className: "w-16 flex-none" },
];
const days: WheelPickerOption[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => ({ value: d, disabled: d === "Wednesday" }));

function Readout({ children }: { children: React.ReactNode }) {
  return (
    <Text size="sm" tone="neutral" aria-live="polite">
      {children}
    </Text>
  );
}

function TimeWheel({ narrow }: { narrow?: boolean }) {
  const [time, setTime] = React.useState(["9", "30", "AM"]);
  return (
    <div className={narrow ? "w-56 max-w-full space-y-2" : "w-64 max-w-full space-y-2"}>
      <WheelPickerGroup aria-label="Start time" columns={timeColumns} value={time} onValueChange={setTime} />
      <Readout>
        Starts at {time[0]}:{time[1]} {time[2]}
      </Readout>
    </div>
  );
}

function DurationWheel() {
  const [value, setValue] = React.useState(["1", "30"]);
  return (
    <div className="w-fit max-w-full space-y-2">
      <WheelPickerGroup aria-label="Duration" columns={durationColumns} value={value} onValueChange={setValue} visibleCount={3} itemHeight={40} className="px-3" />
      <Readout>
        {value[0]} h {value[1]} min
      </Readout>
    </div>
  );
}

function SingleWheels() {
  const [day, setDay] = React.useState("Tuesday");
  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="w-40 space-y-2">
        <DemoLabel>Controlled, one row disabled</DemoLabel>
        <WheelPicker aria-label="Day" options={days} value={day} onValueChange={setDay} />
        <Readout>{day}</Readout>
      </div>
      <div className="w-24 space-y-2">
        <DemoLabel>Seven rows, 28 px</DemoLabel>
        <WheelPicker aria-label="Quantity" options={wheelRange(1, 40)} defaultValue="12" visibleCount={7} itemHeight={28} />
      </div>
      <div className="w-32 space-y-2">
        <DemoLabel>Loading</DemoLabel>
        <WheelPicker aria-label="Free slots" options={[]} loading />
      </div>
      <div className="w-32 space-y-2">
        <DemoLabel>Empty</DemoLabel>
        <WheelPicker aria-label="Free slots (none)" options={[]} emptyState="No free slots" />
      </div>
    </div>
  );
}

/** WheelPicker and WheelPickerGroup: time and duration pickers for touch. */
export function WheelPickerDemo() {
  const [slots, setSlots] = React.useState(false);
  return (
    <Demo
      id="wheel-picker"
      title="Wheel Picker"
      description={
        <>
          An iOS-style wheel: rows scroll with the mouse wheel or a finger and snap one at a time (CSS scroll-snap with{" "}
          <InlineCode>scroll-snap-stop: always</InlineCode>), and the centre row is the value once the scroll stops. Keyboard: focus the wheel, Arrow keys move a row,
          Page keys five, Home and End jump to the ends, typing selects by prefix; a click selects a row. Disabled rows are skipped. Reduced motion: keys
          jump instead of gliding.
        </>
      }
      align="start"
      canvasClassName="@container"
    >
      <div className="grid grid-cols-1 gap-6 @2xl:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <DemoLabel>Time (WheelPickerGroup, three columns)</DemoLabel>
          <TimeWheel />
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>Duration (steps of 5 minutes, three rows)</DemoLabel>
          <DurationWheel />
        </div>
        <div className="min-w-0 space-y-2 @2xl:col-span-2">
          <SingleWheels />
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>Options arrive late (loading, then a list)</DemoLabel>
          <Button size="sm" variant="outline" onClick={() => setSlots((s) => !s)}>
            {slots ? "Reload" : "Load slots"}
          </Button>
          <div className="w-40">
            <WheelPicker aria-label="Slots" options={slots ? wheelRange(9, 17).map((h) => `${h}:00`) : []} loading={!slots} defaultValue="12:00" />
          </div>
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>Narrow container</DemoLabel>
          <TimeWheel narrow />
        </div>
      </div>
    </Demo>
  );
}
