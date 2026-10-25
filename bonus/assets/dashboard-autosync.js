/**
 * 福山里居｜屋主數據監控後台 — 零 AI 算力 60 秒自動輪詢與 Google 試算表雙向同步引擎
 * 檔案：/bonus/assets/dashboard-autosync.js
 * 功能：
 *  1. 頁面解鎖時立即拉取 ./assets/live-metrics.json 並與本地 localStorage (fushan_bonus_leads / fushan_bonus_stats) 以專屬代碼 (FS/BK/SYS) 去重合併
 *  2. 若已設定 Google Sheets Apps Script Web App URL，同步無感拉取雲端試算表最新名單並支援一鍵推送本機名單上雲端
 *  3. 每 60 秒自動輪詢（含秒數倒數顯示、切回分頁 visibilitychange 立即刷新、storage 跨分頁即時同步）
 *  4. 無閃爍更新 KPI 01~08（含 Google Ads 928-353-5590 花費進度、A/B 測試曝光點擊、漏斗與名單表格）
 */
(function () {
  var POLL_INTERVAL_SEC = 60;
  var remainingSec = POLL_INTERVAL_SEC;
  var pollTimer = null;
  var isSyncing = false;
  var DEFAULT_SHEET_ID = '1BEWWI-Py5HGtCo6EUB5b4rQNv-uKKkQ4XStBt3i9Cno';
  var DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1BEWWI-Py5HGtCo6EUB5b4rQNv-uKKkQ4XStBt3i9Cno/edit?usp=drivesdk';

  function formatTaipeiTime(dateInput) {
    try {
      var d = dateInput ? new Date(dateInput) : new Date();
      if (isNaN(d.getTime())) d = new Date();
      var parts = new Intl.DateTimeFormat('zh-TW', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).formatToParts(d);
      var map = {};
      parts.forEach(function (p) { map[p.type] = p.value; });
      return map.year + '/' + map.month + '/' + map.day + ' ' + map.hour + ':' + map.minute + ':' + map.second + ' (UTC+8)';
    } catch (e) {
      return new Date().toLocaleString('zh-TW') + ' (UTC+8)';
    }
  }

  function mergeLeadsByCode(cloudLeads, sheetLeads, localLeads) {
    var map = {};
    var order = [];

    function ingest(list, defaultSource) {
      if (!Array.isArray(list)) return;
      list.forEach(function (item) {
        if (!item || typeof item !== 'object') return;
        var code = String(item.id || item.code || '').trim();
        if (!code) return;
        var norm = {
          id: code,
          code: code,
          type: item.type || (code.indexOf('FS-') === 0 ? 'introducer' : (code.indexOf('BK-') === 0 ? 'buyer' : 'B2B_系統代建洽詢')),
          name: item.name || '',
          phone: item.phone || '',
          contact: item.contact || '',
          viewingTime: item.viewingTime || '',
          relation: item.relation || '',
          refCode: item.refCode || '',
          propertyInfo: item.propertyInfo || '',
          plan: item.plan || '',
          status: item.status || '待核對',
          source: item.source || defaultSource || 'web',
          createdAt: item.createdAt || ''
        };
        if (!map[code]) {
          order.push(code);
          map[code] = norm;
        } else {
          Object.keys(norm).forEach(function (k) {
            if (norm[k] && (!map[code][k] || map[code][k] === '待核對')) {
              map[code][k] = norm[k];
            }
          });
        }
      });
    }

    // Local leads first so newest local actions appear at top, followed by sheet & cloud
    ingest(localLeads, '本機瀏覽器');
    ingest(sheetLeads, 'Google 試算表');
    ingest(cloudLeads, '雲端 live-metrics');

    return order.map(function (c) { return map[c]; });
  }

  function updateAdsAndKpiDOM(metrics) {
    if (!metrics) return;
    var gads = metrics.googleAds || {};
    var spend = typeof gads.spendNtd === 'number' ? gads.spendNtd : 77;
    var threshold = typeof gads.promoThresholdNtd === 'number' ? gads.promoThresholdNtd : 12000;
    var remain = Math.max(0, threshold - spend);
    var pct = ((spend / threshold) * 100).toFixed(2);
    var barWidth = Math.max(1.8, Math.min(100, parseFloat(pct)));

    var spendEl = document.getElementById('kpiAdsSpendVal');
    if (spendEl) {
      spendEl.innerHTML = 'NT$ ' + spend.toLocaleString() + ' <small style="font-size:0.45em;font-weight:400;">/ ' + threshold.toLocaleString() + ' 滿額贈門檻</small>';
    }
    var barEl = document.getElementById('kpiAdsProgressBar');
    if (barEl) {
      barEl.style.width = barWidth + '%';
    }
    var wrapEl = document.getElementById('kpiAdsProgressWrap');
    if (wrapEl) {
      wrapEl.title = '目前進度：$' + spend.toFixed(2) + ' / $' + threshold.toFixed(2) + '（' + pct + '%，還差 $' + remain.toLocaleString() + '）';
    }
    var bannerTextEl = document.getElementById('adsPromoBannerText');
    if (bannerTextEl) {
      bannerTextEl.innerHTML = '目前支出：<strong>NT$ ' + spend.toFixed(2) + '</strong> / 目標 NT$ ' + threshold.toLocaleString() + '.00（達成 ' + pct + '%，還差 NT$ ' + remain.toLocaleString() + '.00）';
    }

    // Sync A/B test impressions & clicks from live-metrics if local hasn't overridden winner
    if (Array.isArray(gads.abTestGroups) && gads.abTestGroups.length > 0) {
      try {
        var curAb = JSON.parse(localStorage.getItem('fushan_ab_test_v2') || 'null');
        if (!curAb) {
          localStorage.setItem('fushan_ab_test_v2', JSON.stringify(gads.abTestGroups));
        } else {
          curAb.forEach(function (row, idx) {
            var remoteRow = gads.abTestGroups[idx];
            if (remoteRow) {
              row.impressions = Math.max(row.impressions || 0, remoteRow.impressions || 0);
              row.clicks = Math.max(row.clicks || 0, remoteRow.clicks || 0);
              row.cost = Math.max(row.cost || 0, remoteRow.cost || 0);
            }
          });
          localStorage.setItem('fushan_ab_test_v2', JSON.stringify(curAb));
        }
        if (typeof window.renderABTest === 'function') {
          window.renderABTest();
        }
      } catch (e) {}
    }

    // Update Sheet URL buttons if provided
    if (metrics.googleSheets && metrics.googleSheets.spreadsheetUrl) {
      var sheetBtns = document.querySelectorAll('[data-sheet-link]');
      sheetBtns.forEach(function (btn) {
        btn.href = metrics.googleSheets.spreadsheetUrl;
      });
    }
  }

  async function fetchSheetWebAppLeads() {
    var webhook = (localStorage.getItem('fushan_sheets_webhook') || '').trim();
    if (!webhook || webhook.indexOf('https://script.google.com/') !== 0) return [];
    try {
      var res = await fetch(webhook + (webhook.indexOf('?') === -1 ? '?t=' : '&t=') + Date.now(), {
        method: 'GET',
        cache: 'no-store'
      });
      if (!res.ok) return [];
      var data = await res.json();
      var rows = data.leadsRows || data.leads || [];
      var parsed = [];
      for (var i = 1; i < rows.length; i++) {
        var r = rows[i];
        if (r && r[2]) {
          parsed.push({
            createdAt: String(r[0] || ''),
            type: String(r[1] || 'introducer'),
            id: String(r[2]),
            code: String(r[2]),
            name: String(r[3] || ''),
            phone: String(r[4] || ''),
            contact: String(r[5] || ''),
            viewingTime: String(r[1]) === 'buyer' ? String(r[5] || '') : '',
            relation: String(r[6] || ''),
            refCode: String(r[6] || '').replace('介紹碼：', ''),
            status: String(r[7] || '雲端試算表同步'),
            source: String(r[8] || 'Google Sheets')
          });
        }
      }
      return parsed;
    } catch (e) {
      return [];
    }
  }

  async function syncDashboardMetrics(isManual) {
    if (isSyncing) return;
    isSyncing = true;
    var statusDot = document.getElementById('autoSyncBadgeText');
    var syncBtn = document.getElementById('manualSyncBtn');
    if (syncBtn) {
      syncBtn.disabled = true;
      syncBtn.textContent = '⏳ 同步中...';
    }

    try {
      var res = await fetch('./assets/live-metrics.json?t=' + Date.now(), { cache: 'no-store' });
      var cloudData = res.ok ? await res.json() : null;
      var sheetLeads = await fetchSheetWebAppLeads();

      var localLeads = JSON.parse(localStorage.getItem('fushan_bonus_leads') || '[]');
      var localStats = JSON.parse(localStorage.getItem('fushan_bonus_stats') || '{"views":0,"sources":{},"viewings":0,"deals":0}');

      var cloudLeads = (cloudData && Array.isArray(cloudData.leads)) ? cloudData.leads : [];
      var mergedLeads = mergeLeadsByCode(cloudLeads, sheetLeads, localLeads);
      localStorage.setItem('fushan_bonus_leads', JSON.stringify(mergedLeads));

      if (cloudData && cloudData.traffic) {
        localStats.views = Math.max(Number(localStats.views || 0), Number(cloudData.traffic.pageViews || 0));
        localStats.viewings = Math.max(Number(localStats.viewings || 0), Number(cloudData.traffic.viewingsCount || 0));
        localStats.deals = Math.max(Number(localStats.deals || 0), Number(cloudData.traffic.dealsCount || 0));
        localStats.topSource = cloudData.traffic.topSource || localStats.topSource || 'Google Ads 搜尋 / 社群導流';
        localStorage.setItem('fushan_bonus_stats', JSON.stringify(localStats));
      }

      if (typeof window.renderDashboard === 'function') {
        window.renderDashboard();
      }
      if (cloudData) {
        updateAdsAndKpiDOM(cloudData);
      }

      var lastSyncEl = document.getElementById('lastSyncTimeText');
      if (lastSyncEl) {
        var displayTime = formatTaipeiTime(new Date());
        var cloudTime = (cloudData && cloudData.updatedAtDisplay) ? cloudData.updatedAtDisplay : displayTime;
        lastSyncEl.textContent = '最後同步時間：' + displayTime + '（雲端快照：' + cloudTime + '）';
      }

      remainingSec = POLL_INTERVAL_SEC;
      updateCountdownLabel();
    } catch (err) {
      if (statusDot) {
        statusDot.textContent = '🟡 離線快取顯示中（將於下次倒數自動重試）';
      }
    } finally {
      isSyncing = false;
      if (syncBtn) {
        syncBtn.disabled = false;
        syncBtn.textContent = '⚡ 立即同步';
      }
    }
  }

  function updateCountdownLabel() {
    var badgeEl = document.getElementById('autoSyncBadgeText');
    if (badgeEl) {
      badgeEl.textContent = '🟢 零算力自動同步開啟（每 60 秒刷新｜下次同步：' + String(remainingSec).padStart(2, '0') + 's）';
    }
  }

  function startAutoSyncLoop() {
    if (pollTimer) clearInterval(pollTimer);
    remainingSec = POLL_INTERVAL_SEC;
    updateCountdownLabel();
    pollTimer = setInterval(function () {
      if (document.hidden) return;
      remainingSec -= 1;
      if (remainingSec <= 0) {
        remainingSec = POLL_INTERVAL_SEC;
        syncDashboardMetrics(false);
      } else {
        updateCountdownLabel();
      }
    }, 1000);
  }

  window.triggerManualSync = function () {
    remainingSec = POLL_INTERVAL_SEC;
    syncDashboardMetrics(true);
  };

  window.pushLocalLeadsToSheetWebhook = function () {
    var webhook = (localStorage.getItem('fushan_sheets_webhook') || '').trim();
    if (!webhook) {
      alert('請先在輸入框貼上您的 Google Apps Script 網頁應用程式網址（Web App URL），或點擊「開啟雲端試算表」查看免算力腳本範本！');
      return;
    }
    var leads = JSON.parse(localStorage.getItem('fushan_bonus_leads') || '[]');
    if (leads.length === 0) {
      alert('目前尚無名單可推送。');
      return;
    }
    leads.forEach(function (record) {
      fetch(webhook, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      }).catch(function () {});
    });
    alert('已將本機 ' + leads.length + ' 筆名單發送至 Google 試算表 Webhook！');
  };

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      syncDashboardMetrics(false);
    }
  });

  window.addEventListener('storage', function (e) {
    if (e.key === 'fushan_bonus_leads' || e.key === 'fushan_bonus_stats' || e.key === 'fushan_bonus_config') {
      if (typeof window.renderDashboard === 'function') window.renderDashboard();
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    var sheetBtns = document.querySelectorAll('[data-sheet-link]');
    sheetBtns.forEach(function (btn) {
      if (!btn.getAttribute('href') || btn.getAttribute('href') === '#') {
        btn.href = DEFAULT_SHEET_URL;
      }
    });
    syncDashboardMetrics(false);
    startAutoSyncLoop();
  });

  window.FushanAutoSync = {
    syncNow: syncDashboardMetrics,
    spreadsheetId: DEFAULT_SHEET_ID,
    spreadsheetUrl: DEFAULT_SHEET_URL
  };
})();
