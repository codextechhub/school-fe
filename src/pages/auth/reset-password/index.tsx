import { svgIcons } from "@/assets/svg";
import { CustomInput } from "@/components/custom/custom-input";
import { Button } from "@/components/ui/button";
import {
  usePasswordResetConfirmMutation,
  usePasswordResetPreviewQuery,
} from "@/redux/services/auth/auth-api";
import { routesPath } from "@/routes/routesPath";
import { resetPasswordSchema } from "@/schema/auth";
import { PasswordRules, passwordFieldErrors } from "@/components/auth/set-password";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { swipAnimateVariant } from "@/utils/animation";
import { humanizeAuthError } from "@/utils/auth-errors";
import { useFormik } from "formik";

export default function ResetPassword() {
  const { activation_key } = useParams<{ activation_key: string }>();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);

  const {
    data: preview,
    isLoading: previewLoading,
    isError: previewError,
  } = usePasswordResetPreviewQuery(activation_key!, { skip: !activation_key });

  const [passwordResetConfirm, { isLoading: confirmLoading }] =
    usePasswordResetConfirmMutation();
  const [apiError, setApiError] = useState("");

  const formik = useFormik({
    initialValues: { password: "", confirm_password: "" },
    validationSchema: resetPasswordSchema,
    onSubmit: (values) => {
      setApiError("");
      passwordResetConfirm({ activation_key: activation_key!, ...values })
        .unwrap()
        .then(() => setSuccess(true))
        .catch((err) => {
          // A refused password goes under its box; only the rest is a banner.
          const perField = passwordFieldErrors(err);
          if (perField.password || perField.confirm_password) {
            formik.setErrors(perField);
            formik.setTouched({ password: true, confirm_password: true }, false);
            return;
          }
          setApiError(
            humanizeAuthError(
              err,
              "Couldn't reset your password. Please try again.",
            ),
          );
        });
    },
  });

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => {
        navigate(routesPath.AUTH.LOGIN, { replace: true });
      }, 7000);
      return () => clearTimeout(t);
    }
  }, [success, navigate]);

  if (previewLoading) {
    return (
      <div className="text-center space-y-1.5">
        <p className="text-sm font-medium text-gray-01 font-mont">
          Verifying your reset link…
        </p>
      </div>
    );
  }

  if (previewError || !preview?.data) {
    return (
      <div className="text-center space-y-4">
        <h4 className="font-semibold text-2xl text-black-01">Link Expired</h4>
        <p className="text-sm font-medium text-gray-01 font-mont max-w-72 mx-auto">
          This password reset link is invalid or has expired. Please request a
          new one.
        </p>
        <Link to={routesPath.AUTH.FORGOT_PASSWORD} className="block mt-4">
          <Button className="w-full h-11">Request New Link</Button>
        </Link>
        <Link
          to={routesPath.AUTH.LOGIN}
          className="font-mont font-medium text-sm text-black-01 inline-flex justify-center items-center mt-2 group"
        >
          <figure className="size-fit mr-1.5 group-hover:-translate-x-1 ease-linear transition-all">
            {svgIcons.arrowLeft}
          </figure>
          Back to Log In
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
                Set a New Password
              </h4>
              <p className="text-sm font-medium text-gray-01 font-mont max-w-84.5 mx-auto">
                Choose a new password for your account. You sign in with it
                from now on.
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
                label="New Password"
                id="password"
                type="password"
                placeholder="Enter your new password"
                className="bg-gray-03 h-11 placeholder:text-[#21212166] placeholder:text-sm"
                {...formik.getFieldProps("password")}
                onChange={(e) => {
                  setApiError("");
                  formik.handleChange(e);
                }}
                error={formik.touched.password ? formik.errors.password : ""}
              />
              {!formik.errors.password && <PasswordRules />}
              <CustomInput
                label="Confirm Password"
                id="confirm_password"
                type="password"
                placeholder="Re-enter your new password"
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
              disabled={!formik.isValid || !formik.dirty || confirmLoading}
              loading={confirmLoading}
              type="submit"
              className="w-full h-11"
            >
              Reset Password
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
                Password Reset!
              </h4>
              <p className="text-sm font-medium text-gray-01 font-mont max-w-75.5 mx-auto">
                Your password has been successfully reset. Click the button
                below to log in.
              </p>
            </div>

            <Button
              className="w-full h-11 mt-9"
              onClick={() => navigate(routesPath.AUTH.LOGIN, { replace: true })}
            >
              Continue to Login
            </Button>

            <div className="text-center mt-6">
              <Link
                to={routesPath.AUTH.LOGIN}
                className="font-mont font-medium text-sm text-black-01 inline-flex justify-center items-center group"
              >
                <figure className="size-fit mr-1.5 group-hover:-translate-x-1 ease-linear transition-all">
                  {svgIcons.arrowLeft}
                </figure>
                Back to Log In
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
