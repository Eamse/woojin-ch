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
    content: `<div style="padding:10px;">우진 창호<br />경기도 군포시 금정로 xx-x</div>`,
  });

  naver.maps.Event.addListener(marker, 'click', () => {
    infoWindow.open(map, marker);
  });
}
initMap();

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.copy-btn, [data-copy-target]');
  if (!btn) return;

  const sel = btn.dataset.copyTarget;
  let targetEl = sel ? document.querySelector(sel) : null;
  if (!targetEl)
    targetEl = btn.previousElementSibling || btn.nextElementSibling || null;
  if (!targetEl) {
    console.warn('Copy target not found:', sel);
    return;
  }

  let raw = '';
  if (
    targetEl instanceof HTMLInputElement ||
    targetEl instanceof HTMLTextAreaElement
  ) {
    raw = (targetEl.value || '').trim();
  } else {
    raw = (targetEl.textContent || '').trim();
  }
  if (!raw) {
    console.warn('Nothing to copy from target:', targetEl);
    return;
  }

  try {
    await navigator.clipboard.writeText(raw);
    toast('주소가 복사되었습니다.');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = raw;
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      toast('주소가 복사되었습니다.');
    } catch {
      alert('복사에 실패했습니다. 수동으로 복사해주세요.');
    } finally {
      document.body.removeChild(ta);
    }
  }
});

function toast(msg) {
  let el = document.getElementById('copyToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'copyToast';
    el.style.cssText =
      'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#111;color:#fff;padding:10px 14px;border-radius:10px;opacity:0;transition:opacity .2s';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.hidden = false; // 중요
  el.style.opacity = '1';
  setTimeout(() => {
    el.style.opacity = '0';
    el.hidden = true;
  }, 1200);
}
