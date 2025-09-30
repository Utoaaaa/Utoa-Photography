# Utoa's Photography

個人攝影作品展示網站。此專案用來整理與展示按年份與作品集分類的相片，提供簡易的後台管理介面上傳與管理影像，並以現代化前端與後端 API 架構提供快速、可擴充的使用體驗。

## 主要特色

# UTOA Photography

## Feature Quickstart

本專案包含一個「後台發布＋首頁/作品集視覺更新」功能模組。快速上手與流程請見：

- `specs/002-title-publishing-why/quickstart.md`
- `specs/003-admin-years-collections/quickstart.md`

## Private Tool Separation

依專案憲法的「前台純靜態、後台私有工具」原則，發布與審稿流程的程式碼放置於私有區域：

- 私有工具與測試：`tools/publishing/`（CLI/Worker、契約測試設定）
- 公開站點（Next.js App Router）：`src/app/(site)`、`src/components/ui` 等

私有工具僅於開發者/CI 環境執行，不包含在公開站點的使用者下載資產內，避免洩漏密鑰與降低前端負載。

## No-JS Baseline

前台閱讀在停用 JavaScript 時仍可完整瀏覽：
- 作品集視圖之點點導航退化為 `<noscript>` 連結清單（可逐張開啟）。
- 影像以原生 `<img>` 呈現並提供替代文字（alt）。
## 技術棧

## 專案結構（重點）
- src/app — Next.js pages 與路由（site / admin）
- src/app/api — 提供上傳、年分、作品集等 REST API 路由
- src/components — UI 與共用元件
- src/lib — 共用函式、SEO、影像處理、資料庫查詢等
- prisma — 資料庫 schema、migrations 與種子資料
- tests — contract 與 integration 測試

## 在本機啟動
1. 下載相依套件
   ```
   npm install
   ```
2. 啟動開發伺服器
   ```
   npm run dev
   ```
3. 進行測試
   ```
   npm test
   ```

（如專案使用特殊部署環境或變數，請參考專案內相關設定檔或部署說明）

## 環境變數（測試穩定性）
為確保契約/整合測試穩定，請設定以下變數：

- `TEST_API_URL`：直傳端點基底（通常為網站根，例如 `http://localhost:3000`）
- `TEST_API_BASE`：一般 API 基底（例如 `http://localhost:3000/api`）
- `BYPASS_ACCESS_FOR_TESTS`：在本地/CI 測試時略過 Admin/寫入 API 的存取保護（`true`/`false`）

本機可於 `.env.local` 設定：

```bash
# .env.local
TEST_API_URL=http://localhost:3000
TEST_API_BASE=http://localhost:3000/api
BYPASS_ACCESS_FOR_TESTS=true
```

GitHub Actions（CI）範例（於 workflow 檔加入 env）：

```yaml
env:
   TEST_API_URL: http://localhost:3000
   TEST_API_BASE: http://localhost:3000/api
   BYPASS_ACCESS_FOR_TESTS: true
```

提示：若測試仍回報 401/403，請確認 `BYPASS_ACCESS_FOR_TESTS` 已生效；若直傳相關測試失敗，請檢查 `TEST_API_URL` 是否指向可用的站台根並且路由 `/api/images/direct-upload` 存在。

## API 快速參考
- /api/years — 取得年份列表
- /api/years/[year_id]/collections — 取得某年份下的作品集
- /api/collections/[collection_id]/assets — 取得或上傳作品集內的影像
- /api/images/direct-upload — 影像直接上傳端點
（詳細 API 規格請參考 src/app/api 目錄中的 route 檔案）

## 貢獻
歡迎提出 issue 或 pull request。請遵守既有程式碼風格、加入必要測試並在 PR 說明中清楚描述修改內容與原因。

## 授權
本專案採用 MIT 授權條款（MIT License）。

完整授權內容請參考專案根目錄的 `LICENSE` 檔案。若尚未建立 `LICENSE` 檔案，可使用以下內容並儲存為專案根目錄的 `LICENSE`：

MIT License

Copyright (c) 2025 Utoa

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
