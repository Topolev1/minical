:root{
  --bg:#0b0b0f;          /* фон */
  --panel:#121218;       /* карточки */
  --text:#e8e8ee;        /* основной текст */
  --muted:#9aa0a6;       /* вторичный текст */
  --line:#1f2530;        /* границы/деления */
  --accent:#22c55e;      /* зелёный */
  --accent-ghost:#15321f;
  --cell:46px;           /* размер дня */
  --radius:14px;
  --shadow:0 10px 30px rgba(0,0,0,.35);
}

* { box-sizing: border-box; }
html,body { height:100%; }
body{
  margin:0;
  background: radial-gradient(1200px 800px at 80% -10%, #182033 0%, #0b0b0f 55%) fixed;
  color:var(--text);
  font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  -webkit-font-smoothing:antialiased;
  -moz-osx-font-smoothing:grayscale;
}

/* верх/низ */
.topbar, .bottombar{
  position:fixed; left:0; right:0;
  display:flex; align-items:center; justify-content:center;
  height:64px;
  background: rgba(10,10,14,.45);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255,255,255,.04);
  z-index:5;
}
.topbar { top:0; }
.bottombar{
  bottom:0;
  border-top: 1px solid rgba(255,255,255,.04);
  border-bottom:none;
}

.title{
  letter-spacing:.3px;
  font-weight:700;
  font-size:18px;
  color:#fff;
}
.title .year{
  padding:.2rem .55rem;
  margin-left:.4rem;
  background:linear-gradient(180deg, #1a1f2b 0%, #10131a 100%);
  border:1px solid #22283a;
  border-radius:999px;
  font-weight:600;
}

/* область страницы-месяца */
.viewport{
  position:fixed; inset:64px 0 64px 0; /* между верхом и низом */
  display:grid; place-items:center;
  overflow:hidden;
}

/* контейнер одного месяца */
.month-card{
  width:min(92vw, 560px);
  background:linear-gradient(180deg,#141821 0%,#10131a 100%);
  border:1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding:20px 18px 16px;
}

/* заголовок месяца внутри карточки */
.month-header{
  display:flex; align-items:center; justify-content:center;
  gap:10px; margin-bottom:14px;
}
.month-name{
  font-size:22px; font-weight:800; letter-spacing:.3px;
}

/* сетка */
.calendar{
  display:grid;
  grid-template-columns: repeat(7, var(--cell));
  gap:10px;
  justify-content:center;
  margin:0 auto;
}
.weekday{
  text-transform:uppercase;
  font-size:11px; color:var(--muted);
  letter-spacing:.6px; text-align:center;
}

.day{
  width:var(--cell); height:var(--cell);
  display:grid; place-items:center;
  border:1px solid var(--line);
  border-radius:12px;
  color:var(--text);
  cursor:pointer;
  user-select:none;
  transition: transform .06s ease, background .2s ease, border-color .2s ease, box-shadow .2s ease;
  background:linear-gradient(180deg,#10141c 0%, #0c0f15 100%);
}
.day:hover{ transform: translateY(-1px); }
.day.empty{
  background:transparent;
  border-style:dashed;
  border-color:#1a2130;
  cursor:default;
}
.day.active{
  background: radial-gradient(140% 100% at 50% 0%, #1b3b27 0%, #0c1610 100%), linear-gradient(180deg,#10361f 0%,#0b1d12 100%);
  border-color:#214c2f;
  box-shadow: 0 0 0 1px rgba(34,197,94,.25), inset 0 0 0 1px rgba(34,197,94,.25), 0 12px 30px rgba(34,197,94,.18);
  color:#dfffe9;
  font-weight:700;
}

/* стрелки */
.nav{
  position:fixed; top:50%; transform:translateY(-50%);
  width:44px; height:44px;
  border-radius:50%;
  border:1px solid var(--line);
  background: rgba(16,18,26,.7);
  color:#fff; font-size:22px; font-weight:700;
  display:grid; place-items:center;
  cursor:pointer;
  z-index:6;
  transition: transform .12s ease, opacity .2s ease, background .2s ease, border-color .2s ease;
}
.nav:hover{ transform:translateY(-50%) scale(1.05); }
.nav-left{ left:14px; }
.nav-right{ right:14px; }

/* подпись месяца внизу */
.month-label{
  font-weight:700; font-size:14px; letter-spacing:.4px; color:#cbd5e1;
}

/* анимации перелистывания */
.slide{
  position:absolute; inset:0; display:grid; place-items:center;
}
.slide-enter-left{ animation: enterLeft .24s ease both; }
.slide-exit-left { animation: exitLeft  .24s ease both; }
.slide-enter-right{ animation: enterRight .24s ease both; }
.slide-exit-right { animation: exitRight  .24s ease both; }

@keyframes enterLeft{ from{ transform:translateX(-40px); opacity:.0 } to{ transform:none; opacity:1 } }
@keyframes exitLeft { from{ transform:none; opacity:1 } to{ transform:translateX(40px); opacity:0 } }
@keyframes enterRight{ from{ transform:translateX(40px); opacity:.0 } to{ transform:none; opacity:1 } }
@keyframes exitRight { from{ transform:none; opacity:1 } to{ transform:translateX(-40px); opacity:0 } }

/* адаптив: чуть меньше клетки на узких экранах */
@media (max-width:420px){
  :root{ --cell:40px; }
  .nav{ display:none; } /* на телефоне полагаемся на свайпы */
}
