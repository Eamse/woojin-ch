// -------------------------------
// 달력 DOM 요소
// -------------------------------
const monthSelect = document.getElementById('month-select');
const yearSelect = document.getElementById('year-select');
const calendarBody = document.getElementById('calendar-body');

const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth();

// -------------------------------
// 연도 선택 (오늘 기준 ~ 앞으로 5년)
// -------------------------------
for (let y = currentYear; y <= currentYear + 5; y++) {
  const option = document.createElement('option');
  option.value = y;
  option.textContent = y + '년';
  if (y === currentYear) option.selected = true;
  yearSelect.appendChild(option);
}

// -------------------------------
// 월 선택
// -------------------------------
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

monthNames.forEach((m, index) => {
  const option = document.createElement('option');
  option.value = index;
  option.textContent = m;
  if (index === currentMonth) option.selected = true;
  monthSelect.appendChild(option);
});

// -------------------------------
// 달력 생성 함수
// -------------------------------
function renderCalendar(year, month) {
  calendarBody.innerHTML = '';
  const firstDay = new Date(year, month, 1).getDay(); // 0=일요일
  const lastDate = new Date(year, month + 1, 0).getDate();

  let row = document.createElement('tr');
  let dayCount = 0;

  // 첫 주 빈칸 생성
  for (let i = 0; i < firstDay; i++) {
    const cell = document.createElement('td');
    row.appendChild(cell);
    dayCount++;
  }

  for (let date = 1; date <= lastDate; date++) {
    if (dayCount % 7 === 0) {
      calendarBody.appendChild(row);
      row = document.createElement('tr');
    }

    const cell = document.createElement('td');
    cell.textContent = date;

    // 오늘 날짜 강조
    if (
      year === today.getFullYear() &&
      month === today.getMonth() &&
      date === today.getDate()
    ) {
      cell.classList.add('today');
    }

    // 오늘 이전 날짜 비활성화
    if (
      year < today.getFullYear() ||
      (year === today.getFullYear() && month < today.getMonth()) ||
      (year === today.getFullYear() &&
        month === today.getMonth() &&
        date < today.getDate())
    ) {
      cell.style.color = '#ccc';
    } else {
      // 클릭 시 선택 표시
      cell.addEventListener('click', () => {
        // 기존 선택 제거
        const selected = calendarBody.querySelector('.selected');
        if (selected) selected.classList.remove('selected');
        cell.classList.add('selected');
        alert(`${year}년 ${month + 1}월 ${date}일 선택됨`);
      });
    }

    row.appendChild(cell);
    dayCount++;
  }

  if (row.children.length > 0) calendarBody.appendChild(row);
}

renderCalendar(currentYear, currentMonth);

// -------------------------------
// 월/연도 변경 이벤트
// -------------------------------
monthSelect.addEventListener('change', () =>
  renderCalendar(parseInt(yearSelect.value), parseInt(monthSelect.value))
);

yearSelect.addEventListener('change', () =>
  renderCalendar(parseInt(yearSelect.value), parseInt(monthSelect.value))
);
