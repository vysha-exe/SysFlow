"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleCredentialsLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl: "/",
        redirect: false,
      });

      if (!result) {
        setError(
          "Sign-in did not return a response. On Vercel, set NEXTAUTH_URL (your site URL, no trailing slash) and NEXTAUTH_SECRET, then redeploy.",
        );
        return;
      }

      if (result.error) {
        // NextAuth uses CredentialsSignin for bad password; Configuration often means env (NEXTAUTH_URL / SECRET).
        if (result.error === "CredentialsSignin") {
          setError("Invalid email or password.");
        } else if (result.error === "Configuration") {
          setError(
            "Auth configuration error. On production, set NEXTAUTH_URL to your exact site URL (https://…) and NEXTAUTH_SECRET in the host’s environment variables, then redeploy.",
          );
        } else {
          setError(result.error);
        }
        return;
      }

      if (result.url) {
        window.location.href = result.url;
      } else {
        window.location.href = "/";
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form className="space-y-3" onSubmit={handleCredentialsLogin}>
        <input
          type="email"
          required
          placeholder="Email"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <input
          type="password"
          required
          placeholder="Password"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
