import "server-only";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { localStore, type Viewer } from "./context";
import { backend, env } from "./env";
import { HttpError } from "./http";
import {
  SB_ACCESS_COOKIE,
  SB_REFRESH_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_DAYS,
  cookieOptions,
  createSessionToken,
  hashPassword,
  jwtExpiry,
  verifyPassword,
  verifySessionToken,
} from "./session";

function anonClient() {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function getViewer(): Promise<Viewer | null> {
  const jar = await cookies();
  if (backend() === "supabase") {
    const token = jar.get(SB_ACCESS_COOKIE)?.value;
    if (!token) return null;
    const exp = jwtExpiry(token);
    if (exp && exp * 1000 < Date.now()) return null; // middleware refreshes before this point
    const { data, error } = await anonClient().auth.getUser(token);
    if (error || !data.user) return null;
    return { userId: data.user.id, email: data.user.email ?? null, accessToken: token };
  }
  const userId = verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  return userId ? { userId, email: null, accessToken: null } : null;
}

export async function requireViewer(): Promise<Viewer> {
  const v = await getViewer();
  if (!v) throw new HttpError(401, "Please sign in to continue.");
  return v;
}

async function setLocalSession(userId: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSessionToken(userId), cookieOptions(SESSION_TTL_DAYS * 86400));
}

async function setSupabaseSession(access: string, refresh: string) {
  const jar = await cookies();
  jar.set(SB_ACCESS_COOKIE, access, cookieOptions(SESSION_TTL_DAYS * 86400));
  jar.set(SB_REFRESH_COOKIE, refresh, cookieOptions(SESSION_TTL_DAYS * 86400));
}

export async function clearSession() {
  const jar = await cookies();
  for (const name of [SESSION_COOKIE, SB_ACCESS_COOKIE, SB_REFRESH_COOKIE]) jar.delete(name);
}

export interface AuthResult {
  viewer: Viewer;
  isNew: boolean;
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const normalised = email.trim().toLowerCase();
  if (backend() === "supabase") {
    const { data, error } = await anonClient().auth.signUp({ email: normalised, password });
    if (error) throw new HttpError(400, error.message);
    if (!data.session || !data.user) {
      throw new HttpError(202, "Check your inbox to confirm your email, then sign in.");
    }
    await setSupabaseSession(data.session.access_token, data.session.refresh_token);
    return { viewer: { userId: data.user.id, email: normalised, accessToken: data.session.access_token }, isNew: true };
  }
  const store = localStore();
  if (await store.findAccountByEmail(normalised)) throw new HttpError(409, "An account with that email already exists. Try signing in.");
  const id = crypto.randomUUID();
  await store.createAccount({ id, email: normalised, passwordHash: hashPassword(password), createdAt: new Date().toISOString() });
  await setLocalSession(id);
  return { viewer: { userId: id, email: normalised, accessToken: null }, isNew: true };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const normalised = email.trim().toLowerCase();
  if (backend() === "supabase") {
    const { data, error } = await anonClient().auth.signInWithPassword({ email: normalised, password });
    if (error || !data.session) throw new HttpError(401, "That email and password don't match.");
    await setSupabaseSession(data.session.access_token, data.session.refresh_token);
    return { viewer: { userId: data.user.id, email: normalised, accessToken: data.session.access_token }, isNew: false };
  }
  const account = await localStore().findAccountByEmail(normalised);
  if (!account || !verifyPassword(password, account.passwordHash)) throw new HttpError(401, "That email and password don't match.");
  await setLocalSession(account.id);
  return { viewer: { userId: account.id, email: normalised, accessToken: null }, isNew: false };
}

/** Starts a throwaway demo account pre-filled with progress. */
export async function startDemoSession(): Promise<Viewer> {
  if (!env.demoEnabled) throw new HttpError(403, "Demo mode is disabled.");
  if (backend() === "supabase") {
    const { data, error } = await anonClient().auth.signInAnonymously();
    if (error || !data.session || !data.user) {
      throw new HttpError(503, "Demo needs anonymous sign-ins enabled in Supabase (Authentication → Providers).");
    }
    await setSupabaseSession(data.session.access_token, data.session.refresh_token);
    return { userId: data.user.id, email: null, accessToken: data.session.access_token };
  }
  const id = `demo-${crypto.randomUUID()}`;
  await setLocalSession(id);
  return { userId: id, email: null, accessToken: null };
}
