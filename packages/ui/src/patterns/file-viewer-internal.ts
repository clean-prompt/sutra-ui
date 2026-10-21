/** Private constant shared by the file viewer modules: the byte-size format used for file sizes. */
import type { FormatBytesOptions } from "../lib/format";

/** File sizes: `"1.4 MB"`, `"12 MB"`, `""` when unknown. */
export const FILE_SIZE: FormatBytesOptions = { trimZeros: false, wholeAbove: 10, invalid: "" };
