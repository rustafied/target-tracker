import { Suspense } from "react";

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="p-4">Loading analytics...</div>}>{children}</Suspense>;
}

