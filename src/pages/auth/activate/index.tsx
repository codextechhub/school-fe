import { svgIcons } from "@/assets/svg";
import { CustomInput } from "@/components/custom/custom-input";
import { Button } from "@/components/ui/button";
import {
  useActivationPreviewQuery,
  useActivateAccountMutation,
} from "@/redux/services/auth/auth-api";
import { routesPath } from "@/routes/routesPath";
import { PASSWORD_MIN_LENGTH, resetPasswordSchema } from "@/schema/auth";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { swipAnimateVariant } from "@/utils/animation";
import { humanizeAuthError } from "@/utils/auth-errors";
import { fieldErrors } from "@/utils/api-error";
import { useFormik } from "formik";

export default function ActivateAccount() {
  const { activation_key } = useParams<{ activation_key: string }>();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);

  const {
    data: preview,
    isLoading: previewLoading,
    isError: previewError,
  } = useActivationPreviewQuery(activation_key!, { skip: !activation_key });

  const [activateAccount, { isLoading: activating }] =
    useActivateAccountMutation();
  const [apiError, setApiError] = useState("");

  const formik = useFormik({
    initialValues: { password: "", confirm_password: "" },
    validationSchema: resetPasswordSchema,
    onSubmit: (values) => {
      setApiError("");
      // Activation only sets the password + marks the account active - it
      // returns `{ message }`, NOT a login-shaped payload. Show the success
      // panel and send the user to sign in.
      activateAccount({ activation_key: activation_key!, ...values })
        .unwrap()
        .then(() => setSuccess(true))
        .catch((err) => {
          // A refused password is not a mystery, and the server says exactly
          // why - "too common", "at least 12 characters", "an uppercase
          // letter", "a special character". Those belong under the box being
          // complained about. Only what has no field to sit under falls
          // through to the banner.
          const perField = fieldErrors(err);
          if (perField.password || perField.confirm_password) {
            formik.setErrors({
              ...(perField.password ? { password: perField.password } : {}),
              ...(perField.confirm_password
                ? { confirm_password: perField.confirm_password }
                : {}),
            });
            formik.setTouched({ password: true, confirm_password: true }, false);
            return;
          }
          setApiError(
            humanizeAuthError(err, "Activation failed. Please try again."),
          );
        });
    },
  });

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => {
        navigate(routesPath.AUTH.LOGIN, { replace: true });
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [success, navigate]);

  if (previewLoading) {
    return (
      <div className="text-center space-y-1.5">
        <p className="text-sm font-medium text-gray-01 font-mont">
          Verifying your invite link…
        </p>
      </div>
    );
  }

  if (previewError || !preview?.data) {
    return (
      <div className="text-center space-y-4">
        <h4 className="font-semibold text-2xl text-black-01">Link Expired</h4>
        <p className="text-sm font-medium text-gray-01 font-mont max-w-72 mx-auto">
          This invite link is invalid or has expired. Please contact your
          administrator for a new one.
        </p>
        <Link to={routesPath.AUTH.LOGIN} className="block mt-4">
          <Button variant="outline" className="w-full h-11">
            Back to Log In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" custom={1}>
      <motion.div
        key={success ? "success" : "form"}
        custom={1}
        variants={swipAnimateVariant}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          x: { type: "spring", stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
        }}
        className="w-full"
      >
        {!success ? (
          <form onSubmit={formik.handleSubmit}>
            <div className="text-center space-y-1.5">
              <h4 className="font-semibold text-2xl text-black-01">
                Set Your Password
              </h4>
              <p className="text-sm font-medium text-gray-01 font-mont max-w-84.5 mx-auto">
                Welcome! Set a password to activate your account and get
                started.
              </p>
            </div>

            <div className="mt-4 space-y-3">
              <CustomInput
                label="Name"
                id="full_name"
                value={preview.data.full_name}
                readOnly
                className="bg-gray-03 h-11 text-gray-01"
              />
              <CustomInput
                label="Email"
                id="email"
                value={preview.data.email}
                readOnly
                className="bg-gray-03 h-11 text-gray-01"
              />
            </div>

            <div className="mt-4 mb-9 space-y-4">
              <CustomInput
                label="Password"
                id="password"
                type="password"
                placeholder="Enter your password"
                className="bg-gray-03 h-11 placeholder:text-[#21212166] placeholder:text-sm"
                {...formik.getFieldProps("password")}
                onChange={(e) => {
                  setApiError("");
                  formik.handleChange(e);
                }}
                error={formik.touched.password ? formik.errors.password : ""}
              />
              {/* Stated before it is needed. The rules are the server's, and
                  finding them out by being refused is the slowest way to learn
                  them - especially on activation, which somebody does once and
                  under a link they were sent. */}
              {!formik.errors.password && (
                <p className="-mt-2 text-xs text-gray-01 font-mont">
                  At least {PASSWORD_MIN_LENGTH} characters, with an uppercase
                  letter, a lowercase letter, a number and a special character.
                </p>
              )}
              <CustomInput
                label="Confirm Password"
                id="confirm_password"
                type="password"
                placeholder="Re-enter your password"
                className="bg-gray-03 h-11 placeholder:text-[#21212166] placeholder:text-sm"
                {...formik.getFieldProps("confirm_password")}
                onChange={(e) => {
                  setApiError("");
                  formik.handleChange(e);
                }}
                error={
                  formik.touched.confirm_password
                    ? formik.errors.confirm_password
                    : ""
                }
              />
            </div>

            {apiError && (
              <p className="text-xs font-medium text-error-text -mt-6 mb-2">
                {apiError}
              </p>
            )}

            <Button
              disabled={!formik.isValid || !formik.dirty || activating}
              loading={activating}
              type="submit"
              className="w-full h-11"
            >
              Activate Account
            </Button>

            <div className="text-center">
              <Link
                to={routesPath.AUTH.LOGIN}
                className="font-mont font-medium text-sm text-black-01 inline-flex justify-center items-center mt-6 group"
              >
                <figure className="size-fit mr-1.5 group-hover:-translate-x-1 ease-linear transition-all">
                  {svgIcons.arrowLeft}
                </figure>
                Back to Log In
              </Link>
            </div>
          </form>
        ) : (
          <div>
            <div className="text-center space-y-1.5">
              <h4 className="font-semibold text-2xl text-black-01">
                Account Activated!
              </h4>
              <p className="text-sm font-medium text-gray-01 font-mont max-w-75.5 mx-auto">
                Your account has been successfully activated. You can now log in
                with your credentials.
              </p>
            </div>

            <Button
              className="w-full h-11 mt-9"
              onClick={() => navigate(routesPath.AUTH.LOGIN, { replace: true })}
            >
              Continue to Login
            </Button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
