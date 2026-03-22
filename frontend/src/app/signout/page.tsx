import type { Metadata } from "next";
import Link from "next/link";
import { SignOutPanel } from "@/components/sign-out-panel";

export const metadata: Metadata = {
  title: "Sign out — SysFlow",
  description: "End your SysFlow session on this device.",
};

export default function SignOutPage() {
  return (
    <section className="mx-auto max-w-lg space-y-6">
      <SignOutPanel />

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/" className="font-medium text-primary hover:underline">
          ← Back to dashboard
        </Link>
      </p>
    </section>
  );
}
