console.log('📊 [Analytics] Script Loaded');

const API_BASE = document.querySelector('meta[name="woojin-api-base"]')?.content || 'https://woojin-ch.kr/api';

let dailyChart, deviceChart, hourlyChart;

// Analytics 초기화
async function initAnalytics() {
    console.log('📊 [Analytics] Initializing...');

    try {
        await loadVisitStats();
        await loadDailyVisitsChart();
        await loadTopPages();
        await loadDeviceChart();
        await loadHourlyChart();

        console.log('✅ [Analytics] All charts loaded');
    } catch (error) {
        console.error('❌ [Analytics] Error:', error);
    }
}

// 방문 통계 요약
async function loadVisitStats() {
    try {
        const res = await fetch(`${API_BASE}/metrics/visits`);

        if (!res.ok) {
            throw new Error('Metrics API not available');
        }

        const data = await res.json();
        const visits = data.visits || [];

        // 날짜별 계산
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - 7);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const todayCount = visits.filter(v => {
            const visitDate = new Date(v.timestamp);
            return visitDate >= today;
        }).length;

        const weekCount = visits.filter(v => {
            const visitDate = new Date(v.timestamp);
            return visitDate >= weekStart;
        }).length;

        const monthCount = visits.filter(v => {
            const visitDate = new Date(v.timestamp);
            return visitDate >= monthStart;
        }).length;

        document.getElementById('todayVisits').textContent = todayCount;
        document.getElementById('weekVisits').textContent = weekCount;
        document.getElementById('monthVisits').textContent = monthCount;
        document.getElementById('totalVisits').textContent = visits.length;

    } catch (error) {
        console.warn('⚠️ [Visit Stats] Using mock data');
        document.getElementById('todayVisits').textContent = '42';
        document.getElementById('weekVisits').textContent = '287';
        document.getElementById('monthVisits').textContent = '1,234';
        document.getElementById('totalVisits').textContent = '5,678';
    }
}

// 일별 방문자 그래프
async function loadDailyVisitsChart() {
    const ctx = document.getElementById('dailyVisitsChart');

    try {
        // 최근 14일 데이터 생성 (실제로는 API에서 가져옴)
        const days = 14;
        const labels = [];
        const data = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
            data.push(Math.floor(Math.random() * 100) + 50); // Mock data
        }

        dailyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: '일별 방문자',
                    data,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#111827',
                        padding: 12,
                        titleFont: { size: 14 },
                        bodyFont: { size: 13 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error('❌ [Daily Chart] Error:', error);
    }
}

// 인기 페이지 Top 10
async function loadTopPages() {
    const container = document.getElementById('topPagesContainer');

    try {
        const res = await fetch(`${API_BASE}/metrics/visits`);

        if (!res.ok) {
            throw new Error('API not available');
        }

        const data = await res.json();
        const visits = data.visits || [];

        // 페이지별 카운트
        const pageCount = {};
        visits.forEach(visit => {
            const page = visit.pathname || '/';
            pageCount[page] = (pageCount[page] || 0) + 1;
        });

        // Top 10 정렬
        const topPages = Object.entries(pageCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        if (topPages.length === 0) {
            throw new Error('No data');
        }

        const maxCount = topPages[0][1];

        container.innerHTML = `
      <table class="top-pages-table">
        <thead>
          <tr>
            <th>페이지</th>
            <th style="text-align: right;">방문 수</th>
          </tr>
        </thead>
        <tbody>
          ${topPages.map(([page, count]) => `
            <tr>
              <td>
                <div class="page-url">${escapeHtml(page)}</div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${(count / maxCount) * 100}%"></div>
                </div>
              </td>
              <td style="text-align: right;">
                <span class="visit-count">${count.toLocaleString()}</span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    } catch (error) {
        console.warn('⚠️ [Top Pages] Using mock data');

        const mockPages = [
            ['/', 450],
            ['/project', 320],
            ['/information', 180],
            ['/inquiries', 150],
            ['/about', 120],
            ['/brand', 90],
            ['/project/project-detail.html', 85],
            ['/admin-dashboard.html', 45],
            ['/admin-projects.html', 42],
            ['/admin-inquiries.html', 38]
        ];

        const maxCount = mockPages[0][1];

        container.innerHTML = `
      <table class="top-pages-table">
        <thead>
          <tr>
            <th>페이지</th>
            <th style="text-align: right;">방문 수</th>
          </tr>
        </thead>
        <tbody>
          ${mockPages.map(([page, count]) => `
            <tr>
              <td>
                <div class="page-url">${escapeHtml(page)}</div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${(count / maxCount) * 100}%"></div>
                </div>
              </td>
              <td style="text-align: right;">
                <span class="visit-count">${count.toLocaleString()}</span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    }
}

// 디바이스 비율 차트
async function loadDeviceChart() {
    const ctx = document.getElementById('deviceChart');

    try {
        // Mock data (실제로는 User-Agent 분석)
        deviceChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['모바일', '데스크톱', '태블릿'],
                datasets: [{
                    data: [55, 40, 5],
                    backgroundColor: [
                        '#3b82f6',
                        '#10b981',
                        '#f59e0b'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: { size: 13 }
                        }
                    },
                    tooltip: {
                        backgroundColor: '#111827',
                        padding: 12,
                        callbacks: {
                            label: function (context) {
                                return `${context.label}: ${context.parsed}%`;
                            }
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error('❌ [Device Chart] Error:', error);
    }
}

// 시간대별 방문 패턴
async function loadHourlyChart() {
    const ctx = document.getElementById('hourlyChart');

    try {
        // 24시간 데이터
        const hours = Array.from({ length: 24 }, (_, i) => `${i}시`);
        const data = Array.from({ length: 24 }, () => Math.floor(Math.random() * 50) + 10);

        hourlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: hours,
                datasets: [{
                    label: '방문자 수',
                    data,
                    backgroundColor: '#8b5cf6',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#111827',
                        padding: 12
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 12
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error('❌ [Hourly Chart] Error:', error);
    }
}

// 유틸리티 함수
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 페이지 로드 시 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnalytics);
} else {
    initAnalytics();
}
