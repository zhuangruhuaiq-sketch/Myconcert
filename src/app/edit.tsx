import { useState } from "react";
import { Image, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { randomUUID } from "expo-crypto";
import { useData } from "@/data/context";
import { Button, Card, Choices, Field, Label, Screen } from "@/components/ui";
import {
  ConcertEvent,
  FoundShow,
  conflictsFor,
  eventTypes,
  localInput,
  parseLocal,
  parseMoney,
  statuses,
  validateEvent,
} from "@/domain/rules";
import { cancelReminders, pickMedia, saveTicketPoster } from "@/services/device";
import { extractTicketUrl, fetchTicketPage } from "@/domain/ticket-link";
import { eventPoster } from "@/domain/event-feed";
import { DateTimeField } from "@/components/date-time-field";
import { StarRating } from "@/components/star-rating";
import { CityField } from "@/components/city-field";

export default function Edit() {
  const { id, day, found: foundParam } = useLocalSearchParams<{ id?: string; day?: string; found?: string }>();
  const { data, ready } = useData();
  const event = data.events.find((e) => e.id === id);
  let found: FoundShow | undefined;
  if (foundParam) {
    try {
      const candidate: unknown = JSON.parse(foundParam);
      if (candidate && typeof candidate === "object" &&
        ["title", "artists", "city", "venue", "startAt", "platform", "url"].every((key) => typeof (candidate as Record<string, unknown>)[key] === "string") &&
        Number.isFinite(Date.parse((candidate as FoundShow).startAt)) && /^https:\/\//.test((candidate as FoundShow).url))
        found = candidate as FoundShow;
    }
    catch { /* Invalid shared route data leaves the standard form usable. */ }
  }
  return (
    <Screen title={id ? "编辑演出" : "添加演出"} back={!!id}>
      {ready &&
        (id && !event ? (
          <Label>记录不存在或已删除。</Label>
        ) : (
          <Form key={id || day || foundParam || "new"} initial={event} day={day} found={found} />
        ))}
    </Screen>
  );
}
function Form({ initial, day, found }: { initial?: ConcertEvent; day?: string; found?: FoundShow }) {
  const { data, change, busy } = useData();
  const [draft, setDraft] = useState(() => {
    const start =
      initial?.startAt || found?.startAt ||
      (day
        ? new Date(day + "T19:00:00").toISOString()
        : new Date(Date.now() + 86400000).toISOString());
    const now = new Date().toISOString();
    return (
      initial ||
      ({
        id: randomUUID(),
        title: found?.title || "",
        artists: found?.artists || "",
        city: found?.city || data.preferences.defaultCity,
        venue: found?.venue || "",
        type: "其他",
        status: "待观看",
        startAt: start,
        endAt: new Date(+new Date(start) + 7200000).toISOString(),
        price: 0,
        currency: data.preferences.defaultCurrency,
        color: "#9b7cff",
        tags: [],
        expenses: [],
        preparation: [],
        media: [],
        reminders: [],
        createdAt: now,
        updatedAt: now,
        platform: found?.platform,
        sourceUrl: found?.url,
      } as ConcertEvent)
    );
  });
  const [start, setStart] = useState(localInput(draft.startAt));
  const [end, setEnd] = useState(localInput(draft.endAt));
  const [sale, setSale] = useState(
    draft.saleAt ? localInput(draft.saleAt) : "",
  );
  const [price, setPrice] = useState(((draft.price || 0) / 100).toFixed(2));
  const [rating, setRating] = useState(draft.rating);
  const [tags, setTags] = useState(draft.tags.join(", "));
  const [advanced, setAdvanced] = useState(false);
  const [collision, setCollision] = useState<ConcertEvent | null>(null);
  const [warning, setWarning] = useState("");
  const [linkMessage, setLinkMessage] = useState("");
  const poster = eventPoster(draft);
  const patch = <K extends keyof ConcertEvent>(
    key: K,
    value: ConcertEvent[K],
  ) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setCollision(null);
  };
  const field = (
    label: string,
    key:
      | "title"
      | "artists"
      | "city"
      | "venue"
      | "address"
      | "currency"
      | "platform"
      | "seat"
      | "note"
      | "review"
      | "sourceUrl"
      | "companions"
      | "color",
    multiline = false,
  ) => (
    <Field
      label={label}
      value={draft[key] || ""}
      onChange={(v) => patch(key, v)}
      multiline={multiline}
    />
  );
  async function persist(next: ConcertEvent) {
    if (initial) {
      const timesChanged =
        next.startAt !== initial.startAt ||
        next.endAt !== initial.endAt ||
        next.saleAt !== initial.saleAt ||
        next.status === "已取消";
      if (timesChanged) {
        await cancelReminders(next.id);
        setWarning("原系统提醒已取消；保存后请在详情重新启用提醒。");
      }
    }
    await change((b) => {
      if (initial && !b.events.some((e) => e.id === next.id))
        throw new Error("记录已被删除");
      return {
        ...b,
        events: initial
          ? b.events.map((e) => (e.id === next.id ? { ...e, ...next } : e))
          : [...b.events.filter((e) => e.id !== next.id), next],
      };
    });
    router.replace({ pathname: "/event/[id]", params: { id: next.id } });
  }
  async function save() {
    const next = validateEvent({
      ...draft,
      startAt: parseLocal(start),
      endAt: parseLocal(end),
      saleAt: sale ? parseLocal(sale) : undefined,
      price: parseMoney(price || "0"),
      rating,
      tags: tags
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean),
      updatedAt: new Date().toISOString(),
    });
    if (found && data.events.some((event) => event.id !== next.id && (
      event.sourceUrl === next.sourceUrl ||
      (event.startAt === next.startAt && event.city === next.city && event.venue === next.venue && event.artists === next.artists)
    ))) {
      setWarning("这场演出已在记录中，无需重复收藏。");
      return;
    }
    const conflicts = conflictsFor(next, data.events);
    if (conflicts.length) {
      setCollision(next);
      setWarning("时间冲突：" + conflicts.map((e) => e.title).join("、"));
      return;
    }
    await persist(next);
  }
  async function fillFromLink() {
    const url = extractTicketUrl(draft.sourceUrl || "");
    patch("sourceUrl", url);
    const details = await fetchTicketPage(url, Platform.OS !== "web");
    let media = null;
    if (details.poster) {
      try { media = await saveTicketPoster(details.poster); }
      catch { /* Keep the other parsed fields when the image host rejects a download. */ }
    }
    setDraft((previous) => ({
      ...previous,
      sourceUrl: url,
      title: details.title || previous.title,
      artists: details.artists || previous.artists,
      city: details.city || previous.city,
      venue: details.venue || previous.venue,
      type: details.type || previous.type,
      platform: details.platform || previous.platform,
      media: media ? [media, ...(previous.media || []).filter((item) => item.role !== "海报")] : previous.media,
    }));
    if (details.start) {
      setStart(details.start);
      setEnd(localInput(new Date(+new Date(details.start) + 7200000)));
    }
    setCollision(null);
    const filled = [
      details.title && "名称", details.artists && "艺人", details.city && "城市",
      details.venue && "场馆", details.start && "开始时间", media && "海报",
    ].filter(Boolean).join("、");
    setLinkMessage(`已填入：${filled}。请下滑核对。${details.start ? "" : "演出时间请手动选择。"}${details.poster && !media ? "海报下载失败，可手动添加。" : ""}`);
  }
  return (
    <>
      <Card title="从票务链接填写">
        <Field label="演出分享内容或详情链接" value={draft.sourceUrl || ""} onChange={(value) => {
          patch("sourceUrl", value);
          setLinkMessage("");
        }} multiline />
        <Button title="解析并填写" onPress={fillFromLink} />
        {!!linkMessage && <Label>{linkMessage}</Label>}
        <Label muted>支持大麦、秀动、猫眼等公开详情页，并尝试读取纷玩岛、票星球的公开资料。多场次、时间待定或平台限制访问时，请手动补全。</Label>
      </Card>
      <Card title="基本行程">
        {poster && <Image source={{ uri: poster.uri }} accessibilityLabel="演出海报预览"
          style={{ width: "100%", height: 220, borderRadius: 12 }} resizeMode="contain" />}
        <Button subtle title={poster ? "更换海报" : "添加演出海报"} onPress={async () => {
          const media = await pickMedia("海报");
          if (media) patch("media", [media, ...(draft.media || []).filter((m) => m.role !== "海报")]);
        }} />
        {poster && <Button subtle title="移除海报" onPress={() => patch("media", (draft.media || []).filter((m) => m.role !== "海报"))} />}
        {field("演出名称 *", "title")}
        {field("艺人 / 阵容", "artists")}
        <Choices
          label="类型"
          value={draft.type}
          options={eventTypes}
          onChange={(v) => patch("type", v)}
        />
        <CityField value={draft.city} recorded={[...new Set(data.events.map((event) => event.city.trim()).filter(Boolean))]}
          onChange={(value) => patch("city", value)} />
        {field("场馆", "venue")}
        <Label muted>点按日期选择，时刻按本机时区填写。</Label>
        <DateTimeField
          label="开始时间 *"
          value={start}
          onChange={(v) => {
            setStart(v);
            setCollision(null);
          }}
        />
        <DateTimeField
          label="结束时间 *"
          value={end}
          onChange={(v) => {
            setEnd(v);
            setCollision(null);
          }}
        />
        <Choices
          label="状态"
          value={draft.status}
          options={statuses}
          onChange={(v) => patch("status", v)}
        />
      </Card>
      <Button
        subtle
        title={advanced ? "收起票务与记录" : "展开票务与记录"}
        onPress={() => setAdvanced((v) => !v)}
      />
      {advanced && (
        <Card title="票务与感受">
          <Field
            label="票价（元，最多两位小数）"
            value={price}
            onChange={(v) => {
              setPrice(v);
              setCollision(null);
            }}
          />
          {field("币种（CNY / USD / EUR 等）", "currency")}
          <DateTimeField
            label="开票时间（可空）"
            value={sale}
            optional
            onChange={(v) => {
              setSale(v);
              setCollision(null);
            }}
          />
          {field("购票平台", "platform")}
          {field("座位", "seat")}
          {field("详细地址（私密）", "address")}
          {field("订单 / 取票备注（私密）", "note", true)}
          {field("同行人", "companions")}
          <Field
            label="标签（逗号分隔）"
            value={tags}
            onChange={(v) => {
              setTags(v);
              setCollision(null);
            }}
          />
          <StarRating
            value={rating}
            onChange={(value) => {
              setRating(value);
              setCollision(null);
            }}
          />
          {field("观后感", "review", true)}
          {field("卡片配色（#RRGGBB）", "color")}
        </Card>
      )}
      {!!warning && (
        <Card>
          <Label>{warning}</Label>
        </Card>
      )}
      {collision && (
        <Button
          title="仍然保存冲突行程"
          disabled={busy}
          onPress={() => persist(collision)}
        />
      )}
      <Button title="保存演出" disabled={busy} onPress={save} />
    </>
  );
}
