/*
 * Browser side of the kunji discoverable-login protocol (v2), implemented natively.
 *
 * Sutra draws the QR itself and talks only to the relying app's own endpoints
 * (usually relative URLs). Nothing here contacts a kunji server. The hosted
 * `rp.js` widget is available through `createRpScriptAdapter`, which is opt-in
 * and never loads anything until one of its methods is called.
 *
 * One module per family: this file re-exports every public name from the
 * kunji-client-* pieces (types, text, poll, qr, session, http, mock, rp), so
 * deep imports stay valid. Inside the package import the pieces directly.
 */

export * from "./kunji-client-types";
export * from "./kunji-client-text";
export * from "./kunji-client-poll";
export * from "./kunji-client-qr";
export * from "./kunji-client-session";
export * from "./kunji-client-http";
export * from "./kunji-client-mock";
export * from "./kunji-client-rp";
