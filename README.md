# Utoa's Photography

個人攝影作品展示網站。此專案用來整理與展示按年份與作品集分類的相片，提供簡易的後台管理介面上傳與管理影像，並以現代化前端與後端 API 架構提供快速、可擴充的使用體驗。

## 主要特色
- 按年份與作品集瀏覽照片
- 簡潔的作品集檢視與照片預覽
- 後台管理介面（上傳、編輯、刪除作品集與影像）
- 直接上傳影像的 API 路由
- 測試用例涵蓋 contract 與 integration 測試

## 技術棧
- Next.js + App Router（TypeScript）
- Prisma（資料庫模型與遷移）
- Jest（測試）
- 其他：PostCSS、ESLint、Prettier 等開發工具

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
