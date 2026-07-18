// app/page.tsx
"use client";

import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Landing from "@/components/Landing";
import Onboarding from "@/components/Onboarding";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  const [syncState, setSyncState] = useState<{
    loading: boolean;
    needsOnboard: boolean;
    role: string | null;
    error: string | null;
  }>({
    loading: true,
    needsOnboard: false,
    role: null,
    error: null,
  });

  // --- Sync profile on mount / sign in ---
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const performSync = async () => {
      try {
        const res = await fetch("/api/v1/auth/sync", { method: "POST" });
        if (!res.ok) throw new Error("Sync failed.");
        const data = await res.json();
        
        if (data.synced) {
          setSyncState({
            loading: false,
            needsOnboard: false,
            role: data.role,
            error: null,
          });
        } else {
          setSyncState({
            loading: false,
            needsOnboard: true,
            role: null,
            error: null,
          });
        }
      } catch (err: any) {
        console.error("[SYNC CHECK ERROR]", err);
        // Fallback: trust Clerk metadata if it exists
        const clerkRole = user?.publicMetadata?.role as string | undefined;
        if (clerkRole === "ADMIN" || clerkRole === "STUDENT") {
          setSyncState({
            loading: false,
            needsOnboard: false,
            role: clerkRole,
            error: null,
          });
        } else {
          setSyncState({
            loading: false,
            needsOnboard: false,
            role: null,
            error: err.message || "Failed to synchronize profile.",
          });
        }
      }
    };

    performSync();
  }, [isLoaded, isSignedIn, user]);

  // --- Handle redirects based on synced role ---
  useEffect(() => {
    if (syncState.role === "ADMIN") {
      router.push("/admin/dashboard");
    } else if (syncState.role === "STUDENT") {
      router.push("/student");
    }
  }, [syncState.role, router]);

  const handleOnboardComplete = async (newRole: string) => {
    if (user) {
      await user.reload();
    }
    setSyncState({
      loading: false,
      needsOnboard: false,
      role: newRole,
      error: null,
    });
  };

  // --- Loading Auth State ---
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-gray-50">
        <Card className="p-6 flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <CardContent className="p-0 text-gray-600 text-lg">
            Loading authentication...
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Not signed in ---
  if (!isSignedIn) {
    return <Landing />;
  }

  // --- Loading Sync State ---
  if (syncState.loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Card className="p-6 flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <CardContent className="p-0 text-gray-600 text-lg">
            Synchronizing profile details...
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Sync Error State ---
  if (syncState.error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Card className="max-w-lg w-full border border-rose-200 bg-white p-8 text-center shadow-md">
          <CardContent className="space-y-3">
            <h1 className="text-2xl font-bold text-rose-600">Sync Error</h1>
            <p className="text-gray-600">{syncState.error}</p>
            <p className="text-sm text-gray-500">
              Please verify your database connection is active.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Onboarding Selection Screen ---
  if (syncState.needsOnboard) {
    return <Onboarding user={user} onComplete={handleOnboardComplete} />;
  }

  // --- While redirecting ---
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Loader2 className="animate-spin h-6 w-6 text-indigo-500" />
      <span className="ml-3 text-gray-600 text-lg">Redirecting to dashboard...</span>
    </div>
  );
}
