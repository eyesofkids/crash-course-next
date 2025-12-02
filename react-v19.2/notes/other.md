Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).


# 什麼時候useEffect變成不能直接用setState的？最近的事？還有其它解決方案或影響？

## 時間線與背景

### 這不是最近才有的問題

**重要澄清：** `useEffect` 中直接使用 `setState` 的問題並不是最近才出現的，而是從 React Hooks 引入（React 16.8, 2019年）以來就一直存在的設計考量。

### 警告的演進

1. **早期（React 16.8-17）**：
   - 在 `useEffect` 中直接調用 `setState` 雖然不推薦，但不會有明確的警告
   - 開發者主要通過 ESLint 規則（`react-hooks/exhaustive-deps`）來發現問題

2. **React 18+（2022年）**：
   - React 18 引入了更嚴格的 **StrictMode** 行為
   - 在開發模式下，StrictMode 會雙重調用 Effect，更容易暴露問題
   - 開始出現更明確的警告訊息

3. **React 19（2024年）**：
   - React 19 加強了對這種模式的檢測和警告
   - 在開發模式下會明確警告「級聯渲染」（cascading renders）的問題
   - 這是您目前看到的警告訊息

## 為什麼不推薦在 useEffect 中直接 setState？

### 核心問題：級聯渲染（Cascading Renders）

```jsx
// ❌ 不推薦的模式
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    setCount(count + 1); // 直接同步調用 setState
  }, [count]); // 依賴 count，會導致無限循環
  
  return <div>{count}</div>;
}
```

**問題分析：**
1. `useEffect` 執行 → 調用 `setCount` → 觸發重新渲染
2. 重新渲染 → `useEffect` 再次執行（因為 `count` 改變了）
3. 形成**級聯渲染**，可能導致：
   - 效能問題
   - 無限循環（如果依賴項設置不當）
   - 難以追蹤的狀態更新

### React 的設計理念

根據 React 官方文檔，`useEffect` 的設計目的是：
- ✅ **同步外部系統**：與 DOM、第三方庫、平台 API 等外部系統同步
- ✅ **訂閱外部更新**：在回調函式中調用 `setState`（例如事件監聽器的回調）

而不是：
- ❌ **直接轉換狀態**：在 Effect 內部直接基於當前狀態計算新狀態

## 替代方案

### 方案一：使用 Lazy Initialization（初始化函式）⭐ 推薦

**適用場景：** 需要從外部系統（如 localStorage、API）讀取初始狀態值

在 React 中，Lazy Initialization（延遲初始化）是一種優化技術，用於確保函式元件的狀態初始值僅在第一次渲染時計算一次，而不是在每次渲染時都重新計算。

**核心優勢：**
- ✅ 避免在 `useEffect` 中同步調用 `setState`（解決 cascading renders 警告）
- ✅ 只在首次渲染時執行初始化邏輯，效能更好
- ✅ 程式碼更簡潔，邏輯更清晰

#### 如何使用延遲初始化？

使用 `useState` 鉤子時，傳入一個「初始化器函式」而不是直接傳入初始值：

```jsx
// ❌ 錯誤：每次渲染都會執行 localStorage.getItem()
const [count, setCount] = useState(localStorage.getItem('savedCount') || 0);

// ✅ 正確：使用初始化函式，只在首次渲染時執行
const [count, setCount] = useState(() => {
  const savedCount = localStorage.getItem('savedCount');
  return savedCount !== null ? parseInt(savedCount, 10) : 0;
});
```

#### 完整範例：從 localStorage 讀取購物車資料

```jsx
import { useState, useEffect } from 'react';

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
  // 注意：這是在響應外部變化（userId），是合理的場景
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
  }, [userId]);

  // 購物車操作...
  return <div>{/* 購物車 UI */}</div>;
}
```

#### 關鍵要點

1. **傳入函式而非值**：將一個函式 `() => initialValue` 傳給 `useState`，而不是直接傳入 `initialValue`
2. **執行時機**：這個函式只會在元件首次渲染時執行一次，計算並返回初始狀態
3. **效能優化**：在後續的重新渲染中，React 會忽略這個初始化器函式，直接使用已經建立的狀態值
4. **避免警告**：使用 lazy initialization 可以避免在初始渲染時在 `useEffect` 中同步調用 `setState` 的警告

#### 適用場景

- ✅ **從 localStorage/sessionStorage 讀取初始值**（同步操作）
- ✅ **計算成本昂貴的初始值**（避免每次渲染都重新計算）
- ✅ **需要根據 props 計算初始狀態**（同步計算）
- ❌ **從 API 獲取初始資料**（非同步操作，必須在 `useEffect` 中處理，詳見下方說明）

**注意：** 如果初始值依賴於 props，且 props 會改變，仍需要在 `useEffect` 中處理更新。但使用 lazy initialization 可以避免初始渲染時的警告。

#### 常見疑問：useState 的初始化函式是否必須是 Pure Function？

**問題：** `useState` 的 initializer function 不是要求 pure function 嗎？但讀取 localStorage 並不是 pure 的？

