import { configureStore } from "@reduxjs/toolkit";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

import { baseApi } from "../base-api";
import { mediaApi } from "../media-api";
import { staffApi } from "./staff-api";

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("staff photograph cache", () => {
  it("fetches new bytes when an upload keeps the same media path", async () => {
    const photoUrl = "/media/staff/17/photo.jpg";
    let mediaReads = 0;
    const NativeUrl = URL;
    class TestUrl extends NativeUrl {
      static createObjectURL() {
        return `blob:photo-${mediaReads}`;
      }
    }
    vi.stubGlobal("URL", TestUrl);
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      if (request.url.includes(photoUrl)) {
        mediaReads += 1;
        return new Response(new Blob([`photo-${mediaReads}`]), { status: 200 });
      }
      if (request.url.includes("/i/me/staff/17/") && request.method === "PATCH") {
        return new Response(JSON.stringify({
          success: true,
          message: "Photograph saved.",
          data: { id: 17, photo_url: photoUrl },
        }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      throw new Error(`Unexpected request: ${request.method} ${request.url}`);
    }));

    const store = makeStore();
    const photo = store.dispatch(mediaApi.endpoints.fetchAuthMedia.initiate(photoUrl));
    expect(await photo.unwrap()).toBe("blob:photo-1");

    const body = new FormData();
    body.append("photo", new Blob(["replacement"]), "replacement.jpg");
    await store.dispatch(staffApi.endpoints.updateStaff.initiate({ id: 17, body })).unwrap();

    await vi.waitFor(() => {
      expect(mediaReads).toBe(2);
      expect(
        mediaApi.endpoints.fetchAuthMedia.select(photoUrl)(store.getState()).data,
      ).toBe("blob:photo-2");
    });

    photo.unsubscribe();
  });
});
