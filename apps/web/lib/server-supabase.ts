import { createNextServerSupabaseClient } from "@axyscare/core-db";
import { cookies } from "next/headers";

export async function getServerSupabaseClient() {
  const cookieStore = await cookies();

  return createNextServerSupabaseClient({
    getAll() {
      return cookieStore.getAll();
    },
    setAll(nextCookies) {
      for (const cookie of nextCookies) {
        cookieStore.set(cookie.name, cookie.value, cookie.options);
      }
    },
  });
}
