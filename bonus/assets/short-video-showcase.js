(function () {
  var VIDEO_CATALOG = {
    bounty: {
      id: 'bounty',
      tabLabel: '🎬 影片 1｜0 管理費＋30 萬懸賞篇（虛擬主播導覽 20s）',
      shortBadge: '影片 01 · 0 管理費＋30 萬懸賞篇（虛擬主播導覽）',
      topbarMeta: '1080×1920 · 20.0s · -14.3 LUFS',
      headline: '20 秒直式影音快覽：<span>20 年省 180 萬管理費＋買方省 55 萬／介紹領 30 萬</span>',
      subcopy: '買大樓付一輩子管理費與公設虛坪，還是買桃園市區擁有<strong>約 39.1 坪完整土地＋1F 室內雙車庫＋3 間獨立衛浴套房</strong>的三層樓透天？由虛擬女主播帶您 20 秒算清楚家庭資產帳。',
      mp4Rel: 'videos/fushan_avatar_300k_bounty_20s.mp4',
      fallbackMp4Rel: 'videos/fushan_20yr_zero_fee_bounty_20s_web.mp4',
      posterRel: 'videos/cover_01_zero_mgmt_fee_1080x1920.jpg',
      chapters: [
        { sec: 0, label: '00s｜0元管理費20年省180萬' },
        { sec: 5, label: '05s｜39.1坪實地＋雙車庫' },
        { sec: 10, label: '10s｜屋主自售買方省55萬' },
        { sec: 15, label: '15s｜介紹成交領30萬獎金' }
      ]
    },
    suites: {
      id: 'suites',
      tabLabel: '🏡 影片 2｜三間獨立大套房開箱篇（虛擬主播導覽 20s）',
      shortBadge: '影片 02 · 三間獨立大套房開箱篇（虛擬主播導覽）',
      topbarMeta: '1080×1920 · 20.0s · -14.3 LUFS',
      headline: '20 秒直式空間開箱：<span>全棟 3 間獨立衛浴大套房＋兩代同住各自從容</span>',
      subcopy: '兩代同住最怕早上搶衛浴？這棟三層樓透天擁有<strong>二樓前後雙主臥套房＋三樓獨立套房與彈性大空間＋一樓雙車庫孝親餐廚</strong>，讓長輩與夫妻各自擁有獨立衛浴與私密生活。',
      mp4Rel: 'videos/fushan_avatar_3suites_tour_20s.mp4',
      fallbackMp4Rel: 'videos/fushan_avatar_3suites_tour_20s.mp4',
      posterRel: 'videos/cover_04_three_suites_living_1080x1920.jpg',
      chapters: [
        { sec: 0, label: '00s｜1F雙車庫・3間大套房' },
        { sec: 5, label: '05s｜2F前後雙主臥各自衛浴' },
        { sec: 10, label: '10s｜3F獨立套房＋大空間' },
        { sec: 15, label: '15s｜自售省55萬・LINE賞屋' }
      ]
    }
  };

  var currentVideoId = 'bounty';

  function getAssetPrefix() {
    var root = document.getElementById('short-video-showcase');
    return root ? (root.getAttribute('data-asset-prefix') || '') : '';
  }

  function trackShortEvent(action, label) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: action,
        event_category: 'fushan_20s_short_showcase',
        event_label: label || ''
      });
      if (typeof window.gtag === 'function') {
        window.gtag('event', action, {
          event_category: 'fushan_20s_short_showcase',
          event_label: label || ''
        });
      }
    } catch (e) {}
  }

  function syncPlayerUI(video) {
    if (!video) return;
    var overlayBtn = document.getElementById('fsSoundOverlayBtn');
    var topMuteBtn = document.getElementById('fsTopMuteBtn');
    var ctrlMuteBtn = document.getElementById('fsCtrlMuteToggle');
    var isMuted = video.muted;

    if (overlayBtn) {
      if (isMuted) {
        overlayBtn.classList.remove('is-unmuted');
        overlayBtn.innerHTML = '🔊 點擊開啟聲音從頭播放（20秒精華）';
      } else {
        overlayBtn.classList.add('is-unmuted');
        overlayBtn.innerHTML = '🔊 聲音播放中（點擊重播 20 秒）';
      }
    }
    if (topMuteBtn) {
      topMuteBtn.textContent = isMuted ? '🔇 靜音預覽中' : '🔊 有聲播放中';
    }
    if (ctrlMuteBtn) {
      ctrlMuteBtn.textContent = isMuted ? '🔇 靜音預覽切換（開啟聲音）' : '🔇 靜音預覽切換（切回靜音）';
      ctrlMuteBtn.classList.toggle('active', !isMuted);
    }
  }

  function renderChaptersAndCopy(videoMeta) {
    var chapterBox = document.getElementById('fsChapterPills');
    if (chapterBox && videoMeta && Array.isArray(videoMeta.chapters)) {
      chapterBox.innerHTML = videoMeta.chapters.map(function (ch) {
        return '<button type="button" class="fs-chapter-btn" onclick="fsSeekChapter(' + ch.sec + ', true)">' + ch.label + '</button>';
      }).join('');
    }
    var titleEl = document.getElementById('fsShowcaseTitle');
    if (titleEl && videoMeta.headline) {
      titleEl.innerHTML = videoMeta.headline;
    }
    var subEl = document.getElementById('fsShowcaseSub');
    if (subEl && videoMeta.subcopy) {
      subEl.innerHTML = videoMeta.subcopy;
    }
    var badgeEl = document.getElementById('fsActiveVideoBadge');
    if (badgeEl && videoMeta.shortBadge) {
      badgeEl.textContent = videoMeta.shortBadge;
    }
    var topbarMetaEl = document.getElementById('fsTopbarMeta');
    if (topbarMetaEl && videoMeta.topbarMeta) {
      topbarMetaEl.textContent = videoMeta.topbarMeta;
    }

    var tabBtns = document.querySelectorAll('[data-fs-video-tab]');
    tabBtns.forEach(function (btn) {
      var vid = btn.getAttribute('data-fs-video-tab');
      var active = vid === currentVideoId;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      var pill = btn.querySelector('.fs-tab-pill');
      if (pill) {
        pill.textContent = active ? '▶ 當前展演中' : '點擊切換播放';
      }
    });

    var coverCards = document.querySelectorAll('[data-fs-cover-card]');
    coverCards.forEach(function (card) {
      var vid = card.getAttribute('data-fs-cover-card');
      var active = vid === currentVideoId;
      card.classList.toggle('active', active);
      var statusEl = card.querySelector('[data-fs-cover-status]');
      if (statusEl) {
        statusEl.textContent = active ? '▶ 播放器當前載入此片' : '🎬 點擊切換播放此片';
      }
    });
  }

  window.fsSelectShortVideo = function (videoId, autoPlayWithSound) {
    var meta = VIDEO_CATALOG[videoId] || VIDEO_CATALOG.bounty;
    currentVideoId = meta.id;
    var prefix = getAssetPrefix();
    var video = document.getElementById('fushanShortVideo');
    renderChaptersAndCopy(meta);

    if (!video) return;
    var newPoster = prefix + meta.posterRel;
    var newSrc = prefix + meta.mp4Rel;
    var newFallback = prefix + (meta.fallbackMp4Rel || meta.mp4Rel);

    video.setAttribute('poster', newPoster);
    video.poster = newPoster;
    video.innerHTML =
      '<source src="' + newSrc + '" type="video/mp4">' +
      '<source src="' + newFallback + '" type="video/mp4">' +
      '您的瀏覽器不支援 HTML5 影片播放。';
    video.src = newSrc;
    video.load();

    if (autoPlayWithSound) {
      try {
        video.muted = false;
        video.volume = 1.0;
        video.currentTime = 0;
        var p = video.play();
        if (p && typeof p.catch === 'function') {
          p.catch(function () {
            video.muted = true;
            var p2 = video.play();
            if (p2 && typeof p2.catch === 'function') p2.catch(function () {});
            syncPlayerUI(video);
          });
        }
      } catch (e) {}
    }
    syncPlayerUI(video);
    trackShortEvent('short_video_switch', meta.id);
  };

  window.fsPlayWithSoundFromStart = function () {
    var video = document.getElementById('fushanShortVideo');
    if (!video) return;
    try {
      video.muted = false;
      video.volume = 1.0;
      video.currentTime = 0;
      var p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function () {
          video.controls = true;
        });
      }
    } catch (e) {}
    syncPlayerUI(video);
    trackShortEvent('short_video_unmute_restart', currentVideoId);
  };

  window.fsToggleMutePreview = function () {
    var video = document.getElementById('fushanShortVideo');
    if (!video) return;
    try {
      video.muted = !video.muted;
      if (!video.muted) {
        video.volume = 1.0;
      }
      if (video.paused) {
        var p = video.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      }
    } catch (e) {}
    syncPlayerUI(video);
    trackShortEvent('short_video_mute_toggle', (video.muted ? 'muted_' : 'unmuted_') + currentVideoId);
  };

  window.fsSeekChapter = function (sec, unmute) {
    var video = document.getElementById('fushanShortVideo');
    if (!video) return;
    try {
      video.currentTime = Number(sec) || 0;
      if (unmute) {
        video.muted = false;
        video.volume = 1.0;
      }
      var p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function () {
          video.muted = true;
          video.play().catch(function () {});
        });
      }
    } catch (e) {}
    syncPlayerUI(video);
    trackShortEvent('short_video_chapter_seek', currentVideoId + '_sec_' + sec);
  };

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('short-video-showcase');
    var video = document.getElementById('fushanShortVideo');
    if (!root || !video) return;

    var prefix = getAssetPrefix();
    fetch(prefix + 'assets/short-video-showcase.json', { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        root.setAttribute('data-contract-loaded', cfg.contract_id || 'loaded');
      })
      .catch(function () {});

    video.addEventListener('volumechange', function () {
      syncPlayerUI(video);
    });

    renderChaptersAndCopy(VIDEO_CATALOG[currentVideoId]);
    syncPlayerUI(video);
  });
})();
