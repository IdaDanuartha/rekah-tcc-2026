// Helper NFC non-server (boleh sync). Dipakai nfc-actions ("use server").
// Normalisasi UID: buang spasi, upper-case, samakan pemisah ke ':'.
// Serial number NFC bisa datang "04:a2:.." atau "04-a2-.." — samakan biar match.
export function normalizeUid(raw: string): string {
  return raw.trim().replace(/[-\s]+/g, ":").toUpperCase();
}
