import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  MessageCircle,
  Clock,
  CheckCircle2,
  Truck,
  ShieldCheck,
  Camera,
} from "lucide-react";
import StatusBadge, { VerifBadge } from "@/components/ui/StatusBadge";
import PortalHeader from "@/components/portal/PortalHeader";
import ReceiptConfirm from "@/components/portal/ReceiptConfirm";
import TrackPanel from "@/components/tracking/TrackPanel";
import ProofPhoto from "@/components/ui/ProofPhoto";
import { requireReporterPhone } from "@/lib/reporter-server";
import { normalizePhone, parsePhones } from "@/lib/reporter-session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ReportStatus, DropStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const timelineSteps: { key: ReportStatus; label: string; desc: string }[] = [
  { key: "pending", label: "Diterima", desc: "Laporan masuk, menunggu tinjauan." },
  { key: "verified", label: "Diverifikasi", desc: "Petugas BPBD menyetujui report." },
  { key: "scheduled", label: "Dijadwalkan", desc: "Armada air dijadwalkan menuju desa." },
  { key: "done", label: "Selesai", desc: "Air telah diserahterimakan." },
];

const statusOrder: Record<ReportStatus, number> = {
  pending: 0,
  verified: 1,
  scheduled: 2,
  done: 3,
};

interface ScheduleRow {
  id: string;
  fleet: string;
  date: string;
  status: DropStatus;
  delivery_proofs: { verified_at: string; photo_url: string | null; nfc_tag_id: string | null }[] | null;
}

const dropStatusLabel: Record<DropStatus, string> = {
  scheduled: "Dijadwalkan",
  in_transit: "Dalam perjalanan",
  done: "Selesai",
};

