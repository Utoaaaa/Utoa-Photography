# 正式站 /api/assets 500 診斷

## 結論

本次重現的是匿名請求的驗證錯誤被誤轉為 500，並非已證實的資料庫故障。未測試正式站有效管理員 session 的讀取結果，不能將此結論延伸為所有登入情境均正常。

正式 Worker 版本 `fb2591cf-b4d5-40cd-b08f-f9375593e2b9`（100% 流量，2026-09-17T14:35:58Z）下載內容確認：

1. assets GET 在最外層 try 內先執行 `(0, e.fV)(request)`，e 對應驗證模組 67360。
2. fV 對應管理員驗證：缺少 `cf-access-authenticated-user-email` 時拋出 `Authentication required`；非管理員拋出 `Admin access required`。
3. GET 的 catch 無條件回傳 HTTP 500、`Failed to list assets`，尚未查詢 D1 就可能失敗。
4. 部署產物中的 catch 已無 console.error；因此 tail 中沒有例外細節。原始 next.config.ts 的 production removeConsole 設定與此一致。

舊版驗證只信任 email header，沒有真正驗證 JWT；本機先前的 JWT 修補尚未部署。本次未嘗試在線上偽造管理員 header。

## 唯讀證據

| 請求 | 結果 | CF Ray |
| --- | --- | --- |
| GET /api/assets | 500，Failed to list assets | a3c91fd2b9abc65e-SJC |
| GET /api/assets?limit=1 | 500，同上 | a3c91fd609817aca-SJC |
| GET /api/years | 200 | a3c91fdc2aabc65e-SJC |

使用專用診斷 header 過濾 tail；三次請求均為 outcome=ok、exceptions/logs 空陣列，表示錯誤由應用程式轉成回應。診斷監聽已停止。

Worker 的 NODE_ENV=production，DB 指向正確的正式 D1。唯讀 PRAGMA table_info(assets) 確認 id、location_folder_id、metadata_json、created_at 等查詢欄位存在；以下查詢均成功，未輸出照片內容：

```sql
SELECT COUNT(*) AS count FROM assets;
SELECT * FROM assets ORDER BY created_at DESC LIMIT 1 OFFSET 0;
```

此證據排除基本 assets 表缺失、排序欄位缺失及這兩個查詢本身失敗；不代表所有資料庫操作均經驗證。

## 本機狀態與後續

`src/lib/api-handlers/assets.ts` 已在資料庫 try 之前呼叫並回傳 adminAuthError；`src/lib/auth.ts` 將匿名或無效 JWT 回傳 401、有效非管理員回傳 403。本次重跑 `node --test tests/security/auth.test.mjs`：345 passed、0 failed。

資產管理清單仍要求管理員；公開作品頁資料與公開原圖不因本次診斷變更。登入管理頁不代表未涵蓋的 /api/assets 會收到 Access identity header，管理端應使用已納入 Access 的 /api/admin/assets。

本次只新增診斷文件，沒有修改應用程式、Access 政策、正式資料或部署。下一步可在本機使用有效管理員 session 確認 /api/admin/assets 200，再於獲准部署時驗收匿名 401、非管理員 403、管理員 200；生產錯誤日誌應保留經去識別的 error，避免再次只剩通用 500。
