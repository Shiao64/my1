# ATM 导航与交互规格（Navigation & Interaction Spec）

This file did not exist in the repo. It is the navigation and interaction spec for Asia Tango Map. Later sections can be added here. The rules below are the ones for the favorites row and an opened card.

Related intent copy stays in `docs/star-intent-requirements.md`. Where that file and this one differ on unfavorite, this section wins for the favorites row and the opened card.

Visitor-facing Chinese uses 「信息」 for organizer updates and notices.

## 收藏活动行与打开的卡片（Favorites row and opened card）

The favorites row is the homepage block 已收藏 N 个活动 / N saved events (收藏活动). Opening one of its cards goes to that event’s card (`?card=`), featured or regular. The saved-events sheet (我的收藏 / My saved events) is the same row opened as a list.

### Star size

- On the favorites row and on an opened card, the star’s tap target is at least 44×44px.
- That matches the stars on homepage cards and in the saved list.
- The glyph scales with the target (about 26px inside the 44px control) so the opened card does not keep the old 34×34 control and 20px glyph.

### What the star does

- On an opened card that is already saved, the star means 取消收藏 / Remove from favorites. It does not open the Going / Interested sheet, and it does not wait on the organizer-email check.
- On an opened card that is not saved, the star still adds a favorite (the existing intent sheet). That does not ask for confirmation.
- In the saved list, the star and the 取消收藏 / Remove from favorites button both unfavorite. They do not open the intent sheet.

### Confirmation

Unfavorite always asks first. Favorite (adding) does not, unless a later rule in this spec says so.

| | 中文 | English |
|---|---|---|
| Question | 取消收藏这个活动？ | Remove this event from favorites? |
| Confirm | 取消收藏 | Remove from favorites |
| Dismiss | 保留 | Keep |

- 保留, the dimmed backdrop, and Escape leave the favorite in place.
- 取消收藏 removes it. With no session, that is local only. A verified session still uses the existing unfavorite save. This spec does not change the Worker.
- After it is removed, the star on that opened card is the add control again, with no confirm.
