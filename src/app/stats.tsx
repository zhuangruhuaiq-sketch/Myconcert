import { useState } from "react";
import { Text, View } from "react-native";
import { useData } from "@/data/context";
import { Button, Card, Choices, Label, Rows, Screen, usePalette } from "@/components/ui";
import { emptyFilters, FilterFields, filterEvents } from "@/components/filters";
import { money } from "@/domain/rules";
import { insights } from "@/domain/insights";

function Bars({ rows, format = (n) => `${n} 场` }: { rows: [string, number][]; format?: (n: number) => string }) {
  const p = usePalette();
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return <View style={{ gap: 13 }}>
    {!rows.length && <Label muted>暂无数据，记录观看后这里会慢慢丰富起来。</Label>}
    {rows.map(([name, n]) => <View key={name} style={{ gap: 5 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <Text style={{ color: p.text, flex: 1 }}>{name}</Text><Text style={{ color: p.muted }}>{format(n)}</Text>
      </View>
      <View style={{ height: 7, borderRadius: 4, backgroundColor: p.bg, overflow: "hidden" }}>
        <View style={{ height: 7, width: `${n / max * 100}%`, backgroundColor: p.accent, borderRadius: 4 }} />
      </View>
    </View>)}
  </View>;
}

export default function Stats() {
  const { data, clock } = useData();
  const p = usePalette();
  const [filters, setFilters] = useState({ ...emptyFilters, year: String(new Date(clock).getFullYear()) });
  const [expanded, setExpanded] = useState(false);
  const [ranking, setRanking] = useState("艺人");
  const events = filterEvents(data.events, filters);
  const s = insights(events);
  const years = [...new Set([String(new Date(clock).getFullYear()), ...data.events.map((e) => String(new Date(e.startAt).getFullYear())), ...(filters.year ? [filters.year] : [])])].sort().reverse();
  return <Screen title="我的现场 · 统计">
    <Card title={filters.year ? `${filters.year} 年的现场记忆` : "一路以来的现场记忆"}>
      <Choices label="回顾年份" value={filters.year || "全部年份"} options={["全部年份", ...years]}
        onChange={(year) => setFilters((f) => ({ ...f, year: year === "全部年份" ? "" : year }))} />
      <Button subtle title={expanded ? "收起详细筛选 ⌃" : "详细筛选 ⌄"} onPress={() => setExpanded((v) => !v)} />
      {expanded && <><FilterFields value={filters} onChange={setFilters} /><Button subtle title="重置全部筛选" onPress={() => setFilters(emptyFilters)} /></>}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {[[s.watched.length, "场已观看"], [s.cities.length, "座城市"], [s.venues.length, "个场馆"], [s.hours.toFixed(1), "小时现场"]].map(([value, label]) =>
          <View key={label} style={{ flexGrow: 1, flexBasis: "42%", backgroundColor: p.bg, padding: 16, borderRadius: 16, gap: 5 }}>
            <Text style={{ color: p.accent, fontSize: 30, fontWeight: "700" }}>{value}</Text><Label muted>{label}</Label>
          </View>)}
      </View>
      <Label muted>观演统计仅含「已观看」，按开始日期与本机时区归属；费用与状态包含筛选内全部 {events.length} 场记录。</Label>
    </Card>
    <Card title="观演节奏">
      <Label muted>{filters.year ? "每月观演场次" : "各年份按月份合计"}</Label>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: 150, gap: 4 }}>
        {s.months.map((n, i) => <View key={i} accessible accessibilityLabel={`${i + 1}月 ${n}场`} style={{ flex: 1, alignItems: "center", gap: 6 }}>
          <Text style={{ color: p.muted, fontSize: 11 }}>{n}</Text>
          <View style={{ height: n ? 90 * n / Math.max(1, ...s.months) : 2, width: "80%", borderRadius: 5, backgroundColor: n ? p.accent : p.border }} />
          <Text style={{ color: p.muted, fontSize: 11 }}>{i + 1}</Text>
        </View>)}
      </View>
      <Label>周末观演 {s.weekends} 场 · 占比 {s.watched.length ? Math.round(s.weekends / s.watched.length * 100) : 0}%</Label>
      {!filters.year && <Bars rows={s.years} />}
    </Card>
    <Card title="偏爱与足迹">
      <Choices label="榜单 · 前五名" value={ranking} options={["艺人", "城市", "场馆"]} onChange={setRanking} />
      <Bars rows={(ranking === "艺人" ? s.artists : ranking === "城市" ? s.cities : s.venues).slice(0, 5)} />
      <Label muted>共看过 {s.artists.length} 位艺人 / 阵容，其中 {s.repeatArtists} 位看过不止一次。艺人以逗号、顿号、分号或换行拆分；空白城市和场馆不计入。</Label>
    </Card>
    <Card title="演出偏好"><Bars rows={s.types} /></Card>
    <Card title="评分与珍藏">
      <Label large>{s.averageRating === undefined ? "还没有评分" : `${s.averageRating.toFixed(1)} / 5`}</Label>
      <Label muted>已评分 {s.ratedCount} / {s.watched.length} 场</Label>
      <Bars rows={s.ratings} />
      <Rows events={[...s.watched].filter((e) => e.rating !== undefined).sort((a, b) => b.rating! - a.rating!).slice(0, 3)} />
    </Card>
    <Card title="花费去向">
      {!s.spending.length && <Label muted>暂无费用记录</Label>}
      {s.spending.map((group) => <View key={group.currency} style={{ gap: 12 }}>
        <Label large>{money(group.total, group.currency)}</Label>
        <Label muted>平均每条记录 {money(group.average, group.currency)}</Label>
        <Bars rows={group.categories} format={(n) => money(n, group.currency)} />
      </View>)}
      <Label muted>包含票价及附加费用，取消场次也计入；不同币种单独统计，不作汇率换算。未填写的费用按 0 计。</Label>
    </Card>
    <Card title="行程状态"><Bars rows={s.statuses} /></Card>
  </Screen>;
}
