# useEffectEvent 深入解析

## 參考資料

- [Separating Events from Effects](https://react.dev/learn/separating-events-from-effects#extracting-non-reactive-logic-out-of-effects)
- [useEffectEvent API Reference](https://react.dev/reference/react/useEffectEvent)

---

## 概述

這個檔案展示了 React 中 `useEffectEvent` Hook 的內部實作細節，包含型別定義和核心實作邏輯。`useEffectEvent` 是 React 用來分離事件邏輯與 Effect 邏輯的機制，允許你在 Effect 中存取最新的值，而不會觸發 Effect 重新執行。


## 定義

### reactive values

Props, state, and variables declared inside your component’s body are called reactive values

In this example, serverUrl is not a reactive value, but roomId and message are. They participate in the rendering data flow

```js
const serverUrl = 'https://localhost:1234';

function ChatRoom({ roomId }) {
  const [message, setMessage] = useState('');

  // ...
}
```

Reactive values like these can change due to a re-render. For example, the user may edit the message or choose a different roomId in a dropdown. Event handlers and Effects respond to changes differently:

 - Logic inside event handlers is not reactive. It will not run again unless the user performs the same interaction (e.g. a click) again. Event handlers can read reactive values without “reacting” to their changes.

- Logic inside Effects is reactive. If your Effect reads a reactive value, you have to specify it as a dependency. Then, if a re-render causes that value to change, React will re-run your Effect’s logic with the new value.

### event handlers vs Effect

event handlers are always triggered “manually”, for example by clicking a button. 

Effects, on the other hand, are “automatic”: they run and re-run as often as it’s needed to stay synchronized.

### Logic inside event handlers is not reactive 

From the user’s perspective, a change to the message does not mean that they want to send a message. It only means that the user is typing. In other words, the logic that sends a message should not be reactive. It should not run again only because the reactive value has changed. That’s why it belongs in the event handler:

```js
  function handleSendClick() {
    sendMessage(message);
  }
```

Event handlers aren’t reactive, so `sendMessage(message)` will only run when the user clicks the Send button.

### Logic inside Effects is reactive 

From the user’s perspective, a change to the roomId does mean that they want to connect to a different room. In other words, the logic for connecting to the room should be reactive. You want these lines of code to “keep up” with the reactive value, and to run again if that value is different. That’s why it belongs in an Effect:

```js
  useEffect(() => {
    const connection = createConnection(serverUrl, roomId);
    connection.connect();
    return () => {
      connection.disconnect()
    };
  }, [roomId]);
```

Effects are reactive, so `createConnection(serverUrl, roomId)` and `connection.connect()` will run for every distinct value of roomId. Your Effect keeps the chat connection synchronized to the currently selected room.

### Extracting non-reactive logic out of Effects 

Things get more tricky when you want to mix reactive logic with non-reactive logic.

For example, imagine that you want to show a notification when the user connects to the chat. You read the current theme (dark or light) from the props so that you can show the notification in the correct color:

```js
function ChatRoom({ roomId, theme }) {
  useEffect(() => {
    const connection = createConnection(serverUrl, roomId);
    connection.on('connected', () => {
      showNotification('Connected!', theme);
    });
    connection.connect();
    // ...
```

However, `theme` is a reactive value (it can change as a result of re-rendering), and every reactive value read by an Effect must be declared as its dependency. Now you have to specify theme as a dependency of your Effect:

```js
function ChatRoom({ roomId, theme }) {
  useEffect(() => {
    // ✅ Reactive Logic：當 roomId 改變時，重新連接
    const connection = createConnection(serverUrl, roomId);
    
    // ⭐ 問題：connection.on('connected', callback) 中的 callback 是 non-reactive logic（事件回調）
    // - callback 會在連接成功時被調用（事件觸發時），而不是在 reactive value 改變時
    // - 但 callback 中使用了 reactive value（theme）
    // - 如果將 theme 加入依賴項，會導致 theme 改變時也重新連接（這不是我們想要的）
    connection.on('connected', () => {
      showNotification('Connected!', theme); // theme 是 reactive value
    });
    
    connection.connect();
    return () => {
      connection.disconnect()
    };
  }, [roomId, theme]); // ✅ All dependencies declared，但問題：theme 改變時也會重新連接
  // ...

```

When the roomId changes, the chat re-connects as you would expect. But since theme is also a dependency, the chat also re-connects every time you switch between the dark and the light theme. That's not great!

**核心問題：**
- `theme` 是 reactive value（會觸發重新渲染）
- 但 `connection.on('connected', callback)` 中的 `callback` 是 non-reactive logic（事件回調）
- 這個 non-reactive logic 需要讀取 reactive value（theme），但不想觸發重新連接

In other words, you don't want this line to be reactive, even though it is inside an Effect (which is reactive):

You need a way to separate this non-reactive logic from the reactive Effect around it.

### Declaring an Effect Event 

Use a special Hook called useEffectEvent to extract this non-reactive logic out of your Effect:

```js
import { useEffect, useEffectEvent } from 'react';

function ChatRoom({ roomId, theme }) {
  const onConnected = useEffectEvent(() => {
    showNotification('Connected!', theme);
  });
  // ...

```

Here, onConnected is called an Effect Event. It’s a part of your Effect logic, but it behaves a lot more like an event handler. The logic inside it is not reactive, and it always “sees” the latest values of your props and state.

Now you can call the onConnected Effect Event from inside your Effect:

```js
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
  }, [roomId]); // ✅ All dependencies declared
  // ...
```

This solves the problem. Note that you had to remove theme from the list of your Effect's dependencies, because it's no longer used in the Effect. You also don't need to add onConnected to it, because Effect Events are not reactive and must be omitted from dependencies.

---

## 為什麼這些概念很重要？

理解 **Reactive Value（響應式值）**、**Reactive Logic（響應式邏輯）** 和 **Non-Reactive Logic（非響應式邏輯）** 這些概念，是掌握 React Hooks 和 Effect 系統的關鍵。這些概念不僅幫助你寫出正確的程式碼，更能讓你理解 React 的設計哲學，避免常見的錯誤和性能問題。

### 1. 正確管理 Effect 依賴

#### 問題：過度依賴導致的性能問題

如果不理解響應式值和非響應式邏輯的區別，你可能會寫出這樣的程式碼：

```jsx
function ChatRoom({ roomId, theme }) {
  useEffect(() => {
    const connection = createConnection(serverUrl, roomId);
    connection.on('connected', () => {
      showNotification('Connected!', theme); // 使用了 theme
    });
    connection.connect();
    return () => connection.disconnect();
  }, [roomId, theme]); // ❌ 問題：theme 改變時也會重新連接
}
```

**後果：**
- 每次切換主題時，聊天連接都會斷開並重新建立
- 用戶體驗差（連接中斷、消息丟失）
- 不必要的網絡請求
- 性能浪費

#### 解決：理解邏輯的性質

理解這些概念後，你會意識到：
- `roomId` 是 reactive value，`roomId` 改變 → 應該重新連接（響應式邏輯）
- `theme` 是 reactive value，但 `theme` 改變 → 不應該重新連接
- ⭐ **關鍵**：`connection.on('connected', callback)` 中的 `callback` 是 non-reactive logic（事件回調）
- 問題在於：這個 non-reactive logic（callback）需要讀取 reactive value（theme），但不想觸發重新連接

```jsx
function ChatRoom({ roomId, theme }) {
  // ✅ 提取非響應式邏輯
  // theme 是 reactive value，但"顯示通知時使用 theme"是 non-reactive logic
  const onConnected = useEffectEvent(() => {
    showNotification('Connected!', theme); // non-reactive logic，但能讀取最新的 theme
  });
  
  useEffect(() => {
    // ✅ 響應式邏輯：只響應 roomId 改變
    const connection = createConnection(serverUrl, roomId);
    
    // ⭐ connection.on('connected', callback) 中的 callback 是 non-reactive logic
    // 它會在連接成功時被調用（事件觸發時），而不是在 reactive value 改變時
    connection.on('connected', () => {
      onConnected(); // 調用 non-reactive logic
    });
    
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]); // ✅ 只依賴 roomId，不依賴 theme
}
```

### 2. 避免常見的 React 錯誤

#### 錯誤一：過時閉包（Stale Closures）

不理解響應式值會導致過時閉包問題：

```jsx
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      console.log(count); // ❌ 問題：總是打印 0（過時閉包）
      setCount(count + 1); // ❌ 問題：總是基於 0 計算
    }, 1000);
    return () => clearInterval(timer);
  }, []); // ❌ 空依賴，導致閉包捕獲初始值
}
```

**理解響應式值後：**
- 知道 `count` 是響應式值
- 知道 Effect 需要依賴 `count` 才能讀取最新值
- 或者使用 `useEffectEvent` 來處理非響應式邏輯

```jsx
function Component() {
  const [count, setCount] = useState(0);
  
  // ✅ 方案一：使用函數式更新（不需要依賴 count）
  useEffect(() => {
    const timer = setInterval(() => {
      setCount(prev => prev + 1); // ✅ 使用函數式更新
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // ✅ 方案二：使用 useEffectEvent（非響應式邏輯）
  const logCount = useEffectEvent(() => {
    console.log(count); // ✅ 能讀取最新值，但不會觸發 Effect 重新執行
  });
  
  useEffect(() => {
    const timer = setInterval(() => {
      logCount();
    }, 1000);
    return () => clearInterval(timer);
  }, []);
}
```

#### 錯誤二：無限循環

不理解響應式邏輯會導致無限循環：

```jsx
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    setCount(count + 1); // ❌ 問題：每次執行都會改變 count
  }, [count]); // ❌ 問題：count 改變又觸發 Effect，形成無限循環
}
```

**理解響應式邏輯後：**
- 知道 Effect 是響應式邏輯，會自動響應依賴項改變
- 知道在 Effect 中直接更新依賴項會導致循環
- 知道應該使用函數式更新或重新思考設計

### 3. 寫出更清晰的程式碼

#### 分離關注點

理解這些概念幫助你將邏輯正確分類：

```jsx
function ShoppingCart({ userId, items }) {
  const [total, setTotal] = useState(0);
  
  // ✅ Reactive Logic：當 items 改變時，自動重新計算總價
  useEffect(() => {
    const newTotal = items.reduce((sum, item) => sum + item.price, 0);
    setTotal(newTotal);
  }, [items]); // 響應式邏輯：與 items 保持同步
  
  // ✅ Non-Reactive Logic：只在用戶點擊時執行
  const handleCheckout = useEffectEvent(() => {
    // 非響應式邏輯：不需要響應 total 或 items 的改變
    // 但能讀取最新的值
    processPayment(userId, items, total);
  });
  
  return (
    <div>
      <p>Total: ${total}</p>
      <button onClick={handleCheckout}>Checkout</button>
    </div>
  );
}
```

**好處：**
- 邏輯分類清晰
- 易於理解和維護
- 性能優化明確

### 4. 性能優化

#### 避免不必要的重新執行

理解這些概念幫助你優化性能：

```jsx
function Analytics({ userId, page, filter }) {
  // ❌ 不理解概念：所有值都加入依賴
  useEffect(() => {
    trackPageView(userId, page, filter);
  }, [userId, page, filter]); // 問題：userId 改變時也會記錄
  
  // ✅ 理解概念：區分響應式和非響應式邏輯
  const trackPageView = useEffectEvent(() => {
    trackPageView(userId, page, filter); // 非響應式邏輯
  });
  
  useEffect(() => {
    trackPageView(); // 只在 page 或 filter 改變時執行
  }, [page, filter]); // ✅ 只依賴需要響應的值
}
```

**性能提升：**
- 減少不必要的函數執行
- 減少網絡請求
- 減少計算開銷

### 5. 理解 React 的設計哲學

#### React 的兩種更新模式

理解這些概念幫助你理解 React 的設計：

1. **響應式更新（Reactive Updates）**
   - 當響應式值改變時，React 自動重新渲染
   - Effect 自動重新執行以保持同步
   - 這是 React 的核心機制

2. **事件驅動更新（Event-Driven Updates）**
   - 由用戶交互或外部事件觸發
   - 不會自動響應響應式值改變
   - 需要手動觸發

#### 為什麼 React 這樣設計？

- **可預測性**：響應式邏輯確保 UI 始終與數據同步
- **聲明式**：你聲明「當這個值改變時，執行這個邏輯」，而不是手動管理
- **性能**：React 可以優化響應式更新，批量處理

### 6. 實際開發中的重要性

#### 場景一：訂閱管理

```jsx
function ChatRoom({ roomId, userId }) {
  // ❌ 不理解概念：userId 改變時也會重新訂閱
  useEffect(() => {
    const subscription = subscribe(roomId, userId);
    return () => unsubscribe(subscription);
  }, [roomId, userId]); // 問題：userId 改變時重新訂閱
  
  // ✅ 理解概念：只有 roomId 改變時才重新訂閱
  const handleMessage = useEffectEvent((message) => {
    // 非響應式邏輯：能讀取最新的 userId，但不會觸發重新訂閱
    displayMessage(message, userId);
  });
  
  useEffect(() => {
    const subscription = subscribe(roomId, handleMessage);
    return () => unsubscribe(subscription);
  }, [roomId]); // ✅ 只響應 roomId 改變
}
```

#### 場景二：計時器管理

```jsx
function Timer({ duration, onComplete }) {
  // ❌ 不理解概念：duration 改變時重新創建計時器
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]); // 問題：onComplete 改變時也會重新創建
  
  // ✅ 理解概念：只有 duration 改變時才重新創建
  const handleComplete = useEffectEvent(() => {
    onComplete(); // 非響應式邏輯
  });
  
  useEffect(() => {
    const timer = setTimeout(() => {
      handleComplete();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration]); // ✅ 只響應 duration 改變
}
```

### 7. 學習曲線和最佳實踐

#### 為什麼 React 文檔強調這些概念？

React 官方文檔花大量篇幅解釋這些概念，因為：

1. **避免常見錯誤**：大多數 React 錯誤都源於不理解這些概念
2. **寫出更好的程式碼**：理解這些概念後，程式碼更清晰、更高效
3. **團隊協作**：統一的術語和概念幫助團隊溝通
4. **長期維護**：正確分類的邏輯更容易維護和擴展

### 總結：為什麼這些概念很重要

| 重要性 | 說明 |
|--------|------|
| **正確性** | 避免過時閉包、無限循環等常見錯誤 |
| **性能** | 避免不必要的重新執行和計算 |
| **可維護性** | 程式碼邏輯清晰，易於理解和修改 |
| **設計理解** | 理解 React 的設計哲學和最佳實踐 |
| **團隊協作** | 統一的術語和概念促進溝通 |
| **長期發展** | 為學習更進階的 React 概念打下基礎 |

**核心要點：**
- 理解這些概念不是可選的，而是掌握 React Hooks 的**必要基礎**
- 這些概念貫穿整個 React 開發過程，從簡單的 `useState` 到複雜的 `useEffect` 和自定義 Hooks
- 投入時間理解這些概念，會讓你在 React 開發中事半功倍

---

## 核心概念詳解

### 1. Reactive Value（響應式值）

#### 定義

**Reactive Value（響應式值）** 是指那些**參與 React 渲染數據流**的值，當這些值改變時，會觸發元件重新渲染。

#### 哪些是 Reactive Value？

```jsx
// ✅ Reactive Values（響應式值）
function Component({ userId, theme }) {  // props 是響應式值
  const [count, setCount] = useState(0); // state 是響應式值
  const [name, setName] = useState('');  // state 是響應式值
  
  // 在組件體內聲明的變數也是響應式值
  const computedValue = count * 2;       // 響應式值（依賴 count）
  const items = useMemo(() => [...], [count]); // 響應式值
  
  // ❌ 不是 Reactive Values（非響應式值）
  const API_URL = 'https://api.example.com'; // 常量，不是響應式值
  const timestamp = Date.now();              // 每次渲染都重新計算，但不是響應式值
  
  // 組件外部的值不是響應式值
  // const globalVar = 'value'; // 如果在組件外部定義，不是響應式值
}
```

#### 判斷標準

一個值是否是響應式值，取決於它是否：
1. **會因為重新渲染而改變**：當元件重新渲染時，這個值可能會得到新的值
2. **參與渲染數據流**：這個值的改變會影響元件的渲染結果
3. **需要被 React 追蹤**：React 需要知道這個值何時改變，以便決定是否重新渲染

#### 完整範例

```jsx
// 元件外部：不是響應式值
const SERVER_URL = 'https://api.example.com';
let globalCounter = 0; // 即使會改變，也不是響應式值（不在渲染數據流中）

function UserProfile({ userId, theme }) {
  // ✅ Props：響應式值
  // userId 和 theme 是 props，會因為父元件傳入的值改變而改變
  
  // ✅ State：響應式值
  const [name, setName] = useState('');
  const [age, setAge] = useState(0);
  
  // ✅ 在元件體內宣告的變數：響應式值（如果依賴其他響應式值）
  const fullName = `${name} (${age})`; // 依賴 name 和 age，是響應式值
  const isAdult = age >= 18;            // 依賴 age，是響應式值
  
  // ✅ 從其他 Hook 返回的值：響應式值（如果依賴其他響應式值）
  const memoizedValue = useMemo(() => computeExpensive(name), [name]);
  
  // ❌ ref 物件和 ref.current 都不是響應式值
  const refValue = useRef(0); 
  // - ref 物件本身：在元件生命週期中保持同一個引用，不會改變 → 不是響應式值
  // - ref.current：可以改變，但改變不會觸發重新渲染 → 不是響應式值
  
  // ❌ 常量：不是響應式值
  const API_KEY = 'abc123';
  
  // ❌ 每次渲染都重新計算但不依賴響應式值的變數：不是響應式值
  const timestamp = Date.now();
  const randomId = Math.random();
  
  // ❌ 元件外部的值：不是響應式值
  // SERVER_URL 和 globalCounter 不是響應式值
}
```

### 2. Reactive Logic（響應式邏輯）

#### 定義

**Reactive Logic（響應式邏輯）** 是指那些**會自動響應響應式值改變**的邏輯。當響應式值改變時，這些邏輯會自動重新執行。

#### 特徵

1. **自動執行**：當依賴的響應式值改變時，邏輯會自動重新執行
2. **需要同步**：邏輯的目的是與響應式值保持同步
3. **宣告式**：你宣告「當這個值改變時，執行這個邏輯」，而不是手動觸發

#### 典型場景：useEffect

```jsx
function ChatRoom({ roomId, theme }) {
  // ✅ Reactive Logic：當 roomId 改變時，自動重新連接
  useEffect(() => {
    const connection = createConnection(serverUrl, roomId);
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]); // roomId 是響應式值，Effect 是響應式邏輯
  
  // 當 roomId 從 'general' 變為 'travel' 時：
  // 1. 元件重新渲染
  // 2. Effect 檢測到 roomId 改變
  // 3. 執行清理函數（斷開舊連接）
  // 4. 執行 Effect 邏輯（建立新連接）
}
```

#### 響應式邏輯的判斷標準

邏輯是響應式的，如果：
1. **自動觸發**：當響應式值改變時，邏輯會自動執行
2. **需要同步**：邏輯的目的是保持與響應式值的同步
3. **宣告依賴**：必須在依賴陣列中宣告所有使用的響應式值

#### 更多範例

```jsx
function Component({ userId }) {
  const [count, setCount] = useState(0);
  const [filter, setFilter] = useState('');
  
  // ✅ Reactive Logic 1：useEffect
  useEffect(() => {
    // 當 userId 或 filter 改變時，自動執行
    fetchUserData(userId, filter);
  }, [userId, filter]); // 聲明依賴項
  
  // ✅ Reactive Logic 2：useMemo（計算值）
  const filteredData = useMemo(() => {
    // 當 data 或 filter 改變時，自動重新計算
    return data.filter(item => item.includes(filter));
  }, [data, filter]);
  
  // ✅ Reactive Logic 3：useCallback（函式）
  const handleClick = useCallback(() => {
    // 當 count 改變時，函式引用會改變（重新建立）
    console.log(count);
  }, [count]);
  
  // ❌ 不是 Reactive Logic：事件處理函式
  const handleButtonClick = () => {
    // 不會自動執行，只有用戶點擊時才執行
    setCount(count + 1);
  };
}
```

### 3. Non-Reactive Logic（非響應式邏輯）

#### 定義

**Non-Reactive Logic（非響應式邏輯）** 是指那些**不會自動響應響應式值改變**的邏輯。這些邏輯只在特定事件發生時執行，而不是因為響應式值改變而自動執行。

#### 特徵

1. **手動觸發**：邏輯只在特定事件發生時執行（用戶點擊、定時器觸發等）
2. **不需要同步**：邏輯的目的不是與響應式值保持同步
3. **事件驅動**：由外部事件觸發，而不是響應式值改變

#### 典型場景：事件處理函式

```jsx
function ChatRoom({ roomId }) {
  const [message, setMessage] = useState('');
  
  // ✅ Non-Reactive Logic：事件處理函式
  function handleSendClick() {
    // 這個邏輯不會因為 message 改變而自動執行
    // 只有當用戶點擊按鈕時才執行
    sendMessage(message);
  }
  
  // 即使 message 改變了 100 次，handleSendClick 也不會自動執行
  // 只有當用戶實際點擊按鈕時，才會執行
}
```

#### 非響應式邏輯的判斷標準

邏輯是非響應式的，如果：
1. **手動觸發**：邏輯只在特定事件發生時執行
2. **不需要同步**：邏輯的目的不是保持與響應式值的同步
3. **事件驅動**：由外部事件（使用者交互、定時器、網路請求完成等）觸發

#### 更多範例

```jsx
function Component() {
  const [count, setCount] = useState(0);
  const [userId, setUserId] = useState('user1');
  
  // ✅ Non-Reactive Logic 1：事件處理函式
  const handleClick = () => {
    // 只有用戶點擊時才執行
    console.log('Clicked!', count, userId);
  };
  
  // ✅ Non-Reactive Logic 2：定時器回調
  useEffect(() => {
    const timer = setInterval(() => {
      // 定時器觸發時執行，不會因為 count 或 userId 改變而重新執行
      console.log('Timer tick', count, userId);
    }, 1000);
    return () => clearInterval(timer);
  }, []); // 空依賴，只執行一次
  
  // ✅ Non-Reactive Logic 3：網路請求回呼
  useEffect(() => {
    fetch('/api/data')
      .then(response => response.json())
      .then(data => {
        // 請求完成時執行，不會因為其他響應式值改變而重新執行
        console.log('Data received', data);
      });
  }, []);
  
  // ❌ 不是 Non-Reactive Logic：響應式邏輯
  useEffect(() => {
    // 這會因為 count 改變而自動重新執行，是響應式邏輯
    console.log('Count changed', count);
  }, [count]);
}
```

### 4. 混合場景：在響應式邏輯中使用非響應式邏輯

#### 問題場景

有時候，你需要在響應式邏輯（如 `useEffect`）中使用非響應式邏輯，但這個非響應式邏輯需要讀取響應式值。

**關鍵理解：**
- `useEffect` 是響應式邏輯：會響應 reactive value 改變而重新執行
- `useEffect` 本身不會"回來造成渲染"（它是副作用，不會直接導致渲染）
- 但 `useEffect` 內部的某些邏輯（如事件回調、定時器回調）是 **non-reactive logic**
- 這些 non-reactive logic 需要讀取 reactive value，但不想觸發 `useEffect` 重新執行
- **這就是 `useEffectEvent` 的用途**：讓 non-reactive logic 能讀取最新的 reactive value，同時不會觸發 `useEffect` 重新執行

```jsx
function ChatRoom({ roomId, theme }) {
  useEffect(() => {
    // ✅ Reactive Logic：當 roomId 改變時，重新連接
    const connection = createConnection(serverUrl, roomId);
    
    connection.on('connected', () => {
      // ❌ 問題：這是 Non-Reactive Logic（事件回調）
      // 但使用了響應式值 theme
      // 如果將 theme 加入依賴項，會導致不必要的重新連接
      showNotification('Connected!', theme);
    });
    
    connection.connect();
    return () => connection.disconnect();
  }, [roomId, theme]); // 問題：theme 改變時也會重新連接
}
```

#### 問題分析

- **roomId 是 reactive value**：`roomId` 改變 → 應該重新連接（響應式邏輯）
- **theme 是 reactive value**：`theme` 改變 → 不應該重新連接
- ⭐ **真正的關鍵**：`connection.on('connected', callback)` 中的 `callback` 是 **non-reactive logic**（事件回調）
  - 這個 callback 會在連接成功時被調用（事件觸發時）
  - 這個 callback 不會因為 reactive value 改變而自動重新執行
  - 但如果 callback 中使用了 `theme`，而 callback 是在 `useEffect` 中定義的，那麼 `theme` 的舊值會被閉包捕獲

#### 解決方案：useEffectEvent

```jsx
function ChatRoom({ roomId, theme }) {
  // ✅ 提取非響應式邏輯
  // theme 是 reactive value，但"顯示通知時使用 theme"是 non-reactive logic
  const onConnected = useEffectEvent(() => {
    // 這是 non-reactive logic，但能讀取最新的 theme（reactive value）
    showNotification('Connected!', theme);
  });
  
  useEffect(() => {
    // ✅ 響應式邏輯：只響應 roomId 改變
    const connection = createConnection(serverUrl, roomId);
    
    // ⭐ 這裡的 callback 是 non-reactive logic（事件回調）
    // 它會在連接成功時被調用（事件觸發時），而不是在 reactive value 改變時
    connection.on('connected', () => {
      // ✅ 調用 non-reactive logic，能讀取最新的 theme，但不會觸發 Effect 重新執行
      onConnected();
    });
    
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]); // ✅ 只依賴 roomId，不依賴 theme
}
```

### 5. 對比總結

| 特性 | Reactive Value | Reactive Logic | Non-Reactive Logic |
|------|---------------|---------------|-------------------|
| **定義** | 參與渲染數據流的值 | 自動響應值改變的邏輯 | 手動觸發的邏輯 |
| **改變時** | 觸發元件重新渲染 | 自動重新執行 | 不會自動執行 |
| **典型例子** | props, state | useEffect, useMemo | 事件處理函式 |
| **依賴管理** | 需要在依賴陣列中宣告 | 需要在依賴陣列中宣告 | 不需要依賴陣列 |
| **執行時機** | 渲染時計算 | 值改變時自動執行 | 事件發生時執行 |

### 6. 實際判斷流程

#### 判斷一個值是否是 Reactive Value（響應式值）

```
1. 這個值是在元件內部定義的嗎？
   ├─ 否 → 不是響應式值
   └─ 是 → 繼續判斷
   
2. 這個值會因為重新渲染而改變嗎？
   ├─ 否 → 不是響應式值（常量）
   └─ 是 → 繼續判斷
   
3. 這個值的改變會影響渲染嗎？
   ├─ 否 → 不是響應式值（例如：ref 物件、ref.current）
   └─ 是 → 是響應式值 ✅
   
說明：
- ref 物件本身：在元件生命週期中保持同一個引用，不會改變 → 不是響應式值
- ref.current：可以改變，但改變不會觸發重新渲染 → 不是響應式值
```

#### 判斷邏輯是 Reactive 還是 Non-Reactive

```
1. 這個邏輯會自動執行嗎？
   ├─ 否 → 非響應式邏輯 ✅
   └─ 是 → 繼續判斷
   
2. 這個邏輯的目的是保持同步嗎？
   ├─ 否 → 非響應式邏輯 ✅
   └─ 是 → 響應式邏輯 ✅
```

### 7. 如何判斷和分離響應式與非響應式邏輯

#### 判斷流程詳解

##### 步驟一：分析邏輯的觸發時機

**問題：這個邏輯什麼時候需要執行？**

```jsx
// 範例 1：連接聊天室
function ChatRoom({ roomId }) {
  useEffect(() => {
    const connection = createConnection(roomId);
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]);
}
```

**分析：**
- **觸發時機**：當 `roomId` 改變時
- **問題**：如果 `roomId` 改變，我們是否希望重新連接？
  - ✅ **是** → 這是響應式邏輯
  - ❌ **否** → 這是非響應式邏輯

**結論：** 這是響應式邏輯，因為我們希望連接狀態與 `roomId` 保持同步。

```jsx
// 範例 2：發送消息
function ChatRoom({ roomId }) {
  const [message, setMessage] = useState('');
  
  function handleSend() {
    sendMessage(roomId, message);
  }
}
```

**分析：**
- **觸發時機**：當用戶點擊「發送」按鈕時
- **問題**：如果 `roomId` 或 `message` 改變，我們是否希望自動發送消息？
  - ✅ **是** → 這是響應式邏輯
  - ❌ **否** → 這是非響應式邏輯

**結論：** 這是非響應式邏輯，因為我們只在用戶主動點擊時才發送。

##### 步驟二：分析邏輯的目的

**問題：這個邏輯的目的是什麼？**

| 目的 | 類型 | 範例 |
|------|------|------|
| **保持同步** | 響應式邏輯 | 當 `roomId` 改變時，重新連接聊天室 |
| **響應用戶操作** | 非響應式邏輯 | 當用戶點擊按鈕時，發送消息 |
| **響應外部事件** | 非響應式邏輯 | 當定時器觸發時，更新顯示 |
| **計算衍生值** | 響應式邏輯 | 當 `items` 改變時，重新計算總價 |

##### 步驟三：分析邏輯的執行頻率

**問題：這個邏輯應該執行多少次？**

```jsx
// 響應式邏輯：每次依賴項改變時執行
function Component({ userId }) {
  useEffect(() => {
    fetchUserData(userId); // 每次 userId 改變時執行
  }, [userId]);
}

// 非響應式邏輯：只在特定事件發生時執行
function Component({ userId }) {
  const handleRefresh = () => {
    fetchUserData(userId); // 只在用戶點擊時執行
  };
}
```

#### 分離方法詳解

##### 方法一：提取到事件處理函式（最簡單）

**適用場景：** 邏輯完全是非響應式的，不需要在 Effect 中

```jsx
// ❌ 混合在一起
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    // 響應式邏輯
    console.log('Count:', count);
    
    // 非響應式邏輯（但寫在 Effect 中）
    const handleClick = () => {
      setCount(count + 1);
    };
    
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [count]);
}

// ✅ 分離：提取非響應式邏輯
function Component() {
  const [count, setCount] = useState(0);
  
  // 非響應式邏輯：提取到事件處理函式
  const handleClick = () => {
    setCount(count => count + 1); // 使用函數式更新
  };
  
  // 響應式邏輯：只在 Effect 中
  useEffect(() => {
    console.log('Count:', count);
  }, [count]);
  
  useEffect(() => {
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [handleClick]); // handleClick 需要穩定
}
```

##### 方法二：使用 useEffectEvent（推薦）

**適用場景：** 在響應式邏輯（Effect）中需要使用非響應式邏輯，但需要讀取響應式值

```jsx
// ❌ 問題：混合響應式和非響應式邏輯
function ChatRoom({ roomId, theme }) {
  useEffect(() => {
    // ✅ 響應式邏輯：當 roomId 改變時，重新連接
    const connection = createConnection(roomId);
    
    // ⭐ 問題：connection.on('connected', callback) 中的 callback 是 non-reactive logic（事件回調）
    // - callback 會在連接成功時被調用（事件觸發時），而不是在 reactive value 改變時
    // - 但 callback 中使用了 reactive value（theme）
    // - 如果將 theme 加入依賴項，會導致 theme 改變時也重新連接（這不是我們想要的）
    connection.on('connected', () => {
      showNotification('Connected!', theme); // theme 是 reactive value
    });
    
    connection.connect();
    return () => connection.disconnect();
  }, [roomId, theme]); // ❌ 問題：theme 改變時也會重新連接
}

// ✅ 分離：使用 useEffectEvent
function ChatRoom({ roomId, theme }) {
  // ✅ 提取 non-reactive logic
  // theme 是 reactive value，但"顯示通知時使用 theme"是 non-reactive logic
  const onConnected = useEffectEvent(() => {
    // 這是 non-reactive logic，但能讀取最新的 theme（reactive value）
    showNotification('Connected!', theme);
  });
  
  // ✅ 響應式邏輯：只響應 roomId 改變
  useEffect(() => {
    const connection = createConnection(roomId);
    
    // ⭐ 這裡的 callback 是 non-reactive logic（事件回調）
    // 它會在連接成功時被調用（事件觸發時），而不是在 reactive value 改變時
    connection.on('connected', () => {
      onConnected(); // 調用 non-reactive logic，能讀取最新的 theme
    });
    
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]); // ✅ 只依賴 roomId，不依賴 theme
}
```

##### 方法三：使用 useRef + useCallback（替代方案）

**適用場景：** 需要穩定函式引用，但不想使用 useEffectEvent（React 19 之前）

```jsx
function ChatRoom({ roomId, theme }) {
  const themeRef = useRef(theme);
  
  // 同步最新值到 ref
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);
  
  // 非響應式邏輯：使用 ref 讀取最新值
  const onConnected = useCallback(() => {
    showNotification('Connected!', themeRef.current);
  }, []); // 穩定引用
  
  // 響應式邏輯：只響應 roomId
  useEffect(() => {
    const connection = createConnection(roomId);
    connection.on('connected', () => {
      onConnected();
    });
    connection.connect();
    return () => connection.disconnect();
  }, [roomId, onConnected]);
}
```

#### 實際案例：完整的分離流程

##### 案例一：聊天室連接

**需求分析：**
1. 當 `roomId` 改變時，需要重新連接（響應式邏輯）
2. 連接成功時，顯示通知，使用當前 `theme`（非響應式邏輯）

**為什麼不能用兩個 useEffect？**

你可能會想：用兩個 `useEffect` 分別處理 `roomId` 和 `theme` 不就好了嗎？

```jsx
// ❌ 嘗試用兩個 useEffect（無法解決問題）
function ChatRoom({ roomId, theme }) {
  // useEffect 1: 響應 roomId
  useEffect(() => {
    const connection = createConnection(roomId);
    connection.on('connected', () => {
      showNotification('Connected!', theme); // ❌ 問題：這裡的 theme 是閉包值
    });
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]); // 只依賴 roomId

  // useEffect 2: 響應 theme
  useEffect(() => {
    // ❌ 問題：theme 改變時，連接已經建立，無法重新觸發 'connected' 事件
    // 即使想更新通知，也無法重新觸發連接成功的事件
  }, [theme]);
}
```

**問題分析：**

1. **閉包問題**：第一個 `useEffect` 中的 `theme` 是閉包值。如果 `theme` 改變但 `roomId` 沒變，這個 `useEffect` 不會重新執行，所以 `showNotification` 中使用的還是舊的 `theme` 值。

2. **時機問題**：第二個 `useEffect` 響應 `theme`，但連接成功的事件已經發生過了，無法重新觸發。即使想更新通知樣式，也無法重新觸發 `'connected'` 事件。

**核心問題：**
- 需要在連接成功時使用最新的 `theme`（事件觸發時讀取最新值）
- 但 `theme` 改變時不應該觸發重新連接（不應該重新執行連接邏輯）
- 兩個 `useEffect` 無法協調這個需求

這就是為什麼需要 `useEffectEvent`：它能在事件回調中讀取最新的 `theme`，同時不會因為 `theme` 改變而觸發重新連接。

**分離步驟：**

```jsx
function ChatRoom({ roomId, theme }) {
  // 步驟 1：識別邏輯的性質
  // 關鍵理解：
  // - theme 是 reactive value（可以改變）
  // - 但問題在於混合了兩種不同的邏輯：
  //   1. "連接到新的 roomId" → 這是 reactive logic（應該響應 roomId 改變）
  //   2. "顯示通知時使用 theme" → 這是 non-reactive logic（只是讀取最新的 theme 值）
  // 
  // ⭐ 真正的關鍵：connection.on('connected', callback) 中的 callback 才是 non-reactive logic
  // - callback 是事件回調，會在連接成功時被調用（事件觸發時）
  // - callback 不會因為 reactive value 改變而自動重新執行
  // - 但如果 callback 中使用了 theme，而 callback 是在 useEffect 中定義的，
  //   那麼 theme 的舊值會被閉包捕獲
  // 
  // 問題：如果將 theme 放在依賴陣列中，會導致 theme 改變時也重新連接
  // 解決：將"使用 theme 顯示通知"的邏輯（callback）提取為 non-reactive logic
  
  // 步驟 2：提取非響應式邏輯
  const onConnected = useEffectEvent(() => {
    // 這是 non-reactive logic：不會因為 theme 改變而重新執行
    // 但能讀取最新的 theme 值（因為 theme 是 reactive value）
    showNotification('Connected!', theme);
  });
  
  // 步驟 3：保留響應式邏輯
  useEffect(() => {
    // 這是 reactive logic：只響應 roomId 改變
    const connection = createConnection(roomId);
    connection.on('connected', () => {
      // ⭐ 這裡的 callback 是 non-reactive logic
      // 它會在連接成功時被調用（事件觸發時），而不是在 reactive value 改變時
      onConnected(); // 調用 non-reactive logic，能讀取最新的 theme
    });
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]); // 只依賴 roomId，不依賴 theme
}
```

##### 案例二：分析日誌記錄

**需求分析：**
1. 當 `currentPage` 或 `filter` 改變時，記錄日誌（響應式邏輯）
2. 日誌中需要包含最新的 `userId`，但 `userId` 改變時不應該記錄（非響應式邏輯）

**分離步驟：**

```jsx
function App({ userId, api }) {
  const [currentPage, setCurrentPage] = useState('home');
  const [filter, setFilter] = useState('');
  
  // 步驟 1：識別邏輯性質
  // - 記錄日誌的觸發：currentPage 或 filter 改變（響應式）
  // - 日誌內容：需要最新的 userId（非響應式，只是讀取值）
  
  // 步驟 2：提取非響應式邏輯（讀取值）
  const trackPageView = useEffectEvent(() => {
    api.log('page_view', {
      userId,        // 非響應式：只是讀取最新值
      page: currentPage, // 非響應式：只是讀取最新值
      filter         // 非響應式：只是讀取最新值
    });
  });
  
  // 步驟 3：響應式邏輯：響應 currentPage 和 filter 改變
  useEffect(() => {
    trackPageView(); // 當 currentPage 或 filter 改變時執行
  }, [currentPage, filter]); // 只依賴需要響應的值
}
```

##### 案例三：定時器

**需求分析：**
1. 定時器只設定一次（非響應式邏輯）
2. 定時器回呼中需要讀取最新的 `count`（非響應式邏輯，只是讀取值）

**分離步驟：**

```jsx
function Component() {
  const [count, setCount] = useState(0);
  
  // 步驟 1：識別邏輯性質
  // - 定時器設定：只執行一次（非響應式）
  // - 定時器回呼：需要讀取最新 count（非響應式，只是讀取值）
  
  // 步驟 2：提取非響應式邏輯
  const logCount = useEffectEvent(() => {
    console.log('Count:', count); // 非響應式：只是讀取最新值
  });
  
  // 步驟 3：非響應式邏輯：只執行一次
  useEffect(() => {
    const timer = setInterval(() => {
      logCount(); // 調用非響應式邏輯
    }, 1000);
    return () => clearInterval(timer);
  }, []); // 空依賴，只執行一次
}
```

#### 判斷檢查清單

在判斷邏輯類型時，可以使用以下檢查清單：

##### 響應式邏輯檢查清單

- [ ] 這個邏輯需要與某個響應式值保持同步嗎？
- [ ] 當響應式值改變時，這個邏輯應該自動重新執行嗎？
- [ ] 這個邏輯的目的是「保持同步」而不是「響應事件」嗎？
- [ ] 如果響應式值改變，但不執行這個邏輯，會導致不一致嗎？

**如果所有答案都是「是」，這是響應式邏輯。**

##### 非響應式邏輯檢查清單

- [ ] 這個邏輯只在特定事件發生時執行嗎？（用戶點擊、定時器觸發等）
- [ ] 這個邏輯不需要響應響應式值改變嗎？
- [ ] 這個邏輯的目的是「響應事件」而不是「保持同步」嗎？
- [ ] 即使響應式值改變，這個邏輯也不應該自動執行嗎？

**如果所有答案都是「是」，這是非響應式邏輯。**

#### 常見分離模式

##### 模式一：Effect 中的事件回呼

```jsx
// 模式：Effect 設定訂閱，訂閱的回呼函式是 non-reactive logic
function Component() {
  const [count, setCount] = useState(0);
  
  // ✅ 提取 non-reactive logic
  // count 是 reactive value，但"訂閱回呼中讀取 count"是 non-reactive logic
  const handleMessage = useEffectEvent((message) => {
    // ⭐ 這是 non-reactive logic（事件回呼）
    // - 它會在收到消息時被調用（事件觸發時），而不是在 reactive value 改變時
    // - 但能讀取最新的 count（reactive value）
    console.log('Message:', message, 'Count:', count);
  });
  
  useEffect(() => {
    // ✅ 響應式邏輯：設定訂閱（可能需要響應某些值改變）
    // ⭐ subscribe 的回呼函式（handleMessage）是 non-reactive logic
    const subscription = subscribe(handleMessage);
    return () => unsubscribe(subscription);
  }, []); // 或依賴某些值
}
```

##### 模式二：Effect 中的定時器

```jsx
// 模式：Effect 設定定時器，定時器的回呼函式是 non-reactive logic
function Component() {
  const [count, setCount] = useState(0);
  
  // ✅ 提取 non-reactive logic
  // count 是 reactive value，但"定時器回呼中讀取 count"是 non-reactive logic
  const tick = useEffectEvent(() => {
    // ⭐ 這是 non-reactive logic（定時器回呼）
    // - 它會在定時器觸發時被調用（事件觸發時），而不是在 reactive value 改變時
    // - 但能讀取最新的 count（reactive value）
    console.log('Tick:', count);
  });
  
  useEffect(() => {
    // ✅ 響應式邏輯：設定定時器（可能需要響應某些值改變）
    // ⭐ setInterval 的回呼函式（tick）是 non-reactive logic
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []); // 或依賴某些值
}
```

##### 模式三：Effect 中的網絡請求回呼

```jsx
// 模式：Effect 發起請求，請求的回呼函式是 non-reactive logic
function Component() {
  const [userId, setUserId] = useState('user1');
  const [data, setData] = useState(null);
  
  // ✅ 提取 non-reactive logic
  // userId 是 reactive value，但"請求回呼中讀取 userId"是 non-reactive logic
  const handleResponse = useEffectEvent((response) => {
    // ⭐ 這是 non-reactive logic（請求回呼）
    // - 它會在請求完成時被調用（事件觸發時），而不是在 reactive value 改變時
    // - 但能讀取最新的 userId（reactive value）
    setData(response.data);
    console.log('User:', userId);
  });
  
  useEffect(() => {
    // ✅ 響應式邏輯：發起請求（響應某些值改變）
    // ⭐ fetchData().then() 的回呼函式（handleResponse）是 non-reactive logic
    fetchData(userId).then(handleResponse);
  }, [userId]);
}
```

#### 總結：判斷和分離的最佳實踐

1. **先判斷，再分離**
   - 不要急於寫程式碼，先分析邏輯的性質
   - 使用檢查清單確認邏輯類型

2. **明確觸發時機**
   - 響應式邏輯：當響應式值改變時自動執行
   - 非響應式邏輯：只在特定事件發生時執行

3. **明確目的**
   - 響應式邏輯：保持同步
   - 非響應式邏輯：響應事件

4. **使用正確的工具**
   - 完全非響應式：提取到事件處理函式
   - 在 Effect 中需要非響應式邏輯：使用 `useEffectEvent`
   - React 19 之前：使用 `useRef + useCallback`

5. **測試分離結果**
   - 確認響應式邏輯只在需要時執行
   - 確認非響應式邏輯能讀取最新值
   - 確認沒有不必要的重新執行

### 8. 常見誤區

#### 誤區一：認為所有在元件內部的值都是響應式值

```jsx
function Component() {
  const [count, setCount] = useState(0);
  
  // ❌ 誤區：認為 timestamp 是響應式值
  const timestamp = Date.now(); // 每次渲染都重新計算，但不是響應式值
  
  // ✅ 正確：只有依賴響應式值的計算才是響應式值
  const doubledCount = count * 2; // 依賴 count，是響應式值
}
```

#### 誤區二：認為所有在 useEffect 中的邏輯都是響應式邏輯

```jsx
function Component() {
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState('light');
  
  useEffect(() => {
    // ✅ 這是響應式邏輯：會因為 count 改變而自動重新執行
    console.log('Count changed:', count);
    
    // ❌ 誤區：認為 setInterval 的回調也是響應式邏輯
    // ⭐ 實際上，setInterval 的回調是 non-reactive logic（事件回調）
    // - 它會在定時器觸發時執行（事件觸發時），而不是在 reactive value 改變時
    // - 如果回調中使用了 theme，而 theme 改變但 count 沒變，這個 useEffect 不會重新執行
    // - 所以回調中使用的 theme 是閉包捕獲的舊值
    const timer = setInterval(() => {
      console.log('Theme:', theme); // ❌ 問題：theme 是閉包值，可能不是最新的
    }, 1000);
    
    return () => clearInterval(timer);
  }, [count]); // 只依賴 count，但 timer 回調中使用了 theme
}
```

**正確做法：**

```jsx
function Component() {
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState('light');
  
  // ✅ 提取 non-reactive logic
  // theme 是 reactive value，但"定時器回調中讀取 theme"是 non-reactive logic
  const logTheme = useEffectEvent(() => {
    // 這是 non-reactive logic，但能讀取最新的 theme（reactive value）
    console.log('Theme:', theme);
  });
  
  useEffect(() => {
    // ✅ 響應式邏輯：會因為 count 改變而自動重新執行
    console.log('Count changed:', count);
    
    // ✅ 在 non-reactive logic（定時器回調）中使用 reactive value
    const timer = setInterval(() => {
      logTheme(); // 能讀取最新的 theme，但不會觸發 Effect 重新執行
    }, 1000);
    
    return () => clearInterval(timer);
  }, [count]); // 只依賴 count
}
```

---

## 內部實現

### 1. 類型定義

> **檔案位置：** ReactInternalTypes.js

```typescript
// Type definition
useEffectEvent?: <Args, F: (...Array<Args>) => mixed>(callback: F) => F;
```

**說明：**
- **泛型參數**：`Args` 代表函數參數的型別，`F` 代表函數型別本身
- **函式簽名**：接受一個回呼函式 `callback`，並回傳相同型別的函式
- **可選性**：`?` 表示這個 API 可能是實驗性的或不穩定的

---

### 2. useEffectEvent 導出實現

```typescript
export function useEffectEvent<Args, F: (...Array<Args>) => mixed>(
  callback: F,
): F {
  const dispatcher = resolveDispatcher();
  // $FlowFixMe[not-a-function] This is unstable, thus optional
  return dispatcher.useEffectEvent(callback);
}
```

**說明：**
- **取得 dispatcher**：透過 `resolveDispatcher()` 取得目前渲染上下文中的 dispatcher
- **委託呼叫**：將回呼函式傳遞給 dispatcher 的 `useEffectEvent` 方法進行處理
- **Flow 註解**：`$FlowFixMe` 表示這裡有型別檢查警告，因為這個 API 是不穩定的

---

### 3. useEffectEventImpl 核心實現

> **檔案位置：** ReactFiberHooks.js

#### 類型定義

```typescript
type EventFunctionPayload<Args, Return, F: (...Array<Args>) => Return> = {
  ref: {
    eventFn: F,
    impl: F,
  },
  nextImpl: F,
};
```

#### 實現邏輯

```typescript
function updateEffect(
  create: () => (() => void) | void,
  deps: Array<mixed> | void | null,
): void {
  updateEffectImpl(PassiveEffect, HookPassive, create, deps);
}

function useEffectEventImpl<Args, Return, F: (...Array<Args>) => Return>(
  payload: EventFunctionPayload<Args, Return, F>,
) {
  currentlyRenderingFiber.flags |= UpdateEffect;
  let componentUpdateQueue: null | FunctionComponentUpdateQueue =
    (currentlyRenderingFiber.updateQueue: any);
  if (componentUpdateQueue === null) {
    componentUpdateQueue = createFunctionComponentUpdateQueue();
    currentlyRenderingFiber.updateQueue = (componentUpdateQueue: any);
    componentUpdateQueue.events = [payload];
  } else {
    const events = componentUpdateQueue.events;
    if (events === null) {
      componentUpdateQueue.events = [payload];
    } else {
      events.push(payload);
    }
  }
}
```

**updateEffect 說明：**
- 這是 `useEffect` 的更新階段入口函數
- 呼叫 `updateEffectImpl` 並傳入 `PassiveEffect` 和 `HookPassive` 標誌

**useEffectEventImpl 說明：**
- **標記更新**：`flags |= UpdateEffect` 標記目前 Fiber 需要更新 Effect
- **取得更新佇列**：從目前正在渲染的 Fiber 節點取得或建立 `componentUpdateQueue`
- **儲存事件函式**：將 `payload`（事件函式）儲存到更新佇列的 `events` 陣列中
- **目的**：將事件函式儲存在 Fiber 的更新佇列中，使其在元件更新時保持最新引用，但不會觸發 Effect 重新執行

---

### 4. updateEffectImpl 實現

```typescript
function updateEffectImpl(
  fiberFlags: Flags,
  hookFlags: HookFlags,
  create: () => (() => void) | void,
  deps: Array<mixed> | void | null,
): void {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const effect: Effect = hook.memoizedState;
  const inst = effect.inst;

  // currentHook is null on initial mount when rerendering after a render phase
  // state update or for strict mode.
  if (currentHook !== null) {
    if (nextDeps !== null) {
      const prevEffect: Effect = currentHook.memoizedState;
      const prevDeps = prevEffect.deps;
      // $FlowFixMe[incompatible-call] (@poteto)
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        hook.memoizedState = pushSimpleEffect(
          hookFlags,
          inst,
          create,
          nextDeps,
        );
        return;
      }
    }
  }

  currentlyRenderingFiber.flags |= fiberFlags;

  hook.memoizedState = pushSimpleEffect(
    HookHasEffect | hookFlags,
    inst,
    create,
    nextDeps,
  );
}
```

**說明：**
- **取得目前 Hook**：透過 `updateWorkInProgressHook()` 取得目前正在處理的 Hook
- **依賴比較**：如果存在上一次的 Hook，比較依賴陣列是否發生變化
- **優化策略**：如果依賴沒有變化，不設定 `HookHasEffect` 標誌，跳過 Effect 執行
- **標記執行**：如果依賴發生變化或首次渲染，設定 `HookHasEffect` 標誌，確保 Effect 會被執行

---

### 5. 設計目標總結

`useEffectEvent` 的設計目標是：
- 將事件處理函式儲存在 Fiber 的更新佇列中
- 保持函數引用始終是最新的，但不作為依賴觸發 Effect 重新執行
- 解決 Effect 中需要存取最新值但不想觸發重新執行的場景

這是 React 內部用來分離事件邏輯與 Effect 邏輯的機制，讓開發者能夠更精確地控制 Effect 的執行時機。

---

## 實際應用場景

`useEffectEvent` 的主要實際應用場景是將非響應式邏輯從 `useEffect` 中提取出來，同時確保該邏輯能夠讀取到最新的 state 和 props，而不會導致 `useEffect` 不必要的重新執行。

### 主要解決的問題

在傳統的 `useEffect` 中，如果一個函式使用了某個 state 或 prop，該 state 或 prop 就必須被包含在 `useEffect` 的依賴陣列 (dependency array) 中。這會導致以下問題：

1. **「依賴地獄」**：依賴陣列變得龐大，難以管理
2. **不必要的 Effect 觸發**：當某些 state 改變時，Effect 會重新執行，即使這些改變與 Effect 的核心目的（例如訂閱外部事件或發送分析日誌）無關
3. **過時閉包 (Stale Closures)**：如果省略了依賴項，Effect 中的函數會捕獲到舊的 state 或 props 值，導致潛在的錯誤

`useEffectEvent` 提供了一個穩定的函式引用，這個函式可以安全地存取最新的 state/props，而不需要將它們列入 Effect 的依賴陣列。

---

### 實際案例：分析日誌記錄 (Analytics Logging)

一個常見的實際案例是追蹤頁面瀏覽量 (page views) 或使用者行為分析。

**需求：** 當使用者造訪新頁面或改變篩選條件時，需要記錄頁面 URL、使用者 ID 和其他相關設定等資訊。這些資訊可能隨時間改變（例如使用者 ID 在登入後更新），但我們希望只在頁面或篩選條件變化時記錄，而不是在 userId 變化時也觸發記錄。

#### 傳統 useEffect 的問題

```jsx
function App({ userId, api }) {
  const [currentPage, setCurrentPage] = useState('home');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    // 這裡需要最新的 userId、currentPage 和 filter
    // 但我們只想在 currentPage 或 filter 變化時記錄
    api.log('page_view', { 
      userId, 
      page: currentPage, 
      filter 
    }); 
  }, [userId, currentPage, filter]); // 必須包含所有依賴項
  // 問題：userId 改變時也會觸發記錄，這不是我們想要的
  // 我們只希望 currentPage 或 filter 變化時才記錄
}
```

#### 使用 useEffectEvent 的解決方案

使用 `useEffectEvent` 建立一個穩定的事件處理函式 `trackPageView`，它始終能讀取最新的值，但不會觸發 Effect 重新執行。

```jsx
import { useEffect, useEffectEvent, useState } from 'react';

function App({ userId, api }) {
  const [currentPage, setCurrentPage] = useState('home');
  const [filter, setFilter] = useState('');

  // 1. 使用 useEffectEvent 定義非響應式邏輯
  // 這個函式可以讀取最新的 userId、currentPage 和 filter
  // 但這些值不會導致 trackPageView 函式本身「過時」
  const trackPageView = useEffectEvent(() => {
    api.log('page_view', { 
      userId,           // 始終讀取最新的 userId
      page: currentPage, // 始終讀取最新的 currentPage
      filter            // 始終讀取最新的 filter
    });
  });

  // 2. 在 Effect 中呼叫這個事件函式
  // Effect 只依賴於 currentPage 和 filter 的變化
  // 當這些值變化時，Effect 會重新執行並記錄日誌
  // 但 trackPageView 函式本身是穩定的，不需要加入依賴陣列
  useEffect(() => {
    trackPageView(); // 記錄頁面瀏覽
  }, [currentPage, filter]); // 只在頁面或篩選條件變化時觸發

  // 3. 在其他事件處理函數中也可以呼叫
  const handleChangePage = (newPage) => {
    setCurrentPage(newPage);
    // 不需要手動呼叫 trackPageView，因為 Effect 會自動處理
  };

  const handleChangeFilter = (newFilter) => {
    setFilter(newFilter);
    // 不需要手動呼叫 trackPageView，因為 Effect 會自動處理
  };
  
  // ... 其他組件邏輯
}
```

**關鍵優勢：**
- `trackPageView` 函式始終能存取最新的 `userId`、`currentPage` 和 `filter`
- Effect 只在 `currentPage` 或 `filter` 變化時執行，不會因為 `userId` 變化而觸發
- 即使 `userId` 在登入後更新，日誌記錄仍然會使用最新的 `userId` 值，但不會重複記錄
- 程式碼更清晰，邏輯分離更明確

---

### 實際案例：購物車與 localStorage 同步

一個常見的實際案例是購物車與 localStorage 的同步。

**需求：**
1. 第一次渲染時，從 localStorage 讀取購物車數據
2. 之後每次購物車內容改變時，都要同步寫入 localStorage
3. 寫入時需要包含最新的 `userId`（用於區分不同用戶的購物車），但 `userId` 改變時不應該重新讀取 localStorage

#### 傳統 useEffect 的問題

```jsx
function ShoppingCart({ userId }) {
  const [cartItems, setCartItems] = useState([]);

  // 第一次渲染時讀取 localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`cart_${userId}`);
    if (saved) {
      setCartItems(JSON.parse(saved));
    }
  }, [userId]); // 問題：userId 改變時也會重新讀取

  // 購物車改變時寫入 localStorage
  useEffect(() => {
    // 這裡需要最新的 userId 和 cartItems
    // 但我們只想在 cartItems 改變時寫入
    localStorage.setItem(`cart_${userId}`, JSON.stringify(cartItems));
  }, [userId, cartItems]); // 問題：userId 改變時也會寫入（可能覆蓋錯誤的用戶數據）
}
```

**問題分析：**
- `userId` 改變時，會重新讀取 localStorage（這可能是我們想要的，因為不同用戶的購物車不同）
- 但如果 `userId` 改變時也寫入，可能會在讀取新用戶數據之前就覆蓋了舊用戶的數據
- 更理想的場景：只在 `cartItems` 改變時寫入，但寫入時需要使用最新的 `userId`

#### 使用 useEffectEvent 的解決方案

```jsx
import { useEffect, useEffectEvent, useState } from 'react';

function ShoppingCart({ userId }) {
  // ✅ 使用 lazy initialization 從 localStorage 讀取初始值
  // 這樣可以避免在 useEffect 中同步調用 setState（會觸發 cascading renders 警告）
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem(`cart_${userId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Failed to parse cart data:', error);
        return [];
      }
    }
    return [];
  });

  // ✅ 當 userId 改變時，重新從 localStorage 讀取
  useEffect(() => {
    const saved = localStorage.getItem(`cart_${userId}`);
    if (saved) {
      try {
        setCartItems(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse cart data:', error);
        setCartItems([]);
      }
    } else {
      setCartItems([]);
    }
  }, [userId]); // ✅ userId 改變時重新讀取（這是合理的）

  // ✅ 使用 useEffectEvent 定義非響應式邏輯
  // 這個函式可以讀取最新的 userId 和 cartItems
  // 但這些值不會導致 saveToLocalStorage 函式本身「過時」
  const saveToLocalStorage = useEffectEvent(() => {
    // 始終讀取最新的 userId 和 cartItems
    localStorage.setItem(`cart_${userId}`, JSON.stringify(cartItems));
  });

  // ✅ 響應式邏輯：只在 cartItems 改變時寫入
  useEffect(() => {
    // 只在購物車內容改變時寫入 localStorage
    // 寫入時會使用最新的 userId（即使 userId 改變也不會觸發這個 Effect）
    saveToLocalStorage();
  }, [cartItems]); // ✅ 只依賴 cartItems

  // 購物車操作
  const addItem = (item) => {
    setCartItems(prev => [...prev, item]);
    // 不需要手動調用 saveToLocalStorage，Effect 會自動處理
  };

  const removeItem = (itemId) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
    // 不需要手動調用 saveToLocalStorage，Effect 會自動處理
  };

  return (
    <div>
      {/* 購物車 UI */}
    </div>
  );
}
```

**關鍵優勢：**
- `saveToLocalStorage` 函式始終能存取最新的 `userId` 和 `cartItems`
- Effect 只在 `cartItems` 改變時執行，不會因為 `userId` 改變而觸發
- 即使 `userId` 在購物車操作過程中更新，寫入時仍會使用最新的 `userId`
- 程式碼更清晰，邏輯分離更明確

**更進階的場景：**

如果需要在寫入時包含更多信息（如時間戳、版本號等），但這些值改變時不應該觸發重新讀取：

```jsx
function ShoppingCart({ userId }) {
  // ✅ 使用 lazy initialization 從 localStorage 讀取初始值
  // 這樣可以避免在初始渲染時在 useEffect 中同步調用 setState
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem(`cart_${userId}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        return data.items || [];
      } catch (error) {
        console.error('Failed to parse cart data:', error);
        return [];
      }
    }
    return [];
  });
  
  const [version, setVersion] = useState(() => {
    const saved = localStorage.getItem(`cart_${userId}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        return data.version || 1;
      } catch {
        return 1;
      }
    }
    return 1;
  });
  
  const [lastModified, setLastModified] = useState(() => {
    const saved = localStorage.getItem(`cart_${userId}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        return data.lastModified || null;
      } catch {
        return null;
      }
    }
    return null;
  });

  // ✅ 當 userId 改變時，重新從 localStorage 讀取
  // 注意：這是在響應外部變化（userId），是合理的場景
  // 雖然會在 useEffect 中調用 setState，但這是響應外部系統變化的必要操作
  useEffect(() => {
    const saved = localStorage.getItem(`cart_${userId}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setCartItems(data.items || []);
        setVersion(data.version || 1);
        setLastModified(data.lastModified || null);
      } catch (error) {
        console.error('Failed to parse cart data:', error);
        setCartItems([]);
        setVersion(1);
        setLastModified(null);
      }
    } else {
      setCartItems([]);
      setVersion(1);
      setLastModified(null);
    }
  }, [userId]);

  // ✅ 非響應式邏輯：寫入時需要最新的所有值
  const saveToLocalStorage = useEffectEvent(() => {
    const data = {
      items: cartItems,
      version: version,
      lastModified: new Date().toISOString(),
      userId: userId // 始終讀取最新的 userId
    };
    localStorage.setItem(`cart_${userId}`, JSON.stringify(data));
    setLastModified(data.lastModified);
  });

  // ✅ 響應式邏輯：只在 cartItems 改變時寫入
  useEffect(() => {
    saveToLocalStorage();
  }, [cartItems]); // 只依賴 cartItems，不依賴 version 或 userId

  // ...
}
```

---

### 其他常見用例

1. **訂閱/取消訂閱事件**：在 `useEffect` 內設定事件監聽器時，監聽器內的回呼函式可以使用 `useEffectEvent` 來讀取最新的 state，而無需重新訂閱
2. **計時器 (Timers)**：在 `setInterval` 或 `setTimeout` 的回呼中使用最新的 state，而不需要清除並重新設定計時器
3. **API 輪詢**：執行 API 請求時需要最新的過濾條件或其他參數，但又不想在這些參數變動時重新啟動 Effect
4. **localStorage 同步**：在購物車、表單草稿等場景中，需要將數據同步到 localStorage，但同步時需要讀取最新的用戶 ID 或其他元數據，而這些值改變時不應該觸發重新讀取

您可以查閱 React 官方文件以獲得更多資訊和範例。

---

## 替代方案

在不使用 `useEffectEvent` 的情況下實作類似功能，核心挑戰是如何在不將所有變數放入 `useEffect` 依賴項的前提下，存取到最新的 state 或 props。

有三種主要的替代方法，都依賴於 React 的核心概念：

---

### 方法一：使用 useRef 儲存最新值（最常見的替代方案）

這種方法的核心思想是使用一個 ref 物件來「手動」追蹤最新的 state 或 prop 值。`useRef` 回傳的 ref 物件在元件的整個生命週期內保持不變，更新它的 `.current` 屬性不會觸發元件重新渲染。

#### 如何實現分析日誌記錄案例

```jsx
import { useEffect, useRef, useState } from 'react';

