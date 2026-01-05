(() => {
  'use strict';

  const resolveApiBase = () => {
    if (window.WOOJIN_API_BASE) {
      return window.WOOJIN_API_BASE.replace(/\/$/, '');
    }
    if (window.location.origin && window.location.origin !== 'null') {
      return `${window.location.origin.replace(/\/$/, '')}/api`;
    }
    return 'http://localhost:4000/api';
  };

  const API_BASE = resolveApiBase();

  const dom = {
    container: document.querySelector('.project-detail-container'),
    title: document.querySelector('[data-project-title]'),
    areaBadge: document.querySelector('[data-project-area-badge]'),
    description: document.querySelector('[data-project-description]'),
    mainImage: document.querySelector('[data-main-image]'),
    thumbnailList: document.querySelector('[data-thumbnail-list]'),
    category: document.querySelector('[data-project-category]'),
    year: document.querySelector('[data-project-year]'),
    period: document.querySelector('[data-project-period]'),
    area: document.querySelector('[data-project-area]'),
    price: document.querySelector('[data-project-price]'),
    priceBreakdown: document.querySelector('[data-price-breakdown]'),
    consultButton: document.getElementById('btn-consult'),
    shareButton: document.getElementById('btn-share'),
  };

  const setLoading = (isLoading) => {
    document.body.classList.toggle('loading', isLoading);
    if (dom.container) {
      dom.container.style.visibility = isLoading ? 'hidden' : 'visible';
    }
  };

  const formatCurrency = (num) => {
    if (typeof num !== 'number' || Number.isNaN(num)) return '가격 정보 없음';
    return `${num.toLocaleString('ko-KR')}원`;
  };

  const formatArea = (m2) => {
    if (typeof m2 !== 'number' || Number.isNaN(m2)) return '면적 정보 없음';
    const pyeong = m2 / 3.305785;
    return `${m2.toFixed(2)}m² (${pyeong.toFixed(1)}평)`;
  };

  const renderGallery = (galleryItems) => {
    if (!galleryItems || galleryItems.length === 0) {
      dom.mainImage.src =
        'https://placehold.co/1200x800/eeeeee/ffffff?text=No+Image';
      dom.mainImage.alt = '이미지가 없습니다.';
      dom.thumbnailList.innerHTML = '';
      return;
    }

    const first = galleryItems[0];
    const lowRes = first.thumbUrl || first.originalUrl;
    const highRes = first.originalUrl;

    dom.mainImage.src = lowRes;
    dom.mainImage.alt = first.alt || '메인 시공 이미지';

    const highImg = new Image();
    highImg.onload = () => {
      dom.mainImage.src = highRes;
    };
    highImg.src = highRes;

    dom.thumbnailList.innerHTML = galleryItems
      .map((img, idx) => {
        const isActive = idx === 0 ? 'active' : '';
        const thumbSrc = img.thumbUrl || img.originalUrl;
        return `
        <li>
          <button class="thumbnail-button ${isActive}" data-index="${idx}">
            <img src="${thumbSrc}" alt="${img.alt || `썸네일 ${idx + 1}`}" />
          </button>
        </li>
      `;
      })
      .join('');
  };

  const renderProjectDetails = (project) => {
    const pyeong = project.area ? (project.area / 3.305785).toFixed(1) : 0;

    dom.title.textContent = project.title || '제목 없음';
    dom.description.textContent =
      project.description || '이 프로젝트에 대한 상세 설명이 준비중입니다.';
    dom.areaBadge.textContent = `${pyeong}평`;

    dom.category.textContent = project.category || '-';
    dom.year.textContent = project.year ? `${project.year}년` : '-';
    dom.period.textContent = project.period || '-';
    dom.area.textContent = formatArea(project.area);
    dom.price.textContent = project.price
      ? `${project.price.toLocaleString('ko-KR')}만원`
      : '견적 문의';

    if (project.costs && project.costs.length > 0) {
      const breakdownHtml = project.costs
        .map((cost) => {
          const amountWon = (cost.amount || 0) * 10000;
          return `
          <li>
            <span style="color: #4b5563;">${cost.label}</span>
            <span style="font-weight: 600;">${formatCurrency(amountWon)}</span>
          </li>
        `;
        })
        .join('');
      dom.priceBreakdown.innerHTML = breakdownHtml;
    } else {
      dom.priceBreakdown.innerHTML =
        '<li style="justify-content: center; color: #9ca3af;">등록된 상세 견적이 없습니다.</li>';
    }

    const galleryItems = [];
    if (project.mainImage) {
      const mainOriginal = project.mainImage;
      const mainThumb = mainOriginal.includes('/original/')
        ? mainOriginal.replace('/original/', '/thumb/')
        : mainOriginal;
      galleryItems.push({
        originalUrl: mainOriginal,
        thumbUrl: mainThumb,
        alt: `${project.title} 대표 이미지`,
      });
    }
    if (project.images && project.images.length > 0) {
      const existing = new Set(galleryItems.map((img) => img.originalUrl));
      project.images.forEach((img) => {
        if (!existing.has(img.originalUrl)) {
          galleryItems.push(img);
        }
      });
    }

    renderGallery(galleryItems);
    dom.thumbnailList.addEventListener('click', (e) =>
      handleThumbnailClick(e, galleryItems)
    );
  };

  const renderError = (message) => {
    dom.title.textContent = '오류';
    dom.description.textContent = message;
    renderGallery([]);
    [
      dom.category,
      dom.year,
      dom.period,
      dom.area,
      dom.price,
      dom.areaBadge,
    ].forEach((el) => el && (el.textContent = '-'));
  };

  const handleThumbnailClick = (event, images) => {
    const button = event.target.closest('.thumbnail-button');
    if (!button) return;
    const index = parseInt(button.dataset.index, 10);
    if (Number.isNaN(index) || !images[index]) return;

    const img = images[index];
    const low = img.thumbUrl || img.originalUrl;
    const high = img.originalUrl;

    dom.mainImage.style.opacity = '0';
    setTimeout(() => {
      dom.mainImage.src = low;
      dom.mainImage.alt = img.alt || '시공 이미지';
      dom.mainImage.style.opacity = '1';

      const pre = new Image();
      pre.onload = () => {
        if (dom.mainImage.src === low) dom.mainImage.src = high;
      };
      pre.src = high;
    }, 150);

    dom.thumbnailList.querySelector('.active')?.classList.remove('active');
    button.classList.add('active');
  };

  const fetchProject = async (id) => {
    const res = await fetch(`${API_BASE}/projects/${id}`);
    if (res.status === 404)
      throw new Error('해당 ID의 프로젝트를 찾을 수 없습니다.');
    if (!res.ok)
      throw new Error(`서버 요청에 실패했습니다. (상태: ${res.status})`);
    const data = await res.json();
    return data.project;
  };

  const init = async () => {
    setLoading(true);
    const projectId = new URLSearchParams(window.location.search).get('id');
    if (!projectId) {
      renderError('프로젝트 ID가 URL에 없습니다.');
      setLoading(false);
      return;
    }

    try {
      const project = await fetchProject(projectId);
      if (!project) throw new Error('프로젝트 데이터가 비어있습니다.');
      renderProjectDetails(project);

      dom.consultButton?.addEventListener('click', () => {
        const consultUrl = `/consulting/consulting.html?ref_project=${encodeURIComponent(
          project.title
        )}`;
        window.location.href = consultUrl;
      });

      dom.shareButton?.addEventListener('click', async () => {
        const url = window.location.href;
        if (navigator.share) {
          try {
            await navigator.share({ title: document.title || '', url });
            return;
          } catch (err) {
            console.error('navigator.share 실패:', err);
          }
        }
        if (navigator.clipboard && window.isSecureContext) {
          try {
            await navigator.clipboard.writeText(url);
            alert('링크가 클립보드에 복사되었습니다.');
            return;
          } catch (err) {
            console.error('clipboard 실패:', err);
          }
        }
        window.prompt(
          '이 링크를 복사해서 사용해주세요.\n(단축키: Cmd+C 또는 Ctrl+C)',
          url
        );
      });
    } catch (error) {
      console.error('페이지 초기화 중 오류 발생:', error);
      renderError(error.message);
    } finally {
      setLoading(false);
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
