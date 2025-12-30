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
        // 다시 스크롤 올렸을 때 애니메이션을 반복하고 싶지 않다면 이 부분을 주석 처리
        entry.target.classList.remove('show');
      }
    });
  },
  { threshold: 0.01 }
);

document.addEventListener('DOMContentLoaded', () => {
  const layoutBase = '/layout/';

  function loadHeaderLayout() {
    fetch(`${layoutBase}header-layout.html`)
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

  // [수정] 빠져있던 API 호출 함수 실행
  initLatestProjects();

  const lowNavWrapper = document.querySelector('.fixed-nav-wrapper');
  if (window.innerWidth < 1050) {
    lowNavWrapper?.style && (lowNavWrapper.style.display = 'block');
  }

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
  const lowNavWrapper = document.querySelector('.fixed-nav-wrapper');
  const scrollToTopBtn = document.querySelector('.sticky-btn.scroll-to-top');

  if (window.innerWidth > 1050) {
    lowNavWrapper?.style && (lowNavWrapper.style.display = 'none');
  } else {
    lowNavWrapper?.style && (lowNavWrapper.style.display = 'block');
  }

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
const slides = document.querySelector('.slides');
const slide = document.querySelectorAll('.slide');
const prev = document.querySelector('.prev');
const next = document.querySelector('.next');
const pagination = document.querySelector('.slider-pagination');

let current = 0;
let autoplayTimer = null;
let paginationDots = [];

function updatePagination(activeIndex) {
  paginationDots.forEach((dot, index) => {
    const isActive = index === activeIndex;
    dot.classList.toggle('active', isActive);
    dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
    dot.tabIndex = isActive ? 0 : -1;
  });
}

function showSlide(index) {
  if (!slides || !slide.length) return;
  current = (index + slide.length) % slide.length;
  slides.style.transform = `translateX(${-current * 100}%)`;
  updatePagination(current);
}

function stopAutoplay() {
  if (!autoplayTimer) return;
  clearInterval(autoplayTimer);
  autoplayTimer = null;
}

function isHoveringSlides() {
  return Boolean(slides?.matches(':hover'));
}

function hasFocusedDot() {
  return Boolean(pagination?.contains(document.activeElement));
}

function startAutoplay() {
  stopAutoplay();
  if (slide.length <= 1) return;
  autoplayTimer = setInterval(() => {
    showSlide(current + 1);
  }, 5000);
}

function handleDotClick(index) {
  showSlide(index);
  if (!isHoveringSlides() && !hasFocusedDot()) {
    startAutoplay();
  }
}

if (pagination) {
  if (slide.length <= 1) {
    pagination.classList.add('hidden');
    pagination.setAttribute('aria-hidden', 'true');
  } else {
    pagination.setAttribute('aria-hidden', 'false');
    paginationDots = Array.from(slide).map((_, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'slider-dot';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `슬라이드 ${index + 1}`);
      dot.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
      dot.tabIndex = index === 0 ? 0 : -1;
      if (index === 0) dot.classList.add('active');
      dot.addEventListener('click', () => handleDotClick(index));
      dot.addEventListener('keydown', (event) => {
        if (
          ![
            'ArrowRight',
            'ArrowLeft',
            'ArrowUp',
            'ArrowDown',
            'Home',
            'End',
          ].includes(event.key)
        )
          return;

        event.preventDefault();

        if (event.key === 'Home') {
          paginationDots[0]?.focus();
          handleDotClick(0);
          return;
        }
        if (event.key === 'End') {
          const lastIndex = paginationDots.length - 1;
          paginationDots[lastIndex]?.focus();
          handleDotClick(lastIndex);
          return;
        }
        const inc =
          event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
        const nextIndex =
          (index + inc + paginationDots.length) % paginationDots.length;
        paginationDots[nextIndex]?.focus();
        handleDotClick(nextIndex);
      });
      pagination.appendChild(dot);
      return dot;
    });
  }
}

prev?.addEventListener('click', () => {
  showSlide(current - 1);
  if (!isHoveringSlides() && !hasFocusedDot()) startAutoplay();
});

next?.addEventListener('click', () => {
  showSlide(current + 1);
  if (!isHoveringSlides() && !hasFocusedDot()) startAutoplay();
});

slides?.addEventListener('mouseenter', stopAutoplay);
slides?.addEventListener('mouseleave', () => {
  if (!hasFocusedDot()) startAutoplay();
});

pagination?.addEventListener('focusin', stopAutoplay);
pagination?.addEventListener('focusout', (event) => {
  if (!pagination.contains(event.relatedTarget) && !isHoveringSlides()) {
    startAutoplay();
  }
});

// 첫 슬라이드 세팅
showSlide(current);
startAutoplay();
