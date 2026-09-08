import * as Yup from "yup";

export const loginSchema = Yup.object({
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .required("Password is required"),
});

export const forgotPasswordSchema = Yup.object({
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
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
