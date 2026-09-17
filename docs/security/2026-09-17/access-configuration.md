# Cloudflare Access 設定核對（2026-09-17）

使用既有 Cloudflare API token 及 cloudflared 瀏覽器登入。未上傳本機網站程式、未執行 wrangler deploy；已透過 settings API 更新現有線上 Worker 的環境綁定，因此本次有線上設定變更。

## 已完成

- 確認帳戶 Utoa，Worker `utoa-photography`。
- `/admin`、`/api/admin/years` 匿名 GET 均 302 至 `https://utoa.cloudflareaccess.com`，兩者使用相同應用程式 AUD。
- 經 cloudflared 登入並以 jose 驗證官方 RSA 簽章、issuer、audience、有效期，登入 Email 符合既有 ADMIN_EMAILS。
- 補上線上 Worker 原本缺少的 `CF_ACCESS_TEAM_DOMAIN=https://utoa.cloudflareaccess.com` 及 `CF_ACCESS_AUD=0fab3f334a4b56b8beecc28b822b46629c99d004fc1dcfe4392057235bf82183`。
- PATCH 前讀取所有 bindings，合併兩個變數後回讀，逐欄核對既有 bindings 保持原值。
- 本機 `.env.local`、`.dev.vars` 已配置三個 auth 變數；均由 Git 忽略，權限 0600。JWT 留在 cloudflared 自己的儲存，未複製進專案。
- `wrangler.toml` 的 production vars 同步，避免未來部署遺失設定。
- 更新本機 `.env.example` 的過期 bypass／空白名單說明（此檔目前被 Git 忽略）。
- 使用目前 `src/lib/auth.ts` 加上真實登入 token，隔離資料庫測試：匿名 401、假 token 401、真實管理員授權成功。既有 311 項安全測試通過。

## 尚未完成與限制

- 現有 API token 查 zone Access apps 與 account organization 回 403；account apps 回空陣列，不能由此推論沒有 Access。未修改 Access policies 或放寬權限。
- 公開 GET `/`、`/api/years` 均 200，未改原圖公開行為。
- 唯讀 GET `/api/uploads/r2`、`/api/revalidate` 為 405，沒有導向 Access；這不能證明其 POST 授權狀態，未向正式站發送寫入測試。
- `/api/assets` GET 為 500，`/api/collections` GET 為 404，`/api/audit` GET 為 401，均未導向 Access。500 尚未診斷，不能歸因於本次設定。
- 舊路徑 API 的瀏覽器憑證傳遞仍須端到端核對；不能將所有 `/api/*` 一律鎖住，公開頁仍需讀取資料。
- 本機修補程式尚未部署。真實 token 通過本機函式驗證，不代表正式站已套用新版授權，也不是完整本機瀏覽器登入驗收。

## 本機登入方式

```sh
cloudflared access login --quiet https://utoa.studio/admin
```

完成瀏覽器驗證即可；憑證到期時重跑。此登入提供 CLI 使用的 Access 憑證，不會自動把正式站 cookie 送到 localhost。直接開 `localhost:3000/admin` 仍需安全的本機憑證傳遞流程；目前沒有新增登入旁路或將 token 放入網址。

## 後續更新：本機瀏覽器登入

已新增 `npm run dev:admin`，透過 loopback-only 代理安全傳遞真實 Access 身份；Arc 實際顯示管理控制台成功。操作與安全限制見 [local-admin-login.md](local-admin-login.md)。寫入路徑清單見 [access-write-route-inventory.json](access-write-route-inventory.json)，政策讀取權限仍待帳戶後台操作完成。

## 後續更新：CLI Access 查詢已恢復

使用者儲存 token 權限後，原 token 的應用程式與原則查詢均回 HTTP 200；實際政策與 UI 核對一致。詳見 [access-policy-coverage.md](access-policy-coverage.md)。前述權限不足為歷史狀態，現已解決；未修改 Access 路徑或部署網站。
