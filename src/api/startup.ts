import { Users } from "../../drizzle/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export async function hasSuperusers() {
  const superusers = await db
    .select()
    .from(Users)
    .where(eq(Users.superuser, true))
    .all();
  return superusers.length > 0;
}
