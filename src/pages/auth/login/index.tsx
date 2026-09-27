import { CustomInput } from "@/components/custom/custom-input";
import { Button } from "@/components/ui/button";
import { useLoginMutation } from "@/redux/services/auth/auth-api";
import { routesPath } from "@/routes/routesPath";
import { consumeReturnTo } from "@/utils/return-to";
import { signInTarget } from "./sign-in-target";
import { humanizeAuthError } from "@/utils/auth-errors";
import { loginSchema } from "@/schema/auth";
import { useFormik } from "formik";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import NoSchoolNotice from "@/components/auth/no-school-notice";
import { currentSchoolSlug } from "@/utils/school-host";

export default function Login() {
  const navigate = useNavigate();
  // Read once per mount: the address cannot change without a page load.
  const [schoolSlug] = useState(() => currentSchoolSlug());
  const [login, { isLoading }] = useLoginMutation();
  const [apiError, setApiError] = useState("");
  // Read once at mount (lazy initialiser); the effect only clears the flag so
  // a later manual visit to /accounts doesn't re-show a stale banner.
  const [sessionBanner] = useState(
    () => sessionStorage.getItem("_auth_banner") ?? "",
  );

  useEffect(() => {
    sessionStorage.removeItem("_auth_banner");
  }, []);

  const formik = useFormik({
    initialValues: {
      password: "",
      identifier: "",
    },
    validationSchema: loginSchema,
    onSubmit: (values) => {
      setApiError("");
      login({ ...values, identifier: values.identifier.trim() })
        .unwrap()
        .then((res) => {
          // Identity check: this portal is for school accounts only. The login
          // succeeds at the shared backend endpoint even for Codex staff, but
          // auth-api's onQueryStarted writes NO cookies/state for a platform
          // account (and blacklists the issued pair). Refuse to navigate and
          // point them to the Console.
          //
          // Read off the tenant, not the user: the `user_type` column this used
          // to test was removed from the API, so the test could no longer be
          // true and Codex staff were being let through. See auth-api.
          if (res.data.tenant?.kind === "PLATFORM") {
            setApiError(
              "This portal is for school accounts. Codex staff sign in at the Console - intranet.codexng.com.",
            );
            return;
          }
          navigate(
            signInTarget(consumeReturnTo(), res.data.tenant?.status === "PENDING"),
            { replace: true },
          );
        })
        .catch((err) => {
          setApiError(
            humanizeAuthError(err, "Invalid credentials. Please try again."),
          );
        });
    },
  });

  // Sign-in has to name the school it is for, and this address names none, so
  // the form is not offered. See NoSchoolNotice.
  if (!schoolSlug) {
    return (
      <div className="w-full">
        <NoSchoolNotice action="sign in" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {sessionBanner && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 text-center">
          {sessionBanner}
        </div>
      )}
      <div className="text-center space-y-1.5">
        <h4 className="font-semibold text-2xl text-black-01">
          Sign in to your school
        </h4>
        <p className="text-sm font-medium text-gray-01 font-mont">
          Staff can use their email address or staff ID.
        </p>
      </div>

      <form onSubmit={formik.handleSubmit} className="mt-4 space-y-4">
        <CustomInput
          label="Email or staff ID"
          id="identifier"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@example.com or STF/0012"
          className="bg-gray-03 h-11 placeholder:text-[#21212166] placeholder:text-sm"
          {...formik.getFieldProps("identifier")}
          onChange={(e) => {
            setApiError("");
            formik.handleChange(e);
          }}
          error={formik.touched.identifier ? formik.errors.identifier : ""}
        />
        <CustomInput
          label="Password"
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          className="bg-gray-03 h-11 placeholder:text-[#21212166] placeholder:text-sm"
          {...formik.getFieldProps("password")}
          onChange={(e) => {
            setApiError("");
            formik.handleChange(e);
          }}
          error={formik.touched.password ? formik.errors.password : ""}
        />

        <div className="text-end">
          <Link
            to={routesPath.AUTH.FORGOT_PASSWORD}
            className="text-primary font-mont text-sm font-medium capitalize"
          >
            Forgot password
          </Link>
        </div>

        {apiError && (
          <p className="text-xs font-medium text-error-text -mt-1">
            {apiError}
          </p>
        )}

        <Button
          disabled={!formik.isValid || !formik.dirty || isLoading}
          loading={isLoading}
          type="submit"
          className="w-full h-11"
        >
          Sign in
        </Button>
      </form>
    </div>
  );
}
