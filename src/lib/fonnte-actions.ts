"use server";

import { getDeviceInfo, getReconnectQR, type DeviceInfo, type QRResult } from "@/lib/fonnte-device";

// Aksi untuk komponen klien di dashboard (status device + QR reconnect).
export async function actionDeviceInfo(): Promise<DeviceInfo> {
  return getDeviceInfo();
}

export async function actionReconnectQR(): Promise<QRResult> {
  return getReconnectQR();
}
