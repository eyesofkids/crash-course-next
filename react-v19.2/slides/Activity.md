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

- [`<Activity>`](https://react.dev/reference/react/Activity): lets you hide and restore the UI and internal state of its children.

> React邊界(boundaries)是一種特殊元件，用於在應用程式不同功能隔出區域，管理應用程式特定部分的行為，目前有"錯誤處理(Error)"、"載入狀態(Suspense)"和"內容可見性(Activity)"三種，實際內部實作都在與元件生命周期搭配提供開發者自訂
---

```ts
export type ActivityProps = {
  mode?: 'hidden' | 'visible' | null | void,
  children?: ReactNodeList,
  name?: string,
};
```

---

# vs CSS vs 條件式渲染


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
