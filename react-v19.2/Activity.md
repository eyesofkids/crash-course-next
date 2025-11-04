# React v19.2 - Activity 元件

## 概述

`<Activity>` 是 React v19.2 中引入的新元件，用於更有效地管理應用中部分 UI 的可見性和狀態。它允許你控制元件的顯示/隱藏，同時保留其狀態，這對於提升使用者體驗和效能優化非常有用。

定義上應該稱它為"邊界"

## 主要功能

### 模式控制

`<Activity>` 元件透過 `mode` 屬性控制其子元件的可見性，支援兩種模式：

- **`visible`**：顯示子元件，掛載其 Effects，並允許正常處理更新。
- **`hidden`**：隱藏子元件，使用 CSS 的 `display: none` 視覺上隱藏，並銷毀其 Effects，清理任何活躍的訂閱。在隱藏狀態下，子元件仍會響應新的 props 進行重新渲染，但優先級低於其他可見內容。

### 暫停（Pause）狀態的概念

是的，`<Activity>` 邊界在 `hidden` 與 `visible` 之間切換時，可以理解為一種**暫停（pause）**狀態的機制。這個概念雖然在官方文件中沒有明確使用「pause」這個詞，但描述的行為特性（狀態保留、Effects 銷毀、渲染優先級降低）確實符合暫停的概念。

**重要概念**：從概念上，你應該將 `hidden` 的 Activity 視為 **unmounted（卸載）**。這意味著：

- Effects 會被銷毀（與真正的卸載行為一致）
- 元件不會執行正常的更新流程
- 但狀態會被保留（這是與真正卸載的關鍵差異）
- 元件仍存在於 DOM 中（使用 `display: none` 隱藏）

#### `hidden` 模式 = 暫停狀態

當 `mode` 設為 `hidden` 時，元件進入暫停狀態。**概念上，你應該將 `hidden` 的 Activity 視為 unmounted（卸載）**：

- **概念上卸載**：從 React 的角度來看，應該將 `hidden` 的 Activity 視為已卸載
- **狀態保留**：雖然概念上視為卸載，但元件的所有狀態（state、props、內部數據）都被完整保留
- **Effects 銷毀**：所有 Effects（`useEffect`、訂閱、定時器等）被銷毀和清理（與真正的卸載行為一致）
- **渲染優先級降低**：仍會響應新的 props 進行重新渲染，但優先級低於其他可見內容
- **DOM 層面**：使用 CSS 的 `display: none` 視覺上隱藏，元件仍存在於 DOM 中（這是與真正卸載的關鍵差異）

#### `visible` 模式 = 恢復運作

當 `mode` 切換回 `visible` 時，元件從暫停狀態恢復：

- **狀態恢復**：之前保留的狀態立即可用，無需重新初始化
- **Effects 重新創建**：Effects 重新創建和執行
- **正常渲染優先級**：恢復正常的渲染優先級
- **視覺顯示**：移除 `display: none`，元件重新顯示在畫面上

#### 暫停狀態的優勢

這種暫停機制提供了以下優勢：

1. **狀態連續性**：就像遊戲暫停一樣，所有進度都保留，恢復時可以立即繼續
2. **資源管理**：暫停時停止不必要的計算和 Effects，節省資源
3. **快速恢復**：不需要重新掛載元件，恢復速度更快
4. **使用者體驗**：使用者不會因為切換而遺失任何操作進度

```jsx
// 類比：就像遊戲的暫停功能
<Activity mode={isPaused ? "hidden" : "visible"}>
  <GameComponent />
</Activity>

// isPaused = true  → 遊戲暫停，狀態保留，但停止所有動畫和計算
// isPaused = false → 遊戲恢復，從暫停點繼續，狀態完全保留
```

### 狀態保留

當元件從 `hidden` 模式（暫停狀態）切換回 `visible` 模式時，React 會恢復其先前的狀態並重新創建其 Effects，確保使用者體驗的連續性。這意味著使用者不會遺失他們在元件中的操作進度。

## 基本用法

### 範例 1：控制側邊欄顯示

```jsx
import { Activity } from 'react';

function App() {
  const [isShowingSidebar, setIsShowingSidebar] = useState(false);

  return (
    <div>
      <button onClick={() => setIsShowingSidebar(!isShowingSidebar)}>
        {isShowingSidebar ? '隱藏' : '顯示'} 側邊欄
      </button>
      
      <Activity mode={isShowingSidebar ? "visible" : "hidden"}>
        <Sidebar />
      </Activity>
    </div>
  );
}
```

### 範例 2：預渲染頁面內容

```jsx
import { Activity } from 'react';

function Navigation() {
  const [currentPage, setCurrentPage] = useState('home');

  return (
    <>
      <nav>
        <button onClick={() => setCurrentPage('home')}>首頁</button>
        <button onClick={() => setCurrentPage('about')}>關於</button>
        <button onClick={() => setCurrentPage('contact')}>聯絡</button>
      </nav>
      
      {/* 當前頁面：可見 */}
      <Activity mode="visible">
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'about' && <AboutPage />}
        {currentPage === 'contact' && <ContactPage />}
      </Activity>
      
      {/* 預渲染其他頁面：隱藏但保留狀態 */}
      <Activity mode="hidden">
        {currentPage !== 'home' && <HomePage />}
        {currentPage !== 'about' && <AboutPage />}
        {currentPage !== 'contact' && <ContactPage />}
      </Activity>
    </>
  );
}
```

### 範例 3：表單狀態保留

```jsx
import { Activity } from 'react';

function MultiStepForm() {
  const [step, setStep] = useState(1);

  return (
    <div>
      <Activity mode={step === 1 ? "visible" : "hidden"}>
        <Step1Form onNext={() => setStep(2)} />
      </Activity>
      
      <Activity mode={step === 2 ? "visible" : "hidden"}>
        <Step2Form 
          onBack={() => setStep(1)} 
          onNext={() => setStep(3)} 
        />
      </Activity>
      
      <Activity mode={step === 3 ? "visible" : "hidden"}>
        <Step3Form onBack={() => setStep(2)} />
      </Activity>
    </div>
  );
}
```

## 應用場景

### 1. 預渲染可能需要的内容

對於使用者可能接下來會造訪的頁面或元件，可以使用 `<Activity>` 進行預渲染，以提高導航速度。當使用者切換到該頁面時，由於已經預渲染，切換會非常流暢。

