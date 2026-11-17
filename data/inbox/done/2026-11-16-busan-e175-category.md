# 釜山 E175 未进入大型列表：分类只认出名称里的 encuentro

- 活动编号：E175
- 问了谁：Shiao 报告问题；ATM 只读诊断（不是主办答复）
- 什么时候回的：2026-11-16（Shiao 于北京时间 14:44 说「让 Claude 来做」）
- 来源：https://tangoweekend.org/zh/asia/?card=E175 ；现网 JSON https://data.tangoweekend.org/asia/events-core.json

## 用户授权范围

Shiao 授权 Claude 修复这个问题并测试，开待审 PR。暂不上线。不得自动合并代码，不得部署。

诊断是资料。请 Claude 自己核实后再决定怎么改，不必按某一行或某一份补丁来做。

## 答案
- 活动：RoyBeDDong in Busan，2026-12-18 至 2026-12-20
- 现网字段：kind 为 event，type 为 encuentro，featured 为 true，hidden 为 false
- 现网 asia/atm-home.js 的 catOf 只按名称识别 encuentro；类型分支没有认出 type encuentro，实际算出 milonga
- 因此 isBig、isFeat 为 false；featured 字段没有参与 isFeat，这张卡被大型列表排除
- 现网与 main 上的这个函数相同
- 日期、隐藏、国家、缓存不是这次被排除的原因
- 未做浏览器 DOM 复现；结论来自用实际数据运行分类函数

## 验收
- E175 归入合理的大型类别
- 现有普通舞会和练习不要被误放进大型列表
- 补回归测试
- 活动内容和其他功能保持不变
- 交待审 PR，等 Shiao 批准后再上线

## 附件
无

## 还没问到的
无
