# UI 改動執行順序建議

**日期**: 2025-10-01  
**目的**: 規劃最佳的 UI 開發順序

---

## 🎯 推薦順序 (由下而上建構)

### 原則: **先建立基礎 → 再加入視覺風格 → 最後加入動態效果**

---

## 📅 Phase 1: 建立基礎結構 (第 1-2 天)

### 為什麼先做?
- ✅ 確保頁面完整性 (404, Loading)
- ✅ 建立開發環境 (可以即時預覽)
- ✅ 為後續改動建立基礎

### 任務清單:

#### 1.1 開發環境設定 (30 分鐘)
```bash
npm run dev
# 確保 localhost:3000 正常運作
```

#### 1.2 建立缺少的基礎頁面 (2-3 小時)
- [ ] **404 Page** (`src/app/not-found.tsx`)
  - 簡單的錯誤訊息
  - 回首頁按鈕
  - 先用灰階,之後套用黑白風格

- [ ] **Loading Components** 
  - `src/app/loading.tsx` (全域 loading)
  - `src/components/ui/loading.tsx` (共用元件)
  - `src/components/ui/skeleton.tsx` (骨架屏)

#### 1.3 Collections 修改日期 (2-3 小時)
- [ ] 檢查 Prisma schema
- [ ] API 回傳 `updated_at`
- [ ] Admin 頁面顯示日期
- [ ] 日期格式化工具

**預期成果**: 基礎功能完整,可以開始視覺設計

---

## 🎨 Phase 2: 黑白風格設計系統 (第 3-4 天)

### 為什麼接著做?
- ✅ 建立統一的視覺語言
- ✅ 定義色彩、間距、字體系統
- ✅ 為所有頁面提供設計基礎
- ✅ **動畫需要依賴色彩和元素,所以要先完成風格**

### 任務清單:

#### 2.1 定義設計 Token (2-3 小時)
- [ ] **色彩系統**
  ```css
  /* globals.css */
  :root {
    /* 主色調 */
    --color-black: #000000;
    --color-white: #FFFFFF;
    --color-gray-50: #FAFAFA;
    --color-gray-100: #F5F5F5;
    --color-gray-200: #E5E5E5;
    --color-gray-300: #D4D4D4;
    --color-gray-400: #A3A3A3;
    --color-gray-500: #737373;
    --color-gray-600: #525252;
    --color-gray-700: #404040;
    --color-gray-800: #262626;
    --color-gray-900: #171717;
    
    /* Accent (選一個強調色) */
    --color-accent: #000000; /* 或保留一點點顏色 */
  }
  ```

- [ ] **間距系統**
  ```javascript
  // tailwind.config.js
  spacing: {
    'xs': '0.5rem',   // 8px
    'sm': '1rem',     // 16px
    'md': '1.5rem',   // 24px
    'lg': '2rem',     // 32px
    'xl': '3rem',     // 48px
    '2xl': '4rem',    // 64px
  }
  ```

- [ ] **字體系統**
  - 標題: 大、粗、黑
  - 內文: 中、正常、灰
  - 標註: 小、細、淺灰

#### 2.2 建立基礎元件 (3-4 小時)
- [ ] **Button 變體** (黑底白字、白底黑字、透明)
- [ ] **Card** (統一陰影、邊框、圓角)
- [ ] **Typography** (標題、內文、標註)

#### 2.3 套用到現有頁面 (4-6 小時)
- [ ] Admin Dashboard (統計卡片、快捷操作)
- [ ] Years 管理頁面
- [ ] Collections 管理頁面
- [ ] Uploads 頁面
- [ ] Publishing 頁面

**預期成果**: 全站統一的黑白極簡風格

---

## 🖼️ Phase 3: 前台頁面 UI 改動 (第 5-7 天)

### 為什麼這時候做?
- ✅ 已有設計系統可以套用
- ✅ 可以專注在內容呈現
- ✅ 為動畫準備好元素結構

### 任務清單:

#### 3.1 首頁重新設計 (4-6 小時)
- [ ] **Hero Section**
  - 大標題
  - 簡短介紹
  - CTA 按鈕

- [ ] **年份列表**
  - 卡片式或列表式
  - Hover 效果預留
  - 響應式 grid

- [ ] **導航列**
  - 極簡設計
  - 固定或隱藏式

**檔案**: `src/app/(site)/page.tsx`

#### 3.2 照片頁面優化 (6-8 小時)
- [ ] **照片 Grid**
  - Masonry layout 或規則 grid
  - 預留動畫觸發點
  - Lazy loading

- [ ] **Lightbox**
  - 點擊放大
  - 左右切換
  - 鍵盤控制

- [ ] **照片資訊**
  - 標題、描述
  - EXIF 資訊 (可選)

**檔案**: `src/app/(site)/[year]/[collection]/page.tsx`

#### 3.3 Collection 列表頁 (3-4 小時)
- [ ] 年份下的 collections
- [ ] 封面圖
- [ ] 發佈日期

