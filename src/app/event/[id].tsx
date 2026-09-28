import { useState } from "react";
import { Image, Linking, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { randomUUID } from "expo-crypto";
import { useData } from "@/data/context";
import {
  Button,
  Card,
  Choices,
  Confirm,
  Field,
  Label,
  Screen,
} from "@/components/ui";
import {
  ConcertEvent,
  conflictsFor,
  localInput,
  money,
  parseLocal,
  parseMoney,
  totals,
} from "@/domain/rules";
import {
  activateReminders,
  cancelReminders,
  pickMedia,
  systemCalendar,
} from "@/services/device";

export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, change, busy } = useData();
  const e = data.events.find((x) => x.id === id);
  const [cost, setCost] = useState("");
  const [category, setCategory] = useState("交通");
  const [costId, setCostId] = useState("");
  const [task, setTask] = useState("");
  const [taskId, setTaskId] = useState("");
  const [role, setRole] = useState("票根");
  const [message, setMessage] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [reminderName, setReminderName] = useState("演出提醒");
  const [reminderId, setReminderId] = useState("");
  async function update(fn: (current: ConcertEvent) => ConcertEvent) {
    await change((b) => {
      if (!b.events.some((x) => x.id === id)) throw new Error("记录已删除");
      return {
        ...b,
        events: b.events.map((x) =>
          x.id === id ? { ...fn(x), updatedAt: new Date().toISOString() } : x,
        ),
      };
    });
  }
  if (!e)
    return (
      <Screen title="演出详情" back>
        <Label>演出不存在或已删除。</Label>
      </Screen>
    );
  const conflicts = conflictsFor(e, data.events);
  return (
    <Screen title="演出详情" back>
      <Card title={e.title}>
        <Label>
          {e.artists} · {e.type} · {e.status}
        </Label>
        <Label>
          {new Date(e.startAt).toLocaleString()} —{" "}
          {new Date(e.endAt).toLocaleString()}
        </Label>
        <Label>
          {e.city} · {e.venue}
        </Label>
        <Label>
          {e.address || "未填写详细地址"} · {e.seat || "未填写座位"}
        </Label>
        <Label>
          开票：{e.saleAt ? new Date(e.saleAt).toLocaleString() : "未设置"}
        </Label>
        <Label>
          购票：{e.platform || "未填写"} · 同行：{e.companions || "未填写"}
        </Label>
        <Label>标签：{e.tags.join("、") || "无"}</Label>
        <Label>私密备注：{e.note || "无"}</Label>
        <Label>
          评分：{e.rating ?? "未评分"} · 感受：{e.review || "等待你写下回忆"}
        </Label>
        {!!e.sourceUrl && (
          <Button
            title="打开保存的公开链接"
            onPress={() => Linking.openURL(e.sourceUrl!)}
          />
        )}
        {conflicts.length > 0 && (
          <Label>时间冲突：{conflicts.map((x) => x.title).join("、")}</Label>
        )}
        <Button
          title="编辑演出"
          onPress={() => router.push({ pathname: "/edit", params: { id } })}
        />
        <Button
          title="添加到系统日历"
          onPress={async () => setMessage(await systemCalendar(e))}
        />
      </Card>
      {!!message && (
        <Card>
          <Label>{message}</Label>
        </Card>
      )}
      <Card collapsible title={"费用 · " + money(totals([e]), e.currency)}>
        <Label>票价：{money(e.price, e.currency)}</Label>
        {e.expenses.map((x) => (
          <View key={x.id} style={{ gap: 6 }}>
            <Label>
              {x.category} {money(x.amount, e.currency)}
            </Label>
            <Button
              title={"编辑费用：" + x.category}
              onPress={() => {
                setCostId(x.id);
                setCategory(x.category);
                setCost((x.amount / 100).toFixed(2));
              }}
            />
            <Button
              title={"删除费用：" + x.category}
              disabled={busy}
              onPress={() =>
                update((c) => ({
                  ...c,
                  expenses: c.expenses.filter((a) => a.id !== x.id),
                }))
              }
            />
          </View>
        ))}
        <Field label="费用类别" value={category} onChange={setCategory} />
        <Field
          label={"费用金额（" + e.currency + "）"}
          value={cost}
          onChange={setCost}
        />
        <Button
          title={costId ? "保存费用修改" : "添加费用"}
          disabled={busy}
          onPress={async () => {
            if (!category.trim()) throw new Error("请填写费用类别");
            const x = {
              id: costId || randomUUID(),
              category: category.trim(),
              amount: parseMoney(cost),
            };
            await update((c) => ({
              ...c,
              expenses: [...c.expenses.filter((a) => a.id !== x.id), x],
            }));
            setCost("");
            setCostId("");
          }}
        />
      </Card>
      <Card collapsible title={"赴约准备 · " + e.preparation.filter((x) => x.done).length + "/" + e.preparation.length}>
        {e.preparation.map((x) => (
          <View key={x.id} style={{ gap: 6 }}>
            <Button
              title={(x.done ? "☑ " : "☐ ") + x.title}
              disabled={busy}
              onPress={() =>
                update((c) => ({
                  ...c,
                  preparation: c.preparation.map((a) =>
                    a.id === x.id ? { ...a, done: !a.done } : a,
                  ),
                }))
              }
            />
            <Button
              title={"编辑事项：" + x.title}
              onPress={() => {
                setTaskId(x.id);
                setTask(x.title);
              }}
            />
            <Button
              title={"删除事项：" + x.title}
              disabled={busy}
              onPress={() =>
                update((c) => ({
                  ...c,
                  preparation: c.preparation.filter((a) => a.id !== x.id),
                }))
              }
            />
          </View>
        ))}
        <Field label="准备事项" value={task} onChange={setTask} />
        <Button
          title={taskId ? "保存事项修改" : "添加准备事项"}
          disabled={busy}
          onPress={async () => {
            if (!task.trim()) throw new Error("请填写事项");
            const key = taskId || randomUUID();
            await update((c) => ({
              ...c,
              preparation: [
                ...c.preparation.filter((x) => x.id !== key),
                {
                  id: key,
                  title: task.trim(),
                  done: c.preparation.find((x) => x.id === key)?.done || false,
                },
              ],
            }));
            setTask("");
            setTaskId("");
          }}
        />
      </Card>
      <Card collapsible title={"本地附件 · " + (e.media || []).length}>
        <Choices
          label="附件用途"
          value={role}
          options={["票根", "电子票", "海报", "现场照片", "现场视频"]}
          onChange={setRole}
        />
        <Button
          title="选择照片或视频"
          disabled={busy}
          onPress={async () => {
            const media = await pickMedia(role);
            if (media)
              await update((c) => ({
                ...c,
                media: [...(c.media || []), media],
              }));
          }}
        />
        {(e.media || []).map((m) => (
          <View key={m.id} style={{ gap: 8 }}>
            <Label>
              {m.role} · {m.name}
            </Label>
            {m.kind === "image" ? (
              <Image
                source={{ uri: m.uri }}
                accessibilityLabel={m.name}
                style={{ width: "100%", height: 200 }}
                resizeMode="contain"
                onError={() =>
                  setMessage("附件无法读取，请重新选择；其他记录不受影响。")
                }
              />
            ) : (
              <Button
                title={"播放视频：" + m.name}
                onPress={() =>
                  router.push({
                    pathname: "/media",
                    params: { eventId: id, mediaId: m.id },
                  })
                }
              />
            )}
            <Button
              title={"移除附件：" + m.name}
              disabled={busy}
              onPress={() =>
                update((c) => ({
                  ...c,
                  media: (c.media || []).filter((x) => x.id !== m.id),
                }))
              }
            />
          </View>
        ))}
        <Label muted>OCR 尚未接入。可查看票根后点击“编辑演出”手动补全。</Label>
      </Card>
      <Card collapsible title={"提醒 · " + (e.reminders || []).length}>
        {(e.reminders || []).map((r) => (
          <View key={r.id} style={{ gap: 6 }}>
            <Label>
              {r.label} · {new Date(r.at).toLocaleString()}
            </Label>
            <Button
              title={"编辑提醒：" + r.label}
              onPress={() => {
                setReminderId(r.id);
                setReminderName(r.label);
                setReminderAt(localInput(r.at));
              }}
            />
            <Button
              title={"删除提醒：" + r.label}
              disabled={busy}
              onPress={async () => {
                await cancelReminders(id);
                await update((c) => ({
                  ...c,
                  reminders: c.reminders?.filter((x) => x.id !== r.id),
                }));
                setMessage("提醒设置已修改，请重新启用剩余提醒。");
              }}
            />
          </View>
        ))}
        <Choices
          label="提醒用途"
          value={reminderName}
          options={["开票提醒", "演出提醒", "出发提醒", "补充记录提醒"]}
          onChange={setReminderName}
        />
        <View style={{ gap: 6 }}>
          {[
            [7 * 1440, "提前7天"],
            [1440, "提前1天"],
            [180, "提前3小时"],
          ].map(([minutes, label]) => (
            <Button
              key={label}
              title={String(label)}
              onPress={() => {
                const base =
                  reminderName === "开票提醒"
                    ? e.saleAt
                    : reminderName === "补充记录提醒"
                      ? e.endAt
                      : e.startAt;
                if (!base) throw new Error("请先设置开票时间");
                setReminderAt(
                  localInput(
                    new Date(
                      +new Date(base) +
                        (reminderName === "补充记录提醒" ? 1 : -1) *
                          Number(minutes) *
                          60000,
                    ),
                  ),
                );
              }}
            />
          ))}
        </View>
        <Field
          label="自定义提醒时间（本机时间）"
          value={reminderAt}
          onChange={setReminderAt}
        />
        <Button
          title={reminderId ? "保存提醒修改" : "保存提醒设置"}
          disabled={busy}
          onPress={async () => {
            const at = parseLocal(reminderAt);
            if (+new Date(at) <= Date.now()) throw new Error("请选择未来时间");
            const key = reminderId || randomUUID();
            await cancelReminders(id);
            await update((c) => ({
              ...c,
              reminders: [
                ...(c.reminders || []).filter((x) => x.id !== key),
                { id: key, at, label: reminderName },
              ],
            }));
            setReminderId("");
            setMessage("设置已保存；请点击下方按钮启用系统提醒。");
          }}
        />
        <Button
          title="启用 / 重新登记系统提醒"
          disabled={e.status === "已取消"}
          onPress={async () => setMessage(await activateReminders(e))}
        />
        <Button
          title="停用系统提醒（保留设置）"
          onPress={async () => {
            await cancelReminders(id);
            setMessage("系统提醒已停用");
          }}
        />
      </Card>
      <Confirm
        title="删除这场演出"
        description="删除前建议先导出备份，此操作不能撤销。"
        onConfirm={async () => {
          await cancelReminders(id);
          await change((b) => ({
            ...b,
            events: b.events.filter((x) => x.id !== id),
          }));
          router.replace("/");
        }}
      />
    </Screen>
  );
}
