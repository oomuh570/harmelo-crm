'use server';

import { redirect } from 'next/navigation';
import { SignupSchema } from './definitions';

export default async function SignUpAction(state: any, formData: FormData) {
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
    return { success: true, userId: data.id };
  } catch (error) {
    console.log(error);
    return {
      errors: { email: ['Something went wrong'] },
    };
  }
  redirect('/dashboard')

  
}
