"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Target, LineChart, Settings, Menu, ChevronDown, ChevronRight, Crosshair, Eye, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";

const navigation = [
  { name: "Sessions", href: "/sessions", icon: Target },
  { name: "Analytics", href: "/analytics", icon: LineChart },
];

const setupItems = [
  { name: "Firearms", href: "/setup/firearms", icon: Target },
  { name: "Optics", href: "/setup/optics", icon: Eye },
  { name: "Calibers", href: "/setup/calibers", icon: Crosshair },
];

function NavigationItems({ onItemClick, isDesktop = false }: { onItemClick?: () => void; isDesktop?: boolean }) {
  const pathname = usePathname();
  const [setupOpen, setSetupOpen] = useState(isDesktop || pathname.startsWith("/setup"));

  return (
    <>
      {navigation.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onItemClick}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </Link>
        );
      })}
      
      {/* Setup with sub-items */}
      <div>
        <button
          onClick={() => setSetupOpen(!setupOpen)}
          className={`flex w-full items-center justify-between gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            pathname.startsWith("/setup")
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
        >
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5" />
            Setup
          </div>
          {setupOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        {setupOpen && (
          <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-4">
            {setupItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onItemClick}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <Link href="/sessions" className="flex items-center gap-2">
            <Target className="h-6 w-6" />
            <span className="font-semibold">Target Tracker</span>
          </Link>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex flex-col h-full py-6">
                <div className="px-6 mb-6">
                  <Link href="/sessions" className="flex items-center gap-2">
                    <Target className="h-6 w-6" />
                    <span className="font-semibold">Target Tracker</span>
                  </Link>
                </div>
                <nav className="flex-1 px-3 space-y-1">
                  <NavigationItems onItemClick={() => setMobileMenuOpen(false)} />
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col border-r border-border bg-card">
        <div className="flex flex-col h-full py-6">
          <div className="px-6 mb-6">
            <Link href="/sessions" className="flex items-center gap-2">
              <Target className="h-6 w-6" />
              <span className="font-semibold text-lg">Target Tracker</span>
            </Link>
          </div>
          <nav className="flex-1 px-3 space-y-1">
            <NavigationItems isDesktop={true} />
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pt-16 lg:pt-0 lg:pl-64">
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
