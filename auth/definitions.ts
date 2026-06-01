import { z } from "zod"

export const SignupSchema = z.object({
  fullName: z.string().min(2, { message: 'Must be at least 2 characters' }).trim(),
  email: z.string().email({ message: 'Please enter a valid email' }).trim(),
  phoneNumber: z
    .string()
    .regex(/^[0-9]{3}-[0-9]{3}-[0-9]{4}$/, { message: 'Must be a 10-digit phone number' })
    .trim(),
  password: z
    .string()
    .min(8, { message: 'Must be at least 8 characters' })
    .regex(/[0-9]/, { message: 'Must contain at least one number' })
    .regex(/[!@#$%^&*(),.?":{}|<>]/, { message: 'Must contain a special character' })
    .regex(/[A-Z]/, { message: 'Must contain an uppercase letter' })
    .trim(),
});

export const LoginSchema = z.object({
    email: z.email({message: "Please enter a valid email"}).trim(),
    password: z.string({message: "Enter a password"}).min(1).trim()
})