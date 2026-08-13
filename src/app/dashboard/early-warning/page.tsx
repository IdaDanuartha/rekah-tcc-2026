import Link from "next/link";
import { MapPin, TriangleAlert, Sparkles, Clock, Droplets, Inbox } from "lucide-react";
import { getEarlyWarning, type RiskLevel } from "@/lib/early-warning";

export const dynamic = "force-dynamic";

const levelStyle: Record<RiskLevel, { bar: string; chip: string; label: string }> = {
  tinggi: {
    bar: "var(--color-genting)",
    chip: "bg-[#F1DDDA] text-[var(--color-genting)]",
    label: "Risiko tinggi",
  },
  sedang: {
    bar: "var(--color-siaga)",
    chip: "bg-[#FBEFDD] text-[var(--color-siaga)]",
    label: "Risiko sedang",
  },
  rendah: {
    bar: "var(--color-lempung)",
    chip: "bg-[var(--color-kertas-tua)] text-[var(--color-lempung)]",
    label: "Risiko rendah",
  },
};

export default async function EarlyWarningPage() {
  const { villages, insight, generatedAt } = await getEarlyWarning();
  const tinggi = villages.filter((v) => v.level === "tinggi").length;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="mono-label mb-1 flex items-center gap-1.5">
          <TriangleAlert size={12} /> Early-warning
        </div>
        <h1
          className="text-3xl font-semibold text-[var(--color-tanah-pecah)]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Prediksi krisis kekeringan
        </h1>
        <p className="text-sm text-[var(--color-lempung)] mt-1.5">
          Antisipasi desa yang akan krisis sebelum laporan masuk — {tinggi} desa berisiko tinggi.
        </p>
      </div>

      {/* Insight AI */}
      {insight && (
        <div className="card rounded-lg px-5 py-4 border-l-[3px] border-l-[var(--color-air-jernih)] flex items-start gap-3">
          <Sparkles size={18} className="text-[var(--color-air-jernih)] shrink-0 mt-0.5" />
          <div>
            <div className="mono-label mb-1">Rekomendasi AI</div>
            <p className="text-sm text-[var(--color-tanah-pecah)] leading-relaxed">{insight}</p>
          </div>
        </div>
      )}

      {/* Ranked list */}
      {villages.length === 0 ? (
        <div className="card rounded-lg text-center py-16 text-[var(--color-lempung)]">
          <Inbox size={36} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Belum ada data desa untuk dianalisis.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {villages.map((v, i) => {
            const st = levelStyle[v.level];
            return (
              <Link
                key={v.id}
                href={`/dashboard/villages/${v.id}`}
                className="card card-lift rounded-lg px-5 py-4 flex items-center gap-4 group"
              >
                <div
                  className="text-2xl font-semibold tnum w-8 text-center shrink-0 text-[var(--color-lempung)]"
                  style={{ fontFamily: "var(--font-data)" }}
                >
                  {i + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className="text-lg font-semibold text-[var(--color-tanah-pecah)] group-hover:text-[var(--color-air-jernih)] transition-colors"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {v.name}
                    </h3>
                    <span className="flex items-center gap-1 mono-label normal-case tracking-normal">
                      <MapPin size={11} />
                      {v.district}, {v.regency}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.chip}`}>
                      {st.label}
                    </span>
                  </div>

                  <p className="text-sm text-[var(--color-lempung)] mt-1.5">{v.reason}</p>

                  {/* Risk bar */}
                  <div className="mt-2.5 h-1.5 rounded-full bg-[var(--color-kertas-tua)] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${v.risk}%`, backgroundColor: st.bar }}
                    />
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                  <div
                    className="text-2xl font-semibold tnum leading-none text-[var(--color-tanah-pecah)]"
                    style={{ fontFamily: "var(--font-data)" }}
                  >
                    {v.risk}
                    <span className="text-xs font-normal text-[var(--color-lempung)]">/100</span>
                  </div>
                  <span className="flex items-center gap-1 mono-label !text-[0.625rem] normal-case tracking-normal">
                    {v.etaDays === 0 ? (
                      <>
                        <Droplets size={10} className="text-[var(--color-genting)]" /> krisis sekarang
                      </>
                    ) : (
                      <>
                        <Clock size={10} /> ~{v.etaDays} hari lagi
                      </>
                    )}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <p className="mono-label normal-case tracking-normal">
        Diperbarui {new Date(generatedAt).toLocaleString("id-ID")} · model rule-based + narasi AI
      </p>
    </div>
  );
}
