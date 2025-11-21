document.addEventListener('DOMContentLoaded', () => {
  // -------------------------------
  // Header fetch
  // -------------------------------
  function loadHeaderLayout() {
    fetch('./layout/header-layout.html')
      .then((response) => response.text())
      .then((data) => {
        const container = document.getElementById('header-layout-container');
        if (container) {
          container.innerHTML = data;
          initializeHeaderFunctionality();
        }
      })
      .catch((error) =>
        console.error('Error loading header-layout.html:', error)
      );
  }

  // -------------------------------
  // Nav fetch
  // -------------------------------
  function loadNavLayout() {
    fetch('./layout/nav-layout.html')
      .then((response) => response.text())
      .then((data) => {
        const container = document.getElementById('nav-layout-container');
        if (container) {
          container.innerHTML = data;
          initializeModalFunctionality(); // ✅ 네비 로드 후 모달 이벤트 연결
        }
      })
      .catch((error) => console.error('Error loading nav-layout.html:', error));
  }

  loadHeaderLayout();
  loadNavLayout();

  // -------------------------------
  // 모바일용 고정 네비
  // -------------------------------
  const lowNavWrapper = document.querySelector('.fixed-nav-wrapper');
  if (window.innerWidth < 1050) {
    lowNavWrapper?.style && (lowNavWrapper.style.display = 'block');
  }
});

// -------------------------------
// 무료견적 모달 초기화
// -------------------------------
function initializeModalFunctionality() {
  const modal = document.getElementById('estimateModal');
  const openModalBtn = document.getElementById('openEstimateModal');
  const closeModalBtn = document.querySelector('.modal-close');
  const typeBtns = document.querySelectorAll('.type-btn');
  const steps = document.querySelectorAll('.step');
  const step01 = document.querySelector('.step01');
  const step02Apartment = document.querySelector('.step02-apartment');
  const step02House = document.querySelector('.step02-house');

  // -------------------------------
  // 모달 열기
  // -------------------------------
  if (openModalBtn) {
    openModalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      modal.style.display = 'flex';
      steps.forEach((step) => step.classList.remove('active'));
      step01.classList.add('active');
    });
  }

  // -------------------------------
  // 모달 닫기
  // -------------------------------
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }

  // STEP01: 집 유형 선택 → STEP02 바로 이동
  typeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const selectedType = btn.dataset.type;

      steps.forEach((step) => step.classList.remove('active'));

      if (selectedType === 'apartment') {
        step02Apartment.classList.add('active');
      } else {
        step02House.classList.add('active');
      }
    });
  });

  // -------------------------------
  // 바깥 클릭 시 닫기
  // -------------------------------
  window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });
}

// -------------------------------
// 헤더/메뉴 기능 초기화
// -------------------------------
function initializeHeaderFunctionality() {
  const mainOverlay = document.querySelector('.header-overlay');
  const menuTitles = document.querySelectorAll('.header-menu-title');
  const header = document.querySelector('.header-side');
  const videoSection = document.querySelector('.video-size');
  const slideImage = document.querySelector('.slide');
  const toggleBtn = document.querySelector('.mobile-toggle-btn');
  const menuItems = document.querySelector('.menu-items');
  const lowNavWrapper = document.querySelector('.fixed-nav-wrapper');
  const scrollToTopBtn = document.querySelector('.sticky-btn.scroll-to-top');

  // -------------------------------
  //드롭다운
  // -------------------------------
  if (window.innerWidth > 1050) {
    menuTitles.forEach((item) => {
      const subMenu = item.querySelector('.header-open-menu');
      item.addEventListener('mouseenter', () => {
        subMenu?.classList.add('show');
        mainOverlay?.classList.add('show');
      });
      item.addEventListener('mouseleave', () => {
        subMenu?.classList.remove('show');
        mainOverlay?.classList.remove('show');
      });
    });
    lowNavWrapper?.style && (lowNavWrapper.style.display = 'none');
  } else {
    // -------------------------------
    //아코디언 (모바일)
    // -------------------------------
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

  // -------------------------------
  // 토글 버튼 클릭
  // -------------------------------
  toggleBtn?.addEventListener('click', () => {
    menuItems?.classList.toggle('active');
    mainOverlay?.classList.toggle('active');

    const icon = toggleBtn.querySelector('i');
    if (icon) {
      // if 함수에 아이콘 매개변수 추가
      if (menuItems?.classList.contains('active')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-xmark');
      } else {
        icon.classList.remove('fa-xmark');
        icon.classList.add('fa-bars');
      }
    }
  });

  // -------------------------------
  // 오버레이 클릭 시 메뉴 닫기
  // -------------------------------
  mainOverlay?.addEventListener('click', () => {
    menuItems?.classList.remove('active');
    mainOverlay?.classList.remove('active');
  });

  // -------------------------------
  // 스크롤 감지
  // -------------------------------
  if (header && (videoSection || slideImage)) {
    const videoHeight = videoSection?.offsetHeight || 0;
    const imageHeight = slideImage?.offsetHeight || 0;

    window.addEventListener('scroll', () => {
      const scrollPosition = window.scrollY;

      if (scrollPosition > videoHeight && scrollPosition > imageHeight) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }

      if (scrollToTopBtn) {
        if (scrollPosition > videoHeight && scrollPosition > imageHeight) {
          scrollToTopBtn.classList.add('show');
        } else {
          scrollToTopBtn.classList.remove('show');
        }
      }
    });
  }
}

// -------------------------------
// 온라인 견적 계산기
// -------------------------------
function calc() {
  const width = parseFloat(document.getElementById('width').value);
  const height = parseFloat(document.getElementById('height').value);
  const type = parseFloat(document.getElementById('type').value);
  const option = parseFloat(document.getElementById('option').value);
  const accessory = parseFloat(document.getElementById('accessory').value);

  if (!width || !height) {
    alert('가로와 세로를 입력해주세요.');
    return;
  }

  const area = width * height; // cm²
  let price = (area * type) / 10000 + option;

  // 가격 범위 ±10%
  const minPrice = Math.floor(price * 0.9);
  const maxPrice = Math.ceil(price * 1.1);

  document.getElementById(
    'price'
  ).innerText = `${minPrice.toLocaleString()} ~ ${maxPrice.toLocaleString()}`;
}

// -------------------------------
// 슬라이드 에니메이션
// -------------------------------
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
        ) {
          return;
        }

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

        const increment =
          event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
        const nextIndex =
          (index + increment + paginationDots.length) % paginationDots.length;
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
  if (!isHoveringSlides() && !hasFocusedDot()) {
    startAutoplay();
  }
});

next?.addEventListener('click', () => {
  showSlide(current + 1);
  if (!isHoveringSlides() && !hasFocusedDot()) {
    startAutoplay();
  }
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

showSlide(current);
startAutoplay();

// -------------------------------
// 스크롤 애니메이션
// -------------------------------
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

// -------------------------------
// 더 보기/닫기 버튼
// -------------------------------
document.querySelectorAll('.btn-space').forEach((btn) => {
  btn.addEventListener('click', (n) => {
    n.preventDefault();
    const details = btn.parentElement.querySelector('.box-comment-details');
    details.classList.toggle('show');
    btn.innerText = details.classList.contains('show') ? '닫기' : '더 보기';
  });
});

// -------------------------------
// 지도
// -------------------------------
function initMap() {
  const location = { lat: 37.36625, lng: 126.9435 };

  const map = new google.maps.Map(document.getElementById('map'), {
    center: location,
    zoom: 14,
  });

  const marker = new google.maps.Marker({
    position: location,
    map: map,
    title: '우진인테리어',
  });
}