### 2. 保持隱藏元件的狀態

當使用者離開某個頁面或元件時，使用 `<Activity>` 可以保留其狀態，確保使用者返回時能夠繼續之前的操作。這對於表單、遊戲狀態、或任何需要保持使用者進度的場景特別有用。

### 3. 效能優化

透過將不常用的元件設定為 `hidden` 模式，可以銷毀其 Effects，減少不必要的計算和資源消耗，同時保留狀態以便快速恢復。

## Pre-rendering Content（預渲染內容）

預渲染（Pre-rendering）是 `<Activity>` 的一個核心應用場景。透過在 `hidden` 模式下預先渲染可能需要顯示的內容，當使用者切換到該內容時，可以實現即時的顯示效果，大幅提升使用者體驗。

### 預渲染的工作原理

預渲染的核心概念是：

1. **提前準備**：在內容還未顯示時，先將其渲染到 DOM 中（但設定為 `hidden`）
2. **狀態保留**：預渲染的內容保持其狀態，即使處於隱藏狀態
3. **即時切換**：當需要顯示時，只需切換 `mode` 為 `visible`，內容立即可見
4. **Effects 控制**：在 `hidden` 模式下，Effects 被銷毀，節省資源；切換到 `visible` 時重新創建

### 基本預渲染模式

#### 範例 1：標籤頁預渲染

```jsx
import { Activity } from 'react';

function Tabs() {
  const [activeTab, setActiveTab] = useState('tab1');

  return (
    <div>
      <nav>
        <button onClick={() => setActiveTab('tab1')}>標籤 1</button>
        <button onClick={() => setActiveTab('tab2')}>標籤 2</button>
        <button onClick={() => setActiveTab('tab3')}>標籤 3</button>
      </nav>

      {/* 當前標籤：可見 */}
      <Activity mode="visible">
        {activeTab === 'tab1' && <Tab1Content />}
        {activeTab === 'tab2' && <Tab2Content />}
        {activeTab === 'tab3' && <Tab3Content />}
      </Activity>

      {/* 其他標籤：預渲染但隱藏 */}
      <Activity mode="hidden">
        {activeTab !== 'tab1' && <Tab1Content />}
        {activeTab !== 'tab2' && <Tab2Content />}
        {activeTab !== 'tab3' && <Tab3Content />}
      </Activity>
    </div>
  );
}
```

**優勢**：

- 切換標籤時內容立即顯示，無需載入等待
- 每個標籤的狀態都被保留（例如：表單輸入、滾動位置）
- 切換體驗流暢，無閃爍

#### 範例 2：側邊欄預渲染

```jsx
import { Activity } from 'react';

function App() {
  const [showSidebar, setShowSidebar] = useState(false);

  return (
    <div>
      <button onClick={() => setShowSidebar(!showSidebar)}>
        {showSidebar ? '隱藏' : '顯示'} 側邊欄
      </button>

      {/* 主內容：根據側邊欄狀態調整 */}
      <main style={{ marginLeft: showSidebar ? '250px' : '0' }}>
        <MainContent />
      </main>

      {/* 側邊欄：預渲染以便快速顯示 */}
      <Activity mode={showSidebar ? "visible" : "hidden"}>
        <Sidebar />
      </Activity>
    </div>
  );
}
```

### 與 Suspense 結合的預渲染

當需要預渲染包含異步數據的內容時，可以結合 `<Suspense>` 使用：

```jsx
import { Activity, Suspense } from 'react';

function App() {
  const [activeView, setActiveView] = useState('dashboard');

  return (
    <div>
      <nav>
        <button onClick={() => setActiveView('dashboard')}>儀表板</button>
        <button onClick={() => setActiveView('analytics')}>分析</button>
        <button onClick={() => setActiveView('settings')}>設定</button>
      </nav>

      {/* 當前視圖：可見 */}
      <Activity mode="visible">
        <Suspense fallback={<ViewSkeleton />}>
          {activeView === 'dashboard' && <Dashboard />}
          {activeView === 'analytics' && <Analytics />}
          {activeView === 'settings' && <Settings />}
        </Suspense>
      </Activity>

      {/* 其他視圖：預渲染（異步數據會在 hidden 時暫停） */}
      <Activity mode="hidden">
        <Suspense fallback={null}>
          {activeView !== 'dashboard' && <Dashboard />}
          {activeView !== 'analytics' && <Analytics />}
          {activeView !== 'settings' && <Settings />}
        </Suspense>
      </Activity>
    </div>
  );
}
```

**關鍵點**：

- 在 `hidden` 模式下，`<Suspense>` 邊界會暫停異步操作
- 當切換到 `visible` 時，異步操作會繼續進行
- 已完成的異步數據會被保留，實現快速切換

### SSR 中的預渲染

在伺服器端渲染（SSR）環境中，預渲染特別有用：

```jsx
import { Activity } from 'react';

function SSRApp() {
  // 伺服器端和客戶端都使用相同的初始狀態
  const [currentPage, setCurrentPage] = useState('home');

  return (
    <>
      {/* 當前頁面：可見 */}
      <Activity mode="visible">
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'about' && <AboutPage />}
        {currentPage === 'contact' && <ContactPage />}
      </Activity>

      {/* 其他頁面：預渲染（在 SSR 中會被包含在初始 HTML） */}
      <Activity mode="hidden">
        {currentPage !== 'home' && <HomePage />}
        {currentPage !== 'about' && <AboutPage />}
        {currentPage !== 'contact' && <ContactPage />}
      </Activity>
    </>
  );
}
```

**SSR 優勢**：

- 所有頁面內容都在初始 HTML 中，有利於 SEO
- 用戶可以快速在不同頁面間切換，無需額外的網路請求
- 水合（Hydration）過程更順暢

### 預渲染最佳實踐

#### 1. 選擇性預渲染

不是所有內容都需要預渲染，只預渲染使用者可能訪問的內容：

```jsx
function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [prefetchPages, setPrefetchPages] = useState(new Set(['about']));

  return (
    <>
      <Activity mode="visible">
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'about' && <AboutPage />}
      </Activity>

      {/* 只預渲染可能訪問的頁面 */}
      <Activity mode="hidden">
        {prefetchPages.has('about') && currentPage !== 'about' && (
          <AboutPage />
        )}
      </Activity>
    </>
  );
}
```

