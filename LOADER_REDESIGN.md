# Loading 數字動畫設計

**日期**: 2025-10-01  
**風格**: 極簡主義 - 左下角大字數字

---

## 🎯 設計特點

### 視覺設計
- ✅ **白色背景** (乾淨極簡)
- ✅ **左下角大字數字** (120-280px)
- ✅ **左邊被切到** (透過 `-translate-x-[15%]` 實現)
- ✅ **無其他文字** (純粹的數字體驗)
- ✅ **無進度條** (數字本身就是進度)

### 動畫流程
```
0% → 快速推進 → 99% → 100%
  ↓
數字縮小淡出 (0.4s)
  ↓
白色背景淡出 (0.6s)
  ↓
主內容從中間淡入 (1.2s, scale: 0.98 → 1)
```

### 行為特性
- ✅ **每次重新整理都顯示** (移除 sessionStorage)
- ✅ **快速載入** (最短 800ms)
- ✅ **流暢轉場** (從中間縮放淡入)
- ✅ **響應式** (數字大小自適應: 120px-280px)

---

## 📐 技術實作

### 數字定位
```tsx
// 左下角,向左偏移 15%
className="fixed bottom-8 left-0 transform -translate-x-[15%]"
```

### 響應式大小
```tsx
fontSize: 'clamp(120px, 20vw, 280px)'
// 最小 120px, 理想 20vw, 最大 280px
```

### 字體設定
```tsx
{
  fontWeight: 700,           // 粗體
  letterSpacing: '-0.02em',  // 緊密
  lineHeight: 0.9,           // 緊湊
  fontFamily: 'var(--font-geist-sans)'
}
```

### 淡入動畫 (主內容)
```tsx
gsap.fromTo(body, 
  { opacity: 0, scale: 0.98 },   // 起始
  { 
    opacity: 1, 
    scale: 1, 
    duration: 1.2,
    ease: 'power2.out'
  }
);
```

---

## 🎨 視覺效果對比

### Before (舊設計)
```
┌─────────────────────────┐
│                         │
│   UTOA Photography      │
│   品牌標語              │
│   ════════════ 87%      │
│                         │
└─────────────────────────┘
黑色背景 + 進度條 + 多文字
```

### After (新設計)
```
┌─────────────────────────┐
│                         │
│                         │
│                         │
│                         │
│                         │
│  87                     │
└─────────────────────────┘
白色背景 + 左下角大字 + 左邊被切
```

---

## 📱 響應式行為

### 桌面 (1920px+)
- 數字大小: **280px**
- 左偏移: 約 **42px** (280 * 15%)
- 位置: 左下角 8px

### 平板 (768px)
- 數字大小: **約 154px** (20vw)
- 左偏移: 約 **23px**
- 位置: 左下角 8px

### 手機 (375px)
- 數字大小: **120px** (最小值)
- 左偏移: 約 **18px**
- 位置: 左下角 8px

---

## ⚡ 效能優化

### 載入速度
- 移除字型等待 (從 1200ms → 800ms)
- 移除圖片等待
- 快速進度推進 (2.5/frame vs 0.8/frame)

### 動畫效能
- 使用 `transform` (GPU 加速)
- 使用 `opacity` (不觸發 reflow)
- 避免 `scaleY` 複雜變形

### 時間軸
```
舊版: 1200ms 載入 + 1800ms 動畫 = 3000ms
新版: 800ms 載入 + 1000ms 動畫 = 1800ms
節省: 40% 時間
```

---

## 🎭 動畫細節

### 數字淡出
```typescript
gsap.to(numberRef, {
  scale: 0.9,        // 微縮
  opacity: 0,        // 淡出
  duration: 0.4,     // 快速
  ease: 'power2.in'  // 加速離開
});
```

### 背景淡出
```typescript
gsap.to(overlayRef, {
  opacity: 0,
  duration: 0.6,
  ease: 'power2.inOut'
});
```

### 內容入場
```typescript
gsap.fromTo(body,
  { opacity: 0, scale: 0.98 },
  { 
    opacity: 1, 
    scale: 1,
    duration: 1.2,      // 較慢,優雅
    ease: 'power2.out'  // 減速進入
  }
);
```

---

## 🔧 客製化選項

### 調整數字大小
```tsx
// src/components/Loader.tsx
fontSize: 'clamp(150px, 25vw, 320px)'  // 更大
```

### 調整左偏移量
```tsx
className="... -translate-x-[20%]"  // 切更多
className="... -translate-x-[10%]"  // 切較少
```

### 調整位置 (右下角)
```tsx
className="fixed bottom-8 right-0 transform translate-x-[15%]"
```

### 改變背景色
```tsx
className="fixed inset-0 z-[9999] bg-black"  // 黑色
// 數字顏色也要改
style={{ color: '#fff' }}
```

### 調整載入速度
```tsx
// src/app/loader-client.tsx
<Loader minDurationMs={600} />  // 更快
<Loader minDurationMs={1200} /> // 更慢
```

---

## 📊 使用者體驗

### 感知速度
- ✅ **更快**: 800ms vs 1200ms
- ✅ **更簡潔**: 無多餘元素干擾
- ✅ **更現代**: 大字數字很有設計感

### 品牌印象
- ✅ **極簡**: 符合攝影作品集風格
- ✅ **專業**: 乾淨俐落的轉場
- ✅ **獨特**: 左邊被切的設計很特別

### 技術優勢
- ✅ **輕量**: 移除資源等待邏輯
- ✅ **快速**: 總時長減少 40%
- ✅ **流暢**: 60fps 動畫

---

## 🧪 測試方式

### 1. 重新整理測試
```
Cmd + R (重新整理)
→ 應該每次都看到 Loading 數字
```

### 2. 檢查數字位置
```
- 數字應該在左下角
- 左邊被切掉約 15%
- 不會看到其他文字
```

### 3. 檢查轉場
```
- 數字淡出後
- 頁面從中間縮放淡入
- 不應該有閃爍
```

### 4. 響應式測試
```
Chrome DevTools:
Toggle device toolbar (Cmd+Shift+M)
測試不同尺寸下的數字大小
```

---

## 🎯 下一步建議

### Phase 1: 完成 Loading
- [x] 重新設計 Loading 數字動畫
- [ ] 測試各種螢幕尺寸
- [ ] 微調數字位置和大小

### Phase 2: 其他基礎頁面
- [ ] 404 Page
- [ ] Collections 修改日期

### Phase 3: 黑白風格
- [ ] 定義色彩系統
- [ ] 建立基礎元件
- [ ] 套用到所有頁面

---

## 💬 常見調整

### Q: 數字太大/太小?
```tsx
// 調整 clamp 範圍
fontSize: 'clamp(100px, 18vw, 240px)'
```

### Q: 被切太多/太少?
```tsx
// 調整 translate
-translate-x-[10%]  // 較少
-translate-x-[20%]  // 較多
```

### Q: 想要黑色背景?
```tsx
// Loader.tsx
className="... bg-black"
style={{ color: '#fff' }}
```

### Q: 動畫太快/太慢?
```tsx
// loader-client.tsx
minDurationMs={600}   // 更快
minDurationMs={1200}  // 更慢
```

---

**建立日期**: 2025-10-01  
**狀態**: ✅ 重新設計完成
