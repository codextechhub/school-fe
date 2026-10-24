import { generateQueryString } from "@/utils/helpers";
import { baseApi } from "../base-api";
import type { Envelope } from "../onboarding/onboarding-types";
import type {
  ExportConfig,
  FromScreen,
  QuickExportResult,
} from "./exports-types";

export const exportsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Translate a list screen's filters into a runnable export.
     *
     * A GET, and nothing is produced by it: it comes back with the config, an
     * estimate, and the filters it could NOT carry. The screen shows that
     * before offering to run anything.
     *
     * `entity` is required for an entity-scoped dataset (every Finance and
     * Procurement screen): the server resolves the set of books before it can
     * estimate, so without it the call is a 400. It is set last so a screen
     * filter can never shadow it.
     */
    exportFromScreen: builder.query<
      Envelope<FromScreen>,
      {
        screen: string;
        params?: Record<string, string | number | undefined>;
        entity?: string;
      }
    >({
      query: ({ screen, params, entity }) => ({
        url: `/exports/from-screen/`,
        method: "GET",
        params: {
          screen,
          ...Object.fromEntries(
            Object.entries(params ?? {}).filter(
              ([, v]) => v !== undefined && v !== "" && v !== "all",
            ),
          ),
          ...(entity ? { entity } : {}),
        },
      }),
    }),

    /**
     * Run a configuration that was never saved.
     *
     * `sync` is a HINT. The server re-runs its own estimate and decides whether
     * to produce the file inline or queue it, because an inline run holds a web
     * worker for its whole duration and the drawer's claim that a file is small
     * is not an authorisation.
     *
     * `silent`: the caller says what failed. The Export Centre also defines
     * `runQuickExport` (`dashboard/exports-api.ts`) on the same api, silent,
     * and whichever module loads first supplies the one definition both hooks
     * use, so the two must agree on who reports a failure, and on where
     * `entity` goes: in the query string, never the body, which the server
     * does not read for scope.
     */
    runQuickExport: builder.mutation<
      Envelope<QuickExportResult>,
      ExportConfig & { sync?: boolean; entity?: string }
    >({
      query: ({ entity, ...body }) => ({
        url: `/exports/quick/${generateQueryString(entity ? { entity } : {})}`,
        method: "POST",
        body,
      }),
      extraOptions: { silent: true },
    }),
  }),
});

export const { useLazyExportFromScreenQuery, useRunQuickExportMutation } =
  exportsApi;
