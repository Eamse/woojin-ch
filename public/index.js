// -------------------------------------
// 레이아웃 로드 (헤더/네비)
// -------------------------------------

// [추가] 스크롤 애니메이션 옵저버를 전역 스코프에 생성
const scrollObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
      } else {
        entry.target.classList.remove('show');
      }
    });
  },
  { threshold: 0.01 }
);

document.addEventListener('DOMContentLoaded', () => {
  const layoutBase = '/layout/';

  function loadHeaderLayout() {
    fetch(`${layoutBase}/header-layout.html`)
      .then((res) => res.text())
      .then((data) => {
        const header = document.getElementById('header-layout-container');
        if (!header) return;
        header.innerHTML = data;
        initializeHeaderFunctionality();
      })
      .catch((err) => console.error('Header load error:', err));
  }

  function loadNavLayout() {
    fetch(`${layoutBase}nav-layout.html`)
      .then((res) => res.text())
      .then((data) => {
        const nav = document.getElementById('nav-layout-container');
        if (!nav) return;
        nav.innerHTML = data;
        initializeModalFunctionality();
      })
      .catch((err) => console.error('Nav load error:', err));
  }

  loadHeaderLayout();
  loadNavLayout();
  initLatestProjects();

  // [추가] 정적인 .box-item 요소들(소개, 아뜰리에 섹션)을 관찰
  const staticItems = document.querySelectorAll(
    '.testimonial.box-item, .atelier.box-item'
  );
  staticItems.forEach((item) => scrollObserver.observe(item));
});

// -------------------------------------
// 최신 프로젝트 (API 연동)
// -------------------------------------
async function initLatestProjects() {
  const grid = document.getElementById('project-grid');
  const empty = document.getElementById('project-grid-empty');
  if (!grid) return;

  const setEmpty = (msg) => {
    if (!empty) return;
    empty.textContent = msg;
    empty.style.display = 'block';
  };

  try {
    const apiBase =
      document.querySelector('meta[name="woojin-api-base"]')?.content ||
      'http://127.0.0.1:4000/api';
    const data =
      typeof window.apiFetch === 'function'
        ? await window.apiFetch('/projects')
        : await fetch(`${apiBase}/projects`).then((r) => {
            if (!r.ok) throw new Error(r.statusText);
            return r.json();
          });

    const projects = (data && data.projects) || [];
    if (!projects.length) {
      setEmpty('표시할 프로젝트가 없습니다.');
      return;
    }

    const cards = projects
      .filter((p) => p.mainImage || (p.images && p.images.length))
      .slice(0, 9)
      .map((p) => {
        let thumb = p.mainImage;
        if (!thumb && p.images && p.images.length > 0) {
          // [화질 개선] mediumUrl 우선 사용
          thumb =
            p.images[0].mediumUrl ||
            p.images[0].thumbUrl ||
            p.images[0].originalUrl;
        }

        // [추가] 상대 경로인 경우 백엔드 주소(API_BASE에서 /api 제거)를 붙여줌
        if (thumb && !thumb.startsWith('http') && !thumb.startsWith('data:')) {
          const serverBase = apiBase.replace(/\/api\/?$/, '');
          thumb = `${serverBase}${thumb.startsWith('/') ? '' : '/'}${thumb}`;
        }

        if (!thumb) thumb = 'https://placehold.co/480x320?text=No+Image';

        const title = p.title || '제목 없음';
        const location = p.location || p.category || '시공 사례';
        const href = `/project/project-detail.html?id=${p.id}`;

        const fig = document.createElement('figure');
        fig.className = 'box-item project-card';
        fig.innerHTML = `
          <a href="${href}">
            <div class="project-thumb-wrap">
              <img src="${thumb}" alt="${title}" onerror="this.src='https://placehold.co/480x320?text=Error';" />
            </div>
            <figcaption>
              <span class="project-location">${location}</span>
              <span class="project-title">${title}</span>
            </figcaption>
          </a>
        `;
        return fig;
      });

    grid.innerHTML = '';
    cards.forEach((card) => grid.appendChild(card));

    // [추가] 동적으로 생성된 프로젝트 카드들을 관찰
    const newItems = grid.querySelectorAll('.box-item.project-card');
    newItems.forEach((item) => scrollObserver.observe(item));

    if (empty) empty.style.display = 'none';
  } catch (err) {
    console.error('Latest projects load error:', err);
    setEmpty('프로젝트를 불러오지 못했습니다.');
  }
}

