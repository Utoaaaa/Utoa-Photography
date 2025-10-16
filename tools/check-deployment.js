#!/usr/bin/env node

/**
 * 部署前檢查腳本
 * 確保所有必要的環境變數和配置都已正確設置
 */

// Lightweight .env loader (no external deps) so local checks see values
const fs = require('fs');
const path = require('path');

function loadDotenv(file) {
  try {
    const p = path.resolve(process.cwd(), file);
    if (!fs.existsSync(p)) return;
    const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch (_) {
    // ignore parse errors for simplicity
  }
}

// Load local envs before checking
loadDotenv('.env');
loadDotenv('.env.local');

const requiredEnvVars = {
  development: [
    'DATABASE_URL',
  ],
  production: [
    'DATABASE_URL',
    'NODE_ENV',
  ]
};

const warnings = [];
const errors = [];

function checkEnv() {
  const env = process.env.NODE_ENV || 'development';
  console.log(`\n🔍 檢查 ${env} 環境配置...\n`);

  const required = requiredEnvVars[env] || requiredEnvVars.development;

  required.forEach(key => {
    if (!process.env[key]) {
      errors.push(`❌ 缺少環境變數: ${key}`);
    } else {
      console.log(`✅ ${key}: 已設置`);
    }
  });

  // 檢查生產環境特定設置
  if (env === 'production') {
    if (process.env.BYPASS_ACCESS_FOR_TESTS === 'true') {
      errors.push('❌ 生產環境不應該設置 BYPASS_ACCESS_FOR_TESTS=true');
    }

    if (!process.env.API_TOKEN && !process.env.ADMIN_EMAILS) {
      warnings.push('⚠️  建議設置 API_TOKEN 或 ADMIN_EMAILS 以啟用身份驗證');
    }

    if (process.env.DATABASE_URL?.includes('dev.db')) {
      warnings.push('⚠️  DATABASE_URL 看起來像是開發環境的資料庫');
    }
  }

  // 顯示結果
  console.log('\n' + '='.repeat(50));
  
  if (errors.length > 0) {
    console.log('\n❌ 發現錯誤:\n');
    errors.forEach(err => console.log(err));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  警告:\n');
    warnings.forEach(warn => console.log(warn));
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('\n✨ 所有檢查通過！可以安全部署。\n');
    return true;
  }

  if (errors.length > 0) {
    console.log('\n❌ 請修復上述錯誤後再部署。\n');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  有警告項目，建議修復後再部署。\n');
  }

  return warnings.length === 0;
}

// 執行檢查
checkEnv();
