# ATM 资料结构方案（第 1 步）

2026-11-15 草稿。网站现在不读这些档案，改动不影响线上。

## 一、六种资料

| 中文 | 英文 | 是什么 | 例子 |
|---|---|---|---|
| 场地 | Venue | 一个地址，一栋楼里的一个地方 | 上海 Tango Palace |
| 小场地 | Room | 场地里的一个房间、一层楼 | 华杰大厦 7C2；名门大厦五楼红房子 |
| 团体 | Group | 一个舞社、教室或品牌，有一位或几位组织者 | Legends Tango、En Paz Studio |
| 组织者 | Organizer | 一个人 | 刘峥、Daisy Tsang |
| 活动 | Event | 网站上的一张卡：每周舞会、练习，或一次探戈节、马拉松 | 周日 After Sunday Milonga |
| 场次 | Occurrence | 活动的某一次。探戈节日程里叫 Session，每周活动显示为“下一场 / Next date” | 12/26 大师课 G1 |

## 二、它们怎么连起来

| 规则 | 资料怎么写 |
|---|---|
| 主办可以是团体、一位组织者，或几位组织者 | 活动卡的 host 是一串编号，可以混合：["G012"]、["O011"]、["O011","O030"] |
| 团体有一位或几位组织者 | 团体的 organizers 是组织者编号 |
| 一个组织者可以办好几个活动 | 不用另外写，从活动卡的 host 反查 |
| 一个场地可以办很多活动，可以分小场地 | 活动卡写 venue_id，必要时加 room_id |
| 同一时段、同一个小场地通常只有一个场次 | 自动检查：撞了就提醒，不会自动删除 |
| 一个活动可以在不同场地举行 | 活动卡写平常的场地；某一场在别处，就写在那个场次上（探戈节每个 Session 可以有自己的场地） |

## 三、每种资料的字段

场地 Venue

| 字段 | 说明 |
|---|---|
| id | V001 起 |
| city, country | 城市、国家 |
| name_en, name_local | 英文名、当地语言名 |
| address_local, address_en | 给出租车看的本地地址、英文地址 |
| directions, directions_images | 交通说明（各语言）、路线图 |
| rooms | 小场地清单 |

小场地 Room：id（如 V004-R1）、名称、楼层。

团体 Group：id（G001 起）、name_en、name_local、cities、organizers、links。

组织者 Organizer：id（O001 起）、name_en、name_local、groups。个人联系方式维持现在的写法，放在活动卡的 contacts，不集中到名单里。

活动 Event：现有字段全部保留，新增 venue_id、room_id、host。

场次 Occurrence：event_id、date、time、session 名称、venue_id / room_id（和平常不同时才写）、DJ、状态（正常 / 取消 / 改时间）。

## 四、草稿结果（程序自动整理）

| 项目 | 数量 |
|---|---|
| 活动卡 | 306 |
| 场地 | 139（场地写“待定”的 9 张卡先不算） |
| 团体 | 80 |
| 组织者 | 117 |
| 待确认 | 56 项，见待确认清单 |

程序：tools/draft_entities.py。草稿：data/entities-draft/（venues.json、groups.json、organizers.json、event_links.json、review.md）。

怎么判断：
- 同城市、地址相同或场地名相同，就合成一个场地。
- 主办名字里有 Tango、Studio、Club、探戈、땅고 等字，或和场地同名，就当团体；其他当个人。
- “团体（人名）”这种写法，拆成团体加组织者，例如 Legends Tango（Antimo y Sunny）。

## 五、接下来

1. 第 2 步：你看待确认清单，告诉我哪些合并、哪些分开、哪个是团体。
2. 第 3 步：活动卡加上 venue_id、host，原来的文字字段保留；加撞场检查；更新 Grok bot 的填资料须知。
3. 第 4 步：网站改从名单读地址和交通；可以加场地页、主办方页。
4. 第 5 步：场次，先从探戈节日程开始。
