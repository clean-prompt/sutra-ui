import * as React from "react";
import {
  AlertBanner,
  Button,
  InlineAlert,
  InlineAlertActions,
  InlineAlertDescription,
  InlineAlertTitle,
  Snackbar,
  Toaster,
  snackbar,
  toast,
  type AlertBannerTone,
  type Tone,
} from "@sutra/ui";
import { RiArchiveLine, RiCheckLine, RiRocketLine, RiWifiOffLine } from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

const alertTones: { tone: Tone; title: string; description: string }[] = [
  { tone: "info", title: "Scheduled maintenance", description: "The API will be read-only on Sunday from 02:00 to 03:00 UTC." },
  { tone: "success", title: "Payment received", description: "Invoice #4021 was paid in full. A receipt is on its way." },
  { tone: "warning", title: "Storage almost full", description: "You've used 92% of your 50 GB. Upgrade to keep syncing files." },
  { tone: "destructive", title: "Couldn't save changes", description: "The server rejected the request. Check your connection and try again." },
  { tone: "neutral", title: "Read-only workspace", description: "Ask an admin for edit access to make changes here." },
  { tone: "primary", title: "New: shared views", description: "Save filters as a view and share it with your team." },
];

const bannerTones: { tone: AlertBannerTone; message: React.ReactNode }[] = [
  { tone: "primary", message: <><strong>Sutra 2.0</strong> is here with a redesigned editor.</> },
  { tone: "neutral", message: "We've updated our privacy policy." },
  { tone: "info", message: "Scheduled maintenance on Sunday, 02:00 UTC." },
  { tone: "success", message: "All systems operational." },
  { tone: "warning", message: "Your trial ends in 3 days." },
  { tone: "destructive", message: "Payment failed. Update your billing details to avoid interruption." },
  { tone: "inverse", message: "Join our live product walkthrough on Thursday." },
];

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function DismissibleAlert() {
  const [open, setOpen] = React.useState(true);
  if (!open) {
    return (
      <Button variant="secondary" size="sm" className="self-start" onClick={() => setOpen(true)}>
        Show alert again
      </Button>
    );
  }
  return (
    <InlineAlert tone="primary" appearance="outline" onDismiss={() => setOpen(false)}>
      <InlineAlertTitle>Two-factor authentication is off</InlineAlertTitle>
      <InlineAlertDescription>
        Protect your account with an authenticator app. It takes about two minutes.
      </InlineAlertDescription>
      <InlineAlertActions>
        <Button size="xs">Enable 2FA</Button>
        <Button size="xs" variant="ghost" onClick={() => setOpen(false)}>
          Remind me later
        </Button>
      </InlineAlertActions>
    </InlineAlert>
  );
}

function DismissibleBanner() {
  const [open, setOpen] = React.useState(true);
  // Keep the banner mounted so its exit animation can play before it unmounts itself.
  return (
    <>
      <AlertBanner
        tone="primary"
        open={open}
        onOpenChange={setOpen}
        dismissible
        message="Early-bird pricing ends Friday."
        action={{ label: "See plans", href: "#alert-banner" }}
      />
      {!open && (
        <div className="flex justify-center p-2">
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            Restore banner
          </Button>
        </div>
      )}
    </>
  );
}

