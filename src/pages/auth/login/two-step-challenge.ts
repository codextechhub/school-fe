import type { TwoStepChallenge } from "@/redux/services/auth/auth-types";

const ASKING_CODES = new Set(["TWO_STEP_REQUIRED", "TWO_STEP_SET_UP_REQUIRED"]);

/** The challenge a refused sign-in carries when it wants a two-step code, or null. */
export function twoStepChallengeOf(error: unknown): TwoStepChallenge | null {
  const body = (error as { data?: { error?: Partial<TwoStepChallenge> } })?.data?.error;
  if (!body || !ASKING_CODES.has(String(body.code)) || typeof body.challenge !== "string") {
    return null;
  }
  return body as TwoStepChallenge;
}
