# Loading 數字動畫 - 襯線字體版本

**日期**: 2025-10-01  
**版本**: v3 - 襯線字體,超大尺寸,精簡數字

---

## ✅ 最新修改

### 1. **數字只跳 5-7 個**
```typescript
const targetNumbers = [0, 15, 35, 55, 75, 90, 100]; // 7個數字

跳動序列:
0 → 15 → 35 → 55 → 75 → 90 → 100
```

### 2. **改用襯線字體**
```typescript
// Before: system-ui, sans-serif
// After:  Georgia, "Times New Roman", serif

fontFamily: 'Georgia, "Times New Roman", serif'
fontWeight: 700 // 襯線字體用較適中的粗細
```

### 3. **字體大小再增加 1.5 倍**
```typescript
// Before: clamp(180px, 28vw, 420px)
// After:  clamp(270px, 42vw, 630px)

提升 1.5 倍:
- 最小: 180px → 270px
- 理想: 28vw → 42vw
- 最大: 420px → 630px
```

### 4. **修正首頁重複動畫**
```typescript
// Before: 針對整個 body 動畫
const mainContent = document.body;

// After: 只針對 main 內容區域
const mainContent = document.querySelector('main') || 
                    document.querySelector('[data-main-content]');
```

---

## 📐 最終規格

### 視覺設計
```
背景: 白色 (#FFFFFF)
數字顏色: 黑色 (#000000)
數字大小: 270-630px (超大!)
數字粗細: 700 (Medium Bold)
字體: Georgia 襯線體
位置: 左下角 8px
左偏移: -12%
字距: -0.02em
```

### 數字跳動
```
總共 7 個數字:
0 → 15 → 35 → 55 → 75 → 90 → 100

每個數字停留時間: 1200ms / 7 ≈ 171ms
總時長: 約 1.2 秒
```

### 響應式大小 (新版)
| 螢幕寬度 | 數字大小 | 佔螢幕比例 |
|---------|---------|-----------|
| 1920px+ | 630px | ~33% |
| 1440px | 605px | ~42% |
| 1024px | 430px | ~42% |
| 768px | 323px | ~42% |
| 414px | 270px | ~65% |
| 375px | 270px | ~72% |

---

## 🎨 襯線字體特性

### Georgia 字體優勢
```
✅ 經典優雅的襯線設計
✅ 數字識別度高
✅ 大尺寸下筆畫細節豐富
✅ 跨平台一致性好
✅ 適合藝術/攝影作品集
```

### 視覺對比
```
無襯線 (舊版):
  ▄▄▄
   ██  
   ██  
   ██  
  ████ 

襯線 (新版):
  ┌──┐
  │ ╱│ 
  │╱ │ 
  │  │ 
  └──┘
```

---

## 🎬 完整動畫流程

```
頁面載入
  ↓
白色全螢幕
  ↓
左下角超大數字 "0" (270-630px)
  ↓
依序跳動:
  0 (171ms)
  ↓
  15 (171ms)
  ↓
  35 (171ms)
  ↓
  55 (171ms)
  ↓
  75 (171ms)
  ↓
  90 (171ms)
  ↓
  100 (停留)
  ↓
數字縮小淡出 (0.5s)
  ↓
白色背景淡出 (0.7s)
  ↓
只有 main 區域從中間淡入 (scale: 0.98 → 1)
  ↓
完成!
```

---

## 🔧 技術細節

### 精簡數字跳動
```typescript
const targetNumbers = [0, 15, 35, 55, 75, 90, 100];
let currentIndex = 0;

// 每個數字間隔時間
const interval = setInterval(() => {
  setProgress(targetNumbers[currentIndex]);
  currentIndex++;
}, minDurationMs / targetNumbers.length);
```

### 避免重複動畫
```typescript
// 只針對 main 標籤,不是整個 body
const mainContent = document.querySelector('main');

// 首頁加上 data 屬性
<main data-main-content>
```

### 超大襯線字體
```typescript
{
  fontSize: 'clamp(270px, 42vw, 630px)',
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontWeight: 700,
  letterSpacing: '-0.02em',
}
```

---

## 📊 版本演進

### v1 (初版)
```
- 數字: 120-280px
- 字體: Geist Sans 700
- 進度: 連續推進 (0-100)
- 動畫: body 整體
```

### v2 (粗體無襯線)
```
- 數字: 180-420px
- 字體: System UI 900
- 進度: 多階段變速
- 動畫: body 整體
```

### v3 (襯線超大) ✅ 當前版本
```
- 數字: 270-630px ⬆ (+1.5x)
- 字體: Georgia Serif 700 ⬆ (優雅)
- 進度: 7個精選數字 ⬆ (簡潔)
- 動畫: main 區域 ⬆ (修正重複)
```

---

## 🎯 視覺效果

### 桌面 (1920px)
```
┌─────────────────────────────┐
│                             │
│                             │
│                             │
│                             │
│                             │
│                             │
│                             │
│ 55                          │ ← 630px 高!
└─────────────────────────────┘
   ↑ 左邊切掉 12%
```

### 手機 (375px)
```
┌──────────┐
│          │
│          │
│          │
│          │
│          │
│ 55       │ ← 270px 高
│          │   佔螢幕 72%
└──────────┘
```

---

## 🔍 測試重點

### 1. 數字跳動
```
✅ 應該只看到 7 個數字
✅ 順序: 0→15→35→55→75→90→100
✅ 不會連續跳動
✅ 每個數字停留約 171ms
```

### 2. 字體顯示
```
✅ 襯線字體 (有裝飾筆畫)
✅ 數字有粗細變化
✅ 優雅的曲線
```

### 3. 尺寸大小
```
✅ 桌面: 非常大 (630px)
✅ 手機: 佔螢幕約 70%
✅ 左邊被切掉一部分
```

### 4. 動畫行為
```
✅ 首頁載入只有一次淡入
✅ 不會重複跳動
✅ 轉場流暢
```

---

## 💡 字體選擇說明

### 為何選 Georgia?

1. **經典襯線**: 傳統優雅,適合藝術作品
2. **數字清晰**: 大尺寸下識別度極高
3. **跨平台**: macOS/Windows/iOS/Android 都有
4. **設計優良**: 專為螢幕閱讀優化

### 替代方案
```typescript
// 更古典
fontFamily: '"Times New Roman", Times, serif'

// 更現代
fontFamily: '"Playfair Display", Georgia, serif'

// 更銳利
fontFamily: 'Didot, "Bodoni MT", serif'
```

---

## 🚀 效能優化

### 減少計算
```typescript
// Before: 每 frame 計算進度
requestAnimationFrame(tick)

// After: 只更新 7 次
setInterval(..., 171ms)
```

### 精確控制
```typescript
// 預定義數字陣列
const targetNumbers = [0, 15, 35, 55, 75, 90, 100];

// 不需要複雜的速度計算
```

---

## ✅ Checklist

- [x] 數字只跳 5-7 個
- [x] 改用襯線字體
- [x] 字體大小 x1.5 (270-630px)
- [x] 修正首頁重複動畫
- [x] main 標籤加上 data-main-content
- [x] 清理舊的多階段速度邏輯
- [x] 使用 interval 而非 RAF

---

**狀態**: ✅ 完成  
**效果**: 超大襯線數字,優雅簡潔,無重複動畫
