// -------------------------------
// 네이버 지도 (기존 코드 유지)
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
    content: `<div style="padding:10px;">우진 창호<br />경기도 군포시 금정로 xx-x</div>`,
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
  const copyBtn = document.getElementById('copyBtn'); // 버튼 ID
  const addrText = document.getElementById('addrText'); // 주소 텍스트 ID

  // 버튼과 주소 텍스트가 둘 다 있을 때만 실행
  if (copyBtn && addrText) {
    copyBtn.addEventListener('click', async () => {
      // 1. 복사할 텍스트 가져오기 (공백 제거)
      const textToCopy = addrText.innerText.trim();

      try {
        // 2. 클립보드에 쓰기 (최신 방식)
        await navigator.clipboard.writeText(textToCopy);

        // 3. 성공 시 토스트 메시지 띄우기
        showToast('주소가 복사되었습니다.');
      } catch (err) {
        // 4. 실패 시 (보안 설정 등으로 인해)
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

  // 메시지 내용 설정
  toast.textContent = msg;

  // CSS의 .show 클래스를 추가해서 애니메이션 실행 (opacity 1)
  toast.classList.add('show');

  // 2초 뒤에 클래스 제거 (다시 사라짐)
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}
