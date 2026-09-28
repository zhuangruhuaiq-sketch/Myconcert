import * as Picker from "expo-document-picker";
import * as Images from "expo-image-picker";
import * as FS from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Calendar from "expo-calendar/legacy";
import { Platform } from "react-native";
import { randomUUID } from "expo-crypto";
import { Backup, ConcertEvent, Media } from "@/domain/rules";

export async function readImport() {
  const result = await Picker.getDocumentAsync({
    type: "*/*",
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const file = result.assets[0];
  return { name: file.name, text: await FS.readAsStringAsync(file.uri) };
}
export async function exportFile(name: string, content: string, mime: string) {
  const uri = FS.cacheDirectory + name;
  await FS.writeAsStringAsync(uri, content);
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("此设备无法打开分享面板");
  await Sharing.shareAsync(uri, {
    mimeType: mime,
    dialogTitle: "保存 Myconcert 文件",
  });
}
export async function pickMedia(role: string): Promise<Media | null> {
  const permission = await Images.requestMediaLibraryPermissionsAsync();
  if (!permission.granted)
    throw new Error("未获得相册权限，请在系统设置允许后重试");
  const result = await Images.launchImageLibraryAsync({
    mediaTypes: role === "海报" ? ["images"] : ["images", "videos"],
    quality: 0.8,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const id = randomUUID();
  const name =
    asset.fileName || id + (asset.type === "video" ? ".mp4" : ".jpg");
  const dir = FS.documentDirectory + "myconcert-media/";
  await FS.makeDirectoryAsync(dir, { intermediates: true });
  const uri = dir + id + "." + (name.split(".").pop() || "jpg");
  await FS.copyAsync({ from: asset.uri, to: uri });
  return {
    id,
    uri,
    name,
    role,
    kind: asset.type === "video" ? "video" : "image",
  };
}
export async function portableBackup(backup: Backup): Promise<Backup> {
  return {
    ...backup,
    events: await Promise.all(
      backup.events.map(async (e) => ({
        ...e,
        media: await Promise.all(
          (e.media || []).map(async (m) => {
            if (m.uri.startsWith("data:")) return m;
            const data = await FS.readAsStringAsync(m.uri, {
              encoding: FS.EncodingType.Base64,
            });
            return {
              ...m,
              uri:
                "data:" +
                (m.kind === "video" ? "video/mp4" : "image/jpeg") +
                ";base64," +
                data,
            };
          }),
        ),
      })),
    ),
  };
}
export async function materialize(
  events: ConcertEvent[],
): Promise<ConcertEvent[]> {
  const dir = FS.documentDirectory + "myconcert-media/";
  await FS.makeDirectoryAsync(dir, { intermediates: true });
  return Promise.all(
    events.map(async (e) => ({
      ...e,
      media: await Promise.all(
        (e.media || []).map(async (m) => {
          if (!m.uri.startsWith("data:"))
            throw new Error("导入附件必须包含文件内容，不能引用设备路径；请从原设备导出完整备份");
          const uri =
            dir + randomUUID() + (m.kind === "video" ? ".mp4" : ".jpg");
          await FS.writeAsStringAsync(
            uri,
            m.uri.slice(m.uri.indexOf(",") + 1),
            { encoding: FS.EncodingType.Base64 },
          );
          return { ...m, uri };
        }),
      ),
    })),
  );
}
export async function systemCalendar(e: ConcertEvent) {
  const result = await Calendar.createEventInCalendarAsync({
    title: e.title,
    startDate: new Date(e.startAt),
    endDate: new Date(e.endAt),
    location: e.venue + " · " + e.city,
  });
  return result.action === Calendar.CalendarDialogResultActions.canceled
    ? "已取消添加"
    : "已返回系统日历，请在日历中确认保存结果";
}
export async function cancelReminders(eventId: string) {
  const notifications = await import("expo-notifications");
  const all = await notifications.getAllScheduledNotificationsAsync();
  for (const n of all)
    if (n.content.data?.eventId === eventId)
      await notifications.cancelScheduledNotificationAsync(n.identifier);
}
export async function activateReminders(e: ConcertEvent) {
  const notifications = await import("expo-notifications");
  if (Platform.OS === "android")
    await notifications.setNotificationChannelAsync("myconcert", {
      name: "Myconcert 行程提醒",
      importance: notifications.AndroidImportance.DEFAULT,
    });
  const permission = await notifications.requestPermissionsAsync();
  if (!permission.granted)
    throw new Error("提醒设置已保存，但通知权限未授权；允许权限后请重新启用");
  await cancelReminders(e.id);
  let count = 0;
  try {
    for (const reminder of e.reminders || []) {
      if (+new Date(reminder.at) <= Date.now()) continue;
      await notifications.scheduleNotificationAsync({
        identifier: e.id + ":" + reminder.id,
        content: {
          title: "Myconcert · " + reminder.label,
          body: e.title,
          data: {
            eventId: e.id,
            url: "myconcert://event/" + encodeURIComponent(e.id),
          },
        },
        trigger: {
          type: notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(reminder.at),
          channelId: "myconcert",
        },
      });
      count++;
    }
  } catch (error) {
    await cancelReminders(e.id);
    throw new Error("登记提醒失败，本次提醒已撤回，请重试。" + String(error));
  }
  return "已向系统登记 " + count + " 条未来提醒；过去的提醒已跳过";
}
