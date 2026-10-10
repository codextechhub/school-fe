/**
 * Auth-gated media fetching. The backend serves /media/ behind JWT auth
 * (core.views.MediaView), so a plain <img src> gets 401 - the browser sends no
 * Authorization header. This endpoint fetches the bytes through RTK Query (whose
 * prepareHeaders attaches the JWT), turns them into a local blob: URL, and caches
 * it. Any image component (the school logo, favicon, …) renders the returned
 * blob URL instead of the raw /media/ URL.
 */

import { baseApi } from "./base-api";
import { buildAttachmentUrl } from "@/utils/attachment-download";

export const mediaApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    fetchAuthMedia: builder.query<string, string>({
      // A picture that will not load is decoration failing, not an action the
      // caller can retry: a school whose crest file is missing from storage got
      // "Resource not found." on top of every screen the crest appears on, once
      // per render. The image just does not draw.
      extraOptions: { silent: true },
      // Media paths resolve at the host root, outside the API prefix.
      queryFn: async (mediaUrl, _api, _extra, baseQuery) => {
        const result = await baseQuery({
          url: new URL(buildAttachmentUrl(mediaUrl), window.location.origin).href,
          // Only a successful body is bytes. Reading an ERROR body as a Blob
          // put a Blob in `error.data`, and redux's serializable check then
          // logged a wall of warnings for a single missing file - noise that
          // buries whatever real error is on the same screen.
          responseHandler: async (r) => (r.ok ? r.blob() : r.text()),
        });
        if ("error" in result && result.error) return { error: result.error };
        return { data: URL.createObjectURL(result.data as Blob) };
      },
      keepUnusedDataFor: 3600,
      providesTags: (_result, _error, mediaUrl) => [
        { type: "AuthMedia", id: mediaUrl },
      ],
    }),
  }),
});

export const { useFetchAuthMediaQuery, useLazyFetchAuthMediaQuery } = mediaApi;
