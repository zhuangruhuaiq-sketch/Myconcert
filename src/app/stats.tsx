import { useState } from "react";
import { useData } from "@/data/context";
import { Button, Card, Label, Rows, Screen } from "@/components/ui";
import { emptyFilters, FilterFields, filterEvents } from "@/components/filters";
import { money, totalsByCurrency } from "@/domain/rules";
export default function Stats() {
  const { data, clock } = useData();
  const [filters, setFilters] = useState({
    ...emptyFilters,
    year: String(new Date().getFullYear()),
  });
  const [expanded, setExpanded] = useState(false);
  const events = filterEvents(data.events, filters);
  const watched = events.filter((e) => e.status === "已观看");
  const ranked = Object.entries(
    watched.reduce<Record<string, number>>((out, e) => {
      if (e.artists) out[e.artists] = (out[e.artists] || 0) + 1;
      return out;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const ratings = watched.filter((e) => e.rating !== undefined);
  const costs: Record<string, number> = {};
  for (const e of events) {
    costs[e.currency + " · 票价"] =
      (costs[e.currency + " · 票价"] || 0) + (e.price || 0);
    for (const x of e.expenses)
      costs[e.currency + " · " + x.category] =
        (costs[e.currency + " · " + x.category] || 0) + x.amount;
  }
  return (
    <Screen title="统计与年度回顾">
      <Card title={filters.year ? filters.year + " 年回顾" : "全部记录统计"}>
        <Button
          title={expanded ? "收起统计筛选" : "筛选统计范围"}
          onPress={() => setExpanded((v) => !v)}
        />
        {expanded && <FilterFields value={filters} onChange={setFilters} />}
        <Button
          title="本年全部"
          onPress={() =>
            setFilters({
              ...emptyFilters,
              year: String(new Date(clock).getFullYear()),
            })
          }
        />
        <Button title="所有年份" onPress={() => setFilters(emptyFilters)} />
        <Label>
          记录 {events.length} 场 · 已观看 {watched.length} 场
        </Label>
        <Label>
          已到访 {new Set(watched.map((e) => e.city).filter(Boolean)).size} 城市
          / {new Set(watched.map((e) => e.city + " · " + e.venue)).size} 场馆
        </Label>
        <Label>
          累计观演{" "}
          {watched
            .reduce(
              (n, e) =>
                n + (+new Date(e.endAt) - +new Date(e.startAt)) / 3600000,
              0,
            )
            .toFixed(1)}{" "}
          小时
        </Label>
        <Label>
          平均评分{" "}
          {ratings.length
            ? (
                ratings.reduce((n, e) => n + e.rating!, 0) / ratings.length
              ).toFixed(1)
            : "暂无"}
        </Label>
        <Label>最常看艺人：{ranked[0]?.[0] || "暂无"}</Label>
        {Object.entries(totalsByCurrency(events)).map(([currency, amount]) => (
          <Label key={currency}>总支出 {money(amount, currency)}</Label>
        ))}
        <Label muted>
          费用包含筛选内的全部记录（含取消场次的已记录支出），不同币种不合并换算。
        </Label>
      </Card>
      <Card title="费用分类">
        {Object.entries(costs).map(([label, amount]) => (
          <Label key={label}>
            {label}：{(amount / 100).toFixed(2)}
          </Label>
        ))}
      </Card>
      <Card title="代表性演出">
        <Rows
          events={[...watched]
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 5)}
        />
      </Card>
    </Screen>
  );
}
