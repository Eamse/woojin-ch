console.log('🚀 [Project Detail] Script Loaded');

function initProjectDetail() {
  console.log('🚀 [Project Detail] Initializing...');

  const container = document.getElementById('detail-container');
  if (!container) {
    console.error('❌ [Error] detail-container not found');
    return;
  }

  // ---------------------------------------------------------
  // 1. 레이아웃 로드 (헤더/네비)
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
      });
  }

  function loadNavLayout() {
    fetch(`${layoutBase}nav-layout.html`)
      .then((res) => res.text())
      .then((data) => {
        const nav = document.getElementById('nav-layout-container');
        if (nav) nav.innerHTML = data;
      });
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

  // ---------------------------------------------------------
  // 2. 프로젝트 상세 데이터 로드
  // ---------------------------------------------------------
  const apiBase =
    document.querySelector('meta[name="woojin-api-base"]')?.content ||
    'https://woojin-ch.kr/api';

  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('id');

  if (!projectId) {
    console.warn('⚠️ [Warning] No Project ID found');
    container.innerHTML = `
      <div style="text-align:center; padding:4rem;">
        <h3>잘못된 접근입니다.</h3>
        <p>프로젝트 ID가 확인되지 않습니다.</p>
        <a href="/project" class="btn outline" style="margin-top:20px;">목록으로 돌아가기</a>
      </div>`;
    return;
  }

  fetchProject(projectId);

  async function fetchProject(id) {
    try {
      console.log(`📡 Fetching project ID: ${id}`);
      const res = await fetch(`${apiBase}/projects/${id}`);
      if (!res.ok) throw new Error('프로젝트를 찾을 수 없습니다.');
      const data = await res.json();
      renderDetail(data.project);
    } catch (err) {
      console.error(err);
      container.innerHTML = `<div style="text-align:center; padding:4rem;">
        <h3>프로젝트를 불러오지 못했습니다.</h3>
        <p>${err.message}</p>
        <a href="/project" class="btn outline" style="margin-top:20px;">목록으로 돌아가기</a>
      </div>`;
    }
  }

  function renderDetail(p) {
    // 이미지 URL 처리
    const serverBase = apiBase.replace(/\/api\/?$/, '');
    const processImgUrl = (url) => {
      if (!url) return null;
      if (url.startsWith('http') || url.startsWith('data:')) return url;
      return `${serverBase}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    // 이미지 렌더링 (중복 방지)
    let imagesHtml = '';
    const allImages = [];

    // mainImage와 동일한 이미지를 찾기 위한 모든 URL 패턴
    const mainImageUrls = new Set();
    if (p.mainImage) {
      mainImageUrls.add(p.mainImage);
    }

    if (p.images && p.images.length > 0) {
      p.images.forEach((img) => {
        // 모든 URL 변형 수집
        const urls = [
          img.originalUrl,
          img.largeUrl,
          img.mediumUrl,
          img.thumbUrl
        ].filter(Boolean);

        // mainImage와 일치하는지 확인
        const isMainImage = urls.some(url => mainImageUrls.has(url));

        if (isMainImage && mainImageUrls.size > 0) {
          // mainImage와 같은 이미지는 한 번만 추가
          if (allImages.length === 0) {
            const url = img.originalUrl || img.largeUrl || img.mediumUrl;
            if (url) allImages.push(url);
          }
        } else {
          // 일반 이미지는 그냥 추가
          const url = img.originalUrl || img.largeUrl || img.mediumUrl;
          if (url) allImages.push(url);
        }
      });
    }

    // 렌더링
    allImages.forEach((url) => {
      imagesHtml += `<figure class="gallery-image"><img src="${processImgUrl(
        url,
      )}" alt="${p.title}" loading="lazy" /></figure>`;
    });

    // 견적 정보 HTML 생성
    let costHtml = '';
    if (p.costs && p.costs.length > 0) {
      const rows = p.costs
        .map(
          (c) => `
        <div class="cost-row">
          <span>${c.label}</span>
          <span>${parseInt(c.amount).toLocaleString()}만원</span>
        </div>
      `,
        )
        .join('');

      const total = p.costs.reduce(
        (sum, c) => sum + (parseInt(c.amount) || 0),
        0,
      );

      costHtml = `
        <div class="detail-costs-wrap">
          <h3>Estimated Cost</h3>
          ${rows}
          <div class="cost-row total">
            <span>TOTAL</span>
            <span>${total.toLocaleString()}만원</span>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <aside class="detail-sidebar">
        <div class="detail-header-group">
          <span class="detail-category-label">${p.category || 'PROJECT'}</span>
          <h1 class="detail-title">${p.title}</h1>
        </div>

        <div class="detail-info-list">
          <div class="info-item">
            <span class="info-label">Location</span>
            <span class="info-value">${p.location || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Area</span>
            <span class="info-value">${p.area ? p.area + '평' : '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Year</span>
            <span class="info-value">${p.year || '-'}</span>
          </div>
        </div>

        <div class="detail-description">${p.description || ''}</div>

        ${costHtml}

        <a href="/project" class="btn-back-list">
          <i class="fa-solid fa-arrow-left-long"></i> Back to List
        </a>
      </aside>

      <div class="detail-gallery">
        ${imagesHtml}
      </div>
    `;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProjectDetail);
} else {
  initProjectDetail();
}
