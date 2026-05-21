# 依賴解析錯誤問題總結

## 問題根源

專案使用 **Yarn 4 的 PnP（Plug'n'Play）模式**，該模式與 Expo/Metro bundler 存在相容性問題，導致依賴解析失敗。

---

## 遇到的錯誤序列

### 錯誤 1：Babel 核心依賴缺失
```
@babel/plugin-transform-parameters tried to access @babel/core 
but it isn't provided by its ancestors
```
**原因：** 缺少 `@babel/core`  
**解決：** 在 `devDependencies` 中新增 `@babel/core`

### 錯誤 2-4：react-native-worklets 的 Babel 依賴缺失
```
react-native-worklets tried to access @babel/types
react-native-worklets tried to access @babel/generator  
react-native-worklets tried to access @babel/traverse
```
**原因：** `react-native-worklets` 需要多個 Babel 套件，但未在 `package.json` 中聲明  
**解決：** 依序新增 `@babel/types`、`@babel/generator`、`@babel/traverse`

### 錯誤 5：Expo Metro 執行時無法解析
```
Unable to resolve "@expo/metro-runtime" from 
expo-router/entry-classic.js
```
**原因：** Yarn PnP 模式下 Metro bundler 無法正確解析依賴  
**解決：** 切換到 `node_modules` 模式

---

## 最終解決方案

### 步驟 1：新增缺失的依賴

在 `package.json` 中新增了以下依賴：

```json
"devDependencies": {
  "@babel/core": "^7.25.0",
  "@babel/generator": "^7.25.0",
  "@babel/traverse": "^7.25.0",
  "@babel/types": "^7.25.0",
  // ... 其他依賴
},
"dependencies": {
  "@expo/metro-runtime": "^6.1.2",
  // ... 其他依賴
}
```

### 步驟 2：切換到 node_modules 模式

建立 `.yarnrc.yml` 檔案：
```yaml
nodeLinker: node-modules
```

### 步驟 3：重新安裝依賴

```bash
rm -rf .pnp.* .yarn/cache .yarn/unplugged node_modules
yarn install
```

---

## 為什麼會有這麼多錯誤？

### 1. Yarn PnP 的嚴格性
- PnP 模式要求所有依賴（包括 peer dependencies）必須顯式聲明
- 未聲明的依賴會導致執行時解析失敗

### 2. Expo 與 PnP 的相容性問題
- Metro bundler 不完全支援 PnP 的虛擬套件機制
- 導致 `@expo/metro-runtime` 等依賴無法正確解析

### 3. 依賴聲明不完整
- `react-native-worklets` 需要多個 Babel 套件，但未在 `package.json` 中聲明
- 這些是 peer dependencies，在傳統模式下可能自動處理，但在 PnP 模式下必須顯式聲明

---

## 最終狀態

✅ 所有 Babel 相關依賴已新增  
✅ `@expo/metro-runtime` 已新增  
✅ 已切換到 `node_modules` 模式（與 Expo 相容性更好）  
✅ 依賴已正確安裝到 `node_modules` 目錄

---

## 建議

對於 Expo 專案，建議使用 **`node_modules` 模式**而不是 PnP 模式，以確保最佳相容性。如果將來想切換回 PnP 模式，刪除 `.yarnrc.yml` 檔案並重新安裝依賴即可。

---

## 相關檔案

- `package.json` - 已新增所有缺失的依賴
- `.yarnrc.yml` - 設定 Yarn 使用 node_modules 模式
- `node_modules/` - 依賴已正確安裝
