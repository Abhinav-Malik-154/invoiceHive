"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import { setAccessToken } from "@/lib/api";

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      router.replace("/auth/login?error=oauth_failed");
      return;
    }

    if (token) {
      // 1. Store token in memory for Axios
      setAccessToken(token);

      // 2. Store loosely in cookie for persistence across tabs/reloads
      Cookies.set("token", token, { expires: 1 }); // 1 day

      // 3. Force a full reload to allow AuthContext to fetch the user
      //    safely on mount, avoiding complex state dependencies here.
      window.location.href = "/dashboard";
    } else {
      router.replace("/auth/login");
    }
  }, [searchParams, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-surface-container-lowest">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
        <p className="mt-4 text-on-surface-variant font-medium">Authenticating...</p>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-surface-container-lowest">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-on-surface-variant font-medium">Loading...</p>
        </div>
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  );
}