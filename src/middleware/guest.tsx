import { Navigate, Outlet } from "react-router";
import { routesPath } from "@/routes/routesPath";
import { hasLiveSession } from "@/utils/session-gate";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import {
  isSessionRestoreBlocked,
  refreshTokenSingleFlight,
} from "@/utils/token-refresh";
import { setSessionId } from "@/redux/features/auth/auth-slice";

/**
 * Guest-only gate for the sign-in page. A user who already has a live session
 * shouldn't see the login form - e.g. by pressing Back after signing in - so
 * bounce them into the app. Uses the same session check as the Authenticated
 * gate, so the two can never disagree.
 */
export default function Guest() {
  const dispatch = useDispatch();
  const [sessionFound, setSessionFound] = useState(hasLiveSession);
  const [checking, setChecking] = useState(
    () => !sessionFound && !isSessionRestoreBlocked(),
  );

  useEffect(() => {
    if (!checking) return;
    let cancelled = false;
    void refreshTokenSingleFlight().then((outcome) => {
      if (cancelled) return;
      if (outcome.ok) {
        if (outcome.sessionId) dispatch(setSessionId(outcome.sessionId));
        setSessionFound(true);
      }
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [checking, dispatch]);

  if (sessionFound) {
    return <Navigate to={routesPath.PROTECTED.OVERVIEW.INDEX} replace />;
  }
  if (checking) return null;
  return <Outlet />;
}
