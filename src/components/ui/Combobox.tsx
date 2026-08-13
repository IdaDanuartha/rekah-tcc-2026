"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Check } from "lucide-react";

export interface ComboOption {
  value: string;
  label: string;
}

// Select dengan pencarian (gaya select2). Menaruh hidden input `name`
// berisi value terpilih → kompatibel dengan <form action> / FormData.
export default function Combobox({
  options,
  name,
  placeholder = "Pilih…",
  defaultValue = "",
  required = false,
}: {
  options: ComboOption[];
  name: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [value, setValue] = useState(defaultValue);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  // Tutup saat klik luar.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Fokus ke pencarian saat dibuka.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  // Jaga item aktif tetap terlihat.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function choose(v: string) {
    setValue(v);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[active];
      if (opt) choose(opt.value);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value} required={required} />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-[var(--color-kertas)] border rounded-md text-sm text-left transition-all ${
          open
            ? "border-[var(--color-air-jernih)] ring-2 ring-[var(--color-air-jernih)]/20"
            : "border-[var(--color-kapur-dalam)]"
        }`}
      >
        <span className={selected ? "text-[var(--color-tanah-pecah)] truncate" : "text-[var(--color-lempung)]"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-[var(--color-lempung)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-md border border-[var(--color-kapur-dalam)] bg-[var(--color-kertas)] shadow-[var(--shadow-lift)] overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-kapur-dalam)]">
            <Search size={14} className="text-[var(--color-lempung)] shrink-0" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Cari…"
              className="flex-1 bg-transparent text-sm text-[var(--color-tanah-pecah)] placeholder:text-[var(--color-lempung)] focus:outline-none"
            />
          </div>
          <ul ref={listRef} role="listbox" className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--color-lempung)]">Tidak ditemukan.</li>
            ) : (
              filtered.map((o, i) => {
                const isSel = o.value === value;
                const isActive = i === active;
                return (
                  <li
                    key={o.value}
                    role="option"
                    aria-selected={isSel}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(o.value)}
                    className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between gap-2 ${
                      isActive ? "bg-[var(--color-air-muda)] text-[var(--color-air-jernih)]" : "text-[var(--color-tanah-pecah)]"
                    }`}
                  >
                    <span className="truncate">{o.label}</span>
                    {isSel && <Check size={14} className="shrink-0 text-[var(--color-air-jernih)]" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
