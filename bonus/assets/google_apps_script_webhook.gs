/**
 * 福山里居｜屋主數據監控與介紹人買家名單中樞 — 零 AI 算力 Apps Script 雙向同步引擎
 * 綁定試算表 ID：1BEWWI-Py5HGtCo6EUB5b4rQNv-uKKkQ4XStBt3i9Cno
 * 部署步驟：擴充功能 > Apps Script > 貼上本程式碼 > 部署為網頁應用程式 (執行身分：我，存取權：所有人)
 */
function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Leads_名單總表') || ss.getSheets()[0];
  var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  sheet.appendRow([
    d.createdAt || new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
    d.type || 'introducer',
    d.id || ('FS-2026-' + Math.floor(1000 + Math.random() * 9000)),
    d.name || '',
    d.phone || '',
    d.contact || d.viewingTime || '',
    d.relation || d.refCode || d.plan || '',
    d.status || d.note || '待核對',
    d.source || 'web_direct'
  ]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true, id: d.id })).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s1 = (ss.getSheetByName('Leads_名單總表') || ss.getSheets()[0]).getDataRange().getValues();
  var s2 = (ss.getSheetByName('Metrics_戰情指標') || ss.getSheets()[1]).getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    updatedAt: new Date().toISOString(),
    leadsRows: s1,
    metricsRows: s2
  })).setMimeType(ContentService.MimeType.JSON);
}
