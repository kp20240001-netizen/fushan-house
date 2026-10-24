/* ==========================================================================
   Fushan Residence · Owner-Direct Turnkey System (/turnkey/app.js)
   Interactive Calculator, 3-Mood BGM Audition Switcher & SYS Lead Generator
   ========================================================================== */
(function () {
  var MOOD_META = {
    trust: {
      id: 'trust',
      badge: '情緒 A · TRUST & ASSURANCE',
      name: '【信任感】沉穩大提琴＋溫暖木吉他',
      scene: '適合「誠實屋況揭露、實名認證防詐、土地產權透明」訴求，在買家進入網站前 5 秒建立安定信賴感。',
      src: 'audio/bgm_trust.mp3',
      quote: '「聽見沉穩木質弦音，買家不再帶著防備心看房，而是認真閱讀每一項屋況細節。」',
      chords: [130.81, 196.00, 246.94, 293.66]
    },
    pro: {
      id: 'pro',
      badge: '情緒 B · MODERN ARCHITECTURAL LUXURY',
      name: '【專業感】極簡現代鋼琴＋輕快 Lounge 節拍',
      scene: '適合「高總價市區透天、雙車庫豪宅、省百萬仲介費精算算盤」展示，襯托建築線條與精準資產價值。',
      src: 'audio/bgm_pro.mp3',
      quote: '「如同走進東京代官山私人建築展廳，讓 2,800 萬的房產展現應有的精品身價。」',
      chords: [146.83, 220.00, 261.63, 329.63]
    },
    warm: {
      id: 'warm',
      badge: '情緒 C · WARM FAMILY HOME',
      name: '【溫暖感】午後陽光鋼琴＋柔和室內弦樂',
      scene: '適合「媽媽留下的家、三代同堂傳承故事、午後餐廚相聚」氛圍，喚起買家對未來家庭日常的嚮往。',
      src: 'audio/bgm_warm.mp3',
      quote: '「當柔和的鋼琴聲響起，買家看見的不只是坪數，而是一家人圍坐餐桌的幸福畫面。」',
      chords: [174.61, 220.00, 261.63, 349.23]
    }
  };

  var currentMood = 'trust';
  var isPlaying = false;
  var audioEl = null;
  var waveTimer = null;

  function formatNumber(n) {
    return Math.round(n).toLocaleString('zh-TW');
  }

  function formatTime(sec) {
    var s = Math.max(0, Math.floor(sec || 0));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
  }

  /* 1. Interactive Commission Calculator */
  window.updateTurnkeyCalc = function (priceWan) {
    var wan = parseInt(priceWan, 10) || 2795;
    var slider = document.getElementById('tkPriceSlider');
    if (slider && parseInt(slider.value, 10) !== wan) {
      slider.value = wan;
    }

    var priceDisplay = document.getElementById('tkPriceVal');
    if (priceDisplay) priceDisplay.textContent = formatNumber(wan) + ' 萬';

    // 4% total agency commission (Seller 2% + Buyer 2%)
    var fee4PctWan = (wan * 0.04).toFixed(1);
    var fee4PctNtd = wan * 10000 * 0.04;
    var seller2PctWan = (wan * 0.02).toFixed(1);
    var netSaveNtd = fee4PctNtd - 16800;

    var elFee4 = document.getElementById('tkFee4Pct');
    if (elFee4) elFee4.textContent = '約 ' + fee4PctWan + ' 萬元（NT$ ' + formatNumber(fee4PctNtd) + '）';

    var elSeller2 = document.getElementById('tkSeller2Pct');
    if (elSeller2) elSeller2.textContent = '屋主賣方 2%（約 ' + seller2PctWan + ' 萬）＋買方 2%（約 ' + seller2PctWan + ' 萬）';

    var elNetSave = document.getElementById('tkNetSaveAmt');
    if (elNetSave) elNetSave.textContent = 'NT$ ' + formatNumber(netSaveNtd);

    var buttons = document.querySelectorAll('.tk-preset-btn');
    buttons.forEach(function (btn) {
      var p = parseInt(btn.getAttribute('data-price'), 10);
      btn.classList.toggle('active', p === wan);
    });
  };

  /* 2. Three-Mood Viewing BGM Audition Switcher */
  function startWaveAnimation() {
    stopWaveAnimation();
    var barsWrap = document.getElementById('bgmBars');
    if (barsWrap) barsWrap.classList.add('playing');
    var bars = document.querySelectorAll('.bgm-bar');
    waveTimer = setInterval(function () {
      bars.forEach(function (bar, idx) {
        var h = 20 + Math.floor(Math.abs(Math.sin(Date.now() / 180 + idx * 0.7)) * 78);
        bar.style.height = h + '%';
      });
      if (audioEl) {
        var timeEl = document.getElementById('bgmTimeDisplay');
        var dur = audioEl.duration && isFinite(audioEl.duration) ? audioEl.duration : 60;
        if (timeEl) {
          timeEl.textContent = formatTime(audioEl.currentTime) + ' / ' + formatTime(dur);
        }
      }
    }, 140);
  }

  function stopWaveAnimation() {
    if (waveTimer) {
      clearInterval(waveTimer);
      waveTimer = null;
    }
    var barsWrap = document.getElementById('bgmBars');
    if (barsWrap) barsWrap.classList.remove('playing');
    var bars = document.querySelectorAll('.bgm-bar');
    bars.forEach(function (bar, i) {
      bar.style.height = (22 + (i % 4) * 10) + '%';
    });
  }

  function updateBgmUI() {
    var meta = MOOD_META[currentMood] || MOOD_META.trust;
    var cards = document.querySelectorAll('.bgm-mood-card');
    cards.forEach(function (c) {
      var m = c.getAttribute('data-mood');
      var active = m === currentMood;
      c.classList.toggle('active', active);
      var ind = c.querySelector('.bgm-mood-play-indicator');
      if (ind) {
        ind.textContent = (active && isPlaying)
          ? '🔊 正在播放此情緒配樂...'
          : (active ? '▶ 點擊立即播放此情緒' : '🎧 點擊切換試聽');
      }
    });

    var nowTitle = document.getElementById('bgmNowTitle');
    if (nowTitle) nowTitle.textContent = '當前試聽：' + meta.name + '（Livia Music Studio 專屬空間配樂訂製）';

    var nowQuote = document.getElementById('bgmNowQuote');
    if (nowQuote) nowQuote.textContent = meta.quote;

    var mainBtn = document.getElementById('bgmMainPlayBtn');
    if (mainBtn) {
      mainBtn.innerHTML = isPlaying
        ? '⏸ 暫停試聽配樂'
        : '🔊 播放試聽當前情緒配樂';
    }
  }

  window.selectBgmMood = function (moodId, autoPlay) {
    if (!MOOD_META[moodId]) return;
    var changed = currentMood !== moodId;
    currentMood = moodId;
    if (!audioEl) {
      audioEl = document.getElementById('bgmAudioElement');
    }
    if (audioEl && (changed || !audioEl.getAttribute('src'))) {
      audioEl.src = MOOD_META[moodId].src;
      audioEl.load();
    }
    if (autoPlay) {
      if (audioEl) {
        audioEl.play().then(function () {
          isPlaying = true;
          startWaveAnimation();
          updateBgmUI();
        }).catch(function () {
          isPlaying = false;
          updateBgmUI();
        });
      }
    } else {
      updateBgmUI();
    }
  };

  window.toggleBgmPlay = function () {
    if (!audioEl) {
      audioEl = document.getElementById('bgmAudioElement');
    }
    if (!audioEl) return;
    if (isPlaying) {
      audioEl.pause();
      isPlaying = false;
      stopWaveAnimation();
      updateBgmUI();
    } else {
      if (!audioEl.getAttribute('src')) {
        audioEl.src = MOOD_META[currentMood].src;
      }
      audioEl.play().then(function () {
        isPlaying = true;
        startWaveAnimation();
        updateBgmUI();
      }).catch(function () {
        isPlaying = false;
        updateBgmUI();
      });
    }
  };

  /* 3. Plan Selection & Quick LINE Consultation */
  window.chooseTurnkeyPlan = function (planValue) {
    var sel = document.getElementById('tkPlanSelect');
    if (sel) sel.value = planValue;
    var formSection = document.getElementById('inquiry-form-section');
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var nameInput = document.getElementById('tkName');
      if (nameInput) setTimeout(function () { nameInput.focus(); }, 350);
    }
  };

  window.openLineDirect = function (contextLabel) {
    var priceWan = (document.getElementById('tkPriceSlider') || {}).value || '2795';
    var msg = [
      'Jay 您好，我在「屋主自售系統代建專頁 (/turnkey/)」看到同款系統方案，想進一步了解：',
      '諮詢項目：' + (contextLabel || '16,800 旗艦全配包（含 Livia Music Studio 三種情緒賞屋配樂）'),
      '我的房屋概況：預計自售總價約 ' + priceWan + ' 萬'
    ].join('\n');
    window.open('https://line.me/R/oaMessage/@rainbow0725/?' + encodeURIComponent(msg), '_blank', 'noopener');
    setTimeout(function () {
      window.open('https://line.me/ti/p/~rainbow0725', '_blank', 'noopener');
    }, 150);
  };

  document.addEventListener('DOMContentLoaded', function () {
    updateTurnkeyCalc(2795);
    updateBgmUI();

    var form = document.getElementById('tkLeadForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!form.reportValidity()) return;

        var fd = new FormData(form);
        var sysId = 'SYS-2026-' + Math.floor(1000 + Math.random() * 9000);
        var name = (fd.get('tkName') || '').toString().trim();
        var contact = (fd.get('tkContact') || '').toString().trim();
        var propertyInfo = (fd.get('tkProperty') || '').toString().trim();
        var plan = (fd.get('tkPlan') || '').toString().trim();
        var moodPref = (fd.get('tkMood') || '信任感＋專業感＋溫暖感全套').toString().trim();

        var record = {
          id: sysId,
          type: 'B2B_系統代建洽詢',
          name: name,
          phone: contact,
          contact: '物件：' + propertyInfo,
          relation: '方案：' + plan + '｜配樂偏好：' + moodPref,
          propertyInfo: propertyInfo,
          plan: plan,
          status: '待聯繫報價（/turnkey/ 專頁）',
          createdAt: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
        };

        try {
          var leads = JSON.parse(localStorage.getItem('fushan_bonus_leads') || '[]');
          leads.unshift(record);
          localStorage.setItem('fushan_bonus_leads', JSON.stringify(leads));
          var webhook = localStorage.getItem('fushan_sheets_webhook');
          if (webhook) {
            fetch(webhook, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(record)
            }).catch(function () {});
          }
        } catch (err) {}

        var codeEl = document.getElementById('tkGeneratedCode');
        if (codeEl) codeEl.textContent = sysId;

        var msg = [
          'Jay 您好，我在「屋主自售系統代建專頁 (/turnkey/)」完成線上登記：',
          '專屬洽詢編號：' + sysId,
          '稱呼：' + name,
          '聯絡電話／LINE：' + contact,
          '預計自售物件地區與總價：' + propertyInfo,
          '選擇方案：' + plan,
          '賞屋配樂偏好：' + moodPref
        ].join('\n');

        var lineBtn = document.getElementById('tkResultLineBtn');
        if (lineBtn) {
          lineBtn.href = 'https://line.me/ti/p/~rainbow0725';
          lineBtn.onclick = function () {
            window.open('https://line.me/R/oaMessage/@rainbow0725/?' + encodeURIComponent(msg), '_blank', 'noopener');
            window.open('https://line.me/ti/p/~rainbow0725', '_blank', 'noopener');
            return false;
          };
        }

        var waBtn = document.getElementById('tkResultWaBtn');
        if (waBtn) {
          waBtn.href = 'https://wa.me/886975066275?text=' + encodeURIComponent(msg);
        }

        var resBox = document.getElementById('tkResultBox');
        if (resBox) resBox.classList.add('show');
      });
    }
  });
})();
