# 網站資安審查 — 2026-09-17

審查基準：`b0f1a5fd39d35a058326cf36ca25f52ab9b6424b`。開始時工作目錄乾淨。本次只新增報告與隔離驗證附件，未修改應用程式、部署或操作正式資料。

## 結論與範圍

有需要優先修正的應用程式授權漏洞。最嚴重的是公開路徑上的資料修改／刪除完全沒有驗證，以及多種只檢查標頭存在的假驗證。即使 Cloudflare Access 目前攔住部分流量，也不應把它視為這些 handler 已安全。

涵蓋：34 個 API route 檔案的路由／授權盤點、共用 auth 與 middleware、D1／Prisma 查詢、草稿可見性、圖片上傳／讀取、CSP、部署環境、CI、鎖檔版本、已追蹤檔案的憑證樣式掃描。

限制：這是原始碼審查與隔離函式驗證，不是正式環境滲透測試。無法透過網頁工具取得正式站，未讀取 Cloudflare 帳戶的 Access application、WAF、R2 存取政策或實際部署版本。npm audit 初次 DNS 失敗，升權重試被自動審核拒絕，因為會向 npm registry 傳送依賴 metadata；已向使用者另行詢問。未取得完整依賴漏洞清單。未執行既有 integration／contract 測試，以免連到已配置資料來源；既有測試亦有接受固定假 token 的契約。

P1 = 優先修補；P2 = 下一批修補。等級依程式可造成的影響排序，正式網路可達性仍需核對。

## F01 — P1：多個公開修改 API 完全缺少驗證

- `src/app/api/years/[year_id]/collections/route.ts:130` POST：直接解析資料並建立作品集。
- `src/app/api/collections/[collection_id]/route.ts:313` PUT、`:568` DELETE：直接更新／刪除作品集。
- `src/app/api/years/[year_id]/route.ts:304` DELETE：可刪除年份，`force=true` 路徑會先刪除關聯作品集。
- `src/lib/auth.ts:13` 只把 `/admin` 與 `/api/admin` 視為管理路由，middleware 不保護上述別名。

影響：若請求能抵達 handler，未登入者可建立、竄改、發布或刪除內容。公開列表又能提供目標 ID，UUID 不構成權限保護。

驗證：production 隔離執行中，匿名 DELETE 作品集／年份皆已觸及假的 D1；不存在的作品集回 404 而非 401。年份探針回 500 是不完整 mock 後續流程造成，證据僅為未驗證即進入資料庫，未宣稱刪除成功。

修正：所有修改 handler 在任何資料存取之前呼叫統一管理員驗證；公開舊路徑也必須驗證或停用。拒絕時不得存取 DB/R2 或清快取。

## F02 — P1：Cloudflare email 標頭被直接當成已驗證身分

`src/lib/auth.ts:24` 的 `extractUserFromHeaders` 不驗證 JWT，僅要求 `cf-access-authenticated-user-email`。自行補上的 `aud`、`iss`、`exp` 不具驗證效力。若偽造 email 命中白名單，連 `requireAdminAuth` 都會放行；許多管理 API 又只用 `isAuthenticated`，不檢查管理員白名單。

驗證：production、沒有 JWT、只有假的白名單 email，`requireAdminAuth` 回傳管理員身分。這確認應用層缺陷，未證明目前 Cloudflare 邊界會保留攻擊者標頭。

修正：驗證 Access JWT 簽章、允許的演算法、issuer、application audience、到期時間，以已驗證 claim 取得身分，統一套用 admin 授權；CLI service token 需有明確獨立的授權契約。缺少設定時拒絕。測試 bypass 必須在 production 無效。

官方依據：[Cloudflare application token](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/)、[JWT 驗證](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)。

## F03 — P1：任意 Bearer／Authorization 值可以通過驗證

- `src/app/api/images/direct-upload/route.ts:10`：除了固定文字 `invalid_token` 之外的 Bearer 值都會放行，且 middleware 明確略過此路徑。
- `src/app/api/years/route.ts:58` POST、`src/app/api/years/[year_id]/route.ts:126` PUT：相同的假 token 驗證，Bearer 分支也不要求 admin。
- `src/app/api/audit/route.ts:24`、`src/app/api/audit/cleanup-preview/route.ts:47`：只要有 Authorization 或 cf-access-token 就放行，沒有驗證值。

影響：未授權修改年份、取得上傳能力、讀取操作紀錄（actor、metadata 等）。直接上傳的實際外部效應取決於 Cloudflare Images 憑證是否配置。

