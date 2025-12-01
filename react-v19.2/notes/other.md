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
   - 性能問題
   - 無限循環（如果依賴項設置不當）
   - 難以追蹤的狀態更新

### React 的設計理念

根據 React 官方文檔，`useEffect` 的設計目的是：
- ✅ **同步外部系統**：與 DOM、第三方庫、平台 API 等外部系統同步
- ✅ **訂閱外部更新**：在回調函數中調用 `setState`（例如事件監聽器的回調）

而不是：
- ❌ **直接轉換狀態**：在 Effect 內部直接基於當前狀態計算新狀態

## 替代方案

### 方案一：重新思考是否需要 useEffect

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

### 方案二：使用 useRef 避免依賴

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

### 方案三：使用 useEffectEvent（React 19+）

`useEffectEvent` 是 React 19 引入的新 Hook，專門解決這個問題：

```jsx
import { useEffect, useEffectEvent, useState } from 'react';

function Component() {
  const [count, setCount] = useState(0);
  const [userId, setUserId] = useState('user1');
  
  // useEffectEvent 創建一個穩定的函數引用（stable function reference）
  // 可以讀取最新值，但函數引用本身不會改變
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

### 方案四：使用函數式更新

如果必須在 Effect 中更新狀態，使用函數式更新：

```jsx
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    // ✅ 使用函數式更新，避免閉包問題
    setCount(prevCount => prevCount + 1);
  }, []); // 空依賴，只執行一次
  
  return <div>{count}</div>;
}
```

**注意：** 即使使用函數式更新，如果 Effect 的依賴項包含該狀態，仍可能導致無限循環。

### 方案五：將邏輯移到事件處理函數

很多情況下，狀態更新應該由用戶交互觸發：

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
      setData(processData(data)); // 由用戶操作觸發
    }
  };
  
  return <button onClick={handleProcess}>處理數據</button>;
}
```

## 影響與最佳實踐

### 性能影響

1. **級聯渲染**：每次狀態更新都會觸發新的渲染，如果 Effect 依賴該狀態，會形成連鎖反應
2. **不必要的計算**：Effect 可能在不必要的時候重新執行
3. **難以優化**：React 難以優化這種模式

### 開發體驗影響

1. **調試困難**：級聯渲染使狀態更新鏈難以追蹤
2. **預測性降低**：狀態更新的時機不清晰
3. **測試複雜**：需要模擬多輪渲染才能測試完整行為

### 最佳實踐建議

1. **優先考慮事件處理**：狀態更新應該由用戶交互或明確的事件觸發
2. **Effect 用於同步外部系統**：將 Effect 用於與外部系統（DOM、API、訂閱）同步
3. **使用 useEffectEvent**：在 React 19+ 中，使用 `useEffectEvent` 處理需要最新值但不應觸發重新執行的情況
4. **正確設置依賴項**：遵循 React Hooks 規則，正確設置依賴項
5. **使用 ESLint 規則**：啟用 `react-hooks/exhaustive-deps` 規則來發現問題

## 總結

- **時間線**：這個問題從 React Hooks 引入以來就存在，React 19 加強了警告
- **不是禁止**：React 並沒有完全禁止在 `useEffect` 中使用 `setState`，而是警告可能導致問題的模式
- **核心原則**：Effect 應該用於同步外部系統，而不是直接轉換狀態
- **解決方案**：重新思考設計、使用 `useEffectEvent`、`useRef`，或將邏輯移到事件處理函數中

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

**穩定的函數**指的是：在組件重新渲染時，函數的**引用（reference）**保持不變。

#### 不穩定的函數（每次渲染都重新創建）

```jsx
function Component() {
  const [count, setCount] = useState(0);
  
  // ❌ 不穩定：每次渲染都會創建新的函數對象
  const handleClick = () => {
    console.log(count);
  };
  
  // 每次渲染時，handleClick 都是新的函數對象
  // handleClick !== handleClick (前一次渲染的函數)
  
  return <button onClick={handleClick}>Click</button>;
}
```

