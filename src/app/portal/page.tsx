import Link from "next/link";
import { MapPin, ArrowRight, Inbox, Clock, ShieldCheck, ShieldAlert } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import PortalHeader from "@/components/portal/PortalHeader";
import LaporCta from "@/components/portal/LaporCta";
import { requireReporterPhone } from "@/lib/reporter-server";
import { normalizePhone, parsePhones } from "@/lib/reporter-session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ReportStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ReportRow {
  id: string;
  raw_text: string;
  status: ReportStatus;
  phone_verification_status: "verified" | "unverified" | null;
  estimated_households: number | null;
  duration_days: number | null;
  created_at: string;
  villages: { name: string; district: string; regency: string; registered_phone: string | null } | null;
  priority_scores: { score: number }[] | null;
}

export default async function PortalPage() {
  const phone = await requireReporterPhone();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, raw_text, status, phone_verification_status, estimated_households, duration_days, created_at, villages(name, district, regency, registered_phone), priority_scores(score)"
    )
    .eq("phone", phone)
    .order("created_at", { ascending: false });

  const reports = (data ?? []) as unknown as ReportRow[];

  const summary = {
    total: reports.length,
    active: reports.filter((r) => r.status !== "done").length,
    done: reports.filter((r) => r.status === "done").length,
  };

  return (
    <>
      <PortalHeader nomor={phone} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <div className="mono-label mb-1">Laporan saya</div>
          <h1
            className="text-3xl font-semibold text-[var(--color-tanah-pecah)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Lacak laporan air bersih Anda
          </h1>
        </div>

        {/* Ringkasan */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total", value: summary.total },
            { label: "Berjalan", value: summary.active },
            { label: "Selesai", value: summary.done },
          ].map((s) => (
            <div key={s.label} className="card rounded-lg p-4">
              <div className="mono-label">{s.label}</div>
              <div
                className="text-3xl font-semibold tnum text-[var(--color-tanah-pecah)] mt-1 leading-none"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Lapor via chat (panel slide-in) */}
        <LaporCta />

        {error && (
          <div className="card rounded-lg px-5 py-4 text-sm text-[var(--color-genting)] border-l-[3px] border-l-[var(--color-genting)]">
            Gagal memuat laporan. Coba lagi nanti.
          </div>
        )}

        {/* Daftar laporan */}
        {reports.length === 0 ? (
          <div className="card rounded-lg text-center py-16 text-[var(--color-lempung)]">
            <Inbox size={36} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">
              Belum ada laporan dari nomor ini.
              <br />
              Gunakan “Buat laporan baru” di atas, atau kirim lewat WhatsApp.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => {
              const score = r.priority_scores?.[0]?.score;
              const verified =
                r.phone_verification_status === "verified" ||
                (r.villages?.registered_phone
                  ? parsePhones(r.villages.registered_phone).includes(normalizePhone(phone))
                  : false);
              return (
                <Link
                  key={r.id}
                  href={`/portal/reports/${r.id}`}
                  className="card card-lift rounded-lg px-5 py-4 flex items-start justify-between gap-4 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className="text-lg font-semibold text-[var(--color-tanah-pecah)] group-hover:text-[var(--color-air-jernih)] transition-colors"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {r.villages?.name ?? "Desa belum terdeteksi"}
                      </h3>
                      {r.villages && (
                        <span className="flex items-center gap-1 mono-label normal-case tracking-normal">
                          <MapPin size={11} />
                          {r.villages.district}, {r.villages.regency}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--color-lempung)] mt-1.5 line-clamp-2">
                      {r.raw_text}
                    </p>
                    <div className="flex items-center gap-3 mt-2.5 flex-wrap mono-label normal-case tracking-normal">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(r.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {verified ? (
                        <span className="flex items-center gap-1 text-[var(--color-air-jernih)]">
                          <ShieldCheck size={11} /> Nomor resmi
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[var(--color-siaga)]">
                          <ShieldAlert size={11} /> Nomor belum terdaftar
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <StatusBadge status={r.status} size="sm" />
                    {typeof score === "number" && (
                      <span className="mono-label !text-[0.625rem] text-[var(--color-genting)]">
                        Skor {score}
                      </span>
                    )}
                    <ArrowRight
                      size={15}
                      className="text-[var(--color-lempung)] group-hover:text-[var(--color-air-jernih)] group-hover:translate-x-0.5 transition-all"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
