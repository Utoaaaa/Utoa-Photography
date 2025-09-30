# GitHub PR 清理指南

**日期**: 2025-10-01  
**狀態**: Master 已推送,需要清理舊 PR

---

## ✅ 已完成

1. ✅ 本地合併 Feature 002 + 003 到 master
2. ✅ 推送 master 到遠端 (新分支)
3. ✅ Git 配置已優化 (http.postBuffer = 500MB)

---

## 📋 下一步: 清理 GitHub

### 1. 關閉舊的 Draft PR #1

**在 GitHub 上操作**:

1. 訪問: https://github.com/Utoaaaa/Utoa-Photography/pulls
2. 找到 PR #1 (002-title-publishing-why → 001-)
3. 點擊 "Close pull request"
4. 選擇理由: "已在 master 分支合併"
5. (可選) 添加評論:
   ```
   已將 Feature 002 和 Feature 003 直接合併到 master 分支。
   此 PR 不再需要。
   ```

### 2. 清理遠端分支 (可選)

如果不再需要這些分支,可以刪除:

```bash
# 刪除遠端的 feature 分支
git push origin --delete 001-
git push origin --delete 002-title-publishing-why
git push origin --delete 003-admin-years-collections

# 或保留它們作為歷史記錄 (推薦)
# 這樣可以隨時查看每個 feature 的獨立開發歷史
```

### 3. 清理本地分支 (可選)

```bash
# 刪除本地的 feature 分支
git branch -d 001-
git branch -d 002-title-publishing-why
git branch -d 003-admin-years-collections
```

---

## 🎯 推薦做法

### **保留遠端 feature 分支** ⭐

**原因**:
- ✅ 保存完整開發歷史
- ✅ 方便追溯特定功能的演進
- ✅ 團隊成員可以查看分支開發過程
- ✅ 不影響 master 分支

**清理本地分支**:
```bash
git branch -d 001- 002-title-publishing-why 003-admin-years-collections
```

只清理本地,保留遠端作為歷史記錄。

---

## 📊 當前狀態

### Git 分支狀態
```
遠端:
  - master (最新,包含 002 + 003) ✅ NEW
  - 001- (舊,包含 002)
  - 002-title-publishing-why (舊)
  - 003-admin-years-collections (舊)

本地:
  - master (最新) ✅
  - 001- (可刪除)
  - 002-title-publishing-why (可刪除)
  - 003-admin-years-collections (可刪除)
```

### GitHub PR
```
PR #1: 002 → 001 (Draft)
狀態: 待關閉 ⚠️
```

---

## 🚀 準備新功能開發

完成清理後,您可以:

```bash
# 從 master 創建新 feature 分支
git checkout -b 004-your-new-feature

# 或使用 specify 腳本
.specify/scripts/bash/create-new-feature.sh
```

---

## ✨ 總結

**立即行動**:
1. 🌐 在 GitHub 關閉 PR #1
2. 💻 清理本地分支: `git branch -d 001- 002-title-publishing-why 003-admin-years-collections`
3. ✅ 開始開發新功能!

**可選**:
- 清理遠端分支 (如果確定不需要歷史記錄)

---

**Created**: 2025-10-01  
**Next**: 告訴我您的新功能,幫您建立 feature 分支! 😊
