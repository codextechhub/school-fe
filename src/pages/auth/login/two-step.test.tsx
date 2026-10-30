import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The second step of a sign-in, at Meridian Crest.
 *
 * Nneka Okafor runs the school, so after her password the server asks for a
 * code from her authenticator app, or, the first time, for her to set one up.
 * Driven through the real base query against a stubbed server.
 */

const toastSpies = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  message: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: toastSpies }));
vi.mock("@/routes", () => ({ router: { navigate: vi.fn() } }));

import { baseApi, isAuthRoute } from "@/redux/services/base-api";
import { AUTH_ENDPOINTS } from "@/redux/services/api-endpoints";
import { authSliceReducer } from "@/redux/features/auth/auth-slice";
import { getAccessToken } from "@/utils/access-token";
import type { TwoStepChallenge } from "@/redux/services/auth/auth-types";
import { TwoStepStep } from "./two-step";
import { twoStepChallengeOf } from "./two-step-challenge";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Reply = { status: number; body: unknown };
const replies: Record<string, Reply> = {};
const sent: Array<{ path: string; body: unknown }> = [];

const SIGNED_IN = {
  success: true,
  message: "Login successful.",
  data: {
    access: "access-after-code",
    session_id: 9,
    user: { id: 4, email: "nneka@meridian.test" },
    permissions: [],
    school: null,
    tenant: { slug: "meridian", kind: "SCHOOL", status: "ACTIVE" },
  },
};

const fetchMock = vi.fn(async (input: Request) => {
  const { pathname } = new URL(input.url);
  const body = input.method === "POST" ? await input.json() : undefined;
  sent.push({ path: pathname, body });
  const key = Object.keys(replies).find((path) => pathname.endsWith(path));
  const reply = key ? replies[key] : { status: 200, body: { success: true, message: "", data: {} } };
  return new Response(JSON.stringify(reply.body), {
    status: reply.status,
    headers: { "content-type": "application/json" },
  });
});

const refusal = (code: string, detail = "Refused."): Reply => ({
  status: 400,
  body: { success: false, message: detail, error: { code, detail } },
});

const challenge = (code: TwoStepChallenge["code"]): TwoStepChallenge => ({
  code,
  detail: "",
  challenge: "ts_abc",
  expires_in: 600,
});

let container: HTMLDivElement;
let root: Root;
const onSignedIn = vi.fn();
const onStartAgain = vi.fn();

async function settle() {
  for (let i = 0; i < 6; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

async function show(step: TwoStepChallenge) {
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authSliceReducer },
    middleware: (getDefault) => getDefault({ serializableCheck: false }).concat(baseApi.middleware),
  });
  await act(async () => {
    root.render(
      <Provider store={store}>
        <MemoryRouter>
          <TwoStepStep challenge={step} onSignedIn={onSignedIn} onStartAgain={onStartAgain} />
        </MemoryRouter>
      </Provider>,
    );
  });
  await settle();
}