**回答：** 您觀察到了一個非常好的問題點！這涉及到 React 官方文件對於「pure function（純函式）」在不同語境下的定義與要求。

##### 1. 為什麼讀取 localStorage 不是 Pure Function？

從技術角度來看，讀取 `localStorage` 確實不是一個純函式操作，因為：

**純函式必須滿足兩個條件：**
1. **相同的輸入永遠產生相同的輸出**：給定輸入 X，輸出永遠是 Y
2. **沒有副作用**：它不會修改外部狀態、進行網路請求或操作 DOM 等

**`localStorage.getItem()` 違反了這兩個條件：**
- ❌ 違反第一點：在不同時間或不同瀏覽器會返回不同的值，即使沒有輸入參數
- ❌ 違反第二點：它讀取了外部環境（瀏覽器的儲存空間），這是一種副作用

##### 2. 為什麼 React 允許在 useState 初始化器中使用它？

React 官方文件在提到「純函式」時，通常是在強調**渲染邏輯**必須是純淨的，以確保元件在伺服器端渲染（SSR）或並行模式（Concurrent Mode）下能夠穩定且可預測地運行。

然而，`useState` 的初始化器函式有以下幾個特性，使得 React 允許這種「有限的副作用」：

**A. 執行時機的保證** ⭐ 最關鍵
- React 保證這個初始化器函式只會在元件第一次掛載（mount）到 DOM 時運行一次
- 因為它只運行一次，它的副作用被嚴格限制在初始化階段
- 這與元件主體函式（在每次重新渲染時運行）不同，元件主體嚴禁副作用

**B. 預期的副作用**
- 讀取 `localStorage`、`sessionStorage` 或從 URL 獲取初始參數，這些都是獲取初始狀態的常見且必要手段
- React 允許開發者在這裡執行這些特定的、獲取值的副作用，因為這是設置應用程式初始狀態的實際需求

**C. 官方文件的默許（或建議）**
- 雖然從嚴格的函式式程式設計角度來看它不純，但 React 官方文件在範例中經常使用這種模式
- 例如從 `localStorage` 恢復使用者偏好設定、從 URL 參數初始化狀態等
- 這表明 React 團隊認為這種用法是安全且可接受的

##### 3. 結論

您可以這樣理解：

| 場景 | 要求 | 說明 |
|------|------|------|
| **元件渲染函式本身** | 必須是嚴格的純函式 | 不能有 `localStorage` 讀寫、網路請求等副作用 |
| **useState 的初始化器** | 允許「獲取初始值」的副作用 | 雖然技術上包含副作用，但由於 React 保證它只運行一次，這種副作用是被允許和鼓勵的 |

**所以，在 `useState` 的初始化器中使用 `localStorage` 是安全且符合 React 設計規範的用法。**

