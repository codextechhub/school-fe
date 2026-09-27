import type { ReactNode } from "react";

/** A problem a reader may hit, and what to do about it. */
export type Problem = { title: string; body: ReactNode };

/**
 * The "Common problems" cards used by the student and guardian guides.
 *
 * Plain elements only, and never a `<section>`: the registry test reads every
 * `<section id>` an article renders as its contents, so a section here would
 * appear as an entry the guide does not list.
 */
export function ProblemGrid({ items }: { items: readonly Problem[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map(({ title, body }) => (
        <div key={title} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-black-01">{title}</p>
          <p className="mt-2 text-xs leading-5 text-gray-01">{body}</p>
        </div>
      ))}
    </div>
  );
}