function App({ userId, api }) {
  const [currentPage, setCurrentPage] = useState('home');
  const [filter, setFilter] = useState('');

  // 1. 建立一個 Ref 來儲存所有響應式值
  const latestValues = useRef({ userId, currentPage, filter });

  // 2. 使用 useEffect 在每次渲染後「同步」最新的值到 Ref 中
  useEffect(() => {
    latestValues.current = { userId, currentPage, filter };
  }, [userId, currentPage, filter]); // 這個 Effect 必須依賴所有需要同步的值

  // 3. 定義一個穩定的事件處理函式，它從 Ref 中讀取資料
  const trackPageView = () => {
    // 從 .current 屬性讀取最新的快照
    const { userId, currentPage, filter } = latestValues.current;
    api.log('page_view', { userId, page: currentPage, filter });
  };

  // 4. 在主要的 Effect 中呼叫這個函式
  // Effect 只在 currentPage 或 filter 變化時執行
  useEffect(() => {
    // trackPageView 是一個穩定的函式（引用不變）
    // 它不需要在依賴陣列中，但能讀取到最新的值
    trackPageView();
  }, [currentPage, filter]); // 只在頁面或篩選條件變化時觸發

  // ... 其他組件邏輯，例如：
  const handleChangePage = (newPage) => {
    setCurrentPage(newPage);
    // 不需要手動呼叫，Effect 會自動處理
  };
  
  // ...
}
```

**優點：**
- 這是 `useEffectEvent` 出現之前最標準的解決方案
- 適用於所有版本的 React

**缺點：**
- 需要額外的一個 `useEffect` 來專門同步 ref，增加了程式碼的複雜性
- 開發者必須記住將所有相關變數加入同步 Effect 的依賴陣列中

---

### 方法二：將邏輯移入回呼函數，並將回呼函數本身放入依賴陣列（更侵入式）

如果你的主要目標是訂閱或設定一次性的副作用（例如計時器），你可以將使用最新 state 的邏輯包裝成一個回呼函式，並將這個回呼函式定義在 Effect 內部。但這通常會導致 Effect 重新執行，違背了最初的目的。

如果你必須讓 Effect 保持穩定，你只能依賴方法一。

如果你接受 Effect 在相關 state 變更時重新執行，你可以這樣寫：

```jsx
function App({ userId, api }) {
  const [currentPage, setCurrentPage] = useState('home');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    // 這個 log 函式會讀取最新的 userId、currentPage 和 filter
    const log = () => {
      api.log('page_view', { 
        userId, 
        page: currentPage, 
        filter 
      });
    };
    
    // 每當 userId、currentPage 或 filter 變化時，整個 Effect 就會重新執行
    // 問題：userId 變化時也會觸發記錄，這可能不是我們想要的
    // 這可能會導致意想不到的行為（例如：重新設定訂閱或計時器）
    log();

  }, [userId, currentPage, filter, api]); // 必須將所有依賴項列出
  
  // ...
}
```

---

### 方法三：useRef + useCallback 組合

使用 `useRef` 結合 `useCallback` 是一種更精確地管理穩定函式引用的方式，特別適用於只需要一個穩定且可呼叫的函式本身，而不僅僅是儲存資料的場景。

這種方法通常用於將穩定回呼函式傳遞給子元件，或者作為事件監聽器使用。

#### 實現方式

我們繼續使用分析日誌記錄的案例：

```jsx
import { useEffect, useRef, useCallback, useState } from 'react';

