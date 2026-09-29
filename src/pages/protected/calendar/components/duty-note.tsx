import { UserX } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * What the server said about a lesson's teacher and their teaching duties,
 * under the teacher field.
 *
 * Each line is the server's own sentence, shown as it arrived. Amber when the
 * lesson still saves (the school's rule is WARN), red when it will not
 * (REFUSE), and no tick either way: a missing duty is not a clash to accept.
 */
export function DutyNote({
  severity,
  lines,
}: {
  severity: "warning" | "blocking";
  lines: string[];
}) {
  if (!lines.length) return null;
  const blocking = severity === "blocking";
  return (
    <div
      role={blocking ? "alert" : "status"}
      className={cn(
        "mt-2 rounded-lg border px-3 py-2",
        blocking
          ? "border-error-text/30 bg-error-text/5"
          : "border-yellow-01/50 bg-yellow-01/5",
      )}
    >
      {lines.map((line, i) => (
        <p
          key={`${line}-${i}`}
          className={cn(
            "flex items-start gap-1.5 text-xs text-pretty",
            blocking ? "text-error-text" : "text-gray-06",
          )}
        >
          <UserX className="mt-px size-3.5 shrink-0" />
          <span className="min-w-0">{line}</span>
        </p>
      ))}
      {!blocking && (
        <p className="mt-1 text-xs text-gray-05 text-pretty">
          The lesson still saves, and the publish check lists it.
        </p>
      )}
    </div>
  );
}
