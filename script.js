// ==== Календарь ====
const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const WEEKDAYS = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const START_YEAR = 2025, START_MONTH = 7; // Август
const END_YEAR = 2026, END_MONTH = 11;    // Декабрь

const MONTH_RANGE = [];
for (let y=START_YEAR; y<=END_YEAR; y++){
  const m0 = (y===START_YEAR? START_MONTH:0);
  const m1 = (y===END_YEAR? END_MONTH:11);
  for (let m=m0; m<=m1; m++) MONTH_RANGE.push({y,m});
}

const viewport = document.getElementById("viewport");
const monthLabel = document.getElementById("monthLabel");
const navLeft = document.getElementById("navLeft");
const navRight = document.getElementById("navRight");
document.querySelector(".year").textContent = MONTH_RANGE[0].y;

let idx = 0;
const state = new Map();
window.state = state;

const pad = n => String(n).padStart(2,"0");
const ymd = (y,m,d) => `${y}-${pad(m+1)}-${pad(d)}`;
// Today key for yellow highlight
const __now = new Date();
const TODAY_KEY = ymd(__now.getFullYear(), __now.getMonth(), __now.getDate());
const firstWeekdayIndex = (y,m) => (new Date(y,m,1).getDay() + 6) % 7;
const daysInMonth = (y,m) => new Date(y, m+1, 0).getDate();

// Саша/мама/Аня каждые 2 дня с 2025-09-03
const START_LABEL_DATE = new Date(2025, 8, 3); // базовая точка для обычного режима
const NAMES = ["Саша", "Мама", "Аня"];

function labelForDate(y,m,d){
  // Спец-правила запуска последовательности по требованию:
  // 29 августа 2025 — Саша, 31 августа 2025 — Мама, 1 сентября 2025 — Аня,
  // а дальше — обычный режим каждые 2 дня от 3 сентября 2025.
  const special = new Map([
    [Date.UTC(2025,7,29), "Саша"],
    [Date.UTC(2025,7,31), "Мама"],
    [Date.UTC(2025,8,1),  "Аня"],
  ]);
  const utcKey = Date.UTC(y,m,d);
  if (special.has(utcKey)) return special.get(utcKey);

  const current = new Date(y,m,d); current.setHours(0,0,0,0);
  const start = new Date(START_LABEL_DATE); start.setHours(0,0,0,0);
  // Ограничения диапазона (оставим как было, если есть внешняя логика использует эти даты)
  if (current < new Date(2025,8,1) || current > new Date(2026,11,31)) return null;

  const diffDays = Math.floor((current - start)/(1000*60*60*24));
  if (diffDays < 0 || diffDays % 2 !== 0) return null;

  const NAMES = ["Саша", "Мама", "Аня"]; // цикл из трёх имён
  const index = Math.floor(diffDays / 2) % NAMES.length;
  return NAMES[index];
}

// Гнездо 🪺 каждую неделю начиная с 2025-09-05
const NEST_START = new Date(2025, 8, 5);
function nestForDate(y,m,d){ return false; }

function feedback(el){
  try{ if (navigator.vibrate) navigator.vibrate(18); }catch(e){}
  el.classList.add('pulse');
  setTimeout(()=> el.classList.remove('pulse'), 120);
}

// Палитры конфетти
const MULTI = ['#f59e0b','#10b981','#3b82f6','#a855f7','#ef4444','#22c55e'];
const REDS = ['#ef4444','#dc2626','#f87171','#b91c1c'];

function burst(el, palette){
  const count = 16;
  const rect = el.getBoundingClientRect();
  for (let i=0;i<count;i++){
    const p = document.createElement("div");
    p.className = "confetti";
    // центр клетки
    p.style.left = (rect.width/2 - 3) + "px";
    p.style.top = (rect.height/2 - 3) + "px";
    // разлёт
    const dx = (Math.random()*2-1)*60 + "px";
    const dy = (-Math.random()*80-30) + "px";
    const rot = (Math.random()*360) + "deg";
    p.style.setProperty("--dx", dx);
    p.style.setProperty("--dy", dy);
    p.style.setProperty("--rot", rot);
    p.style.background = palette[Math.floor(Math.random()*palette.length)];
    el.appendChild(p);
    setTimeout(()=>p.remove(), 720);
  }
}

