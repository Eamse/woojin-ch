import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import prisma from './db.js';

const router = Router();

// ---------------------------
// 🛡️ Rate Limiting 설정
// ---------------------------

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    ok: false,
    error: '너무 많은 로그인 시도입니다. 15분 후에 다시 시도해주세요.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ---------------------------
// POST /api/users/login
// ---------------------------
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // 1. 사용자 확인
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      const error = new Error('가입되지 않은 아이디입니다.');
      error.status = 401;
      throw error;
    }

    // 2. 비밀번호 확인
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const error = new Error('비밀번호가 일치하지 않습니다.');
      error.status = 401;
      throw error;
    }

    // 3. 토큰 생성
    // 💡 학습 포인트: JWT는 사용자의 "신분증"입니다!
    // - Payload: 사용자 정보 (id, username)
    // - Secret: 비밀 서명 키 (절대 노출 금지!)
    // - expiresIn: 유효기간 (짧을수록 안전, 1시간 권장)
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({ ok: true, token });
  } catch (error) {
    next(error);
  }
});

export default router;
