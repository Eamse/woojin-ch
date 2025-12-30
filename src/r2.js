import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// --------------------------------------------------------------------------
// 1. 환경 변수 로드 (경로 문제 해결)
// --------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

// .env 파일 로드 시도
if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('❌ .env 로드 실패:', result.error);
  } else {
    console.log('✅ .env 로드 성공');
  }
} else {
  console.warn(
    '⚠️ .env 파일을 찾을 수 없습니다. (환경변수가 이미 설정되어 있다면 무시하세요)'
  );
}

// --------------------------------------------------------------------------
// 2. R2 설정값 정제 및 검증
// --------------------------------------------------------------------------
const R2_ACCOUNT_ID = (process.env.R2_ACCOUNT_ID || '').trim();
const R2_ACCESS_KEY_ID = (process.env.R2_ACCESS_KEY_ID || '').trim();
const R2_SECRET_ACCESS_KEY = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
const R2_BUCKET_NAME = (process.env.R2_BUCKET_NAME || '').trim();

// [중요] 사용자가 .env에 R2_PUBLIC_BASE_URL로 적었을 경우도 허용 (Fallback)
let R2_PUBLIC_URL = (
  process.env.R2_PUBLIC_URL ||
  process.env.R2_PUBLIC_BASE_URL ||
  ''
).trim();

// [보정] URL 형식이 올바르지 않으면 자동 수정 (https:// 추가, 끝 슬래시 제거)
if (R2_PUBLIC_URL) {
  if (!R2_PUBLIC_URL.startsWith('http')) {
    R2_PUBLIC_URL = `https://${R2_PUBLIC_URL}`;
  }
  // 끝에 붙은 슬래시(/) 제거 -> 나중에 합칠 때 중복 방지
  R2_PUBLIC_URL = R2_PUBLIC_URL.replace(/\/$/, '');
}

// [디버깅] 설정 상태 로그
console.log('🔧 [R2 설정 확인]');
console.log(`   - Bucket: ${R2_BUCKET_NAME || '❌ 누락됨'}`);
console.log(`   - Base URL: ${R2_PUBLIC_URL || '❌ 누락됨'}`);

if (!R2_PUBLIC_URL) {
  console.error(
    '🚨 [치명적 오류] R2_PUBLIC_BASE_URL이 없습니다. 이미지 주소를 생성할 수 없습니다.'
  );
}

// Account ID 정제 (URL 형태가 들어와도 ID만 추출)
const cleanAccountId = R2_ACCOUNT_ID.replace(/^https?:\/\//, '').replace(
  /\.r2\.cloudflarestorage\.com\/?$/,
  ''
);

// --------------------------------------------------------------------------
// 3. S3 클라이언트 초기화
// --------------------------------------------------------------------------
const s3Client = new S3Client({
  region: 'auto', // Cloudflare R2 필수 설정
  endpoint: `https://${cleanAccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// --------------------------------------------------------------------------
// 4. 업로드 함수 (핵심 수정)
// --------------------------------------------------------------------------
export const uploadFileToR2 = async (filePath, key, contentType) => {
  if (!R2_PUBLIC_URL) {
    throw new Error('R2_PUBLIC_BASE_URL 환경변수가 설정되지 않았습니다.');
  }

  // [보정] key(저장 경로) 앞의 슬래시 제거 (이중 슬래시 방지)
  // 예: "/projects/img.jpg" -> "projects/img.jpg"
  const cleanKey = key.startsWith('/') ? key.slice(1) : key;

  const fileStream = fs.createReadStream(filePath);
  const stats = fs.statSync(filePath);

  // R2 업로드 명령
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: cleanKey, // 정리된 Key 사용
    Body: fileStream,
    ContentType: contentType,
    ContentLength: stats.size,
  });

  try {
    await s3Client.send(command);

    // [중요] URL 생성 시 한글/특수문자 인코딩 처리
    // 경로(projects/10/...)는 그대로 두고, 각 부분만 인코딩하여 합침
    const encodedKey = cleanKey.split('/').map(encodeURIComponent).join('/');
    const publicUrl = `${R2_PUBLIC_URL}/${encodedKey}`;

    console.log(`✅ [R2 Upload Success]`);
    console.log(`   - Key: ${cleanKey}`);
    console.log(`   - URL: ${publicUrl}`);

    return {
      success: true,
      url: publicUrl, // 완성된 전체 URL (DB에 이거 저장 추천)
      key: cleanKey, // 저장된 경로 Key
    };
  } catch (error) {
    console.error('❌ [R2 Upload Error]', error);
    throw error;
  }
};

// --------------------------------------------------------------------------
// 5. 삭제 함수
// --------------------------------------------------------------------------
export const deleteFileFromR2 = async (urlOrKey) => {
  if (!urlOrKey) return;

  // 입력값이 전체 URL이면 Base URL을 제거하여 Key만 추출
  let key = urlOrKey;
  if (key.includes(R2_PUBLIC_URL)) {
    key = key.replace(`${R2_PUBLIC_URL}/`, '');
  }

  // 혹시 모를 앞쪽 슬래시 제거
  if (key.startsWith('/')) key = key.slice(1);

  console.log(`🗑️ [R2 Delete] 삭제 시도 Key: ${key}`);

  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  try {
    await s3Client.send(command);
    console.log('✅ [R2 Delete] 삭제 성공');
  } catch (error) {
    console.error('❌ [R2 Delete Error]', error);
  }
};
