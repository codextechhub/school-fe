import { createElement, lazy, Suspense, useEffect, useLayoutEffect, useState, type MouseEvent } from "react";
import { ArrowRight, BookOpenText, Check, CheckCircle2, Clock3, ExternalLink, Flag, Loader2, PlayCircle, ThumbsDown, ThumbsUp } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router";

import PageAccessDenied from "@/components/custom/page-access-denied";
import { PageShell } from "@/components/layout/page-shell";
import { requestSupportOpen } from "@/components/layout/support-open";
import { Button } from "@/components/ui/button";
import { GUIDE_CATEGORIES, GUIDE_REGISTRY, canDiscoverGuide, findWalkthrough, useGuideReader, useWalkthrough } from "@/features/guides";
import { resetGuideArticleScroll, scrollToGuideSection } from "@/features/guides/article-navigation";
import { useRecordGuideAnalyticsMutation } from "@/redux/services/support/guide-analytics-api";
import { routesPath } from "@/routes/routesPath";

const GUIDE_ARTICLES = new Map(
  GUIDE_REGISTRY
    .filter((guide) => guide.status === "published" && guide.article)
    .map((guide) => [guide.slug, lazy(guide.article!)] as const),
);

/**
 * One how-to guide.
 *
 * The article body is its own chunk, loaded when the guide is opened, so the
 * registry can grow without the guides home growing with it.
 *
 * A guide the reader may not open is refused the same way a screen is, even
 * though its address can be typed: the guide describes work gated on the same
 * permission, and a list of steps for work somebody cannot do is not help.
 *
 * "Report an outdated guide" opens the support panel over the article with the
 * guide already named, so the reader can say what no longer matches while it
 * is still on screen.
 *
 * `?walkthrough=start` starts the guide's walkthrough on arrival, which is how
 * a link elsewhere can offer "show me" rather than "read about it".
 */
