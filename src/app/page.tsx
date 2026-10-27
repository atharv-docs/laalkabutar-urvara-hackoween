"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUrvara } from "@/components/providers/UrvaraProvider";
import { Logo } from "@/components/ui/domain";

/** Entry: send signed-in users to their portal, everyone else to sign-in. */
export default function Home() {
  const { session, sessionReady, user, status } = useUrvara();
  const router = useRouter();
  useEffect(() => {
    if (!sessionReady) return;
    if (!session) router.replace("/login");
    else if (user) router.replace(user.role === "owner" ? "/owner" : "/farmer");
    else if (status === "ready") router.replace("/login");
  }, [session, sessionReady, user, status, router]);
  return (
    <div className="grid min-h-dvh place-items-center bg-forest">
      <Logo size={72} className="animate-pulse" />
    </div>
  );
}
