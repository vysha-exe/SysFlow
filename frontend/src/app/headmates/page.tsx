import { HeadmatesClient } from "@/components/headmates-client";

export const dynamic = "force-dynamic";

export default function HeadmatesPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Headmates</h1>
        <p className="text-sm text-muted-foreground">
          Manage profiles and who is currently fronting. Use <strong className="text-foreground">List</strong>{" "}
          for a compact scrollable roster or <strong className="text-foreground">Cards</strong> for a denser
          grid (up to four per row on wide screens).
        </p>
      </div>

      <HeadmatesClient />
    </section>
  );
}
