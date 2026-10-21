/*
 * kunji client: session payload builders (QR string and deep link).
 */

import { KUNJI_WALLET_URL } from "./kunji-client-types";
import type { KunjiDeepLinkPayload, KunjiQrFormat, KunjiQrPayload, KunjiSession } from "./kunji-client-types";
import { CODE_RE } from "./kunji-client-internal";
import { encodeKunjiCodeQr, encodeKunjiCompactQr, kunjiBase64Url } from "./kunji-client-qr";
import { defaultKunjiCallbackUrl } from "./kunji-client-text";


/* ------------------------------------------------------------------ */
/* Payload builders                                                    */
/* ------------------------------------------------------------------ */

export interface KunjiSessionInput {
  sessionId: string;
  challenge: string;
  expiresAt: number;
  code?: string;
}

export interface KunjiPayloadContext {
  audience: string;
  appName: string;
  callbackUrl: string;
  scope: string[];
  qrFormat?: KunjiQrFormat;
  walletUrl?: string;
  returnUrl?: string;
}

/** Build the lean QR payload, QR string and deep link for a session (discoverable-login §5.1). */
export function buildKunjiSession(input: KunjiSessionInput, ctx: KunjiPayloadContext): KunjiSession {
  const payload: KunjiQrPayload = {
    kunjiAuth: "v2",
    sessionId: input.sessionId,
    challenge: input.challenge,
    audience: ctx.audience,
    appName: ctx.appName,
    expiresAt: input.expiresAt,
  };
  if (ctx.scope.length) payload.scope = ctx.scope;
  if (ctx.callbackUrl !== defaultKunjiCallbackUrl(ctx.audience)) payload.callbackUrl = ctx.callbackUrl;

  const eagerCode = input.code && CODE_RE.test(input.code) ? input.code : undefined;
  let format: KunjiQrFormat = ctx.qrFormat ?? "k1";
  if (format === "code" && !eagerCode) format = "k1";
  const qrValue =
    format === "code"
      ? encodeKunjiCodeQr({ domain: ctx.audience, code: eagerCode! })
      : format === "json"
        ? JSON.stringify(payload)
        : encodeKunjiCompactQr(payload);

  const full: KunjiDeepLinkPayload = {
    kunjiAuth: "v2",
    mode: "discoverable",
    sessionId: input.sessionId,
    challenge: input.challenge,
    audience: ctx.audience,
    callbackUrl: ctx.callbackUrl,
    appName: ctx.appName,
    expiresAt: input.expiresAt,
  };
  if (ctx.returnUrl) full.returnUrl = ctx.returnUrl;
  if (ctx.scope.length) full.scope = ctx.scope;
  const wallet = ctx.walletUrl && /^https:\/\//i.test(ctx.walletUrl) ? ctx.walletUrl.replace(/\/$/, "") : KUNJI_WALLET_URL;

  return {
    sessionId: input.sessionId,
    challenge: input.challenge,
    expiresAt: input.expiresAt,
    code: eagerCode,
    audience: ctx.audience,
    appName: ctx.appName,
    callbackUrl: ctx.callbackUrl,
    scope: ctx.scope,
    payload,
    qrValue,
    qrFormat: format,
    deepLink: `${wallet}/?approve=${kunjiBase64Url(JSON.stringify(full))}`,
  };
}
