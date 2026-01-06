import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Crosshair, Zap, LayoutGrid } from "lucide-react";

export default function SetupPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Setup</h1>
      <p className="text-muted-foreground mb-8">
        Manage your firearms, optics, calibers, and target templates.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/setup/targets">
          <Card className="cursor-pointer hover:bg-accent transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5" />
                Target Templates
              </CardTitle>
              <CardDescription>
                Choose target types for your sessions
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/setup/firearms">
          <Card className="cursor-pointer hover:bg-accent transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Firearms
              </CardTitle>
              <CardDescription>
                Manage your firearms collection
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/setup/optics">
          <Card className="cursor-pointer hover:bg-accent transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crosshair className="h-5 w-5" />
                Optics
              </CardTitle>
              <CardDescription>
                Manage your optics and sights
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/setup/calibers">
          <Card className="cursor-pointer hover:bg-accent transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Calibers
              </CardTitle>
              <CardDescription>
                Manage ammunition calibers
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}

