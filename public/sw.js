// Rekah Service Worker
// Strategi: Cache-first untuk aset statis, Network-first untuk data
// Ref: PRD section 10 — Spesifikasi PWA

const CACHE_NAME = "rekah-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Install — cache aset statis
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — bersihkan cache lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — Network-first untuk API, Cache-first untuk aset statis
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API routes — network-first, jangan cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(
          JSON.stringify({ error: "Offline — permintaan tidak dapat diproses" }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
    );
    return;
  }

  // Aset statis — cache-first
  event.respondWith(
    caches.match(event.request).then(
      (cached) => cached || fetch(event.request)
    )
  );
});

// Background Sync — jadwal dropping tersimpan lokal saat offline
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-jadwal") {
    event.waitUntil(syncJadwalOffline());
  }
});

async function syncJadwalOffline() {
  // Ambil pending actions dari IndexedDB
  // dan kirim saat koneksi kembali
  console.log("[Rekah SW] Syncing offline jadwal actions...");
}