**參考資料：**
- [React 官方文件：Lazy initial state](https://react.dev/reference/react/useState#lazy-initial-state)
- [React 官方文件：Keeping Components Pure](https://react.dev/learn/keeping-components-pure)

#### 常見疑問：可以從伺服器獲取值來初始化 state 嗎？

**問題：** 如果從伺服器取得值來作初始化 state，這樣也可以嗎？

**回答：** **不推薦**在 `useState` 的初始化函式中直接從伺服器獲取資料。原因如下：

##### 1. 初始化函式必須是同步的

`useState` 的初始化函式必須是**同步**的，它必須立即返回初始值。但從伺服器獲取資料是**非同步**操作，無法在初始化函式中完成。

```jsx
// ❌ 錯誤：無法在初始化函式中進行非同步操作
const [data, setData] = useState(async () => {
  const response = await fetch('/api/data'); // ❌ 這不會工作
  return response.json();
});

// ❌ 錯誤：即使使用 Promise，也無法等待結果
const [data, setData] = useState(() => {
  fetch('/api/data')
    .then(response => response.json())
    .then(data => {
      // ❌ 問題：這裡無法更新 state，因為初始化函式已經返回了
    });
  return null; // 只能返回 null 或預設值
});
```

##### 2. 正確的做法

**方案 A：使用 useEffect（推薦）**

```jsx
function Component() {
  // ✅ 使用 null 或預設值作為初始狀態
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ 在 useEffect 中非同步獲取資料
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch('/api/data');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []); // 空依賴，只在掛載時執行一次

  if (loading) return <div>載入中...</div>;
  if (error) return <div>錯誤：{error.message}</div>;
  return <div>{/* 顯示資料 */}</div>;
}
```

**方案 B：使用 React Query / SWR 等資料獲取函式庫（更推薦）**

```jsx
import { useQuery } from '@tanstack/react-query';

function Component() {
  // ✅ 使用專門的資料獲取函式庫，自動處理 loading、error 等狀態
  const { data, isLoading, error } = useQuery({
    queryKey: ['data'],
    queryFn: async () => {
      const response = await fetch('/api/data');
      return response.json();
    }
  });

  if (isLoading) return <div>載入中...</div>;
  if (error) return <div>錯誤：{error.message}</div>;
  return <div>{/* 顯示資料 */}</div>;
}
```

**方案 C：在 SSR 場景中從伺服器獲取（Next.js 等）**

在伺服器端渲染（SSR）的場景中，可以在伺服器端獲取資料，然後作為 props 傳入：

```jsx
// Next.js 範例
export async function getServerSideProps() {
  const data = await fetchDataFromServer();
  return {
    props: {
      initialData: data
    }
  };
}

function Component({ initialData }) {
  // ✅ 使用從伺服器獲取的資料作為初始值
  const [data, setData] = useState(initialData);
  
  // 後續更新仍需要在 useEffect 中處理
  return <div>{/* 顯示資料 */}</div>;
}
```

##### 3. 為什麼 localStorage 可以，但伺服器請求不行？

| 特性 | localStorage | 伺服器請求 |
|------|-------------|-----------|
| **執行方式** | 同步 | 非同步 |
| **執行時間** | 立即返回結果 | 需要等待網路請求 |
| **初始化函式要求** | ✅ 符合（同步） | ❌ 不符合（非同步） |
| **是否推薦** | ✅ 推薦 | ❌ 不推薦 |

**總結：**
- ✅ **localStorage**：同步操作，可以在初始化函式中使用
- ❌ **伺服器請求**：非同步操作，必須在 `useEffect` 中處理
- ✅ **SSR 資料**：可以作為 props 傳入，然後在初始化函式中使用

**參考資料：**
- [React 官方文件：You Might Not Need an Effect - Fetching data](https://react.dev/learn/you-might-not-need-an-effect#fetching-data)
- [React Query 官方文件](https://tanstack.com/query/latest)

### 方案二：重新思考是否需要 useEffect

很多情況下，您可能根本不需要 `useEffect`：

```jsx
// ❌ 不需要 useEffect
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    setCount(count + 1);
  }, []);
  
  return <div>{count}</div>;
}

// ✅ 更好的方式：在事件處理中直接更新
function Component() {
  const [count, setCount] = useState(0);
  
  const handleClick = () => {
    setCount(count + 1);
  };
  
  return <button onClick={handleClick}>{count}</button>;
}
```

### 方案三：使用 useRef 避免依賴

當您需要在 Effect 中讀取最新值但不想觸發重新執行時：

```jsx
import { useEffect, useRef, useState } from 'react';

function Component() {
  const [count, setCount] = useState(0);
  const countRef = useRef(count);
  
  // 同步最新值到 ref
  useEffect(() => {
    countRef.current = count;
  }, [count]);
  
  // 在另一個 Effect 中使用 ref（不會觸發重新執行）
  useEffect(() => {
    const timer = setInterval(() => {
      console.log('Current count:', countRef.current);
      // 可以在這裡調用 setState，但要注意避免無限循環
    }, 1000);
    
    return () => clearInterval(timer);
  }, []); // 空依賴，只執行一次
  
  return <div>{count}</div>;
}
```

### 方案四：使用 useEffectEvent（React 19+）

`useEffectEvent` 是 React 19 引入的新 Hook，專門解決這個問題：

```jsx
import { useEffect, useEffectEvent, useState } from 'react';

function Component() {
  const [count, setCount] = useState(0);
  const [userId, setUserId] = useState('user1');
  
  // useEffectEvent 創建一個穩定的函式引用（stable function reference）
  // 可以讀取最新值，但函式引用本身不會改變
  const logCount = useEffectEvent(() => {
    console.log('Count:', count, 'User:', userId);
    // 可以在這裡安全地使用最新的 count 和 userId
  });
  
  // Effect 只在特定條件下執行
  useEffect(() => {
    logCount(); // 始終使用最新的值，但不會觸發重新執行
  }, [/* 只在需要時觸發 */]);
  
  return <div>{count}</div>;
}
```

詳細說明請參考：`useEffectEvent.md`

### 方案五：使用函式式更新

如果必須在 Effect 中更新狀態，使用函式式更新：

```jsx
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    // ✅ 使用函式式更新，避免閉包問題
    setCount(prevCount => prevCount + 1);
  }, []); // 空依賴，只執行一次
  
  return <div>{count}</div>;
}
```

**注意：** 即使使用函式式更新，如果 Effect 的依賴項包含該狀態，仍可能導致無限循環。

### 方案六：將邏輯移到事件處理函式

很多情況下，狀態更新應該由使用者互動觸發：

```jsx
// ❌ 在 Effect 中更新
function Component() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetchData().then(setData);
  }, []);
  
  useEffect(() => {
    if (data) {
      setData(processData(data)); // 不推薦
    }
  }, [data]);
}

// ✅ 在事件處理中更新
function Component() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetchData().then(setData);
  }, []);
  
  const handleProcess = () => {
    if (data) {
      setData(processData(data)); // 由使用者操作觸發
    }
  };
  
  return <button onClick={handleProcess}>處理資料</button>;
}
```

## 影響與最佳實踐

### 效能影響

1. **級聯渲染**：每次狀態更新都會觸發新的渲染，如果 Effect 依賴該狀態，會形成連鎖反應
2. **不必要的計算**：Effect 可能在不必要的時候重新執行
3. **難以優化**：React 難以優化這種模式

### 開發體驗影響

1. **調試困難**：級聯渲染使狀態更新鏈難以追蹤
2. **預測性降低**：狀態更新的時機不清晰
3. **測試複雜**：需要模擬多輪渲染才能測試完整行為

### 最佳實踐建議

1. **優先使用 Lazy Initialization**：⭐ 對於需要從外部系統（localStorage、API）讀取初始值的場景，優先使用 `useState` 的初始化函式，避免在 `useEffect` 中同步調用 `setState`
2. **優先考慮事件處理**：狀態更新應該由使用者互動或明確的事件觸發
3. **Effect 用於同步外部系統**：將 Effect 用於與外部系統（DOM、API、訂閱）同步
4. **使用 useEffectEvent**：在 React 19+ 中，使用 `useEffectEvent` 處理需要最新值但不應觸發重新執行的情況
5. **正確設置依賴項**：遵循 React Hooks 規則，正確設置依賴項
6. **使用 ESLint 規則**：啟用 `react-hooks/exhaustive-deps` 規則來發現問題

## 總結

- **時間線**：這個問題從 React Hooks 引入以來就存在，React 19 加強了警告
- **不是禁止**：React 並沒有完全禁止在 `useEffect` 中使用 `setState`，而是警告可能導致問題的模式
- **核心原則**：Effect 應該用於同步外部系統，而不是直接轉換狀態
- **解決方案**（按推薦順序）：
  1. ⭐ **Lazy Initialization**：對於需要從外部系統讀取初始值的場景，優先使用 `useState` 的初始化函式
  2. **重新思考設計**：很多情況下可能根本不需要 `useEffect`
  3. **useEffectEvent**：在 React 19+ 中處理需要最新值但不應觸發重新執行的情況
  4. **useRef**：避免依賴問題
  5. **函式式更新**：如果必須在 Effect 中更新狀態
  6. **事件處理函式**：將邏輯移到使用者互動觸發的函式中

參考資料：
- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [Separating Events from Effects](https://react.dev/learn/separating-events-from-effects)

---

## 附錄：什麼是「穩定的函數」？

### 專有名詞

在 React 和 JavaScript 的語境中，「穩定的函數」對應的英文專有名詞有：

1. **Stable Function Reference**（穩定的函數引用）
2. **Stable Function Identity**（穩定的函數身份/標識）
3. **Persistent Function Reference**（持久化的函數引用）
4. **Memoized Function**（記憶化函數）- 特指通過 `useCallback` 創建的函數

### 核心概念

**穩定的函數**指的是：在元件重新渲染時，函數的**引用（reference）**保持不變。

#### 不穩定的函式（每次渲染都重新創建）

```jsx
function Component() {
  const [count, setCount] = useState(0);
  
  // ❌ 不穩定：每次渲染都會創建新的函式物件
  const handleClick = () => {
    console.log(count);
  };
  
  // 每次渲染時，handleClick 都是新的函式物件
  // handleClick !== handleClick (前一次渲染的函式)
  
  return <button onClick={handleClick}>Click</button>;
}
```

**問題：**
- 每次渲染都創建新的函式物件
- 如果這個函式被傳遞給子元件或作為依賴項，會導致不必要的重新渲染或 Effect 重新執行

#### 穩定的函式（引用保持不變）

```jsx
function Component() {
  const [count, setCount] = useState(0);
  
  // ✅ 穩定：使用 useCallback，函式引用在依賴項不變時保持不變
  const handleClick = useCallback(() => {
    console.log(count);
  }, [count]); // 只有 count 改變時才重新創建函式
  
  // 只要 count 不變，handleClick 就是同一個函式物件
  // handleClick === handleClick (前一次渲染的函式，如果 count 沒變)
  
  return <button onClick={handleClick}>Click</button>;
}
```

**優勢：**
- 函式引用在依賴項不變時保持穩定
- 可以安全地放入 `useEffect` 的依賴陣列
- 傳遞給使用 `React.memo` 的子元件時，不會觸發不必要的重新渲染

### useEffectEvent 的特殊性

`useEffectEvent` 創建的函式具有**雙重特性**：

1. **函式引用穩定**：函式物件本身在元件生命週期中保持不變
2. **能讀取最新值**：即使引用不變，函式內部總能讀取到最新的 state 和 props

```jsx
function Component() {
  const [count, setCount] = useState(0);
  const [userId, setUserId] = useState('user1');
  
  // useEffectEvent 創建的函數：
  // 1. 引用穩定（不會觸發 Effect 重新執行）
  // 2. 能讀取最新的 count 和 userId（即使它們不在依賴項中）
  const logData = useEffectEvent(() => {
    console.log(count, userId); // 始終是最新值
  });
  
  useEffect(() => {
    logData(); // 可以安全地放入依賴數組，因為 logData 引用穩定
  }, [logData]); // 實際上 logData 永遠不會改變，所以 Effect 只執行一次
  
  // 即使 count 或 userId 改變，Effect 也不會重新執行
  // 但 logData() 內部讀取的始終是最新的值
}
```

### 如何判斷函式是否穩定？

在 JavaScript 中，可以使用**引用相等性（reference equality）**來判斷：

```jsx
import { useState, useRef, useCallback, useEffect, useEffectEvent } from 'react';

function Component() {
  const [count, setCount] = useState(0);
  const prevFnRef = useRef(null);
  const prevStableFnRef = useRef(null);
  const prevEventFnRef = useRef(null);
  
  // 不穩定：每次渲染都創建新的函式物件
  const fn = () => {};
  if (prevFnRef.current !== null) {
    console.log(fn === prevFnRef.current); // false（每次渲染都是新物件）
  }
  prevFnRef.current = fn;
  
  // 穩定（使用 useCallback）：依賴項不變時，引用保持不變
  const stableFn = useCallback(() => {}, []);
  if (prevStableFnRef.current !== null) {
    console.log(stableFn === prevStableFnRef.current); // true（同一個物件）
  }
  prevStableFnRef.current = stableFn;
  
  // useEffectEvent 創建的函式：引用始終穩定
  const eventFn = useEffectEvent(() => {});
  if (prevEventFnRef.current !== null) {
    console.log(eventFn === prevEventFnRef.current); // true（同一個物件）
  }
  prevEventFnRef.current = eventFn;
  
  return <div>{count}</div>;
}
```

**更簡單的驗證方式：**

```jsx
import { useState, useCallback, useEffect, useEffectEvent } from 'react';

function Component() {
  const [count, setCount] = useState(0);
  
  // 不穩定：每次渲染都創建新函式
  const unstableFn = () => console.log(count);
  
  // 穩定：使用 useCallback，依賴項不變時引用不變
  const stableFn = useCallback(() => console.log(count), [count]);
  
  // useEffectEvent：引用始終穩定，但能讀取最新值
  const eventFn = useEffectEvent(() => console.log(count));
  
  useEffect(() => {
    // unstableFn 每次渲染都不同，會導致 Effect 每次都重新執行
    // stableFn 在 count 不變時引用穩定，Effect 不會重新執行
    // eventFn 引用始終穩定，Effect 只執行一次，但能讀取最新的 count
  }, [unstableFn, stableFn, eventFn]);
}
```

### 什麼時候需要穩定的函式？

**重要澄清：不是所有事件處理函式都需要穩定！** React 對普通的事件處理函式有優化，大多數情況下不需要使用 `useCallback`。

#### ✅ 不需要穩定函數的情況（大多數情況）

```jsx
function Component() {
  const [count, setCount] = useState(0);
  
  // ✅ 普通事件處理函式，不需要 useCallback
  const handleClick = () => {
    setCount(count + 1);
  };
  
  // ✅ 直接傳遞給 JSX，React 會自動處理
  return <button onClick={handleClick}>Count: {count}</button>;
}
```

**為什麼不需要？**
- React 的事件系統已經優化，每次渲染創建新函數的效能開銷很小
- 現代瀏覽器創建函式物件非常快
- 過度使用 `useCallback` 反而會增加記憶體使用和程式碼複雜度

#### ❌ 需要穩定函數的情況（特定場景）

只有在以下**三種特定場景**下，才需要穩定的函式：

### 為什麼需要穩定的函式？

1. **避免不必要的 Effect 重新執行**
   ```jsx
   useEffect(() => {
     // 如果 callback 不穩定，每次渲染都會重新執行
   }, [callback]); // callback 必須穩定
   ```

2. **優化子元件渲染**
   ```jsx
   const Child = React.memo(({ onClick }) => {
     // 如果 onClick 不穩定，Child 會每次都重新渲染
   });
   
   <Child onClick={stableCallback} /> // 需要穩定的函數
   ```

3. **正確的事件監聽器管理**
   ```jsx
   useEffect(() => {
     window.addEventListener('scroll', handler);
     return () => {
       // 如果 handler 不穩定，無法正確移除監聽器
       window.removeEventListener('scroll', handler);
     };
   }, [handler]); // handler 必須穩定
   ```

#### 實際範例對比

**場景一：普通事件處理（不需要穩定）**

```jsx
function TodoList() {
  const [todos, setTodos] = useState([]);
  
  // ✅ 不需要 useCallback，直接使用即可
  const handleAdd = (text) => {
    setTodos([...todos, { id: Date.now(), text }]);
  };
  
  const handleDelete = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };
  
  return (
    <div>
      <button onClick={() => handleAdd('New Todo')}>Add</button>
      {todos.map(todo => (
        <div key={todo.id}>
          {todo.text}
          <button onClick={() => handleDelete(todo.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

**場景二：傳遞給使用 memo 的子元件（需要穩定）**

```jsx
// 子元件使用 memo 優化
const TodoItem = React.memo(({ todo, onDelete }) => {
  return (
    <div>
      {todo.text}
      <button onClick={onDelete}>Delete</button>
    </div>
  );
});

function TodoList() {
  const [todos, setTodos] = useState([]);
  
  // ❌ 不穩定：每次渲染都創建新函式，導致 TodoItem 每次都重新渲染
  // const handleDelete = (id) => {
  //   setTodos(todos.filter(todo => todo.id !== id));
  // };
  
  // ✅ 穩定：使用 useCallback，只有依賴項改變時才重新創建
  const handleDelete = useCallback((id) => {
    setTodos(todos => todos.filter(todo => todo.id !== id));
  }, []); // 使用函式式更新，不需要 todos 依賴
  
  return (
    <div>
      {todos.map(todo => (
        <TodoItem 
          key={todo.id} 
          todo={todo} 
          onDelete={() => handleDelete(todo.id)} 
        />
      ))}
    </div>
  );
}
```

**場景三：Effect 依賴項（需要穩定）**

```jsx
function Component() {
  const [count, setCount] = useState(0);
  
  // ❌ 不穩定：每次渲染都創建新函式，導致 Effect 每次都重新執行
  // const fetchData = async () => {
  //   const data = await api.getData(count);
  //   console.log(data);
  // };
  
  // ✅ 穩定：使用 useCallback 或 useEffectEvent
  const fetchData = useCallback(async () => {
    const data = await api.getData(count);
    console.log(data);
  }, [count]); // 只有 count 改變時才重新創建
  
  useEffect(() => {
    fetchData();
  }, [fetchData]); // fetchData 穩定，Effect 只在 count 改變時執行
}
```

**場景四：外部事件監聽器（需要穩定）**

```jsx
function Component() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // ✅ 穩定：使用 useCallback，確保監聽器正確添加和移除
  const handleScroll = useCallback(() => {
    setPosition({ x: window.scrollX, y: window.scrollY });
  }, []);
  
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]); // handleScroll 穩定，Effect 只執行一次
}
```

#### React 官方建議

根據 React 官方文檔，**不要過度使用 `useCallback`**：

> "只有在以下情況下，`useCallback` 才有價值：
> 1. 你將函式作為 prop 傳遞給使用 `React.memo` 優化的元件
> 2. 函式是其他 Hook 的依賴項
> 
> 其他情況下，`useCallback` 的開銷可能大於收益。"

**效能考量：**
- 創建函式物件的開銷：**極小**（現代 JavaScript 引擎非常快）
- `useCallback` 的開銷：需要比較依賴項、儲存函式引用
- 過度使用 `useCallback` 的風險：增加記憶體使用、程式碼複雜度、可能導致過時閉包問題

**最佳實踐：**
1. **預設不使用 `useCallback`**：只在遇到效能問題時再優化
2. **使用 React DevTools Profiler**：實際測量效能，不要猜測（詳見下方使用指南）
3. **只在必要時使用**：傳給 `memo` 元件、Effect 依賴、外部事件監聽器

### Memoized Function 與穩定函式的關係

**是的，Memoized Function 是穩定函式的一種實現方式，但兩者不完全等同。**

#### 關係說明

1. **Memoized Function 是穩定函式的子集**
   - `useCallback` 創建的函式是 Memoized Function，也是穩定函式
   - 但穩定函式不一定是 Memoized Function

2. **穩定函式的實現方式**
   - ✅ **Memoized Function**：通過 `useCallback` 或 `useMemo` 創建
   - ✅ **useEffectEvent**：React 19+ 創建的穩定函式（不是 memoized）
   - ✅ **useRef + 手動管理**：手動保持引用穩定（不是 memoized）

#### 對比範例

```jsx
function Component() {
  const [count, setCount] = useState(0);
  
  // 1. Memoized Function（也是穩定函式）
  const memoizedFn = useCallback(() => {
    console.log(count);
  }, [count]);
  
  // 2. useEffectEvent 創建的穩定函式（不是 memoized）
  const eventFn = useEffectEvent(() => {
    console.log(count);
  });
  
  // 3. 使用 useRef 手動管理的穩定函式（不是 memoized）
  const countRef = useRef(count);
  useEffect(() => {
    countRef.current = count;
  }, [count]);
  const refBasedFn = useCallback(() => {
    console.log(countRef.current);
  }, []); // 這裡的 useCallback 只是為了穩定引用，不是為了 memoize
  
  // 所有這些函式都是穩定的，但只有 memoizedFn 是 Memoized Function
}
```

#### 關鍵區別

| 特性 | Memoized Function | 其他穩定函數（如 useEffectEvent） |
|------|------------------|--------------------------------|
| **實現機制** | 通過比較依賴項來決定是否重新創建 | React 內部機制保證引用穩定 |
| **依賴項管理** | 需要手動指定依賴項 | 自動處理，無需依賴項 |
| **讀取最新值** | 依賴項改變時重新創建函式 | 引用不變，但能讀取最新值 |
| **使用場景** | 需要明確控制何時重新創建 | 需要穩定引用但能讀取最新值 |

#### 實際應用

```jsx
function Component() {
  const [count, setCount] = useState(0);
  const [userId, setUserId] = useState('user1');
  
  // Memoized Function：依賴項改變時重新創建
  const memoizedFn = useCallback(() => {
    console.log(count, userId);
  }, [count, userId]); // count 或 userId 改變時，函式引用會改變
  
  // useEffectEvent：引用始終穩定，但能讀取最新值
  const eventFn = useEffectEvent(() => {
    console.log(count, userId); // 始終讀取最新值，但引用不變
  });
  
  useEffect(() => {
    // memoizedFn：count 或 userId 改變時，引用會改變，Effect 會重新執行
    // eventFn：引用始終穩定，Effect 只執行一次，但能讀取最新值
  }, [memoizedFn, eventFn]);
}
```

**總結：**
- ✅ Memoized Function 是穩定函式的一種實現方式
- ✅ 所有 Memoized Function 都是穩定函式（在依賴項不變時）
- ❌ 但不是所有穩定函式都是 Memoized Function
- 🔑 關鍵區別：Memoized Function 依賴項改變時會重新創建，而 `useEffectEvent` 等始終保持引用穩定

### 相關概念對比

| 概念 | 英文 | 說明 |
|------|------|------|
| **穩定的函式引用** | Stable Function Reference | 函式物件引用在渲染間保持不變（**總稱**） |
| **記憶化函式** | Memoized Function | 通過 `useCallback` 或 `useMemo` 創建的函式（**穩定函式的一種實現**） |
| **純函式** | Pure Function | 相同輸入產生相同輸出，無副作用（與穩定引用不同） |
| **函式身份** | Function Identity | 函式物件的唯一標識（通過 `===` 比較） |
| **閉包** | Closure | 函式捕獲外部變數的機制（可能導致過時閉包問題） |

### 總結

- **專有名詞**：Stable Function Reference / Stable Function Identity
- **核心特徵**：函式引用在元件重新渲染時保持不變（`===` 比較返回 `true`）
- **實現方式**：`useCallback`、`useEffectEvent`、`useRef` + 手動管理
- **重要性**：避免不必要的重新渲染、正確管理 Effect 依賴、優化效能

---

## 附錄：如何使用 React DevTools Profiler 測量效能

### 安裝 React DevTools

1. **Chrome 瀏覽器**：
   - 前往 [Chrome 網上應用店](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
   - 搜索並安裝「React Developer Tools」擴展

2. **Firefox 瀏覽器**：
   - 前往 [Firefox 附加元件](https://addons.mozilla.org/zh-CN/firefox/addon/react-devtools/)
   - 搜索並安裝「React Developer Tools」擴展

3. **Edge 瀏覽器**：
   - 使用 Chrome 擴展商店安裝（Edge 支持 Chrome 擴展）

### 基本使用步驟

#### 1. 打開 DevTools

- 按 `F12` 或 `Ctrl+Shift+I`（Windows/Linux）或 `Cmd+Option+I`（Mac）
- 在開發者工具中，找到 **「Profiler」** 標籤頁

#### 2. 開始記錄效能

1. 點擊 **「開始記錄」（Start recording）** 按鈕（圓形紅色按鈕）
2. 在應用中執行您想要分析的操作（例如：點擊按鈕、輸入文字、滾動頁面等）
3. 完成操作後，點擊 **「停止記錄」（Stop recording）** 按鈕

#### 3. 解讀效能資料

Profiler 會顯示一個火焰圖（Flamegraph）或排名圖（Ranked chart），包含以下信息：

- **渲染時間**：每個元件的渲染耗時
- **渲染次數**：元件在記錄期間渲染了多少次
- **為什麼渲染**：元件重新渲染的原因（props 改變、state 改變等）

### 實際案例：測量 useCallback 的效果

#### 場景：判斷是否需要使用 useCallback

**步驟一：記錄不使用 useCallback 的效能**

```jsx
// 測試元件：不使用 useCallback
function TodoList() {
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState('');
  
  // ❌ 不使用 useCallback
  const handleDelete = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };
  
  const filteredTodos = todos.filter(todo => 
    todo.text.includes(filter)
  );
  
  return (
    <div>
      <input 
        value={filter} 
        onChange={(e) => setFilter(e.target.value)} 
      />
      {filteredTodos.map(todo => (
        <TodoItem 
          key={todo.id} 
          todo={todo} 
          onDelete={() => handleDelete(todo.id)} 
        />
      ))}
    </div>
  );
}

const TodoItem = React.memo(({ todo, onDelete }) => {
  return (
    <div>
      {todo.text}
      <button onClick={onDelete}>Delete</button>
    </div>
  );
});
```

**測量步驟：**
1. 打開 Profiler，開始記錄
2. 在輸入框中輸入文字（改變 `filter` state）
3. 停止記錄
4. **觀察結果**：查看 `TodoItem` 元件是否在 `filter` 改變時重新渲染

**預期結果（不使用 useCallback）：**
- `TodoItem` 元件會在 `filter` 改變時重新渲染（即使 `todo` 和 `onDelete` 沒有實際改變）
- 這是因為 `onDelete` 函數每次都是新的引用

**步驟二：記錄使用 useCallback 的效能**

```jsx
// 測試元件：使用 useCallback
function TodoList() {
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState('');
  
  // ✅ 使用 useCallback
  const handleDelete = useCallback((id) => {
    setTodos(todos => todos.filter(todo => todo.id !== id));
  }, []); // 使用函式式更新，不需要 todos 依賴
  
  const filteredTodos = todos.filter(todo => 
    todo.text.includes(filter)
  );
  
  return (
    <div>
      <input 
        value={filter} 
        onChange={(e) => setFilter(e.target.value)} 
      />
      {filteredTodos.map(todo => (
        <TodoItem 
          key={todo.id} 
          todo={todo} 
          onDelete={() => handleDelete(todo.id)} 
        />
      ))}
    </div>
  );
}
```

**測量步驟：**
1. 打開 Profiler，開始記錄
2. 在輸入框中輸入文字（改變 `filter` state）
3. 停止記錄
4. **觀察結果**：查看 `TodoItem` 元件是否在 `filter` 改變時重新渲染

**預期結果（使用 useCallback）：**
- `TodoItem` 元件**不會**在 `filter` 改變時重新渲染
- 因為 `handleDelete` 函數引用穩定，`React.memo` 可以正確比較 props

#### 步驟三：對比分析

**關鍵指標：**

1. **渲染次數**
   - 不使用 `useCallback`：`TodoItem` 渲染 10 次（每次 `filter` 改變）
   - 使用 `useCallback`：`TodoItem` 只渲染 1 次（初始渲染）

2. **總渲染時間**
   - 查看火焰圖中每個 `TodoItem` 的渲染時間
   - 如果每個元件渲染時間很短（< 1ms），可能不需要優化
   - 如果渲染時間較長（> 5ms）且渲染次數多，優化才有意義

3. **效能提升**
   - 計算總渲染時間的差異
   - 如果差異很小（< 5ms），`useCallback` 的開銷可能大於收益

### Profiler 視圖說明

#### 火焰圖（Flamegraph）

- **寬度**：表示元件渲染時間
- **顏色**：表示渲染時間相對長短（黃色/綠色 = 快，紅色 = 慢）
- **層級**：表示元件樹的層級關係

#### 排名圖（Ranked）

- 按渲染時間排序，最慢的元件在頂部
- 快速識別效能瓶頸

#### 元件詳情

點擊任何元件可以看到：
- **渲染時間**：本次渲染耗時
- **為什麼渲染**：渲染原因（props 改變、state 改變、父元件渲染等）
- **Props 和 State**：當前的 props 和 state 值

### 實際判斷標準

#### ✅ 需要使用 useCallback 的情況

1. **Profiler 顯示元件頻繁重新渲染**
   - 元件在不相關的 state 改變時也重新渲染
   - 渲染次數明顯多於預期

2. **渲染時間較長**
   - 單次渲染時間 > 5ms
   - 總渲染時間影響使用者體驗

3. **元件樹較深**
   - 重新渲染會導致大量子元件重新渲染
   - 使用 `useCallback` 可以阻止渲染傳播

#### ❌ 不需要使用 useCallback 的情況

1. **渲染時間很短**
   - 單次渲染時間 < 1ms
   - 即使重新渲染，使用者也感覺不到

2. **渲染次數正常**
   - 元件只在相關 state 改變時渲染
   - 沒有不必要的重新渲染

3. **效能影響可忽略**
   - Profiler 顯示總渲染時間差異 < 5ms
   - `useCallback` 的開銷可能大於收益

### 最佳實踐建議

1. **先測量，再優化**
   - 不要預先使用 `useCallback`
   - 使用 Profiler 找出實際的效能問題

2. **設定效能基準**
   - 記錄優化前的效能資料
   - 優化後再次測量，確認是否有改善

3. **關注使用者體驗**
   - 如果使用者感覺不到卡頓，可能不需要優化
   - 60 FPS（每幀 16.67ms）是流暢的標準

4. **考慮開發成本**
   - `useCallback` 增加程式碼複雜度
   - 如果效能提升很小，可能不值得

### 常見問題

**Q: Profiler 顯示元件重新渲染，但渲染時間很短，需要優化嗎？**
A: 通常不需要。如果渲染時間 < 1ms，重新渲染的開銷很小，`useCallback` 的開銷可能更大。

**Q: 如何知道是 props 改變還是函數引用改變導致的重新渲染？**
A: 點擊元件查看「為什麼渲染」部分，會顯示具體的渲染原因。

**Q: Profiler 在生產環境可以使用嗎？**
A: 不建議。Profiler 會增加效能開銷，只在開發環境使用。

### 參考資源

- [React Profiler 官方文檔](https://react.dev/learn/react-developer-tools#profiler)
- [React DevTools 使用指南](https://react.dev/learn/react-developer-tools)
- [效能優化最佳實踐](https://react.dev/learn/render-and-commit#optimizing-performance)