import { useState } from "react";
import { useData } from "@/data/context";
import { Button, Card, Choices, Field, Rows, Screen } from "@/components/ui";
import { statuses } from "@/domain/rules";
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
        <Choices label="演出状态" value={filters.status} options={["全部", ...statuses]}
          onChange={(status) => setFilters((f) => ({ ...f, status }))} />
        <Button
          subtle
          title={expanded ? "收起筛选" : "更多筛选"}
          onPress={() => setExpanded((v) => !v)}
        />
        {expanded && <FilterFields value={filters} onChange={setFilters} />}
        {JSON.stringify(filters) !== JSON.stringify(emptyFilters) && <Button subtle title="清除筛选" onPress={() => setFilters(emptyFilters)} />}
      </Card>
      <Card title={"找到 " + events.length + " 场"}>
        <Rows events={events} />
      </Card>
    </Screen>
  );
}
