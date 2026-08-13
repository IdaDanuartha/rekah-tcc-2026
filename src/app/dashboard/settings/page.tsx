import { Smartphone, Wifi, WifiOff, Hash, Gauge, Package, CalendarClock, MessageCircle } from "lucide-react";
import { getDeviceInfo } from "@/lib/fonnte-device";
import FonnteReconnect from "@/components/dashboard/FonnteReconnect";

export const dynamic = "force-dynamic";

function fmtNomor(n: string | null): string {
  if (!n) return "—";
  // 6285111305036 → +62 851-1130-5036
  const rest = n.startsWith("62") ? n.slice(2) : n;
  return `+62 ${rest.replace(/(\d{3,4})(\d{4})(\d+)/, "$1-$2-$3")}`;
}

export default async function SettingsPage() {
  const info = await getDeviceInfo();

  const rows = [
    { icon: Hash, label: "Nomor Bot (dipakai di landing)", value: fmtNomor(info.device) },
    { icon: Smartphone, label: "Nama Device", value: info.name ?? "—" },
    { icon: Package, label: "Paket", value: info.packageName ?? "—" },
    { icon: Gauge, label: "Kuota Kirim", value: info.quota != null ? info.quota.toLocaleString("id-ID") : "—" },
    { icon: MessageCircle, label: "Pesan Terkirim", value: info.messages != null ? info.messages.toLocaleString("id-ID") : "—" },
    { icon: CalendarClock, label: "Kedaluwarsa", value: info.expired ?? "—" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="mono-label mb-1.5">Pengaturan</div>
        <h1 className="text-3xl font-semibold text-[var(--color-tanah-pecah)]" style={{ fontFamily: "var(--font-heading)" }}>
          WhatsApp Gateway
        </h1>
        <p className="mt-2 text-sm text-[var(--color-lempung)] max-w-xl">
          Status device WhatsApp (Fonnte) untuk terima laporan &amp; kirim notifikasi. Nomor bot di bawah dipakai otomatis di halaman publik.
        </p>
      </div>

      {/* Status device */}
      <div
        className="card rounded-lg overflow-hidden border-l-[3px]"
        style={{ borderLeftColor: info.connected ? "var(--color-hijau-tuntas)" : "var(--color-genting)" }}
      >
        <div className="px-5 py-4 flex items-center justify-between gap-4 border-b border-[var(--color-kapur-dalam)] bg-[var(--color-kertas-tua)]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-md flex items-center justify-center ${info.connected ? "bg-[var(--color-hijau-muda)]" : "bg-[#F1DDDA]"}`}>
              {info.connected ? (
                <Wifi size={18} className="text-[var(--color-hijau-tuntas)]" />
              ) : (
                <WifiOff size={18} className="text-[var(--color-genting)]" />
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--color-tanah-pecah)]">Status Device</div>
              <div className={`mono-label normal-case tracking-normal ${info.connected ? "!text-[var(--color-hijau-tuntas)]" : "!text-[var(--color-genting)]"}`}>
                {info.ok ? (info.connected ? "Tersambung" : "Terputus") : `Gagal: ${info.error ?? "tidak diketahui"}`}
              </div>
            </div>
          </div>
          <span
            className={`mono-label !text-[0.625rem] px-2.5 py-1 rounded-full border ${info.connected ? "text-[var(--color-hijau-tuntas)] border-[#A9C2B1] bg-[var(--color-hijau-muda)]" : "text-[var(--color-genting)] border-[#CD9683] bg-[#F1DDDA]"}`}
          >
            {info.connected ? "ONLINE" : "OFFLINE"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-kapur-dalam)]">
          {rows.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.label} className="px-5 py-3.5 flex items-center gap-3">
                <Icon size={15} className="text-[var(--color-lempung)] shrink-0" />
                <div className="min-w-0">
                  <div className="mono-label normal-case tracking-normal !text-[0.625rem]">{r.label}</div>
                  <div className="text-sm font-medium text-[var(--color-tanah-pecah)] tnum truncate" style={{ fontFamily: "var(--font-data)" }}>
                    {r.value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reconnect / QR */}
      <div className="card rounded-lg px-5 py-4 space-y-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-tanah-pecah)]" style={{ fontFamily: "var(--font-heading)" }}>
            Sambungan
          </h2>
          <p className="mono-label normal-case tracking-normal mt-0.5">
            {info.connected
              ? "Device aktif. Jika nanti terputus, tombol scan QR akan muncul di sini."
              : "Device terputus — laporan WA tidak masuk. Scan QR untuk menyambungkan ulang."}
          </p>
        </div>
        <FonnteReconnect initialConnected={info.connected} />
      </div>
    </div>
  );
}
