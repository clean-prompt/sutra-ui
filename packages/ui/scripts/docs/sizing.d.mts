export const TARGET_PX: number;
export function lengthPx(token: string): number | null;
export interface ParsedSize {
  height: number | null;
  width: number | null;
  maxWidth: number | null;
  padX: number | null;
  padY: number | null;
  text: { name: string; px: number } | null;
  icon: number | null;
  hit: boolean;
  parts: string[];
}
export function parseSizeClasses(text: string): ParsedSize;
export interface SizingRow {
  component: string;
  layer: string;
  entry: string;
  size: string;
  isDefault: boolean;
  raw: string;
  height: number | null;
  width: number | null;
  maxWidth: number | null;
  padX: number | null;
  padY: number | null;
  text: { name: string; px: number } | null;
  icon: number | null;
  nested: boolean;
  hit: boolean;
  under: boolean;
}
export function buildSizingRows(api: { components: Record<string, { layer: string; entry: string; sizes?: Record<string, string>; hitArea?: boolean; props: { name: string; default?: string }[] }> }): SizingRow[];
export function describeRow(row: SizingRow): { size: string; box: string; padding: string; text: string; icon: string; target: string };
export function sizingMarkdown(rows: SizingRow[]): string;
