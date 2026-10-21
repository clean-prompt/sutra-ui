/*
 * kunji client: K1 / KC QR codecs.
 */

import { base32Decode, base32Encode, base64UrlDecodeBytes, base64UrlEncode } from "../../lib/encoding";
import type { KunjiQrPayload } from "./kunji-client-types";


/* ------------------------------------------------------------------ */
/* QR codecs (K1 / KC), byte-compatible with kunji's src/lib/qrCodec.js */
/* ------------------------------------------------------------------ */

const F_S_RAW = 1;
const F_C_RAW = 2;
const F_HAS_N = 4;
const F_HAS_K = 8;
const F_HAS_P = 16;

function b64urlToBytes(str: string): Uint8Array | null {
  return /^[A-Za-z0-9_-]+$/.test(str) ? base64UrlDecodeBytes(str) : null;
}

/** base64url of a UTF-8 string (safe for any characters). */
export function kunjiBase64Url(text: string) {
  return base64UrlEncode(text);
}

function packStruct(flags: number, fields: Uint8Array[]) {
  const total = 2 + fields.reduce((n, f) => n + 2 + f.length, 0);
  const buf = new Uint8Array(total);
  const dv = new DataView(buf.buffer);
  let o = 0;
  buf[o++] = 1;
  buf[o++] = flags;
  for (const f of fields) {
    if (f.length > 0xffff) throw new Error("field_too_long");
    dv.setUint16(o, f.length);
    o += 2;
    buf.set(f, o);
    o += f.length;
  }
  return base32Encode(buf);
}

/** Encode a lean login payload as a compact `K1:` string (QR alphanumeric mode). */
export function encodeKunjiCompactQr(payload: Omit<KunjiQrPayload, "kunjiAuth">): string {
  const enc = new TextEncoder();
  let flags = 0;
  const packToken = (str: string, bit: number) => {
    const bytes = b64urlToBytes(str);
    if (bytes && base64UrlEncode(bytes) === str) {
      flags |= bit;
      return bytes;
    }
    return enc.encode(str);
  };
  const fields = [
    packToken(String(payload.sessionId), F_S_RAW),
    packToken(String(payload.challenge), F_C_RAW),
    enc.encode(String(payload.audience)),
    enc.encode(String(payload.expiresAt)),
  ];
  if (payload.appName) {
    flags |= F_HAS_N;
    fields.push(enc.encode(payload.appName));
  }
  if (payload.callbackUrl) {
    flags |= F_HAS_K;
    fields.push(enc.encode(payload.callbackUrl));
  }
  if (payload.scope && payload.scope.length) {
    flags |= F_HAS_P;
    fields.push(enc.encode(JSON.stringify(payload.scope)));
  }
  return "K1:" + packStruct(flags, fields);
}

/** Decode a `K1:` string back to the lean payload. Throws on malformed input. */
export function decodeKunjiCompactQr(str: string): KunjiQrPayload {
  if (!str.startsWith("K1:")) throw new Error("not_compact_qr");
  const buf = base32Decode(str.slice(3));
  if (!buf) throw new Error("bad_base32");
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const dec = new TextDecoder();
  let o = 0;
  if (buf[o++] !== 1) throw new Error("bad_version");
  const flags = buf[o++];
  const read = () => {
    const len = dv.getUint16(o);
    o += 2;
    if (o + len > buf.length) throw new Error("truncated");
    const bytes = buf.subarray(o, o + len);
    o += len;
    return bytes;
  };
  const s = read();
  const c = read();
  const a = read();
  const e = read();
  const out: KunjiQrPayload = {
    kunjiAuth: "v2",
    sessionId: flags & F_S_RAW ? base64UrlEncode(s) : dec.decode(s),
    challenge: flags & F_C_RAW ? base64UrlEncode(c) : dec.decode(c),
    audience: dec.decode(a),
    expiresAt: Number(dec.decode(e)),
  };
  if (flags & F_HAS_N) out.appName = dec.decode(read());
  if (flags & F_HAS_K) out.callbackUrl = dec.decode(read());
  if (flags & F_HAS_P) out.scope = JSON.parse(dec.decode(read())) as string[];
  return out;
}

/** Encode the `KC:` code-reference pointer `{ domain, code }` (§5.1.3). */
export function encodeKunjiCodeQr({ domain, code }: { domain: string; code: string }): string {
  const enc = new TextEncoder();
  return "KC:" + packStruct(0, [enc.encode(code), enc.encode(domain)]);
}
