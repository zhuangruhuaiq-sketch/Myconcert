import {
  Backup,
  ConcertEvent,
  defaults,
  validateBackup,
  validateEvent,
} from "./rules";
export type Format = "json" | "csv" | "ics";
const escapeIcs = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
const unescapeIcs = (s: string) =>
  s.replace(/\\([nN,;\\])/g, (_, c: string) => (/n/i.test(c) ? "\n" : c));
const stamp = (iso: string) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
function fold(line: string) {
  let result = "";
  let length = 0;
  for (const c of line) {
    const bytes =
      c.codePointAt(0)! < 128
        ? 1
        : c.codePointAt(0)! < 2048
          ? 2
          : c.codePointAt(0)! < 65536
            ? 3
            : 4;
    if (length + bytes > 73) {
      result += "\r\n ";
      length = 1;
    }
    result += c;
    length += bytes;
  }
  return result;
}
export function toIcs(events: ConcertEvent[]) {
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Myconcert//Calendar//ZH",
      "CALSCALE:GREGORIAN",
      ...events.flatMap((e) => [
        "BEGIN:VEVENT",
        "UID:" + escapeIcs(e.id + "@myconcert"),
        "DTSTAMP:" + stamp(e.updatedAt),
        "DTSTART:" + stamp(e.startAt),
        "DTEND:" + stamp(e.endAt),
        "SUMMARY:" + escapeIcs(e.title),
        "LOCATION:" + escapeIcs(e.venue),
        "DESCRIPTION:" + escapeIcs(e.artists),
        "X-MYCONCERT-CITY:" + escapeIcs(e.city),
        "STATUS:" + (e.status === "已取消" ? "CANCELLED" : "CONFIRMED"),
        "END:VEVENT",
      ]),
      "END:VCALENDAR",
    ]
      .map(fold)
      .join("\r\n") + "\r\n"
  );
}
const columns = [
  "名称",
  "艺人",
  "开始时间",
  "结束时间",
  "城市",
  "场馆",
  "状态",
  "票价(分)",
  "ID",
  "类型",
  "币种",
  "Myconcert记录",
];
const safeCell = (s: string) => (/^[=+\-@\t\r]/.test(s) ? "'" + s : s);
export function toCsv(events: ConcertEvent[]) {
  return (
    "\uFEFF" +
    [
      columns,
      ...events.map((e) => [
        e.title,
        e.artists,
        e.startAt,
        e.endAt,
        e.city,
        e.venue,
        e.status,
        String(e.price || 0),
        e.id,
        e.type,
        e.currency,
        JSON.stringify(e),
      ]),
    ]
      .map((row) =>
        row
          .map((cell) => '"' + safeCell(cell).replace(/"/g, '""') + '"')
          .join(","),
      )
      .join("\r\n")
  );
}
export function csvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const s = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"') {
      if (quoted && s[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === "," || c === "\n" || c === "\r")) {
      row.push(cell);
      cell = "";
      if (c !== ",") {
        rows.push(row);
        row = [];
        if (c === "\r" && s[i + 1] === "\n") i++;
      }
    } else cell += c;
  }
  if (quoted) throw new Error("CSV 引号未闭合");
  if (cell || row.length) rows.push([...row, cell]);
  return rows;
}
function basic(
  title: string,
  startAt: string,
  endAt: string,
  id: string,
): ConcertEvent {
  return {
    id,
    title,
    startAt,
    endAt,
    artists: "",
    city: "",
    venue: "",
    type: "其他",
    status: "待观看",
    currency: "CNY",
    color: "#9b7cff",
    tags: [],
    expenses: [],
    preparation: [],
    createdAt: startAt,
    updatedAt: startAt,
  };
}
function icsDate(value: string, property: string) {
  if (/TZID=|RRULE/.test(property))
    throw new Error("带 TZID 的日程暂不支持；请从来源导出 UTC 时间");
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(
    value,
  );
  if (!m) throw new Error("ICS 日期格式不支持");
  const input = `${m[1]}-${m[2]}-${m[3]}T${m[4] || "00"}:${m[5] || "00"}:${m[6] || "00"}${m[7] || ""}`;
  if (!Number.isFinite(Date.parse(input))) throw new Error("ICS 日期无效");
  return new Date(input).toISOString();
}
export type Preview = {
  events: ConcertEvent[];
  errors: string[];
  preferences?: Backup["preferences"];
};
export function importPreview(input: string, format: Format): Preview {
  const errors: string[] = [];
  const candidates: unknown[] = [];
  let preferences: Backup["preferences"] | undefined;
  if (format === "json") {
    const parsed = JSON.parse(input);
    if (!Array.isArray(parsed) && parsed?.version !== 2)
      throw new Error("不支持此 JSON 版本");
    const list = Array.isArray(parsed) ? parsed : parsed.events;
    if (!Array.isArray(list)) throw new Error("JSON 缺少演出数组");
    candidates.push(...list);
    if (parsed.preferences)
      preferences = validateBackup({
        version: 2,
        events: [],
        preferences: parsed.preferences,
      }).preferences;
  } else if (format === "csv") {
    const [headers, ...rows] = csvRows(input);
    if (!headers) throw new Error("CSV 文件为空");
    rows
      .filter((r) => r.some(Boolean))
      .forEach((row, i) => {
        try {
          const get = (key: string) =>
            (row[headers.indexOf(key)] || "").replace(/^'(?=[=+\-@\t\r])/, "");
          const full = get("Myconcert记录");
          if (full) candidates.push(JSON.parse(full));
          else
            candidates.push({
              ...basic(
                get("名称"),
                get("开始时间"),
                get("结束时间"),
                get("ID") ||
                  "csv-" + i + "-" + get("开始时间") + "-" + get("名称"),
              ),
              artists: get("艺人"),
              city: get("城市"),
              venue: get("场馆"),
              status: get("状态") || "待观看",
              type: get("类型") || "其他",
              price: Number(get("票价(分)") || 0),
              currency: get("币种") || "CNY",
            });
        } catch (e) {
          errors.push("CSV 第 " + (i + 2) + " 行：" + String(e));
        }
      });
  } else {
    const normalized = input.replace(/\r?\n[ \t]/g, "");
    if (!normalized.includes("BEGIN:VCALENDAR"))
      throw new Error("缺少 VCALENDAR");
    const blocks = [
      ...normalized.matchAll(/BEGIN:VEVENT\r?\n([\s\S]*?)END:VEVENT/g),
    ];
    if (!blocks.length) throw new Error("没有找到日程");
    blocks.forEach((block, i) => {
      try {
        const fields: Record<string, { value: string; property: string }> = {};
        for (const line of block[1].split(/\r?\n/)) {
          const split = line.indexOf(":");
          if (split < 0) continue;
          const property = line.slice(0, split);
          fields[property.split(";")[0]] = {
            property,
            value: line.slice(split + 1),
          };
        }
        if (fields.RRULE || fields.RECURRENCE_ID || fields.DURATION)
          throw new Error(
            "重复日程或 DURATION 暂不支持，请导出展开后的开始/结束时间",
          );
        if (!fields.DTSTART || !fields.DTEND)
          throw new Error("日程必须包含开始和结束时间");
        const start = icsDate(fields.DTSTART.value, fields.DTSTART.property);
        const end = icsDate(fields.DTEND.value, fields.DTEND.property);
        candidates.push({
          ...basic(
            unescapeIcs(fields.SUMMARY?.value || "导入的日程"),
            start,
            end,
            unescapeIcs(fields.UID?.value || "ics-" + i + start).replace(
              /@myconcert$/,
              "",
            ),
          ),
          venue: unescapeIcs(fields.LOCATION?.value || ""),
          artists: unescapeIcs(fields.DESCRIPTION?.value || ""),
          city: unescapeIcs(fields["X-MYCONCERT-CITY"]?.value || ""),
          status: fields.STATUS?.value === "CANCELLED" ? "已取消" : "待观看",
        });
      } catch (e) {
        errors.push("ICS 第 " + (i + 1) + " 场：" + String(e));
      }
    });
  }
  const events: ConcertEvent[] = [];
  const ids = new Set<string>();
  candidates.forEach((v, i) => {
    try {
      const e = validateEvent(v);
      if (ids.has(e.id)) throw new Error("文件内 ID 重复");
      ids.add(e.id);
      events.push(e);
    } catch (e) {
      errors.push("记录 " + (i + 1) + "：" + String(e));
    }
  });
  return { events, errors, preferences };
}
export function mergeEvents(
  current: ConcertEvent[],
  incoming: ConcertEvent[],
  policy: "skip" | "replace",
) {
  const map = new Map(current.map((e) => [e.id, e]));
  for (const e of incoming)
    if (policy === "replace" || !map.has(e.id)) map.set(e.id, e);
  return [...map.values()];
}
export const emptyBackup = (): Backup => ({
  version: 2,
  events: [],
  preferences: defaults,
});
