import { HeadmatesClient } from "@/components/headmates-client";

export const dynamic = "force-dynamic";

export default function HeadmatesPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Headmates</h1>
        <p className="text-sm text-muted-foreground">
          Manage profiles and who is currently fronting. Use <strong className="text-foreground">List</strong>{" "}
          or <strong className="text-foreground">Cards</strong>, then <strong className="text-foreground">View</strong>{" "}
          for a full read-friendly profile. Delete lives under <strong className="text-foreground">Edit</strong>.
        </p>
      </div>

      <HeadmatesClient />
    </section>
  );
}
