import { Choices, Field } from "./ui";
import { ConcertEvent, eventTypes, statuses } from "@/domain/rules";
import { cityName } from "@/domain/city-name";
export type Filters = {
  query: string;
  year: string;
  city: string;
  artist: string;
  venue: string;
  type: string;
  status: string;
  tag: string;
  rated: string;
  from: string;
  to: string;
};
export const emptyFilters: Filters = {
  query: "",
  year: "",
  city: "",
  artist: "",
  venue: "",
  type: "全部",
  status: "全部",
  tag: "",
  rated: "全部",
  from: "",
  to: "",
};
export function filterEvents(events: ConcertEvent[], f: Filters) {
  const includes = (a: string, b: string) =>
    a.toLowerCase().includes(b.toLowerCase());
  return events.filter(
    (e) =>
      includes(
        [e.title, e.artists, e.venue, e.city, e.note, e.review, ...e.tags].join(
          " ",
        ),
        f.query,
      ) &&
      (!f.year || new Date(e.startAt).getFullYear() === Number(f.year)) &&
      includes(cityName(e.city), cityName(f.city)) &&
      includes(e.artists, f.artist) &&
      includes(e.venue, f.venue) &&
      (f.type === "全部" || e.type === f.type) &&
      (f.status === "全部" || e.status === f.status) &&
      (!f.tag || e.tags.some((t) => includes(t, f.tag))) &&
      (f.rated === "全部" ||
        (e.rating !== undefined) === (f.rated === "已评分")) &&
      (!f.from || +new Date(e.endAt) > +new Date(f.from + "T00:00:00")) &&
      (!f.to || +new Date(e.startAt) < +new Date(f.to + "T23:59:59.999")),
  );
}
export function FilterFields({
  value,
  onChange,
}: {
  value: Filters;
  onChange: (f: Filters) => void;
}) {
  const field = (key: keyof Filters, label: string) => (
    <Field
      label={label}
      value={value[key]}
      onChange={(v) => onChange({ ...value, [key]: v })}
    />
  );
  return (
    <>
      {field("query", "关键词")}
      {field("year", "年份（留空为全部）")}
      {field("from", "开始日期 YYYY-MM-DD")}
      {field("to", "截止日期 YYYY-MM-DD")}
      {field("city", "城市")}
      {field("artist", "艺人")}
      {field("venue", "场馆")}
      {field("tag", "标签")}
      <Choices
        label="筛选类型"
        value={value.type}
        options={["全部", ...eventTypes]}
        onChange={(v) => onChange({ ...value, type: v })}
      />
      <Choices
        label="筛选状态"
        value={value.status}
        options={["全部", ...statuses]}
        onChange={(v) => onChange({ ...value, status: v })}
      />
      <Choices
        label="评分筛选"
        value={value.rated}
        options={["全部", "已评分", "未评分"]}
        onChange={(v) => onChange({ ...value, rated: v })}
      />
    </>
  );
}