// Построение месяца
function buildMonth(y, m){
  const card = document.createElement("div");
  card.className = "month-card";

  const weekdays = document.createElement("div");
  weekdays.className = "weekdays";
  WEEKDAYS.forEach(w=>{
    const el = document.createElement("div");
    el.className = "weekday"; el.textContent = w;
    weekdays.appendChild(el);
  });
  card.appendChild(weekdays);

  const grid = document.createElement("div");
  grid.className = "grid";

  const startEmpty = firstWeekdayIndex(y, m);
  const total = daysInMonth(y, m);

  for (let i=0;i<startEmpty;i++){
    const e = document.createElement("div"); e.className = "day empty"; grid.appendChild(e);
  }

  for (let d=1; d<=total; d++){
    const cell = document.createElement("div"); cell.className = "day";
    const num = document.createElement("div"); num.className = "num"; num.textContent = d;
    const slot = document.createElement("div"); slot.className = "label-slot";
    const who = labelForDate(y,m,d);
    if (who){ 
      const badge = document.createElement("span"); badge.className="badge"; badge.textContent = who; slot.appendChild(badge);
      const drop = document.createElement("span"); drop.className="icon"; drop.textContent = "💧"; slot.appendChild(drop);
    }
    if (nestForDate(y,m,d)){ const nest = document.createElement("span"); nest.className="icon"; nest.textContent = "🪺"; slot.appendChild(nest); }
    cell.appendChild(num); cell.appendChild(slot);

    const key = ymd(y, m, d);
    if (key===TODAY_KEY) { cell.dataset.today = '1'; }
    updateClass(cell, state.get(key)||'none');

    // === Логика нажатий (как в v12) ===
    let lastTap = 0, timer = null;
    const TAP_GAP = 280; // мс
    cell.addEventListener("click", (e)=>{
      const now = Date.now();
      const cur = state.get(key) || 'none';

      if (now - lastTap < TAP_GAP){
        // двойной тап
        if (timer){ clearTimeout(timer); timer = null; }
        if (cell.dataset.today==='1'){
          // сегодня: переключение красный <-> жёлтый
          if (cur === 'red'){ state.set(key,'none'); updateClass(cell,'none'); }
          else { state.set(key,'red'); updateClass(cell,'red'); burst(cell, REDS); }
        } else {
          // остальные дни — как раньше: просто красный
          state.set(key,'red'); updateClass(cell,'red'); burst(cell, REDS);
        }
        feedback(cell);
        lastTap = 0;
      } else {
        lastTap = now;
        // отложенная обработка одиночного тапа
        timer = setTimeout(()=>{
          if (cur === 'none'){ state.set(key,'green'); updateClass(cell,'green'); burst(cell, MULTI); }
          else { state.set(key,'none'); updateClass(cell,'none'); }
          feedback(cell);
          timer = null;
        }, TAP_GAP + 20);
      }
    }, {passive:true});
    // На всякий случай — поддержка pointerdown (лучше ловит двойные тапы на iOS)
    cell.addEventListener("pointerdown", (e)=>{
      if (e.pointerType !== 'touch') return;
      e.preventDefault();
    });

    grid.appendChild(cell);
  }

  const cellsCount = startEmpty + total;
  const rows = Math.ceil(cellsCount / 7);
  const need = (6 - rows) * 7;
  for (let k=0; k<need; k++){
    const e = document.createElement("div"); e.className = "day empty"; grid.appendChild(e);
  }

  card.appendChild(grid);
  return card;
}

function updateClass(el, mode){
  el.classList.remove('state-green','state-red','state-yellow');
  if (el.dataset.today==='1' && (mode==='none' || !mode)) el.classList.add('state-yellow');
  if (mode==='green') el.classList.add('state-green');
  if (mode==='red') el.classList.add('state-red');
}

function renderIndex(newIdx){
  idx = newIdx;
  const {y,m} = MONTH_RANGE[idx];
  monthLabel.textContent = MONTHS[m];
  document.querySelector(".year").textContent = y;
  viewport.innerHTML = "";
  viewport.appendChild(buildMonth(y, m));
}
function go(delta){
  let next = idx + delta;
  if (next < 0) next = MONTH_RANGE.length - 1;
  if (next >= MONTH_RANGE.length) next = 0;
  renderIndex(next);
}
navLeft.addEventListener("click", ()=> go(-1));
navRight.addEventListener("click", ()=> go(1));
let touchX=null, mouseX=null; const SWIPE=40;
viewport.addEventListener("touchstart", e=> touchX = e.touches[0].clientX, {passive:true});
viewport.addEventListener("touchend", e=> { if (touchX==null) return; const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx)>SWIPE) go(dx<0?1:-1); touchX=null; }, {passive:true});
viewport.addEventListener("mousedown", e=> mouseX = e.clientX);
window.addEventListener("mouseup", e=> { if (mouseX==null) return; const dx = e.clientX - mouseX; if (Math.abs(dx)>SWIPE) go(dx<0?1:-1); mouseX=null; });


// Открываем текущий месяц автоматически, если он в диапазоне.
// Если вне диапазона — показываем первый месяц.
(function(){
  const today = new Date();
  const ty = today.getFullYear();
  const tm = today.getMonth();
  let found = 0;
  for (let i=0;i<MONTH_RANGE.length;i++){
    if (MONTH_RANGE[i].y===ty && MONTH_RANGE[i].m===tm){ found = i; break; }
  }
  renderIndex(found);
})();


// === Expose to window for sync.js ===
try { window.updateClass = window.updateClass || updateClass; } catch(e) {}
try { window.ymd = window.ymd || ymd; } catch(e) {}
try { window.MONTHS = window.MONTHS || MONTHS; } catch(e) {}
