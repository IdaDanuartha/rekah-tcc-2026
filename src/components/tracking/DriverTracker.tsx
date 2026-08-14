"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Navigation, Loader2, TriangleAlert, Truck, PlayCircle, Square, Camera, CheckCircle2, X, Nfc } from "lucide-react";
import LiveTrackMap from "./LiveTrackMap";
import { fetchRoadRoute, sampleCoords } from "@/lib/route-client";
import { submitDeliveryProof } from "@/lib/tracking-actions";

const POST_INTERVAL_MS = 8000;
const DEMO_STEP_MS = 900; // jeda antar titik saat simulasi demo

export default function DriverTracker({
  scheduleId,
  villageName,
  fleet,
  origin,
  destination,
}: {
  scheduleId: string;
  villageName: string;
  fleet: string;
  origin: [number, number];
  destination: [number, number] | null;
}) {
  const [sharing, setSharing] = useState(false);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<number | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][] | undefined>(undefined);
  const [road, setRoad] = useState<{ km: number; min: number } | null>(null);
  const [demoRunning, setDemoRunning] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [nfc, setNfc] = useState("");
  const [nfcScanning, setNfcScanning] = useState(false);
  const [nfcTapped, setNfcTapped] = useState(false);
  const [nfcManual, setNfcManual] = useState(false);
  const [nfcError, setNfcError] = useState<string | null>(null);
  const nfcAbort = useRef<AbortController | null>(null);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const lastPostRef = useRef(0);
  const demoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  // Rute jalan penuh posko → desa (untuk gambar peta + dipakai demo).
  useEffect(() => {
    if (!destination) return;
    let alive = true;
    fetchRoadRoute(origin, destination).then((r) => {
      if (alive && r) setRouteCoords(r.coords);
    });
    return () => {
      alive = false;
    };
  }, [origin, destination]);

  // ETA jalan nyata dari posisi terkini → desa.
  useEffect(() => {
    if (!pos || !destination) {
      setRoad(null);
      return;
    }
    let alive = true;
    fetchRoadRoute([pos.lat, pos.lng], destination).then((r) => {
      if (alive) setRoad(r ? { km: r.distanceKm, min: Math.max(1, Math.round(r.durationSec / 60)) } : null);
    });
    return () => {
      alive = false;
    };
  }, [pos?.lat, pos?.lng, destination]);

  async function sendPosition(lat: number, lng: number) {
    try {
      await fetch(`/api/track/${scheduleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      setLastSent(Date.now());
    } catch {
      /* jaringan sopir bisa putus — abaikan, coba lagi ping berikutnya */
    }
  }

  function start() {
    if (!("geolocation" in navigator)) {
      setError("Perangkat tidak mendukung GPS.");
      return;
    }
    setError(null);
    setSharing(true);
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        const { latitude, longitude } = p.coords;
        setPos({ lat: latitude, lng: longitude });
        const now = Date.now();
        if (now - lastPostRef.current >= POST_INTERVAL_MS || lastPostRef.current === 0) {
          lastPostRef.current = now;
          sendPosition(latitude, longitude);
        }
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Izin lokasi ditolak. Aktifkan GPS lalu izinkan lokasi."
            : "Gagal membaca lokasi GPS.",
        );
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
  }

  function stop() {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setSharing(false);
  }

  useEffect(() => {
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      if (demoTimer.current) clearInterval(demoTimer.current);
      nfcAbort.current?.abort();
    };
  }, []);

  // Simulasi demo: gerakkan armada sepanjang rute jalan nyata + kirim posisi
  // ke server, agar juri melihat gambaran tanpa sopir asli.
  async function startDemo() {
    if (sharing) stop();
    setError(null);
    let coords = routeCoords;
    if (!coords && destination) {
      const r = await fetchRoadRoute(origin, destination);
      coords = r?.coords;
      if (r) setRouteCoords(r.coords);
    }
    if (!coords || coords.length < 2) {
      setError("Rute demo tidak tersedia (cek koneksi).");
      return;
    }
    const steps = sampleCoords(coords, 60);
    setDemoRunning(true);
    let i = 0;
    demoTimer.current = setInterval(() => {
      if (i >= steps.length) {
        stopDemo();
        return;
      }
      const [lat, lng] = steps[i];
      setPos({ lat, lng });
      sendPosition(lat, lng);
      i++;
    }, DEMO_STEP_MS);
  }

  function stopDemo() {
    if (demoTimer.current) {
      clearInterval(demoTimer.current);
      demoTimer.current = null;
    }
    setDemoRunning(false);
  }

  function getFreshPos(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000 },
      );
    });
  }

  async function scanNfc() {
    setNfcError(null);
    if (typeof window === "undefined" || !("NDEFReader" in window)) {
      setNfcError("Perangkat/browser ini tidak mendukung tap NFC (butuh Chrome di Android). Ketik kode manual.");
      return;
    }
    try {
      // batalkan sesi scan sebelumnya bila ada
      nfcAbort.current?.abort();
      const ctrl = new AbortController();
      nfcAbort.current = ctrl;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reader = new (window as any).NDEFReader();
      setNfcScanning(true);
      await reader.scan({ signal: ctrl.signal });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reader.onreading = (e: any) => {
        // UID (serial number) = identitas kanonik stiker yg dipakai saat register.
        let value: string = e.serialNumber || "";
        // fallback ke payload teks/URL bila serial number tak terbaca
        if (!value) {
          for (const rec of e.message.records) {
            if (rec.recordType === "text") {
              value = new TextDecoder(rec.encoding || "utf-8").decode(rec.data);
              break;
            }
            if (rec.recordType === "url") {
              value = new TextDecoder().decode(rec.data);
              break;
            }
          }
        }
        if (value) {
          setNfc(value);
          setNfcTapped(true);
          setNfcManual(false); // tap = kode disembunyikan
        }
        setNfcScanning(false);
        ctrl.abort();
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reader.onreadingerror = () => {
        setNfcError("Gagal membaca tag. Dekatkan HP ke tag lalu coba lagi.");
        setNfcScanning(false);
      };
    } catch (err) {
      setNfcScanning(false);
      const name = err instanceof DOMException ? err.name : "";
      setNfcError(
        name === "NotAllowedError"
          ? "Izin NFC ditolak. Aktifkan NFC di HP lalu izinkan."
          : "Gagal memulai pemindaian NFC. Pastikan NFC aktif.",
      );
    }
  }

  async function openProof() {
    setSubmitError(null);
    setProofOpen(true);
    setGeo(pos ?? (await getFreshPos()));
  }

  function closeProof() {
    nfcAbort.current?.abort();
    setNfcScanning(false);
    setProofOpen(false);
  }

  // Kompres foto di HP sebelum upload: kamera HP bisa 5-12MB → lampaui batas
  // body Server Action & bikin upload lambat. Skala ke maks 1600px, JPEG 0.8.
  async function compressImage(file: File): Promise<File> {
    if (!file.type.startsWith("image/")) return file;
    try {
      const bitmap = await createImageBitmap(file);
      const MAX = 1600;
      const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
      const w = Math.round(bitmap.width * scale);
      const h = Math.round(bitmap.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.8));
      if (!blob) return file;
      return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
    } catch {
      return file; // gagal kompres → pakai asli, biar tetap bisa kirim
    }
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0] ?? null;
    const f = raw ? await compressImage(raw) : null;
    setPhoto(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submitProof() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const fd = new FormData();
      if (photo) fd.append("photo", photo);
      const g = geo ?? pos ?? (await getFreshPos());
      if (g) {
        fd.append("lat", String(g.lat));
        fd.append("lng", String(g.lng));
      }
      if (nfc.trim()) fd.append("nfc", nfc.trim());

      const res = await submitDeliveryProof(scheduleId, fd);
      if (res.ok) {
        stop();
        stopDemo();
        setProofOpen(false);
        router.refresh(); // halaman → state "Dropping selesai"
      } else {
        setSubmitError(res.error);
      }
    } catch (err) {
      // Server action throw (mis. env/koneksi) — tanpa ini tombol nyangkut "Mengunggah…".
      setSubmitError(err instanceof Error ? err.message : "Gagal mengunggah. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  const remainingKm = road?.km ?? null;
  const etaMin = road?.min ?? null;

  return (
    <div className="min-h-screen bg-[var(--color-kapur-karang)] px-4 py-6 max-w-md mx-auto flex flex-col gap-4">
      <div>
        <div className="mono-label mb-1.5">Mode Sopir · Armada {fleet}</div>
        <h1 className="text-2xl font-semibold text-[var(--color-tanah-pecah)]" style={{ fontFamily: "var(--font-heading)" }}>
          Kirim Air ke {villageName}
        </h1>
        <p className="text-sm text-[var(--color-lempung)] mt-1.5 flex items-center gap-1.5">
          <MapPin size={13} /> Bagikan lokasi agar posko & warga bisa memantau perjalanan.
        </p>
      </div>

      <LiveTrackMap origin={origin} destination={destination} current={pos} routeCoords={routeCoords} />

      {/* Info ETA */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card rounded-lg px-4 py-3 border-l-[3px] border-l-[var(--color-air-jernih)]">
          <div className="mono-label mb-1">Sisa jarak</div>
          <div className="text-2xl font-semibold tnum text-[var(--color-tanah-pecah)]" style={{ fontFamily: "var(--font-heading)" }}>
            {remainingKm != null ? `${remainingKm.toFixed(1)} km` : "—"}
          </div>
        </div>
        <div className="card rounded-lg px-4 py-3 border-l-[3px] border-l-[var(--color-siaga)]">
          <div className="mono-label mb-1">Estimasi tiba</div>
          <div className="text-2xl font-semibold tnum text-[var(--color-tanah-pecah)]" style={{ fontFamily: "var(--font-heading)" }}>
            {etaMin != null ? `${etaMin} mnt` : "—"}
          </div>
        </div>
      </div>

      {error && (
        <div className="card rounded-lg px-4 py-3 border-l-[3px] border-l-[var(--color-genting)] flex items-start gap-2 text-sm text-[var(--color-genting)]">
          <TriangleAlert size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Aksi utama tiba di lokasi: unggah bukti + selesaikan */}
      <button
        onClick={openProof}
        className="w-full inline-flex items-center justify-center gap-2 bg-[var(--color-hijau-tuntas)] !text-white text-sm font-semibold py-3.5 rounded-md hover:bg-[#345B48] transition-colors shadow-sm"
      >
        <Camera size={16} /> Selesai &amp; Unggah Bukti
      </button>

      {demoRunning ? (
        <button
          onClick={stopDemo}
          className="w-full inline-flex items-center justify-center gap-2 bg-[var(--color-siaga)] !text-white text-sm font-semibold py-3.5 rounded-md hover:bg-[#A55F19] transition-colors shadow-sm"
        >
          <Square size={15} /> Hentikan Simulasi Demo
        </button>
      ) : !sharing ? (
        <button
          onClick={start}
          className="w-full inline-flex items-center justify-center gap-2 bg-[var(--color-air-jernih)] !text-white text-sm font-semibold py-3.5 rounded-md hover:bg-[var(--color-air-tua)] transition-colors shadow-sm"
        >
          <Navigation size={16} /> Mulai Bagikan Lokasi
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-[var(--color-hijau-tuntas)] font-medium">
            <span className="w-2 h-2 rounded-full bg-[var(--color-hijau-tuntas)] animate-pulse-soft" />
            {pos ? (
              <>Lokasi aktif dibagikan{lastSent ? ` · terkirim ${new Date(lastSent).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}</>
            ) : (
              <><Loader2 size={14} className="animate-spin" /> Mencari sinyal GPS…</>
            )}
          </div>
          <button
            onClick={stop}
            className="w-full inline-flex items-center justify-center gap-2 border border-[var(--color-kapur-garis)] bg-[var(--color-kertas)] text-[var(--color-tanah-pecah)] text-sm font-medium py-3 rounded-md hover:border-[var(--color-genting)] hover:text-[var(--color-genting)] transition-colors"
          >
            <Truck size={15} /> Hentikan Berbagi Lokasi
          </button>
        </div>
      )}

      {!demoRunning && !sharing && (
        <button
          onClick={startDemo}
          className="w-full inline-flex items-center justify-center gap-2 border border-dashed border-[var(--color-kapur-garis)] bg-[var(--color-kertas-tua)]/50 text-[var(--color-lempung)] text-sm font-medium py-2.5 rounded-md hover:text-[var(--color-siaga)] hover:border-[var(--color-siaga)] transition-colors"
        >
          <PlayCircle size={15} /> Jalankan Simulasi Demo (tanpa GPS)
        </button>
      )}

      <p className="mono-label normal-case tracking-normal text-center !text-[0.625rem] mt-1">
        {demoRunning
          ? "Simulasi berjalan — armada bergerak menyusuri jalan menuju desa."
          : "Biarkan halaman ini terbuka selama perjalanan. Lokasi dikirim tiap ~8 detik."}
      </p>

      {/* Modal bukti serah terima */}
      {proofOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3">
          <div className="absolute inset-0 bg-[var(--color-tanah-pecah)]/50" onClick={() => !submitting && closeProof()} />
          <div className="relative card rounded-xl shadow-[var(--shadow-float)] w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-tanah-pecah)]" style={{ fontFamily: "var(--font-heading)" }}>
                Bukti Serah Terima
              </h3>
              <button onClick={() => !submitting && closeProof()} className="p-1 text-[var(--color-lempung)] hover:text-[var(--color-tanah-pecah)]">
                <X size={18} />
              </button>
            </div>

            {/* Foto */}
            <div>
              <label className="mono-label block mb-1.5">Foto penyerahan air</label>
              {preview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Pratinjau bukti" className="w-full h-48 object-cover rounded-md border border-[var(--color-kapur-dalam)]" />
                  <label className="absolute bottom-2 right-2 text-xs font-medium bg-[var(--color-tanah-pecah)]/80 text-white px-2.5 py-1 rounded-md cursor-pointer">
                    Ganti
                    <input type="file" accept="image/*" capture="environment" onChange={onPickPhoto} className="hidden" />
                  </label>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 h-32 border-2 border-dashed border-[var(--color-kapur-garis)] rounded-md cursor-pointer text-[var(--color-lempung)] hover:border-[var(--color-hijau-tuntas)] hover:text-[var(--color-hijau-tuntas)] transition-colors">
                  <Camera size={22} />
                  <span className="text-sm font-medium">Ambil / pilih foto</span>
                  <input type="file" accept="image/*" capture="environment" onChange={onPickPhoto} className="hidden" />
                </label>
              )}
            </div>

            {/* Geotag */}
            <div className="rounded-md bg-[var(--color-kertas-tua)]/60 border border-[var(--color-kapur-dalam)] px-3 py-2 flex items-center gap-2 text-sm">
              <MapPin size={14} className={geo ? "text-[var(--color-hijau-tuntas)]" : "text-[var(--color-siaga)]"} />
              {geo ? (
                <span className="tnum text-[var(--color-tanah-pecah)]">{geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}</span>
              ) : (
                <span className="text-[var(--color-siaga)]">Geotag belum tersedia — aktifkan GPS.</span>
              )}
            </div>

            {/* NFC — tap tag titik dropping untuk menyelesaikan */}
            <div>
              <label className="mono-label block mb-1.5">Tag NFC titik dropping</label>
              <button
                type="button"
                onClick={scanNfc}
                disabled={nfcScanning}
                className={`w-full inline-flex items-center justify-center gap-2 py-3 rounded-md text-sm font-semibold border transition-colors disabled:opacity-70 ${
                  nfcTapped
                    ? "bg-[var(--color-hijau-tuntas)]/10 border-[var(--color-hijau-tuntas)] text-[var(--color-hijau-tuntas)]"
                    : "bg-[var(--color-kertas)] border-[var(--color-kapur-dalam)] text-[var(--color-tanah-pecah)] hover:border-[var(--color-air-jernih)] hover:text-[var(--color-air-jernih)]"
                }`}
              >
                {nfcScanning ? (
                  <><Loader2 size={16} className="animate-spin" /> Dekatkan HP ke tag…</>
                ) : nfcTapped ? (
                  <><CheckCircle2 size={16} /> Tag terbaca</>
                ) : (
                  <><Nfc size={16} /> Tap tag NFC</>
                )}
              </button>
              {nfcError && <p className="text-xs text-[var(--color-siaga)] mt-1.5">{nfcError}</p>}

              {/* Kode UID hanya tampil di mode manual; hasil tap disembunyikan. */}
              {nfcManual && (
                <input
                  type="text"
                  value={nfc}
                  onChange={(e) => {
                    setNfc(e.target.value);
                    setNfcTapped(false);
                  }}
                  placeholder="ketik UID: NFC-TITIK-01"
                  autoFocus
                  className="w-full mt-2 px-3 py-2.5 bg-[var(--color-kertas)] border border-[var(--color-kapur-dalam)] rounded-md text-sm text-[var(--color-tanah-pecah)] placeholder:text-[var(--color-lempung)] focus:outline-none focus:border-[var(--color-air-jernih)] focus:ring-2 focus:ring-[var(--color-air-jernih)]/20 transition-all"
                />
              )}

              <button
                type="button"
                onClick={() => {
                  setNfcManual((m) => !m);
                  setNfc("");
                  setNfcTapped(false);
                }}
                className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-[var(--color-lempung)] hover:text-[var(--color-air-jernih)] transition-colors"
              >
                {nfcManual ? "Pakai tap NFC" : "Ketik UID manual"}
              </button>
            </div>

            {submitError && <p className="text-xs text-[var(--color-genting)]">{submitError}</p>}

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={submitProof}
                disabled={submitting || !photo || !nfc.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[var(--color-hijau-tuntas)] !text-white text-sm font-semibold py-3 rounded-md hover:bg-[#345B48] disabled:opacity-50 transition-colors"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {submitting ? "Mengunggah…" : "Kirim & Selesaikan"}
              </button>
              <button
                onClick={closeProof}
                disabled={submitting}
                className="px-4 py-3 text-sm font-medium text-[var(--color-lempung)] hover:text-[var(--color-tanah-pecah)] disabled:opacity-50 transition-colors"
              >
                Batal
              </button>
            </div>
            <p className="mono-label normal-case tracking-normal !text-[0.625rem] text-center">
              Foto &amp; tag NFC wajib. Bukti disimpan sebagai serah terima resmi lalu dropping ditandai selesai.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
