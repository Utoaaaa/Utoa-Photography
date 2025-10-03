# Loading Preloader 實作文件

**日期**: 2025-10-01  
**參考**: thevariable.com 品牌體驗  
**技術**: Next.js App Router + GSAP + Tailwind

---

## 📋 已實作功能

### ✅ 核心功能

1. **全螢幕前導頁面**
   - 黑色背景,白色文字
   - 品牌標語 "UTOA Photography"
   - 細長進度條 + 百分比數字
   - 固定在最上層 (z-index: 9999)

2. **載入偵測**
   - 等待 Web Fonts 載入 (`document.fonts.ready`)
   - 等待關鍵圖片載入 (前 4 張)
   - 最短顯示時間 1200ms (避免一閃而過)

3. **順暢揭幕動畫**
   - 進度條填滿脈衝
   - 文字先淡出上移
   - 遮罩從上方縮小 (scaleY: 0)
   - 主內容淡入微位移

4. **只顯示一次**
   - 使用 `sessionStorage` 記錄已看過
   - 關閉瀏覽器後會重置
   - (可改用 `localStorage` 永久記錄)

5. **無障礙支援**
   - `prefers-reduced-motion` 檢測
   - Reduced motion 模式走簡單淡出
   - ARIA 標籤 (`role="status"`, `aria-label`)

---

## 📁 檔案結構

```
src/
├── components/
│   └── Loader.tsx              # 主 Loader 元件
├── app/
│   ├── loader-client.tsx       # Client 控制器 (只顯示一次)
│   ├── layout.tsx              # 整合到 layout
│   └── globals.css             # 加入 reduced motion 支援
└── lib/
    └── gsap-loader.ts          # (已存在) GSAP 設定
```

---

## 🎯 使用方式

### 基本使用 (已自動啟用)

Loader 已整合到 `app/layout.tsx`,首次載入時自動顯示,無需額外設定。

### 讓特定元素有「揭幕入場」效果

在你的頁面元件中,加入 `data-hero-content` 屬性:

```tsx
// 例如: app/(site)/page.tsx
export default function HomePage() {
  return (
    <main>
      {/* 這個區塊會在 loader 完成後淡入 */}
      <div data-hero-content className="hero-section">
        <h1>Welcome to UTOA Photography</h1>
        <p>Capturing Moments, Creating Stories</p>
      </div>
      
      {/* 其他內容 */}
      <div>...</div>
    </main>
  );
}
```

`data-hero-content` 會觸發:
- 初始狀態: `opacity: 0, y: 30`
- 動畫: 淡入 + 向上移動
- 時長: 1 秒,延遲 0.2 秒

---

## ⚙️ 客製化設定

### 調整最短顯示時間

```tsx
// src/app/loader-client.tsx
<Loader 
  onDone={handleLoaderDone} 
  minDurationMs={1500}  // 改為 1.5 秒
/>
```

### 改用永久記錄 (localStorage)

```tsx
// src/app/loader-client.tsx
// 將 sessionStorage 改為 localStorage
const seen = localStorage.getItem('seen_preloader');
// ...
localStorage.setItem('seen_preloader', '1');
```

### 調整品牌文案

```tsx
// src/components/Loader.tsx
<div className="text-3xl md:text-5xl font-bold">
  YOUR BRAND NAME  {/* 改這裡 */}
</div>
<div className="text-xs md:text-sm mt-3 opacity-50">
  Your tagline here  {/* 改這裡 */}
</div>
```

### 調整進度條顏色

```tsx
// src/components/Loader.tsx
<div className="h-0.5 w-full bg-white/10">  {/* 背景色 */}
  <div className="... bg-white">              {/* 進度條色 */}
```

### 調整揭幕動畫速度

```tsx
// src/components/Loader.tsx - 動畫時間軸
tl.to(overlayRef.current, {
  duration: 1.2,  // 改為更慢 (預設 0.8)
  // ...
});
```

---

## 🎨 動畫細節

### 時間軸 (Timeline)

```
0.0s - 進度條填滿脈衝 (0.4s)
0.2s - 文字淡出上移 (0.5s)
0.6s - 遮罩揭幕 (0.8s)
1.4s - 完全移除
1.6s - 主內容淡入 (1.0s)
```

### Easing Functions