**問題：**
- 每次渲染都創建新的函數對象
- 如果這個函數被傳遞給子組件或作為依賴項，會導致不必要的重新渲染或 Effect 重新執行

#### 穩定的函數（引用保持不變）

```jsx
function Component() {
  const [count, setCount] = useState(0);
  
  // ✅ 穩定：使用 useCallback，函數引用在依賴項不變時保持不變
  const handleClick = useCallback(() => {
    console.log(count);
  }, [count]); // 只有 count 改變時才重新創建函數
  
  // 只要 count 不變，handleClick 就是同一個函數對象
  // handleClick === handleClick (前一次渲染的函數，如果 count 沒變)
  
  return <button onClick={handleClick}>Click</button>;
}
```

**優勢：**
- 函數引用在依賴項不變時保持穩定
- 可以安全地放入 `useEffect` 的依賴數組
- 傳遞給使用 `React.memo` 的子組件時，不會觸發不必要的重新渲染

### useEffectEvent 的特殊性

`useEffectEvent` 創建的函數具有**雙重特性**：

1. **函數引用穩定**：函數對象本身在組件生命週期中保持不變
2. **能讀取最新值**：即使引用不變，函數內部總能讀取到最新的 state 和 props

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

### 如何判斷函數是否穩定？

在 JavaScript 中，可以使用**引用相等性（reference equality）**來判斷：

```jsx
import { useState, useRef, useCallback, useEffect, useEffectEvent } from 'react';

function Component() {
  const [count, setCount] = useState(0);
  const prevFnRef = useRef(null);
  const prevStableFnRef = useRef(null);
  const prevEventFnRef = useRef(null);
  
  // 不穩定：每次渲染都創建新的函數對象
  const fn = () => {};
  if (prevFnRef.current !== null) {
    console.log(fn === prevFnRef.current); // false（每次渲染都是新對象）
  }
  prevFnRef.current = fn;
  
  // 穩定（使用 useCallback）：依賴項不變時，引用保持不變
  const stableFn = useCallback(() => {}, []);
  if (prevStableFnRef.current !== null) {
    console.log(stableFn === prevStableFnRef.current); // true（同一個對象）
  }
  prevStableFnRef.current = stableFn;
  
  // useEffectEvent 創建的函數：引用始終穩定
  const eventFn = useEffectEvent(() => {});
  if (prevEventFnRef.current !== null) {
    console.log(eventFn === prevEventFnRef.current); // true（同一個對象）
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
  
  // 不穩定：每次渲染都創建新函數
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

### 什麼時候需要穩定的函數？

**重要澄清：不是所有事件處理函數都需要穩定！** React 對普通的事件處理函數有優化，大多數情況下不需要使用 `useCallback`。

#### ✅ 不需要穩定函數的情況（大多數情況）

```jsx
function Component() {
  const [count, setCount] = useState(0);
  
  // ✅ 普通事件處理函數，不需要 useCallback
  const handleClick = () => {
    setCount(count + 1);
  };
  
  // ✅ 直接傳遞給 JSX，React 會自動處理
  return <button onClick={handleClick}>Count: {count}</button>;
}
```

**為什麼不需要？**
- React 的事件系統已經優化，每次渲染創建新函數的性能開銷很小
- 現代瀏覽器創建函數對象非常快
- 過度使用 `useCallback` 反而會增加記憶體使用和程式碼複雜度

#### ❌ 需要穩定函數的情況（特定場景）

只有在以下**三種特定場景**下，才需要穩定的函數：

### 為什麼需要穩定的函數？

1. **避免不必要的 Effect 重新執行**
   ```jsx
   useEffect(() => {
     // 如果 callback 不穩定，每次渲染都會重新執行
   }, [callback]); // callback 必須穩定
   ```

2. **優化子組件渲染**
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

**場景二：傳遞給使用 memo 的子組件（需要穩定）**

```jsx
// 子組件使用 memo 優化
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
  
  // ❌ 不穩定：每次渲染都創建新函數，導致 TodoItem 每次都重新渲染
  // const handleDelete = (id) => {
  //   setTodos(todos.filter(todo => todo.id !== id));
  // };
  
  // ✅ 穩定：使用 useCallback，只有依賴項改變時才重新創建
  const handleDelete = useCallback((id) => {
    setTodos(todos => todos.filter(todo => todo.id !== id));
  }, []); // 使用函數式更新，不需要 todos 依賴
  
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
  
  // ❌ 不穩定：每次渲染都創建新函數，導致 Effect 每次都重新執行
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
> 1. 你將函數作為 prop 傳遞給使用 `React.memo` 優化的組件
> 2. 函數是其他 Hook 的依賴項
> 
> 其他情況下，`useCallback` 的開銷可能大於收益。"

