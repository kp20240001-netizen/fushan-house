document.documentElement.classList.add('js');
const nav=document.querySelector('.nav');const onS=()=>nav.classList.toggle('scrolled',scrollY>30);addEventListener('scroll',onS);onS();
const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('visible')),{threshold:.08});document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
const lb=document.getElementById('lb'),li=lb.querySelector('img'),lc=lb.querySelector('.lightbox-caption'),close=()=>{lb.classList.remove('open');document.body.style.overflow=''};
document.querySelectorAll('img.zoom').forEach(im=>im.addEventListener('click',()=>{li.src=im.src;li.alt=im.alt;lc.textContent=im.alt;lb.classList.add('open');document.body.style.overflow='hidden'}));
lb.addEventListener('click',e=>{if(e.target!==li)close()});addEventListener('keydown',e=>{if(e.key==='Escape')close()});
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
fetch('updates.json',{cache:'no-cache'}).then(r=>r.json()).then(a=>{const f=document.getElementById('feed');a.sort((x,y)=>y.date.localeCompare(x.date));f.innerHTML=a.map(u=>`<article><p class="meta">${esc(u.date)}・${esc(u.platform)}</p><h3>${esc(u.title)}</h3><p>${esc(u.text)}</p>${u.url?`<a href="${esc(u.url)}" target="_blank" rel="noopener">看貼文 →</a>`:''}</article>`).join('')}).catch(()=>{document.getElementById('feed').innerHTML='<p class="note">暫無動態</p>'});
document.getElementById('bf').addEventListener('submit',e=>{e.preventDefault();const d=new FormData(e.target);const t=`您好，我想預約看福山街42巷10號透天（2,795萬）。\n稱呼：${d.get('n')}\n電話：${d.get('p')}\n希望時間：${d.get('t')||'-'}\n問題：${d.get('m')||'-'}`;window.open('https://wa.me/886975066275?text='+encodeURIComponent(t),'_blank')});
