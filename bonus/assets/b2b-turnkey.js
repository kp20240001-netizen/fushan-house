(function () {
  window.toggleB2BDrawer = function (forceOpen) {
    var body = document.getElementById('b2bDrawerBody');
    var btn = document.getElementById('b2bToggleBtn');
    if (!body) return;
    var isOpen = typeof forceOpen === 'boolean' ? forceOpen : !body.classList.contains('open');
    body.classList.toggle('open', isOpen);
    if (btn) {
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      btn.innerHTML = isOpen
        ? '收合系統代建方案與線上洽詢 ▲'
        : '展開查看「9,800 / 16,800 雙方案報價」與線上洽詢 ▼';
    }
  };

  window.selectB2BPlan = function (planValue) {
    window.toggleB2BDrawer(true);
    var sel = document.getElementById('b2bPlanSelect');
    if (sel) {
      sel.value = planValue;
    }
    var formEl = document.getElementById('b2bInquiryForm');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var nameInput = formEl.querySelector('input[name="b2bName"]');
      if (nameInput) setTimeout(function () { nameInput.focus(); }, 350);
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('b2bInquiryForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      var fd = new FormData(form);
      var sysId = 'SYS-2026-' + Math.floor(1000 + Math.random() * 9000);
      var name = (fd.get('b2bName') || '').toString().trim();
      var contactInfo = (fd.get('b2bContact') || '').toString().trim();
      var propertyInfo = (fd.get('b2bProperty') || '').toString().trim();
      var plan = (fd.get('b2bPlan') || '').toString().trim();

      var record = {
        id: sysId,
        type: 'B2B_系統代建洽詢',
        name: name,
        phone: contactInfo,
        contact: '物件：' + propertyInfo,
        relation: '方案：' + plan,
        propertyInfo: propertyInfo,
        plan: plan,
        status: '待聯繫報價（B2B代建）',
        createdAt: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
      };

      if (typeof window.saveLead === 'function') {
        window.saveLead(record);
      } else {
        var leads = JSON.parse(localStorage.getItem('fushan_bonus_leads') || '[]');
        leads.unshift(record);
        localStorage.setItem('fushan_bonus_leads', JSON.stringify(leads));
      }

      if (typeof window.gtag === 'function') {
        window.gtag('event', 'generate_lead', {
          event_category: 'B2B_系統代建洽詢',
          event_label: sysId + ' | ' + plan,
          value: plan.indexOf('16,800') !== -1 ? 16800 : 9800
        });
      }

      var codeEl = document.getElementById('b2bGeneratedCode');
      if (codeEl) codeEl.textContent = sysId;

      var msg = [
        'Jay 您好，我在「福山里居」看到同款【屋主自售防詐懸賞官網＋Google Ads 導流系統】代建服務，想進一步洽詢：',
        '洽詢編號：' + sysId,
        '稱呼：' + name,
        '聯絡電話／LINE：' + contactInfo,
        '預計自售物件地區與總價：' + propertyInfo,
        '想了解方案：' + plan
      ].join('\n');

      var lineBtn = document.getElementById('b2bLineLink');
      if (lineBtn) {
        lineBtn.href = 'https://line.me/R/oaMessage/@rainbow0725/?' + encodeURIComponent(msg);
        lineBtn.onclick = function () {
          window.open('https://line.me/ti/p/~rainbow0725', '_blank', 'noopener');
          return false;
        };
      }
      var waBtn = document.getElementById('b2bWaLink');
      if (waBtn) {
        waBtn.href = 'https://wa.me/886975066275?text=' + encodeURIComponent(msg);
      }

      var resBox = document.getElementById('b2bInquiryResult');
      if (resBox) resBox.classList.add('show');
    });
  });
})();
