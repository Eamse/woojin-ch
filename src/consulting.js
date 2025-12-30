document.addEventListener('DOMContentLoaded', () => {
  // HTML의 <form> 태그에 id="consultingForm"이 있어야 합니다.
  const form = document.getElementById('consultingForm');

  if (!form) {
    // 폼이 없는 페이지라면 그냥 종료
    console.warn(
      "⚠️ 'consultingForm' ID를 가진 폼을 찾을 수 없습니다. HTML을 확인해주세요."
    );
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // 기본 제출 동작(새로고침) 막기

    // 폼 데이터 수집
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    console.log('📤 전송할 데이터:', data);

    // 필수 값 검증 (이름, 연락처)
    if (!data.userName || !data.userPhone) {
      alert('이름과 연락처는 필수 입력 항목입니다.');
      return;
    }

    try {
      if (typeof window.apiFetch !== 'function') {
        throw new Error('common.js가 로드되지 않았습니다.');
      }

      // API 호출
      const res = await window.apiFetch('/inquiries', {
        method: 'POST',
        body: data,
      });

      if (res.ok) {
        alert(
          '견적 신청이 완료되었습니다.\n담당자가 확인 후 연락드리겠습니다.'
        );
        form.reset(); // 폼 초기화
        // 필요 시 메인 페이지로 이동: window.location.href = '/';
      } else {
        alert('신청 실패: ' + (res.error || '알 수 없는 오류'));
      }
    } catch (err) {
      alert('오류가 발생했습니다: ' + err.message);
    }
  });
});