const typeInto = async (field: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  await act(async () => {
    setter.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const codeBox = () => container.querySelector<HTMLInputElement>('input[autocomplete="one-time-code"]')!;
const button = (label: string) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent?.includes(label))!;
const click = async (label: string) => {
  await act(async () => button(label).click());
  await settle();
};

beforeEach(() => {
  for (const key of Object.keys(replies)) delete replies[key];
  sent.length = 0;
  onSignedIn.mockClear();
  onStartAgain.mockClear();
  document.cookie = "csrftoken=abc; path=/";
  vi.stubGlobal("fetch", fetchMock);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  fetchMock.mockClear();
  vi.unstubAllGlobals();
});

describe("reading the refusal", () => {
  it("finds the challenge in a refusal that asks for a code, and in no other", () => {
    const asked = { status: 403, data: { error: { code: "TWO_STEP_REQUIRED", challenge: "ts_x", detail: "", expires_in: 600 } } };
    expect(twoStepChallengeOf(asked)?.challenge).toBe("ts_x");
    expect(twoStepChallengeOf({ status: 401, data: { error: { code: "INVALID_CREDENTIALS" } } })).toBeNull();
    expect(twoStepChallengeOf(undefined)).toBeNull();
  });

  it("keeps the code step's addresses out of the session renewal and its token", () => {
    expect(isAuthRoute("/user/auth/two-step/verify/")).toBe(true);
    expect(isAuthRoute({ url: "/user/auth/two-step/set-up/confirm/" })).toBe(true);
    for (const name of ["twoStepVerify", "twoStepSetUp", "twoStepConfirm"]) {
      expect(AUTH_ENDPOINTS.has(name)).toBe(true);
    }
  });
});

describe("entering a code", () => {
  it("sends the six digits with the challenge, and signs in", async () => {
    replies["/two-step/verify/"] = { status: 200, body: SIGNED_IN };
    await show(challenge("TWO_STEP_REQUIRED"));

    await typeInto(codeBox(), "123456");
    await settle();

    expect(sent.find((call) => call.path.endsWith("/two-step/verify/"))?.body).toEqual({
      challenge: "ts_abc",
      code: "123456",
    });
    expect(onSignedIn).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe("access-after-code");
  });

  it("says so under the boxes when the code is wrong, with no toast", async () => {
    replies["/two-step/verify/"] = refusal("TWO_STEP_CODE_INVALID");
    await show(challenge("TWO_STEP_REQUIRED"));

    await typeInto(codeBox(), "000000");
    await settle();

    expect(container.querySelector('[role="alert"]')?.textContent).toContain("That code is not right");
    expect(onSignedIn).not.toHaveBeenCalled();
    expect(toastSpies.error).not.toHaveBeenCalled();
  });

  it("goes back to the password once the challenge is spent", async () => {
    replies["/two-step/verify/"] = refusal("TWO_STEP_CHALLENGE_INVALID");
    await show(challenge("TWO_STEP_REQUIRED"));

    await typeInto(codeBox(), "000000");
    await settle();

    expect(onStartAgain).toHaveBeenCalledWith(expect.stringContaining("expired"));
  });

  it("takes a backup code instead", async () => {
    replies["/two-step/verify/"] = { status: 200, body: SIGNED_IN };
    await show(challenge("TWO_STEP_REQUIRED"));

    await click("Use a backup code");
    await typeInto(container.querySelector<HTMLInputElement>("#backup-code")!, "3f9a2-7c1e0");
    await click("Verify");

    expect(sent.find((call) => call.path.endsWith("/two-step/verify/"))?.body).toEqual({
      challenge: "ts_abc",
      recovery_code: "3f9a2-7c1e0",
    });
    expect(onSignedIn).toHaveBeenCalledTimes(1);
  });
});

describe("setting up for the first time", () => {
  beforeEach(() => {
    replies["/two-step/set-up/"] = {
      status: 200,
      body: {
        success: true,
        message: "",
        data: {
          secret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
          otpauth_uri: "otpauth://totp/Meridian:nneka@meridian.test?secret=JBSWY3DPEHPK3PXP",
          issuer: "Meridian Crest",
          account: "nneka@meridian.test",
        },
      },
    };
    replies["/two-step/set-up/confirm/"] = {
      status: 200,
      body: { ...SIGNED_IN, data: { ...SIGNED_IN.data, recovery_codes: ["aaaaa-11111", "bbbbb-22222"] } },
    };
  });

  it("shows the QR code and the key, once", async () => {
    await show(challenge("TWO_STEP_SET_UP_REQUIRED"));

    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.textContent).toContain("JBSW Y3DP EHPK 3PXP");
    expect(sent.filter((call) => call.path.endsWith("/two-step/set-up/"))).toHaveLength(1);
  });

  it("shows the backup codes and opens the app only once they are saved", async () => {
    await show(challenge("TWO_STEP_SET_UP_REQUIRED"));
    await typeInto(codeBox(), "654321");
    await settle();

    expect(sent.find((call) => call.path.endsWith("/two-step/set-up/confirm/"))?.body).toEqual({
      challenge: "ts_abc",
      code: "654321",
    });
    expect(container.textContent).toContain("aaaaa-11111");
    expect(button("Continue").disabled).toBe(true);
    expect(onSignedIn).not.toHaveBeenCalled();

    await act(async () => container.querySelector<HTMLButtonElement>('button[role="checkbox"]')!.click());
    await click("Continue");

    expect(onSignedIn).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe("access-after-code");
  });
});
