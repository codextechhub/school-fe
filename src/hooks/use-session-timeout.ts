import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { resetAuth } from "@/redux/features/auth/auth-slice";
import { routesPath } from "@/routes/routesPath";
import { refreshTokenSingleFlight } from "@/utils/token-refresh";
import { recordActivity } from "@/utils/session-activity";
import { endSession } from "@/utils/end-session";
import { getCsrfToken } from "@/utils/csrf";

const BASE_URL = import.meta.env.VITE_BACKEND_URL as string;

// Fire-and-forget revocation keeps local timeout handling independent of the
// network while allowing the server to clear and blacklist its HttpOnly cookie.
function revokeSessionOnBackend(): void {
  void getCsrfToken().then((csrfToken) => fetch(`${BASE_URL}/user/auth/logout/`, {
    method: "POST",
    credentials: "include",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body: "{}",
  })).catch(() => {});
}

// Exported: the Authenticated gate derives its on-reload staleness window
// (IDLE_MS + WARNING_MS) from these so the two can never drift apart.
export const IDLE_MS = 5 * 60 * 1000;       // 5 minutes idle before warning
export const WARNING_MS = 10 * 60 * 1000;   // 10-minute countdown before expiry

/**
 * NOTE: window "focus" is deliberately NOT an activity event. Returning to the
 * tab must first be judged against the wall clock (catchUp below) - treating
 * the regained focus itself as activity would stamp lastActivity = now and
 * silently erase a long absence before the idle check could run.
 */
const ACTIVITY_EVENTS = [
  "mousemove",
  "keydown",
  "click",
  "scroll",
  "touchstart",
  "wheel",
  "pointerdown",
] as const;

export function useSessionTimeout() {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_MS / 1000);
  const [isExpired, setIsExpired] = useState(false);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Timestamps tracked on refs so closures always read the latest value.
  // Initialised to 0 (not Date.now() - impure during render); the mount
  // effect's resetIdleTimer() call stamps it before anything reads it.
  const lastActivityRef = useRef<number>(0);
  const warningStartedAtRef = useRef<number | null>(null);
  const isWarningOpenRef = useRef(false);

  const clearCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const expireSession = useCallback(() => {
    clearCountdown();
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    revokeSessionOnBackend();
    endSession("Your session has expired due to inactivity. Please log in to continue.");
    dispatch(resetAuth());
    setOpen(false);
    setIsExpired(true);
  }, [dispatch]);

  const logout = useCallback(() => {
    clearCountdown();
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    revokeSessionOnBackend();
    endSession();
    dispatch(resetAuth());
    window.location.href = routesPath.AUTH.LOGIN;
  }, [dispatch]);

  // Starts (or resumes) the visible countdown from a given wall-clock start time.
  const startCountdown = useCallback(
    (warningStartedAt: number) => {
      warningStartedAtRef.current = warningStartedAt;
      isWarningOpenRef.current = true;
      setOpen(true);
      clearCountdown();

      // Tick every 500 ms but derive remaining time from the wall clock so
      // background throttling never causes drift.
      countdownRef.current = setInterval(() => {
        const elapsed = Date.now() - (warningStartedAtRef.current ?? Date.now());
        const remaining = Math.max(0, WARNING_MS - elapsed);
        setSecondsLeft(Math.ceil(remaining / 1000));
        if (remaining <= 0) expireSession();
      }, 500);
    },
    [expireSession],
  );

  const resetIdleTimer = useCallback(() => {
    if (isWarningOpenRef.current) return; // don't reset while warning is visible
    lastActivityRef.current = Date.now();
    recordActivity();
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    // Derive the warning start from lastActivity, not the firing time: browsers
    // throttle/suspend background timers, so this timeout can fire arbitrarily
    // late - the countdown must still measure from the true idle deadline.
    idleTimerRef.current = setTimeout(
      () => startCountdown(lastActivityRef.current + IDLE_MS),
      IDLE_MS,
    );
  }, [startCountdown]);

  // Wall-clock catch-up, run on EVERY wake-up signal (activity event, window
  // focus, visibilitychange). Timers can be suspended for the entire absence -
  // system sleep, display sleep, Chrome tab freezing - so no timer may have
  // fired before the user physically returns. Whichever signal lands first
  // must judge the absence from lastActivity before anything resets it.
  // Returns false when the idle threshold was crossed (warning/expiry shown).
  const catchUp = useCallback((): boolean => {
    const now = Date.now();

    if (isWarningOpenRef.current && warningStartedAtRef.current) {
      // Warning already open - just verify it hasn't expired while suspended.
      if (now - warningStartedAtRef.current >= WARNING_MS) expireSession();
      return false;
    }

    const idleElapsed = now - lastActivityRef.current;
    if (lastActivityRef.current && idleElapsed >= IDLE_MS + WARNING_MS) {
      // Fully expired while away.
      expireSession();
      return false;
    }
    if (lastActivityRef.current && idleElapsed >= IDLE_MS) {
      // Crossed idle threshold while away - start countdown at the correct offset.
      startCountdown(lastActivityRef.current + IDLE_MS);
      return false;
    }
    return true;
  }, [expireSession, startCountdown]);

  // Wire up activity listeners. mousemove/scroll fire continuously, so the
  // timer reset is throttled - clearTimeout/setTimeout per event would churn
  // the event loop for no behavioural gain at this resolution.
  useEffect(() => {
    let lastReset = 0;
    const handleActivity = () => {
      const t = Date.now();
      if (t - lastReset < 1_000) return;
      lastReset = t;
      // The first event after a long absence is the user *returning*, not
      // activity - catch up first; only reset when still inside the window.
      if (catchUp()) resetIdleTimer();
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, handleActivity));
    resetIdleTimer();
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, handleActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      clearCountdown();
    };
  }, [catchUp, resetIdleTimer]);

  // Catch up when the tab becomes visible again, AND on window focus - an
  // app-switch (Cmd+Tab) can return the user without any visibilitychange
  // when the tab stayed nominally visible the whole time.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) return;
      if (catchUp()) resetIdleTimer();
    };
    const onFocus = () => {
      if (catchUp()) resetIdleTimer();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [catchUp, resetIdleTimer]);

  const onContinue = useCallback(async () => {
    clearCountdown();

    // Dismiss the modal immediately - don't wait for the network round-trip.
    warningStartedAtRef.current = null;
    isWarningOpenRef.current = false;
    setOpen(false);
    resetIdleTimer();

    const outcome = await refreshTokenSingleFlight();

    if (outcome.ok) return;

    if (outcome.reason === "token_invalid") {
      logout();
      return;
    }
    // transient error - user stays signed in; next 401 will retry the refresh
  }, [logout, resetIdleTimer]);

  const goToLogin = useCallback(() => {
    // Retry revocation in case the expiry-time request hit a transient failure.
    revokeSessionOnBackend();
    window.location.href = routesPath.AUTH.LOGIN;
  }, []);

  return { open, secondsLeft, isExpired, onContinue, onLogout: logout, goToLogin };
}
