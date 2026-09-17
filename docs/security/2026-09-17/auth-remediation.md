# 寫入 API 與登入驗證修補

本次僅完成本機程式修補與驗證，未部署、未修改 Cloudflare 線上設定。審查時已有的 demo、資料庫及其他工作目錄變更均保留。

## 行為變更

- 全部 **38 個寫入 handler**（POST／PUT／DELETE，包含舊 API 別名、圖片上傳、重建變體、批次刪除、地點調整及 revalidate）在解析 body／params、存取資料前先執行 `adminAuthError`。
- 管理 GET、素材管理 GET、audit 與圖片變體診斷 GET 也統一要求管理員；共 **53 個受保護 handler**。
- 使用 `jose` 驗證 RS256 JWT 簽章、固定 issuer、固定 application AUD、exp／iat／nbf 與必要身分 claims。JWKS 只來自管理者設定的 Cloudflare team domain，不依 JWT 指定的 URL 取金鑰；金鑰快取含 timeout／refresh cooldown。
- 管理身分只能來自驗證後的 email claim，再比對 `ADMIN_EMAILS`，忽略未簽章的 email 標頭。白名單會去除前後空白並忽略大小寫。
- 不再因 `NODE_ENV=test/development` 或 `BYPASS_ACCESS_FOR_TESTS=true` 自動放行。業務單元測試改為明確 mock 已登入管理員；真正的安全測試不 mock 驗證結果。
- middleware 先檢查管理路徑，移除含點路徑與 development 的登入繞過。handler 的驗證仍獨立存在，不依賴 middleware 的路由比對。
- 寫入請求若有 Origin，必須與請求 URL 的 origin 一致；`Sec-Fetch-Site: cross-site` 也會拒絕。CLI 不需偽造 Origin，但仍需有效管理員 JWT。
- 拒絕回應不包含 token 或底層驗證錯誤，使用 `Cache-Control: no-store`。

## 必要設定（尚未替使用者設定）

```dotenv
CF_ACCESS_TEAM_DOMAIN=https://YOUR-TEAM.cloudflareaccess.com
CF_ACCESS_AUD=YOUR-APPLICATION-AUDIENCE-TAG
ADMIN_EMAILS=admin@example.com,another-admin@example.com
```

`CF_ACCESS_TEAM_DOMAIN` 必須為 HTTPS team origin；`CF_ACCESS_AUD` 是此站 Access application 的 AUD，不是帳戶 ID。這些值放在伺服器／Worker runtime vars，不使用 NEXT_PUBLIC。

已向使用者詢問 team domain 與 AUD，尚未取得。缺少設定時，帶 JWT 的請求會拒絕（503），不會降級為信任 email 或假 token。未帶 token 為 401。上線之前必須補齊並在隔離 staging 驗證真實 Access 流程；此文件不代表已授權部署。

| 情況 | 回應 |
| --- | --- |
| 匿名、假 token、錯誤簽章、錯誤 issuer/AUD、過期、缺少必要 claims | 401 |
| 簽章有效但不在管理員白名單 | 403 |
| 管理員發出不允許的跨站寫入 | 403 |
| 缺少或不合法的驗證環境設定 | 503 |

## CLI 與相容性

接受的憑證來源依序為 `cf-access-jwt-assertion`、`cf-access-token`、`Authorization: Bearer <JWT>`。較高優先來源無效時，不會退回其他身分。所有來源都必須驗證同一套簽章與 claims。

現有 CLI 的 `cloudflared access token -app=...` 及 `cf-access-token` 可保留。無 email claim 的機器 service token 不會自動取得管理員權限。Cloudflare policy 與本機白名單都必須允許該使用者。

`/api/revalidate` 現在也要求管理員 JWT，舊 `REVALIDATE_SECRET` 不再作為授權方式。repo 內未發現依賴舊 secret 的呼叫端；若有站外腳本，須在上線前改送 Access 使用者 JWT。這同時消除 secret 未設定時接受 `Bearer undefined` 的問題。

開發環境不再免登入。如需本機測試，可用適用於該 Access application 的管理員 JWT；單元測試使用隔離的簽章金鑰。不能把假 token 恢復成正式程式的備援驗證。

## 驗證證據

- `npm run test:security`：**311 passed**。每個受保護 handler 都測匿名、假 Bearer、偽造 email、錯誤簽章及真正簽章的非管理員，並斷言 body、params、DB／R2／cache 尚未被存取。
- JWT 額外測試：錯誤 issuer／AUD、過期、未生效、未來 iat、缺少 claims、alg none／HS256、空白名單、缺設定、JWKS 失敗、金鑰快取、三種 token 來源、不同 NODE_ENV、不允許的 Origin、含點管理路徑。
- 正向案例：簽章管理員建立年份、CLI 透過 admin alias 上傳到假的 R2、管理員清快取；舊 revalidate secret 被拒絕。
- 既有 unit suite：**27 suites／109 tests passed**。初次並行執行有 worker teardown 警告；相關 7 suites 再以直接 `jest --runInBand` 執行，**38 tests passed**，無該警告。
- 修補後首次 `tsc --noEmit --incremental false` 通過。最後對目前共享工作區重跑時，其他正在進行的上傳頁變更在 `src/app/admin/uploads/page.tsx:1064` 引用未定義的 `ensureVariantStatus`（TS2552），全案型別檢查目前因此失敗；本次未修改該頁。登入共用模組與 middleware 的 ESLint、`git diff --check` 通過。
- 隔離複本的 Next.js production `compile` 模式通過（含 middleware 編譯）。複本未載入 `.env`，使用本機測試資料；因 node_modules 連結到原 checkout，只在複本把 tracing root 調整為共同根目錄。這不是完整 prerender、OpenNext Worker 打包或部署驗收。
- `.github/workflows/quality-gates.yml` 增加獨立 authentication regression job，使用 Node 22 執行安全測試，不需要部署或正式憑證。本次未 push／觸發 CI。

安全測試用當前 TypeScript 原始碼、真實 NextRequest／NextResponse、真實 jose RSA 驗證與隔離 JWKS transport；DB、R2、cache、一般 fetch 都被攔截。不載入 `.env`，不連正式資料，不等同 Cloudflare 線上 E2E。

## 本次未包含

本次修補對應原審查 F01–F03、F08、F09 的應用層登入／授權缺陷；加入寫入 Origin 檢查。草稿公開可見性、staging 資源隔離、Next.js 安全升級、上傳內容驗證、完整 npm audit、Cloudflare Access／WAF 遠端設定及部署驗收仍未完成。不能把本次測試通過解讀成整站所有資安問題都已修復。

參考：[Cloudflare JWT 驗證](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)、[jose](https://github.com/panva/jose)。
