(function () {
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
    trackShortEvent('short_video_unmute_restart', '20s_zero_fee_bounty');
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
    trackShortEvent('short_video_mute_toggle', video.muted ? 'muted' : 'unmuted');
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
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } catch (e) {}
    syncPlayerUI(video);
    trackShortEvent('short_video_chapter_seek', 'sec_' + sec);
  };

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('short-video-showcase');
    var video = document.getElementById('fushanShortVideo');
    if (!root || !video) return;

    var prefix = root.getAttribute('data-asset-prefix') || '';
    fetch(prefix + 'assets/short-video-showcase.json', { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        root.setAttribute('data-contract-loaded', cfg.contract_id || 'loaded');
      })
      .catch(function () {});

    video.addEventListener('volumechange', function () {
      syncPlayerUI(video);
    });

    // Attempt muted inline preview play when visible in viewport
    if ('IntersectionObserver' in window) {
      var vObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            if (video.paused && video.muted) {
              var p = video.play();
              if (p && typeof p.catch === 'function') p.catch(function () {});
            }
          } else {
            if (!video.paused && video.muted) {
              video.pause();
            }
          }
        });
      }, { threshold: 0.25 });
      vObserver.observe(video);
    }

    syncPlayerUI(video);
  });
})();