#### 2. 預渲染時機

可以在使用者互動時開始預渲染：

```jsx
function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [hoveredPage, setHoveredPage] = useState(null);

  return (
    <>
      <nav>
        <button 
          onClick={() => setCurrentPage('about')}
          onMouseEnter={() => setHoveredPage('about')}
        >
          關於
        </button>
        <button 
          onClick={() => setCurrentPage('contact')}
          onMouseEnter={() => setHoveredPage('contact')}
        >
          聯絡
        </button>
      </nav>

      <Activity mode="visible">
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'about' && <AboutPage />}
        {currentPage === 'contact' && <ContactPage />}
      </Activity>

      {/* 滑鼠懸停時開始預渲染 */}
      <Activity mode="hidden">
        {hoveredPage === 'about' && currentPage !== 'about' && (
          <AboutPage />
        )}
        {hoveredPage === 'contact' && currentPage !== 'contact' && (
          <ContactPage />
        )}
      </Activity>
    </>
  );
}
```

#### 3. 效能考量

預渲染會增加初始 DOM 大小和記憶體使用，需要權衡：

```jsx
// ✅ 好的做法：只預渲染重要且常用的內容
<Activity mode="hidden">
  {/* 只預渲染用戶最常訪問的頁面 */}
  {shouldPreload && <FrequentlyUsedPage />}
</Activity>

// ⚠️ 避免：預渲染所有可能的內容
<Activity mode="hidden">
  {/* 這會造成記憶體和效能問題 */}
  <Page1 />
  <Page2 />
  <Page3 />
  {/* ... 太多頁面 */}
</Activity>
```

#### 4. 預渲染與條件渲染的選擇

```jsx
// ❌ 不需要預渲染：簡單的載入指示器
{isLoading && <Spinner />}

// ✅ 需要預渲染：複雜的頁面內容
<Activity mode={isVisible ? "visible" : "hidden"}>
  <ComplexPage />
</Activity>
```

### 預渲染的優勢與限制

#### 優勢

1. **即時切換**：內容已準備好，切換時無需等待
2. **狀態保留**：預渲染的內容保持其完整狀態
3. **SEO 友好**：在 SSR 中，所有預渲染內容都在 HTML 中
4. **流暢體驗**：減少頁面切換時的閃爍和載入時間

#### 限制與注意事項

1. **記憶體使用**：預渲染的內容會佔用記憶體
2. **初始載入時間**：預渲染會增加初始 HTML 大小和渲染時間
3. **Effects 管理**：確保元件能正確處理 Effects 的銷毀和重新創建
4. **選擇性使用**：只預渲染真正需要的內容，避免過度預渲染

### 預渲染 vs. 其他方案

| 特性 | 條件渲染 | CSS `display: none` | `<Activity>` 預渲染 |
|------|---------|---------------------|-------------------|
| **切換速度** | ⚠️ 需要重新掛載 | ✅ 即時 | ✅ 即時 |
| **狀態保留** | ❌ 不保留 | ✅ 保留 | ✅ 保留 |
| **Effects 控制** | ✅ 完全控制 | ❌ 持續執行 | ✅ 可控制 |
| **初始載入** | ✅ 快速 | ✅ 快速 | ⚠️ 可能較慢 |
| **記憶體使用** | ✅ 低 | ⚠️ 中等 | ⚠️ 中等 |
| **SEO** | ❌ 內容不在 HTML | ✅ 內容在 HTML | ✅ 內容在 HTML |

## 與 ViewTransition 的關係

**重要說明**：`<ViewTransition>` 目前**尚未正式加入 React v19.2 版本**，而是在 **Canary 和 Experimental channels** 中提供。`<Activity>` 則是 React v19.2 的正式功能。

`<Activity>` 和 `<ViewTransition>` 是兩個獨立但互補的元件，它們在 React Labs 中一起被介紹，可以結合使用以提供更好的使用者體驗。

### 兩者的功能定位

#### `<Activity>` 元件

**主要功能**：

- 控制 UI 部分的顯示/隱藏
- 保留元件狀態（即使隱藏）
- 管理 Effects 的生命週期
- 用於預渲染和狀態管理

**應用場景**：

- 標籤頁切換（保留各標籤的狀態）
- 側邊欄顯示/隱藏
- 多步驟表單（保留每步的狀態）
- 預渲染可能訪問的內容

#### `<ViewTransition>` 元件

**狀態**：⚠️ 目前處於 **Canary 和 Experimental channels**，尚未正式發布

**主要功能**：

- 為視圖變化添加平滑的過渡動畫
- 利用瀏覽器的 View Transitions API
- 提供視覺上的連貫性

**應用場景**：

- 頁面導航動畫
- 內容切換動畫
- 列表項目的添加/移除動畫
- 圖片切換動畫

**注意**：由於 `<ViewTransition>` 仍在實驗階段，API 可能會變更，建議在生產環境中謹慎使用。

### 兩者的關係

`<Activity>` 和 `<ViewTransition>` 是**互補關係**：

1. **功能互補**：`<Activity>` 負責狀態管理和顯示控制，`<ViewTransition>` 負責視覺過渡效果
2. **可以獨立使用**：每個元件都可以單獨使用，不需要依賴另一個
3. **可以結合使用**：結合使用時可以提供既保留狀態又有平滑動畫的體驗

### 結合使用的範例

#### 範例 1：標籤頁切換（帶過渡動畫）

> **注意**：此範例使用 `<ViewTransition>`，需要安裝 React Canary 版本。

```jsx
import { Activity, ViewTransition } from 'react';

function TabsWithTransition() {
  const [activeTab, setActiveTab] = useState('tab1');

  return (
    <div>
      <nav>
        <button onClick={() => setActiveTab('tab1')}>標籤 1</button>
        <button onClick={() => setActiveTab('tab2')}>標籤 2</button>
        <button onClick={() => setActiveTab('tab3')}>標籤 3</button>
      </nav>

      {/* Activity 負責狀態保留 */}
      <Activity mode="visible">
        <ViewTransition>
          {/* ViewTransition 負責過渡動畫 */}
          {activeTab === 'tab1' && <Tab1Content />}
          {activeTab === 'tab2' && <Tab2Content />}
          {activeTab === 'tab3' && <Tab3Content />}
        </ViewTransition>
      </Activity>

      {/* 預渲染其他標籤（保留狀態） */}
      <Activity mode="hidden">
        {activeTab !== 'tab1' && <Tab1Content />}
        {activeTab !== 'tab2' && <Tab2Content />}
        {activeTab !== 'tab3' && <Tab3Content />}
      </Activity>
    </div>
  );
}
```

