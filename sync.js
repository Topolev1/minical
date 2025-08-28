
  // === Supabase sync (ready-to-use) ===
  import { createClient } from 'https://esm.sh/@supabase/supabase-js';

  const SUPABASE_URL = 'https://lpdimeiuixcrauvktrjy.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwZGltZWl1aXhjcmF1dmt0cmp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNjcyNjAsImV4cCI6MjA3MTk0MzI2MH0.Dr1krp2H1MjvFqz1Sf7y7VXNWnC7ZcRzwfi7YHc-tR0';

  const statusEl = document.getElementById('sync-status');
  const setStatus = (t, cls='')=>{ if(!statusEl) return; statusEl.textContent = t; statusEl.style.color = (cls==='err'?'#b91c1c': cls==='ok'?'#065f46':'#6b7280'); };

  function ensureState(){ if (!window.state) window.state = new Map(); return window.state; }
  function serializeState(){ const obj = {}; ensureState().forEach((v,k)=>{ if (v && v!=='none') obj[k] = v; }); return obj; }

  function applyStateToVisible(){
    try {
      const yearEl = document.querySelector('.year');
      const monthEl = document.getElementById('monthLabel');
      if (!yearEl || !monthEl) return;
      const y = parseInt(yearEl.textContent,10);
      const MONTHS = window.MONTHS || [];
      const m = MONTHS.indexOf(monthEl.textContent);
      if (isNaN(y) || m < 0) return;
      document.querySelectorAll('.day').forEach(el => {
        if (el.classList.contains('empty')) return;
        const numEl = el.querySelector('.num'); if(!numEl) return;
        const d = parseInt(numEl.textContent,10);
        const key = (window.ymd? window.ymd(y,m,d) : `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
        const mode = ensureState().get(key) || 'none';
        if (window.updateClass) window.updateClass(el, mode);
        else { el.classList.toggle('state-green', mode==='green'); el.classList.toggle('state-red', mode==='red'); }
      });
    } catch(e){ console.error('applyStateToVisible error', e); }
  }

  let supabase;
  try { supabase = createClient(SUPABASE_URL.replace(/\/+$/,''), SUPABASE_ANON_KEY); }
  catch(e){ console.error('createClient error', e); setStatus('Ошибка инициализации Supabase', 'err'); }

  // Общий id календаря (?id=...)
  const params = new URLSearchParams(location.search);
  let calId = params.get('id') || localStorage.getItem('CAL_ID');
  if (!calId) { calId = crypto.getRandomValues(new Uint8Array(16)).reduce((s,b)=>s+('0'+b.toString(16)).slice(-2),''); localStorage.setItem('CAL_ID', calId); const u = new URL(location.href); u.searchParams.set('id', calId); history.replaceState(null, '', u.toString()); }

  // Ссылка для шаринга
  (function showShare(){
    const host = document.querySelector('#share');
    if (!host) return;
    const a = document.createElement('a');
    a.href = `${location.origin}${location.pathname}?id=${calId}`;
    a.textContent = 'Открыть этот календарь на другом устройстве';
    host.innerHTML=''; host.appendChild(a);
  })();

  async function loadFromSupabase(){
    if (!supabase){ setStatus('Supabase не инициализирован', 'err'); return; }
    try {
      setStatus('Загрузка из Supabase...', '');
      const res = await supabase.from('calendars').select('data').eq('id', calId).maybeSingle();
      if (res.error){ console.warn('Load error', res.error); setStatus(`Ошибка загрузки: ${res.error.code||''} ${res.error.message}`, 'err'); return; }
      if (!res.data){ // строки ещё нет — создадим пустую
        const up = await supabase.from('calendars').upsert({ id: calId, data: {}, updated_at: new Date().toISOString() });
        if (up.error){ console.warn('Create row error', up.error); setStatus(`Ошибка создания строки: ${up.error.message}`, 'err'); return; }
        setStatus('Создана новая запись календаря', 'ok');
      } else {
        const obj = res.data?.data || {};
        const st = ensureState(); st.clear();
        Object.entries(obj).forEach(([k,v])=> st.set(k, v));
        applyStateToVisible();
        setStatus('Загружено ✔', 'ok');
      }
    } catch(e){
      console.error('loadFromSupabase exception', e);
      setStatus('Сетевая ошибка при загрузке', 'err');
    }
  }

  let saveTimer = null;
  function scheduleSave(){ clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 250); }

  async function saveNow(){
    if (!supabase){ setStatus('Supabase не инициализирован', 'err'); return; }
    try{
      setStatus('Сохранение...', '');
      const payload = { id: calId, data: serializeState(), updated_at: new Date().toISOString() };
      const { error } = await supabase.from('calendars').upsert(payload);
      if (error){ console.error('Save error', error); setStatus(`Ошибка сохранения: ${error.code||''} ${error.message}`, 'err'); }
      else setStatus('Сохранено ✔', 'ok');
    } catch(e){
      console.error('saveNow exception', e);
      setStatus('Сетевая ошибка при сохранении', 'err');
    }
  }

  document.addEventListener('click', (e)=>{ if (e.target.closest('.day')) scheduleSave(); }, {passive:true});

  let tries = 0;
  (function waitAndLoad(){
    tries++;
    if (document.querySelector('.day')) loadFromSupabase();
    else if (tries < 60) setTimeout(waitAndLoad, 100);
    else setStatus('Календарь не найден в DOM (нет .day)', 'err');
  })();


// === Lightweight polling fallback (no Realtime required) ===
let pollTimer = null;
function startPolling(){
  stopPolling();
  pollTimer = setInterval(()=>{ loadFromSupabase(); }, 2500);
}
function stopPolling(){
  if (pollTimer){ clearInterval(pollTimer); pollTimer = null; }
}
document.addEventListener('visibilitychange', ()=>{
  if (document.visibilityState === 'visible') loadFromSupabase();
});
startPolling();
