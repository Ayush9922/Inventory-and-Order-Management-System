import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'aasamedchem_super_secret_jwt_key_2026_at_least_32_chars';
const KEY = new TextEncoder().encode(JWT_SECRET);

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SELLER';
  expiresAt: string;
}

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(KEY);
}

export async function decrypt(input: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(input, KEY, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
  } catch (err) {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  if (!sessionToken) return null;
  return await decrypt(sessionToken);
}

export async function createSession(user: { id: string; email: string; name: string; role: string }) {
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    expiresAt: expiresAt.toISOString(),
  };

  const token = await encrypt(payload);
  const cookieStore = await cookies();

  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.set('session', '', { expires: new Date(0), path: '/' });
}

export async function updateSession(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  if (!session) return null;

  // Refresh the session so it doesn't expire if user is active
  const parsed = await decrypt(session);
  if (!parsed) return null;

  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const response = NextResponse.next();
  
  // Re-encrypt with new expiration
  const newPayload = { ...parsed, expiresAt: expiresAt.toISOString() };
  const newToken = await encrypt(newPayload);

  response.cookies.set({
    name: 'session',
    value: newToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });

  return response;
}