export function FeedbackPage() {
  return (
    <PageIntro
      eyebrow="Components"
      title="Feedback"
      description="Inline alerts, transient toasts and snackbars, and full-width announcement banners."
    >
      <Toaster />

      <Demo
        id="inline-alert"
        title="Inline alert"
        description="Six tones in soft, outline and accent appearances, with optional actions and dismiss."
        align="start"
        canvasClassName="gap-6"
      >
        <div className="space-y-3">
          <DemoLabel>Soft</DemoLabel>
          <div className="grid gap-3 md:grid-cols-2">
            {alertTones.map(({ tone, title, description }) => (
              <InlineAlert key={tone} tone={tone}>
                <InlineAlertTitle>{title}</InlineAlertTitle>
                <InlineAlertDescription>{description}</InlineAlertDescription>
              </InlineAlert>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <DemoLabel>Outline</DemoLabel>
          <div className="grid gap-3 md:grid-cols-2">
            {alertTones.map(({ tone, title }) => (
              <InlineAlert key={tone} tone={tone} appearance="outline">
                <InlineAlertTitle>{title}</InlineAlertTitle>
              </InlineAlert>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <DemoLabel>Accent</DemoLabel>
          <div className="grid gap-3 md:grid-cols-2">
            {alertTones.map(({ tone, description }) => (
              <InlineAlert key={tone} tone={tone} appearance="accent">
                <InlineAlertDescription>{description}</InlineAlertDescription>
              </InlineAlert>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <DemoLabel>Actions, dismiss & custom icon</DemoLabel>
          <InlineAlert tone="warning">
            <InlineAlertTitle>Your API key expires in 7 days</InlineAlertTitle>
            <InlineAlertDescription>
              Rotate it from <a href="#inline-alert">Settings → API keys</a> to avoid failed requests.
            </InlineAlertDescription>
            <InlineAlertActions>
              <Button size="xs" variant="secondary">
                Rotate key
              </Button>
              <Button size="xs" variant="ghost">
                Learn more
              </Button>
            </InlineAlertActions>
          </InlineAlert>
          <DismissibleAlert />
          <InlineAlert tone="neutral" icon={<RiWifiOffLine aria-hidden />}>
            <InlineAlertDescription>You're offline. Changes will sync when you reconnect.</InlineAlertDescription>
          </InlineAlert>
          <InlineAlert tone="info" icon={false}>
            <InlineAlertDescription>An alert without an icon, for dense layouts.</InlineAlertDescription>
          </InlineAlert>
        </div>
      </Demo>

      <Demo
        id="toast"
        title="Toast"
        description="Sonner-powered toasts styled with Sutra tokens. Render <Toaster /> once, then call toast() anywhere."
      >
        <Button variant="secondary" onClick={() => toast("Event created", { description: "Monday, Jan 12 at 9:00 AM" })}>
          Default
        </Button>
        <Button variant="secondary" onClick={() => toast.success("Profile updated")}>
          Success
        </Button>
        <Button
          variant="secondary"
          onClick={() => toast.error("Upload failed", { description: "report.pdf exceeds the 25 MB limit." })}
        >
          Error
        </Button>
        <Button variant="secondary" onClick={() => toast.warning("You have unsaved changes")}>
          Warning
        </Button>
        <Button variant="secondary" onClick={() => toast.info("A new version is available")}>
          Info
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            toast("File moved to trash", {
              action: { label: "Undo", onClick: () => toast.success("File restored") },
            })
          }
        >
          With action
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            toast.promise(wait(2000), {
              loading: "Deploying to production…",
              success: "Deployed in 2.0s",
              error: "Deployment failed",
            })
          }
        >
          Promise
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            const id = toast.loading("Generating report…");
            setTimeout(() => toast.success("Report ready", { id }), 1800);
          }}
        >
          Loading → success
        </Button>
        <Button variant="ghost" onClick={() => toast.dismiss()}>
          Dismiss all
        </Button>
      </Demo>

      <Demo
        id="snackbar"
        title="Snackbar"
        description="Compact inverse bar with an optional action. Use the component inline or trigger one with snackbar()."
        align="start"
        canvasClassName="gap-4"
      >
        <DemoLabel>Inline</DemoLabel>
        <div className="flex flex-col items-start gap-3">
          <Snackbar message="Conversation archived" action={{ label: "Undo" }} onDismiss={() => undefined} />
          <Snackbar message="Changes saved" icon={<RiCheckLine />} />
          <Snackbar
            message="Couldn't reach the server. Retrying in 10 seconds."
            icon={<RiWifiOffLine />}
            action={{ label: "Retry now" }}
          />
        </div>
        <DemoLabel>Imperative</DemoLabel>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            leadingIcon={<RiArchiveLine />}
            onClick={() =>
              snackbar("3 emails archived", {
                icon: <RiArchiveLine />,
                action: { label: "Undo", onClick: () => toast.success("Emails restored") },
              })
            }
          >
            Archive emails
          </Button>
          <Button
            variant="secondary"
            onClick={() => snackbar("Link copied to clipboard", { closable: false, duration: 2500 })}
          >
            Copy link
          </Button>
        </div>
      </Demo>

      <Demo
        id="alert-banner"
        title="Alert banner"
        description="Full-width announcement bar for the top of an app. Shown here contained in the card."
        align="start"
        canvasClassName="gap-0 p-0 sm:p-0"
      >
        <div className="flex flex-col divide-y divide-border">
          {bannerTones.map(({ tone, message }) => (
            <AlertBanner
              key={tone}
              tone={tone}
              message={message}
              action={tone === "primary" || tone === "destructive" ? { label: tone === "primary" ? "What's new" : "Update billing", href: "#alert-banner" } : undefined}
            />
          ))}
          <AlertBanner tone="inverse" align="start" icon={<RiRocketLine />} message="Start-aligned banner with a custom icon." />
          <DismissibleBanner />
        </div>
      </Demo>
    </PageIntro>
  );
}