export default async function PortalLaporanDetail({
  params,
}: PageProps<"/portal/reports/[id]">) {
  const { id } = await params;
  const phone = await requireReporterPhone();
  const supabase = createAdminClient();

  const { data: report } = await supabase
    .from("reports")
    .select(
      "id, raw_text, status, phone_verification_status, estimated_households, duration_days, ai_confidence, received_ok, created_at, village_id, villages(name, district, regency, bpbd_category, registered_phone), priority_scores(score, reason)"
    )
    .eq("id", id)
    .eq("phone", phone)
    .maybeSingle();

  if (!report) notFound();

  const village = report.villages as unknown as {
    name: string;
    district: string;
    regency: string;
    bpbd_category: string | null;
    registered_phone: string | null;
  } | null;
  const score = (report.priority_scores as unknown as { score: number; reason: string }[])?.[0];
  const verified =
    report.phone_verification_status === "verified" ||
    (village?.registered_phone
      ? parsePhones(village.registered_phone).includes(normalizePhone(phone))
      : false);
  const currentStep = statusOrder[report.status as ReportStatus];

  // Jadwal dropping + proof untuk desa terkait
  let schedule: ScheduleRow | null = null;

  if (report.village_id) {
    const { data: js } = await supabase
      .from("drop_schedules")
      .select("id, fleet, date, status, delivery_proofs(verified_at, photo_url, nfc_tag_id)")
      .eq("village_id", report.village_id)
      .order("date", { ascending: false });
    const rows = (js as unknown as ScheduleRow[]) ?? [];
    // Utamakan jadwal yang sedang berjalan agar pelacakan sama dgn armada aktif.
    schedule =
      rows.find((r) => r.status === "in_transit") ??
      rows.find((r) => r.status !== "done") ??
      rows[0] ??
      null;
  }

  const proof = schedule?.delivery_proofs?.[0];

  return (
    <>
      <PortalHeader nomor={phone} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Link
          href="/portal"
          className="inline-flex items-center gap-1.5 mono-label hover:text-[var(--color-tanah-pecah)] transition-colors"
        >
          <ArrowLeft size={14} />
          Kembali ke daftar
        </Link>

        {/* Header */}
        <div className="card rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--color-kapur-dalam)] bg-[var(--color-kertas-tua)]/60 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1
                className="text-2xl font-semibold text-[var(--color-tanah-pecah)]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {village?.name ?? "Desa belum terdeteksi"}
              </h1>
              {village && (
                <div className="flex items-center gap-1.5 mono-label normal-case tracking-normal mt-1.5">
                  <MapPin size={12} />
                  {village.district}, {village.regency}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={report.status as ReportStatus} />
              <VerifBadge verified={verified} />
            </div>
          </div>

          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Info label="Terdampak" value={report.estimated_households ? `${report.estimated_households} KK` : "—"} />
            <Info label="Durasi kering" value={report.duration_days ? `${report.duration_days} hari` : "—"} />
            <Info label="Skor prioritas" value={score ? String(score.score) : "—"} />
          </div>
        </div>

        {/* Pelacakan armada realtime — saat dropping dijadwalkan/berjalan */}
        {schedule && schedule.status !== "done" && (
          <TrackPanel scheduleId={schedule.id} />
        )}

        {/* Laporan asli */}
        <div className="card rounded-lg px-6 py-5">
          <div className="mono-label flex items-center gap-1.5 mb-2">
            <MessageCircle size={12} /> Laporan Anda
          </div>
          <p className="text-sm text-[var(--color-tanah-pecah)] italic border-l-2 border-[var(--color-kapur-garis)] pl-3">
            &ldquo;{report.raw_text}&rdquo;
          </p>
          {score?.reason && (
            <div className="mt-4">
              <div className="mono-label mb-1.5">Alasan prioritas</div>
              <p className="text-sm text-[var(--color-lempung)] leading-relaxed">
                {score.reason}
              </p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="card rounded-lg px-6 py-5">
          <div className="mono-label mb-4">Status penanganan</div>
          <ol className="space-y-4">
            {timelineSteps.map((step, i) => {
              const done = i < currentStep;
              const active = i === currentStep;
              return (
                <li key={step.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
                        done
                          ? "bg-[var(--color-hijau-tuntas)] border-[var(--color-hijau-tuntas)] text-white"
                          : active
                            ? "bg-[var(--color-air-jernih)] border-[var(--color-air-jernih)] text-white"
                            : "bg-[var(--color-kertas-tua)] border-[var(--color-kapur-dalam)] text-[var(--color-lempung)]"
                      }`}
                    >
                      {done ? <CheckCircle2 size={15} /> : <span className="text-xs tnum">{i + 1}</span>}
                    </span>
                    {i < timelineSteps.length - 1 && (
                      <span
                        className={`w-px flex-1 min-h-[24px] ${
                          done ? "bg-[var(--color-hijau-tuntas)]" : "bg-[var(--color-kapur-dalam)]"
                        }`}
                      />
                    )}
                  </div>
                  <div className="pb-1">
                    <div
                      className={`text-sm font-semibold ${
                        active ? "text-[var(--color-air-jernih)]" : "text-[var(--color-tanah-pecah)]"
                      }`}
                    >
                      {step.label}
                    </div>
                    <p className="text-xs text-[var(--color-lempung)] mt-0.5">{step.desc}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Jadwal dropping */}
        {schedule && (
          <div className="card rounded-lg px-6 py-5 border-l-[3px] border-l-[var(--color-air-jernih)]">
            <div className="mono-label flex items-center gap-1.5 mb-3">
              <Truck size={12} /> Jadwal dropping air
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Info label="Armada" value={schedule.fleet} />
              <Info
                label="Tanggal"
                value={new Date(schedule.date).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              />
              <Info label="Status" value={dropStatusLabel[schedule.status]} />
            </div>

            {proof && (
              <div className="mt-4 pt-4 border-t border-[var(--color-kapur-dalam)] space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-[var(--color-hijau-tuntas)]">
                  <Camera size={15} />
                  Bukti serah terima terekam ·{" "}
                  <span className="mono-label normal-case tracking-normal">
                    {new Date(proof.verified_at).toLocaleString("id-ID")}
                  </span>
                </div>
                {proof.nfc_tag_id && (
                  <div className="flex items-center gap-2 text-xs text-[var(--color-lempung)]">
                    <ShieldCheck size={13} className="text-[var(--color-air-jernih)]" />
                    Titik terverifikasi NFC
                  </div>
                )}
                {proof.photo_url && (
                  <div className="pt-1">
                    <ProofPhoto url={proof.photo_url} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Konfirmasi penerimaan air (loop akuntabilitas) — hanya saat sudah selesai */}
        {report.status === "done" && (
          <ReceiptConfirm
            reportId={report.id}
            receivedOk={(report as unknown as { received_ok: boolean | null }).received_ok}
          />
        )}

        <p className="flex items-center gap-1.5 mono-label normal-case tracking-normal">
          <Clock size={11} />
          Dilaporkan {new Date(report.created_at).toLocaleString("id-ID")}
          {verified && (
            <>
              <span className="text-[var(--color-kapur-garis)]">·</span>
              <ShieldCheck size={11} className="text-[var(--color-air-jernih)]" />
              Nomor terdaftar resmi
            </>
          )}
        </p>
      </main>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--color-kertas-tua)]/60 rounded-md px-4 py-3 border border-[var(--color-kapur-dalam)]">
      <div className="mono-label">{label}</div>
      <div
        className="text-lg font-semibold text-[var(--color-tanah-pecah)] mt-0.5"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {value}
      </div>
    </div>
  );
}