**效果**：

- 切換標籤時有平滑的過渡動畫（`<ViewTransition>`）
- 每個標籤的狀態都被保留（`<Activity>`）
- 切換體驗流暢且狀態不遺失

#### 範例 2：頁面導航（帶過渡動畫）

> **注意**：此範例使用 `<ViewTransition>`，需要安裝 React Canary 版本。

```jsx
import { Activity, ViewTransition } from 'react';

function AppWithNavigation() {
  const [currentPage, setCurrentPage] = useState('home');

  return (
    <ViewTransition>
      {/* Activity 控制頁面顯示，保留狀態 */}
      <Activity mode="visible">
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'about' && <AboutPage />}
        {currentPage === 'contact' && <ContactPage />}
      </Activity>

      {/* 預渲染其他頁面 */}
      <Activity mode="hidden">
        {currentPage !== 'home' && <HomePage />}
        {currentPage !== 'about' && <AboutPage />}
        {currentPage !== 'contact' && <ContactPage />}
      </Activity>
    </ViewTransition>
  );
}
```

**效果**：

- 頁面切換時有平滑的過渡動畫
- 每個頁面的狀態都被保留
- 導航體驗流暢

#### 範例 3：側邊欄（帶過渡動畫）

> **注意**：此範例使用 `<ViewTransition>`，需要安裝 React Canary 版本。

```jsx
import { Activity, ViewTransition } from 'react';

function AppWithSidebar() {
  const [showSidebar, setShowSidebar] = useState(false);

  return (
    <div>
      <button onClick={() => setShowSidebar(!showSidebar)}>
        {showSidebar ? '隱藏' : '顯示'} 側邊欄
      </button>

      <main>
        <MainContent />
      </main>

      {/* Activity 保留側邊欄狀態，ViewTransition 添加動畫 */}
      <ViewTransition>
        <Activity mode={showSidebar ? "visible" : "hidden"}>
          <Sidebar />
        </Activity>
      </ViewTransition>
    </div>
  );
}
```

### 使用建議

#### 何時結合使用？

**結合使用 `<Activity>` 和 `<ViewTransition>` 當：**

- 需要在視圖切換時保留狀態
- 同時需要平滑的過渡動畫
- 需要提升使用者體驗（狀態保留 + 視覺過渡）

#### 何時只使用 `<Activity>`？

**只使用 `<Activity>` 當：**

- 只需要保留狀態，不需要動畫
- 簡單的顯示/隱藏控制
- 效能優先，不需要過渡效果

#### 何時只使用 `<ViewTransition>`？

**只使用 `<ViewTransition>` 當：**

- 只需要視覺過渡效果
- 不需要保留狀態
- 內容變化時需要動畫，但狀態可以重新初始化

### 技術細節

#### Activity 與 ViewTransition 的互動

1. **Activity 負責狀態管理**：
   - `hidden` 時保留狀態，銷毀 Effects
   - `visible` 時恢復狀態，創建 Effects

2. **ViewTransition 負責動畫**：
   - 監控 DOM 變化
   - 使用瀏覽器的 View Transitions API
   - 為變化添加平滑過渡

3. **結合使用的流程**：

```text
User 互動
↓
Activity mode 改變（hidden ↔ visible）
↓
DOM 變化（display: none ↔ visible）
↓
ViewTransition 檢測到變化
↓
執行過渡動畫
↓
完成過渡
```

### 與其他方案的比較

| 方案 | 狀態保留 | 過渡動畫 | 使用場景 |
|------|---------|---------|---------|
| 條件渲染 | ❌ | ❌ | 簡單的顯示/隱藏 |
| 條件渲染 + ViewTransition | ❌ | ✅ | 需要動畫但不需要保留狀態 |
| Activity | ✅ | ❌ | 需要保留狀態但不需要動畫 |
| Activity + ViewTransition | ✅ | ✅ | **需要保留狀態且有過渡動畫** |

### 注意事項

1. **版本狀態**：`<ViewTransition>` 目前僅在 **Canary 和 Experimental channels** 中提供，尚未正式加入 React v19.2。如需使用，請安裝 React 的 Canary 版本：

   ```bash
   npm install react@canary react-dom@canary
   ```

2. **API 穩定性**：由於仍在實驗階段，`<ViewTransition>` 的 API 可能會在未來版本中變更

3. **瀏覽器支援**：`<ViewTransition>` 依賴瀏覽器的 View Transitions API，需要確認瀏覽器支援

4. **效能考量**：結合使用時，確保過渡動畫不會影響效能

5. **狀態管理**：`<Activity>` 的狀態保留機制與 `<ViewTransition>` 的動畫機制是獨立的，不會互相干擾

6. **生產環境使用**：建議在生產環境中謹慎使用 `<ViewTransition>`，等待其正式發布

## 與 Suspense 和 SSR 搭配使用

### Activity 與 Suspense 的結合使用

`<Activity>` 可以與 `<Suspense>` 完美搭配使用，特別是在需要異步載入內容的場景中。當 `<Activity>` 處於 `hidden` 模式（暫停狀態）時，內部的 `<Suspense>` 邊界也會暫停，當切換回 `visible` 模式時，會繼續處理未完成的異步操作。

#### 範例：在 Activity 中使用 Suspense

```jsx
import { Activity, Suspense } from 'react';

function App() {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <div>
      <button onClick={() => setShowDashboard(!showDashboard)}>
        切換儀表板
      </button>
      
      <Activity mode={showDashboard ? "visible" : "hidden"}>
        <Suspense fallback={<DashboardSkeleton />}>
          <Dashboard />
        </Suspense>
      </Activity>
    </div>
  );
}

// Dashboard 元件可能包含異步數據載入
async function Dashboard() {
  const data = await fetchDashboardData();
  return <div>{/* 儀表板內容 */}</div>;
}
```

在這個範例中，當 `Dashboard` 處於 `hidden` 模式時，如果它正在載入異步數據，載入過程會被暫停。當切換回 `visible` 模式時，載入會繼續進行。

