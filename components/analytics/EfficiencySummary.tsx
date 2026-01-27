"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { TrendingUp, DollarSign, Target } from "lucide-react";
import Link from "next/link";
import { formatDecimal } from "@/lib/utils";

interface EfficiencySummaryProps {
  filters?: {
    firearmIds?: string[];
    caliberIds?: string[];
    opticIds?: string[];
  };
}

export function EfficiencySummary({ filters = {} }: EfficiencySummaryProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters?.caliberIds?.join(','),
    filters?.firearmIds?.join(','),
    filters?.opticIds?.join(','),
  ]);

  async function fetchData() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.caliberIds && filters.caliberIds.length > 0) {
        params.append("caliberIds", filters.caliberIds.join(","));
      }
      if (filters.firearmIds && filters.firearmIds.length > 0) {
        params.append("firearmIds", filters.firearmIds.join(","));
      }
      if (filters.opticIds && filters.opticIds.length > 0) {
        params.append("opticIds", filters.opticIds.join(","));
      }

      const res = await fetch(`/api/analytics/ammo-efficiency?${params}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error("Failed to load efficiency summary:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Efficient Caliber
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.calibers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Efficient Caliber
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No efficiency data available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  const topCaliber = data.calibers[0];
  const hasCostData = topCaliber.costPerRound !== undefined;

  return (
    <Link href="/ammo">
      <Card className="hover:bg-accent transition-colors cursor-pointer">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Efficient Caliber
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold">{topCaliber.caliberName}</h3>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {formatDecimal(topCaliber.valueScore)}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-muted-foreground">Score/Round</div>
                <div className="font-semibold">{formatDecimal(topCaliber.scorePerRound)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Bulls/100</div>
                <div className="font-semibold">{formatDecimal(topCaliber.bullsPer100)}</div>
              </div>
              {hasCostData && (
                <>
                  <div>
                    <div className="text-muted-foreground">Cost/Round</div>
                    <div className="font-semibold">${formatDecimal(topCaliber.costPerRound)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Cost/Point</div>
                    <div className="font-semibold">${formatDecimal(topCaliber.costPerPoint)}</div>
                  </div>
                </>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Based on {topCaliber.totalShots.toLocaleString()} shots • Click to see all calibers
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
