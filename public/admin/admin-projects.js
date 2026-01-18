console.log('🚀 [Start] admin-projects.js 스크립트 로드됨');

const initAdminProjects = () => {
  console.log('🚀 [Init] initAdminProjects 함수 실행');

  // 메타 태그에서 API 주소 가져오기 (없으면 로컬 기본값)
  const API_BASE =
    document.querySelector('meta[name="woojin-api-base"]')?.content ||
    'https://woojin-ch.kr/api';

  const token = localStorage.getItem('token');

  // ---------------------------------------------------------
  // 1. 인증 체크
  // ---------------------------------------------------------
  if (!token) {
    alert('로그인이 필요합니다.');
    window.location.href = '/src/admin-login.html';
    return;
  }

  // 로그아웃 기능
  window.logout = () => {
    localStorage.removeItem('token');
    window.location.href = '/src/admin-login.html';
  };

  // ---------------------------------------------------------
  // 2. DOM 요소 참조
  // ---------------------------------------------------------
  const form = document.getElementById('createForm');
  if (!form) {
    console.error('❌ [Error] 폼(createForm)을 찾을 수 없습니다.');
    // 페이지에 폼이 없는 경우(다른 페이지) 에러를 띄우지 않고 조용히 리턴하거나 경고
    return;
  }

  // [중요] 폼 제출 이벤트 연결
  form.addEventListener('submit', handleFormSubmit);

  const projectIdInput = document.getElementById('projectIdInput');
  const submitBtn = document.getElementById('submitBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const projectListEl = document.getElementById('projectList');
  const costListContainer = document.getElementById('costListContainer');
  const btnAddCost = document.getElementById('btnAddCost');
  const totalPriceDisplay = document.getElementById('totalPriceDisplay');

  // [추가] 필터링을 위한 전역 변수 및 요소 참조
  let allProjectsData = [];
  let currentFilter = 'all';
  const filterBtns = document.querySelectorAll('.filter-btn');

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      filterAndRender();
    });
  });

  // ---------------------------------------------------------
  // 3. 초기화 및 이벤트 리스너
  // ---------------------------------------------------------
  try {
    loadProjects();

    if (cancelBtn) {
      cancelBtn.addEventListener('click', resetForm);
    }
    if (btnAddCost) {
      btnAddCost.addEventListener('click', () => addCostItem());
    }
  } catch (initErr) {
    console.error('❌ [Error] 초기화 중 오류 발생:', initErr);
  }

  // ---------------------------------------------------------
  // 4. 프로젝트 목록 불러오기
  // ---------------------------------------------------------
  async function loadProjects() {
    try {
      projectListEl.innerHTML = '<div class="loading-msg">로딩 중...</div>';

      const res = await fetch(`${API_BASE}/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('목록을 불러오지 못했습니다.');

      const data = await res.json();
      // 백엔드 응답 구조에 따라 data.projects 또는 data.items 확인
      allProjectsData = data.projects || data.items || [];

      filterAndRender();
    } catch (err) {
      console.error(err);
      projectListEl.innerHTML = `<div style="color:red; padding:20px;">오류: ${err.message}</div>`;
    }
  }

  // [추가] 필터링 및 렌더링 함수
  function filterAndRender() {
    let filtered = allProjectsData;
    if (currentFilter !== 'all') {
      filtered = allProjectsData.filter((p) => p.category === currentFilter);
    }
    renderProjects(filtered);
  }

  function renderProjects(projects) {
    projectListEl.innerHTML = '';

    if (projects.length === 0) {
      projectListEl.innerHTML =
        '<div style="padding:20px; color:#666;">등록된 프로젝트가 없습니다.</div>';
      return;
    }

    projects.forEach((p) => {
      // [수정] 이미지 URL 처리 로직 간소화 (R2 URL은 이미 http로 시작함)
      let imgUrl = '';

      // 1순위: mainImage 필드 확인
      if (p.mainImage) {
        imgUrl = p.mainImage;
      }
      // 2순위: images 배열의 첫 번째 요소 확인
      else if (p.images && p.images.length > 0) {
        const firstImg = p.images[0];
        // [화질 개선] mediumUrl 우선 사용 (없으면 thumb -> original)
        imgUrl =
          firstImg.mediumUrl || firstImg.thumbUrl || firstImg.originalUrl;
      }

      // 만약 URL이 상대경로(/uploads...)로 시작한다면 로컬 서버 주소 붙이기 (레거시 호환)
      if (imgUrl && !imgUrl.startsWith('http')) {
        // API_BASE에서 '/api'를 제거한 루트 주소 추출
        const serverRoot = API_BASE.replace(/\/api\/?$/, '');
        imgUrl = `${serverRoot}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
      }

      const card = document.createElement('div');
      // [수정] CSS 파일(admin-projects.css)의 스타일을 따르도록 클래스명 변경
      card.className = 'project-item';

      card.innerHTML = `
        <div class="p-thumb">
          ${
            imgUrl
              ? `<img src="${imgUrl}" alt="${p.title}" 
                   onerror="this.onerror=null; this.src='https://via.placeholder.com/300?text=No+Image';">`
              : `<div style="display:flex; align-items:center; justify-content:center; height:100%; color:#999;">No Image</div>`
          }
        </div>
        <div class="p-content">
          <div class="p-header">
            <span class="p-id">#${p.id}</span>
            <span class="p-meta-row">${p.category || '미지정'}</span>
          </div>
          <h3 class="p-title">${p.title}</h3>
          <div class="p-desc">${p.location || '-'} | ${p.year || '-'}</div>
          <div class="p-actions">
            <button type="button" class="btn-action btn-view btn-edit">수정</button>
            <button type="button" class="btn-action btn-del btn-delete">삭제</button>
          </div>
        </div>
      `;

      card
        .querySelector('.btn-edit')
        .addEventListener('click', () => editProject(p));
      card
        .querySelector('.btn-delete')
        .addEventListener('click', () => deleteProject(p.id));

      projectListEl.appendChild(card);
    });
  }

  // ---------------------------------------------------------
  // 5. 폼 핸들링 (등록 / 수정)
  // ---------------------------------------------------------
  async function handleFormSubmit(e) {
    e.preventDefault();

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = '저장 중...';
    }

    try {
      const id = projectIdInput.value;
      const isEdit = !!id;

      // 1) 텍스트 데이터 수집
      const formData = new FormData(form);
      const payload = {
        title: formData.get('title'),
        location: formData.get('location'),
        category: formData.get('category'),
        year: formData.get('year'),
        period: formData.get('period'),
        area: formData.get('area'),
        description: formData.get('description'),
        costs: getCostData(), // 견적 데이터 배열
      };

      // 2) 프로젝트 생성/수정 요청
      const url = isEdit
        ? `${API_BASE}/projects/${id}`
        : `${API_BASE}/projects`;
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '프로젝트 저장 실패');
      }

      const data = await res.json();
      const projectId = isEdit ? id : data.project?.id || data.id; // 응답 구조 대응

      if (!projectId) throw new Error('프로젝트 ID를 확인할 수 없습니다.');

      // 3) 이미지 업로드 처리
      const mainFile = formData.get('mainImageFile');
      const detailInput = document.querySelector(
        'input[name="detailImageFiles"]',
      );
      const detailFiles = detailInput ? detailInput.files : [];

      // [파일 크기 검사]
      const MAX_SIZE = 20 * 1024 * 1024; // 20MB
      if (mainFile && mainFile.size > MAX_SIZE)
        throw new Error('대표 이미지가 20MB를 초과합니다.');

      if (detailFiles.length > 0) {
        for (let i = 0; i < detailFiles.length; i++) {
          if (detailFiles[i].size > MAX_SIZE) {
            throw new Error(
              `상세 이미지(${detailFiles[i].name})가 20MB를 초과합니다.`,
            );
          }
        }
      }

      // 이미지가 하나라도 있으면 업로드 진행
      const hasMain = mainFile && mainFile.size > 0;
      const hasDetail = detailFiles && detailFiles.length > 0;

      if (hasMain || hasDetail) {
        submitBtn.innerText = '이미지 업로드 중...';

        const imageFormData = new FormData();
        if (hasMain) imageFormData.append('mainImageFile', mainFile);

        if (hasDetail) {
          for (let i = 0; i < detailFiles.length; i++) {
            imageFormData.append('detailImageFiles', detailFiles[i]);
          }
        }

        const uploadRes = await fetch(
          `${API_BASE}/projects/${projectId}/images`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: imageFormData, // Content-Type은 자동 설정됨
          },
        );

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          // 이미지는 실패했지만 프로젝트는 생성된 상태
          alert(
            `프로젝트는 저장되었으나 이미지 업로드에 실패했습니다.\n사유: ${
              errData.error || uploadRes.statusText
            }`,
          );
          loadProjects();
          return;
        }

        // [대표 이미지 업데이트]
        // 업로드 라우터가 반환한 정보에서 mainImageFile 찾기
        const uploadData = await uploadRes.json();

        if (hasMain && uploadData.items) {
          const mainItem = uploadData.items.find(
            (item) => item.fieldname === 'mainImageFile',
          );

          if (mainItem && mainItem.urls) {
            // R2 URL이 반환되었으므로 업데이트 수행
            const newMainImageUrl =
              mainItem.urls.thumb || mainItem.urls.original;

            await fetch(`${API_BASE}/projects/${projectId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ mainImage: newMainImageUrl }),
            });
          }
        }
      }

      alert(isEdit ? '수정되었습니다.' : '등록되었습니다.');
      resetForm();
      loadProjects();
    } catch (err) {
      console.error('❌ [Submit Error]', err);
      alert('오류 발생:\n' + err.message);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        // 원래 텍스트 복구
        submitBtn.innerText = projectIdInput.value ? '수정 저장' : '+ 신규등록';
      }
    }
  }

  // ---------------------------------------------------------
  // 6. 수정 모드 진입
  // ---------------------------------------------------------
  function editProject(project) {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    projectIdInput.value = project.id;

    // 널 병합 연산자(??) 또는 OR(||) 사용
    form.querySelector('[name="title"]').value = project.title || '';
    form.querySelector('[name="location"]').value = project.location || '';
    form.querySelector('[name="category"]').value = project.category || '';
    form.querySelector('[name="year"]').value = project.year || '';
    form.querySelector('[name="period"]').value = project.period || '';
    form.querySelector('[name="area"]').value = project.area || '';
    form.querySelector('[name="description"]').value =
      project.description || '';

    // 견적 내역 채우기
    costListContainer.innerHTML = '';
    if (project.costs && Array.isArray(project.costs)) {
      project.costs.forEach((c) => addCostItem(c.label, c.amount));
    }

    calculateTotal();

    submitBtn.innerText = '수정 저장';
    cancelBtn.style.display = 'inline-block';

    const titleEl = document.querySelector('.form-title');
    if (titleEl)
      titleEl.innerHTML = '<i class="fas fa-edit"></i> 프로젝트 수정';
  }

  // ---------------------------------------------------------
  // 7. 삭제 기능
  // ---------------------------------------------------------
  async function deleteProject(id) {
    if (!confirm('정말 삭제하시겠습니까? 복구할 수 없습니다.')) return;

    try {
      const res = await fetch(`${API_BASE}/projects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '삭제 실패');
      }

      alert('삭제되었습니다.');
      if (projectIdInput.value == id) {
        resetForm();
      }
      loadProjects();
    } catch (err) {
      alert(err.message);
    }
  }

  // ---------------------------------------------------------
  // 8. 유틸리티
  // ---------------------------------------------------------
  function resetForm() {
    form.reset();
    projectIdInput.value = '';
    costListContainer.innerHTML = '';
    totalPriceDisplay.value = '0';

    submitBtn.innerText = '+ 신규등록';
    cancelBtn.style.display = 'none';

    const titleEl = document.querySelector('.form-title');
    if (titleEl)
      titleEl.innerHTML =
        '<i class="fas fa-pen-to-square"></i> 신규 프로젝트 등록';
  }

  function addCostItem(label = '', amount = '') {
    const div = document.createElement('div');
    div.className = 'cost-item';
    div.style.display = 'flex';
    div.style.gap = '10px';
    div.style.marginBottom = '8px';

    div.innerHTML = `
      <input type="text" class="cost-label" placeholder="항목 (예: 철거공사)" value="${label}" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      <input type="number" class="cost-amount" placeholder="금액 (만원)" value="${amount}" style="width: 120px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      <button type="button" class="btn-remove-cost" style="background: #fff; border: 1px solid #fca5a5; color: #ef4444; border-radius: 4px; cursor: pointer;">삭제</button>
    `;

    div.querySelector('.btn-remove-cost').addEventListener('click', () => {
      div.remove();
      calculateTotal();
    });

    div.querySelector('.cost-amount').addEventListener('input', calculateTotal);
    costListContainer.appendChild(div);
  }

  function calculateTotal() {
    const amounts = document.querySelectorAll('.cost-amount');
    let total = 0;
    amounts.forEach((input) => {
      const val = parseInt(input.value, 10);
      if (!isNaN(val)) total += val;
    });
    totalPriceDisplay.value = total.toLocaleString();
  }

  function getCostData() {
    const items = document.querySelectorAll('.cost-item');
    const costs = [];
    items.forEach((item) => {
      const label = item.querySelector('.cost-label').value.trim();
      const amount = item.querySelector('.cost-amount').value;

      // 값이 있는 경우에만 추가
      if (label || (amount && amount != 0)) {
        costs.push({
          label,
          amount: amount ? parseInt(amount, 10) : 0,
        });
      }
    });
    return costs;
  }
};

// DOM 로드 대기 후 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminProjects);
} else {
  initAdminProjects();
}