### SSR 中的行為

在伺服器端渲染（SSR）環境中，`<Activity>` 的行為需要特別注意：

#### 1. 伺服器端渲染

在伺服器端，`<Activity>` 會根據 `mode` 屬性渲染其子元件，但無論是 `visible` 還是 `hidden` 模式，內容都會被包含在 HTML 中。這確保了：

- 所有內容都能在初始 HTML 中可用，有利於 SEO
- 水合（Hydration）過程能夠正確匹配伺服器端和客戶端的渲染結果

```jsx
// 伺服器端渲染
function ServerApp() {
  return (
    <Activity mode="visible">
      <Suspense fallback={<Loading />}>
        <AsyncContent />
      </Suspense>
    </Activity>
  );
}
```

#### 2. 水合（Hydration）一致性

在 React v19.2 中，SSR 與 Suspense 的整合得到了改進：

- **批次揭露 Suspense 邊界**：來自伺服器的 Suspense 邊界會被短暫批次處理，使更多內容同時出現，與客戶端渲染的行為保持一致
- 這減少了畫面閃爍，提升了使用者體驗

```jsx
import { Activity, Suspense } from 'react';

function SSRPage() {
  const [activeTab, setActiveTab] = useState('tab1');

  return (
    <>
      {/* 當前標籤：可見 */}
      <Activity mode="visible">
        <Suspense fallback={<TabSkeleton />}>
          {activeTab === 'tab1' && <Tab1Content />}
          {activeTab === 'tab2' && <Tab2Content />}
          {activeTab === 'tab3' && <Tab3Content />}
        </Suspense>
      </Activity>
      
      {/* 其他標籤：預渲染但隱藏 */}
      <Activity mode="hidden">
        <Suspense fallback={null}>
          {activeTab !== 'tab1' && <Tab1Content />}
          {activeTab !== 'tab2' && <Tab2Content />}
          {activeTab !== 'tab3' && <Tab3Content />}
        </Suspense>
      </Activity>
    </>
  );
}
```

#### 3. 流式 SSR 支援

在 React v19.2 中，Node.js 環境新增了對 Web Streams 的支援，提供了以下 API：

- `renderToReadableStream`：使用 Web Streams 進行流式渲染
- `prerender`：預渲染內容
- `resume`：恢復流式渲染
- `resumeAndPrerender`：恢復並預渲染

這些 API 使得在流式 SSR 中使用 `<Activity>` 和 `<Suspense>` 更加便捷：

```jsx
// Node.js 環境下的流式 SSR 範例
import { renderToReadableStream } from 'react-dom/server';

async function handleRequest(req, res) {
  const stream = await renderToReadableStream(
    <App />,
    {
      bootstrapScripts: ['/main.js'],
    }
  );
  
  // 將流式內容傳送到客戶端
  stream.pipeTo(new WritableStream({
    write(chunk) {
      res.write(chunk);
    },
    close() {
      res.end();
    }
  }));
}
```

### SSR 使用注意事項

1. **伺服器端與客戶端一致性**：確保伺服器端和客戶端對 `<Activity>` 的 `mode` 屬性有相同的初始值，以避免水合錯誤。

2. **Suspense 邊界的處理**：在 `hidden` 模式下的 `<Suspense>` 邊界會暫停，當切換到 `visible` 時會繼續處理。這意味著異步載入的內容不會在隱藏期間被拋棄。

3. **效能考量**：在 SSR 環境中預渲染多個 `hidden` 的 `<Activity>` 可能會增加初始 HTML 大小，需要權衡 SEO 需求和效能。

4. **流式 SSR**：使用流式 SSR 時，多個 Suspense 邊界的內容會被批次處理，確保視覺一致性。

## 重要注意事項

### Effects 處理

當 `<Activity>` 處於 `hidden` 模式時，其子元件的 Effects（如 `useEffect`）將被銷毀。**概念上，`hidden` 的 Activity 應該被視為 unmounted（卸載）**，因此：

- `useEffect` 的清理函數會被呼叫（與真正的卸載行為一致）
- 訂閱會被取消
- 定時器會被清除

當元件切換回 `visible` 模式時，Effects 會重新創建並執行（類似於重新掛載）。

### `hidden` Activity vs. 真正的 Unmount 比較

雖然概念上應該將 `hidden` 的 Activity 視為 unmounted，但實際上與真正的卸載存在重要差異：

| 特性 | 真正的 Unmount | `<Activity mode="hidden">` |
|------|---------------|---------------------------|
| **概念上** | 元件已卸載 | ✅ 視為已卸載 |
| **Effects** | ❌ 被銷毀 | ✅ 被銷毀（與 unmount 一致） |
| **清理函數** | ✅ 執行 | ✅ 執行（與 unmount 一致） |
| **訂閱/定時器** | ✅ 被清理 | ✅ 被清理（與 unmount 一致） |
| **狀態（State）** | ❌ **完全遺失** | ✅ **完整保留** |
| **DOM 存在性** | ❌ **從 DOM 中移除** | ✅ **仍在 DOM 中**（使用 `display: none`） |
| **元件實例** | ❌ 被銷毀 | ✅ 保持相同實例 |
| **Props 更新** | ❌ 不會接收 | ✅ 仍會響應（但優先級較低） |
| **重新渲染** | ❌ 不會發生 | ✅ 仍會發生（優先級較低） |
| **恢復方式** | ❌ 需要重新掛載整個元件 | ✅ 只需切換 `mode` 為 `visible` |
| **恢復時間** | ⚠️ 較慢（需要重新初始化） | ✅ 即時（狀態已保留） |
| **記憶體使用** | ✅ 完全釋放 | ⚠️ 仍佔用（保留狀態和 DOM） |
| **SEO 影響** | ❌ 內容不在 HTML | ✅ 內容在 HTML（SSR 友好） |

#### 關鍵差異說明

##### 1. 狀態保留

```jsx
// 真正的 unmount：狀態遺失
function App() {
  const [show, setShow] = useState(false);
  
  return (
    <>
      {show && <Counter />}  {/* 切換時狀態完全遺失 */}
      <button onClick={() => setShow(!show)}>切換</button>
    </>
  );
}

// hidden Activity：狀態保留
function App() {
  const [show, setShow] = useState(false);
  
  return (
    <>
      <Activity mode={show ? "visible" : "hidden"}>
        <Counter />  {/* 切換時狀態完全保留 */}
      </Activity>
      <button onClick={() => setShow(!show)}>切換</button>
    </>
  );
}
```

