import { baseApi } from "./base-api";
import type { Envelope } from "./onboarding/onboarding-types";

/**
 * A person's data request, answered by the school: a copy of everything held
 * about a pupil, guardian or member of staff, or erasing someone who has left.
 *
 * The copy is a JSON file the server builds whole, so the download hands back
 * an object URL rather than parsed data (RTK Query caches what a mutation
 * returns; a Blob in the store trips the serializability check). Both calls
 * are silent: the screen shows the server's own sentence, because a refusal
 * says what to do first ("Withdraw them first").
 */
export type PersonKind = "student" | "guardian" | "staff";

const BASE: Record<PersonKind, string> = {
  student: "/students",
  guardian: "/guardians",
  staff: "/i/me/staff",
};

const TAGS = {
  student: ["Students", "Guardians"],
  guardian: ["Guardians", "Students"],
  staff: ["SchoolStaff"],
} as const;

export interface PersonArg {
  kind: PersonKind;
  id: number;
}

export const personalDataApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    downloadPersonalData: builder.mutation<string, PersonArg>({
      query: ({ kind, id }) => ({
        url: `${BASE[kind]}/${id}/personal-data/`,
        method: "GET",
        // Bytes on success, the parsed envelope on a refusal.
        responseHandler: (response) => (response.ok ? response.blob() : response.json()),
      }),
      transformResponse: (blob: Blob) => URL.createObjectURL(blob),
      extraOptions: { silent: true },
    }),

    erasePersonalData: builder.mutation<Envelope<unknown>, PersonArg & { reason: string }>({
      query: ({ kind, id, reason }) => ({
        url: `${BASE[kind]}/${id}/erase/`,
        method: "POST",
        body: { reason },
      }),
      extraOptions: { silent: true },
      invalidatesTags: (_r, _e, { kind }) => [...TAGS[kind]],
    }),
  }),
});

export const { useDownloadPersonalDataMutation, useErasePersonalDataMutation } = personalDataApi;
