import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  getActorAllowIncompleteProfile,
  getPostSignInPath,
} from "@/server/auth/session";

async function DashboardRedirect() {
  const actor = await getActorAllowIncompleteProfile();
  redirect(getPostSignInPath(actor));
  return null;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardRedirect />
    </Suspense>
  );
}
