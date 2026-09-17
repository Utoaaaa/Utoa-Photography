# 套件安全升級與本機回歸

2026-09-17。僅修改本機工作區、安裝公開套件、執行隔離建置與 localhost 測試。**未部署、未 push、未變更 Cloudflare 線上設定、未連正式 DB/R2。** 原圖仍維持公開；未新增上傳內容、格式或尺寸驗證。

## 升級結果

保留 Next.js 15 與 React 19.1 系列，套用查核時 npm registry 可用的修補版本。

| 套件 | 原鎖定版本 | 升級後 |
| --- | --- | --- |
| Next.js | 15.5.7 | 15.5.25 |
| React／react-dom | 19.1.0 | 19.1.9 |
| @next/bundle-analyzer／eslint-config-next | 15.5.7 | 15.5.25 |
| @opennextjs/cloudflare | 1.11.0 | 1.20.6 |
| Wrangler | 4.43.0 | 4.132.0 |
| Sharp | 0.33.5 | 0.35.4 |
| Undici | 7.16.0 | 7.29.1 |
| @cloudflare/workers-types | 4.20251011.0 | 5.20260916.1 |

完整版本對照見 [package-versions.json](package-versions.json)。此外：

- 移除舊 `open-next` 直接依賴；`npm run opennext` 改用 `opennextjs-cloudflare build`，其配套 AWS builder 為 4.1.4。
- `open-next.config.ts` 改用官方 `defineCloudflareConfig`，維持既有 dummy cache／queue，不新增遠端綁定；刪除過期且重複的 `.mjs` 設定。
- 新版 Cloudflare CLI 直接使用 esbuild，補上明確 devDependency 0.28.2，避免依賴舊套件偶然提升到根層的安裝配置。
- 應用程式已直接 import zod，故將原本僅由間接依賴提供的 zod 改為明確 dependency 3.25.76，保留 v3 API。
- 新 Wrangler 要求 Node 22；package engines 與現有 CI workflow 的 Node 版本同步為 22。本次沒有觸發 workflow。
- 更新 package-lock.json；未使用 `--force`、`--legacy-peer-deps` 或 `audit fix --force`。

安全依據：[Next.js 2025-12-11 修補公告](https://nextjs.org/blog/security-update-2025-12-11)、[Next.js 2026-08 安全公告](https://nextjs.org/blog/august-2026-security-release)、[React RSC 安全公告](https://react.dev/blog/2025/12/11/denial-of-service-and-source-code-exposure-in-react-server-components)。版本與 peer constraints 另外以 npm 官方 registry 查核；新 adapter 要求 Next.js >=15.5.24 與 Wrangler ^4.125.0，選定版本均符合。

## 回歸時發現並修正的問題

### Middleware 未被 Next.js 發現

真正的 HTTP 測試發現匿名 `/admin` 回 200，雖然 API handler 的獨立驗證都已回 401。原因是本專案採 `src/app`，middleware 卻放在 repo root，原生 Next.js 建置清單中完全沒有它。

已將檔案移到 `src/middleware.ts` 並更新相對 import、TypeScript 設定與安全測試。重新建置後清單明確包含 Middleware，Next.js standalone 與 workerd 實際請求均拒絕匿名 `/admin` 及含點管理 API 路徑。

這是前次僅直接執行 middleware 函式的測試未覆蓋到的框架整合問題，本次已以實際 HTTP 回歸補足。位置規則參照 [Next.js 15 middleware 文件](https://nextjs.org/docs/15/app/api-reference/file-conventions/middleware)。

### Jest 在 React 升級後未退出

`--detectOpenHandles` 定位到 React scheduler 使用 Node MessageChannel 造成的 MESSAGEPORT。測試用的 jsdom setup 現在提供 Node `setImmediate`／`clearImmediate`，讓 scheduler 採用可正常退出的計時器；未修改網站 runtime，也未使用 `--forceExit` 掩蓋問題。

共享工作區另有管理年份 API 改成委派共用 handler 的變更，正向安全測試的隔離資料 mock 已配合新的呼叫路徑調整；JWT 驗證本身仍使用真實 jose RSA 簽章驗證。

## 驗證結果

| 檢查 | 結果 |
| --- | --- |
| 升級前 Jest 基準 | 34 suites／137 tests passed |
| 最後共享工作區 Jest，含 open handles 檢查 | **36 suites／146 tests passed**，正常退出 |
| JWT／寫入授權安全測試 | **311 passed** |
| TypeScript `tsc --noEmit --incremental false` | 通過 |
| 本次設定／middleware／smoke 工具 ESLint | 通過 |
| `git diff --check` | 通過 |
| Sharp 原生 WebP 編碼基本驗證 | 通過 |
| Next.js production 完整建置 | 通過，產生 26 個靜態頁面，包含 Middleware |
| OpenNext Cloudflare Worker 封裝 | 通過，輸出 `.open-next/worker.js` |
| Next.js standalone HTTP＋瀏覽器回歸 | **87 項通過** |
| Wrangler／workerd `--local` HTTP 回歸 | **79 項通過** |

測試數增加包含共享工作區同期新增的其他功能測試，並非全部由套件升級新增。

HTTP 檢查包含 38 個寫入 handler 的匿名及假 token 請求（76 項），以及 `/admin`、含點管理路徑與 audit 拒絕（3 項）。瀏覽器另外檢查 1440px／390px 的首頁、年份導向、地點及作品集頁，共 8 項，確認成功回應、照片載入且無 pageerror。瀏覽器阻擋非本機來源請求。

實際逐項結果：[standalone](package-runtime-smoke.json)、[workerd](package-worker-smoke.json)。

建置使用不含 `.env` 的隔離複本、獨立的依賴目錄及合成資料。Worker 測試設定只提供本機 ASSETS／測試資料旗標，沒有正式帳戶、DB 或 R2 綁定。測試伺服器完成後已停止。

Next.js standalone 與 OpenNext 使用不同輸出：OpenNext 會外移 middleware，因此不能拿其改寫後的中間 Next.js 產物當一般 Next server 驗收。本次分別驗證原生 standalone 及最終 Worker 輸出。

## 重跑方式與限制

```bash
npm run test:security
npx jest --runInBand --detectOpenHandles --silent
npx tsc --noEmit --incremental false
```

`npm run test:smoke:local` 要求另行啟動**使用合成資料的隔離本機站**，不可直接指向日常使用真實資料的開發站。`UTOA_SMOKE_BASE_URL` 預設為 `http://127.0.0.1:3047`，工具拒絕遠端 hostname；Chrome 路徑可用 `E2E_CHROME_EXECUTABLE_PATH` 指定。workerd 模式可設 `UTOA_SMOKE_HTTP_ONLY=1`。這不是正式站滲透測試。

**完整 npm audit 尚未執行**：將依賴 metadata 傳送 npm registry 的授權仍待使用者確認。本次依官方公告與已發布相容修補版升級，不宣稱所有間接依賴已零漏洞。所有安裝指令停用自動 audit。

實際 Cloudflare Access team domain／AUD 仍未配置，真實管理員登入與正式環境驗收仍待後續；未部署的限制持續有效。Wrangler 對既有 compatibility_date 顯示更新建議，本次保留原值，避免把 Worker runtime 行為變更混入套件升級。
