import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AlertBanner,
  InlineAlert,
  InlineAlertDescription,
  InlineAlertTitle,
  Snackbar,
  Toaster,
  toast,
} from "../src";
import { axeViolations } from "./a11y";

describe("Toaster + toast()", () => {
  // jsdom lacks setPointerCapture, which sonner calls on pointerdown.
  const original = Element.prototype.setPointerCapture;
  beforeAll(() => {
    Element.prototype.setPointerCapture ??= () => {};
  });
  afterAll(() => {
    Element.prototype.setPointerCapture = original;
  });

  afterEach(() => {
    act(() => {
      toast.dismiss();
    });
  });

  it("renders a toast message and description", async () => {
    render(<Toaster />);
    act(() => {
      toast("File saved", { description: "All changes synced" });
    });
    expect(await screen.findByText("File saved")).toBeInTheDocument();
    expect(screen.getByText("All changes synced")).toBeInTheDocument();
  });

  it("renders typed toasts and fires actions", async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn();
    render(<Toaster />);
    act(() => {
      toast.success("Deleted", { action: { label: "Undo", onClick: onUndo } });
    });
    expect(await screen.findByText("Deleted")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });
});

describe("Snackbar", () => {
  it("renders a status with action and close", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const onClose = vi.fn();
    const { container } = render(
      <Snackbar message="Message archived" action={{ label: "Undo", onClick: onAction }} onClose={onClose} />
    );
    expect(screen.getByRole("status")).toHaveTextContent("Message archived");
    await user.click(screen.getByRole("button", { name: "Undo" }));
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("InlineAlert", () => {
  it("uses role=status for info and role=alert for destructive/warning", () => {
    render(
      <div>
        <InlineAlert>Info message</InlineAlert>
        <InlineAlert variant="destructive">Bad</InlineAlert>
        <InlineAlert variant="warning">Careful</InlineAlert>
      </div>
    );
    expect(screen.getByRole("status")).toHaveTextContent("Info message");
    expect(screen.getAllByRole("alert")).toHaveLength(2);
  });

  it("has no close button without onDismiss", () => {
    render(<InlineAlert>Hello</InlineAlert>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls onDismiss and can be removed by the parent", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    function Harness() {
      const [open, setOpen] = React.useState(true);
      return open ? (
        <InlineAlert
          variant="success"
          onDismiss={() => {
            onDismiss();
            setOpen(false);
          }}
        >
          <InlineAlertTitle>Saved</InlineAlertTitle>
          <InlineAlertDescription>Your profile was updated.</InlineAlertDescription>
        </InlineAlert>
      ) : null;
    }
    render(<Harness />);
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("supports a custom dismiss label and hiding the icon", () => {
    const { container } = render(
      <InlineAlert icon={false} onDismiss={() => {}} dismissLabel="Close alert">
        Text
      </InlineAlert>
    );
    expect(screen.getByRole("button", { name: "Close alert" })).toBeInTheDocument();
    expect(container.querySelector("[data-slot=inline-alert-icon]")).toBeNull();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <InlineAlert onDismiss={() => {}}>
          <InlineAlertTitle>Heads up</InlineAlertTitle>
          <InlineAlertDescription>Something happened.</InlineAlertDescription>
        </InlineAlert>
        <InlineAlert variant="destructive" appearance="outline">
          Error
        </InlineAlert>
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("AlertBanner", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a labelled region with message and action", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<AlertBanner message="New release" action={{ label: "Read more", onClick }} />);
    const region = screen.getByRole("region", { name: "Announcement" });
    expect(region).toHaveTextContent("New release");
    await user.click(screen.getByRole("button", { name: "Read more" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders an href action as a link", () => {
    render(<AlertBanner message="Hi" action={{ label: "Docs", href: "/docs" }} />);
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute("href", "/docs");
  });

  it("uses role=alert for destructive", () => {
    render(<AlertBanner variant="destructive" message="Outage" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Outage");
  });

  it("dismiss plays the exit state, then unmounts after the timeout", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <AlertBanner message="Maintenance tonight" dismissible onDismiss={onDismiss} onOpenChange={onOpenChange} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Dismiss banner" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    const region = screen.getByRole("region", { name: "Announcement" });
    expect(region).toHaveAttribute("data-state", "closed");

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("unmounts on animationend of the root while closing", () => {
    render(<AlertBanner message="Bye" dismissible />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss banner" }));
    const region = screen.getByRole("region");
    fireEvent.animationEnd(region);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("is controlled via open and re-mounts when reopened", () => {
    vi.useFakeTimers();
    function Harness() {
      const [open, setOpen] = React.useState(true);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            Show
          </button>
          <AlertBanner message="Controlled" dismissible open={open} onOpenChange={setOpen} />
        </div>
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss banner" }));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(screen.getByRole("region")).toHaveAttribute("data-state", "open");
  });

  it("renders nothing when defaultOpen is false", () => {
    render(<AlertBanner message="Hidden" defaultOpen={false} />);
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <AlertBanner message="We updated our terms" dismissible action={{ label: "Review", href: "/terms" }} />
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
