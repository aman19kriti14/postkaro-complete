import { z } from "zod";

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name can't exceed 80 characters")
    .regex(/^[a-zA-Z\s.\-']+$/, "Name can only contain letters, spaces, dots, hyphens"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(254, "Email is too long")
    .transform((v) => v.toLowerCase()),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password can't exceed 72 characters")
    .regex(/[A-Z]/, "Include at least one uppercase letter")
    .regex(/[a-z]/, "Include at least one lowercase letter")
    .regex(/[0-9]/, "Include at least one number"),
});

export type SignupFormData = z.infer<typeof signupSchema>;

export const signinSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .transform((v) => v.toLowerCase()),
  password: z
    .string()
    .min(1, "Password is required"),
  keepSignedIn: z.boolean().default(false),
});

export type SigninFormData = z.infer<typeof signinSchema>;