**性能考量：**
- 創建函數對象的開銷：**極小**（現代 JavaScript 引擎非常快）
- `useCallback` 的開銷：需要比較依賴項、儲存函數引用
- 過度使用 `useCallback` 的風險：增加記憶體使用、程式碼複雜度、可能導致過時閉包問題

**最佳實踐：**
1. **預設不使用 `useCallback`**：只在遇到性能問題時再優化
2. **使用 React DevTools Profiler**：實際測量性能，不要猜測（詳見下方使用指南）
3. **只在必要時使用**：傳給 `memo` 組件、Effect 依賴、外部事件監聽器

### Memoized Function 與穩定函數的關係

**是的，Memoized Function 是穩定函數的一種實現方式，但兩者不完全等同。**

#### 關係說明

1. **Memoized Function 是穩定函數的子集**
   - `useCallback` 創建的函數是 Memoized Function，也是穩定函數
   - 但穩定函數不一定是 Memoized Function

2. **穩定函數的實現方式**
   - ✅ **Memoized Function**：通過 `useCallback` 或 `useMemo` 創建
   - ✅ **useEffectEvent**：React 19+ 創建的穩定函數（不是 memoized）
   - ✅ **useRef + 手動管理**：手動保持引用穩定（不是 memoized）

#### 對比範例

```jsx
function Component() {
  const [count, setCount] = useState(0);
  
  // 1. Memoized Function（也是穩定函數）
  const memoizedFn = useCallback(() => {
    console.log(count);
  }, [count]);
  
  // 2. useEffectEvent 創建的穩定函數（不是 memoized）
  const eventFn = useEffectEvent(() => {
    console.log(count);
  });
  
  // 3. 使用 useRef 手動管理的穩定函數（不是 memoized）
  const countRef = useRef(count);
  useEffect(() => {
    countRef.current = count;
  }, [count]);
  const refBasedFn = useCallback(() => {
    console.log(countRef.current);
  }, []); // 這裡的 useCallback 只是為了穩定引用，不是為了 memoize
  
  // 所有這些函數都是穩定的，但只有 memoizedFn 是 Memoized Function
}
```

#### 關鍵區別

| 特性 | Memoized Function | 其他穩定函數（如 useEffectEvent） |
|------|------------------|--------------------------------|
| **實現機制** | 通過比較依賴項來決定是否重新創建 | React 內部機制保證引用穩定 |
| **依賴項管理** | 需要手動指定依賴項 | 自動處理，無需依賴項 |
| **讀取最新值** | 依賴項改變時重新創建函數 | 引用不變，但能讀取最新值 |
| **使用場景** | 需要明確控制何時重新創建 | 需要穩定引用但能讀取最新值 |

#### 實際應用

