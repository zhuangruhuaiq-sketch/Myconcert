import { Backup, defaults, validateBackup } from "../domain/rules";
export const CURRENT_KEY = "myconcert.backup.v2";
export const LEGACY_KEY = "myconcert.events.v1";
export type StoragePort = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
};
export class RecoveryError extends Error {
  constructor(
    public raw: string,
    reason: string,
  ) {
    super("数据未能读取，原始内容已保留。" + reason);
  }
}
export function repository(storage: StoragePort, seed: Backup["events"]) {
  let current: Backup | undefined;
  let queue = Promise.resolve();
  return {
    async load() {
      const saved = await storage.get(CURRENT_KEY);
      const legacy = saved === null ? await storage.get(LEGACY_KEY) : null;
      const raw = saved ?? legacy;
      let data: Backup;
      if (raw !== null) {
        try {
          data = validateBackup(JSON.parse(raw));
        } catch (err) {
          throw new RecoveryError(raw, String(err));
        }
        if (legacy !== null) {
          await storage.set("myconcert.pre-migration.v1", legacy);
          await storage.set(CURRENT_KEY, JSON.stringify(data));
        }
      } else {
        data = validateBackup({
          version: 2,
          events: seed,
          preferences: defaults,
        });
        await storage.set(CURRENT_KEY, JSON.stringify(data));
      }
      current = data;
      return data;
    },
    mutate(change: (previous: Backup) => Backup) {
      const task = queue.then(async () => {
        if (!current) throw new Error("请等待数据加载完成");
        const next = validateBackup(change(current));
        await storage.set(CURRENT_KEY, JSON.stringify(next));
        current = next;
        return next;
      });
      queue = task.then(
        () => undefined,
        () => undefined,
      );
      return task;
    },
  };
}