// -------------------------------------
// 무료견적 모달 초기화
// -------------------------------------
function initializeModalFunctionality() {
  const modal = document.getElementById('estimateModal');
  const openModalBtn = document.getElementById('openEstimateModal');
  const closeModalBtn = document.querySelector('.modal-close');
  const typeBtns = document.querySelectorAll('.type-btn');
  const steps = document.querySelectorAll('.step');
  const step01 = document.querySelector('.step01');
  const step02Apartment = document.querySelector('.step02-apartment');
  const step02House = document.querySelector('.step02-house');

  if (openModalBtn) {
    openModalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      modal.style.display = 'flex';
      steps.forEach((s) => s.classList.remove('active'));
      step01.classList.add('active');
    });
  }

  closeModalBtn?.addEventListener(
    'click',
    () => (modal.style.display = 'none')
  );

  typeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      steps.forEach((s) => s.classList.remove('active'));
      const type = btn.dataset.type;
      if (type === 'apartment') step02Apartment.classList.add('active');
      else step02House.classList.add('active');
    });
  });

  window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });
}

// -------------------------------------
// 헤더 기능
// -------------------------------------
function initializeHeaderFunctionality() {
  const mainOverlay = document.querySelector('.header-overlay');
  const header = document.querySelector('.header-side');
  const toggleBtn = document.querySelector('.mobile-toggle-btn');
  const menuItems = document.querySelector('.menu-items');
  const scrollToTopBtn = document.querySelector('.sticky-btn.scroll-to-top');

  toggleBtn?.addEventListener('click', () => {
    menuItems?.classList.toggle('active');
    mainOverlay?.classList.toggle('active');
    const icon = toggleBtn.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-bars');
      icon.classList.toggle('fa-xmark');
    }
  });

  mainOverlay?.addEventListener('click', () => {
    menuItems?.classList.remove('active');
    mainOverlay?.classList.remove('active');
  });

  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY > 200;
    header?.classList.toggle('scrolled', scrolled);
    scrollToTopBtn?.classList.toggle('show', scrolled);
  });
}

// -------------------------------------
// 온라인 견적 계산기
// -------------------------------------
function calc() {
  const width = parseFloat(document.getElementById('width').value);
  const height = parseFloat(document.getElementById('height').value);
  const type = parseFloat(document.getElementById('type').value);
  const option = parseFloat(document.getElementById('option').value);
  if (!width || !height) return alert('가로와 세로를 입력해주세요.');

  const area = width * height;
  let price = (area * type) / 10000 + option;
  const minPrice = Math.floor(price * 0.9);
  const maxPrice = Math.ceil(price * 1.1);
  document.getElementById(
    'price'
  ).innerText = `${minPrice.toLocaleString()} ~ ${maxPrice.toLocaleString()}`;
}

// -------------------------------------
// 슬라이드 애니메이션
// -------------------------------------

const elements = {
  slidesContainer: document.querySelector('.slides'),
  slideItems: document.querySelectorAll('.slide'),
  prevBtn: document.querySelector('.prev'),
  nextBtn: document.querySelector('.next'),
  paginationContainer: document.querySelector('.slider-pagination'),
};

let state = {
  currentIndex: 0,
  autoplayTimer: null,
  paginationDots: [],
  totalSlides: elements.slideItems.length,
};

