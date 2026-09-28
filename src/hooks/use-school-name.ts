import { useEffect, useState } from "react";
import { schoolNameUrl } from "@/utils/school-brand";

/**
 * The exact school name shown before sign-in.
 *
 * A URL slug identifies the school but is not necessarily its display name.
 * The public lookup returns only that name. An unavailable lookup leaves the
 * name empty while the existing crest continues to identify the school.
 */
export function useSchoolName(slug: string): string {
  const [name, setName] = useState("");

  useEffect(() => {
    const url = schoolNameUrl(slug);
    if (!url) return;

    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: unknown) => {
        if (!body || typeof body !== "object" || !("name" in body)) return;
        const value = body.name;
        if (typeof value === "string") setName(value.trim());
      })
      .catch(() => {});

    return () => controller.abort();
  }, [slug]);

  return name;
}
