import { useEffect, useRef, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Card, Label, Screen, usePalette } from "@/components/ui";
import { useData } from "@/data/context";
import { ConcertEvent, money } from "@/domain/rules";
import { eventFeed, eventPoster } from "@/domain/event-feed";
import { contrastText, tint } from "@/domain/poster-colors";
import { posterColor } from "@/domain/poster-image";

function EventCard({ event }: { event: ConcertEvent }) {
  const p = usePalette();
  const { data } = useData();
  const poster = eventPoster(event);
  const [failedUri, setFailedUri] = useState("");
  const mode = event.cardBackground || (poster && event.posterColor ? "gradient" : "default");
  const solid = event.cardSolidColor || event.posterColor || event.color;
  const gradient = mode === "gradient" && !!poster && poster.uri !== failedUri && !!event.posterColor;
  const colored = mode === "solid" || gradient;
  const ink = mode === "solid" ? contrastText(solid) : gradient ? "#201b29" : p.text;
  return <Pressable accessibilityRole="button" accessibilityLabel={"查看 " + event.title}
    onPress={() => router.push({ pathname: "/event/[id]", params: { id: event.id } })}
    style={({ pressed }) => ({ backgroundColor: mode === "solid" ? solid : gradient ? tint(event.posterColor!, 0.85) : p.card, borderRadius: 20, padding: 14, flexDirection: "row", gap: 14, overflow: "hidden", opacity: pressed ? 0.75 : 1 })}>
    {gradient && <LinearGradient colors={[event.posterColor!, tint(event.posterColor!, 0.85)]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 190, pointerEvents: "none" }} />}
    {poster && poster.uri !== failedUri ? <Image source={{ uri: poster.uri }} accessibilityLabel={event.title + "海报"}
      style={{ width: 98, height: 147, borderRadius: 12, backgroundColor: p.bg }} resizeMode="cover"
      onError={() => setFailedUri(poster.uri)} /> :
      <View style={{ width: 98, height: 147, borderRadius: 12, backgroundColor: p.bg, borderTopWidth: 4, borderColor: event.color, alignItems: "center", justifyContent: "center", gap: 12 }}>
        <Text style={{ fontSize: 30, color: p.accent }}>♫</Text><Text style={{ color: p.muted, fontSize: 12 }}>{poster ? "海报无法读取" : "未添加海报"}</Text>
      </View>}
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={{ color: ink, fontWeight: "700", fontSize: 18 }} numberOfLines={2}>{event.title}</Text>
      <Text style={{ color: colored ? ink : p.muted, fontSize: 13 }}>{new Date(event.startAt).toLocaleString([], { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</Text>
      <Text style={{ color: colored ? ink : p.muted, fontSize: 13 }} numberOfLines={2}>{[event.city, event.venue].filter(Boolean).join(" · ") || "地点待补充"}</Text>
      <Text style={{ color: ink, fontSize: 13 }} numberOfLines={2}>{event.artists || "艺人待补充"}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 3 }}>
        {!data.preferences.hidePrice && <Text style={{ color: colored ? ink : p.accent, fontWeight: "700" }}>{event.price === undefined ? "票价待补充" : money(event.price, event.currency)}</Text>}
        <Text style={{ color: colored ? ink : p.muted, fontSize: 12 }}>{event.status}</Text>
      </View>
    </View>
  </Pressable>;
}

export default function Events() {
  const { data, clock, ready, change } = useData();
  const processing = useRef(false);
  const tried = useRef(new Set<string>());
  useEffect(() => {
    if (!ready || processing.current) return;
    const pending = data.events.map((event) => ({ event, poster: eventPoster(event) }))
      .filter(({ event, poster }) => poster && !event.posterColor && !tried.current.has(event.id + "/" + poster.id));
    if (!pending.length) return;
    processing.current = true;
    void (async () => {
      try {
        for (const { event, poster } of pending) {
          tried.current.add(event.id + "/" + poster!.id);
          try {
            const color = await posterColor(poster!.uri);
            if (color) await change((previous) => ({ ...previous, events: previous.events.map((item) =>
              item.id === event.id && eventPoster(item)?.id === poster!.id && !item.posterColor
                ? { ...item, posterColor: color } : item) }));
          } catch { /* Keep the default background when an old poster cannot be read. */ }
        }
      } finally { processing.current = false; }
    })();
  }, [ready, data.events, change]);
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
