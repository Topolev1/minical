
// === Supabase sync for calendar ===
// Требуется: window.state (Map), updateClass(el,mode), ymd(y,m,d), MONTHS, .year, #monthLabel, .day/.num
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// >>> ЗАМЕНИ ЭТИ ПАРАМЕТРЫ <<<
const SUPABASE_URL = 'https://lpdimeiuixcrauvktrjy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwZGltZWl1aXhjcmF1dmt0cmp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNjcyNjAsImV4cCI6MjA3MTk0MzI2MH0.Dr1krp2H1MjvFqz1Sf7y7VXNWnC7ZcRzwfi7YHc-tR0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ID календаря (общая ссылка между устройствами)
const params = new URLSearchParams(location.search);
let calId = params.get('id') || localStorage.getItem('CAL_ID');
if (!calId) {
  calId = crypto.getRandomValues(new Uint8Array(16)).reduce((s,b)=>s+('0'+b.toString(16)).slice(-2),'');
  localStorage.setItem('CAL_ID', calId);
  const url = new URL(location.href); url.searchParams.set('id', calId);
  history.replaceState(null, '', url.toString());
}

// Показать ссылку-шаринг (если есть контейнер)
(function showShare(){
  const host = document.querySelector('#share');
  if (!host) return;
  const a = document.createElement('a');
  a.href = `${location.origin}${location.pathname}?id=${calId}`;
  a.textContent = 'Открыть этот же календарь на другом устройстве';
  host.innerHTML = '';
  host.appendChild(a);
})();

// Дебаунс сохранения
let saveTimer = null;
function scheduleSave(){ clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 250); }

function serializeState(){
  // Преобразуем Map -> объект { "YYYY-MM-DD": "green"|"red" }
  const obj = {};
  window.state.forEach((v,k)=>{ if (v && v!=='none') obj[k] = v; });
  return obj;
}

function applyStateToVisible(){
  try {
    const yearEl = document.querySelector('.year');
    const monthEl = document.getElementById('monthLabel');
    if (!yearEl || !monthEl) return;
    const y = parseInt(yearEl.textContent,10);
    const m = window.MONTHS.indexOf(monthEl.textContent); // 0..11
    if (isNaN(y) || m < 0) return;

    document.querySelectorAll('.day').forEach(el => {
      if (el.classList.contains('empty')) return;
      const numEl = el.querySelector('.num');
      if (!numEl) return;
      const d = parseInt(numEl.textContent, 10);
      const key = window.ymd(y, m, d);
      const mode = window.state.get(key) || 'none';
      window.updateClass(el, mode);
    });
  } catch(e){ console.error('applyStateToVisible error', e); }
}

async function loadFromSupabase(){
  const { data, error } = await supabase.from('calendars').select('data').eq('id', calId).single();
  if (error && error.code !== 'PGRST116') { // not found
    console.warn('Load error', error);
    return;
  }
  const days = data?.data || {};
  // Сбросим текущее и применим
  window.state.clear();
  Object.entries(days).forEach(([k,v])=> window.state.set(k, v));
  applyStateToVisible();
}

async function saveNow(){
  const payload = { id: calId, data: serializeState(), updated_at: new Date().toISOString() };
  const { error } = await supabase.from('calendars').upsert(payload);
  if (error) console.error('Save error', error);
}

// Слушаем клики по календарю, чтобы сохранить изменения
document.addEventListener('click', (e) => {
  const el = e.target.closest('.day');
  if (!el) return;
  // Изменение состояния происходит в script.js; подождём чуть-чуть и сохраним.
  scheduleSave();
}, { passive: true });

// Реалтайм (опционально): включи репликацию для таблицы "calendars" в Supabase и раскомментируй
/*
const channel = supabase.channel('calendars-realtime')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'calendars', filter: `id=eq.${calId}` }, (payload) => {
    const obj = payload.new?.data || {};
    window.state.clear();
    Object.entries(obj).forEach(([k,v])=> window.state.set(k, v));
    applyStateToVisible();
  })
  .subscribe();
*/

// Загружаем при старте (после того как исходный календарь отрисовался)
// Попробуем несколько раз, если DOM ещё не готов.
let tries = 0;
(function waitAndLoad(){
  tries++;
  if (document.querySelector('.day')){
    loadFromSupabase();
  } else if (tries < 20) {
    setTimeout(waitAndLoad, 100);
  }
})();