##### 2. DOM 存在性

```jsx
// 真正的 unmount：DOM 中不存在
{isVisible && <Component />}
// isVisible = false 時，Component 完全從 DOM 中移除

// hidden Activity：DOM 中仍存在
<Activity mode={isVisible ? "visible" : "hidden"}>
  <Component />
</Activity>
// mode = "hidden" 時，Component 仍在 DOM 中，使用 display: none
```

##### 3. 恢復行為

```jsx
// 真正的 unmount：需要重新初始化
{show && <ExpensiveComponent />}
// 每次 show 變為 true 時，都需要：
// 1. 創建新的元件實例
// 2. 初始化所有狀態
// 3. 執行所有初始化邏輯
// 4. 重新渲染整個元件樹

// hidden Activity：即時恢復
<Activity mode={show ? "visible" : "hidden"}>
  <ExpensiveComponent />
</Activity>
// 切換到 visible 時：
// 1. 使用已存在的元件實例
// 2. 狀態立即可用
// 3. 只需重新創建 Effects
// 4. 移除 display: none
```

#### 何時使用哪種方式？

**使用真正的 Unmount（條件渲染）當：**

- 不需要保留狀態
- 需要完全釋放記憶體
- 每次顯示都應該是全新的狀態
- 元件初始化成本低

**使用 `<Activity mode="hidden">` 當：**

- 需要保留狀態（表單輸入、遊戲進度等）
- 需要快速恢復（切換時無需重新初始化）
- 需要在 SSR 中預渲染內容
- 元件初始化成本高
- 需要頻繁切換顯示/隱藏

### 開發建議

建議在開發過程中使用 `<StrictMode>` 進行測試，以捕獲可能的 Effects 問題。這有助於確保你的元件能夠正確處理 Effects 的創建和銷毀。

```jsx
import { StrictMode } from 'react';

function App() {
  return (
    <StrictMode>
      <YourApp />
    </StrictMode>
  );
}
```

## API 參考

### `<Activity>` 屬性

| 屬性 | 類型 | 必需 | 說明 |
|------|------|------|------|
| `mode` | `"visible" \| "hidden"` | 是 | 控制子元件的可見性和狀態 |
| `children` | `ReactNode` | 是 | 要控制顯示/隱藏的子元件 |

### 模式對比

| 特性 | `visible` | `hidden`（暫停狀態） |
|------|-----------|---------------------|
| 元件渲染 | ✅ 渲染 | ✅ 渲染（優先級較低） |
| DOM 可見性 | ✅ 可見 | ❌ 使用 `display: none` 隱藏 |
| Effects | ✅ 掛載 | ❌ 銷毀 |
| Props 更新 | ✅ 正常響應 | ✅ 仍會響應，但優先級較低 |
| 狀態保留 | ✅ | ✅ 完整保留 |
| 狀態恢復 | ✅ 正常運作 | ✅ 從暫停點恢復 |

## 與其他方案對比

### vs. 條件渲染 (`&&` 或三元運算符)

條件渲染是 React 中最常用的顯示/隱藏元件的方式，但與 `<Activity>` 在行為上有顯著差異。

#### 詳細比較表

| 特性 | 條件渲染 (`&&` 或 `?:`) | `<Activity>` |
|------|------------------------|--------------|
| **狀態保留** | ❌ 元件卸載時狀態完全遺失 | ✅ 隱藏時狀態完全保留 |
| **DOM 存在性** | ❌ 隱藏時元件不會存在於 DOM | ✅ 隱藏時元件仍存在於 DOM |
| **元件實例** | ❌ 每次顯示都會重新建立實例 | ✅ 保持相同的元件實例 |
| **Effects 處理** | ❌ 隱藏時會執行清理函數，顯示時會重新執行 | ✅ `hidden` 時銷毀 Effects，`visible` 時重新創建 |
| **重新渲染成本** | ❌ 每次顯示都需要完整重新掛載 | ✅ 從 `hidden` 切換只需恢復狀態 |
| **效能** | ⚠️ 頻繁切換時需要重複掛載/卸載 | ✅ 保留狀態，切換更快速 |
| **記憶體使用** | ✅ 隱藏時不佔用記憶體 | ⚠️ 隱藏時仍佔用記憶體（保留狀態） |
| **適合場景** | 不需要保留狀態的簡單顯示/隱藏 | 需要保留狀態的複雜元件（表單、遊戲等） |
| **SEO 影響** | ⚠️ 隱藏內容不會出現在初始 HTML | ✅ 隱藏內容會出現在初始 HTML（SSR 友好） |
| **水合（Hydration）** | ⚠️ 需要確保初始狀態一致 | ✅ 更易於維持伺服器端和客戶端一致性 |

#### 程式碼範例

```jsx
// 條件渲染方式：狀態會遺失
function App() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <button onClick={() => setShowForm(!showForm)}>
        {showForm ? '隱藏' : '顯示'} 表單
      </button>
      
      {/* 每次顯示時都會重新建立元件，狀態會遺失 */}
      {showForm && <ContactForm />}
    </div>
  );
}

// Activity 方式：狀態會保留
function App() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <button onClick={() => setShowForm(!showForm)}>
        {showForm ? '隱藏' : '顯示'} 表單
      </button>
      
      {/* 隱藏時狀態保留，再次顯示時不需要重新輸入 */}
      <Activity mode={showForm ? "visible" : "hidden"}>
        <ContactForm />
      </Activity>
    </div>
  );
}
```

#### 實際應用場景比較

##### 場景 1：簡單的載入指示器

```jsx
// ✅ 條件渲染更適合（不需要保留狀態）
{isLoading && <Spinner />}

// ⚠️ 使用 Activity 沒有明顯優勢
<Activity mode={isLoading ? "visible" : "hidden"}>
  <Spinner />
</Activity>
```

##### 場景 2：表單輸入

```jsx
// ❌ 條件渲染：使用者輸入會遺失
{showForm && (
  <form>
    <input name="email" />
    <input name="message" />
  </form>
)}

// ✅ Activity：保留使用者輸入
<Activity mode={showForm ? "visible" : "hidden"}>
  <form>
    <input name="email" />
    <input name="message" />
  </form>
</Activity>
```

