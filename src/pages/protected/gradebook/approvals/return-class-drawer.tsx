import { useState } from "react";
import { toast } from "sonner";

import { NativeSelect } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useGetBroadsheetQuery, useReturnClassMutation } from "@/redux/services/gradebook/gradebook-api";
import type { ApprovalRow } from "@/redux/services/gradebook/gradebook-types";
import { DrawerShell, Field } from "@/pages/protected/students/drawers/drawer-shell";

/**
 * Sends an awaiting class back, with a note.
 *
 * Most returns go to the class teacher, who reopens the class's comments and
 * ratings and submits it again. When the trouble is one subject's marks, the
 * principal can send that subject's sheet straight to its main teacher
 * instead: the sheet reopens as returned with the note pinned above its grid,
 * and the class goes back to entering until the sheet is in again. The
 * subjects come from the class's broadsheet, with each one's main teacher.
 *
 * Nothing is deleted either way. The note is required by the server.
 */
export function ReturnClassDrawer({ row, onClose }: { row: ApprovalRow; onClose: () => void }) {
  const [to, setTo] = useState<"class" | "subject">("class");
  const [subject, setSubject] = useState("");
  const [note, setNote] = useState("");
  const [send, sending] = useReturnClassMutation();
  const { data } = useGetBroadsheetQuery({ classId: row.class.id });
  const subjects = data?.data.subjects ?? [];
  const chosen = subjects.find((item) => String(item.id) === subject);
  const teacher = row.class_teacher?.name ?? "the class teacher";
  const recipient = to === "class" ? teacher : (chosen?.main_teacher?.name ?? "its main teacher");

  const onSave = async () => {
    const result = await send({
      classId: row.class.id,
      note: note.trim(),
      ...(to === "subject" && chosen ? { subject: chosen.id } : {}),
    });
    if ("error" in result) return;
    toast.success(to === "class" ? `${row.class.name} returned` : `${chosen?.name} returned`, {
      description: `Reopened for ${recipient}, with your note.`,
    });
    onClose();
  };

  return (
    <DrawerShell
      open
      onClose={onClose}
      title={`Return ${row.class.name}`}
      subtitle={`It reopens for ${recipient}, with your note.`}
      saveLabel="Return with this note"
      onSave={() => void onSave()}
      canSave={!!note.trim() && (to === "class" || !!chosen)}
      saving={sending.isLoading}
    >
      <div className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-black-01">Who it goes back to</legend>
          <RadioGroup value={to} onValueChange={(value) => setTo(value as "class" | "subject")}>
            <label className="flex items-start gap-2 text-sm text-black-01">
              <RadioGroupItem value="class" className="mt-0.5" />
              <span>
                The class teacher, {teacher}
                <span className="block text-xs text-gray-05">Comments and ratings reopen. Every subject stays in.</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-black-01">
              <RadioGroupItem value="subject" className="mt-0.5" />
              <span>
                One subject&apos;s teacher
                <span className="block text-xs text-gray-05">That sheet reopens; the class waits until it is in again.</span>
              </span>
            </label>
          </RadioGroup>
        </fieldset>
        {to === "subject" && (
          <Field label="Subject" required>
            <NativeSelect value={subject} onChange={(event) => setSubject(event.target.value)}>
              <option value="">Choose a subject</option>
              {subjects.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.name}
                  {item.main_teacher ? ` · ${item.main_teacher.name}` : ""}
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}
        <Field label="Why it is going back" required>
          <Textarea
            rows={5}
            maxLength={1000}
            value={note}
            placeholder="For example: three comments repeat each other word for word. Please make each one about the student."
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
        <p className="text-xs leading-5 text-gray-05">
          Nothing is deleted. Every mark, comment and rating stays as it is until it is changed.
        </p>
      </div>
    </DrawerShell>
  );
}
