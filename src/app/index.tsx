import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useData } from "@/data/context";
import {
  Button,
  Card,
  Choices,
  Label,
  Rows,
  Screen,
  usePalette,
} from "@/components/ui";
import { dayKey, onDay } from "@/domain/rules";
export default function Home() {
  const { data, clock } = useData();
  const p = usePalette();
  const [day, setDay] = useState(() => dayKey(new Date()));
  const [mode, setMode] = useState("月历");
  const selected = new Date(day + "T12:00:00");
  const events = [...data.events].sort((a, b) =>
    a.startAt.localeCompare(b.startAt),
  );
  const next = events.find(
    (e) =>
      +new Date(e.endAt) > clock &&
      !["已取消", "已观看", "想看", "待开票"].includes(e.status),
  );
  const sale = [...events]
    .filter(
      (e) => e.status === "待开票" && e.saleAt && +new Date(e.saleAt) > clock,
    )
    .sort((a, b) => a.saleAt!.localeCompare(b.saleAt!))[0];
  const monthStart = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const monthEnd = new Date(selected.getFullYear(), selected.getMonth() + 1, 1);
  const monthEvents = events.filter(
    (e) => +new Date(e.startAt) < +monthEnd && +new Date(e.endAt) > +monthStart,
  );
  const weekStart = new Date(selected);
  weekStart.setDate(selected.getDate() - ((selected.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const weekEvents = events.filter(
    (e) => +new Date(e.startAt) < +weekEnd && +new Date(e.endAt) > +weekStart,
  );
  const offset = (monthStart.getDay() + 6) % 7;
  const count = new Date(
    selected.getFullYear(),
    selected.getMonth() + 1,
    0,
  ).getDate();
  const days =
    mode === "周视图"
      ? Array.from({ length: 7 }, (_, i) => {
          const d = new Date(weekStart);
          d.setDate(d.getDate() + i);
          return dayKey(d);
        })
      : Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, i) =>
          i < offset || i >= offset + count
            ? ""
            : dayKey(
                new Date(
                  selected.getFullYear(),
                  selected.getMonth(),
                  i - offset + 1,
                ),
              ),
        );
  function move(direction: number) {
    const d = new Date(selected);
    if (mode === "周视图") d.setDate(d.getDate() + 7 * direction);
    else {
      d.setDate(1);
      d.setMonth(d.getMonth() + direction);
    }
    setDay(dayKey(d));
  }
  const countdown = (iso: string) => {
    const hours = Math.max(0, Math.ceil((+new Date(iso) - clock) / 3600000));
    return hours >= 24
      ? Math.floor(hours / 24) + " 天 " + (hours % 24) + " 小时"
      : hours + " 小时";
  };
  return (
    <Screen title="日历">
      <Card title="下一场">
        {next ? (
          <>
            <Rows events={[next]} />
            <Label>
              {+new Date(next.startAt) <= clock
                ? "正在进行"
                : "距开演 " + countdown(next.startAt)}
            </Label>
          </>
        ) : (
          <Label>暂无即将赴约的演出</Label>
        )}
        {sale ? (
          <>
            <Label>
              待开票 · {sale.title} · 还有 {countdown(sale.saleAt!)}
            </Label>
            <Button
              title="查看待开票演出"
              onPress={() =>
                router.push({
                  pathname: "/event/[id]",
                  params: { id: sale.id },
                })
              }
            />
          </>
        ) : (
          <Label muted>暂无未来开票提醒</Label>
        )}
      </Card>
      <Card
        title={
          selected.getFullYear() +
          " 年 " +
          (selected.getMonth() + 1) +
          " 月 · " +
          monthEvents.length +
          " 场"
        }
      >
        <Choices
          label="显示方式"
          value={mode}
          options={["月历", "周视图", "日程列表", "时间轴"]}
          onChange={setMode}
        />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button title="上一页" onPress={() => move(-1)} />
          <Button
            title="今天"
            onPress={() => setDay(dayKey(new Date(clock)))}
          />
          <Button title="下一页" onPress={() => move(1)} />
        </View>
        {["月历", "周视图"].includes(mode) ? (
          <>
            <View style={{ flexDirection: "row" }}>
              {["一", "二", "三", "四", "五", "六", "日"].map((x) => (
                <Text
                  key={x}
                  style={{
                    width: "14.28%",
                    color: p.muted,
                    textAlign: "center",
                  }}
                >
                  {x}
                </Text>
              ))}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {days.map((key, i) => {
                const hits = key ? events.filter((e) => onDay(e, key)) : [];
                return key ? (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={key + "，" + hits.length + "场"}
                    accessibilityState={{ selected: key === day }}
                    onPress={() => setDay(key)}
                    style={{
                      width: "14.28%",
                      minHeight: 56,
                      padding: 4,
                      borderWidth: key === day ? 2 : 0,
                      borderColor: p.accent,
                      borderRadius: 8,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: p.text }}>
                      {Number(key.slice(-2))}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 2 }}>
                      {hits.slice(0, 3).map((e) => (
                        <View
                          key={e.id}
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor:
                              e.status === "已取消" ? p.muted : e.color,
                          }}
                        />
                      ))}
                    </View>
                  </Pressable>
                ) : (
                  <View key={i} style={{ width: "14.28%" }} />
                );
              })}
            </View>
            <Label large>{day}</Label>
            <Rows events={events.filter((e) => onDay(e, day))} />
            <Button
              title="在这天添加演出"
              onPress={() =>
                router.push({ pathname: "/edit", params: { day } })
              }
            />
            {mode === "周视图" && (
              <>
                <Label large>本周全部演出</Label>
                <Rows events={weekEvents} />
              </>
            )}
          </>
        ) : mode === "日程列表" ? (
          <Rows events={monthEvents} />
        ) : (
          <View style={{ gap: 14 }}>
            {monthEvents.length === 0 && <Label>本月暂无演出。</Label>}
            {monthEvents.map((e) => (
              <View
                key={e.id}
                style={{
                  borderLeftWidth: 2,
                  borderColor: p.accent,
                  paddingLeft: 10,
                }}
              >
                <Label>
                  {new Date(e.startAt).toLocaleString()} →{" "}
                  {new Date(e.endAt).toLocaleString()}
                </Label>
                <Rows events={[e]} />
              </View>
            ))}
          </View>
        )}
      </Card>
    </Screen>
  );
}
