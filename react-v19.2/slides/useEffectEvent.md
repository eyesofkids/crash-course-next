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

# useEffectEvent(勾子)

## Eddy 艾迪

✉️ hello@eddychang.me

---

# 什麼是 useEffectEvent (What)

- [`useEffectEvent`](https://react.dev/reference/react/useEffectEvent): 一個React勾子，可以讓你從Effects中提取非響應式邏輯(non-reactive logic)，到一個稱為`Effect Event`的可重覆使用的函式中

> 註: 最早(2018)在官方Github中 [issue#14099](https://github.com/facebook/react/issues/14099) 有針對`useCallback`在某些實作場景上的問題討論，社群中也有實現類似作用的自訂勾子(例如`useEventCallback`)，後來RFC訂名為[useEvent](https://github.com/reactjs/rfcs/pull/220)，在v18時的Canary頻道就已加入實驗性質實作(2022)

---

# 類型定義

```ts
useEffectEvent?: <Args, F: (...Array<Args>) => mixed>(callback: F) => F
```

**泛型參數** `Args` 是函數參數類型，`F` 是 `(...Array<Args>) => mixed` 的函式類型
**函式簽名** 接受一個類型為 `F` 的 `callback`，回傳一個相同類型 `F` 的函式
**`mixed` 類型** Flow 類型系統中所有類型的超類型(supertype)，相當於 TypeScript 的 `unknown`。允許回呼函式返回任何類型的值，提供靈活性(而不是`void`)

---

# 語法

```ts
useEffectEvent(callback)
```

**參數 callback** 一個包含Effect Event邏輯的函式。當你用`useEffectEvent`定義一個Effect Event時，callback在被呼叫時，總是能從props與state存取到最新的值。這能協助避免過期閉包(stale closures)的問題。

**回傳值** 回傳一個Effect Event函式。可以(也只能)`useEffect`, `useLayoutEffect` 或 `useInsertionEffect`裡呼叫

---

### Reactive value(響應式值)

props、state 等可能因重新渲染而改變的值(註: ref與ref.current並不是)

### Non-reactive logic(非響應式邏輯)

事件處理函式中的邏輯，需"**手動**"觸發(如點擊按鈕)才會執行。可讀取響應式值，但不會自動響應其變動。

### Reactive logic(響應式邏輯)

Effects 中的邏輯，會"**自動**"執行或重新執行以進行同步化。需將響應式值加入相依變數，變動時 React 會用新的值重新執行 Effect。

---

# 什麼是`Effect Event`(作用事件)

`Effect Events`類似`事件處理函式`，主要區別在於：
- **事件處理函式**：響應`使用者互動`而執行（如點擊按鈕）
- **Effect Event**：由你從 `Effects`(作用)中觸發

`Effect Event`讓你能夠在 Effect 的響應性(reactivity)與不應該具有響應性的程式碼之間「打破鏈結」，將非響應式邏輯從響應式邏輯中分離出，以下為幾個重點：
1. 它**不是響應式的**，必須從依賴項中省略
2. 它總是能讀取到**最新的props和state**，可避免過期閉包問題(穩定的函式引用)
3. 它**只能**在 Effects 裡呼叫，**切勿**不要傳遞到其它元件或勾子


---

# 為什麼要使用 useEffectEvent (Why)

1. 針對`useCallback`在特定使用場景下會失效(過於經常更新，導致穩定性問題)[issue#14099](https://github.com/facebook/react/issues/14099) 
2. 有目的性質地針對目前`React Complier`的搭配上的最佳化(或未來能穩定大量採用後)
3. `eslint-plugin-react-hooks`在新版本中的`set-state-in-effect` [issues/34743](https://github.com/facebook/react/issues/34743)的解決樣式之一

---

# 什麼時候和場景使用 useEffectEvent (When/Where)

> 「應該像事件一樣執行，且能存取到最新狀態與屬性」

1. 在Effects中混合了「響應式」與「非響應式邏輯」時，需要分離或提取出來的情況
2. 訂閱外部事件或計時器回呼 (Callbacks)、分析日誌記錄 (Analytics Logging)，回呼函式可能需要最新的 state 或 prop 值時
3. 避免 ESLint 錯誤與隱藏 Bug

---

> 來源: [useEvent RFC](https://github.com/reactjs/rfcs/blob/useevent/text/0000-useevent.md#internal-implementation)

```js
// (!) Approximate behavior
function useEvent(handler) {
  const handlerRef = useRef(null);

  // In a real implementation, this would run before layout effects
  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  return useCallback((...args) => {
    // In a real implementation, this would throw if called during render
    const fn = handlerRef.current;
    return fn(...args);
  }, []);
}
```

---

# 如何使用 useEffectEvent (How)

```jsx
function ChatRoom({ roomId, theme }) {
  const onConnected = useEffectEvent(() => {
    showNotification('Connected!', theme);
  });

  useEffect(() => {
    const connection = createConnection(serverUrl, roomId);
    connection.on('connected', () => {
      onConnected();
    });
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]);

  return <h1>Welcome to the {roomId} room!</h1>
}
```

---

# 結論

1. 結合"應用ref"、"同步Effect"、"穩定callback"合併為單一個更簡潔的API
2. 針對新的最佳化作法、並行與伺服器整合的官方解決方案
3. 獨立於useCallback外的特定場景使用的勾子





