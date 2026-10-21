/** kunji block model: sign-in password values and method ids, handle rules and `validateKunjiHandle`, register values, and the device-pairing session, peer and adapter types. */

export interface SignInPasswordValues {
  username: string;
  password: string;
}

export type SignInMethodId = "kunji" | "password" | "token";

export interface KunjiHandleRule {
  id: string;
  label: string;
  test: (handle: string, reserved: string[]) => boolean;
}

/** The handle rules shown live while typing. */
export const kunjiHandleRules: KunjiHandleRule[] = [
  { id: "length", label: "3 to 32 characters", test: (h) => h.length >= 3 && h.length <= 32 },
  { id: "chars", label: "Lowercase letters, digits, dot, dash or underscore", test: (h) => h.length > 0 && /^[a-z0-9._-]+$/.test(h) },
  { id: "start", label: "Starts with a letter or digit", test: (h) => /^[a-z0-9]/.test(h) },
  { id: "reserved", label: "Not a reserved name", test: (h, reserved) => h.length > 0 && !reserved.includes(h) },
];

/** Check a handle against `kunjiHandleRules`. Returns the ids of the rules it fails. */
export function validateKunjiHandle(handle: string, reserved: string[] = []) {
  return kunjiHandleRules.filter((r) => !r.test(handle, reserved)).map((r) => r.id);
}

export interface RegisterWithKunjiValues {
  handle: string;
  name: string;
  invite?: string;
}

export interface DevicePairingSession {
  /** 8-digit code the new device types. */
  code: string;
  /** What the new device scans. */
  qrValue: string;
  /** Epoch ms. Codes live for 2 minutes. */
  expiresAt: number;
}

export interface DevicePairingPeer {
  /** Short authentication string both devices show: digits or a few words. */
  sas: string | string[];
  deviceName?: string;
}

export interface DevicePairingAdapter {
  /** Existing device: mint a pairing code. */
  createPairing: (signal: AbortSignal) => Promise<DevicePairingSession>;
  /** Existing device: wait for the new device to join. */
  waitForPeer: (code: string, signal: AbortSignal) => Promise<DevicePairingPeer>;
  /** New device: join with the typed code. */
  joinPairing?: (code: string, signal: AbortSignal) => Promise<DevicePairingPeer>;
  /** Both: report whether the strings matched. */
  confirm: (match: boolean) => Promise<void>;
}
