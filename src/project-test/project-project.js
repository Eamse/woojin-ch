const projectState = {
  category: '',
  sort: 'recent',
  limit: 12,
  page: 1,
  total: 0,
};

const gridEl = document.getElementById('project-grid');
const paginationEl = document.getElementById('project-pagination');
const statusEl = document.getElementById('project-status');
const filterForm = document.getElementById('project-filter');

const modal = document.getElementById('project-modal');
const modalImage = document.getElementById('modal-image');
const modalTitle = document.getElementById('modal-title');
const modalCategory = document.getElementById('modal-category');
const modalCloseBtn = modal.querySelector('.modal-close');

const buildParams = () => {
  const params = new URLSearchParams({
    page: projectState.page,
    limit: projectState.limit,
    sort: projectState.sort,
  });
  if (projectState.category) params.set('category', projectState.category);
  return params.toString();
};

const openModal = (item) => {
  modalImage.src = item.urls?.large || item.urls?.medium || item.urls?.original;
  modalTitle.textContent = item.title || item.name;
  modalCategory.textContent = item.category || '카테고리 없음';
  modal.classList.add('open');
};

const closeModal = () => {
  modal.classList.remove('open');
};

modalCloseBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (event) => {
  if (event.target === modal) {
    closeModal();
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeModal();
  }
});

const createCard = (item) => {
  const card = document.createElement('article');
  card.className = 'card project-card';

  const img = document.createElement('img');
  img.src = item.urls?.thumb || item.urls?.medium || item.urls?.original;
  img.alt = item.title || item.name;

  const title = document.createElement('h3');
  title.textContent = item.title || '제목 미입력';

  const category = document.createElement('p');
  category.textContent = item.category || '카테고리 없음';

  card.append(img, title, category);
  card.addEventListener('click', () => openModal(item));
  return card;
};

const renderCards = (items) => {
  if (!items.length) {
    gridEl.innerHTML = '<p>표시할 시공사례가 없습니다.</p>';
    return;
  }
  gridEl.innerHTML = '';
  items.forEach((item) => gridEl.appendChild(createCard(item)));
};

const renderPagination = () => {
  const totalPages = Math.max(1, Math.ceil(projectState.total / projectState.limit));
  if (totalPages === 1) {
    paginationEl.innerHTML = '';
    return;
  }

  paginationEl.innerHTML = '';

  const prev = document.createElement('button');
  prev.className = 'btn secondary';
  prev.textContent = '이전';
  prev.disabled = projectState.page === 1;
  prev.addEventListener('click', () => {
    if (projectState.page > 1) {
      projectState.page -= 1;
      loadProjects();
    }
  });

  const indicator = document.createElement('span');
  indicator.textContent = `${projectState.page} / ${totalPages}`;

  const next = document.createElement('button');
  next.className = 'btn secondary';
  next.textContent = '다음';
  next.disabled = projectState.page >= totalPages;
  next.addEventListener('click', () => {
    if (projectState.page < totalPages) {
      projectState.page += 1;
      loadProjects();
    }
  });

  paginationEl.append(prev, indicator, next);
};

const loadProjects = async () => {
  try {
    const query = buildParams();
    const data = await window.apiFetch(`/api/uploads?${query}`);
    projectState.total = data.total;
    renderCards(data.items);
    renderPagination();
    statusEl.textContent = `총 ${data.total}건 · ${projectState.page}페이지 / ${Math.max(
      1,
      Math.ceil(data.total / projectState.limit)
    )}페이지`;
  } catch (error) {
    gridEl.innerHTML = '<p>목록을 불러오지 못했습니다.</p>';
    window.showNotice(error.message || '조회 실패', 'error');
  }
};

filterForm.addEventListener('change', () => {
  const formData = new FormData(filterForm);
  projectState.category = (formData.get('category') || '').trim();
  projectState.sort = formData.get('sort') || 'recent';
  projectState.limit = Number(formData.get('limit')) || 12;
  projectState.page = 1;
  loadProjects();
});

loadProjects();
