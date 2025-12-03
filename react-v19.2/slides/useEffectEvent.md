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

# useEffectEvent勾子

## Eddy 艾迪

✉️ hello@eddychang.me

---

# 什麼是 useEffectEvent (What)

- [`useEffectEvent`](https://react.dev/reference/react/useEffectEvent): 一個React勾子，可以讓你從Effects中提取非響應式邏輯(non-reactive logic)，到一個稱為Effect Event的可重覆使用的函式中

> 註: 最初在官方Github中 [issue#14099](https://github.com/facebook/react/issues/14099) 有針對這種實作上的問題討論(2018)，社群中也有實現類似作用的客製化勾子(例如useEventCallback)，最初RFC訂名為[useEvent](https://github.com/reactjs/rfcs/pull/220)，在v18時的Canary發佈頻道已加入實驗性的實作(2022)

---

# 類型定義

```ts
export type Dispatcher = {
    useEffectEvent?: <Args, F: (...Array<Args>) => mixed>(callback: F) => F,
}
```

**泛型參數** `Args` 是函數參數類型，`F` 是 `(...Array<Args>) => mixed` 的函式類型
**函式簽名** 接受一個類型為 `F` 的 `callback`，回傳一個相同類型 `F` 的函式
**`mixed` 類型** Flow 類型系統中所有類型的超類型(supertype)，相當於 TypeScript 的 `unknown`。允許回呼函式返回任何類型的值，提供最大靈活性

---

# 語法

```ts
useEffectEvent(callback)
```

**參數 callback** 一個包含你的Effect Event邏輯的函式。當你用useEffectEvent定義一個Effect Event時，callback在被呼叫時，總是能從props與state存取到最新的值。這能協助避免過期閉包(stale closures)的問題。

**回傳值** 回傳一個Effect Event函式。可以(也只能)`useEffect`, `useLayoutEffect` 或 `useInsertionEffect`裡呼叫

---

# 為什麼要使用 useEffectEvent (Why)



---

![h:580 center](imgs/activity-clock.png)


---

# 什麼時候和場景使用 Activity (When/Where)

1. 切換分頁/資訊標籤 (Tabs)
2. 折疊UI (Collapse/ OffCanvas/ Drawer/ Sidebar)
3. 需要還原與保留(休眠/暫停)的混合式的狀態<sup>註1</sup>
4. 需要預先載入資料或渲染UI，通常是先隱藏(例如: 搜尋結果、資料預先載入)

> 註1: 狀態是混合了React中的狀態和瀏覽器的DOM狀態，例如: 捲軸位置、表單輸入或`<video>`,`<audio>`,`<iframe>`等，會需要保留狀態以避免重新渲染時遺失狀態

---

# 如何使用 Activity (How)

```jsx
const [activeTab, setActiveTab] = useState('home');

<Activity mode={activeTab === 'home' ? "visible" : "hidden"}>
  <Home />
</Activity>
<Activity mode={activeTab === 'video' ? "visible" : "hidden"}>
  <Video />
</Activity>
```

---

# 結論

1. 可當作是在某些應用場景下，"條件渲染"或"CSS樣式隱藏/呈現"的另一種替代的實作方案，具有在真實DOM中保留狀態和能控制Effects(副作用)的特性，主要用於提升效能與改善使用者體驗(例如: 資訊標籤(Tabs)、折疊UI (Collapse/ OffCanvas/ Drawer/ Sidebar))
2. 可以搭配Suspense元件使用，來實現資料預先載入與顯示
3. 可以搭配使用於動畫樣式的ViewTransition元件(19.2尚未加入)

---

# 應用場景範例1 - 資訊標籤(Tabs)基本使用

---


