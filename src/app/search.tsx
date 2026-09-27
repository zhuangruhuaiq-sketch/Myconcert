import { useState } from "react";
import { useData } from "@/data/context";
import { Button, Card, Field, Rows, Screen } from "@/components/ui";
import { emptyFilters, FilterFields, filterEvents } from "@/components/filters";
export default function Search() {
  const { data } = useData();
  const [filters, setFilters] = useState(emptyFilters);
  const [expanded, setExpanded] = useState(false);
  const events = filterEvents(data.events, filters).sort((a, b) =>
    a.startAt.localeCompare(b.startAt),
  );
  return (
    <Screen title="搜索">
      <Card title="查找演出">
        <Field
          label="搜索名称、艺人、场馆、备注或标签"
          value={filters.query}
          onChange={(query) => setFilters((f) => ({ ...f, query }))}
        />
        <Button
          title="待开票"
          onPress={() => setFilters({ ...emptyFilters, status: "待开票" })}
        />
        <Button
          title="已观看"
          onPress={() => setFilters({ ...emptyFilters, status: "已观看" })}
        />
        <Button
          title={expanded ? "收起筛选" : "更多筛选"}
          onPress={() => setExpanded((v) => !v)}
        />
        {expanded && <FilterFields value={filters} onChange={setFilters} />}
        <Button title="清除筛选" onPress={() => setFilters(emptyFilters)} />
      </Card>
      <Card title={"找到 " + events.length + " 场"}>
        <Rows events={events} />
      </Card>
    </Screen>
  );
}
