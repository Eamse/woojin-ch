// -------------------------------
// 네이버 지도
// -------------------------------
function initMap() {
  const location = new naver.maps.LatLng(37.36622, 126.94353); // 군포시 금정 좌표
  const map = new naver.maps.Map('map', {
    center: location,
    zoom: 15,
  });

  const marker = new naver.maps.Marker({
    position: location,
    map,
    title: '우진 창호',
  });

  const infoWindow = new naver.maps.InfoWindow({
    content: `<div style="padding:10px;">우진 창호<br />경기도 군포시 금정동 80-2, 101호</div>`,
  });

  naver.maps.Event.addListener(marker, 'click', () => {
    infoWindow.open(map, marker);
  });
}
initMap();

// -------------------------------
// 주소 복사 기능 (수정됨)
// -------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const copyBtn = document.getElementById('copyBtn');
  const addrText = document.getElementById('addrText');
  if (copyBtn && addrText) {
    copyBtn.addEventListener('click', async () => {
      const textToCopy = addrText.innerText.trim();

      try {
        await navigator.clipboard.writeText(textToCopy);
        showToast('주소가 복사되었습니다.');
      } catch (err) {
        console.error('복사 실패:', err);
        alert('주소 복사에 실패했습니다. 텍스트를 직접 복사해주세요.');
      }
    });
  }
});

// -------------------------------
// 토스트 메시지 함수 (CSS 클래스 연동)
// -------------------------------
function showToast(msg) {
  const toast = document.getElementById('copyToast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');

  // 2초 뒤에 클래스 제거
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}
