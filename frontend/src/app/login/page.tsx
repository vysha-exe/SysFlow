import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-md space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Sign in with your email and password.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <LoginForm />
      </div>

      <p className="text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </section>
  );
}
