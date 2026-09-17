# 本機後台安全登入

在專案根目錄執行：

```sh
npm run dev:admin
```

1. 若 Cloudflare 登入已到期，完成自動開啟的 Access 登入頁。
2. 工具驗證官方 JWT 簽章、issuer、AUD、有效期及 ADMIN_EMAILS。
3. 工具啟動只綁定 127.0.0.1 的 Next.js 與登入代理，自動開啟一次性登入頁後進入後台。
4. 同一瀏覽器可使用 `http://127.0.0.1:3020/admin`。結束請在終端機按 Ctrl+C；到期會自動停止，重新執行即可再次登入。

前提：Node 22、cloudflared、專案 npm 依賴已安裝，`.env.local` 已配置 CF_ACCESS_TEAM_DOMAIN、CF_ACCESS_AUD、ADMIN_EMAILS。若 3020 被占用，可設定 `UTOA_LOCAL_ADMIN_PORT=3021 npm run dev:admin`。

## 安全設計

- 不新增驗證旁路，也不修改正式站身份驗證；上游 handler 仍會驗證真實 Access JWT。
- JWT 只在 cloudflared 儲存與 CLI 記憶體中，代理僅傳給固定的 127.0.0.1 上游，不送到瀏覽器 JavaScript、URL 或遠端網站。
- 一次性隨機登入碼使用 URL fragment，隨即從歷史記錄移除，再以同源 POST 換取 HttpOnly、SameSite=Strict、限時 cookie。
- 嚴格 Host／Origin／Sec-Fetch-Site 檢查，防止跨站請求、DNS rebinding；不接受任意代理目的地。
- 覆寫外來身份標頭；移除 forwarded 標頭與本機 session cookie 後才傳入上游。
- 登出 POST `/__local/logout` 可撤銷 session；停止程序會立即撤銷，憑證到期時也會停止。
- 不開放 WebSocket upgrade，因此 Next.js 熱更新不可用，改完程式請手動重新整理。

## 驗證

313 項安全測試通過，包括本機代理的一次性登入、無 session 拒絕、Host 偽造、跨站 Origin／Fetch Metadata、身份標頭覆寫、登出撤銷與到期拒絕。實際使用 cloudflared 已登入的管理員憑證啟動，登入後 Next.js `/admin` 回 200。

這是本機登入驗證，不代表正式站已部署。工具讀取既有本機環境，因此實際上傳等操作仍受現有資料來源設定影響；本次驗證未執行上傳或其他業務資料寫入。
