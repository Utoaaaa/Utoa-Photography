#!/usr/bin/env bash
set -Eeo pipefail
IFS=$'\n\t'

# R2 bucket and target prefix
BUCKET="utoa-photography-assets"
PREFIX="_next/static"
CF_ENV="staging"  # use env from wrangler.toml

# Ensure Next static assets exist
if [ ! -d ".next/static" ]; then
  echo "找不到 .next/static，先執行建置產出 Next 靜態檔案..."
  DATABASE_URL="file:./dev.db" npm run -s build || {
    echo "建置失敗，請確認 DATABASE_URL 與專案狀態。"; exit 1;
  }
fi

# Simple content-type mapping
ct_for() {
  case "$1" in
    *.js)    echo "application/javascript" ;;
    *.css)   echo "text/css" ;;
    *.json)  echo "application/json" ;;
    *.map)   echo "application/json" ;;
    *.png)   echo "image/png" ;;
    *.jpg|*.jpeg) echo "image/jpeg" ;;
    *.svg)   echo "image/svg+xml" ;;
    *.webp)  echo "image/webp" ;;
    *.ico)   echo "image/x-icon" ;;
    *.woff2) echo "font/woff2" ;;
    *.woff)  echo "font/woff" ;;
    *.ttf)   echo "font/ttf" ;;
    *)       echo "application/octet-stream" ;;
  esac
}

echo "開始上傳 .next/static 到 R2（bucket: $BUCKET, prefix: $PREFIX, env: staging）"

# Upload each file with correct content-type
find .next/static -type f -print0 | while IFS= read -r -d '' file; do
  # strip leading '.next/static/' (with or without leading ./)
  rel="${file#.next/static/}"
  rel="${rel#./.next/static/}"
  key="$PREFIX/$rel"
  ct="$(ct_for "$file")"
  echo "PUT s3://$BUCKET/$key  ($ct)"
  # Retry up to 3 times on transient failures (e.g., 5xx)
  attempt=1
  max=3
  while :; do
    if npx -y wrangler@4.43.0 r2 object put "$BUCKET/$key" \
      --file "$file" \
      --env "$CF_ENV" \
      --remote \
      --content-type "$ct"; then
      break
    fi
    if [ $attempt -ge $max ]; then
      echo "❌ 上傳失敗：$key" >&2
      exit 1
    fi
    sleep $((attempt * 2))
    attempt=$((attempt + 1))
  done
done

echo "✅ 上傳完成。請強制重整 staging（Shift+Reload）驗證。"