驗證：任意 Bearer 對 direct-upload 回 200；測試沒有真憑證，200 是 mock upload URL，但已確定越過驗證。任意 Authorization 對 audit 在假的資料庫下回 200。沒有 token／固定 invalid_token 控制組均回 401。

修正：移除假 token 契約，統一 F02 驗證。調整 contract tests，任何隨機字串都必須回 401；不得把 mock token 的接受邏輯留在正式程式。

## F04 — P1：公開查詢與 Viewer 沒有完整排除草稿

- `src/app/api/years/route.ts:14`：無驗證，預設 status=all，允許 draft。
- `src/app/api/years/[year_id]/collections/route.ts:84`：同樣預設 all。
- `src/app/api/collections/[collection_id]/route.ts:223`：詳情／include_assets 不要求 published。
- `src/lib/viewer/collection.ts:115` 附近：slug 查詢只限制年份 published，沒有作品集 published；`:266` 的 ID 查詢兩層狀態都未限制。
- `src/app/api/view/collection/route.ts:33` 附近：UUID fallback 在 production 仍可用，成功回應設公共快取。

影響：未發布／下架內容、描述與圖片資訊可能被匿名查詢，並可能留在快取。不能把「首頁沒列出」視為私密。

修正：公開列表、詳情、Viewer 所有分支一律要求作品集及所屬年份已發布。草稿預覽獨立走管理驗證並 no-store。核對 R2 原圖是否也需要非公開／簽名存取；目前圖片代理本身不查發布狀態。

## F05 — P1：staging 與 production 未隔離

`wrangler.toml:29` 起的 production 與 `:58` 起的 staging 使用相同 Worker name、D1 database_id 及 R2 bucket_name。staging 明確開啟 workers.dev，CI 在 main push 執行 staging 部署。

影響：測試寫入可改正式資料；同名 Worker 有覆蓋正式程式或設定的風險。middleware 只在管理前綴下拒絕 workers.dev，不能保護 F01 的公開別名。實際 Worker、網域與 Access 狀態未讀取，不能斷言已覆蓋或已暴露。

修正：不同 Worker 名稱、D1、R2 與最小權限憑證；production 明確關閉不需要的 workers.dev／preview 入口。先盤點遠端 bindings 及備份再改設定，不直接替換正式資源。

## F06 — P1：Next.js 版本落後已發布的安全修補

package.json 及 package-lock.json 鎖定 Next.js 15.5.7；React／react-dom 19.1.0、sharp 0.33.5、OpenNext Cloudflare 1.11.0、Wrangler 4.43.0 亦已盤點，但未完成全依賴漏洞比對。

