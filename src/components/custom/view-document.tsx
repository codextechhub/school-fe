import { toast } from "sonner";

import { useLazyFetchAuthMediaQuery } from "@/redux/services/media-api";

/**
 * Open a stored document, such as a student's birth certificate or a staff
 * member's CV, in a new tab.
 *
 * **A plain link cannot work.** MediaView is behind the JWT, and a new tab
 * opened from an <a href> sends no Authorization header, so it answers 401. The
 * signature on the url binds it to one reader; it is not what authenticates the
 * read.
 *
 * So the bytes are fetched with the token and opened as a local blob, the same
 * route the school crest and a person's photograph take. One component for
 * every record that holds documents, so they all open the same way.
 */
export function ViewDocument({ url, label }: { url: string; label: string }) {
  const [fetchMedia, { isFetching }] = useLazyFetchAuthMediaQuery();

  async function open() {
    // The tab is opened ON THE CLICK, before the await. A window opened from an
    // async continuation has lost the user gesture and the browser blocks it as
    // a popup - which is silent: nothing opens and nothing says why.
    //
    // No "noopener" here on purpose: with it window.open returns null by spec
    // and there would be no handle to point at the bytes. The opener is cleared
    // by hand instead.
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    try {
      const blobUrl = await fetchMedia(url).unwrap();
      if (tab) {
        tab.location.href = blobUrl;
        return;
      }
      // Popups blocked. Save it instead of navigating this page away from a
      // record the reader is in the middle of.
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = label;
      link.click();
    } catch {
      tab?.close();
      toast.error(`We could not open the ${label.toLowerCase()}.`);
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={isFetching}
      className="text-xs text-primary underline-offset-2 hover:underline disabled:opacity-60"
    >
      {isFetching ? "Opening…" : "View"}
    </button>
  );
}
