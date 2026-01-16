import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function KpiCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

export function ChartCardSkeleton({ height = "350px" }: { height?: string }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-muted" />
              <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
            <p className="text-sm text-muted-foreground">Loading chart data...</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TableSkeletonRow() {
  return (
    <div className="flex items-center justify-between py-3 border-b">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {Array.from({ length: rows }).map((_, i) => (
            <TableSkeletonRow key={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>

      {/* Main Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>

      {/* Full Width Chart */}
      <ChartCardSkeleton height="400px" />

      {/* Table */}
      <TableSkeleton />
    </div>
  );
}

export function ComparisonLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Selection Area */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </CardContent>
      </Card>

      {/* Comparison Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCardSkeleton height="300px" />
        <ChartCardSkeleton height="300px" />
      </div>

      {/* Detailed Comparison */}
      <ChartCardSkeleton height="400px" />
    </div>
  );
}
