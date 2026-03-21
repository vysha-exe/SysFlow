"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Unable to create account.");
      setIsLoading(false);
      return;
    }

    await signIn("credentials", {
      email,
      password,
      callbackUrl: "/",
    });
  }

  return (
    <form className="space-y-3" onSubmit={handleSignup}>
      <input
        type="text"
        required
        placeholder="Display name"
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
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
        minLength={8}
        placeholder="Password (min 8 chars)"
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
        {isLoading ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
