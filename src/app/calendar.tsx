import { useState } from "react";
import { Text, View } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import { router } from "expo-router";
import { useData } from "@/data/context";
import { Button, Card, Choices, Label, Rows, Screen, usePalette } from "@/components/ui";
import { calendarViews, dayKey, onDay } from "@/domain/rules";
import { calendarPeriod, nextConcert, shiftPeriod } from "@/domain/calendar";
import { SwipePeriod } from "@/components/swipe-period";

export default function Calendar() {
  const { data, clock } = useData();
  const p = usePalette();
  const [day, setDay] = useState(() => dayKey(new Date()));
  const [selection, setSelection] = useState<{ defaultView: string; value: string }>();
  const mode = selection?.defaultView === data.preferences.calendarView
    ? selection.value : data.preferences.calendarView;
  const weekly = mode === "周视图";
  const grid = mode === "月历" || weekly;
  const period = calendarPeriod(day, weekly);
  const periodKey = `${mode}:${dayKey(period.start)}`;
  const events = [...data.events].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const next = nextConcert(events, clock);
  const sale = [...events].filter((e) => e.status === "待开票" && e.saleAt && +new Date(e.saleAt) > clock).sort((a, b) => a.saleAt!.localeCompare(b.saleAt!))[0];
  function move(direction: number) { setDay((current) => shiftPeriod(current, weekly, direction)); }
  const countdown = (iso: string) => {
    const hours = Math.max(0, Math.ceil((+new Date(iso) - clock) / 3600000));
    return hours >= 24 ? Math.floor(hours / 24) + " 天 " + hours % 24 + " 小时" : hours + " 小时";
  };
  function renderPage(offset: number) {
    const page = calendarPeriod(shiftPeriod(day, weekly, offset), weekly);
    const pageEvents = events.filter((e) => +new Date(e.startAt) < +page.end && +new Date(e.endAt) > +page.start);
    return <>
      <Label large>{weekly ? `${dayKey(page.start)} 起的一周` : `${page.start.getFullYear()} 年 ${page.start.getMonth() + 1} 月`} · {pageEvents.length} 场</Label>
      {grid ? <>
        <View style={{ flexDirection: "row" }}>{["一", "二", "三", "四", "五", "六", "日"].map((label) =>
          <Text key={label} style={{ width: "14.2857%", color: p.muted, textAlign: "center" }}>{label}</Text>)}</View>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {page.days.map((key, i) => {
            const hits = key ? events.filter((e) => onDay(e, key)) : [];
            return key ? <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${key}，${hits.length}场`}
              accessibilityState={{ selected: key === day }} onPress={() => setDay(key)}
              style={{ width: "14.2857%", height: 56, paddingTop: 8, borderWidth: key === day ? 2 : 0, borderColor: p.accent, borderRadius: 12, alignItems: "center", gap: 7 }}>
              <Text style={{ color: p.text }}>{Number(key.slice(-2))}</Text>
              <View style={{ flexDirection: "row", gap: 2 }}>{hits.slice(0, 3).map((e) =>
                <View key={e.id} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: e.status === "已取消" ? p.muted : e.color }} />)}</View>
            </Pressable> : <View key={i} style={{ width: "14.2857%", height: 56 }} />;
          })}
        </View>
      </> : mode === "日程列表" ? <Rows events={pageEvents} /> : <View style={{ gap: 14 }}>
        {!pageEvents.length && <Label muted>本月暂无演出。</Label>}
        {pageEvents.map((e) => <View key={e.id} style={{ borderLeftWidth: 2, borderColor: p.accent, paddingLeft: 10 }}>
          <Label>{new Date(e.startAt).toLocaleString()} → {new Date(e.endAt).toLocaleString()}</Label><Rows events={[e]} />
        </View>)}
      </View>}
    </>;
  }
  return <Screen title="日历">
    <Card title="下一场">
      {next ? <><Rows events={[next]} /><Label>{+new Date(next.startAt) <= clock ? "正在进行" : "距开演 " + countdown(next.startAt)}</Label></> : <Label>暂无即将赴约的演出</Label>}
      {sale ? <><Label>待开票 · {sale.title} · 还有 {countdown(sale.saleAt!)}</Label>
        <Button subtle title="查看待开票演出" onPress={() => router.push({ pathname: "/event/[id]", params: { id: sale.id } })} /></> : <Label muted>暂无未来开票提醒</Label>}
    </Card>
    <Card>
      <Choices label="显示方式" value={mode} options={calendarViews}
        onChange={(value) => setSelection({ defaultView: data.preferences.calendarView, value })} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View accessibilityRole="adjustable" accessibilityLabel="切换日历周期"
          accessibilityActions={[{ name: "increment", label: "下一个周期" }, { name: "decrement", label: "上一个周期" }]}
          onAccessibilityAction={(e) => move(e.nativeEvent.actionName === "increment" ? 1 : -1)}>
          <Label muted>左右滑动切换{weekly ? "周" : "月份"}</Label>
        </View>
        <Button subtle title="今天" onPress={() => setDay(dayKey(new Date(clock)))} />
      </View>
      <SwipePeriod periodKey={periodKey} renderPage={renderPage} onMove={move} />
      {grid && <>
        <Label large>{day}</Label>
        <Rows events={events.filter((e) => onDay(e, day))} />
        <Button title="在这天添加演出" onPress={() => router.push({ pathname: "/edit", params: { day } })} />
        {weekly && <><Label large>本周全部演出</Label><Rows events={events.filter((e) => +new Date(e.startAt) < +period.end && +new Date(e.endAt) > +period.start)} /></>}
      </>}
    </Card>
  </Screen>;
}
