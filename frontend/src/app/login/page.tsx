import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );

  return (
    <section className="mx-auto max-w-md space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-zinc-600">
          Use email/password or continue with Google.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <LoginForm googleEnabled={googleEnabled} />
      </div>

      <p className="text-sm text-zinc-600">
        New here?{" "}
        <Link href="/signup" className="font-medium text-violet-700 hover:underline">
          Create an account
        </Link>
      </p>
    </section>
  );
}
