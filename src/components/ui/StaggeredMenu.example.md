# StaggeredMenu 使用指南

這是一個符合 Utoa Photography 風格的動態選單組件,使用 GSAP 製作流暢的動畫效果。

## 基本使用

```tsx
import StaggeredMenu from '@/components/ui/StaggeredMenu';

const menuItems = [
  { label: 'Home', ariaLabel: 'Go to home page', link: '/' },
  { label: '2024', ariaLabel: 'View 2024 collections', link: '/2024' },
  { label: '2023', ariaLabel: 'View 2023 collections', link: '/2023' }
];

const socialItems = [
  { label: 'Instagram', link: 'https://instagram.com/utoa' },
  { label: 'Email', link: 'mailto:contact@utoa.com' }
];

<StaggeredMenu
  position="right"
  items={menuItems}
  socialItems={socialItems}
  displaySocials={true}
  displayItemNumbering={false}
  menuButtonColor="#111"
  openMenuButtonColor="#111"
  changeMenuColorOnOpen={false}
  colors={['#fafafa', '#ffffff']}
  accentColor="#666"
/>
```

## Props 說明

### 必要 Props

- `items`: 選單項目陣列
  - `label`: 顯示文字
  - `ariaLabel`: 無障礙標籤
  - `link`: 連結路徑

### 可選 Props

- `position`: 選單位置 (`'left'` | `'right'`) - 預設 `'right'`
- `colors`: 背景層顏色陣列 - 預設 `['#f5f5f5', '#ffffff']`
- `socialItems`: 社交媒體連結陣列
- `displaySocials`: 是否顯示社交連結 - 預設 `true`
- `displayItemNumbering`: 是否顯示項目編號 - 預設 `false`
- `menuButtonColor`: 選單按鈕顏色 - 預設 `'#111'`
- `openMenuButtonColor`: 開啟時按鈕顏色 - 預設 `'#111'`
- `accentColor`: 強調色 - 預設 `'#666'`
- `changeMenuColorOnOpen`: 開啟時是否改變按鈕顏色 - 預設 `false`
- `onMenuOpen`: 選單開啟時的回調函數
- `onMenuClose`: 選單關閉時的回調函數

## 設計特點

### 符合 Utoa Photography 風格

1. **有襯線字體**: 選單項目使用 `font-serif`
2. **簡約配色**: 黑白灰色系,優雅內斂
3. **輕量字重**: `font-light` 營造輕盈感
4. **流暢動畫**: GSAP 驅動的錯落動畫效果
5. **極簡設計**: 去除多餘裝飾,專注內容

### 動畫效果

- **錯落式進入**: 背景層依序滑入
- **項目淡入**: 選單項目依序從下方旋轉進入
- **按鈕變形**: Menu/Close 文字循環動畫
- **加號變叉**: 平滑的旋轉動畫
- **社交連結**: 延遲淡入效果

### 響應式設計

- 桌面: 選單寬度 `clamp(320px, 45vw, 520px)`
- 平板/手機: 選單全寬顯示
- 按鈕位置: 
  - 手機: `top-8 right-8`
  - 桌面: `top-12 right-12`

## 無障礙功能

- ✅ ARIA 標籤完整
- ✅ 鍵盤導航支援
- ✅ Focus 視覺回饋
- ✅ 語意化 HTML
- ✅ 螢幕閱讀器友善

## 整合建議

### 首頁使用
```tsx
// 放在最外層,z-index 最高
<StaggeredMenu {...props} />
<header>...</header>
<main>...</main>
```

### 內頁使用
```tsx
// 可調整按鈕位置避免與其他元素重疊
// Header z-index 設為 40
// Menu z-index 設為 50
```

## 動態內容範例

```tsx
// 從 API 獲取年份列表動態生成選單
const years = await getPublishedYears();
const menuItems = [
  { label: 'Home', ariaLabel: 'Go to home page', link: '/' },
  ...years.map(year => ({
    label: year.label,
    ariaLabel: `View ${year.label} collections`,
    link: `/${year.label}`
  }))
];
```

## 注意事項

1. **Z-index 管理**: Menu 的 z-index 為 50,確保其他固定元素不要超過
2. **GSAP 依賴**: 需要安裝 `gsap` 套件
3. **Client Component**: 此組件使用 `'use client'`,適用於 Next.js App Router
4. **性能考量**: 動畫使用 `will-change` 優化渲染性能
