import Storage from "expo-sqlite/kv-store";
export const storage = {
  get: (key: string) => Storage.getItem(key),
  set: (key: string, value: string) => Storage.setItem(key, value),
};
