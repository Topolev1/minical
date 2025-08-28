
// === Minimal robust Supabase sync (shared ID, polling, green<->none) ===
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const SUPABASE_URL = 'https://lpdimeiuixcrauvktrjy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwZGltZWl1aXhjcmF1dmt0cmp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNjcyNjAsImV4cCI6MjA3MTk0MzI2MH0.Dr1krp2H1MjvFqz1Sf7y7VXNWnC7ZcRzwfi7YHc-tR0';
const supabase = createClient(SUPABASE_URL.replace(/\/+$/,''), SUPABASE_ANON_KEY);

// One shared calendar for all devices:
const calId = 'shared-main';

const statusEl = document.getElementById('sync-status');
function setStatus(t, kind=''){ if (statusEl) { statusEl.textContent = t; statusEl.style.color = (kind==='err'?'#b91c1c': kind==='ok'?'#065f46':'#6b7280'); } }

// In-memory state map: YYYY-MM-DD -> 'green' | 'none'
const state = new Map();
window.state = state; // expose just in case

function ymdFromEl(el){
  const yearEl = document.querySelector('.year');
  const monthEl = document.getElementById('monthLabel');
  if (!yearEl || !monthEl) return null;
  const y = parseInt(yearEl.textContent, 10);
  const months = window.MONTHS || [];
  const m = months.indexOf(monthEl.textContent); // 0..11
  const numEl = el.querySelector('.num');
  if (!numEl) return null;
  const d = parseInt(numEl.textContent, 10);
  if (Number.isNaN(y) || m < 0 || Number.isNaN(d)) return null;
  const mm = String(m+1).padStart(2,'0');
  const dd = String(d).padStart(2,'0');
  return `${y}-${mm}-${dd}`;
}

function paintEl(el, mode){
  // Prefer your updateClass if present
  if (window.updateClass) { window.updateClass(el, mode); return; }
  el.classList.toggle('state-green', mode === 'green');
  el.classList.toggle('state-red', mode === 'red');
  if (mode !== 'green') el.classList.remove('state-green');
  if (mode !== 'red') el.classList.remove('state-red');
}

function applyStateToDOM(){
  const days = document.querySelectorAll('.day');
  days.forEach(el => {
    if (el.classList.contains('empty')) return;
    const key = ymdFromEl(el);
    if (!key) return;
    const mode = state.get(key) || 'none';
    // Only update if actual class differs -> avoid flicker
    const isGreen = el.classList.contains('state-green');
    const isRed = el.classList.contains('state-red');
    const shouldBeGreen = (mode === 'green');
    const shouldBeRed = (mode === 'red');
    if (isGreen !== shouldBeGreen || isRed !== shouldBeRed) paintEl(el, mode);
  });
}

async function load(){
  try {
    setStatus('Загрузка из Supabase...');
    const res = await supabase.from('calendars').select('data').eq('id', calId).maybeSingle();
    if (res.error) { setStatus('Ошибка загрузки: ' + (res.error.message||res.error.code), 'err'); return; }
    if (!res.data) {
      await supabase.from('calendars').upsert({ id: calId, data: {}, updated_at: new Date().toISOString() });
      setStatus('Создана запись календаря', 'ok');
      return;
    }
    const obj = res.data.data || {};
    state.clear();
    for (const [k,v] of Object.entries(obj)) state.set(k, v);
    applyStateToDOM();
    setStatus('Загружено ✔ (ID: ' + calId + ')', 'ok');
  } catch(e){
    console.error(e);
    setStatus('Сетевая ошибка при загрузке', 'err');
  }
}

let saveTimer = null;
function scheduleSave(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 150); // быстрый дебаунс
}

async function saveNow(){
  try {
    const obj = Object.fromEntries([...state.entries()].filter(([k,v]) => v==='green' || v==='red'));
    setStatus('Сохранение...');
    const { error } = await supabase.from('calendars').upsert({ id: calId, data: obj, updated_at: new Date().toISOString() });
    if (error) { console.error(error); setStatus('Ошибка сохранения: ' + (error.message||error.code), 'err'); return; }
    setStatus('Сохранено ✔ (ID: ' + calId + ')', 'ok');
  } catch(e){
    console.error(e);
    setStatus('Сетевая ошибка при сохранении', 'err');
  }
}

// Click handler: toggle only green <-> none, then save
// Dblclick handler start
document.addEventListener('dblclick', (e) => {
  const el = e.target.closest('.day');
  if (!el || el.classList.contains('empty')) return;
  const key = ymdFromEl(el);
  if (!key) return;
  const cur = state.get(key) || 'none';
  const next = (cur === 'red') ? 'none' : 'red';
  state.set(key, next);
  paintEl(el, next);
  scheduleSave();
}, true);
// Dblclick handler end

document.addEventListener('click', (e) => {
  const el = e.target.closest('.day');
  if (!el || el.classList.contains('empty')) return;
  const key = ymdFromEl(el);
  if (!key) return;
  const cur = state.get(key) || 'none';
  const next = (cur === 'green') ? 'none' : 'green';
  state.set(key, next);
  paintEl(el, next);
  scheduleSave();
}, true);

// Polling every 2.5s + on tab focus
let pollTimer = null;
function startPolling(){
  stopPolling();
  pollTimer = setInterval(load, 2500);
}
function stopPolling(){
  if (pollTimer) clearInterval(pollTimer), pollTimer = null;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') load();
});

// Wait until calendar DOM exists, then start
let tries = 0;
(function wait(){
  tries++;
  if (document.querySelector('.day')) { load(); startPolling(); }
  else if (tries < 80) setTimeout(wait, 100);
  else setStatus('Календарь не найден в DOM (нет .day)', 'err');
})();
