"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Target } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const debug = searchParams.get("debug");
  const [envDebug, setEnvDebug] = useState<any>(null);

  useEffect(() => {
    if (error) {
      fetch("/api/debug/env-public")
        .then((res) => res.json())
        .then(setEnvDebug)
        .catch(() => setEnvDebug({ error: "Failed to load env debug" }));
    }
  }, [error]);

  const copyDebugInfo = () => {
    const info = `Error: ${error}
Details: ${debug}
Timestamp: ${new Date().toISOString()}

Environment Check:
${JSON.stringify(envDebug, null, 2)}`;
    navigator.clipboard.writeText(info);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Target className="h-32 w-32 text-primary" />
        </div>
        <CardTitle className="text-3xl font-bold">Target Tracker</CardTitle>
        <CardDescription>Log in with Discord to continue</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error === "not_allowed" && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <div className="text-center mb-2">This account is not authorized.</div>
            {debug && (
              <div className="text-xs font-mono bg-black/20 p-2 rounded mt-2 break-all">
                <div className="mb-2">{debug}</div>
                {envDebug && (
                  <div className="text-[10px] opacity-80 border-t border-current pt-2 mt-2">
                    <div>NextAuth URL: {envDebug.nextAuthUrl || "MISSING"}</div>
                    <div>Discord ID set: {envDebug.hasDiscordClientId ? "✓" : "✗"}</div>
                    <div>Discord Secret set: {envDebug.hasDiscordClientSecret ? "✓" : "✗"}</div>
                    <div>Master Discord ID: {envDebug.masterDiscordIdValue || "MISSING"}</div>
                  </div>
                )}
                <Button
                  onClick={copyDebugInfo}
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-6 px-2 w-full"
                >
                  Copy Debug Info
                </Button>
              </div>
            )}
          </div>
        )}
        {error && error !== "not_allowed" && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <div className="text-center mb-2">Login failed. Try again.</div>
            {(debug || envDebug) && (
              <div className="text-xs font-mono bg-black/20 p-2 rounded mt-2 break-all">
                {debug && <div className="mb-2">{debug}</div>}
                {envDebug && (
                  <div className="text-[10px] opacity-80 border-t border-current pt-2 mt-2">
                    <div>NextAuth URL: {envDebug.nextAuthUrl || "MISSING"}</div>
                    <div>Discord ID: {envDebug.discordClientIdPrefix || "MISSING"}</div>
                    <div>Discord Secret: {envDebug.discordClientSecretPrefix || "MISSING"}</div>
                    <div>Master Discord ID: {envDebug.masterDiscordIdValue || "MISSING"}</div>
                  </div>
                )}
                <Button
                  onClick={copyDebugInfo}
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-6 px-2 w-full"
                >
                  Copy Debug Info
                </Button>
              </div>
            )}
          </div>
        )}
        <Button
          onClick={() => signIn("discord", { callbackUrl: "/analytics" })}
          className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold shadow-lg transition-all duration-200"
          size="lg"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
          Continue with Discord
        </Button>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
