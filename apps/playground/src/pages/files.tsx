import * as React from "react";
import {
  Button,
  CameraCapture,
  FileViewer,
  ImageCropper,
  Monogram,
  SelectionArea,
  imageCropperAspectOptions,
  useSelectionArea,
  type ViewerFile,
} from "@sutra/ui";
import { PdfThumbnail, PdfViewer, pdfRenderer } from "@sutra/ui/pdf";
import workerSrc from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { Demo, PageIntro } from "../components/demo";

/** A gradient SVG as a data URL, so the demos need no network images. */
function gradient(from: string, to: string, label: string, w = 1200, h = 800) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w * 0.72}" cy="${h * 0.3}" r="${h * 0.12}" fill="white" fill-opacity="0.35"/><path d="M0 ${h * 0.8} L${w * 0.3} ${h * 0.5} L${w * 0.55} ${h * 0.72} L${w * 0.75} ${h * 0.55} L${w} ${h * 0.75} V${h} H0Z" fill="black" fill-opacity="0.18"/><text x="${w * 0.05}" y="${h * 0.92}" font-family="sans-serif" font-size="${h * 0.07}" font-weight="700" fill="white">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** A small, valid two-page PDF built at runtime (with a correct xref table). */
function samplePdf() {
  const stream = (title: string) => {
    const body = `BT /F1 28 Tf 72 700 Td (${title}) Tj 0 -40 Td /F1 14 Tf (Rendered by pdf.js through PdfViewer.) Tj ET`;
    return `<</Length ${body.length}>>\nstream\n${body}\nendstream`;
  };
  const objects = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R 5 0 R]/Count 2>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 7 0 R>>>>>>",
    stream("Quarterly report"),
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 6 0 R/Resources<</Font<</F1 7 0 R>>>>>>",
    stream("Page two: highlights"),
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([out], { type: "application/pdf" });
}

/* ------------------------------------------------------------------ */
/* Cropper                                                             */
/* ------------------------------------------------------------------ */

function CropperDemo() {
  const [result, setResult] = React.useState<string | null>(null);
  React.useEffect(() => () => (result ? URL.revokeObjectURL(result) : undefined), [result]);
  return (
    <div className="grid grid-cols-1 w-full gap-4 lg:grid-cols-[1fr_16rem]">
      <ImageCropper
        src={gradient("#615fff", "#00b8db", "Harbor at dawn")}
        aspectOptions={imageCropperAspectOptions}
        zoomable
        onComplete={(blob) => setResult(URL.createObjectURL(blob))}
      />
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>Drag the box or its handles, pick an aspect, rotate, then Apply. With the box focused, arrows move it and Alt/Option + arrows resize it.</p>
        {result ? <img src={result} alt="Cropped result" className="w-full rounded-box border border-border" /> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Marquee selection                                                   */
/* ------------------------------------------------------------------ */

const files = ["Budget.xlsx", "Photos", "Roadmap.pdf", "Notes.md", "Logo.svg", "Invoices", "Trip.mov", "Draft.docx", "Readme.txt", "Backup.zip", "Specs.pdf", "Music"];

function FileTile({ id }: { id: string }) {
  const { getItemProps, isSelected } = useSelectionArea();
  return (
    <div
      {...getItemProps(id)}
      className={`flex flex-col items-center gap-2 rounded-box border p-3 text-center text-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 ${
        isSelected(id) ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border bg-card"
      }`}
    >
      <Monogram name={id} size="md" />
      <span className="w-full truncate">{id}</span>
    </div>
  );
}

function MarqueeDemo() {
  const [selected, setSelected] = React.useState<string[]>([]);
  return (
    <div className="w-full space-y-2">
      <SelectionArea
        value={selected}
        onValueChange={setSelected}
        items={files}
        aria-label="Files"
        className="grid grid-cols-3 gap-3 rounded-box border border-dashed border-border p-4 sm:grid-cols-4 lg:grid-cols-6"
      >
        {files.map((f) => (
          <FileTile key={f} id={f} />
        ))}
      </SelectionArea>
      <p className="text-sm text-muted-foreground">
        Drag on empty space to select; Shift adds, Cmd/Ctrl toggles. Click an item, Cmd/Ctrl+A selects all, Escape clears. Selected:{" "}
        {selected.length ? selected.join(", ") : "none"}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PDF                                                                 */
/* ------------------------------------------------------------------ */

function PdfDemo() {
  const blob = React.useMemo(samplePdf, []);
  const viewerFiles: ViewerFile[] = React.useMemo(
    () => [
      { name: "Quarterly report.pdf", blob, mimeType: "application/pdf", size: blob.size },
      { name: "Harbor.svg", url: gradient("#615fff", "#00b8db", "Harbor"), mimeType: "image/svg+xml" },
    ],
    [blob]
  );
  const renderers = React.useMemo(() => [pdfRenderer({ workerSrc })], []);
  return (
    <div className="grid w-full grid-cols-1 gap-4">
      <PdfViewer blob={blob} fileName="Quarterly report.pdf" workerSrc={workerSrc} height={420} />
      <div className="flex flex-wrap items-start gap-4">
        <PdfThumbnail blob={blob} workerSrc={workerSrc} width={120} alt="Quarterly report, first page" />
        <p className="max-w-sm text-sm text-muted-foreground">
          PdfThumbnail draws the first page for file cards. Below, FileViewer uses the same pdf.js viewer through{" "}
          <code>renderers=[pdfRenderer()]</code>, with gallery navigation to the next file.
        </p>
      </div>
      <FileViewer inline files={viewerFiles} renderers={renderers} className="h-[30rem]" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function FilesPage() {
  const [captured, setCaptured] = React.useState<string | null>(null);
  return (
    <PageIntro
      eyebrow="Patterns"
      title="Files & capture"
      description="Image cropping, camera capture, rubber-band selection for file grids, and PDF viewing (@sutra/ui/pdf, with pdfjs-dist as an optional peer)."
    >
      <Demo id="image-cropper" title="Image cropper" description="Crop box with handles, aspect presets, rotation, zoom and a cropped-image export." align="start">
        <CropperDemo />
      </Demo>
      <Demo id="camera-capture" title="Camera capture" description="Photo or video with review. Without a camera (or permission) it shows a clear state instead of a blank box." align="start">
        <div className="@container w-full">
          <div className="grid grid-cols-1 w-full gap-4 @2xl:grid-cols-2">
            <CameraCapture mode="photo" onCapture={(blob) => setCaptured(URL.createObjectURL(blob))} />
            <CameraCapture mode="video" maxDuration={10} countdown={3} prompts={["Look at the camera", "Turn your head left", "Turn your head right"]} onCapture={() => undefined} />
          </div>
        </div>
        {captured ? (
          <div className="mt-3 flex items-center gap-3">
            <img src={captured} alt="Captured" className="h-24 rounded-box border border-border" />
            <Button size="sm" variant="ghost" onClick={() => setCaptured(null)}>
              Clear
            </Button>
          </div>
        ) : null}
      </Demo>
      <Demo id="selection-area" title="Selection area" description="Rubber-band selection over a file grid, with keyboard selection and announcements." align="start">
        <MarqueeDemo />
      </Demo>
      <Demo id="pdf-viewer" title="PDF viewer" description="pdf.js pages rendered lazily, zoom, page navigation and a selectable text layer; strict-CSP friendly." align="start">
        <PdfDemo />
      </Demo>
    </PageIntro>
  );
}
