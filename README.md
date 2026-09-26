# Myconcert

Myconcert 是一个原创的个人观演日历：在离线时也能记录演唱会、音乐节、Livehouse、话剧和音乐剧，并沉淀票务、费用、准备清单与观后感。

## 快速开始

```bash
npm install
npm run start
npm run typecheck
npm test
```

项目采用 Expo Router。应用显示名、深链接 scheme 与 slug 为 `Myconcert` / `myconcert`。iOS/Android 包标识暂为 `com.placeholder.myconcert`，发布前请替换为已拥有的反向域名。

图标占位方案是深紫色舞台拱门与金色行程勾线，源文件为 `assets/images/myconcert-mark.svg`；构建发布时请从该原创 SVG 导出各平台所需的 PNG 尺寸并替换 Expo 默认图标文件。

## 已实现

- SQLite 本地优先存储、原创演示数据、月历、日程、下一场倒计时、状态提示、筛选、统计和按城市的地图降级列表。
- 手动新建、冲突提示、删除、状态更新、费用和赴约清单；金额以分为单位存储。
- JSON 导入，JSON / CSV / ICS 文本导出；ICS 写入开始和结束时间。

## 本地模式与可选服务

默认无需账户和网络，数据只保存在设备 SQLite 存储中，票根、照片、备注与位置默认不公开。复制 `.env.example` 为 `.env` 后才可配置云同步、OCR、公开链接解析或地图服务；未配置时产品会回退到手动录入和按城市列表。

`supabase/migrations/202609260001_myconcert.sql` 提供可选的账户同步表和 RLS 策略。客户端不内置密钥或伪造云同步；接入 Supabase Auth 和对象存储后才能启用。原生通知、系统日历写入、相册附件、OCR、公开链接解析、地图和原生小组件仍需相应权限/服务实现。

## 验证

`npm run typecheck` 检查 TypeScript，`npm test` 验证时间冲突、相邻场次、整数金额累计和 ICS 结束时间。启动后可验证新建记录立即刷新日历、列表和统计。
