"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageCircle,
  MapPin,
  Truck,
  FileText,
  LogOut,
  Menu,
  X,
  Droplets,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  Smartphone,
  TriangleAlert,
} from "lucide-react";

type NavItemData = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  badge?: string;
};

type NavSection = { title: string | null; items: NavItemData[] };

function buildNavSections(pendingCount: number): NavSection[] {
  return [
    {
      title: null,
      items: [{ href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard, exact: true }],
    },
    {
      title: "Operasional",
      items: [
        {
          href: "/dashboard/reports",
          label: "Laporan Masuk",
          icon: MessageCircle,
          badge: pendingCount > 0 ? String(pendingCount) : undefined,
        },
        { href: "/dashboard/early-warning", label: "Peringatan Dini", icon: TriangleAlert },
        { href: "/dashboard/villages", label: "Data Desa", icon: MapPin },
        { href: "/dashboard/schedule", label: "Jadwal Dropping", icon: Truck },
      ],
    },
    {
      title: "Pelaporan & Sistem",
      items: [
        { href: "/dashboard/daily-reports", label: "Laporan Harian", icon: FileText },
        { href: "/dashboard/settings", label: "Perangkat WhatsApp", icon: Smartphone },
      ],
    },
  ];
}

function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden="true"
    >
      <rect width="28" height="28" rx="7" fill="var(--color-tanah-pecah)" />
      <path d="M6 14 L11 12 L16 15 L21 13" stroke="#4FB3CE" strokeWidth="2" strokeLinecap="round" />
      <path d="M11 12 L10 7" stroke="#C79A6E" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 15 L17 20" stroke="#C79A6E" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function NavItem({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItemData;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`relative flex items-center gap-3 rounded-md text-sm font-medium transition-all duration-200 group ${
        collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
      } ${
        active
          ? "bg-[var(--color-tanah-pecah)] text-[var(--color-kapur-karang)] shadow-[var(--shadow-sink)]"
          : "text-[var(--color-lempung)] hover:bg-[var(--color-kertas-tua)] hover:text-[var(--color-tanah-pecah)]"
      }`}
    >
      {active && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r bg-[var(--color-air-jernih)]" />
      )}
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.badge && (
        <span
          className={`ml-auto text-xs font-bold tnum px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
            active
              ? "bg-[var(--color-kapur-karang)] text-[var(--color-genting)]"
              : "bg-[var(--color-genting)] text-white"
          }`}
        >
          {item.badge}
        </span>
      )}
      {collapsed && item.badge && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--color-genting)] rounded-full ring-2 ring-[var(--color-kertas)]" />
      )}
    </Link>
  );
}

export default function DashboardSidebar({ pendingCount = 0 }: { pendingCount?: number }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const sections = buildNavSections(pendingCount);

  function isActive(item: NavItemData) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  async function handleLogout() {
    try {
      document.cookie = "rekah_demo_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      window.location.href = "/login";
    }
  }

  const SidebarContent = ({ showCollapse }: { showCollapse?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Brand header */}
      <div
        className={`flex items-center gap-3 px-4 py-4 border-b border-[var(--color-kapur-dalam)] ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <LogoMark size={28} />
          {!collapsed && (
            <div className="min-w-0">
              <div
                className="text-base font-semibold text-[var(--color-tanah-pecah)] truncate leading-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Rekah
              </div>
              <div className="mono-label !text-[0.625rem] text-[var(--color-lempung)] truncate">
                Dashboard BPBD
              </div>
            </div>
          )}
        </Link>

        {showCollapse && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded text-[var(--color-lempung)] hover:text-[var(--color-tanah-pecah)] hover:bg-[var(--color-kertas-tua)] transition-colors shrink-0 hidden md:block"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft
              size={16}
              className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {/* Nav — dikelompokkan per section */}
      <nav className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto">
        {sections.map((sec, si) => (
          <div key={si} className="space-y-1">
            {sec.title && !collapsed && (
              <div className="px-3 pt-1 pb-0.5 mono-label !text-[0.625rem] text-[var(--color-lempung)]">
                {sec.title}
              </div>
            )}
            {sec.title && collapsed && (
              <div className="mx-2 mb-1 border-t border-[var(--color-kapur-dalam)]" />
            )}
            {sec.items.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                active={isActive(item)}
                collapsed={collapsed}
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-4 pt-3 space-y-0.5 border-t border-[var(--color-kapur-dalam)]">
        <Link
          href="/"
          title={collapsed ? "Halaman Publik" : undefined}
          className={`flex items-center gap-3 rounded-md text-sm font-medium text-[var(--color-lempung)] hover:bg-[var(--color-kertas-tua)] hover:text-[var(--color-tanah-pecah)] transition-all ${
            collapsed ? "justify-center py-2.5" : "px-3 py-2.5"
          }`}
        >
          <Droplets size={18} className="shrink-0" />
          {!collapsed && <span>Halaman Publik</span>}
        </Link>
        <button
          onClick={handleLogout}
          title={collapsed ? "Keluar" : undefined}
          className={`w-full flex items-center gap-3 rounded-md text-sm font-medium text-[var(--color-genting)] hover:bg-[#FBF1EF] transition-all ${
            collapsed ? "justify-center py-2.5" : "px-3 py-2.5"
          }`}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Keluar</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`relative hidden md:flex flex-col bg-[var(--color-kertas)] border-r border-[var(--color-kapur-garis)] transition-[width] duration-300 shrink-0 ${
          collapsed ? "w-[68px]" : "w-60"
        }`}
      >
        <SidebarContent showCollapse />
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[var(--color-kertas)] border-b border-[var(--color-kapur-garis)] h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <LogoMark size={26} />
          <span
            className="font-semibold text-[var(--color-tanah-pecah)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Rekah
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button className="relative p-2 text-[var(--color-lempung)] hover:text-[var(--color-tanah-pecah)]">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--color-genting)] rounded-full ring-2 ring-[var(--color-kertas)]" />
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-[var(--color-lempung)] hover:text-[var(--color-tanah-pecah)]"
            aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-[var(--color-tanah-pecah)]/40 backdrop-blur-[1px] animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[var(--color-kertas)] border-r border-[var(--color-kapur-garis)] shadow-[var(--shadow-float)] animate-slide-in">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
