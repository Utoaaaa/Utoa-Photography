# Access 政策與舊 API 覆蓋核對

透過 Cloudflare One 實際可見設定唯讀核對，2026-09-17。未修改政策、未部署。

## 已核實

- 帳戶 Utoa，團隊 `utoa.cloudflareaccess.com`；介面顯示一個應用程式。
- 應用程式 `Utoa Admin`，ID `c27a0690-efe7-469c-a509-d585ed45fd2c`。
- 唯一 Allow 原則 `utoa`，ID `4d7e0db4-cfd8-4fa3-8256-ab9e7997cf67`，Include Emails 僅 `nick940624@gmail.com`，工作階段 24 小時。
- 目的地全部位於 `utoa.studio`：`admin`、`admin/*`、`api/admin/*`、`collections/*/assets*`。

## 發現

`collections/*/assets*` 少了 `api/` 前綴，不會匹配 `/api/collections/.../assets`。

程式共有 28 個寫入路徑、38 個寫入方法。其中 15 個管理前綴路徑由 `api/admin/*` 涵蓋；13 個舊路徑未被上述目的地涵蓋：

- `/api/assets`、`/api/assets/[asset_id]`、`/api/assets/batch-delete`、`/api/assets/r2-reconcile`
- `/api/collections/[collection_id]`、`/api/collections/[collection_id]/assets`、`/api/collections/[collection_id]/assets/[asset_id]`
- `/api/images/direct-upload`、`/api/revalidate`、`/api/uploads/r2`
- `/api/years`、`/api/years/[year_id]`、`/api/years/[year_id]/collections`

上述 13 個本機 handler 均有 adminAuthError 防護，既有安全測試涵蓋拒絕案例；尚未部署，不能由本機測試推論正式站已修補。逐項清單見 `access-write-route-inventory.json`。

不能直接將所有 `/api/*` 加入 Access，因為 `/api/years` 等路徑同時提供公開讀取。後續宜讓管理前端使用 `/api/admin/*`，逐步停用舊寫入入口，或針對需要公開 GET 的路徑設計憑證傳遞；此核對沒有擅自鎖住公開 API。

## CLI 查詢權限已驗證

使用者儲存權限後，使用原本 CLI token 唯讀回查成功：

- `/user/tokens/verify`：HTTP 200，原 token ID `08633c7c7b51bb3b5ef7d91d851e5243` 仍為 active。
- 帳戶 `/access/apps`：HTTP 200，成功取得 Utoa Admin，結果共一項。
- 應用程式 `/access/apps/c27a0690-efe7-469c-a509-d585ed45fd2c/policies`：HTTP 200，成功取得唯一 utoa Allow 原則。
- API 回傳 AUD、四個目的地、管理員 Email 與 24h 工作階段均與上述 UI 核對一致；13 個舊版寫入路徑仍未被這些目的地涵蓋。

本次未修改 Access 政策或部署網站。驗證證明讀取權限可用，未執行任何寫入 API 來測試 token 是否缺少寫入權限，也未宣稱已審計全部 token 權限。

## 後續本機修補

已完成 [管理寫入入口統一](admin-write-migration.md)：舊寫入方法回 405，新增缺少的管理入口並保留 GET。以上政策覆蓋描述仍代表未修改的 Cloudflare 設定；本機修補尚未部署。
