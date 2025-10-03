#!/usr/bin/env node

/**
 * 部署前檢查腳本
 * 確保所有必要的環境變數和配置都已正確設置
 */

const requiredEnvVars = {
  development: [
    'DATABASE_URL',
    'NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH',
  ],
  production: [
    'DATABASE_URL',
    'NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH',
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
