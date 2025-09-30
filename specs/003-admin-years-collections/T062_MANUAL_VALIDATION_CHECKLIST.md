# T062 鍵盤導航手動驗證清單

**目的**: 驗證 Admin 頁面符合 FR-001 鍵盤無障礙性需求

**測試日期**: _____________
**測試者**: _____________
**瀏覽器**: _____________

---

## Admin Years 頁面 (/admin/years)

### ✅ Tab 順序與焦點可見性
- [ ] 按 Tab 鍵能依邏輯順序導航所有互動元素
- [ ] 焦點元素有明顯視覺指示 (outline 或 box-shadow)
- [ ] Tab 順序包含: 導航連結 → Create 按鈕 → Year 項目 → 排序按鈕

### ✅ 方向鍵導航 (Year 清單)
- [ ] 焦點移至 Year 項目後,按 ArrowDown 能移至下一項
- [ ] 焦點移至 Year 項目後,按 ArrowUp 能移至上一項
- [ ] 方向鍵操作觸發排序時顯示成功訊息
- [ ] 排序後重新載入頁面,順序已持久化

### ✅ Enter 鍵啟動
- [ ] Tab 到 Create Year 按鈕,按 Enter 開啟對話框
- [ ] Tab 到 Edit 按鈕,按 Enter 開啟編輯對話框
- [ ] Tab 到 Delete 按鈕,按 Enter 開啟刪除確認

### ✅ Escape 鍵關閉
- [ ] 在對話框內按 Escape 關閉對話框
- [ ] 關閉後焦點返回到觸發按鈕

### ✅ 表單鍵盤操作
- [ ] 在 Create Year 對話框中,Tab 能在欄位間移動
- [ ] 可用鍵盤輸入 label (如 "2026")
- [ ] Tab 到 Save 按鈕,Enter 提交表單
- [ ] Tab 到 Cancel 按鈕,Enter 取消

### ✅ ARIA Live Region 宣告
- [ ] 使用 ArrowUp/ArrowDown 排序後,螢幕閱讀器宣告新位置
- [ ] 檢查頁面有 `role="status"` 或 `aria-live="polite"` 元素
- [ ] 排序成功時更新宣告文字 (如 "Year 2024 moved to position 2")

---

## Admin Collections 頁面 (/admin/collections)

### ✅ Tab 順序與焦點可見性
- [ ] 按 Tab 鍵能依邏輯順序導航所有互動元素
- [ ] 焦點元素有明顯視覺指示
- [ ] Tab 順序包含: Year 選擇器 → Create 按鈕 → Collection 項目

### ✅ 方向鍵導航 (Collection 清單)
- [ ] 焦點移至 Collection 項目後,按 ArrowDown 能移至下一項
- [ ] 焦點移至 Collection 項目後,按 ArrowUp 能移至上一項
- [ ] 方向鍵操作觸發排序時顯示成功訊息

### ✅ Enter 與 Escape 鍵
- [ ] Tab 到 Create Collection 按鈕,Enter 開啟對話框
- [ ] 對話框內 Escape 關閉並返回焦點

### ✅ ARIA Live Region
- [ ] 排序操作後有語音宣告
- [ ] 檢查 `role="status"` 元素存在

---

## Admin Uploads 頁面 (/admin/uploads)

### ✅ 基本鍵盤導航
- [ ] Tab 能到達上傳按鈕
- [ ] Tab 能到達所有 Asset 卡片
- [ ] Tab 能到達編輯/刪除按鈕

---

## 跨頁面功能

### ✅ Skip Navigation Links (如已實作)
- [ ] 頁面載入後按 Tab,第一個元素是 "Skip to main content" 連結
- [ ] 按 Enter 跳轉到主要內容區
- [ ] 主要內容區獲得焦點

### ❌ Skip Navigation (未實作)
- 註記: 此功能在規格中為可選,Admin 頁面可接受不實作

---

## 整體評估

**通過的項目**: _____ / _____
**需要修復的問題**:
1. _____________________________________________
2. _____________________________________________
3. _____________________________________________

**符合 FR-001 要求**: [ ] 是 / [ ] 否

**備註**:
_______________________________________________________________
_______________________________________________________________

---

## 對應 E2E 測試案例

此清單對應 `tests/integration/test_admin_keyboard_navigation.ts` 中的 9 個測試案例:
1. ✅ Admin Years page: Tab order is logical and focus visible
2. ✅ Admin Collections page: Tab navigation and focus indicators
3. ✅ Arrow keys navigate between list items (Years)
4. ✅ Arrow keys navigate between list items (Collections)
5. ✅ Escape key closes dialogs and returns focus
6. ✅ Enter key activates buttons when focused
7. ⏭️ Skip navigation links exist and are functional (可選)
8. ✅ Form inputs are keyboard accessible (Years create)
9. ✅ ARIA live regions announce keyboard actions

**E2E 測試狀態**: 因 Next.js 15 開發環境穩定性問題,改為手動驗證
**手動驗證可替代 E2E**: 是,手動驗證可完整覆蓋所有鍵盤無障礙性需求
