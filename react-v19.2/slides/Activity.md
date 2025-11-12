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

## Eddy 艾迪

✉️ hello@eddychang.me

---

# 什麼是 Activity (What)

- [`<Activity>`](https://react.dev/reference/react/Activity): 可以讓你隱藏與回復它的子女元件中的UI和內部狀態

> 註: "邊界(boundaries)"是一種特殊的元件，用於在區隔出應用程式的不同功能區塊，管控特定行為與提供開發者自訂，目前除了"Activity"之外，還有"Error"、"Suspense"，並沒有特別的固定樣式，但都和React內部的執行機制有關聯

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

# 為什麼要使用 Activity (Why)

1. 主要針對於"條件渲染(Conditional Rendering)"樣式在某些應用場景下的缺點進行改善，尤其是(1)需要在呈現和隱藏間的反覆切換UI (2)除了React元件狀態外，也有DOM狀態需要保留的情況(例如: 捲軸位置、表單輸入或`<video>`,`<audio>`,`<iframe>`等)
2. 提供類似"休眠(Sleep)"或"暫停(Pause)"意義的狀態，可以讓元件在隱藏時保留狀態，在顯示時快速還原，而不需要重新掛載元件<sup>註1</sup>
3. 客戶端和伺服器間的交互應用，可以預先載入資料或渲染UI，並在客戶端元件中進行顯示或隱藏

> 註1: 在概念上"隱藏(hidden)"仍然是"卸載(unmounted)"，狀態會由React內部保持，不會遺失與重新渲染，加上使用CSS的"display: none"來作呈現上的隱藏，而不會真正從DOM中移除，因此也可以保留DOM狀態

---

# vs 條件式渲染

| 特性 | 條件渲染 (`&&` 或 `?:`) | `<Activity>` |
|------|------------------------|--------------|
| **狀態保留** | ❌ 隱藏=卸載，狀態遺失 | ✅ 隱藏時狀態保留 |
| **DOM** | ❌ 隱藏=卸載，從DOM中移除 | ✅ 隱藏時仍存在於 DOM |
| **元件實例** | ❌ 每次顯示都會重新建立 | ✅ 保持相同的元件實例 |
| **重新渲染** | ❌ 需要完整重新掛載 | ✅ 還原狀態後再重新掛載 |
| **記憶體** | ✅ 隱藏=卸載，不佔用記憶體 | ⚠️ 隱藏時仍佔用記憶體 |

---

# vs CSS `display: none`

| 特性 | CSS `display: none` | `<Activity>` |
|------|---------------------|--------------|
| **狀態保留** | ✅ 隱藏時狀態保留 | ✅ 隱藏時狀態保留 |
| **DOM** | ✅ 隱藏時仍存在於 DOM | ✅ 隱藏時仍存在於 DOM |
| **元件實例** | ✅ 保持相同的元件實例 | ✅ 保持相同的元件實例 |
| **Effects** | ❌ 隱藏時持續執行不清理 | ✅ 隱藏時清理，可見時恢復同步 |
| **重新渲染** | ✅ 持續響應props更新渲染 | ✅ 持續響應props更新渲染  |
| **記憶體** | ⚠️ 隱藏時仍佔用記憶體 | ⚠️ 隱藏時仍佔用記憶體 |

---

# 什麼時候和場景使用 Activity (When/Where)

1. 切換分頁/資訊標籤 (Tabs)
2. 折疊UI (Collapse/ OffCanvas/ Drawer/ Sidebar)
3. 需要還原與保留(休眠/暫停)的狀態<sup>註1</sup>
4. 需要預先載入資料或渲染UI，並在客戶端元件中進行顯示或隱藏(例如: 搜尋結果、資料預先載入)

> 註1: 狀態是混合了React中的狀態和瀏覽器的DOM狀態，例如: 捲軸位置、表單輸入或`<video>`,`<audio>`,`<iframe>`等，會需要保留狀態以避免重新渲染時遺失狀態

---

# 如何使用 Activity (How)

```jsx
<Activity mode={activeTab === 'home' ? "visible" : "hidden"}>
  <Home />
</Activity>
<Activity mode={activeTab === 'video' ? "visible" : "hidden"}>
  <Video />
</Activity>
```

---

# 應用場景範例1 - 資訊標籤(Tabs)基本使用


---

# 應用場景範例3 - 資訊標籤(Tabs)+資料預先載入


---

# 應用場景範例2 - 側邊欄(Sidebar)+搜尋+捲動


---

# 結論

1. 可當作是在某些場景下，條件渲染的一種替代方案，具有在真實DOM中保留狀態的特性，用於提升效能與使用者體驗(例如: 資訊標籤(Tabs)、折疊UI (Collapse/ OffCanvas/ Drawer/ Sidebar))
2. 以搭配Suspense元件使用，來實現資料預先載入與顯示
3. (未來版本加入)可以搭配使用的動畫樣式的ViewTransition元件此次並沒加入到19.2版本
