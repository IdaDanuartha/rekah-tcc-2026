import Sidebar from "@/components/dashboard/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";
import { listReports } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const pendingReports = await listReports({ status: "pending" });

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--color-kapur-karang)]">
        {/* Sidebar */}
        <Sidebar pendingCount={pendingReports.length} />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6 md:p-8 pt-20 md:pt-8">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
