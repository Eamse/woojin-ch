document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('inquiriesForm');

  if (!form) {
    console.warn(
      "⚠️ 'inquiriesForm' ID를 가진 폼을 찾을 수 없습니다. HTML을 확인해주세요."
    );
    return;
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
      form.reset();
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const name = (data.userName || '').trim();
    const nameRegex = /^[가-힣a-zA-Z\s]{2,}$/;
    const phoneDigits = (data.userPhone || '').replace(/\D/g, '');

    console.log('전송할 데이터:', data);

    if (!nameRegex.test(name)) {
      alert('이름을 올바르게 입력해주세요 (2자 이상).');
      return;
    }
    data.userName = name;

    if (phoneDigits.length < 10) {
      alert('전화번호 양식을 다시 확인해주세요');
      return;
    }

    try {
      if (typeof window.apiFetch !== 'function') {
        throw new Error('common.js가 로드되지 않았습니다.');
      }

      const res = await window.apiFetch('/inquiries', {
        method: 'POST',
        body: data,
      });

      if (res.ok) {
        alert(
          '견적 신청이 완료되었습니다.\n담당자가 확인 후 연락드리겠습니다.'
        );
        form.reset();
      } else {
        alert('신청 실패: ' + (res.error || '알 수 없는 오류'));
      }
    } catch (error) {
      alert('오류가 발생했습니다: ' + error.message);
    }
  });
});
