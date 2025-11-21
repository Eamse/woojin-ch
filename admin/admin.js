const monthSelect = document.getElementById('month-select');
const yearSelect = document.getElementById('year-select');
const calendarBody = document.getElementById('calendar-body');

const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth();

const reservations = {}; // 날짜별 예약 저장 { "2025-09-12": [{이름,전화,메모}] }

// 연도/월 옵션 생성
for (let y = currentYear; y <= currentYear + 5; y++) {
  const opt = document.createElement('option');
  opt.value = y;
  opt.textContent = y + '년';
  if (y === currentYear) opt.selected = true;
  yearSelect.appendChild(opt);
}
const monthNames = [
  '1월',
  '2월',
  '3월',
  '4월',
  '5월',
  '6월',
  '7월',
  '8월',
  '9월',
  '10월',
  '11월',
  '12월',
];
monthNames.forEach((m, i) => {
  const opt = document.createElement('option');
  opt.value = i;
  opt.textContent = m;
  if (i === currentMonth) opt.selected = true;
  monthSelect.appendChild(opt);
});

// 달력 렌더링
function renderCalendar(year, month) {
  calendarBody.innerHTML = '';
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  let row = document.createElement('tr');
  let dayCount = 0;

  for (let i = 0; i < firstDay; i++) {
    row.appendChild(document.createElement('td'));
    dayCount++;
  }

  for (let date = 1; date <= lastDate; date++) {
    if (dayCount % 7 === 0) {
      calendarBody.appendChild(row);
      row = document.createElement('tr');
    }

    const cell = document.createElement('td');
    cell.textContent = date;

    // 오늘 표시
    if (
      year === today.getFullYear() &&
      month === today.getMonth() &&
      date === today.getDate()
    ) {
      cell.classList.add('today');
    }

    // 예약 표시
    const dateKey = `${year}-${month + 1}-${date}`;
    if (reservations[dateKey]) {
      cell.classList.add('reserved');
      const badge = document.createElement('div');
      badge.style.fontSize = '12px';
      badge.style.color = '#28a745';
      badge.textContent = '예약있음';
      cell.appendChild(badge);
    }

    // 클릭 -> 예약 팝업 열기
    cell.addEventListener('click', () => openModal(dateKey));
    row.appendChild(cell);
    dayCount++;
  }
  if (row.children.length > 0) calendarBody.appendChild(row);
}

renderCalendar(currentYear, currentMonth);

monthSelect.addEventListener('change', () =>
  renderCalendar(parseInt(yearSelect.value), parseInt(monthSelect.value))
);
yearSelect.addEventListener('change', () =>
  renderCalendar(parseInt(yearSelect.value), parseInt(monthSelect.value))
);

// 팝업 관련
const modal = document.getElementById('reservation-modal');
const modalClose = document.getElementById('modal-close');
const resForm = document.getElementById('reservation-form');
let selectedDateKey = null;

function openModal(dateKey) {
  selectedDateKey = dateKey;
  modal.style.display = 'block';
}
modalClose.addEventListener('click', () => (modal.style.display = 'none'));
window.addEventListener('click', (e) => {
  if (e.target === modal) modal.style.display = 'none';
});

resForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('res-name').value;
  const phone = document.getElementById('res-phone').value;
  const note = document.getElementById('res-note').value;

  if (!reservations[selectedDateKey]) reservations[selectedDateKey] = [];
  reservations[selectedDateKey].push({ name, phone, note });

  alert(`${selectedDateKey} 예약 저장됨`);
  modal.style.display = 'none';
  resForm.reset();
  renderCalendar(parseInt(yearSelect.value), parseInt(monthSelect.value));
});
