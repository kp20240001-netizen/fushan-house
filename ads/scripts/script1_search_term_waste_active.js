var CONFIG = {
  SHEET_ID: '1BEWWI-Py5HGtCo6EUB5b4rQNv-uKKkQ4XStBt3i9Cno',
  SHEET_TAB: 'SearchTermWaste',
  EMAIL: '',
  DATE_RANGE: 'LAST_30_DAYS',
  MIN_CLICKS: 2,
  DRY_RUN: false,
  NEGATIVE_LIST_NAME: '福山里居_72組核心與自動否定字詞',
  JUNK_PATTERNS: ['租屋','出租','租房','雅房','套房出租','月租','分租','仲介','打工','徵才','工作','兼職','法拍','拍賣','金拍',
                  '台中','高雄','台南','新竹','嘉義','宜蘭','花蓮','屏東','彰化','免費','教學','下載','社會住宅','凶宅','國宅'],
  SEED_NEGATIVES: [
    '租屋','出租','租房','房租','月租','短租','日租','合租','分租','雅房','學生套房','獨立套房出租','社會住宅','社宅','包租代管','租金補貼','591租屋',
    '法拍','法拍屋','銀拍屋','金拍屋','凶宅','事故屋','海砂屋','輻射屋','地上權','國宅','工業住宅','農舍','鐵皮屋','套房出售','一房一廳','兩房',
    '低總價','300萬','500萬','600萬','800萬','1000萬以下','公寓','預售屋','新成屋大樓','青年安心成家',
    '中壢套房','楊梅透天','龍潭透天','平鎮透天','觀音透天','新屋區透天','大溪透天','台中透天','台南透天','高雄透天',
    '不動產經紀人考試','地政士考試','房仲薪水','房仲招募','房仲加盟','信義房屋徵才','永慶房屋徵才','實價登錄查詢教學',
    '打工','兼職','在家工作','日領','現領','抽獎','刮刮樂','娛樂城','博弈','貸款代辦','二胎房貸','民間借貸'
  ]
};
function main() {
  seedCoreNegatives();
  var q = "SELECT search_term_view.search_term, campaign.name, ad_group.name, metrics.clicks, metrics.cost_micros, metrics.conversions " +
          "FROM search_term_view WHERE segments.date DURING " + CONFIG.DATE_RANGE +
          " AND metrics.clicks > " + CONFIG.MIN_CLICKS + " AND metrics.conversions = 0 ORDER BY metrics.cost_micros DESC";
  var rows = AdsApp.search(q), out = [], toNeg = [];
  while (rows.hasNext()) {
    var r = rows.next(), term = r.searchTermView.searchTerm;
    var junk = CONFIG.JUNK_PATTERNS.filter(function(p){ return term.indexOf(p) > -1; });
    var cost = (r.metrics.costMicros || 0) / 1e6;
    out.push([new Date(), term, r.campaign.name, r.adGroup.name, r.metrics.clicks, cost.toFixed(0), junk.join('/'), junk.length ? '已自動否定' : '人工檢視']);
    if (junk.length) toNeg.push('[' + term + ']');
  }
  try { writeSheet(['時間','搜尋字詞','活動','群組','點擊','花費','命中規則','處理狀態'], out); } catch (e) { Logger.log('Sheet write skipped: ' + e); }
  if (!CONFIG.DRY_RUN && toNeg.length) addNegatives(toNeg);
  Logger.log('共檢視 ' + out.length + ' 筆，新增自動否定 ' + toNeg.length + ' 筆，DRY_RUN=' + CONFIG.DRY_RUN);
}
function seedCoreNegatives() {
  addNegatives(CONFIG.SEED_NEGATIVES);
  Logger.log('已同步 72 組核心否定字詞至清單：' + CONFIG.NEGATIVE_LIST_NAME);
}
function addNegatives(terms) {
  var it = AdsApp.negativeKeywordLists().withCondition("shared_set.name = '" + CONFIG.NEGATIVE_LIST_NAME + "'").get();
  var list = it.hasNext() ? it.next() : AdsApp.newNegativeKeywordListBuilder().withName(CONFIG.NEGATIVE_LIST_NAME).build().getResult();
  terms.forEach(function(t){ try { list.addNegativeKeyword(t); } catch (e) {} });
  var c = AdsApp.campaigns().withCondition("campaign.status = ENABLED").get();
  while (c.hasNext()) { try { c.next().addNegativeKeywordList(list); } catch (e) {} }
}
function writeSheet(header, data) {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var sh = ss.getSheetByName(CONFIG.SHEET_TAB) || ss.insertSheet(CONFIG.SHEET_TAB);
  if (sh.getLastRow() === 0) sh.appendRow(header);
  if (data.length) sh.getRange(sh.getLastRow() + 1, 1, data.length, header.length).setValues(data);
}
