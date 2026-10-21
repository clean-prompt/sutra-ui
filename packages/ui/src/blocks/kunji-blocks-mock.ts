/** `createMockPairingAdapter`: a fake `DevicePairingAdapter` for demos and tests. */
import type { DevicePairingAdapter } from "./kunji-blocks-model";

export interface MockPairingAdapterOptions {
  /** When the simulated new device joins. Default 5000ms. */
  peerAfter?: number;
  latency?: number;
  ttl?: number;
  code?: string;
  sas?: string | string[];
  deviceName?: string;
}

const abortable = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        const e = new Error("aborted");
        e.name = "AbortError";
        reject(e);
      },
      { once: true }
    );
  });

/** A fake `DevicePairingAdapter` for demos and tests. No network. */
export function createMockPairingAdapter({
  peerAfter = 5000,
  latency = 400,
  ttl = 120_000,
  code = "40718293",
  sas = ["maple", "orbit", "velvet", "comet"],
  deviceName = "Pixel 8",
}: MockPairingAdapterOptions = {}): DevicePairingAdapter {
  return {
    async createPairing(signal) {
      await abortable(latency, signal);
      return { code, qrValue: `KP:${code}`, expiresAt: Date.now() + ttl };
    },
    async waitForPeer(_code, signal) {
      await abortable(peerAfter, signal);
      return { sas, deviceName };
    },
    async joinPairing(value, signal) {
      await abortable(latency, signal);
      if (value !== code) throw new Error("That code didn't match. Check the number on your other device.");
      return { sas, deviceName: "MacBook Pro" };
    },
    async confirm() {
      await abortable(latency);
    },
  };
}