export default function GuideArticlePage() {
  const { slug = "" } = useParams();
  const reader = useGuideReader();
  const guide = GUIDE_REGISTRY.find((candidate) => candidate.slug === slug);
  // Keyed by slug, so moving to another article starts its answers afresh.
  const [answers, setAnswers] = useState<{ slug: string; feedback?: "yes" | "no"; completed?: boolean }>({ slug });
  const current = answers.slug === slug ? answers : { slug };
  const feedback = current.feedback ?? null;
  const completed = current.completed ?? false;
  const setFeedback = (value: "yes" | "no") => setAnswers({ ...current, feedback: value });
  const setCompleted = () => setAnswers({ ...current, completed: true });
  const Article = GUIDE_ARTICLES.get(slug);
  const [recordAnalytics] = useRecordGuideAnalyticsMutation();
  const [searchParams] = useSearchParams();
  const { start: startWalkthrough } = useWalkthrough();
  const permitted = !!guide && canDiscoverGuide(guide, reader);
  const walkthroughId = guide?.walkthroughId && findWalkthrough(guide.walkthroughId)
    ? guide.walkthroughId
    : undefined;

  useLayoutEffect(() => {
    resetGuideArticleScroll();
  }, [slug]);

  useEffect(() => {
    if (!walkthroughId || !permitted || searchParams.get("walkthrough") !== "start") return;
    const timeout = window.setTimeout(() => startWalkthrough(walkthroughId), 0);
    return () => window.clearTimeout(timeout);
  }, [permitted, searchParams, startWalkthrough, walkthroughId]);

  useEffect(() => {
    if (!guide || guide.status !== "published" || !permitted) return;
    void recordAnalytics({ name: "guide.viewed", guide_id: guide.id });
  }, [guide, permitted, recordAnalytics]);

  if (!guide || guide.status === "retired") return <GuideUnavailable title="Guide not found" message="This guide does not exist or has been retired." />;
  if (!permitted) return <PageAccessDenied />;
  if (guide.status !== "published" || !Article) return <GuideUnavailable title="Guide is being prepared" message="This guide is planned but not published yet." />;

  const category = GUIDE_CATEGORIES.find((candidate) => candidate.id === guide.category);
  const related = GUIDE_REGISTRY.filter((candidate) => (
    candidate.status === "published"
    && guide.relatedGuideIds?.includes(candidate.id)
    && canDiscoverGuide(candidate, reader)
  ));

  return (
    <PageShell className="gap-6 text-black-01 lg:grid-cols-[minmax(0,1fr)_15rem] xl:grid-cols-[minmax(0,1fr)_17rem]" grid>
      <article className="min-w-0">
        <header className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-gray-01"><span>{category?.title}</span><span className="size-1 rounded-full bg-gray-300" /><span>{guide.estimatedMinutes ?? 5} min read</span></div>
          <h1 className="mt-3 max-w-3xl font-mont text-3xl font-semibold tracking-tight sm:text-4xl">{guide.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-01 sm:text-base">{guide.summary}</p>
          {(guide.primaryRoute || walkthroughId) && (
            <div className="mt-5 flex flex-wrap gap-2">
              {guide.primaryRoute && <Button asChild><Link to={guide.primaryRoute}>Open this screen <ExternalLink className="size-4" /></Link></Button>}
              {walkthroughId && <Button variant="outline" onClick={() => startWalkthrough(walkthroughId)}><PlayCircle className="size-4" /> Start walkthrough</Button>}
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-white-02 pt-4 text-xs text-gray-01"><span>Owner: {guide.owner}</span><span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" /> Reviewed {guide.reviewedAt}</span></div>
        </header>

        <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
          <Suspense fallback={<div className="grid min-h-80 place-items-center"><Loader2 className="size-5 animate-spin text-primary" /></div>}>{createElement(Article)}</Suspense>
        </div>

        {related.length > 0 && (
          <section className="mt-6">
            <h2 className="font-mont text-lg font-semibold">Related guides</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {related.map((item) => (
                <Link key={item.id} to={routesPath.PROTECTED.SUPPORT.GUIDE_DETAIL_SLUG(item.slug)} className="rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-primary/30">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-gray-01">{item.summary}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex flex-col gap-3 border-b border-white-02 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-semibold">Finished this guide?</p><p className="mt-1 text-xs text-gray-01">Marking it complete shows which guides lead to a finished task.</p></div>
            <Button
              size="sm"
              variant={completed ? "outline" : "default"}
              disabled={completed}
              onClick={() => {
                setCompleted();
                void recordAnalytics({ name: "guide.completed", guide_id: guide.id });
              }}
            >
              <CheckCircle2 className="size-4" /> {completed ? "Completed" : "Mark complete"}
            </Button>
          </div>
          <div className="pt-4">
            {feedback ? (
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700"><Check className="size-4" /> Thank you. Your feedback was noted.</div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-sm font-semibold">Was this guide helpful?</p><p className="mt-1 text-xs text-gray-01">Your answer decides which guides are improved first.</p></div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setFeedback("yes"); void recordAnalytics({ name: "guide.helpful_voted", guide_id: guide.id, outcome: "helpful" }); }}><ThumbsUp className="size-4" /> Yes</Button>
                  <Button size="sm" variant="outline" onClick={() => { setFeedback("no"); void recordAnalytics({ name: "guide.helpful_voted", guide_id: guide.id, outcome: "not_helpful" }); }}><ThumbsDown className="size-4" /> Not yet</Button>
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 border-t border-white-02 pt-4">
            <Button
              variant="ghost"
              size="sm"
              className="px-0 text-gray-01"
              onClick={() => {
                void recordAnalytics({ name: "guide.outdated_reported", guide_id: guide.id });
                requestSupportOpen({
                  title: `Guide out of date: ${guide.title}`,
                  description: "What the guide says, and what the screen does instead:\n\n",
                });
              }}
            >
              <Flag className="size-4" /> Report an outdated guide
            </Button>
          </div>
        </section>
      </article>

      <aside className="min-w-0 lg:order-last">
        <nav aria-label="On this page" className="rounded-2xl border border-gray-200 bg-white p-4 lg:sticky lg:top-22">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-01">On this page</p>
          <ol className="mt-3 space-y-1">
            {guide.sections?.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={(event: MouseEvent<HTMLAnchorElement>) => {
                    event.preventDefault();
                    scrollToGuideSection(section.id);
                  }}
                  className="block rounded-lg px-2 py-2 text-xs leading-5 text-gray-600 hover:bg-primary/5 hover:text-primary"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
          <Button asChild variant="outline" size="sm" className="mt-4 w-full"><Link to={routesPath.PROTECTED.SUPPORT.GUIDES}>Browse guides <ArrowRight className="size-3.5" /></Link></Button>
        </nav>
      </aside>
    </PageShell>
  );
}

function GuideUnavailable({ title, message }: { title: string; message: string }) {
  return (
    <PageShell grid className="min-h-[60vh] place-items-center">
      <div className="max-w-md text-center">
        <BookOpenText className="mx-auto size-9 text-gray-300" />
        <h1 className="mt-4 font-mont text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-gray-01">{message}</p>
        <Button asChild className="mt-5"><Link to={routesPath.PROTECTED.SUPPORT.GUIDES}>Return to all guides</Link></Button>
      </div>
    </PageShell>
  );
}
