import { HeadmatesClient } from "@/components/headmates-client";

export const dynamic = "force-dynamic";

export default function HeadmatesPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Headmates</h1>
        <p className="text-sm text-zinc-600">
          Manage profiles and who is currently fronting.
        </p>
      </div>

      <HeadmatesClient />
    </section>
  );
}
