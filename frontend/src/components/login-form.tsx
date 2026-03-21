"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

type LoginFormProps = {
  googleEnabled: boolean;
};

export function LoginForm({ googleEnabled }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleCredentialsLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/",
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    window.location.href = "/";
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/" })}
        disabled={!googleEnabled}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continue with Google
      </button>
      {!googleEnabled && (
        <p className="text-xs text-amber-700">
          Google sign-in is not configured yet. Add `GOOGLE_CLIENT_ID` and
          `GOOGLE_CLIENT_SECRET` in `.env.local`.
        </p>
      )}

      <div className="flex items-center gap-3 text-xs text-zinc-400">
        <span className="h-px flex-1 bg-zinc-200" />
        OR
        <span className="h-px flex-1 bg-zinc-200" />
      </div>

      <form className="space-y-3" onSubmit={handleCredentialsLogin}>
        <input
          type="email"
          required
          placeholder="Email"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <input
          type="password"
          required
          placeholder="Password"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
