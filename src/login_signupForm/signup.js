// ================================
// 회원가입 폼 처리
// ================================
const signupForm = document.querySelector('#signup-form');
const nameForm = document.querySelector('#name');
const emailForm = document.querySelector('#email');
const passwordForm = document.querySelector('#password');
const confirmForm = document.querySelector('#passwordConfirm');
const signupErrorBox = document.querySelector('#signup-error-box');

if (signupForm) {
  signupForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const name = nameForm.value.trim();
    const email = emailForm.value.trim();
    const password = passwordForm.value.trim();
    const passwordConfirm = confirmForm.value.trim();

    const errors = [];

    // 1) 이름 검사
    if (!name) {
      errors.push('이름을 입력해주세요.');
    } else if (name.length < 2) {
      errors.push('이름은 최소 2글자 이상이어야 합니다.');
    }

    // 2) 이메일 검사
    if (!email) {
      errors.push('이메일을 입력해주세요.');
    } else if (!isValidEmail(email)) {
      errors.push('이메일 형식이 올바르지 않습니다.');
    }

    // 3) 비밀번호 기본 복잡도 검사
    if (!password) {
      errors.push('비밀번호를 입력해주세요.');
    } else {
      const pwErrors = validatePassword(password);
      errors.push(...pwErrors);
    }

    // 4) 비밀번호 확인
    if (!passwordConfirm) {
      errors.push('비밀번호 확인을 입력해주세요.');
    } else if (passwordConfirm !== password) {
      errors.push('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
    }

    // 5) 결과 출력
    if (errors.length > 0) {
      renderMessages(signupErrorBox, errors, 'error');
      return;
    }

    renderMessages(signupErrorBox, ['회원가입 가능 상태입니다.'], 'success');

    // ★ 실제 서버 전송은 나중에 백엔드 붙일 때 fetch/axios 사용
    console.log('폼 데이터 전송 준비 완료:', { name, email, password });
  });
}
