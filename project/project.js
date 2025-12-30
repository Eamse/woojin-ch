console.log('🚀 [Project] Script Loaded');

const initProjectPage = () => {
  console.log('🚀 [Project] Init Started');
  // ---------------------------------------------------------
  // [추가] 헤더/네비게이션 레이아웃 로드 (index.js 의존성 제거)
  // ---------------------------------------------------------
  const layoutBase = '/layout/';

  function loadHeaderLayout() {
    fetch(`${layoutBase}header-layout.html`)
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
    fetch(`${layoutBase}nav-layout.html`)
      .then((res) => res.text())
      .then((data) => {
        const nav = document.getElementById('nav-layout-container');
        if (nav) nav.innerHTML = data;
      })
      .catch((err) => console.error('Nav load error:', err));
  }

  function initializeHeaderFunctionality() {
    const toggleBtn = document.querySelector('.mobile-toggle-btn');
    const menuItems = document.querySelector('.menu-items');
    const mainOverlay = document.querySelector('.header-overlay');

    toggleBtn?.addEventListener('click', () => {
      menuItems?.classList.toggle('active');
      mainOverlay?.classList.toggle('active');
    });

    mainOverlay?.addEventListener('click', () => {
      menuItems?.classList.remove('active');
      mainOverlay?.classList.remove('active');
    });
  }

  loadHeaderLayout();
  loadNavLayout();

  const apiBase =
    document.querySelector('meta[name="woojin-api-base"]')?.content ||
    'http://127.0.0.1:4000/api';

  console.log('🚀 [Project] API Base:', apiBase);

  let allProjects = [];
  let currentCategory = '';
  let searchQuery = '';
  let sortOption = 'recent';

  const grid = document.getElementById('project-grid');
  const emptyMsg = document.getElementById('project-empty');
  const filterBtns = document.querySelectorAll('#project-filter .chip');
  const searchInput = document.getElementById('project-search');
  const searchBtn = document.getElementById('project-search-btn');
  const sortSelect = document.getElementById('project-sort');

  // 초기 로드
  loadProjects();

  // 1. 필터 버튼 이벤트
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      currentCategory = btn.dataset.cat;
      render();
    });
  });

  // 2. 검색 이벤트
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      render();
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        searchQuery = e.target.value.trim().toLowerCase();
        render();
      }
    });
  }
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      searchQuery = searchInput.value.trim().toLowerCase();
      render();
    });
  }

  // 3. 정렬 이벤트
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortOption = e.target.value;
      render();
    });
  }

  async function loadProjects() {
    try {
      console.log('🚀 [Project] Fetching projects...');
      const res = await fetch(`${apiBase}/projects`);
      if (!res.ok) throw new Error('Failed to load projects');
      const data = await res.json();
      allProjects = data.projects || [];
      console.log('🚀 [Project] Projects loaded:', allProjects.length);
      render();
    } catch (err) {
      console.error('❌ [Project] Load Error:', err);
      if (emptyMsg) {
        emptyMsg.textContent = '프로젝트를 불러오지 못했습니다.';
        emptyMsg.hidden = false;
      }
    }
  }

  function render() {
    if (!grid) return;

    // 필터링
    let filtered = allProjects.filter((p) => {
      // 카테고리 필터
      if (currentCategory && p.category !== currentCategory) return false;
      // 검색어 필터
      if (searchQuery) {
        const title = (p.title || '').toLowerCase();
        const loc = (p.location || '').toLowerCase();
        if (!title.includes(searchQuery) && !loc.includes(searchQuery))
          return false;
      }
      return true;
    });

    // 정렬
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOption === 'oldest' ? dateA - dateB : dateB - dateA;
    });

    // 렌더링
    grid.innerHTML = '';
    if (filtered.length === 0) {
      if (emptyMsg) emptyMsg.hidden = false;
      return;
    }
    if (emptyMsg) emptyMsg.hidden = true;

    filtered.forEach((p) => {
      let thumb = p.mainImage;
      if (!thumb && p.images && p.images.length > 0) {
        // [화질 개선] mediumUrl 우선 사용
        thumb =
          p.images[0].mediumUrl ||
          p.images[0].thumbUrl ||
          p.images[0].originalUrl;
      }
      if (thumb && !thumb.startsWith('http') && !thumb.startsWith('data:')) {
        const serverBase = apiBase.replace(/\/api\/?$/, '');
        thumb = `${serverBase}${thumb.startsWith('/') ? '' : '/'}${thumb}`;
      }
      if (!thumb) thumb = 'https://placehold.co/480x320?text=No+Image';

      const li = document.createElement('li');
      li.className = 'project-card';
      li.innerHTML = `
        <a href="/project/project-detail.html?id=${p.id}">
          <div class="project-thumb-wrap">
            <img src="${thumb}" alt="${
        p.title
      }" loading="lazy" onerror="this.src='https://placehold.co/480x320?text=No+Image';" />
          </div>
          <figcaption>
            <span class="project-location">${
              p.location || p.category || '시공 사례'
            }</span>
            <h3 class="project-title">${p.title}</h3>
          </figcaption>
        </a>
      `;
      grid.appendChild(li);
    });
  }
};

// [수정] DOM 로드 상태에 따라 안전하게 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProjectPage);
} else {
  initProjectPage();
}