**檔案**: `src/app/(site)/[year]/page.tsx`

**預期成果**: 內容頁面結構完整,視覺乾淨

---

## ✨ Phase 4: 全站動畫系統 (第 8-10 天)

### 為什麼最後做?
- ✅ 頁面結構已穩定,不會反覆修改
- ✅ 視覺風格已定,動畫能強化而非干擾
- ✅ 可以專注在動態效果,不用擔心 layout 問題
- ✅ **動畫是錦上添花,基礎功能更重要**

### 任務清單:

#### 4.1 建立動畫工具庫 (2-3 小時)
- [ ] **基礎動畫函式**
  ```typescript
  // src/lib/animations.ts
  export const fadeIn = { ... }
  export const slideUp = { ... }
  export const staggerChildren = { ... }
  export const scaleOnHover = { ... }
  ```

- [ ] **GSAP 設定** (已有基礎)
  ```typescript
  // src/lib/gsap-loader.ts (已存在)
  // 確認設定正確
  ```

- [ ] **或引入 Framer Motion** (推薦用於 React)
  ```bash
  npm install framer-motion
  ```

#### 4.2 頁面轉場動畫 (2-3 小時)
- [ ] **路由切換**
  - Fade in/out
  - 或 Page transition

- [ ] **Loading 動畫**
  - Spinner 轉場
  - Progress bar

**技術**: Framer Motion `AnimatePresence`

#### 4.3 元素進場動畫 (3-4 小時)
- [ ] **首頁**
  - Hero 文字 fade in
  - 年份卡片 stagger 進場
  - Scroll trigger

- [ ] **照片頁面**
  - 照片 grid stagger
  - Scroll reveal
  - Parallax (可選)

**技術**: Framer Motion `motion` + `useInView`

#### 4.4 互動動畫 (3-4 小時)
- [ ] **Hover 效果**
  - 卡片 lift up
  - 圖片 scale
  - 按鈕 ripple

- [ ] **點擊回饋**
  - Button press
  - Card expand

- [ ] **拖曳排序** (Admin 頁面)
  - Drag & drop
  - Smooth reorder

**技術**: Framer Motion `whileHover`, `whileTap`, `drag`

#### 4.5 微互動 (2-3 小時)
- [ ] **Loading spinner**
- [ ] **Toast 通知**
- [ ] **Modal 開關**
- [ ] **Tooltip**

**預期成果**: 流暢的動態體驗,但不過度

---

## 📊 總時間估計

| Phase | 內容 | 時間 | 累計 |
|-------|------|------|------|
| Phase 1 | 基礎結構 | 1-2 天 | 1-2 天 |
| Phase 2 | 黑白風格 | 2-3 天 | 3-5 天 |
| Phase 3 | 頁面 UI | 3-4 天 | 6-9 天 |
| Phase 4 | 全站動畫 | 3-4 天 | 9-13 天 |

**總計**: 約 **2-3 週** (每天 4-6 小時工作)

---

## 🎯 關鍵原則

### 1. **由下而上** (Bottom-up)
```
基礎頁面 → 設計系統 → 內容頁面 → 動畫效果
```

### 2. **先功能後美化**
```
能用 → 好看 → 好玩
```

### 3. **漸進式增強**
```
- Phase 1: 網站完整可用
- Phase 2: 視覺統一專業
- Phase 3: 內容呈現最佳化
- Phase 4: 體驗流暢愉悅
```

### 4. **每個 Phase 都可獨立交付**
如果時間不夠,可以:
- 只做到 Phase 2 (有乾淨的黑白風格)
- 跳過 Phase 4 (不加動畫也能用)

---

## ⚠️ 為什麼不建議先做動畫?

### 問題 1: 元素可能會變
```
做了動畫 → 改 UI layout → 動畫要重做
```

### 問題 2: 視覺不統一
```
動畫很炫 → 但顏色、間距亂七八糟 → 整體感差
```

### 問題 3: 效能優化困難
```
動畫 + UI 同時改 → 不知道是哪邊造成卡頓
```

### 問題 4: 難以調整
```
沒有設計系統 → 每個動畫都要客製 → 維護困難
```

---

## 🚀 開始執行

### 選項 A: 完整執行 (推薦)
```
從 Phase 1 開始,按順序完成所有 Phase
預期: 2-3 週後有完整的網站
```

### 選項 B: 快速驗證
```
只做 Phase 1 + Phase 2 (1 週內)
先看黑白風格效果,再決定是否繼續
```

### 選項 C: 客製順序
```
告訴我你最想先看到什麼效果
我們調整順序
```

---

## 💬 下一步?

**我建議**: 從 Phase 1 開始,今天完成基礎頁面

要不要我現在就開始做?

1. **404 Page**
2. **Loading Page**
3. **Collections 修改日期**

完成後你就能啟動 dev server,看到基礎效果!

**開始嗎?** 🚀
