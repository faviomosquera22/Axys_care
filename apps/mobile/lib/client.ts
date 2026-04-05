import { createMobileSupabaseClient } from "@axyscare/core-db";
import { createMMKV } from "react-native-mmkv";

const storage = createMMKV({ id: "axyscare" });

export const mobileStorage = {
  getItem(key: string) {
    return storage.getString(key) ?? null;
  },
  setItem(key: string, value: string) {
    storage.set(key, value);
  },
  removeItem(key: string) {
    storage.remove(key);
  },
};

export const supabase = createMobileSupabaseClient(mobileStorage);