// [핵심 변경 1] 슬라이드 표시 함수 (페이드 효과 적용)
function showSlide(index) {
  if (state.totalSlides === 0) return;

  // 순환 인덱스 계산 (ex: -1이면 마지막으로, 마지막 넘으면 처음으로)
  state.currentIndex = (index + state.totalSlides) % state.totalSlides;

  // 기존: 컨테이너를 통째로 이동 (transform)
  // 변경: 개별 슬라이드의 클래스를 토글 (opacity 조절)
  elements.slideItems.forEach((item, i) => {
    const isActive = i === state.currentIndex;
    item.classList.toggle('active', isActive);
    item.setAttribute('aria-hidden', !isActive); // 접근성 추가
  });

  updatePagination();
}

// 페이지네이션(닷) 상태 업데이트
function updatePagination() {
  state.paginationDots.forEach((dot, index) => {
    const isActive = index === state.currentIndex;
    dot.classList.toggle('active', isActive);
    dot.setAttribute('aria-selected', isActive);
    dot.tabIndex = isActive ? 0 : -1;
  });
}

// --- 오토플레이 관련 로직 ---
function stopAutoplay() {
  clearInterval(state.autoplayTimer);
}

function startAutoplay() {
  stopAutoplay(); // 기존 타이머 제거 후 시작
  if (state.totalSlides <= 1) return;
  state.autoplayTimer = setInterval(() => {
    showSlide(state.currentIndex + 1);
  }, 5000);
}

// 마우스 호버나 포커스 상태 체크 (안전한 오토플레이 재시작을 위해)
const isInteracting = () =>
  elements.slidesContainer?.matches(':hover') ||
  elements.paginationContainer?.contains(document.activeElement);

// [핵심 변경 2] 초기화 로직 (복잡했던 map 부분 정리)
function initPagination() {
  if (!elements.paginationContainer || state.totalSlides <= 1) return;

  // 복잡했던 map 내부의 키보드 이벤트 핸들러를 밖으로 분리
  const handleKeydown = (event, index) => {
    const keyMap = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
      Home: -index, // 현재 인덱스를 빼면 0이 됨
      End: state.totalSlides - 1 - index, // 마지막 인덱스로 이동
    };

    if (!keyMap[event.key]) return;
    event.preventDefault();

    const nextIndex =
      (index + keyMap[event.key] + state.totalSlides) % state.totalSlides;
    state.paginationDots[nextIndex]?.focus();
    showSlide(nextIndex);
  };

  // map을 사용해 닷 요소 생성에만 집중
  state.paginationDots = Array.from(elements.slideItems).map((_, index) => {
    const dot = document.createElement('button');
    dot.className = 'slider-dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `${index + 1}번 슬라이드`);

    dot.addEventListener('click', () => {
      showSlide(index);
      if (!isInteracting()) startAutoplay();
    });

    dot.addEventListener('keydown', (e) => handleKeydown(e, index));
    elements.paginationContainer.appendChild(dot);
    return dot;
  });
}

// --- 이벤트 리스너 연결 ---
function attachEvents() {
  // [수정] 버튼이 존재할 때만 이벤트를 연결하도록 변경
  if (elements.prevBtn) {
    elements.prevBtn.addEventListener('click', () =>
      showSlide(state.currentIndex - 1)
    );
  }
  if (elements.nextBtn) {
    elements.nextBtn.addEventListener('click', () =>
      showSlide(state.currentIndex + 1)
    );
  }

  // 공통된 인터랙션 종료 처리
  const handleInteractionEnd = () => {
    // 약간의 지연을 주어 포커스 이동 등을 감지할 시간을 줌
    setTimeout(() => {
      if (!isInteracting()) startAutoplay();
    }, 50);
  };

  elements.slidesContainer?.addEventListener('mouseenter', stopAutoplay);
  elements.slidesContainer?.addEventListener(
    'mouseleave',
    handleInteractionEnd
  );
  elements.paginationContainer?.addEventListener('focusin', stopAutoplay);
  elements.paginationContainer?.addEventListener(
    'focusout',
    handleInteractionEnd
  );
}

// --- 실행 ---
initPagination();
showSlide(state.currentIndex);
startAutoplay();
attachEvents();
