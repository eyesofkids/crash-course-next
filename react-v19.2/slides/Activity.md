---
marp: true
size: 16:9
theme: my-slide
paginate: true
style: |
  @import "./styles/bulma.min.css";
  .columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }
  td {
    min-width: 100px;
    word-wrap: break-word;
  }
  img[alt~="center"] {
  display: block;
  margin: 0 auto;
  }
header: '<span class="tag is-info is-light is-large"> React 19.2</span>'
footer: '
  <span class="tag is-link is-medium">Activity</span>'
---

<!-- _header: '' -->
<!-- _footer: '' -->

![bg right](./imgs/u7232347172_Neonpunk_style_A_futuristic_advertisement_on_a_hi_c5aca497-79d8-4042-98b4-c0d7a96cb356_0.png)

# Activity 元件(邊界)

## Eddy Chang

✉️ hello@eddychang.me

---

# 什麼是 Activity (What)

- [`<Activity>`](https://react.dev/reference/react/Activity): 可以讓你隱藏或回復它的子女元件中的UI和內部狀態

> 註: "邊界(boundaries)"是一種特殊的元件，用於在區隔出應用程式的不同功能區塊，管控特定行為與提供開發者自訂，目前除了"Activity"之外，還有"Error"、"Suspense"，這並沒有特別的固定樣式，但都和React內部的執行機制有關

---

```ts
// @enableActivity
export interface ActivityProps {
    /**
      * @default "visible"
      */
    mode?:
        | "hidden"
        | "visible"
        | undefined;
    /**
      * A name for this Activity boundary for instrumentation purposes.
      * The name will help identify this boundary in React DevTools.
      */
    name?: string | undefined;
    children: ReactNode;
}
```

---

# 功能說明

1. 主要針對於"條件渲染(Conditional Rendering)"樣式在某些應用場景下的缺點進行改善，尤其是(1)需要在呈現和隱藏間的反覆切換UI (2)除了React元件狀態外，也有DOM狀態需要保留的情況(例如: 捲軸位置、表單輸入或`<video>`,`<audio>`,`<iframe>`等)
2. 提供類似"休眠(Sleep)"或"暫停(Pause)"意義的狀態，可以讓元件在隱藏時保留狀態，在顯示時快速還原，而不需要重新掛載元件<sup>註1</sup>
3. 客戶端元件和伺服器元件間的交互應用，預先載入資料或渲染UI，並在客戶端元件中進行顯示或隱藏

> 註1: 在元件概念上"隱藏(hidden)"仍然是"卸載(unmounted)"，但狀態會由React進行保留，另外使用CSS的"display: none"來作呈現上的隱藏，而不會真正從DOM中移除，因此也可以保留DOM狀態

---

# vs

| 特性 | 條件渲染 (`&&` 或 `?:`) | `<Activity>` |
|------|------------------------|--------------|
| **狀態保留** | ❌ 隱藏=卸載，狀態遺失 | ✅ 隱藏時狀態保留 |
| **DOM** | ❌ 隱藏=卸載，從DOM中移除 | ✅ 隱藏時仍存在於 DOM |
| **元件實例** | ❌ 每次顯示都會重新建立 | ✅ 保持相同的元件實例 |
| **重新渲染** | ❌ 需要完整重新掛載渲染 | ✅ 還原狀態執行掛載 |
| **記憶體** | ✅ 隱藏=卸載不佔用記憶體 | ⚠️ 隱藏時仍佔用記憶體 |


---

# vs CSS `display: none`


| 特性 | CSS `display: none` | `<Activity>` |
|------|---------------------|--------------|
| **狀態保留** | ✅ 元件保持掛載，狀態完全保留 | ✅ 元件保持掛載，狀態完全保留 |
| **DOM 存在性** | ✅ 元件存在於 DOM 中 | ✅ 元件存在於 DOM 中 |
| **元件實例** | ✅ 保持相同的元件實例 | ✅ 保持相同的元件實例 |
| **Effects 處理** | ❌ **Effects 持續執行**，不會被清理 | ✅ `hidden` 時**銷毀 Effects**，`visible` 時重新創建 |
| **重新渲染** | ⚠️ 隱藏時仍會處理更新（但不可見） | ✅ `hidden` 時仍會響應 props，但**優先級較低** |
| **效能** | ⚠️ 隱藏時仍消耗資源（Effects、計算等） | ✅ 隱藏時銷毀 Effects，節省資源 |
| **記憶體使用** | ⚠️ 隱藏時仍佔用記憶體（包括 Effects） | ⚠️ 隱藏時仍佔用記憶體（但 Effects 被銷毀） |
| **訂閱/定時器** | ❌ 隱藏時仍會執行，可能造成資源浪費 | ✅ 隱藏時會被清理 |

---

# 為什麼使用 Activity (Why)


---

# 什麼時候和場景使用 Activity (When/Where)

- 切換分頁/資訊標籤(Tabs)
- 折疊UI(Collapse/OffCanvas/Drawer/Sidebar)
- 回復(休眠/暫停)狀態，尤其針對`<video>`,`<audio>`,`<iframe>`<sup>註1</sup>

> 註1: 這裡的狀態除了指的是React中的狀態，也包含DOM狀態

---

# 如何使用 Activity (How)



# 應用場景範例1 - 資訊標籤(Tabs)+影片撥放


---

# 應用場景範例2 - 側邊欄(Sidebar)+搜尋+捲動


---

# 應用場景範例3 - 資訊標籤(Tabs)+資料預先載入


---

# 結論

- Activity目前已知的缺點是會多佔一些應用程式記憶體花費
- 與Activity可以搭配使用的動畫樣式的ViewTransition元件此次並沒加入到19.2版本，未來版本會加入

---

# 參考資料 & 相關工具

- reactjs.org: [介紹 JSX](https://transform.tools/html-to-jsx)
- react.dev: [JSX (中)](https://zh-hans.react.dev/learn/writing-markup-with-jsx), [JSX (英)](https://react.dev/learn/writing-markup-with-jsx)
- react.dev: [條件渲染(Conditional Rendering)(中)](https://zh-hans.react.dev/learn/conditional-rendering)
- [HTML to JSX 線上轉換工具](https://transform.tools/html-to-jsx)