function App({ userId, api }) {
  const [currentPage, setCurrentPage] = useState('home');
  const [filter, setFilter] = useState('');
  
  // 1. 使用 useRef 追蹤最新的響應式值
  const latestValuesRef = useRef({ userId, currentPage, filter });

  // 2. 在每次渲染結束後更新 Ref 中的最新值
  useEffect(() => {
    // 這個 Effect 確保 latestValuesRef.current 總是反映目前最新的 props 和 state
    latestValuesRef.current = { userId, currentPage, filter };
  }, [userId, currentPage, filter]);

  // 3. 使用 useCallback 建立一個穩定的函式引用
  // 這個函式本身是穩定的（不會因 state 變化而重新建立），
  // 但它內部邏輯透過存取 Ref 來取得最新資料
  const trackPageView = useCallback(() => {
    // 從 Ref 中解構最新的資料
    const { userId, currentPage, filter } = latestValuesRef.current;
    api.log('page_view', { userId, page: currentPage, filter });
  }, [api]); // useCallback 的依賴項只有 api，確保函數本身穩定

  // 4. 在主要的 Effect 中呼叫這個函數
  // Effect 只在 currentPage 或 filter 變化時執行
  useEffect(() => {
    // trackPageView 是穩定的，能讀取到最新的值
    trackPageView();
  }, [currentPage, filter, trackPageView]); // 只在頁面或篩選條件變化時觸發

  // ... 其他組件邏輯
}
```

#### 與純 useRef 方式的區別和優勢

**主要區別在於：**
- **純 useRef 方式**：`trackPageView` 是一個普通的 JavaScript 函式，每次渲染都會重新定義（儘管其內容穩定），通常只在目前元件內部或 Effect 內部呼叫
- **useRef + useCallback 方式**：`trackPageView` 是一個被 `useCallback` 包裹的函式，它在整個元件生命週期中具有穩定的函式引用

**優勢（使用 useCallback 的理由）：**
1. **傳遞給子元件（效能優化）**：如果你需要將 `trackPageView` 作為 prop 傳遞給使用 `memo` 進行效能優化的子元件，`useCallback` 可以防止子元件不必要的重新渲染
2. **作為事件監聽器註冊與移除**：在訂閱/取消訂閱外部事件時，你需要一個穩定的函數引用來正確地移除監聽器

```jsx
// 範例：作為事件監聽器
useEffect(() => {
  window.addEventListener('scroll', trackPageView);
  return () => {
    window.removeEventListener('scroll', trackPageView);
  };
}, [trackPageView]); // trackPageView 穩定，Effect 只執行一次來綁定監聽器
```

---

### 替代方案總結

在沒有 `useEffectEvent` 的情況下，使用 `useRef` 是實作「穩定函式存取最新 state」的標準做法（方法一）。

`useEffectEvent` 的設計目的就是為了消除這種對 `useRef` 的手動管理，提供一種更簡潔、更符合 React 設計哲學的 API 來處理事件邏輯。

`useRef + useCallback` 的組合，實作了與 `useEffectEvent` 非常相似的功能：一個穩定的函式引用，可以安全地存取最新的 state。它比純 `useRef` 方法多提供了一層函式引用的穩定性（由 `useCallback` 保證），但仍然需要手動管理一個 `useRef` 和一個額外的 `useEffect` 來同步資料。

`useEffectEvent` 的設計目的正是將這三部分（建立 ref、同步 effect、穩定回呼）合併為一個單一、更簡潔的 API。

