import { ConcertEvent } from '@/domain/rules';
const when = (days: number, hour: number) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(hour, 0, 0, 0); return d.toISOString(); };
const item = (id: string, title: string, artists: string, days: number, hour: number, status: ConcertEvent['status'], color: string, extra: Partial<ConcertEvent> = {}): ConcertEvent => ({ id, title, artists, type: '演唱会', startAt: when(days, hour), endAt: when(days, hour + 2), city: '上海', venue: '星光剧场', status, currency: 'CNY', color, tags: ['现场'], expenses: [], preparation: [{ id: `${id}-bag`, title: '带充电宝', done: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra });
export const demoEvents: ConcertEvent[] = [
  item('demo-next', '潮汐回声巡演', '北岸乐队', 5, 19, '已购票', '#9b7cff', { city: '杭州', venue: '运河音乐厅', price: 58000, seat: 'A 区 12 排 08 座', tags: ['摇滚', '朋友'] }),
  item('demo-sale', '夏日声场音乐节', '多组艺人', 16, 14, '待开票', '#ff8a65', { type: '音乐节', saleAt: when(2, 12), city: '南京', venue: '青奥体育公园', price: 0, tags: ['音乐节'] }),
  item('demo-conflict', '城市爵士夜', '午夜四重奏', 5, 20, '待观看', '#37bfa7', { type: 'Livehouse', venue: '蓝盒子 Livehouse', price: 22000 }),
  item('demo-past', '冬日幕间', '流光剧团', -21, 19, '已观看', '#e8b24e', { type: '话剧', city: '北京', venue: '人艺实验剧场', price: 38000, rating: 5, review: '灯光与现场乐队的配合很动人。', expenses: [{ id: 'metro', category: '交通', amount: 800 }] }),
];
