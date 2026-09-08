import { useRef, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { toast } from "sonner";
import { ImageUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFetchAuthMediaQuery } from "@/redux/services/media-api";
import {
  useRemoveSchoolLogoMutation,
  useUploadSchoolLogoMutation,
} from "@/redux/services/school/school-api";
import { apiErrorMessage } from "@/utils/api-error";

/** Mirrors core.uploads.LOGO_EXTENSIONS / MAX_LOGO_BYTES on the server. */
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * The school's logo: preview, replace, remove.
 *
 * Two things here are not decoration. The preview goes through
 * `fetchAuthMedia` because `/media/` is behind the JWT - a plain `<img src>`
 * gets a 401, since the browser sends no Authorization header. And the type and
 * size are checked before the file leaves the page, so the common mistakes
 * (a PDF, a 6MB photo) are answered instantly instead of after an upload; the
 * server re-checks both, and checks the leading bytes as well, so this is
 * courtesy rather than the guard.
 */
export function LogoField({
  logoUrl,
  canEdit = true,
}: {
  logoUrl: string;
  /** False for a reader: the crest is shown, the controls are not. */
  canEdit?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState("");
  const [upload, { isLoading: isUploading }] = useUploadSchoolLogoMutation();
  const [remove, { isLoading: isRemoving }] = useRemoveSchoolLogoMutation();
  const { data: previewUrl } = useFetchAuthMediaQuery(logoUrl || skipToken);
  const busy = isUploading || isRemoving;

  const onPick = async (file: File | undefined) => {
    setLocalError("");
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setLocalError("Upload a PNG, JPG or WEBP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError("Your logo must be 2MB or smaller.");
      return;
    }
    try {
      await upload(file).unwrap();
      toast.success("Logo updated.");
    } catch (error) {
      setLocalError(
        apiErrorMessage(error, "We could not upload that logo. Try again."),
      );
    } finally {
      // Clear the input, or picking the same file twice fires no change event.
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onRemove = async () => {
    setLocalError("");
    try {
      await remove().unwrap();
      toast.success("Logo removed.");
    } catch (error) {
      setLocalError(
        apiErrorMessage(error, "We could not remove that logo. Try again."),
      );
    }
  };

  return (
    <section className="bg-white rounded-md border border-white-02 px-4 py-5 sm:px-6 max-w-200">
      <p className="text-xs uppercase tracking-widest text-gray-05 font-mont">
        Logo
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div className="size-20 shrink-0 rounded-md border border-border bg-gray-03 grid place-content-center overflow-hidden">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Your school logo"
              className="size-full object-contain"
            />
          ) : (
            <ImageUp className="size-6 text-gray-05" strokeWidth={1.5} />
          )}
        </div>

        <div className="min-w-0 flex-1 basis-64">
          <p className="text-[13px] text-gray-06 text-pretty">
            {canEdit
              ? "Shown in your sidebar and on the browser tab. A square PNG on a transparent background reads best. PNG, JPG or WEBP, up to 2MB."
              : "Shown in your sidebar and on the browser tab."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {canEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                loading={isUploading}
                onClick={() => inputRef.current?.click()}
              >
                {logoUrl ? "Replace logo" : "Upload a logo"}
              </Button>
            )}
            {canEdit && logoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={busy}
                loading={isRemoving}
                onClick={onRemove}
              >
                <Trash2 />
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(event) => onPick(event.target.files?.[0])}
      />

      {localError && (
        <p className="mt-3 text-xs font-medium text-error-text text-pretty">
          {localError}
        </p>
      )}
    </section>
  );
}
