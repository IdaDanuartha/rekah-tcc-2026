"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import ChatPanel from "@/components/portal/ChatPanel";

const ChatCtx = createContext<{ open: () => void }>({ open: () => {} });

export function useChat() {
  return useContext(ChatCtx);
}

export default function PortalChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <ChatCtx.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <ChatPanel open={open} onClose={() => setOpen(false)} />
    </ChatCtx.Provider>
  );
}
