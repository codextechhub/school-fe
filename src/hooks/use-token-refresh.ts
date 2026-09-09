import { useEffect } from "react";
import { useLocation } from "react-router";
import { useDispatch } from "react-redux";
import { resetAuth } from "@/redux/features/auth/auth-slice";
import { routesPath } from "@/routes/routesPath";
import { refreshTokenSingleFlight } from "@/utils/token-refresh";
import { isJwtExpired } from "@/utils/jwt";
import { endSession } from "@/utils/end-session";
import { getAccessToken } from "@/utils/access-token";

const REFRESH_BUFFER_SECONDS = 120; // refresh if token expires within 2 minutes

export function useTokenRefresh() {
  const location = useLocation();
  const dispatch = useDispatch();

  useEffect(() => {
    const accessToken = getAccessToken();
    if (!accessToken) return;
    if (!isJwtExpired(accessToken, REFRESH_BUFFER_SECONDS)) return;

    let cancelled = false;
    (async () => {
      const outcome = await refreshTokenSingleFlight();
      if (cancelled) return;

      if (outcome.ok) {
        return;
      }

      // Only force-logout when the server says the refresh token is invalid.
      // Transient errors (5xx, network, no_token) leave the user signed in;
      // the next protected API call will retry via baseApi's 401 handler.
      if (outcome.reason === "token_invalid") {
        dispatch(resetAuth());
        endSession("Your session has expired. Please log in to continue.");
        window.location.href = routesPath.AUTH.LOGIN;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, dispatch]);
}
