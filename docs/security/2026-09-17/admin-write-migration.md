# 管理寫入入口統一（本機，未部署）

## 變更

管理前端（包括新版 workspace）及 `tools/admin-cli` 原本就已呼叫 `/api/admin/*`，本次盤點沒有發現需修改的正式管理呼叫。問題在於舊 API 仍可寫入，且缺少兩個管理入口。

- 將原本 13 個路徑的處理邏輯原樣抽至 `src/lib/api-handlers/`，管理入口改呼叫共用實作，保留 D1／Prisma、稽核與快取行為。
- 新增 `POST /api/admin/revalidate` 及 `POST /api/admin/images/direct-upload`，均先驗證管理員，再進入處理邏輯。
- 13 個舊路徑的 18 個寫入方法一律回 405（包括持有效管理員 JWT），不讀 body、不解析參數、不寫資料，也不 redirect mutation。
- 舊路徑 `OPTIONS` 僅宣告仍有效的方法。原本存在的 GET 直接沿用共用實作，公開讀取維持公開，既有受保護的 assets GET 仍需身份驗證。
- 更新開發 probe 及歷史 contract 的寫入目的地；probe 不再使用假 JWT。
- 不修改 Cloudflare Access 政策、不鎖整個 `/api/*`、不限制公開原圖、不新增上傳檔案內容驗證。

舊 API 的 405 是刻意的不相容變更；外部未納入此 repo 的腳本若仍使用舊寫入路徑，需改用 `/api/admin/*`。對應清單位於 `tests/security/retired-write-routes.json`。新管理入口均在已核實的 Access `api/admin/*` 範圍內。

## 驗證

- 安全測試 347 項通過：新管理入口拒絕匿名、假 token、偽造簽章與非管理員；舊入口即使真實簽章管理員也回 405 且無副作用。
- 現有 Jest：41 suites／190 tests 通過；測試總數包括共享工作區其他功能測試。
- TypeScript、相關 ESLint、git diff --check 通過。
- 使用不含 `.env` 的隔離複本與合成 SQLite 資料，Next.js production build 通過。
- 真實 Next.js HTTP＋桌面／手機瀏覽器 91 項通過；另確認匿名 `GET /api/years` 為 200、`GET /api/assets` 為 401。
- OpenNext Worker 封裝通過，實際本機 workerd HTTP 回歸 83 項通過；沒有任何正式 DB／R2 綁定。

歷史 contract 套件含早期假身份 fixture，本次只遷移其路徑，未將它算入通過數。權限與正常管理寫入以真實 jose 簽章的隔離測試及既有業務單元測試驗證；未對正式環境執行寫入測試。

本機結果不代表正式站已生效。先前正式站 `/api/assets` 的 500 仍需另外診斷或於部署新版後重驗；不能由本機匿名 401 推論該線上故障已修復。
