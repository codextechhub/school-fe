import { useNavigate } from "react-router";
import { useLogoutMutation } from "@/redux/services/auth/auth-api";
import { useAppDispatch } from "@/redux/store";
import { resetAuth } from "@/redux/features/auth/auth-slice";
import { routesPath } from "@/routes/routesPath";

/**
 * Shared logout flow. Hits the logout mutation, then clears tokens + auth state
 * and redirects to login regardless of outcome. Used by the header avatar menu.
 */
export function useLogout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  const handleLogout = () => {
    logout()
      .unwrap()
      .then(() => {
        navigate(routesPath.AUTH.LOGIN, { replace: true });
      })
      .catch((error) => {
        if (import.meta.env.DEV) console.error("Logout failed:", error);
      })
      .finally(() => {
        navigate(routesPath.AUTH.LOGIN, { replace: true });
        dispatch(resetAuth());
      });
  };

  return { handleLogout, isLoggingOut };
}
