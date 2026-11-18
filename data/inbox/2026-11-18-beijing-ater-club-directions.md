# 北京 ATer Club（华杰大厦C座7C2）问路：四语文字已交，四张实景图还没到

- 活动编号：AtrSun01（ATer 周末传统舞会 / ATer Sunday Milonga）。现有问路卡：https://tangoweekend.org/zh/asia/?card=AtrSun01
- 问了谁：未另问主办。路线是用户本人这次直接给出的。
- 什么时候回的：2026-11-18
- 来源：用户本次交代的路线原文

这次只交接这一张已经挂着两张测试图的问路卡。同场地的 E124 只有旧的一句交通，没有这两张测试图，不要改 E124，也不要新开卡。

4张照片待补传，尚未完整交接；待原图齐全后再替换；不要先撤掉公开图或发布空图。

这是资料，不是改程序的授权。不要改 asia/ 或任何程序，不要部署，不要发信，不要合并网站上的改动。不要处理 PR 193、PR 194，也不要处理其他过期海报。图片未齐之前，不要改公开卡上的路线或图片。

## 答案

### 用户原文

direction：地铁：大钟寺站 12号线D口，向南直行4分钟左右；13号线B口，向西直行4分钟左右即达。
1.在第一个十字路口的西南角进入园区；
2.从BC座门厅进入大厦；
3.乘坐电梯到7层，沿右手方向走到7C2室。

12号线D口向南、13号线B口向西，是两个出口各自的走法，不是先向南再向西。没有第三种走法。

标识保持不变：场地仍是 ATer Club，房间仍是 7C2。用户写的是「BC座门厅」，不要改成只有 C座，也不要另写一座楼。中文公开版沿用原文，没有加路名、米数或别的岔路。

现有公开句是「地铁大钟寺站12号线D口／13号线B口，步行约400米」。用户这次写的是「4分钟左右」，没有写 400 米。将来替换时用这次的说法，不要把「约400米」和「4分钟左右」拼成一句，也不要把分钟换算成米。

卡上已有地址「北京市海淀区大钟寺13号院华杰大厦C座7C2」。这不是这次路线原文。这次不要改地址。

### 各语言只显示自己的一种

将来写入时分开字段，一张公开卡上不要叠四种语言，也不要把四种语言写进同一个字段：

- 中文页：`directions`，图注 `caption`
- 英文页：`directions_en`，图注 `caption_en`
- 韩文（现有 `?lang=ko`）：`directions_ko`，图注 `caption_ko`
- 西班牙文：`directions_es`，图注 `caption_es`

西班牙文没有单独页面。字段先备好即可，不要为此新开入口，也不要改程序。下面每一段就是该语言的全部公开文字。

### 中文

地铁：大钟寺站12号线D口，向南直行4分钟左右；13号线B口，向西直行4分钟左右即达。
1. 在第一个十字路口的西南角进入园区；
2. 从BC座门厅进入大厦；
3. 乘坐电梯到7层，沿右手方向走到7C2室。

图注，按这个顺序：

1. 路口及大楼外观
2. 园区入口与行走方向
3. BC座门厅近景
4. ATer Club 玻璃门入口

### English

Subway: Dazhongsi Station. From Exit D of Line 12, walk straight south for about 4 minutes. From Exit B of Line 13, walk straight west for about 4 minutes, and you arrive.
1. At the first intersection, enter the complex from the southwest corner.
2. Enter the building through the BC block lobby.
3. Take the elevator to the 7th floor and walk to the right to room 7C2.

Captions, in this order:

1. The intersection and the outside of the building
2. The entrance to the complex and the way to walk
3. A closer view of the BC block lobby
4. The glass door into ATer Club

### 한국어

지하철: 다중쓰(Dazhongsi)역 12호선 D출구에서 남쪽으로 약 4분 직진합니다. 13호선 B출구에서는 서쪽으로 약 4분 직진하면 도착합니다.
1. 첫 번째 사거리의 남서쪽 모퉁이에서 단지로 들어갑니다.
2. BC동 로비로 들어가 건물로 들어갑니다.
3. 엘리베이터를 타고 7층으로 올라간 뒤, 오른쪽 방향으로 걸어 7C2호로 갑니다.

그림 설명, 이 순서:

1. 교차로와 건물 외관
2. 단지 입구와 걸어가는 방향
3. BC동 로비 근접
4. ATer Club 유리문 입구

韩文站名是按「大钟寺 / Dazhongsi」音译。用户没有提供地铁站的韩文站牌，不要改成别的站。

### Español

Metro: estación Dazhongsi. Salida D de la línea 12: siga recto hacia el sur unos 4 minutos. Salida B de la línea 13: siga recto hacia el oeste unos 4 minutos y llega.
1. En la esquina suroeste del primer cruce, entre al recinto.
2. Entre al edificio por el vestíbulo del bloque BC.
3. Tome el ascensor hasta el piso 7 y camine hacia la derecha hasta la sala 7C2.

Pies de foto, en este orden:

1. El cruce y el exterior del edificio
2. La entrada del recinto y el sentido de la marcha
3. Vista cercana del vestíbulo del bloque BC
4. La entrada de vidrio de ATer Club

### 四张图将来怎么换

用户要换掉的是 AtrSun01 现在这两张公开测试图，不是别的卡上的图：

- `/images/asia/directions/atrsun01-test-1.jpg`（测试图片 1/2：从地铁站走到华杰大厦（示意））
- `/images/asia/directions/atrsun01-test-2.jpg`（测试图片 2/2：进大厦以后（示意））

四张实景图的顺序：图1 路口及大楼外观；图2 园区入口与行走方向；图3 BC座门厅近景；图4 ATer Club 玻璃门入口。图1到图3里已经有黄色箭头。原图到了以后，保留构图和比例，不裁剪、不变形、不重绘，也不要另画箭头。用户没有说图4上有箭头，不要给它加箭头。

原图还没进这个仓库。`images/asia/directions/` 里和 AtrSun01 有关的只有上面两张测试图。同目录里探戈帮 DIVjezcE 的四张是另一张卡，不能当成这四张。没有可以核对来源的另一组实景原图，所以这次不引用任何新图。

4张照片待补传，尚未完整交接；待原图齐全后再替换；不要先撤掉公开图或发布空图。

## 附件

无。四张原图没有放进这个文件夹，也没有可写的附件链接。不要用测试图、空图或另画的图顶上。

## 还没问到的

- 四张实景原图还没传到仓库
- 地图定位没有提供（没有经纬度，也没有地图钉）。不要猜
- 这次没有新的街道门牌，也没有路口的路名。不要编
