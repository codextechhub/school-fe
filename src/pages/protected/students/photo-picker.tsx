import { useRef, type ReactNode } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

import PermissionGate from "@/components/custom/permission-gate";
import type { PermissionCode } from "@/permissions";
import { cn } from "@/lib/utils";
import { writeErrorMessage } from "@/utils/api-error";

import { PersonAvatar } from "./person-avatar";

/**
 * A person's face, with the control that puts one there.
 *
 * **The picker is on the picture.** Somebody looking for where a photograph
 * goes looks at the empty circle where the face should be, not at a tab two
 * clicks away, so the circle carries the button. One component for students,
 * guardians and staff because they are the same gesture on the same shape, and
 * copies would drift. `permission` is the key the caller's photo endpoint
 * enforces, which differs by record, so every caller names it. `null` is for
 * the one endpoint that admits the record's owner without any key: a member of
 * staff changing their own photograph. The caller has already decided, and
 * `editable` carries the answer.
 *
 * A photograph is optional on all of them. Nothing gates on one being set, and
 * a student or guardian record is not marked incomplete without it: a school
 * photographs its intake on a day it chooses, not at the desk while a parent
 * waits.
 *
 * The picker offers images only. The bytes are rendered in an `<img>` on every
 * list, and a refusal after the upload is a worse way to learn that than a
 * dialog that never shows the PDF.
 *
 * `editable` false leaves the face without the control: a record read as at
 * an earlier day, or a photograph the viewer's Field Access lets them see but
 * not change.
 */
export function PhotoPicker({
  name,
  photoUrl,
  onPick,
  saving,
  size = "size-18",
  textClassName = "text-2xl",
  editable = true,
  permission,
}: {
  name: string;
  /** "" when none is held, which is the ordinary case. */
  photoUrl?: string;
  /** Sends the file. Throws on refusal, which this reports. */
  onPick: (file: File) => Promise<unknown>;
  saving: boolean;
  /** The circle's size class. The profile is 18, a guardian one step down. */
  size?: string;
  textClassName?: string;
  editable?: boolean;
  /** The key the photo endpoint enforces for this record, or null for the owner's own. */
  permission: PermissionCode | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const control = (children: ReactNode) =>
    permission === null ? (
      editable ? <>{children}</> : null
    ) : (
      <PermissionGate permission={permission} disabled={!editable}>
        {children}
      </PermissionGate>
    );

  async function choose(file: File | undefined) {
    if (!file) return;
    try {
      await onPick(file);
      toast.success("Photograph saved.");
    } catch (error) {
      toast.error(writeErrorMessage(error, "We could not save that photograph."));
    }
  }

  return (
    <div className="relative shrink-0">
      <PersonAvatar
        name={name}
        photoUrl={photoUrl}
        className={size}
        textClassName={textClassName}
      />
      {control(<>
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void choose(e.target.files?.[0]);
            // Cleared so picking the SAME file again still fires a change,
            // which is exactly what retrying a failed upload looks like.
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={saving}
          onClick={() => input.current?.click()}
          aria-label={
            photoUrl
              ? `Replace ${name}'s photograph`
              : `Add a photograph for ${name}`
          }
          title={photoUrl ? "Replace photograph" : "Add a photograph"}
          className={cn(
            "absolute -right-0.5 -bottom-0.5 grid size-7 place-items-center",
            "rounded-full border border-white-02 bg-white text-gray-06 shadow-sm",
            "transition-colors hover:text-primary disabled:opacity-60",
          )}
        >
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Camera className="size-3.5" />
          )}
        </button>
      </>)}
    </div>
  );
}
