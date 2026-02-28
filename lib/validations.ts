import { z } from "zod";

/** Reusable email field */
export const emailSchema = z
  .string()
  .min(1, "Please enter your email")
  .email("Please enter a valid email");

/** Reusable password field (login — any non-empty) */
export const passwordSchema = z.string().min(1, "Please enter your password");

/** Reusable new password field (signup — min 6 chars) */
export const newPasswordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters");

// ---- Form schemas ----

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type LoginFormData = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    email: emailSchema,
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type SignupFormData = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const createGroupSchema = z.object({
  name: z
    .string()
    .min(1, "Please enter a group name")
    .max(30, "Group name must be 30 characters or less"),
  description: z
    .string()
    .max(100, "Description must be 100 characters or less"),
});
export type CreateGroupFormData = z.infer<typeof createGroupSchema>;
