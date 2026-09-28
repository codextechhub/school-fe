import * as Yup from "yup";

/**
 * An account named by an email address or by the school's own staff ID, typed
 * into one box. The server tells them apart by the `@`, so the only shape
 * checked here is that an address with an `@` is a whole address. Sign-in and
 * forgot-password share it, so the two boxes accept the same things.
 */
const identifierField = Yup.string()
  .trim()
  .required("Enter your ID")
  .test(
    "email-if-address",
    "Invalid email address",
    (value) => !value?.includes("@") || Yup.string().email().isValidSync(value),
  );

export const loginSchema = Yup.object({
  identifier: identifierField,
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .required("Password is required"),
});

export const forgotPasswordSchema = Yup.object({
  identifier: identifierField,
});

// The server's policy, stated once. vs_user/password_policy.py is the authority:
// twelve characters, an uppercase letter, a lowercase letter, a number and one
// special character, where special means anything that is not a letter or a
// digit. This said eight and allowed a fixed handful of punctuation, so
// "CodeX12." passed here and was refused there - the form promising something
// the server would not accept, which reads as the server being broken.
export const PASSWORD_MIN_LENGTH = 12;

export const resetPasswordSchema = Yup.object({
  password: Yup.string()
    .required("Password is required")
    .min(
      PASSWORD_MIN_LENGTH,
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    )
    .matches(/[A-Z]/, "Password must include an uppercase letter")
    .matches(/[a-z]/, "Password must include a lowercase letter")
    .matches(/\d/, "Password must include a number")
    .matches(
      /[^A-Za-z0-9]/,
      "Password must include a special character",
    ),
  confirm_password: Yup.string()
    .required("Confirm password is required")
    .oneOf([Yup.ref("password"), ""], "Passwords must match"),
});
