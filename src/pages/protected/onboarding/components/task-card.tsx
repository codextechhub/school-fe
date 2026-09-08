import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { EllipsisVertical } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { useTransitionOnboardingTaskMutation } from "@/redux/services/onboarding/onboarding-api";
import type {
  OnboardingTask,
  TaskStatus,
} from "@/redux/services/onboarding/onboarding-types";
import { apiErrorMessage, parseApiError } from "@/utils/api-error";
import { taskMeta } from "../task-catalog";
import { TaskStatusChip } from "./onboarding-chips";

/**
 * One checklist step.
 *
 * `readOnly` covers two different readers with the same treatment: a school that
 * has gone live (onboarding is closed, every transition is refused) and a branch
 * admin, who may watch the checklist but not run it. Neither gets a button, for
 * the same reason - a control they cannot use is worse than no control.
 *
 * The card owns its own transition call so a slow step never freezes the rest of
 * the checklist, and so a refusal stays attached to the step it belongs to.
 *
 * There are three kinds of refusal and they are not interchangeable:
 *
 * - `TASK_CONDITION_NOT_MET` is the platform saying it looked and the thing is
 *   not true yet. Its sentence is the whole point of the step, so it renders
 *   INLINE under the card in the field-error treatment and stays there. A toast
 *   would take it away while the school was still reading it.
 * - `REQUIRED_TASK_NOT_SKIPPABLE` and `TASK_ALREADY_IN_STATE` are mistakes
 *   rather than missing work - nothing to read twice - so they toast.
 * - Anything else is a failure, and toasts as one.
 */
export function TaskCard({
  task,
  readOnly,
}: {
  task: OnboardingTask;
  readOnly?: boolean;
}) {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const meta = taskMeta(task.key);
  const Icon = meta.icon;
  const [transition, { isLoading }] = useTransitionOnboardingTaskMutation();
  const [refusal, setRefusal] = useState("");

  // Only where the step has a screen in this app that is genuinely open to a
  // school that has not gone live, AND this reader may open it. Most steps have
  // no screen at all, and say so instead.
  const openRoute =
    meta.route &&
    (!meta.openPermission || hasPermission(meta.openPermission))
      ? meta.route
      : undefined;
  const isDone = task.status === "DONE";
  const isSkipped = task.status === "SKIPPED";
  const canSkip = !task.is_required && !isSkipped && !isDone;

  const run = async (status: TaskStatus, success: string) => {
    setRefusal("");
    try {
      await transition({ key: task.key, status }).unwrap();
      toast.success(success);
    } catch (error) {
      const { code } = parseApiError(error);
      if (code === "TASK_CONDITION_NOT_MET") {
        setRefusal(
          apiErrorMessage(error, "This step is not complete yet."),
        );
        return;
      }
      toast.error(
        apiErrorMessage(error, "That step could not be updated. Try again."),
      );
    }
  };

  return (
    <div
      id={`task-${task.key}`}
      className="bg-white rounded-md px-4 py-4 sm:px-4.5 border border-white-02 hover:border-pry-01 transition-colors scroll-mt-24"
    >
      {/* Wraps rather than shrinks. On a phone the action buttons cannot get
          any narrower (nowrap labels), so in a plain flex row they would take
          their ~200px out of the text column and leave it one word wide - no
          page overflow, and completely unreadable. The large flex-basis on the
          content forces the actions onto their own line instead. */}
      <div className="flex flex-wrap items-start gap-x-3.5 gap-y-3 sm:gap-x-4">
        <span
          className={cn(
            "size-9.5 rounded-md grid place-content-center shrink-0",
            isDone
              ? "bg-green-01/10 text-green-01"
              : isSkipped
                ? "bg-gray-05/10 text-gray-05"
                : "bg-pry-01 text-primary",
          )}
        >
          <Icon className="size-4.5" />
        </span>

        {/* min-w-0 keeps `truncate` and long words working inside a flex
            child; basis-64 is what makes the row wrap before the text is
            squeezed. */}
        <div className="flex-1 basis-64 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold font-mont text-black-01">
              {task.title}
            </p>
            <TaskStatusChip status={task.status} />
            <span className="text-[11px] uppercase tracking-wide text-gray-02">
              {task.is_required ? "Required" : "Optional"}
            </span>
          </div>

          <p className="mt-1 text-[13px] text-gray-06 text-pretty">
            {meta.description}
          </p>

          {meta.attested && !isDone && (
            <p className="mt-1 text-xs text-gray-05">
              We take your word for this step.
            </p>
          )}
          {isSkipped && (
            <p className="mt-1 text-xs text-gray-05">
              Deferred. You can come back to this at any time.
            </p>
          )}
          {meta.closedNote && !isDone && (
            <p className="mt-1 text-xs text-gray-05 text-pretty">
              {meta.closedNote}
            </p>
          )}
          {refusal && (
            <p className="mt-2 text-xs font-medium text-error-text text-pretty">
              {refusal}
            </p>
          )}
        </div>

        {/* The action row is NOT shrink-0. A card can carry two actions -
            "Open profile" beside "Mark as done" - and a shrink-0 row grows to
            fit both on one line however narrow the screen is, which took the
            page 53px past a 390px viewport. Letting it shrink is what makes its
            own flex-wrap fire. */}
        {(openRoute || !readOnly) && (
          <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
            {/* Outside the readOnly guard: a reader who may open the screen
                behind a step should still be able to go and look at it. */}
            {openRoute && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(openRoute)}
              >
                {meta.openLabel ?? "Open"}
              </Button>
            )}
            {!readOnly && canSkip && (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-05"
                disabled={isLoading}
                onClick={() =>
                  run("SKIPPED", `${task.title} set aside for now`)
                }
              >
                Skip for now
              </Button>
            )}
            {!readOnly && isSkipped && (
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading}
                onClick={() =>
                  run("IN_PROGRESS", `${task.title} is back on your list`)
                }
              >
                Do this now
              </Button>
            )}
            {!readOnly && !isDone && (
              <Button
                size="sm"
                loading={isLoading}
                disabled={isLoading}
                onClick={() => run("DONE", `${task.title} marked as done`)}
              >
                Mark as done
              </Button>
            )}
            {!readOnly && isDone && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={`More actions for ${task.title}`}
                    disabled={isLoading}
                  >
                    <EllipsisVertical />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-42">
                  {/* Reopen only. A finished step never goes straight to
                      skipped - the server refuses that edge, and "I have done
                      this, set it aside" is not a thing a school means to say. */}
                  <DropdownMenuItem
                    onClick={() =>
                      run("IN_PROGRESS", `${task.title} reopened`)
                    }
                  >
                    Reopen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
