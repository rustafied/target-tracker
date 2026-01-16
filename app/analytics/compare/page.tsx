"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ComparativeDashboard } from "@/components/analytics/ComparativeDashboard";
import { LoadingCard } from "@/components/ui/spinner";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ComparePage() {
  const searchParams = useSearchParams();
  const type = (searchParams.get("type") || "firearm") as
    | "firearm"
    | "optic"
    | "caliber"
    | "session";

  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailableItems();
  }, [type]);

  const fetchAvailableItems = async () => {
    setLoading(true);
    try {
      let endpoint = "";
      switch (type) {
        case "firearm":
          endpoint = "/api/firearms";
          break;
        case "optic":
          endpoint = "/api/optics";
          break;
        case "caliber":
          endpoint = "/api/calibers";
          break;
        case "session":
          endpoint = "/api/sessions";
          break;
      }

      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        
        // Transform all items to have consistent id field
        if (type === "session") {
          const transformedSessions = data.map((session: any) => ({
            id: String(session._id),
            name: `${new Date(session.date).toLocaleDateString()} - ${session.location || "Session"}`,
          }));
          setAvailableItems(transformedSessions);
        } else {
          // Transform firearms/optics/calibers to use id instead of _id
          const transformedItems = data.map((item: any) => ({
            id: String(item._id),
            name: item.name,
            color: item.color,
          }));
          setAvailableItems(transformedItems);
        }
      } else {
        toast.error(`Failed to load ${type}s`);
      }
    } catch (error) {
      toast.error(`Error loading ${type}s`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <Link href="/analytics">
            <Button variant="ghost" className="dark:hover:bg-white/10">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Analytics
            </Button>
          </Link>
        </div>
        <LoadingCard />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/analytics">
          <Button variant="ghost" className="dark:hover:bg-white/10">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Analytics
          </Button>
        </Link>
      </div>

      <ComparativeDashboard
        type={type}
        availableItems={availableItems}
      />
    </div>
  );
}
