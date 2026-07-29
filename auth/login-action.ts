'use server';

import { createSession, deleteSession } from '@/lib/session';
import { LoginSchema } from './definitions';
import { redirect } from 'next/navigation';

export default async function LoginAction(state: any, formData: FormData) {
  const validationResult = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validationResult.success) {
    return {
      message: 'Invalid password or email',
    };
  }

  const { email, password } = validationResult.data;

  let userId: string;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      return {
        message: 'Invalid password or email',
      };
    }

    const data = await res.json();
    userId = data.id;
  } catch (error) {
    console.log(error);
    return {
      message: 'Invalid password or email',
    };
  }

  await createSession(userId, email);
  redirect('/');
}


export async function logout(){
    await deleteSession();
    redirect("/login")
}