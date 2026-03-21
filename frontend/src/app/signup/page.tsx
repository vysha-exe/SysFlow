import Link from "next/link";
import { SignupForm } from "@/components/signup-form";

export default function SignupPage() {
  return (
    <section className="mx-auto max-w-md space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="text-sm text-zinc-600">
          Create your account, then your own system space is provisioned automatically.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <SignupForm />
      </div>

      <p className="text-sm text-zinc-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-violet-700 hover:underline">
          Sign in
        </Link>
      </p>
    </section>
  );
}
