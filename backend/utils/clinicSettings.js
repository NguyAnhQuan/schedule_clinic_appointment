/**
 * FILE_GUIDE: clinicSettings.js — Đọc cài đặt phòng khám (cache trong memory)
 */
const { pool } = require('../config/db');

let cached = null;
let cacheTime = 0;
const CACHE_MS = 30_000;

function invalidateClinicSettingsCache() {
  cached = null;
  cacheTime = 0;
}

async function getClinicSettingsRow() {
  if (cached && Date.now() - cacheTime < CACHE_MS) {
    return cached;
  }
  const [rows] = await pool.query(
    'SELECT role_permissions_json, security_json FROM clinic_settings ORDER BY id ASC LIMIT 1'
  );
  cached = rows[0] || { role_permissions_json: null, security_json: null };
  cacheTime = Date.now();
  return cached;
}

async function getStaffPermissions() {
  const row = await getClinicSettingsRow();
  try {
    const parsed = row.role_permissions_json ? JSON.parse(row.role_permissions_json) : {};
    return parsed.staff || {};
  } catch {
    return {};
  }
}

async function getSecuritySettings() {
  const row = await getClinicSettingsRow();
  try {
    return row.security_json ? JSON.parse(row.security_json) : {};
  } catch {
    return {};
  }
}

module.exports = {
  getClinicSettingsRow,
  getStaffPermissions,
  getSecuritySettings,
  invalidateClinicSettingsCache,
};
