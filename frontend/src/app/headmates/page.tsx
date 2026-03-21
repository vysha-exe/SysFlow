import { headmates } from "@/lib/mock-data";

export default function HeadmatesPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Headmates</h1>
        <p className="text-sm text-zinc-600">
          MVP profile list with pronouns, custom fields, and privacy level.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {headmates.map((headmate) => (
          <article
            key={headmate.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{headmate.name}</h2>
              <button className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700">
                Switch to
              </button>
            </div>
            <p className="mt-1 text-sm text-zinc-600">{headmate.pronouns}</p>
            <p className="mt-2 text-sm text-zinc-700">{headmate.description}</p>
            <p className="mt-3 text-xs uppercase tracking-wide text-zinc-500">
              Privacy: {headmate.privacyLevel.replaceAll("_", " ")}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-600">
              {Object.entries(headmate.customFields).map(([key, value]) => (
                <div key={key}>
                  <dt className="font-medium">{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
