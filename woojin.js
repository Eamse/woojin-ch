// -------------------------------------
// 레이아웃 로드 (헤더/네비)
// -------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  function loadHeaderLayout() {
    fetch('./layout/header-layout.html')
      .then((res) => res.text())
      .then((data) => {
        const header = document.getElementById('header-layout-container');
        if (header) {
          header.innerHTML = data;
          initializeHeaderFunctionality();
        }
      })
      .catch((err) => console.error('Header load error:', err));
  }

  function loadNavLayout() {
    fetch('./layout/nav-layout.html')
      .then((res) => res.text())
      .then((data) => {
        const nav = document.getElementById('nav-layout-container');
        if (nav) {
          nav.innerHTML = data;
          initializeModalFunctionality();
        }
      })
      .catch((err) => console.error('Nav load error:', err));
  }

  loadHeaderLayout();
  loadNavLayout();

  const lowNavWrapper = document.querySelector('.fixed-nav-wrapper');
  if (window.innerWidth < 1050) {
    lowNavWrapper?.style && (lowNavWrapper.style.display = 'block');
  }
});

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
  const menuTitles = document.querySelectorAll('.header-menu-title');
  const header = document.querySelector('.header-side');
  const toggleBtn = document.querySelector('.mobile-toggle-btn');
  const menuItems = document.querySelector('.menu-items');
  const lowNavWrapper = document.querySelector('.fixed-nav-wrapper');
  const scrollToTopBtn = document.querySelector('.sticky-btn.scroll-to-top');

  if (window.innerWidth > 1050) {
    menuTitles.forEach((item) => {
      const sub = item.querySelector('.header-open-menu');
      item.addEventListener('mouseenter', () => {
        sub?.classList.add('show');
        mainOverlay?.classList.add('show');
      });
      item.addEventListener('mouseleave', () => {
        sub?.classList.remove('show');
        mainOverlay?.classList.remove('show');
      });
    });
    lowNavWrapper?.style && (lowNavWrapper.style.display = 'none');
  } else {
    // -------------------------------------
    // 아코디언 메뉴
    //-------------------------------------
    menuTitles.forEach((item) => {
      item.addEventListener('click', (event) => {
        event.preventDefault();
        const subMenu = item.querySelector('.header-open-menu');
        const allSubMenus = document.querySelectorAll('.header-open-menu');
        allSubMenus.forEach((otherSubMenu) => {
          if (otherSubMenu !== subMenu) {
            otherSubMenu?.classList.remove('active');
          }
        });
        subMenu?.classList.toggle('active');
      });
    });
    const hiddenMenuItems = document.querySelectorAll('.header-open-menu a');
    hiddenMenuItems.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.stopPropagation();
      });
    });

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

// -------------------------------------
// 스크롤 애니메이션 (복구)
// -------------------------------------
const items = document.querySelectorAll('.box-item');

const observer = new IntersectionObserver(
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

items.forEach((item) => observer.observe(item));

// -------------------------------------
// 후기 목록: 필터/정렬/더보기/모달
// -------------------------------------
let ALL_REVIEWS = [];
let FILTERED_REVIEWS = [];
let RENDERED_COUNT = 0;
const PAGE_SIZE = 6;

function byDateDESC(a, b) {
  return new Date(b.date) - new Date(a.date);
}
function byDateASC(a, b) {
  return new Date(a.date) - new Date(b.date);
}

function applyFilterAndSort() {
  const regionSel = document.getElementById('filterRegion');
  const sortSel = document.getElementById('sortBy');
  const regionVal = regionSel?.value || '';
  const sortVal = sortSel?.value || 'dateDesc';

  FILTERED_REVIEWS = ALL_REVIEWS.filter(
    (i) => !regionVal || i.region === regionVal
  );
  sortVal === 'dateAsc'
    ? FILTERED_REVIEWS.sort(byDateASC)
    : FILTERED_REVIEWS.sort(byDateDESC);

  RENDERED_COUNT = 0;
  clearReviewList();
  renderNextPage();
  toggleLoadMore();
}

function clearReviewList() {
  const list = document.querySelector('.review');
  if (list) list.innerHTML = '';
}

function renderNextPage() {
  const list = document.querySelector('.review');
  if (!list) return;

  const slice = FILTERED_REVIEWS.slice(
    RENDERED_COUNT,
    RENDERED_COUNT + PAGE_SIZE
  );

  slice.forEach((item) => {
    const li = document.createElement('li');
    li.className = `bundle ${item.id}`;
    li.dataset.reviewId = item.id;
    li.innerHTML = `
      <div class="review-image">
        <img src="${item.src}" alt="${item.alt || ''}" />
      </div>
      <div class="befter-title">
        <h3 class="before-after">${item.label || '시공 후'}</h3>
        <span>${item.date || ''}</span>
      </div>
    `;
    list.appendChild(li);
  });

  RENDERED_COUNT += slice.length;
  toggleLoadMore();
}

function toggleLoadMore() {
  const btn = document.getElementById('loadMoreBtn');
  if (!btn) return;
  btn.style.display =
    RENDERED_COUNT >= FILTERED_REVIEWS.length ? 'none' : 'inline-flex';
}

function buildRegionOptions() {
  const sel = document.getElementById('filterRegion');
  if (!sel) return;

  const regions = Array.from(
    new Set(ALL_REVIEWS.map((r) => r.region).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'ko'));
  regions.forEach((r) => {
    const opt = document.createElement('option');
    opt.value = r;
    opt.textContent = r;
    sel.appendChild(opt);
  });
}

function openReviewModal(item) {
  const modal = document.getElementById('reviewModal');
  if (!modal) return;

  document.getElementById('reviewModalImg').src = item.src;
  document.getElementById('reviewModalImg').alt = item.alt || '';
  document.getElementById('reviewModalTitle').textContent =
    item.label || '시공 상세';
  document.getElementById('reviewModalDate').textContent = item.date
    ? `시공일: ${item.date}`
    : '';
  document.getElementById('reviewModalRegion').textContent = item.region
    ? `지역: ${item.region}`
    : '';
  document.getElementById('reviewModalDesc').textContent = item.desc || '';

  modal.style.display = 'flex';
}

function closeReviewModal() {
  const modal = document.getElementById('reviewModal');
  if (modal) modal.style.display = 'none';
}

async function loadReviews() {
  try {
    const res = await fetch('./reviews.json');
    if (!res.ok) throw new Error('리뷰 데이터를 불러오지 못했습니다.');
    ALL_REVIEWS = await res.json();

    buildRegionOptions();
    applyFilterAndSort();

    document
      .getElementById('filterRegion')
      ?.addEventListener('change', applyFilterAndSort);
    document
      .getElementById('sortBy')
      ?.addEventListener('change', applyFilterAndSort);
    document
      .getElementById('loadMoreBtn')
      ?.addEventListener('click', renderNextPage);

    document.querySelector('.review')?.addEventListener('click', (e) => {
      const li = e.target.closest('li.bundle');
      if (!li) return;
      const item = ALL_REVIEWS.find((r) => r.id === li.dataset.reviewId);
      if (item) openReviewModal(item);
    });

    document
      .querySelector('#reviewModal .modal-close')
      ?.addEventListener('click', closeReviewModal);
    document.getElementById('reviewModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'reviewModal') closeReviewModal();
    });
  } catch (err) {
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', loadReviews);
