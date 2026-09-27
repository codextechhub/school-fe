import { baseApi } from "../base-api";

/**
 * How the how-to guides are used, recorded at /v1/support/guides/analytics/.
 *
 * The contract is closed: an event carries its name, the guide or walkthrough
 * id, and an outcome, and nothing about who read it or which school they are
 * in. A search with no result carries the words typed and the route pattern,
 * never the address, so no record id travels with it.
 *
 * `silent`, because telemetry must never interrupt the reader. A failed event
 * costs a data point; a toast about it would cost the reader's attention on a
 * screen they came to for help.
 */
export type GuideAnalyticsEvent =
  | { name: "guide.viewed" | "guide.completed" | "guide.outdated_reported"; guide_id: string }
  | { name: "guide.helpful_voted"; guide_id: string; outcome: "helpful" | "not_helpful" }
  | {
      name: "walkthrough.exited";
      guide_id: string;
      walkthrough_id: string;
      step_id: string;
      outcome: "finished" | "paused" | "target_unavailable";
    }
  | {
      name: "search.no_results";
      query: string;
      route_pattern?: string;
      result_count: 0;
    };

export const guideAnalyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    recordGuideAnalytics: builder.mutation<{ data: { accepted: boolean } }, GuideAnalyticsEvent>({
      query: (body) => ({
        url: "/support/guides/analytics/events/",
        method: "POST",
        body,
      }),
      extraOptions: { silent: true },
    }),
  }),
});

export const { useRecordGuideAnalyticsMutation } = guideAnalyticsApi;
