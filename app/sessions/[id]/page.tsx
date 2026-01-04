"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Calendar, MapPin, Plus, Edit, Trash2, Target as TargetIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { calculateSheetMetrics } from "@/lib/metrics";

interface RangeSession {
  _id: string;
  date: string;
  location?: string;
  notes?: string;
}

interface Sheet {
  _id: string;
  firearmId: { _id: string; name: string };
  caliberId: { _id: string; name: string };
  opticId: { _id: string; name: string };
  distanceYards: number;
  sheetLabel?: string;
  notes?: string;
}

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<RangeSession | null>(null);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setSheets(data.sheets);
      } else {
        toast.error("Session not found");
        router.push("/sessions");
      }
    } catch (error) {
      toast.error("Failed to load session");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!confirm("Delete this session and all its sheets?")) return;

    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Session deleted");
        router.push("/sessions");
      } else {
        toast.error("Failed to delete session");
      }
    } catch (error) {
      toast.error("Failed to delete session");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Calendar className="h-8 w-8" />
              {format(new Date(session.date), "MMMM d, yyyy")}
            </h1>
            {session.location && (
              <p className="text-muted-foreground mt-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {session.location}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleDeleteSession}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {session.notes && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm">{session.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Target Sheets</h2>
        <Button onClick={() => router.push(`/sessions/${sessionId}/sheets/new`)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Sheet
        </Button>
      </div>

      {sheets.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No target sheets yet. Click "Add Sheet" to record your shooting.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sheets.map((sheet) => (
            <Card
              key={sheet._id}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => router.push(`/sheets/${sheet._id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TargetIcon className="h-5 w-5" />
                  {sheet.sheetLabel || "Target Sheet"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <p><strong>Firearm:</strong> {sheet.firearmId.name}</p>
                  <p><strong>Caliber:</strong> {sheet.caliberId.name}</p>
                  <p><strong>Optic:</strong> {sheet.opticId.name}</p>
                  <p><strong>Distance:</strong> {sheet.distanceYards} yards</p>
                </div>
                {sheet.notes && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {sheet.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

