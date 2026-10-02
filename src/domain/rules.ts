export const eventTypes = [
  "演唱会",
  "音乐节",
  "Livehouse",
  "话剧",
  "音乐剧",
  "舞剧",
  "脱口秀",
  "其他",
] as const;
export const statuses = [
  "想看",
  "待开票",
  "已购票",
  "待观看",
  "已观看",
  "已取消",
] as const;
export type EventStatus = (typeof statuses)[number];
export type EventType = (typeof eventTypes)[number];
export type Expense = { id: string; category: string; amount: number };
export type PreparationItem = { id: string; title: string; done: boolean };
export type Media = {
  id: string;
  uri: string;
  name: string;
  kind: "image" | "video";
  role: string;
};
export type Reminder = { id: string; at: string; label: string };
export type ConcertEvent = {
  id: string;
  title: string;
  artists: string;
  type: EventType;
  startAt: string;
  endAt: string;
  city: string;
  venue: string;
  address?: string;
  status: EventStatus;
  saleAt?: string;
  price?: number;
  currency: string;
  platform?: string;
  seat?: string;
  note?: string;
  tags: string[];
  rating?: number;
  review?: string;
  color: string;
  expenses: Expense[];
  preparation: PreparationItem[];
  createdAt: string;
  updatedAt: string;
  sourceUrl?: string;
  companions?: string;
  media?: Media[];
  reminders?: Reminder[];
};
export const calendarViews = ["月历", "周视图", "日程列表", "时间轴"] as const;
export type Preferences = {
  theme: "system" | "light" | "dark";
  hidePrice: boolean;
  defaultCity: string;
  defaultCurrency: string;
  calendarView: (typeof calendarViews)[number];
};
export type FoundShow = {
  title: string;
  artists: string;
  city: string;
  venue: string;
  startAt: string;
  platform: string;
  url: string;
};
export type Discovery = {
  following: string[];
  results: FoundShow[];
  lastSuccess: Record<string, string>;
};
export const emptyDiscovery = (): Discovery => ({ following: [], results: [], lastSuccess: {} });
export type Backup = {
  version: 2;
  events: ConcertEvent[];
  preferences: Preferences;
  discovery: Discovery;
};
export const defaults: Preferences = {
  theme: "system",
  hidePrice: false,
  defaultCity: "",
  defaultCurrency: "CNY",
  calendarView: "月历",
};
export const money = (amount = 0, currency = "CNY") =>
  `${currency === "CNY" ? "¥" : currency + " "}${(amount / 100).toFixed(2)}`;