- **進度條**: `power3.inOut` (平滑加速減速)
- **文字淡出**: `power2.in` (加速離開)
- **遮罩揭幕**: `power4.inOut` (強力曲線,品牌感)
- **內容入場**: `power3.out` (柔和進入)

---

## 🔍 測試方式

### 1. 清除 sessionStorage 重新測試

```javascript
// 在瀏覽器 Console 執行
sessionStorage.removeItem('seen_preloader');
location.reload();
```

### 2. 測試 Reduced Motion

```
macOS: 
系統偏好設定 → 輔助使用 → 顯示器 → 減少動態效果

Chrome DevTools:
Cmd+Shift+P → "Emulate CSS prefers-reduced-motion"
```

### 3. 測試慢速網路

```
Chrome DevTools:
Network tab → Throttling → Slow 3G
```

---

## 🚀 效能優化

### 已實作的優化

1. **選擇性載入偵測**
   - 只等前 4 張圖片
   - 超時保護 (最短顯示時間)

2. **只執行一次**
   - sessionStorage 記錄
   - 避免每次路由切換都顯示

3. **硬體加速**
   - 使用 `transform` 和 `opacity`
   - 避免 layout thrashing

4. **Reduced Motion**
   - 自動偵測並簡化動畫
   - 無障礙友善

### 可選的進階優化

#### 預載關鍵資源

```tsx
// app/layout.tsx 的 <head>
<link rel="preload" href="/hero-image.jpg" as="image" />
<link rel="preload" href="/fonts/brand-font.woff2" as="font" crossOrigin="anonymous" />
```

#### 使用 requestIdleCallback

```tsx
// src/components/Loader.tsx
requestIdleCallback(() => {
  // 低優先級任務
}, { timeout: 2000 });
```

---

## 🎯 與 thevariable.com 的對比

### ✅ 已實作的相似特性

- ✅ 全螢幕黑色前導頁
- ✅ 品牌標語居中顯示
- ✅ 細長進度條 + 百分比
- ✅ 揭幕式轉場 (scaleY)
- ✅ 內容淡入入場
- ✅ 順暢的時間軸編排

### 🔄 差異/簡化處

- 🔄 The Variable 有複雜的 SVG 動畫
- 🔄 The Variable 有粒子效果
- 🔄 我們的版本更輕量,載入更快

---

## 📝 下一步建議

### Phase 1: 當前狀態測試

1. ✅ 啟動 dev server: `npm run dev`
2. ✅ 清除 sessionStorage 測試
3. ✅ 檢查動畫流暢度
4. ✅ 測試 reduced motion

### Phase 2: 視覺微調 (可選)

1. 調整品牌文案
2. 改變顏色配置 (黑白 → 其他色系)
3. 加入品牌 Logo
4. 調整動畫時長

### Phase 3: 進階功能 (可選)

1. 真實的載入進度 (使用 Web API)
2. 加入音效 (可選)
3. 加入 SVG 動畫
4. 與路由轉場整合

---

## 🐛 疑難排解

### 問題: Loader 不顯示

**原因**: sessionStorage 已記錄過

**解決**:
```javascript
sessionStorage.removeItem('seen_preloader');
location.reload();
```

### 問題: 動畫卡頓

**檢查**:
1. 是否有大型圖片未壓縮?
2. 是否有其他 JS 阻塞主執行緒?
3. 瀏覽器效能是否正常?

**優化**:
```tsx
// 減少等待圖片數量
Array.from(document.images).slice(0, 2)  // 只等 2 張
```

### 問題: GSAP 錯誤

**確認**:
```bash
npm list gsap
# 應顯示 gsap@^3.x.x
```

**重新安裝**:
```bash
npm install gsap --save
```

---

## 📚 相關文件

- `src/lib/gsap-loader.ts` - GSAP 全域設定
- `UI_EXECUTION_PLAN.md` - 整體 UI 開發計畫
- `FEATURES_ANALYSIS.md` - 功能需求分析

---

## ✅ Checklist

- [x] 安裝 GSAP
- [x] 建立 Loader 元件
- [x] 建立 LoaderClient 控制器
- [x] 整合到 layout.tsx
- [x] 加入 reduced motion 支援
- [ ] 啟動 dev server 測試
- [ ] 調整品牌文案
- [ ] 客製化顏色 (可選)

---

**建立日期**: 2025-10-01  
**狀態**: ✅ 實作完成,等待測試
