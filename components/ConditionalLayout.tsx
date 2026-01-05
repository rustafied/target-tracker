"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "./AppShell";

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Don't wrap login page with AppShell
  if (pathname === "/login") {
    return <>{children}</>;
  }
  
  return <AppShell>{children}</AppShell>;
}