```jsx
function Component() {
  const [count, setCount] = useState(0);
  const [userId, setUserId] = useState('user1');
  
  // Memoized Function：依賴項改變時重新創建
  const memoizedFn = useCallback(() => {
    console.log(count, userId);
  }, [count, userId]); // count 或 userId 改變時，函數引用會改變
  
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
- ✅ Memoized Function 是穩定函數的一種實現方式
- ✅ 所有 Memoized Function 都是穩定函數（在依賴項不變時）
- ❌ 但不是所有穩定函數都是 Memoized Function
- 🔑 關鍵區別：Memoized Function 依賴項改變時會重新創建，而 `useEffectEvent` 等始終保持引用穩定

### 相關概念對比

| 概念 | 英文 | 說明 |
|------|------|------|
| **穩定的函數引用** | Stable Function Reference | 函數對象引用在渲染間保持不變（**總稱**） |
| **記憶化函數** | Memoized Function | 通過 `useCallback` 或 `useMemo` 創建的函數（**穩定函數的一種實現**） |
| **純函數** | Pure Function | 相同輸入產生相同輸出，無副作用（與穩定引用不同） |
| **函數身份** | Function Identity | 函數對象的唯一標識（通過 `===` 比較） |
| **閉包** | Closure | 函數捕獲外部變數的機制（可能導致過時閉包問題） |

### 總結

- **專有名詞**：Stable Function Reference / Stable Function Identity
- **核心特徵**：函數引用在組件重新渲染時保持不變（`===` 比較返回 `true`）
- **實現方式**：`useCallback`、`useEffectEvent`、`useRef` + 手動管理
- **重要性**：避免不必要的重新渲染、正確管理 Effect 依賴、優化性能

---

## 附錄：如何使用 React DevTools Profiler 測量性能

### 安裝 React DevTools

1. **Chrome 瀏覽器**：
   - 前往 [Chrome 網上應用店](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
   - 搜索並安裝「React Developer Tools」擴展

2. **Firefox 瀏覽器**：
   - 前往 [Firefox 附加組件](https://addons.mozilla.org/zh-CN/firefox/addon/react-devtools/)
   - 搜索並安裝「React Developer Tools」擴展

3. **Edge 瀏覽器**：
   - 使用 Chrome 擴展商店安裝（Edge 支持 Chrome 擴展）

### 基本使用步驟

#### 1. 打開 DevTools

- 按 `F12` 或 `Ctrl+Shift+I`（Windows/Linux）或 `Cmd+Option+I`（Mac）
- 在開發者工具中，找到 **「Profiler」** 標籤頁

#### 2. 開始記錄性能

1. 點擊 **「開始記錄」（Start recording）** 按鈕（圓形紅色按鈕）
2. 在應用中執行您想要分析的操作（例如：點擊按鈕、輸入文字、滾動頁面等）
3. 完成操作後，點擊 **「停止記錄」（Stop recording）** 按鈕

#### 3. 解讀性能數據

Profiler 會顯示一個火焰圖（Flamegraph）或排名圖（Ranked chart），包含以下信息：

- **渲染時間**：每個組件的渲染耗時
- **渲染次數**：組件在記錄期間渲染了多少次
- **為什麼渲染**：組件重新渲染的原因（props 改變、state 改變等）

### 實際案例：測量 useCallback 的效果

#### 場景：判斷是否需要使用 useCallback

**步驟一：記錄不使用 useCallback 的性能**

```jsx
// 測試組件：不使用 useCallback
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
4. **觀察結果**：查看 `TodoItem` 組件是否在 `filter` 改變時重新渲染

**預期結果（不使用 useCallback）：**
- `TodoItem` 組件會在 `filter` 改變時重新渲染（即使 `todo` 和 `onDelete` 沒有實際改變）
- 這是因為 `onDelete` 函數每次都是新的引用

**步驟二：記錄使用 useCallback 的性能**

