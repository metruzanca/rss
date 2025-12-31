"use server";
import { redirect } from "@solidjs/router";
import { useSession } from "vinxi/http";
import { eq, and } from "drizzle-orm";
import { hash, verify } from "@node-rs/bcrypt";
import { db } from "./db";
import { Users } from "../../drizzle/schema";
import { PATHS } from "~/lib/constants";

function validateUsername(username: unknown) {
  if (typeof username !== "string" || username.length < 3) {
    return `Usernames must be at least 3 characters long`;
  }
}

function validatePassword(password: unknown) {
  if (typeof password !== "string" || password.length < 6) {
    return `Passwords must be at least 6 characters long`;
  }
}

async function login(username: string, password: string) {
  const user = await db
    .select()
    .from(Users)
    .where(eq(Users.username, username))
    .get();
  if (!user) throw new Error("Invalid login");

  // Check if password is hashed (starts with $2) or plain text (for migration)
  const isValid = user.password.startsWith("$2")
    ? await verify(password, user.password)
    : password === user.password;

  if (!isValid) throw new Error("Invalid login");
  return user;
}

async function register(username: string, password: string) {
  const existingUser = await db
    .select()
    .from(Users)
    .where(eq(Users.username, username))
    .get();
  if (existingUser) throw new Error("User already exists");
  const hashedPassword = await hash(password, 10);
  return await db
    .insert(Users)
    .values({ username, password: hashedPassword })
    .returning()
    .get();
}

function getSession() {
  return useSession({
    password:
      process.env.SESSION_SECRET ?? "areallylongsecretthatyoushouldreplace",
  });
}

export async function loginOrRegister(formData: FormData) {
  const username = String(formData.get("username"));
  const password = String(formData.get("password"));
  const loginType = String(formData.get("loginType"));
  let error = validateUsername(username) || validatePassword(password);
  if (error) return new Error(error);

  try {
    const user = await (loginType !== "login"
      ? register(username, password)
      : login(username, password));
    const session = await getSession();
    await session.update((d) => {
      d.userId = user.id;
    });
  } catch (err) {
    return err as Error;
  }
  throw redirect(PATHS.index);
}

export async function logout() {
  const session = await getSession();
  await session.update((d) => (d.userId = undefined));
  throw redirect(PATHS.auth.login);
}

export async function getUser() {
  const session = await getSession();
  const userId = session.data.userId;
  if (userId === undefined) throw redirect(PATHS.auth.login);

  try {
    const user = await db
      .select()
      .from(Users)
      .where(eq(Users.id, userId))
      .get();
    if (!user) throw redirect(PATHS.auth.login);
    return { id: user.id, username: user.username };
  } catch {
    throw logout();
  }
}

// Helper function to check if any superusers exist
export async function hasSuperusers() {
  const superusers = await db
    .select()
    .from(Users)
    .where(eq(Users.superuser, true))
    .all();
  return superusers.length > 0;
}

// Helper function to check if a user is the first superuser
export async function isFirstSuperuser(userId: number) {
  const superusers = await db
    .select()
    .from(Users)
    .where(eq(Users.superuser, true))
    .all();
  if (superusers.length === 0) return false;

  // Find the superuser with the lowest ID
  const firstSuperuser = superusers.reduce((min, user) =>
    user.id < min.id ? user : min
  );

  return firstSuperuser.id === userId;
}

// Server action to create the first superuser
export async function createSuperuser(formData: FormData) {
  // Check if any superusers already exist
  const superusersExist = await hasSuperusers();
  if (superusersExist) {
    return new Error(
      "Superusers already exist. This endpoint is only for initial setup."
    );
  }

  const username = String(formData.get("username"));
  const password = String(formData.get("password"));

  let error = validateUsername(username) || validatePassword(password);
  if (error) return new Error(error);

  try {
    const existingUser = await db
      .select()
      .from(Users)
      .where(eq(Users.username, username))
      .get();
    if (existingUser) throw new Error("User already exists");

    const hashedPassword = await hash(password, 10);
    const user = await db
      .insert(Users)
      .values({
        username,
        password: hashedPassword,
        superuser: true,
      })
      .returning()
      .get();
    // Redirect to login after successful creation
    return redirect(PATHS.auth.login);
  } catch (err) {
    return err as Error;
  }
}
