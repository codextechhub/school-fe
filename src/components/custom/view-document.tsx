/**
 * Student and staff records open protected documents over the current page.
 * The media request keeps the caller's bearer token and the viewer owns its
 * temporary file URL until it closes.
 */

import { useMemo, useState } from "react";

import { FilePreviewDialog, type PreviewFile } from "@xvs/finance/components/finance-ui/file-preview-dialog";
import { fetchAttachmentBlob } from "@/utils/attachment-download";

export function ViewDocument({ url, label }: { url: string; label: string }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const files = useMemo<PreviewFile[]>(() => {
    const extension = url.split("?")[0].match(/\.(pdf|png|jpe?g|gif|webp|csv|xlsx?)$/i)?.[0] || "";
    const name = /\.[a-z0-9]+$/i.test(label) ? label : `${label}${extension}`;
    return [{
      id: url,
      name,
      loadPreview: (signal) => fetchAttachmentBlob(url, signal),
      loadDownload: () => fetchAttachmentBlob(url),
    }];
  }, [label, url]);

  return <>
    <button type="button" onClick={() => setSelectedIndex(0)} className="text-xs text-primary underline-offset-2 hover:underline">View</button>
    <FilePreviewDialog files={files} index={selectedIndex} onIndexChange={setSelectedIndex} onClose={() => setSelectedIndex(null)} />
  </>;
}