##### 場景 3：多步驟表單

```jsx
// ❌ 條件渲染：切換步驟時會遺失所有輸入
{step === 1 && <Step1Form />}
{step === 2 && <Step2Form />}
{step === 3 && <Step3Form />}

// ✅ Activity：每個步驟的狀態都保留
<Activity mode={step === 1 ? "visible" : "hidden"}>
  <Step1Form />
</Activity>
<Activity mode={step === 2 ? "visible" : "hidden"}>
  <Step2Form />
</Activity>
<Activity mode={step === 3 ? "visible" : "hidden"}>
  <Step3Form />
</Activity>
```

##### 場景 4：標籤頁（Tabs）

```jsx
// ⚠️ 條件渲染：切換標籤時內容會重新載入
{activeTab === 'tab1' && <Tab1Content />}
{activeTab === 'tab2' && <Tab2Content />}
{activeTab === 'tab3' && <Tab3Content />}

// ✅ Activity：切換標籤時內容立即顯示（已預載入）
<Activity mode={activeTab === 'tab1' ? "visible" : "hidden"}>
  <Tab1Content />
</Activity>
<Activity mode={activeTab === 'tab2' ? "visible" : "hidden"}>
  <Tab2Content />
</Activity>
<Activity mode={activeTab === 'tab3' ? "visible" : "hidden"}>
  <Tab3Content />
</Activity>
```

#### 何時選擇哪種方式？

**使用條件渲染當：**

- 簡單的顯示/隱藏，不需要保留狀態
- 元件內容簡單，重新掛載成本低
- 需要節省記憶體（隱藏時完全釋放）
- 元件每次顯示都應該是全新的狀態

**使用 `<Activity>` 當：**

- 需要保留使用者輸入或操作狀態
- 元件包含複雜的狀態或計算結果
- 頻繁切換顯示/隱藏，需要快速恢復
- 需要在 SSR 中預渲染內容
- 切換時需要流暢的使用者體驗

### vs. CSS `display: none`

使用 CSS `display: none` 是另一種常見的隱藏元件方式，與 `<Activity>` 在行為上有重要差異。

#### CSS `display: none` vs. Activity 比較表

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
| **網路請求** | ⚠️ 隱藏時仍可能發送請求 | ✅ 可以透過銷毀 Effects 來控制 |
| **動畫/過渡** | ⚠️ 無法使用 CSS 過渡（因為 `display: none` 無法過渡） | ✅ 可以配合 CSS 過渡和動畫 |
| **可訪問性** | ⚠️ 需要額外的 ARIA 屬性 | ⚠️ 需要額外的 ARIA 屬性 |
| **SEO 影響** | ✅ 內容出現在 HTML 中 | ✅ 內容出現在 HTML 中 |
| **瀏覽器相容性** | ✅ 完全相容 | ✅ React 19.2+ 支援 |

#### CSS 與 Activity 程式碼範例

```jsx
// CSS 方式：副作用仍會執行
function App() {
  const [showWidget, setShowWidget] = useState(false);

  return (
    <div>
      <button onClick={() => setShowWidget(!showWidget)}>
        {showWidget ? '隱藏' : '顯示'} 小工具
      </button>
      
      {/* 隱藏時 Effects 仍會執行，可能造成資源浪費 */}
      <div style={{ display: showWidget ? 'block' : 'none' }}>
        <DataWidget />
      </div>
    </div>
  );
}

// DataWidget 中的 Effects
function DataWidget() {
  useEffect(() => {
    // ⚠️ 即使隱藏，這個定時器仍會執行
    const interval = setInterval(() => {
      console.log('更新數據...');
      fetchData();
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return <div>數據小工具</div>;
}

// Activity 方式：副作用會被卸載，節省資源
function App() {
  const [showWidget, setShowWidget] = useState(false);

  return (
    <div>
      <button onClick={() => setShowWidget(!showWidget)}>
        {showWidget ? '隱藏' : '顯示'} 小工具
      </button>
      
      {/* 隱藏時 Effects 會被銷毀，節省資源 */}
      <Activity mode={showWidget ? "visible" : "hidden"}>
        <DataWidget />
      </Activity>
    </div>
  );
}

// DataWidget 中的 Effects
function DataWidget() {
  useEffect(() => {
    // ✅ 隱藏時定時器會被清除，顯示時重新啟動
    const interval = setInterval(() => {
      console.log('更新數據...');
      fetchData();
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return <div>數據小工具</div>;
}
```

#### CSS 與 Activity 應用場景比較

##### 場景 1：即時數據更新元件

```jsx
// ❌ CSS 方式：隱藏時仍會持續更新，浪費資源
<div style={{ display: isVisible ? 'block' : 'none' }}>
  <LiveDataWidget /> {/* 每秒更新一次 */}
</div>

// ✅ Activity：隱藏時停止更新，節省資源
<Activity mode={isVisible ? "visible" : "hidden"}>
  <LiveDataWidget /> {/* 只在可見時更新 */}
</Activity>
```

##### 場景 2：視頻播放器

```jsx
// ❌ CSS 方式：隱藏時視頻仍在播放（可能造成音訊問題）
<div style={{ display: isVisible ? 'block' : 'none' }}>
  <VideoPlayer src="video.mp4" />
</div>

// ✅ Activity：隱藏時銷毀播放器，停止播放
<Activity mode={isVisible ? "visible" : "hidden"}>
  <VideoPlayer src="video.mp4" />
</Activity>
```

##### 場景 3：WebSocket 連接

```jsx
// ❌ CSS 方式：隱藏時仍保持 WebSocket 連接
<div style={{ display: isVisible ? 'block' : 'none' }}>
  <ChatWidget /> {/* 保持 WebSocket 連接 */}
</div>

// ✅ Activity：隱藏時斷開連接，顯示時重新連接
<Activity mode={isVisible ? "visible" : "hidden"}>
  <ChatWidget /> {/* 只在可見時連接 */}
</Activity>
```

##### 場景 4：動畫和過渡效果