export function parseMoney(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw new Error("金额必须是非负数字，最多两位小数");
  const [whole, fraction = ""] = value.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount)) throw new Error("金额过大");
  return amount;
}
export const dayKey = (value: string | Date) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const localInput = (value: string | Date) => {
  const d = new Date(value);
  return `${dayKey(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
export function parseLocal(value: string) {
  const d = new Date(value);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ||
    !Number.isFinite(+d) ||
    localInput(d) !== value
  )
    throw new Error("时间格式为 YYYY-MM-DDTHH:mm，且必须是有效日期");
  return d.toISOString();
}
export const isPast = (event: ConcertEvent, now = new Date()) =>
  new Date(event.endAt) <= now;
export const overlap = (a: ConcertEvent, b: ConcertEvent) =>
  a.id !== b.id &&
  a.status !== "已取消" &&
  b.status !== "已取消" &&
  new Date(a.startAt) < new Date(b.endAt) &&
  new Date(b.startAt) < new Date(a.endAt);
export const conflictsFor = (event: ConcertEvent, events: ConcertEvent[]) =>
  events.filter((other) => overlap(event, other));
export function onDay(event: ConcertEvent, day: string) {
  const start = new Date(day + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return +new Date(event.startAt) < +end && +new Date(event.endAt) > +start;
}
export const totals = (events: ConcertEvent[]) =>
  events.reduce(
    (sum, e) =>
      sum + (e.price || 0) + e.expenses.reduce((n, x) => n + x.amount, 0),
    0,
  );
export function totalsByCurrency(events: ConcertEvent[]) {
  return events.reduce<Record<string, number>>((out, e) => {
    out[e.currency] = (out[e.currency] || 0) + totals([e]);
    return out;
  }, {});
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("记录必须是对象");
  return value as Record<string, unknown>;
}
function text(value: unknown, field: string, optional = false) {
  if (value === undefined && optional) return "";
  if (typeof value !== "string" || (!optional && !value.trim()))
    throw new Error(field + "无效");
  return value;
}
function timestamp(value: unknown, field: string) {
  const v = text(value, field);
  if (
    !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v) ||
    !Number.isFinite(Date.parse(v))
  )
    throw new Error(field + "需含有效日期和时区");
  const calendarDate = v.slice(0, 10);
  if (
    new Date(calendarDate + "T00:00:00Z").toISOString().slice(0, 10) !==
    calendarDate
  )
    throw new Error(field + "日期不存在");
  return new Date(v).toISOString();
}
function amount(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new Error("金额必须为非负整数分");
  return value;
}
function array(value: unknown, field: string): unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(field + "必须为数组");
  return value;
}
export function validateEvent(value: unknown): ConcertEvent {
  const v = object(value);
  const startAt = timestamp(v.startAt, "开始时间");
  const endAt = timestamp(v.endAt, "结束时间");
  if (endAt <= startAt) throw new Error("结束时间必须晚于开始时间");
  if (
    !eventTypes.includes(v.type as EventType) ||
    !statuses.includes(v.status as EventStatus)
  )
    throw new Error("类型或状态无效");
  const currency = text(v.currency, "币种").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("币种需为三位英文代码");
  const e: ConcertEvent = {
    id: text(v.id, "ID"),
    title: text(v.title, "名称"),
    artists: text(v.artists, "艺人", true),
    city: text(v.city, "城市", true),
    venue: text(v.venue, "场馆", true),
    type: v.type as EventType,
    status: v.status as EventStatus,
    startAt,
    endAt,
    currency,
    price: v.price === undefined ? 0 : amount(v.price),
    color:
      typeof v.color === "string" && /^#[0-9a-f]{6}$/i.test(v.color)
        ? v.color
        : "#9b7cff",
    tags: array(v.tags, "标签").map((x) => text(x, "标签")),
    expenses: array(v.expenses, "费用").map((x) => {
      const a = object(x);
      return {
        id: text(a.id, "费用 ID"),
        category: text(a.category, "费用类别"),
        amount: amount(a.amount),
      };
    }),
    preparation: array(v.preparation, "清单").map((x) => {
      const a = object(x);
      if (typeof a.done !== "boolean") throw new Error("清单状态无效");
      return {
        id: text(a.id, "清单 ID"),
        title: text(a.title, "事项"),
        done: a.done,
      };
    }),
    media: array(v.media, "媒体").map((x) => {
      const a = object(x);
      const uri = text(a.uri, "媒体地址");
      if (
        !/^(file:|content:|data:(image|video)\/)/.test(uri) ||
        !["image", "video"].includes(String(a.kind))
      )
        throw new Error("媒体格式不支持");
      return {
        id: text(a.id, "媒体 ID"),
        uri,
        name: text(a.name, "媒体名称"),
        role: text(a.role, "用途"),
        kind: a.kind as Media["kind"],
      };
    }),
    reminders: array(v.reminders, "提醒").map((x) => {
      const a = object(x);
      return {
        id: text(a.id, "提醒 ID"),
        at: timestamp(a.at, "提醒时间"),
        label: text(a.label, "提醒名称"),
      };
    }),
    createdAt: timestamp(v.createdAt ?? startAt, "创建时间"),
    updatedAt: timestamp(v.updatedAt ?? startAt, "更新时间"),
  };
  for (const field of [
    "address",
    "platform",
    "seat",
    "note",
    "review",
    "sourceUrl",
    "companions",
  ] as const)
    e[field] = text(v[field], field, true);
  if (e.sourceUrl && !/^https?:\/\//i.test(e.sourceUrl))
    throw new Error("公开链接必须以 https:// 或 http:// 开头");
  if (v.saleAt) e.saleAt = timestamp(v.saleAt, "开票时间");
  if (v.rating !== undefined) {
    if (
      typeof v.rating !== "number" ||
      !Number.isFinite(v.rating) ||
      v.rating < 0 ||
      v.rating > 5
    )
      throw new Error("评分需在 0—5 之间");
    e.rating = v.rating;
  }
  if (!Number.isSafeInteger(totals([e])))
    throw new Error("总费用超过安全整数范围");
  for (const items of [e.expenses, e.preparation, e.media!, e.reminders!])
    if (new Set(items.map((x) => x.id)).size !== items.length)
      throw new Error("子记录 ID 重复");
  return e;
}
export function validateBackup(value: unknown): Backup {
  const v = Array.isArray(value)
    ? { events: value, version: 2 }
    : object(value);
  if (v.version !== 2 || !Array.isArray(v.events))
    throw new Error("备份版本或结构不支持");
  const events = v.events.map(validateEvent);
  if (new Set(events.map((x) => x.id)).size !== events.length)
    throw new Error("演出 ID 重复");
  const p = v.preferences === undefined ? defaults : object(v.preferences);
  if (!["system", "light", "dark"].includes(String(p.theme)))
    throw new Error("主题设置无效");
  if (p.hidePrice !== undefined && typeof p.hidePrice !== "boolean")
    throw new Error("票价显示设置无效");
  if (p.defaultCity !== undefined && (typeof p.defaultCity !== "string" || p.defaultCity.length > 60))
    throw new Error("默认城市设置无效");
  if (p.defaultCurrency !== undefined && (typeof p.defaultCurrency !== "string" || !/^[A-Z]{3}$/.test(p.defaultCurrency)))
    throw new Error("默认币种设置无效");
  if (p.calendarView !== undefined && !calendarViews.includes(p.calendarView as Preferences["calendarView"]))
    throw new Error("日历视图设置无效");
  const d = v.discovery === undefined ? emptyDiscovery() : object(v.discovery);
  const following = array(d.following, "关注歌手").map((x) => text(x, "歌手"));
  const results = array(d.results, "发现结果").map((x) => {
    const item = object(x);
    const url = text(item.url, "票务链接");
    if (!/^https:\/\//i.test(url)) throw new Error("票务链接必须是 HTTPS");
    return {
      title: text(item.title, "演出名称"),
      artists: text(item.artists, "艺人"),
      city: text(item.city, "城市", true),
      venue: text(item.venue, "场馆", true),
      startAt: timestamp(item.startAt, "开演时间"),
      platform: text(item.platform, "票务平台"),
      url,
    };
  });
  const lastSuccessRaw = d.lastSuccess === undefined ? {} : object(d.lastSuccess);
  const lastSuccess = Object.fromEntries(Object.entries(lastSuccessRaw).map(([key, value]) => [key, timestamp(value, "上次成功时间")]));
  return {
    version: 2,
    events,
    preferences: {
      theme: p.theme as Preferences["theme"],
      hidePrice: p.hidePrice === true,
      defaultCity: (p.defaultCity as string | undefined)?.trim() || "",
      defaultCurrency: (p.defaultCurrency as string | undefined) || "CNY",
      calendarView: (p.calendarView as Preferences["calendarView"] | undefined) || "月历",
    },
    discovery: { following: [...new Set(following)], results, lastSuccess },
  };
}
