const calendarsRoot = document.getElementById("calendars");

// русские месяцы/дни
const MONTHS = [
  "Январь","Февраль","Март","Апрель","Май","Июнь",
  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"
];
const WEEKDAYS = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

// хранение выбранных дат (YYYY-MM-DD)
const selected = new Set();

function pad(n) { return String(n).padStart(2, "0"); }

function ymd(y, m, d) { // m: 0..11
  return `${y}-${pad(m+1)}-${pad(d)}`;
}

function firstWeekdayIndex(year, month0) {
  // хотим, чтобы неделя начиналась с Понедельника
  const js = new Date(year, month0, 1).getDay(); // 0=Вс..6=Сб
  return (js + 6) % 7; // 0=Пн..6=Вс
}

function daysInMonth(year, month0) {
  return new Date(year, month0 + 1, 0).getDate();
}

function createMonth(year, month0) {
  const wrap = document.createElement("div");
  wrap.className = "month";

  const h = document.createElement("div");
  h.className = "month-title";
  h.textContent = `${MONTHS[month0]} ${year}`;
  wrap.appendChild(h);

  const grid = document.createElement("div");
  grid.className = "grid";

  // Заголовок дней недели
  WEEKDAYS.forEach(w => {
    const wd = document.createElement("div");
    wd.className = "weekday";
    wd.textContent = w;
    grid.appendChild(wd);
  });

  const startEmpty = firstWeekdayIndex(year, month0); // сколько пустых перед 1 числом
  const totalDays = daysInMonth(year, month0);

  // Пустые клетки
  for (let i = 0; i < startEmpty; i++) {
    const empty = document.createElement("div");
    empty.className = "cell empty";
    grid.appendChild(empty);
  }

  // Дни месяца
  for (let day = 1; day <= totalDays; day++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.textContent = day;

    const key = ymd(year, month0, day);
    if (selected.has(key)) cell.classList.add("active");

    cell.addEventListener("click", () => {
      if (cell.classList.toggle("active")) {
        selected.add(key);
      } else {
        selected.delete(key);
      }
      // если надо, можно отправить выбранные даты обратно в бота через WebApp API
      // window.Telegram?.WebApp?.sendData(JSON.stringify([...selected]));
    });

    grid.appendChild(cell);
  }

  wrap.appendChild(grid);
  return wrap;
}

function renderYear(y) {
  calendarsRoot.innerHTML = "";
  for (let m = 0; m < 12; m++) {
    calendarsRoot.appendChild(createMonth(y, m));
  }
}

renderYear(2025);