```jsx
// 測試組件：使用 useCallback
function TodoList() {
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState('');
  
  // ✅ 使用 useCallback
  const handleDelete = useCallback((id) => {
    setTodos(todos => todos.filter(todo => todo.id !== id));
  }, []); // 使用函數式更新，不需要 todos 依賴
  
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
4. **觀察結果**：查看 `TodoItem` 組件是否在 `filter` 改變時重新渲染

**預期結果（使用 useCallback）：**
- `TodoItem` 組件**不會**在 `filter` 改變時重新渲染
- 因為 `handleDelete` 函數引用穩定，`React.memo` 可以正確比較 props

#### 步驟三：對比分析

**關鍵指標：**

1. **渲染次數**
   - 不使用 `useCallback`：`TodoItem` 渲染 10 次（每次 `filter` 改變）
   - 使用 `useCallback`：`TodoItem` 只渲染 1 次（初始渲染）

2. **總渲染時間**
   - 查看火焰圖中每個 `TodoItem` 的渲染時間
   - 如果每個組件渲染時間很短（< 1ms），可能不需要優化
   - 如果渲染時間較長（> 5ms）且渲染次數多，優化才有意義

3. **性能提升**
   - 計算總渲染時間的差異
   - 如果差異很小（< 5ms），`useCallback` 的開銷可能大於收益

### Profiler 視圖說明

#### 火焰圖（Flamegraph）

- **寬度**：表示組件渲染時間
- **顏色**：表示渲染時間相對長短（黃色/綠色 = 快，紅色 = 慢）
- **層級**：表示組件樹的層級關係

#### 排名圖（Ranked）

- 按渲染時間排序，最慢的組件在頂部
- 快速識別性能瓶頸

#### 組件詳情

點擊任何組件可以看到：
- **渲染時間**：本次渲染耗時
- **為什麼渲染**：渲染原因（props 改變、state 改變、父組件渲染等）
- **Props 和 State**：當前的 props 和 state 值

### 實際判斷標準

#### ✅ 需要使用 useCallback 的情況

1. **Profiler 顯示組件頻繁重新渲染**
   - 組件在不相關的 state 改變時也重新渲染
   - 渲染次數明顯多於預期

2. **渲染時間較長**
   - 單次渲染時間 > 5ms
   - 總渲染時間影響用戶體驗

3. **組件樹較深**
   - 重新渲染會導致大量子組件重新渲染
   - 使用 `useCallback` 可以阻止渲染傳播

#### ❌ 不需要使用 useCallback 的情況

1. **渲染時間很短**
   - 單次渲染時間 < 1ms
   - 即使重新渲染，用戶也感覺不到

2. **渲染次數正常**
   - 組件只在相關 state 改變時渲染
   - 沒有不必要的重新渲染

3. **性能影響可忽略**
   - Profiler 顯示總渲染時間差異 < 5ms
   - `useCallback` 的開銷可能大於收益

### 最佳實踐建議

1. **先測量，再優化**
   - 不要預先使用 `useCallback`
   - 使用 Profiler 找出實際的性能問題

2. **設定性能基準**
   - 記錄優化前的性能數據
   - 優化後再次測量，確認是否有改善

3. **關注用戶體驗**
   - 如果用戶感覺不到卡頓，可能不需要優化
   - 60 FPS（每幀 16.67ms）是流暢的標準

4. **考慮開發成本**
   - `useCallback` 增加程式碼複雜度
   - 如果性能提升很小，可能不值得

### 常見問題

**Q: Profiler 顯示組件重新渲染，但渲染時間很短，需要優化嗎？**
A: 通常不需要。如果渲染時間 < 1ms，重新渲染的開銷很小，`useCallback` 的開銷可能更大。

**Q: 如何知道是 props 改變還是函數引用改變導致的重新渲染？**
A: 點擊組件查看「為什麼渲染」部分，會顯示具體的渲染原因。

**Q: Profiler 在生產環境可以使用嗎？**
A: 不建議。Profiler 會增加性能開銷，只在開發環境使用。

### 參考資源

- [React Profiler 官方文檔](https://react.dev/learn/react-developer-tools#profiler)
- [React DevTools 使用指南](https://react.dev/learn/react-developer-tools)
- [性能優化最佳實踐](https://react.dev/learn/render-and-commit#optimizing-performance)