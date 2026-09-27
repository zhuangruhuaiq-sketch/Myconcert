import { useData } from "@/data/context";
import { Card, Label, Rows, Screen } from "@/components/ui";
export default function Cities() {
  const { data } = useData();
  const cities = [
    ...new Set(data.events.map((e) => e.city || "未填写城市")),
  ].sort();
  return (
    <Screen title="城市与场馆">
      <Card title="城市足迹">
        <Label>
          地图服务尚未接入。这里按城市展示全部行程，点击演出可查看档案；无需位置权限。
        </Label>
        {cities.length === 0 && (
          <Label>还没有行程，添加演出后会显示城市。</Label>
        )}
      </Card>
      {cities.map((city) => (
        <Card key={city} title={city}>
          <Rows
            events={data.events.filter(
              (e) => (e.city || "未填写城市") === city,
            )}
          />
        </Card>
      ))}
    </Screen>
  );
}
