/* base64url and base32 codecs (UTF-8 safe). Pure; decoders return null instead of throwing. */

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function toBytes(input: string | Uint8Array): Uint8Array {
  return typeof input === "string" ? new TextEncoder().encode(input) : input;
}

/** Standard base64 of bytes. */
function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

/** Unpadded base64url of a UTF-8 string or of raw bytes. */
export function base64UrlEncode(input: string | Uint8Array): string {
  return bytesToBase64(toBytes(input)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Bytes from base64url (also accepts standard base64 and `=` padding); `null` when malformed. */
export function base64UrlDecodeBytes(input: string): Uint8Array | null {
  if (typeof input !== "string") return null;
  const clean = input.trim().replace(/=+$/, "");
  if (!/^[A-Za-z0-9_+/-]*$/.test(clean) || clean.length % 4 === 1) return null;
  let b64 = clean.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  try {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/** UTF-8 string from base64url; `null` when malformed or not valid UTF-8. */
export function base64UrlDecode(input: string): string | null {
  const bytes = base64UrlDecodeBytes(input);
  if (!bytes) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** Unpadded RFC 4648 base32 of a UTF-8 string or of raw bytes. */
export function base32Encode(input: string | Uint8Array): string {
  const bytes = toBytes(input);
  let out = "";
  let bits = 0;
  let value = 0;
  for (let i = 0; i < bytes.length; i++) {
    value = ((value << 8) | bytes[i]!) & 0xffff;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

/** Bytes from RFC 4648 base32 (lenient: any case, spaces, dashes and `=` padding ignored); `null` on a bad character. */
export function base32Decode(input: string): Uint8Array | null {
  if (typeof input !== "string") return null;
  const clean = input.toUpperCase().replace(/[\s-]/g, "").replace(/=+$/, "");
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) return null;
    value = ((value << 5) | idx) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}
