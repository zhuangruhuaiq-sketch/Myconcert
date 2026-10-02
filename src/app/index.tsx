import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Card, Label, Screen, usePalette } from "@/components/ui";
import { useData } from "@/data/context";
import { ConcertEvent, money } from "@/domain/rules";
import { eventFeed, eventPoster } from "@/domain/event-feed";

function EventCard({ event }: { event: ConcertEvent }) {
  const p = usePalette();
  const { data } = useData();
  const poster = eventPoster(event);
  const [failedUri, setFailedUri] = useState("");
  return <Pressable accessibilityRole="button" accessibilityLabel={"查看 " + event.title}
    onPress={() => router.push({ pathname: "/event/[id]", params: { id: event.id } })}
    style={({ pressed }) => ({ backgroundColor: p.card, borderRadius: 20, padding: 14, flexDirection: "row", gap: 14, opacity: pressed ? 0.75 : 1 })}>
    {poster && poster.uri !== failedUri ? <Image source={{ uri: poster.uri }} accessibilityLabel={event.title + "海报"}
      style={{ width: 98, height: 147, borderRadius: 12, backgroundColor: p.bg }} resizeMode="cover"
      onError={() => setFailedUri(poster.uri)} /> :
      <View style={{ width: 98, height: 147, borderRadius: 12, backgroundColor: p.bg, borderTopWidth: 4, borderColor: event.color, alignItems: "center", justifyContent: "center", gap: 12 }}>
        <Text style={{ fontSize: 30, color: p.accent }}>♫</Text><Text style={{ color: p.muted, fontSize: 12 }}>{poster ? "海报无法读取" : "未添加海报"}</Text>
      </View>}
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={{ color: p.text, fontWeight: "700", fontSize: 18 }} numberOfLines={2}>{event.title}</Text>
      <Text style={{ color: p.muted, fontSize: 13 }}>{new Date(event.startAt).toLocaleString([], { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</Text>
      <Text style={{ color: p.muted, fontSize: 13 }} numberOfLines={2}>{[event.city, event.venue].filter(Boolean).join(" · ") || "地点待补充"}</Text>
      <Text style={{ color: p.text, fontSize: 13 }} numberOfLines={2}>{event.artists || "艺人待补充"}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 3 }}>
        {!data.preferences.hidePrice && <Text style={{ color: p.accent, fontWeight: "700" }}>{event.price === undefined ? "票价待补充" : money(event.price, event.currency)}</Text>}
        <Text style={{ color: p.muted, fontSize: 12 }}>{event.status}</Text>
      </View>
    </View>
  </Pressable>;
}

export default function Events() {
  const { data, clock } = useData();
  const sections = eventFeed(data.events, clock);
  return <Screen title="演出">
    <Label muted>下一场期待，和每一次值得记住的现场。</Label>
    {data.events.length === 0 ? <Card title="从第一场开始"><Label>点击下方「添加」，记录演出和海报。</Label></Card> :
      ([ ["待开演", sections.upcoming], ["已开演", sections.started] ] as const).map(([title, events]) =>
        <View key={title} style={{ gap: 12 }}>
          <Label large>{title} · {events.length}</Label>
          {!events.length && <Label muted>{title === "待开演" ? "暂无待开演的演出" : "还没有已开演的记录"}</Label>}
          {events.map((event) => <EventCard key={event.id} event={event} />)}
        </View>)}
    {!!data.events.length && <Label muted>按开演时间排序；待开演由近及远，已开演从最近往前。取消场次保留状态标识。</Label>}
  </Screen>;
}