[2025-12-11 官方公告](https://nextjs.org/blog/security-update-2025-12-11)已列 App Router 的 RSC DoS 與 Server Function 原始碼外洩修補版本 15.5.9。本專案使用 App Router；原始碼外洩是否能觸發取決於 Server Function 等條件，不能僅靠版本聲稱已外洩。

[2026-08-25 官方公告](https://nextjs.org/blog/august-2026-security-release)另提供 15.5.24，包含 AVIF 圖片優化安全修補。此站 OpenNext／Cloudflare 圖片執行路徑未線上驗證，不能據此宣稱正式 Worker 可被 AVIF RCE；Windows 專屬問題也不直接適用於 Cloudflare。

修正：至少升到涵蓋上述修補的 15.5.24，實作時再確認最新相容安全版本，連同 OpenNext／React 相容性測試與鎖檔更新。不要只升到 15.5.9。不可直接執行 audit fix --force 當成驗收。

## F07 — P2：圖片上傳信任 MIME、沒有內容／大小驗證

`src/app/api/uploads/r2/route.ts:30` 起：只依副檔名推測 ext，沒有驗證圖檔 magic bytes、解碼結果、像素數與大小；把使用者的 `file.type` 寫進 R2 httpMetadata。`src/app/images/[id]/[variant]/route.ts` 又優先使用該 contentType 回傳。既有 image_id 的寫入也會覆寫物件，沒有版本／存在檢查。

驗證：隔離執行上傳 `.jpg` 名稱、`text/html` 類型、HTML bytes，handler 回 200，mock bucket 收到 `contentType: text/html`。沒有上傳到真實 R2。

影響：可能儲存並提供主動 HTML 內容；結合現有登入缺陷，提高儲存型 XSS、釣魚及圖片覆寫風險。實際 XSS 仍取決於 serving origin、CSP、R2 回應標頭，未在瀏覽器重現。

修正：嚴格格式／大小／像素限制、可靠解碼或受控轉碼、由伺服器設定 MIME；拒絕 HTML/SVG 等非支援內容；管理原圖與公開圖片的不同提供策略。既有圖片覆寫應有明確授權及版本控制。

## F08 — P2：REVALIDATE_SECRET 缺少時可用固定字串通過

`src/app/api/revalidate/route.ts:160` 直接比較 `Bearer ${process.env.REVALIDATE_SECRET}`，未先檢查 secret 是否存在／非空。

驗證：production 隔離環境不設 secret，送 `Bearer undefined`，mock cache revalidation 回 200。

影響：只有未配置 secret 時成立，可被任意清除快取、放大回源負載。正式 secret 是否已配置未查核。

修正：缺少設定即拒絕，限制可失效的 tags／paths 與數量，加入頻率控制；不得讓 undefined／空字串成為有效憑證。

## F09 — P2：middleware 用「路徑包含點」略過安全檢查

`middleware.ts:23` 起的 `pathname.includes('.')` 會略過任何含點路徑，包含 admin API。管理地點 routes 有只依賴 middleware 的 handler，例如 `src/app/api/admin/years/[yearId]/locations/route.ts:201` 起，沒有自己的 auth。

驗證：`/api/admin/years/2026.0/locations` 無憑證時 middleware 放行；普通 `/admin` 回 401。該地點 handler 接受年份 label 查詢，但本次沒有證明現有資料中有此含點 label，所以不宣稱這條 URL 已能修改某筆真實資料。

修正：先驗證管理路徑，只略過明確静態前綴；所有敏感 handler 獨立驗證。測试含點 label、編碼參數及別名，不只測 UI 正常連結。

## 其他需要補強／確認

- **CSRF：** 未見統一 Origin／CSRF token 檢查，JSON parser 也不驗證 Content-Type。使用 Access cookie 的寫入操作應驗證 Origin 或 CSRF token；跨站實際可利用性依 cookie SameSite 與 Access 流程而定，尚未重現。
- **資源消耗：** 未見應用層頻率限制；`GET /api/uploads/r2/variants/[id]` 最多對單一請求做 20 次 R2 get，未驗證且未設快取。應限制輸入與請求頻率；遠端 WAF 規則尚待查核。
- **CSP：** 已有 object-src none、frame-ancestors none、nosniff、HSTS；production script-src 仍有 unsafe-inline。完成上傳與授權修補後，再評估 nonce/hash 與 Next.js／OpenNext 的實際相容性。
- **Git 內資料庫：** `prisma/dev.db` 雖符合現有 ignore 規則，仍被 Git 追蹤，約 602 KB，包含 assets、collections、audit_logs 等表。本次只讀 schema，未檢查或列出內容；應先確認是否含真實資料，再決定取消追蹤與是否清理歷史，不假設它已外洩。
- **秘密掃描：** 當前受追蹤的小型文字檔未命中 private key／GitHub token／AWS access ID／部分硬編碼 secret 樣式；`.env*` 未被追蹤。此為 heuristic，未掃全部 Git 歷史、二進位、大檔或正式 bundle，不等於沒有洩漏。
- **SQL／XSS／SSRF：** 抽查主要 D1 路徑採 prepare/bind，未發現可確認的 SQL injection；src 搜尋未找到 dangerouslySetInnerHTML／unsafe raw SQL 等明顯 sink。主要遠端 fetch 指向配置的 Cloudflare／R2 origin，未確認任意 URL SSRF。這些是本次未發現，不是完整安全證明。
- **稽核：** 多個管理操作以 system 而非驗證後使用者記錄 actor；修 auth 時應一起接上可追溯身分，避免事故調查無法歸責。

## 隔離驗證與後續驗收

從 repo root 執行 `node docs/security/2026-09-17/isolated-probe.cjs`。附件使用目前本機 TypeScript 轉譯原始碼，以 production 環境、虛構管理員、假的 DB/R2/cache 執行，禁止 fetch。不載入 .env，不啟動正式伺服器。

`isolated-probe-results.json` 記錄 13 個觀察結果。這是缺陷重現工具，不是「全部測試通過」或完整 Next.js／Cloudflare 路由 E2E；修補後應更新成具斷言的安全回歸測試，期待不合法請求一律在資料存取之前拒絕。

建議順序：

1. 修 F01–F03；針對所有 route methods、舊別名、匿名／假 token／錯誤 audience／過期 JWT／非管理員建回歸矩陣。同步確認 Cloudflare Access 覆蓋全部敏感入口。
2. 修 F04–F06：草稿可見性、環境隔離、依賴安全升級；測試 published 與 draft 混合資料、UUID fallback、快取及 CLI 工作流程。
3. 修 F07–F09 與 CSRF／資源限制；在隔離 staging 驗證 HTML 偽裝、大圖、含點路徑與非法 secret。完成後才驗證正式部署與邊界回應。
