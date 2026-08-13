import PortalChatProvider from "@/components/portal/PortalChatProvider";

export default function PortalLayout({ children }: LayoutProps<"/portal">) {
  return (
    <div className="min-h-screen bg-[var(--color-kapur-karang)]">
      <PortalChatProvider>{children}</PortalChatProvider>
    </div>
  );
}
