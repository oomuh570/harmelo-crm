'use server';

import { redirect } from 'next/navigation';
import { createSession } from '@/lib/session';
import { SignupSchema } from './definitions';

type SignUpErrors = {
  fullName?: string[];
  email?: string[];
  phoneNumber?: string[];
  password?: string[];
};

export type SignUpState = { errors?: SignUpErrors } | undefined;

export default async function SignUpAction(
  state: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const validationResult = SignupSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    phoneNumber: formData.get('phoneNumber'),
    password: formData.get('password'),
  });

  if (!validationResult.success) {
    return {
      errors: validationResult.error.flatten().fieldErrors,
    };
  }

  const { fullName, email, phoneNumber, password } = validationResult.data;

  let userId: string;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fullName, email, phoneNumber, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      return {
        errors: { email: [data.error || 'Signup failed'] },
      };
    }

    const data = await res.json();
    userId = data.id;
  } catch (error) {
    console.error('Signup error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Something went wrong';
    return {
      errors: { email: [errorMsg] },
    };
  }

  await createSession(userId, email);
  redirect('/');
}
