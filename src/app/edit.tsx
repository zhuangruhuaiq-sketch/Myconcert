import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { randomUUID } from "expo-crypto";
import { useData } from "@/data/context";
import { Button, Card, Choices, Field, Label, Screen } from "@/components/ui";
import {
  ConcertEvent,
  conflictsFor,
  eventTypes,
  localInput,
  parseLocal,
  parseMoney,
  statuses,
  validateEvent,
} from "@/domain/rules";
import { cancelReminders } from "@/services/device";

export default function Edit() {
  const { id, day } = useLocalSearchParams<{ id?: string; day?: string }>();
  const { data, ready } = useData();
  const event = data.events.find((e) => e.id === id);
  return (
    <Screen title={id ? "编辑演出" : "添加演出"} back>
      {ready &&
        (id && !event ? (
          <Label>记录不存在或已删除。</Label>
        ) : (
          <Form key={id || day || "new"} initial={event} day={day} />
        ))}
    </Screen>
  );
}
function Form({ initial, day }: { initial?: ConcertEvent; day?: string }) {
  const { data, change, busy } = useData();
  const [draft, setDraft] = useState(() => {
    const start =
      initial?.startAt ||
      (day
        ? new Date(day + "T19:00:00").toISOString()
        : new Date(Date.now() + 86400000).toISOString());
    const now = new Date().toISOString();
    return (
      initial ||
      ({
        id: randomUUID(),
        title: "",
        artists: "",
        city: "",
        venue: "",
        type: "演唱会",
        status: "待观看",
        startAt: start,
        endAt: new Date(+new Date(start) + 7200000).toISOString(),
        price: 0,
        currency: "CNY",
        color: "#9b7cff",
        tags: [],
        expenses: [],
        preparation: [],
        media: [],
        reminders: [],
        createdAt: now,
        updatedAt: now,
      } as ConcertEvent)
    );
  });
  const [start, setStart] = useState(localInput(draft.startAt));
  const [end, setEnd] = useState(localInput(draft.endAt));
  const [sale, setSale] = useState(
    draft.saleAt ? localInput(draft.saleAt) : "",
  );
  const [price, setPrice] = useState(((draft.price || 0) / 100).toFixed(2));
  const [rating, setRating] = useState(
    draft.rating === undefined ? "" : String(draft.rating),
  );
  const [tags, setTags] = useState(draft.tags.join(", "));
  const [advanced, setAdvanced] = useState(false);
  const [collision, setCollision] = useState<ConcertEvent | null>(null);
  const [warning, setWarning] = useState("");
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
      rating: rating === "" ? undefined : Number(rating),
      tags: tags
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean),
      updatedAt: new Date().toISOString(),
    });
    const conflicts = conflictsFor(next, data.events);
    if (conflicts.length) {
      setCollision(next);
      setWarning("时间冲突：" + conflicts.map((e) => e.title).join("、"));
      return;
    }
    await persist(next);
  }
  return (
    <>
      <Card title="基本行程">
        {field("演出名称 *", "title")}
        {field("艺人 / 阵容", "artists")}
        <Choices
          label="类型"
          value={draft.type}
          options={eventTypes}
          onChange={(v) => patch("type", v)}
        />
        {field("城市", "city")}
        {field("场馆", "venue")}
        <Label muted>时间使用本机时区，格式：2026-10-01T19:30</Label>
        <Field
          label="开始时间 *"
          value={start}
          onChange={(v) => {
            setStart(v);
            setCollision(null);
          }}
        />
        <Field
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
          <Field
            label="开票时间（可空）"
            value={sale}
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
          <Field
            label="评分（0—5，可空）"
            value={rating}
            onChange={(v) => {
              setRating(v);
              setCollision(null);
            }}
          />
          {field("观后感", "review", true)}
          {field("公开演出链接", "sourceUrl")}
          <Label muted>
            链接会保存到档案；本版本尚未接入解析服务，请手动补全信息。
          </Label>
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
