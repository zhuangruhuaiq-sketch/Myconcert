import { useState } from "react";
import { useData } from "@/data/context";
import { Button, Card, Choices, Confirm, Field, Label, Screen } from "@/components/ui";
import { calendarViews, defaults } from "@/domain/rules";
import { cancelReminders } from "@/services/device";

export default function Settings() {
  const { data, change } = useData();
  const [message, setMessage] = useState("");
  const [cityDraft, setCityDraft] = useState<string | null>(null);
  const city = cityDraft ?? data.preferences.defaultCity;
  return (
    <Screen title="我的">
      <Card title="基础设置">
        <Choices
          label="主题"
          value={data.preferences.theme}
          options={["system", "light", "dark"] as const}
          onChange={(theme) => {
            void change((b) => ({
              ...b,
              preferences: { ...b.preferences, theme },
            })).catch((e) => setMessage(String(e)));
          }}
        />
        <Label muted>system 跟随系统 · light 浅色 · dark 深色</Label>
        <Choices
          label="演出列表票价"
          value={data.preferences.hidePrice ? "隐藏" : "显示"}
          options={["显示", "隐藏"] as const}
          onChange={(value) => {
            void change((b) => ({
              ...b,
              preferences: { ...b.preferences, hidePrice: value === "隐藏" },
            })).catch((e) => setMessage(String(e)));
          }}
        />
        <Button title="恢复默认设置" subtle onPress={async () => {
          await change((b) => ({ ...b, preferences: defaults }));
          setCityDraft(null);
          setMessage("设置已恢复默认");
        }} />
      </Card>
      <Card title="新建演出">
        <Field label="默认城市（留空则不预填）" value={city} onChange={setCityDraft} />
        <Button title="保存默认城市" subtle onPress={async () => {
          await change((b) => ({
            ...b,
            preferences: { ...b.preferences, defaultCity: city.trim() },
          }));
          setCityDraft(null);
          setMessage("默认城市已保存");
        }} />
        <Choices
          label="默认币种"
          value={data.preferences.defaultCurrency}
          options={["CNY", "HKD", "TWD", "USD", "EUR", "JPY"] as const}
          onChange={(defaultCurrency) => {
            void change((b) => ({
              ...b,
              preferences: { ...b.preferences, defaultCurrency },
            })).catch((e) => setMessage(String(e)));
          }}
        />
        <Label muted>只影响新建演出，已有记录保持原样。</Label>
      </Card>
      <Card title="日历与发现">
        <Choices
          label="日历默认视图"
          value={data.preferences.calendarView}
          options={calendarViews}
          onChange={(calendarView) => {
            void change((b) => ({
              ...b,
              preferences: { ...b.preferences, calendarView },
            })).catch((e) => setMessage(String(e)));
          }}
        />
        <Button title="清除发现缓存" subtle onPress={async () => {
          await change((b) => ({
            ...b,
            discovery: { ...b.discovery, results: [], lastSuccess: {} },
          }));
          setMessage("发现缓存已清除");
        }} />
      </Card>
      <Card title="功能与隐私" collapsible>
        <Label>
          本地模式：尚未实现账户登录与云同步。演出记录默认仅保存在本机。
        </Label>
        <Label>
          OCR 尚未接入。添加演出时可读取公开票务链接；页面不公开信息、限制访问或浏览器跨域限制时需手动填写。地图内置世界地理数据、中国城市行政区域和常用城市坐标；在线街道细节来自 OpenStreetMap，未收录城市通过 Photon 查询。海外城市边界通过 Overpass 按城市名称和城市中心坐标查询并缓存，不发送演出内容或手机定位。查询仅发送城市名，不发送演出详情、备注或附件；无需定位权限。网络不可用时仍可浏览内置底图和城市档案。
        </Label>
        <Label>
          原生小组件及分享图片尚未实现。详情支持 myconcert://event/演出ID 深链接。
        </Label>
      </Card>
      <Card title="本地数据">
        <Confirm
          title="删除所有本地演出"
          description="会删除本机演出记录，此操作不能撤销。附件文件和迁移备份可能仍留在应用空间，彻底清除请使用系统清除应用数据。"
          onConfirm={async () => {
            for (const e of data.events) await cancelReminders(e.id);
            await change((b) => ({ ...b, events: [] }));
            setMessage("本机演出已删除");
          }}
        />
      </Card>
      {!!message && <Card><Label>{message}</Label></Card>}
    </Screen>
  );
}
