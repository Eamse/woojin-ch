console.log('🎯 [Dashboard] Script Loaded');

const API_BASE = document.querySelector('meta[name="woojin-api-base"]')?.content || 'https://woojin-ch.kr/api';

// 대시보드 초기화
async function initDashboard() {
    console.log('🎯 [Dashboard] Initializing...');

    try {
        await Promise.all([
            loadStatistics(),
            loadRecentProjects(),
            loadRecentInquiries()
        ]);

        console.log('✅ [Dashboard] All data loaded');
    } catch (error) {
        console.error('❌ [Dashboard] Error:', error);
    }
}

// 통계 데이터 로드
async function loadStatistics() {
    try {
        // 전체 프로젝트 수
        const projectsRes = await fetch(`${API_BASE}/projects`);
        const projectsData = await projectsRes.json();
        document.getElementById('totalProjects').textContent = projectsData.projects?.length || 0;

        // 이번 달 신규 문의
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const inquiriesRes = await fetch(`${API_BASE}/inquiries`);
        const inquiriesData = await inquiriesRes.json();

        const monthlyCount = inquiriesData.inquiries?.filter(inq => {
            const createdDate = new Date(inq.createdAt);
            return createdDate >= startOfMonth;
        }).length || 0;

        document.getElementById('monthlyInquiries').textContent = monthlyCount;

        // 처리 대기 중 (신규 + 진행중)
        const pendingCount = inquiriesData.inquiries?.filter(inq =>
            inq.status === 'new' || inq.status === 'ing'
        ).length || 0;

        document.getElementById('pendingInquiries').textContent = pendingCount;

        // 이번 주 방문자
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        try {
            const metricsRes = await fetch(`${API_BASE}/metrics/visits`);
            const metricsData = await metricsRes.json();

            const weeklyVisits = metricsData.visits?.filter(visit => {
                const visitDate = new Date(visit.timestamp);
                return visitDate >= startOfWeek;
            }).length || 0;

            document.getElementById('weeklyVisitors').textContent = weeklyVisits;
        } catch (err) {
            console.warn('⚠️ Metrics not available:', err);
            document.getElementById('weeklyVisitors').textContent = '-';
        }

    } catch (error) {
        console.error('❌ [Statistics] Error:', error);
    }
}

// 최근 프로젝트 로드
async function loadRecentProjects() {
    const container = document.getElementById('recentProjects');

    try {
        const res = await fetch(`${API_BASE}/projects`);
        const data = await res.json();

        if (!data.ok || !data.projects || data.projects.length === 0) {
            container.innerHTML = '<div class="empty-state">등록된 프로젝트가 없습니다</div>';
            return;
        }

        // 최근 3개만
        const recent = data.projects
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 3);

        container.innerHTML = recent.map(project => `
      <div class="recent-item" onclick="window.location.href='/admin-projects.html'">
        <div>
          <div class="recent-item-title">${escapeHtml(project.title)}</div>
          <div class="recent-item-meta">
            ${project.location || '-'} · ${project.category || '분류 없음'}
          </div>
        </div>
        <div class="recent-item-date">
          ${formatDate(project.createdAt)}
        </div>
      </div>
    `).join('');

    } catch (error) {
        console.error('❌ [Recent Projects] Error:', error);
        container.innerHTML = '<div class="empty-state">프로젝트를 불러올 수 없습니다</div>';
    }
}

// 최근 문의 로드
async function loadRecentInquiries() {
    const container = document.getElementById('recentInquiries');

    try {
        const res = await fetch(`${API_BASE}/inquiries`);
        const data = await res.json();

        if (!data.ok || !data.inquiries || data.inquiries.length === 0) {
            container.innerHTML = '<div class="empty-state">문의가 없습니다</div>';
            return;
        }

        // 최근 5개만
        const recent = data.inquiries
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        container.innerHTML = recent.map(inquiry => {
            const statusText = getStatusText(inquiry.status);
            const statusColor = getStatusColor(inquiry.status);

            return `
        <div class="recent-item" onclick="window.location.href='/admin-inquiries.html'">
          <div>
            <div class="recent-item-title">
              ${escapeHtml(inquiry.userName)} · ${escapeHtml(inquiry.userPhone)}
            </div>
            <div class="recent-item-meta">
              <span style="color: ${statusColor}; font-weight: 500;">${statusText}</span>
              · ${inquiry.spaceInfo || '-'} · ${inquiry.budget || '-'}
            </div>
          </div>
          <div class="recent-item-date">
            ${formatDate(inquiry.createdAt)}
          </div>
        </div>
      `;
        }).join('');

    } catch (error) {
        console.error('❌ [Recent Inquiries] Error:', error);
        container.innerHTML = '<div class="empty-state">문의를 불러올 수 없습니다</div>';
    }
}

// 유틸리티 함수
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours === 0) {
            const minutes = Math.floor(diff / (1000 * 60));
            return `${minutes}분 전`;
        }
        return `${hours}시간 전`;
    } else if (days === 1) {
        return '어제';
    } else if (days < 7) {
        return `${days}일 전`;
    } else {
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }
}

function getStatusText(status) {
    const statusMap = {
        'new': '신규 문의',
        'ing': '상담 진행중',
        'done': '계약/완료',
        'cancel': '취소/보류'
    };
    return statusMap[status] || status;
}

function getStatusColor(status) {
    const colorMap = {
        'new': '#3b82f6',
        'ing': '#f59e0b',
        'done': '#10b981',
        'cancel': '#6b7280'
    };
    return colorMap[status] || '#6b7280';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 페이지 로드 시 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}
