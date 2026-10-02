import { createContext, useContext, useEffect, useState } from "react";
import { AppState, useColorScheme } from "react-native";
import { Backup, defaults, emptyDiscovery } from "@/domain/rules";
import { storage } from "./storage";
import { RecoveryError, repository } from "./repository";
import { demoEvents } from "./seed";

type State = {
  data: Backup;
  ready: boolean;
  busy: boolean;
  error: string;
  raw: string;
  clock: number;
  dark: boolean;
  reload: () => Promise<void>;
  change: (f: (previous: Backup) => Backup) => Promise<void>;
};
const Context = createContext<State | null>(null);
export function DataProvider({ children }: { children: React.ReactNode }) {
  const [repo] = useState(() => repository(storage, demoEvents));
  const [data, setData] = useState<Backup>({
    version: 2,
    events: [],
    preferences: defaults,
    discovery: emptyDiscovery(),
  });
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState("");
  const [raw, setRaw] = useState("");
  const [clock, setClock] = useState(() => Date.now());
  const scheme = useColorScheme();
  async function reload() {
    setError("");
    setReady(false);
    try {
      setData(await repo.load());
      setReady(true);
      setRaw("");
    } catch (e) {
      setError(String(e));
      if (e instanceof RecoveryError) setRaw(e.raw);
    }
  }
  useEffect(() => {
    let alive = true;
    void repo
      .load()
      .then((value) => {
        if (alive) {
          setData(value);
          setReady(true);
        }
      })
      .catch((e) => {
        if (alive) {
          setError(String(e));
          if (e instanceof RecoveryError) setRaw(e.raw);
        }
      });
    return () => {
      alive = false;
    };
  }, [repo]);
  useEffect(() => {
    const tick = () => setClock(Date.now());
    const timer = setInterval(tick, 30000);
    const sub = AppState.addEventListener("change", tick);
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  async function change(f: (previous: Backup) => Backup) {
    if (!ready) throw new Error("数据尚未加载，暂不能保存");
    setPending((x) => x + 1);
    try {
      setData(await repo.mutate(f));
    } finally {
      setPending((x) => x - 1);
    }
  }
  const dark =
    data.preferences.theme === "dark" ||
    (data.preferences.theme === "system" && scheme === "dark");
  return (
    <Context.Provider
      value={{
        data,
        ready,
        busy: pending > 0,
        error,
        raw,
        clock,
        dark,
        reload,
        change,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useData() {
  const value = useContext(Context);
  if (!value) throw new Error("DataProvider missing");
  return value;
}
