// src/common.js

// 1. API Base URL 설정
window.WOOJIN_API_BASE = (function () {
  // HTML meta 태그에서 설정값을 찾거나 기본값 사용
  const meta = document.querySelector('meta[name="woojin-api-base"]');
  let base = meta?.content || 'http://localhost:4000/api';

  const { hostname, port, protocol } = window.location;

  // [수정] 로컬 개발 환경 감지 로직 강화
  // 1. 파일 프로토콜 (file:)
  // 2. Live Server 포트 (5500)
  // 3. 로컬 호스트이면서 백엔드 포트(4000)가 아닌 경우
  if (
    protocol === 'file:' ||
    port === '5500' ||
    (['localhost', '127.0.0.1', '[::1]'].includes(hostname) && port !== '4000')
  ) {
    if (!/^https?:/i.test(base)) {
      base = 'http://localhost:4000/api';
    }
  }

  // console.log('🔧 [Common] API Base URL:', base);
  return base.replace(/\/$/, '');
})();

// 2. 공통 API 호출 함수 (window.apiFetch)
window.apiFetch = async (url, options = {}) => {
  const headers = {
    ...(options.headers || {}),
  };

  // 1. 로컬 스토리지에서 토큰 가져오기
  let token;
  try {
    token = localStorage.getItem('token');
  } catch (e) {
    console.warn('로컬 스토리지 접근 차단됨 (file:// 또는 보안 설정):', e);
  }

  if (token && token !== 'null' && token !== 'undefined') {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // FormData가 아닐 때만 Content-Type: application/json 자동 추가
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    // body가 객체라면 JSON 문자열로 변환
    if (options.body && typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }
  }

  const finalOptions = {
    ...options,
    headers,
  };

  // URL이 '/'로 시작하면 API Base URL을 앞에 붙여줌
  let requestUrl = url;
  if (url.startsWith('/') && window.WOOJIN_API_BASE) {
    requestUrl = `${window.WOOJIN_API_BASE}${url}`;
  }

  try {
    const response = await fetch(requestUrl, finalOptions);

    // 응답이 JSON이 아닐 수도 있으므로 text로 먼저 읽음
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      // JSON 파싱 실패 시, 텍스트를 오류 메시지로 사용
      data = { ok: response.ok, error: text || response.statusText };
    }

    if (!response.ok) {
      // 서버가 보낸 에러 메시지가 있으면 그것을 사용, 없으면 HTTP 상태로 폴백
      throw new Error(data.error || `HTTP error ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error; // 오류를 다시 던져서 호출한 쪽에서 catch 할 수 있도록 함
  }
};

// 3. 알림 표시 함수 (window.showNotice)
window.showNotice = (message, type = 'info') => {
  let container = document.getElementById('noticeContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'noticeContainer';
    container.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 9999;
      display: flex; flex-direction: column; gap: 10px;
    `;
    document.body.appendChild(container);

    // 스타일 주입
    const style = document.createElement('style');
    style.textContent = `
      .notice-toast {
        padding: 12px 20px; border-radius: 8px; background: #333; color: #fff;
        font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease-out; transition: opacity 0.3s;
      }
      .notice-toast.success { background: #10b981; }
      .notice-toast.error { background: #ef4444; }
      .notice-toast.warn { background: #f59e0b; }
      .notice-toast.fade-out { opacity: 0; }
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  const notice = document.createElement('div');
  notice.className = `notice-toast ${type}`;
  notice.textContent = message;

  container.appendChild(notice);

  // 3초 후 사라짐
  setTimeout(() => {
    notice.classList.add('fade-out');
    notice.addEventListener('transitionend', () => notice.remove());
  }, 3000);
};

// 4. 로그아웃 함수
window.logout = () => {
  if (confirm('로그아웃 하시겠습니까?')) {
    localStorage.removeItem('token');
    alert('로그아웃되었습니다.');
    window.location.href = '/src/admin-login.html';
  }
};
