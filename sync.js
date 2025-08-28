
// === Supabase sync for calendar (fixed) ===
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// >>> ЗАМЕНИ ЭТИ ПАРАМЕТРЫ <<<
const SUPABASE_URL = 'https://lpdimeiuixcrauvktrjy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwZGltZWl1aXhjcmF1dmt0cmp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNjcyNjAsImV4cCI6MjA3MTk0MzI2MH0.Dr1krp2H1MjvFqz1Sf7y7VXNWnC7ZcRzwfi7YHc-tR0';

const supabase = createClient(SUPABASE_URL.replace(/\/+$/,''), SUPABASE_ANON_KEY);

// Общий ID календаря: ?id=... + localStorage
const params = new URLSearchParams(location.search);
let calId = params.get('id') || localStorage.getItem('CAL_ID');
if (!calId) {
  calId = crypto.getRandomValues(new Uint8Array(16)).reduce((s,b)=>s+('0'+b.toString(16)).slice(-2),'');
  localStorage.setItem('CAL_ID', calId);
  const u = new URL(location.href); u.searchParams.set('id', calId);
  history.replaceState(null, '', u.toString());
}

// UI с шеринговой ссылкой (необязательно)
(function showShare(){
  const host = document.querySelector('#share');
  if (!host) return;
  host.innerHTML = '';
  const a = document.createElement('a');
  a.href = `${location.origin}${location.pathname}?id=${calId}`;
  a.textContent = 'Открыть этот календарь на другом устройстве';
  host.appendChild(a);
})();

// Дебаунс сохранения
let saveTimer = null;
function scheduleSave(){ clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 250); }

function ensureState(){
  if (!window.state) window.state = new Map();
  return window.state;
}

// Map -> объект { date: "green"|"red" }
function serializeState(){
  const obj = {};
  ensureState().forEach((v,k)=>{ if (v && v!=='none') obj[k] = v; });
  return obj;
}

function applyStateToVisible(){
  try {
    const yEl = document.querySelector('.year');
    const mEl = document.getElementById('monthLabel');
    if (!yEl || !mEl) return;
    const y = parseInt(yEl.textContent, 10);
    const m = (window.MONTHS||[]).indexOf(mEl.textContent);
    if (isNaN(y) || m < 0) return;

    document.querySelectorAll('.day').forEach(el => {
      if (el.classList.contains('empty')) return;
      const numEl = el.querySelector('.num');
      if (!numEl) return;
      const d = parseInt(numEl.textContent, 10);
      const key = window.ymd ? window.ymd(y, m, d) : `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const mode = ensureState().get(key) || 'none';
      if (window.updateClass) window.updateClass(el, mode);
      else el.classList.toggle('state-green', mode==='green'),
           el.classList.toggle('state-red', mode==='red');
    });
  } catch(e){ console.error('applyStateToVisible error', e); }
}

async function loadFromSupabase(){
  const res = await supabase.from('calendars').select('data').eq('id', calId).maybeSingle();
  if (res.error && res.error.code !== 'PGRST116') {
    console.warn('Load error', res.error);
    return;
  }
  const obj = res.data?.data || {}; // если строки нет — будет {}
  const st = ensureState();
  st.clear();
  Object.entries(obj).forEach(([k,v])=> st.set(k, v));
  applyStateToVisible();
}

async function saveNow(){
  const payload = { id: calId, data: serializeState(), updated_at: new Date().toISOString() };
  const { error } = await supabase.from('calendars').upsert(payload);
  if (error) console.error('Save error', error);
}

// Сохраняем после кликов (после того как script.js поменял state)
document.addEventListener('click', (e)=>{
  if (e.target.closest('.day')) scheduleSave();
}, {passive:true});

// Старт: ждём, пока календарь нарисуется, потом грузим состояние
let tries = 0;
(function waitAndLoad(){
  tries++;
  if (document.querySelector('.day')) loadFromSupabase();
  else if (tries < 40) setTimeout(waitAndLoad, 100);
})();

// Реалтайм (опционально):
/*
const channel = supabase.channel('calendars-realtime')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'calendars', filter: `id=eq.${calId}` }, (payload) => {
    const obj = payload.new?.data || {};
    const st = ensureState();
    st.clear();
    Object.entries(obj).forEach(([k,v])=> st.set(k, v));
    applyStateToVisible();
  })
  .subscribe();
*/
