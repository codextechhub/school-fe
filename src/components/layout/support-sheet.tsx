import { useMemo, useState } from "react";
import { ArrowLeft, BookOpenText, ChevronRight, Headset, PlayCircle, Wrench } from "lucide-react";
import { Link, useLocation } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  SupportTicketForm,
  type EscalationPrefill,
} from "@/components/custom/support-ticket-form";
import {
  contextualGuideContext,
  findWalkthrough,
  GUIDE_CATEGORIES,
  useGuideReader,
  useGuideRegistry,
  useWalkthrough,
  type GuideRecord,
} from "@/features/guides";
import { routesPath } from "@/routes/routesPath";

/**
 * The header's headset, as console-fe does it: a panel anchored under the
 * button, not a page and not a full-height side sheet.
 *
 * Why anchored rather than centred or full-height. Somebody raises a ticket
 * because a screen is not doing what they expect, so the screen has to stay
 * visible while they describe it. A modal in the middle of the viewport covers
 * exactly the thing they are writing about; navigating away loses it entirely
 * along with anything half-typed. This sits in the corner it was opened from
 * and leaves the rest of the page where it was.
 *
 * On a phone there is no corner to anchor to, so it takes the bottom of the
 * screen instead - reachable by thumb, and still not covering the whole page.
 *
 * The guides written for the screen underneath are one click below the form,
 * never in front of it: the reader came to raise a ticket, and a count ("3
 * guides for this page") is reason enough to look without standing in the
 * way. Switching to them keeps the form's typing, because the form stays
 * mounted underneath. A walkthrough started from here closes the panel
 * first, so the tour points at the screen and not at the panel over it. Guide
 * titles are listed in the school's word, from `useGuideRegistry`.
 */
export function SupportSheet({
  open,
  onOpenChange,
  prefill,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** What the screen that opened it already knows. */
  prefill?: EscalationPrefill;
}) {
  const [view, setView] = useState<"ticket" | "guides">("ticket");
  const { pathname } = useLocation();
  const reader = useGuideReader();
  const registry = useGuideRegistry();
  const page = useMemo(
    () => contextualGuideContext(registry, pathname, reader),
    [registry, pathname, reader],
  );
  const guideCount = page.guides.length + page.troubleshooting.length;
  const walkthroughs = page.walkthroughs.filter(
    (guide) => guide.walkthroughId && findWalkthrough(guide.walkthroughId),
  );
  const { start: startWalkthrough } = useWalkthrough();
  const close = () => onOpenChange(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setView("ticket");
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="left-3 right-3 top-auto bottom-3 max-h-[calc(100dvh-1.5rem)] w-auto max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto overscroll-contain rounded-3xl border-white bg-white p-0 shadow-[0_24px_80px_rgba(15,23,42,.24)] sm:bottom-auto sm:left-auto sm:right-6 sm:top-[72px] sm:h-auto sm:max-h-[calc(100dvh-96px)] sm:w-[430px] sm:max-w-[calc(100vw-3rem)]"
        showCloseButton
      >
        <DialogHeader className="relative border-b border-border px-5 pb-4 pt-5 pr-12 text-left">
          <div className="mb-2 grid size-9 place-items-center rounded-xl border border-border bg-white text-primary shadow-sm">
            {view === "ticket" ? <Headset className="size-4.5 stroke-[2.15]" /> : <BookOpenText className="size-4.5" />}
          </div>
          <DialogTitle className="text-base font-mont">
            {view === "ticket" ? "How can we help?" : "Guides for this page"}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-gray-01 text-pretty">
            {view === "ticket"
              ? "Create a ticket without leaving your work."
              : `Guidance matched to ${page.productArea}.`}
          </DialogDescription>
        </DialogHeader>

        <div className={view === "ticket" ? "min-w-0 px-5 py-4" : "hidden"}>
          <SupportTicketForm
            // Keyed on the prefill so opening it a second time with different
            // context rebuilds the form rather than showing the last one's
            // values. Formik only reads initialValues once.
            key={JSON.stringify(prefill ?? {})}
            prefill={prefill}
            compact
            onCancel={close}
            cancelLabel="Close"
            onDone={close}
            doneLabel="Done"
          />
        </div>

        {view === "guides" && (
          <div className="min-w-0 space-y-5 px-5 py-4">
            {page.guides.length > 0 ? (
              <GuideList heading="For this screen" guides={page.guides} onOpen={close} />
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-6 text-center">
                <BookOpenText className="mx-auto size-7 text-gray-300" />
                <p className="mt-3 text-sm font-semibold">No guide for this screen yet</p>
                <p className="mt-1 text-xs leading-5 text-gray-01">Browse all guides, or tell us what you need from this screen.</p>
              </div>
            )}
            {walkthroughs.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-01">Show me on this screen</h2>
                <div className="mt-2 space-y-2">
                  {walkthroughs.map((guide) => (
                    <button
                      key={guide.id}
                      type="button"
                      onClick={() => {
                        close();
                        window.setTimeout(() => startWalkthrough(guide.walkthroughId!), 350);
                      }}
                      className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-gray-200 p-3 text-left text-sm font-medium transition hover:border-primary/30 hover:bg-primary/[0.025]"
                    >
                      <PlayCircle className="size-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1">{guide.title}</span>
                      <ChevronRight className="size-4 shrink-0 text-gray-300" />
                    </button>
                  ))}
                </div>
              </section>
            )}
            {page.troubleshooting.length > 0 && (
              <GuideList heading="If something goes wrong" guides={page.troubleshooting} onOpen={close} troubleshooting />
            )}
            <Button asChild variant="outline" className="w-full">
              <Link to={routesPath.PROTECTED.SUPPORT.GUIDES} onClick={close}>Browse all guides</Link>
            </Button>
          </div>
        )}

        <div data-guide="support-sheet.guides" className="flex items-center border-t border-border px-5 py-3">
          <button
            type="button"
            // Keeps focus in the form: a blur would show its required-field
            // message and move this button out from under the click.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setView(view === "ticket" ? "guides" : "ticket")}
            className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs font-medium text-primary transition hover:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20"
          >
            {view === "ticket" ? (
              <>
                <BookOpenText className="size-3.5" />
                {guideCount > 0
                  ? `${guideCount} guide${guideCount === 1 ? "" : "s"} for this page`
                  : "Guides for this page"}
              </>
            ) : (
              <>
                <ArrowLeft className="size-3.5" /> Back to your ticket
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GuideList({
  heading,
  guides,
  onOpen,
  troubleshooting = false,
}: {
  heading: string;
  guides: GuideRecord[];
  onOpen: () => void;
  troubleshooting?: boolean;
}) {
  const Icon = troubleshooting ? Wrench : BookOpenText;
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-01">{heading}</h2>
      <div className="mt-2 space-y-2">
        {guides.map((guide) => (
          <Link
            key={guide.id}
            to={routesPath.PROTECTED.SUPPORT.GUIDE_DETAIL_SLUG(guide.slug)}
            onClick={onOpen}
            className="flex min-w-0 items-start gap-3 rounded-xl border border-gray-200 p-3 transition hover:border-primary/30 hover:bg-primary/[0.025]"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/8 text-primary"><Icon className="size-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{guide.title}</span>
              <span className="mt-0.5 block text-xs leading-5 text-gray-01">
                {GUIDE_CATEGORIES.find((item) => item.id === guide.category)?.title}
              </span>
            </span>
            <ChevronRight className="mt-2 size-4 shrink-0 text-gray-300" />
          </Link>
        ))}
      </div>
    </section>
  );
}
