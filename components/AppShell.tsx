"use client";

import { createContext, useContext, useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import type { Role } from "@/lib/types";

const MobileMenuCtx = createContext<{ open: () => void }>({ open: () => {} });

export function AppShell({
  role,
  topbar,
  children,
}: {
  role: Role;
  topbar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <MobileMenuCtx.Provider value={{ open: () => setMobileOpen(true) }}>
      <div className="flex min-h-screen">
        <Sidebar
          role={role}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div className="flex-1 min-w-0 flex flex-col">
          {topbar}
          <main className="flex-1 px-4 sm:px-8 py-6 max-w-[1400px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </MobileMenuCtx.Provider>
  );
}

export function MobileMenuButton() {
  const { open } = useContext(MobileMenuCtx);
  return (
    <button
      type="button"
      onClick={open}
      className="md:hidden btn btn-ghost border-white/10 px-2 py-2"
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
