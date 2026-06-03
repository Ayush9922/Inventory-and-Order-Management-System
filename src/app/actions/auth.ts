'use server';

import { db } from '@/lib/db';
import { hashPassword } from '@/lib/hash';
import { createSession, destroySession } from '@/lib/session';
import { redirect } from 'next/navigation';

export async function login(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Please enter both email and password.' };
  }

  try {
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { error: 'Invalid email or password.' };
    }

    const hashedPassword = hashPassword(password);
    if (user.passwordHash !== hashedPassword) {
      return { error: 'Invalid email or password.' };
    }

    // Create session cookie
    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error('Login error:', error);
    return { error: 'An unexpected database error occurred.' };
  }

  // Redirect after session is created
  // Redirect must happen outside the try-catch or be rethrown, Next.js redirect uses an internal error.
  redirect('/');
}

export async function logout() {
  await destroySession();
  redirect('/login');
}
