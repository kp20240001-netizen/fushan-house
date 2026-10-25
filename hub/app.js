/**
 * 全專案中控儀表板 (Master Command Center) — 零 Token 前端互動與外部 AI 算力分流引擎
 * Path: /workspace/fushan-street/hub/app.js
 */
(function () {
  var STORAGE_KEY = 'fushan_master_hub_toggles_v1';
  var POLL_SECONDS = 60;
  var remainingSec = POLL_SECONDS;
  var masterData = null;
  var currentFilter = 'all';
  var searchQuery = '';
  var currentExternalUrl = 'https://claude.ai/';

  function loadSavedToggles() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveToggleState(key, val) {
    try {
      var st = loadSavedToggles();
      st[key] = Boolean(val);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
    } catch (e) {}
  }

  function formatTaipeiNow() {
    try {
      return new Intl.DateTimeFormat('zh-TW', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(new Date()) + ' (UTC+8)';
    } catch (e) {
      return new Date().toLocaleString('zh-TW') + ' (UTC+8)';
    }
  }

  function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () {});
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  window.showCommandDrawer = function (title, codeText, externalAiUrl, externalAiLabel) {
    var drawer = document.getElementById('cmdDrawer');
    var titleEl = document.getElementById('cmdDrawerTitle');
    var codeEl = document.getElementById('cmdDrawerCode');
    var extBtn = document.getElementById('cmdExternalAiBtn');
    if (!drawer || !codeEl) return;

    copyTextToClipboard(codeText);
    if (titleEl) titleEl.textContent = title || '📋 已自動複製極簡省 Token 指令碼（可直接貼回對話框）';
    codeEl.textContent = codeText;

    if (extBtn) {
      if (externalAiUrl) {
        currentExternalUrl = externalAiUrl;
        extBtn.href = externalAiUrl;
        extBtn.textContent = '🚀 開啟 ' + (externalAiLabel || '外部付費 AI') + ' 貼上執行 ↗';
        extBtn.style.display = 'inline-flex';
      } else {
        extBtn.style.display = 'none';
      }
    }
    drawer.classList.add('open');
  };

  window.closeCommandDrawer = function () {
    var drawer = document.getElementById('cmdDrawer');
    if (drawer) drawer.classList.remove('open');
  };

  window.reCopyDrawerText = function () {
    var codeEl = document.getElementById('cmdDrawerCode');
    if (!codeEl) return;
    copyTextToClipboard(codeEl.textContent);
    var titleEl = document.getElementById('cmdDrawerTitle');
    if (titleEl) {
      var orig = titleEl.textContent;
      titleEl.textContent = '✅ 已再次複製到剪貼簿！';
      setTimeout(function () { titleEl.textContent = orig; }, 1600);
    }
  };

  function renderAiPool(pool) {
    var container = document.getElementById('aiPoolGrid');
    if (!container || !Array.isArray(pool)) return;
    container.innerHTML = pool.map(function (node) {
      return (
        '<div class="ai-node-card">' +
          '<div>' +
            '<div class="ai-node-top">' +
              '<span class="ai-node-name">' + escapeHtml(node.name) + '</span>' +
              '<span class="ai-node-badge">' + escapeHtml(node.badge) + '</span>' +
            '</div>' +
            '<div class="ai-node-desc" style="margin-top:0.35rem;">' + escapeHtml(node.bestFor) + '</div>' +
          '</div>' +
          '<div style="display:flex;gap:0.45rem;margin-top:0.35rem;">' +
            '<a class="link-chip primary" href="' + escapeAttr(node.url) + '" target="_blank" rel="noopener">開啟 ' + escapeHtml(node.name.split(' ')[0]) + ' ↗</a>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(s) {
    return escapeHtml(s);
  }

  function renderProjects() {
    var grid = document.getElementById('projectsGrid');
    if (!grid || !masterData || !Array.isArray(masterData.projects)) return;

    var toggles = loadSavedToggles();
    var q = (searchQuery || '').toLowerCase().trim();

    var filtered = masterData.projects.filter(function (p) {
      if (currentFilter !== 'all' && p.category !== currentFilter) return false;
      if (!q) return true;
      var hay = (p.title + ' ' + p.subtitle + ' ' + JSON.stringify(p.tasks) + ' ' + JSON.stringify(p.links)).toLowerCase();
      return hay.indexOf(q) !== -1;
    });

    grid.innerHTML = filtered.map(function (proj) {
      var projKey = 'proj_' + proj.id;
      var isProjOn = (projKey in toggles) ? toggles[projKey] : Boolean(proj.enabled);
      var statusText = isProjOn ? (proj.statusLabel || '進行中 ON') : '⏸️ 專案已暫停';
      var statusPausedCls = (!isProjOn || statusText.indexOf('暫停') !== -1) ? 'paused' : '';

      var kpiHtml = (proj.kpis || []).map(function (k) {
        return (
          '<div class="kpi-mini-box ' + (k.highlight ? 'hl' : '') + '">' +
            '<span class="kpi-mini-label">' + escapeHtml(k.label) + '</span>' +
            '<div class="kpi-mini-val">' + escapeHtml(k.value) + '</div>' +
          '</div>'
        );
      }).join('');

      var linksHtml = (proj.links || []).map(function (lnk) {
        return (
          '<a class="link-chip ' + (lnk.primary ? 'primary' : '') + '" href="' + escapeAttr(lnk.url) + '" target="_blank" rel="noopener">' +
            escapeHtml(lnk.label) + ' ↗' +
          '</a>'
        );
      }).join('');

      var tasksHtml = (proj.tasks || []).map(function (t) {
        var tKey = 'task_' + t.id;
        var isTaskOn = (tKey in toggles) ? toggles[tKey] : Boolean(t.enabled);
        var rowCls = isTaskOn ? '' : 'is-paused';
        var statePill = isTaskOn
          ? '<span style="color:#34d399;font-size:0.74rem;font-weight:700;">🟢 進行中</span>'
          : '<span style="color:#fcd34d;font-size:0.74rem;font-weight:700;">⏸️ 已暫停</span>';

        return (
          '<div class="task-row ' + rowCls + '" id="row-' + escapeAttr(t.id) + '">' +
            '<div class="task-info">' +
              '<div class="task-title-line">' +
                '<span class="task-code">' + escapeHtml(t.id) + '</span>' +
                statePill +
                '<span>' + escapeHtml(t.title) + '</span>' +
              '</div>' +
              '<div class="task-note">' + escapeHtml(t.note) + '</div>' +
            '</div>' +
            '<label class="toggle-wrap" title="切換此任務進行中 / 暫停">' +
              '<span class="toggle-label-text">' + (isTaskOn ? '進行中' : '已暫停') + '</span>' +
              '<input type="checkbox" class="toggle-input" ' + (isTaskOn ? 'checked' : '') +
                ' onchange="handleTaskToggle(\'' + escapeAttr(proj.id) + '\', \'' + escapeAttr(t.id) + '\', this.checked)">' +
              '<span class="toggle-switch"></span>' +
            '</label>' +
          '</div>'
        );
      }).join('');

      return (
        '<article class="project-card ' + (isProjOn ? '' : 'project-paused') + '" id="card-' + escapeAttr(proj.id) + '">' +
          '<div class="project-head">' +
            '<div class="project-title-wrap">' +
              '<div class="project-num-row">' +
                '<span class="project-num">PROJECT ' + escapeHtml(proj.number) + '</span>' +
                '<span class="project-status-badge ' + statusPausedCls + '">' + escapeHtml(statusText) + '</span>' +
              '</div>' +
              '<h3 class="project-title">' + escapeHtml(proj.icon + ' ' + proj.title) + '</h3>' +
              '<p class="project-sub">' + escapeHtml(proj.subtitle) + '</p>' +
            '</div>' +
            '<label class="toggle-wrap" title="切換整個專案進行 / 暫停">' +
              '<span class="toggle-label-text">' + (isProjOn ? 'ON' : 'OFF') + '</span>' +
              '<input type="checkbox" class="toggle-input" ' + (isProjOn ? 'checked' : '') +
                ' onchange="handleProjectToggle(\'' + escapeAttr(proj.id) + '\', this.checked)">' +
              '<span class="toggle-switch"></span>' +
            '</label>' +
          '</div>' +

          '<div class="kpi-mini-grid">' + kpiHtml + '</div>' +

          '<div>' +
            '<div class="section-cap"><span>🔗 關鍵連結速查（一鍵新分頁開啟）</span></div>' +
            '<div class="links-wrap">' + linksHtml + '</div>' +
          '</div>' +

          '<div>' +
            '<div class="section-cap"><span>⚙️ 子任務狀態與進行／暫停開關（切換自動複製省 Token 指令）</span></div>' +
            '<div class="tasks-list">' + tasksHtml + '</div>' +
          '</div>' +

          '<div class="card-footer-actions">' +
            '<div style="display:flex;gap:0.45rem;flex-wrap:wrap;">' +
              '<button type="button" class="btn btn-outline" onclick="triggerCardDataSync(\'' + escapeAttr(proj.id) + '\')">' +
                '🔄 更新目前數據' +
              '</button>' +
              '<button type="button" class="btn btn-outline" onclick="copyShortSyncCmd(\'' + escapeAttr(proj.id) + '\')">' +
                '📋 複製極簡同步指令' +
              '</button>' +
            '</div>' +
            '<button type="button" class="btn btn-ai-offload" onclick="triggerExternalAiOffload(\'' + escapeAttr(proj.id) + '\')">' +
              '🤖 派發給外部 AI（免耗 Grok Token）' +
            '</button>' +
          '</div>' +
        '</article>'
      );
    }).join('');
  }

  window.handleProjectToggle = function (projId, isChecked) {
    saveToggleState('proj_' + projId, isChecked);
    renderProjects();
    if (!masterData) return;
    var proj = masterData.projects.find(function (p) { return p.id === projId; });
    if (!proj) return;
    var cmd = isChecked ? proj.toggleCommandOn : proj.toggleCommandOff;
    window.showCommandDrawer(
      (isChecked ? '🟢 已切換為【進行中】' : '⏸️ 已切換為【暫停】') + ' — 極簡指令已複製，可直接貼回對話框：',
      cmd,
      null,
      null
    );
  };

  window.handleTaskToggle = function (projId, taskId, isChecked) {
    saveToggleState('task_' + taskId, isChecked);
    renderProjects();
    if (!masterData) return;
    var proj = masterData.projects.find(function (p) { return p.id === projId; });
    if (!proj) return;
    var task = (proj.tasks || []).find(function (t) { return t.id === taskId; });
    if (!task) return;
    var cmd = isChecked ? task.cmdOn : task.cmdOff;
    window.showCommandDrawer(
      (isChecked ? '🟢 子任務 ' + taskId + ' 已設為【進行中】' : '⏸️ 子任務 ' + taskId + ' 已設為【暫停】') + ' — 省 Token 指令已複製：',
      cmd,
      null,
      null
    );
  };

  window.copyShortSyncCmd = function (projId) {
    if (!masterData) return;
    var proj = masterData.projects.find(function (p) { return p.id === projId; });
    if (!proj) return;
    window.showCommandDrawer(
      '📋 已複製「' + proj.title + '」省 Token 極簡同步指令：',
      proj.syncCommand,
      null,
      null
    );
  };

  window.triggerCardDataSync = async function (projId) {
    await fetchMasterHubData(true);
    if (!masterData) return;
    var proj = masterData.projects.find(function (p) { return p.id === projId; });
    if (!proj) return;
    window.showCommandDrawer(
      '✅ 已從雲端重新整理最新數據！若需喚醒底層 Python 爬蟲強制更新，可貼上此極簡指令：',
      proj.syncCommand,
      null,
      null
    );
  };

  window.triggerExternalAiOffload = function (projId) {
    if (!masterData) return;
    var proj = masterData.projects.find(function (p) { return p.id === projId; });
    if (!proj || !proj.aiOffload) return;
    window.showCommandDrawer(
      '🤖 已複製【' + proj.aiOffload.targetAi + ' 專用完整 Prompt】（0 Grok Token 消耗）！點擊右下方按鈕直接前往貼上：',
      proj.aiOffload.prompt,
      proj.aiOffload.targetUrl,
      proj.aiOffload.targetAi
    );
  };

  window.setCategoryFilter = function (cat, btnEl) {
    currentFilter = cat || 'all';
    var btns = document.querySelectorAll('.filter-btn');
    btns.forEach(function (b) { b.classList.remove('active'); });
    if (btnEl) btnEl.classList.add('active');
    renderProjects();
  };

  window.onHubSearchInput = function (val) {
    searchQuery = val || '';
    renderProjects();
  };

  async function fetchMasterHubData(isManual) {
    var syncBtn = document.getElementById('globalSyncBtn');
    if (syncBtn && isManual) {
      syncBtn.textContent = '⏳ 同步中...';
      syncBtn.disabled = true;
    }
    try {
      var res = await fetch('./master-data.json?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        masterData = await res.json();
      }
      // Also pull latest bonus live-metrics.json to keep Project 1 & 2 counts real-time
      try {
        var fRes = await fetch('../bonus/assets/live-metrics.json?t=' + Date.now(), { cache: 'no-store' });
        if (fRes.ok && masterData && masterData.projects && masterData.projects[0]) {
          var fm = await fRes.json();
          if (fm && fm.googleAds) {
            masterData.projects[0].kpis[0].value = 'NT$ ' + fm.googleAds.spendNtd + ' / 12,000';
            masterData.projects[0].kpis[1].value = fm.googleAds.impressions + ' / ' + fm.googleAds.clicks + ' / ' + fm.googleAds.ctr;
          }
          if (fm && fm.traffic) {
            masterData.projects[0].kpis[2].value = fm.traffic.pageViews + ' 次';
          }
          if (fm && fm.counts) {
            masterData.projects[0].kpis[3].value = fm.counts.introducers + ' / ' + fm.counts.buyers + ' / ' + fm.counts.b2bLeads + ' 組';
          }
        }
      } catch (e) {}

      if (masterData) {
        renderAiPool(masterData.externalAiPool);
        renderProjects();
        var syncTimeEl = document.getElementById('hubLastSyncText');
        if (syncTimeEl) {
          syncTimeEl.textContent = '最後同步：' + formatTaipeiNow() + '｜雲端快照：' + (masterData.updatedAtDisplay || '');
        }
      }
      remainingSec = POLL_SECONDS;
    } catch (err) {
    } finally {
      if (syncBtn && isManual) {
        syncBtn.textContent = '🔄 立即刷新全站數據';
        syncBtn.disabled = false;
      }
    }
  }

  window.triggerGlobalSync = function () {
    fetchMasterHubData(true);
  };

  function startPollLoop() {
    setInterval(function () {
      if (document.hidden) return;
      remainingSec -= 1;
      var cdEl = document.getElementById('hubCountdownSec');
      if (cdEl) cdEl.textContent = String(Math.max(0, remainingSec)).padStart(2, '0') + 's';
      if (remainingSec <= 0) {
        remainingSec = POLL_SECONDS;
        fetchMasterHubData(false);
      }
    }, 1000);
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) fetchMasterHubData(false);
  });

  document.addEventListener('DOMContentLoaded', function () {
    fetchMasterHubData(false);
    startPollLoop();
  });
})();