```jsx
// ❌ CSS 方式：無法實現平滑的淡入淡出（display: none 無法過渡）
<div 
  style={{ 
    display: isVisible ? 'block' : 'none',
    opacity: isVisible ? 1 : 0,
    transition: 'opacity 0.3s'
  }}
>
  <Component />
</div>
{/* 問題：display: none 會立即移除元素，opacity 過渡不會生效 */}

// ✅ Activity：可以配合 CSS 實現平滑過渡
<Activity mode={isVisible ? "visible" : "hidden"}>
  <div 
    style={{
      opacity: isVisible ? 1 : 0,
      transition: 'opacity 0.3s'
    }}
  >
    <Component />
  </div>
</Activity>
{/* 優點：元素仍在 DOM 中，opacity 過渡可以正常運作 */}
```

##### 場景 5：表單驗證和狀態

```jsx
// ✅ CSS 方式：適合簡單的顯示/隱藏，狀態保留
<div style={{ display: showForm ? 'block' : 'none' }}>
  <Form />
</div>
{/* 表單狀態保留，但所有 Effects 都會執行 */}

// ✅ Activity：同樣保留狀態，但可以控制 Effects
<Activity mode={showForm ? "visible" : "hidden"}>
  <Form />
</Activity>
{/* 表單狀態保留，且可以控制 Effects 執行時機 */}
```

#### Effects 處理的詳細對比

```jsx
function ComponentWithSideEffects() {
  useEffect(() => {
    console.log('Effects 已創建');
    
    // 定時器
    const timer = setInterval(() => {
      console.log('定時器執行中...');
    }, 1000);
    
    // 事件監聽
    window.addEventListener('resize', handleResize);
    
    // WebSocket
    const ws = new WebSocket('ws://example.com');
    
    return () => {
      console.log('Effects 已清理');
      clearInterval(timer);
      window.removeEventListener('resize', handleResize);
      ws.close();
    };
  }, []);
  
  return <div>元件內容</div>;
}

// CSS 方式
<div style={{ display: isVisible ? 'block' : 'none' }}>
  <ComponentWithSideEffects />
</div>
{/* 
  隱藏時：
  - ✅ 元件狀態保留
  - ❌ Effects 持續執行（定時器、事件監聽、WebSocket 都保持活躍）
  - ❌ 資源持續消耗
*/}

// Activity 方式
<Activity mode={isVisible ? "visible" : "hidden"}>
  <ComponentWithSideEffects />
</Activity>
{/* 
  隱藏時：
  - ✅ 元件狀態保留
  - ✅ Effects 被清理（定時器清除、事件移除、WebSocket 關閉）
  - ✅ 資源被釋放
  顯示時：
  - ✅ Effects 重新創建
  - ✅ 狀態完全恢復
*/}
```

#### 何時選擇 CSS 還是 Activity？

**使用 CSS `display: none` 當：**

- 簡單的顯示/隱藏，不需要控制 Effects
- 隱藏時 Effects 仍需要執行（例如：後台數據同步）
- 需要最簡單的實作方式
- 不需要動畫過渡效果
- 元件沒有昂貴的 Effects

**使用 `<Activity>` 當：**

- 需要控制 Effects 的執行時機（定時器、訂閱、網路請求等）
- 隱藏時需要節省資源（停止不必要的計算或請求）
- 需要實現平滑的動畫和過渡效果
- 元件包含昂貴的 Effects（視頻播放、WebSocket 連接等）
- 需要更精細的效能控制

## 最佳實踐

1. **使用場景選擇**：只在需要保留狀態的場景使用 `<Activity>`，如果不需要保留狀態，使用條件渲染即可。

2. **Effects 管理**：確保你的 Effects（`useEffect`）能夠正確處理銷毀和重新創建的情況。

3. **效能考量**：對於複雜元件，使用 `hidden` 模式可以節省資源，但要注意切換回 `visible` 時的重新掛載成本。

4. **可訪問性**：隱藏的內容仍然存在於 DOM 中，確保使用適當的 ARIA 屬性來維護可訪問性。

## 相關資源

### 官方文件

- [React `<Activity>` 元件官方文件](https://react.dev/reference/react/Activity) - 完整的 API 參考和使用說明
- [React 19.2 發布公告](https://react.dev/blog/2025/10/01/react-19-2) - 新版本功能介紹

### React Labs 文章

- [React Labs: 視圖過渡、Activity 等功能](https://zh-hans.react.dev/blog/2025/04/23/react-labs-view-transitions-activity-and-more) - 深入介紹 Activity 的設計理念和使用場景
- [React Labs: View Transitions, Activity, and more](https://react.dev/blog/2025/04/23/react-labs-view-transitions-activity-and-more)（英文原版）

### 關於「暫停（Pause）」狀態的說法

**重要說明**：官方文件中並沒有明確使用「pause」（暫停）這個術語來描述 Activity 的行為。React 官方文件強調：**概念上，你應該將 `hidden` 的 Activity 視為 unmounted（卸載）**。

本文檔使用「暫停狀態」這個概念，主要是為了幫助理解 `<Activity>` 在 `hidden` 模式下的行為特性：

- **概念上卸載**：從 React 的角度，應該視為已卸載
- **狀態保留**：元件狀態完整保留（這是與真正卸載的關鍵差異）
- **Effects 銷毀**：Effects 被銷毀和清理（與真正的卸載行為一致）
- **渲染優先級降低**：仍會響應新的 props 進行重新渲染，但優先級低於其他可見內容
- **DOM 保留**：元件仍存在於 DOM 中，使用 CSS 的 `display: none` 隱藏（這是與真正卸載的差異）

這種行為類似於暫停的概念，但 React 官方文件主要使用以下描述：

- **`hidden` 模式**：概念上視為 unmounted，使用 CSS 的 `display: none` 視覺上隱藏，並銷毀其 Effects，清理任何活躍的訂閱
- **保留狀態**：雖然概念上視為卸載，但元件狀態在隱藏時保留，仍會響應新的 props 進行重新渲染，但優先級較低
- **恢復運作**：切換回 `visible` 時狀態被恢復，Effects 重新創建（類似於重新掛載）

如果您需要查閱官方權威說法，建議參考：

1. **[React Activity API 參考](https://react.dev/reference/react/Activity)** - 官方對 `hidden` 和 `visible` 模式的詳細說明
2. **[React Labs 文章](https://react.dev/blog/2025/04/23/react-labs-view-transitions-activity-and-more)** - Activity 功能的設計理念和應用場景

**注意**：本文檔中的「暫停狀態」是為了幫助理解而使用的類比概念，實際開發中應以官方文件中的術語為準。
