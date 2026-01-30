/**
 * Admin Gallery - Project Management
 * 프로젝트 조회, 수정, 삭제 관리 페이지
 */

console.log('🎨 [Admin Gallery Manage] Script Loaded');

// 🌐 환경 자동 감지
const isLocalhost = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

const API_BASE = isLocalhost
    ? 'http://localhost:4000/api'      // 로컬 개발
    : 'https://woojin-ch.kr/api';      // 프로덕션

console.log('🌐 API_BASE:', API_BASE, isLocalhost ? '(로컬 환경)' : '(프로덕션)');

// State
let allProjects = [];
let currentFilter = 'all';
let currentEditId = null;

// DOM Elements
const projectsGrid = document.getElementById('projectsGrid');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const saveEditBtn = document.getElementById('saveEditBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initGallery();
});

async function initGallery() {
    console.log('🎨 Initializing gallery...');

    // Setup filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.category;
            renderProjects();
        });
    });

    // Setup edit form
    editForm.addEventListener('submit', handleEditSubmit);

    // Load projects
    await loadAllProjects();
}

// ============================================
// Load Projects
// ============================================

async function loadAllProjects() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/projects`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            throw new Error('Failed to load projects');
        }

        const data = await res.json();
        allProjects = data.projects || [];

        console.log(`✅ Loaded ${allProjects.length} projects`);
        renderProjects();

    } catch (error) {
        console.error('❌ Error loading projects:', error);
        projectsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #ef4444; margin-bottom: 16px;"></i>
                <p>프로젝트를 불러올 수 없습니다</p>
            </div>
        `;
    }
}

// ============================================
// Render Projects
// ============================================

function renderProjects() {
    let filtered = allProjects;

    // Apply filter
    if (currentFilter !== 'all') {
        filtered = allProjects.filter(p => p.category === currentFilter);
    }

    // Empty state
    if (filtered.length === 0) {
        projectsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open" style="font-size: 48px; color: #9ca3af; margin-bottom: 16px;"></i>
                <p>${currentFilter === 'all' ? '등록된 프로젝트가 없습니다' : '해당 카테고리의 프로젝트가 없습니다'}</p>
            </div>
        `;
        return;
    }

    // Render cards
    projectsGrid.innerHTML = filtered.map(project => createProjectCard(project)).join('');
}

function createProjectCard(project) {
    // Get image URL
    let imgUrl = '';
    if (project.mainImage) {
        imgUrl = project.mainImage;
    } else if (project.images && project.images.length > 0) {
        const firstImg = project.images[0];
        imgUrl = firstImg.mediumUrl || firstImg.thumbUrl || firstImg.originalUrl;
    }

    // Handle relative URLs
    if (imgUrl && !imgUrl.startsWith('http')) {
        const serverRoot = API_BASE.replace(/\/api\/?$/, '');
        imgUrl = `${serverRoot}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
    }

    const fallbackImg = 'https://via.placeholder.com/300x200?text=No+Image';

    return `
        <div class="project-card">
            <img 
                src="${imgUrl || fallbackImg}" 
                alt="${escapeHtml(project.title)}" 
                class="card-image"
                onerror="this.src='${fallbackImg}'"
            />
            <div class="card-content">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <h3 class="card-title">${escapeHtml(project.title)}</h3>
                    <span class="category-badge">${escapeHtml(project.category || '미분류')}</span>
                </div>
                <div class="card-meta">
                    <i class="fas fa-map-marker-alt"></i> ${escapeHtml(project.location || '-')} 
                    · 
                    <i class="fas fa-calendar"></i> ${project.year || '-'}
                </div>
                <div class="card-actions">
                    <button class="card-btn preview" onclick="previewProject(${project.id})">
                        <i class="fas fa-eye"></i> 미리보기
                    </button>
                    <button class="card-btn edit" onclick="openEditModal(${project.id})">
                        <i class="fas fa-edit"></i> 수정
                    </button>
                    <button class="card-btn delete" onclick="deleteProject(${project.id})">
                        <i class="fas fa-trash"></i> 삭제
                    </button>
                    <button class="card-btn photo" onclick="editPhotoProject(${project.id})">
                        <i class="fas fa-camera"></i> 사진수정
                </button>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// Preview
// ============================================

window.previewProject = function (id) {
    window.open(`https://woojin-ch.kr/project/project-detail.html?id=${id}`, '_blank');
};

// ============================================
// Edit Modal
// ============================================

window.openEditModal = async function (id) {
    currentEditId = id;

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/projects/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            throw new Error('Failed to load project');
        }

        const data = await res.json();
        const project = data.project;

        // Fill form
        document.getElementById('editProjectId').value = project.id;
        document.getElementById('editTitle').value = project.title || '';
        document.getElementById('editLocation').value = project.location || '';
        document.getElementById('editCategory').value = project.category || '';
        document.getElementById('editYear').value = project.year || '';
        document.getElementById('editPeriod').value = project.period || '';
        document.getElementById('editArea').value = project.area || '';
        document.getElementById('editDescription').value = project.description || '';

        // Show modal
        editModal.classList.add('show');

    } catch (error) {
        console.error('❌ Error loading project:', error);
        alert('프로젝트 정보를 불러올 수 없습니다');
    }
};

window.closeEditModal = function () {
    editModal.classList.remove('show');
    editForm.reset();
    currentEditId = null;
};

async function handleEditSubmit(e) {
    e.preventDefault();

    if (!currentEditId) {
        alert('수정할 프로젝트가 선택되지 않았습니다');
        return;
    }

    saveEditBtn.disabled = true;
    saveEditBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...';

    try {
        const formData = new FormData(editForm);

        // costs 필드 추가 (백엔드가 배열 형식을 기대함)
        // 수정 시에는 기존 costs를 유지하므로 빈 배열 전송
        formData.append('costs', JSON.stringify([]));

        const token = localStorage.getItem('token');

        const res = await fetch(`${API_BASE}/projects/${currentEditId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        // 401 에러 시 자동 로그아웃
        if (res.status === 401) {
            alert('세션이 만료되었습니다. 다시 로그인해주세요.');
            localStorage.removeItem('token');
            window.location.href = '/admin-login.html';
            return;
        }

        if (!res.ok) {
            throw new Error('Failed to update project');
        }

        alert('프로젝트가 성공적으로 수정되었습니다!');
        closeEditModal();
        await loadAllProjects();

    } catch (error) {
        console.error('❌ Error updating project:', error);
        alert('수정 중 오류가 발생했습니다: ' + error.message);
    } finally {
        saveEditBtn.disabled = false;
        saveEditBtn.innerHTML = '<i class="fas fa-save"></i> 저장하기';
    }
}

// ============================================
// Delete
// ============================================

window.deleteProject = async function (id) {
    if (!confirm('정말로 이 프로젝트를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/projects/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // 401 에러 시 자동 로그아웃
        if (res.status === 401) {
            alert('세션이 만료되었습니다. 다시 로그인해주세요.');
            localStorage.removeItem('token');
            window.location.href = '/admin-login.html';
            return;
        }

        if (!res.ok) {
            throw new Error('Failed to delete project');
        }

        alert('프로젝트가 삭제되었습니다');
        await loadAllProjects();

    } catch (error) {
        console.error('❌ Error deleting project:', error);
        alert('삭제 중 오류가 발생했습니다: ' + error.message);
    }
};

// ============================================
// Utilities
// ============================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close modal on overlay click
editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
        closeEditModal();
    }
});

// ============================================
// 사진 관리
// ============================================

window.editPhotoProject = function (id) {
    window.location.href = `/admin-gallery-photos.html?id=${id}`
}