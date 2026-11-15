# ATM 资料结构方案（第 1 步）

2026-11-15 草稿（第二版）。网站现在不读这些名单，改动不影响线上。先做中国大陆和香港，其他地区暂缓。

## 一、七种资料

| 中文 | 英文 | 是什么 | 例子 |
|---|---|---|---|
| 场地 | Venue | 一个地址，一栋楼里的一个地方 | 上海 Tango Palace |
| 小场地 | Room | 场地里的一个房间、一层楼 | 华杰大厦 7C2；名门大厦五楼红房子 |
| 团体 | Group | 一个舞社、教室或品牌，有一位或几位组织者 | Legends Tango、En Paz Studio |
| 组织者 | Organizer | 一个人 | 刘峥、Daisy Tsang |
| DJ | DJ | 放音乐的人；可能同时是组织者 | 刘峥、Yelyn Woo |
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

团体 Group：id（G001 起）、name_en、name_local、cities、organizers、links、profile。

组织者 Organizer：id（O001 起）、name_en、name_local、groups、profile（介绍资料编号）。

DJ：id（D001 起）、name_en、name_local、cities、profile；也是组织者的，写 also_organizer。个人联系方式维持现在的写法，放在活动卡的 contacts，不集中到名单里。

活动 Event：现有字段全部保留，新增 venue_id、room_id、host。

场次 Occurrence：event_id、date、time、session 名称、venue_id / room_id（和平常不同时才写）、DJ、状态（正常 / 取消 / 改时间）。

## 四、介绍资料（图片和文字）

组织者、DJ、场地、团体，都可以有一份介绍：照片、简介、链接。活动卡上点名字就能看到。

| 字段 | 说明 |
|---|---|
| photo | 照片，放在 images/asia/profiles/，注明拍摄者 |
| bio_zh, bio, bio_ko | 中文、英文、韩文简介 |
| affiliation | 所属团体或场地 |
| links | Instagram、Facebook、微信、SoundCloud |
| sources | 资料来源（本人提供、海报、官网） |

已经预留好的：
- 资料库 asia/organizers.json：刘峥、王凯（Kai），各有照片、中英文简介和介绍页 /organizer/liu-zheng/、/organizer/kai/。
- 资料库 asia/djs.json：目前有 Yelyn Woo，照片和简介还空着。

接下来的规则：
- 同一个人既是组织者又是 DJ（例如刘峥），只写一份介绍，名单里两边都指向它。
- 场地和团体的介绍，以后放在 asia/venues.json、asia/groups.json，字段同上，场地多一项“场地照片”。
- 简介只写公开的或本人提供的内容；个人电话、微信号不放进介绍。
- 现有两份简介还没有韩文，以后补 bio_ko。

## 五、草稿结果（程序自动整理）

| 项目 | 数量 |
|---|---|
| 活动卡 | 306 |
| 场地 | 135（场地写“待定”的 9 张卡先不算） |
| 团体 | 79 |
| 组织者 | 115 |
| DJ | 99 |
| 中国大陆和香港待处理 | 40 项，见待确认清单第一部分 |

程序：tools/draft_entities.py。草稿：data/entities-draft/（venues.json、groups.json、organizers.json、djs.json、event_links.json、review.md）。已回答的题目记在 decisions.json，重跑程序也不会再问。

怎么判断：

- 同城市、地址相同或场地名相同，就合成一个场地。
- 主办名字里有 Tango、Studio、Club、探戈、땅고 等字，或和场地同名，就当团体；其他当个人。
- “团体（人名）”这种写法，拆成团体加组织者，例如 Legends Tango（Antimo y Sunny）。

## 六、接下来

1. 第 2 步：你看待确认清单，告诉我哪些合并、哪些分开、哪个是团体（11/15 已回答 4 项）。
2. 第 3 步：活动卡加上 venue_id、host，原来的文字字段保留；加撞场检查；更新 Grok bot 的填资料须知。
3. 第 4 步：网站改从名单读地址和交通；可以加场地页、主办方页。
4. 第 5 步：场次，先从探戈节日程开始。

## 七、已经直接修正的（中国大陆和香港，11/15）

| 活动 | 改了什么 | 来源 |
|---|---|---|
| Milonga X、Tres Amigos Milonga（K-97） | 补地址：香港中環蘭桂坊11號地下 | K-97 公开活动页 |
| 苏州探戈节（吴郡逸庭酒店） | 补地址：苏州市姑苏区平泷路158号 | 携程酒店页 |
| Sole Mio · DJ Fiona Szeto | 补中文地址：香港中環伊利近街51號地下高層 | 由英文地址翻译 |
| Volver! Javier Rodriguez（Danzstage） | 补中文地址：香港天后電氣道148號20樓2002室 | 网站上其他 Danzstage 活动卡 |
| 有微信号的活动卡 | 修好一个错误：部分卡片的详情打不开 | 网站程序 |
