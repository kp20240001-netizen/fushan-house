var CONFIG = {
  SHEET_ID: '1BEWWI-Py5HGtCo6EUB5b4rQNv-uKKkQ4XStBt3i9Cno',
  SHEET_TAB: 'PlacementWaste',
  EMAIL: '',
  DATE_RANGE: 'LAST_30_DAYS',
  MIN_COST: 30,
  DRY_RUN: false,
  JUNK_PATTERNS: ['mobileapp::','game','games','puzzle','casino','slot','vpn','flashlight','cleaner','kids','遊戲','手遊']
};
function main() {
  var q = "SELECT detail_placement_view.display_name, detail_placement_view.group_placement_target_url, detail_placement_view.placement, " +
          "detail_placement_view.placement_type, campaign.name, campaign.id, metrics.clicks, metrics.cost_micros, metrics.conversions " +
          "FROM detail_placement_view WHERE segments.date DURING " + CONFIG.DATE_RANGE +
          " AND metrics.conversions = 0 AND metrics.cost_micros > " + (CONFIG.MIN_COST * 1e6) + " ORDER BY metrics.cost_micros DESC";
  var rows = AdsApp.search(q), out = [], excluded = 0;
  while (rows.hasNext()) {
    var r = rows.next(), v = r.detailPlacementView;
    var key = ((v.groupPlacementTargetUrl || '') + ' ' + (v.displayName || '') + ' ' + v.placementType).toLowerCase();
    var isApp = v.placementType === 'MOBILE_APPLICATION';
    var hit = isApp || CONFIG.JUNK_PATTERNS.some(function(p){ return key.indexOf(p.toLowerCase()) > -1; });
    var cost = (r.metrics.costMicros || 0) / 1e6;
    out.push([new Date(), v.displayName, v.groupPlacementTargetUrl, v.placementType, r.campaign.name, r.metrics.clicks, cost.toFixed(0), hit ? '建議排除' : '人工檢視']);
    if (hit && !CONFIG.DRY_RUN) { if (exclude(r.campaign.id, v, isApp)) excluded++; }
  }
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    var sh = ss.getSheetByName(CONFIG.SHEET_TAB) || ss.insertSheet(CONFIG.SHEET_TAB);
    if (sh.getLastRow() === 0) sh.appendRow(['時間','版位','網址/App','類型','活動','點擊','花費','建議']);
    if (out.length) sh.getRange(sh.getLastRow() + 1, 1, out.length, 8).setValues(out);
  } catch (e) { Logger.log('Sheet write skipped: ' + e); }
  if (CONFIG.EMAIL && out.length) MailApp.sendEmail(CONFIG.EMAIL, '[福山里居] 零轉換高花費版位 ' + out.length + ' 筆',
      out.map(function(x){ return x[1] + '｜' + x[3] + '｜NT$' + x[6] + '｜' + x[7]; }).join('\n'));
  Logger.log('共 ' + out.length + ' 筆，已排除 ' + excluded + '，DRY_RUN=' + CONFIG.DRY_RUN);
}
function exclude(campaignId, v, isApp) {
  var it = AdsApp.displayCampaigns().withIds([campaignId]).get();
  if (!it.hasNext()) it = AdsApp.videoCampaigns().withIds([campaignId]).get();
  if (!it.hasNext()) return false;
  var c = it.next();
  try {
    if (isApp) c.display().newMobileApplicationBuilder().withAppId(v.placement).exclude();
    else c.display().newPlacementBuilder().withUrl(v.groupPlacementTargetUrl).exclude();
    return true;
  } catch (e) { Logger.log('排除失敗 ' + v.displayName + '：' + e); return false; }
}
