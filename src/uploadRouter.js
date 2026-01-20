import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import fsp from 'fs/promises';
import fs from 'fs'; // existsSync 사용을 위해 추가
import path, { extname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

import prisma from './db.js';
import { deleteFileFromR2, uploadFileToR2 } from './r2.js';
import { protect } from './auth.js';

const router = Router();

// ---------------------------
// PATH & 디렉터리 설정
// ---------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const UPLOAD_ROOT = path.join(ROOT_DIR, 'uploads');

// 임시/백업용 로컬 디렉터리
const DIR_ORIGINAL = path.join(UPLOAD_ROOT, 'original');
const DIR_LARGE = path.join(UPLOAD_ROOT, 'large');
const DIR_MEDIUM = path.join(UPLOAD_ROOT, 'medium');
const DIR_THUMB = path.join(UPLOAD_ROOT, 'thumb');

// [보완] 필수 디렉터리가 없으면 자동 생성 (서버 시작 시 1회 실행)
const ensureUploadDirs = async () => {
  const dirs = [DIR_ORIGINAL, DIR_LARGE, DIR_MEDIUM, DIR_THUMB];
  for (const dir of dirs) {
    try {
      await fsp.mkdir(dir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST')
        console.error(`❌ 디렉터리 생성 실패: ${dir}`, err);
    }
  }
};
ensureUploadDirs(); // 즉시 실행

// ---------------------------
// 업로드 제약 & 유틸리티
// ---------------------------
const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_MULTI_FILES = 10;

const sanitizeFilename = (name) =>
  name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_') // 특수문자는 언더바(_)로 치환
    .replace(/_+/g, '_') // 연속된 언더바 제거
    .replace(/^_|_$/g, '')
    .slice(0, 80) || 'upload';

const buildFilename = (originalName) => {
  const extCandidate = path.extname(originalName || '').toLowerCase();
  const allowedExts = [
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.gif',
    '.heic',
    '.heif',
  ];
  const ext = allowedExts.includes(extCandidate) ? extCandidate : '.jpg';
  const base = sanitizeFilename(path.basename(originalName, extCandidate));
  // 파일명 중복 방지를 위한 난수 접미사
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${suffix}-${base}${ext}`.toLowerCase();
};

// ---------------------------
// Multer 설정
// ---------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 혹시라도 폴더가 없으면 생성 시도 후 저장
    if (!fs.existsSync(DIR_ORIGINAL)) {
      fs.mkdirSync(DIR_ORIGINAL, { recursive: true });
    }
    cb(null, DIR_ORIGINAL);
  },
  filename: (req, file, cb) => cb(null, buildFilename(file.originalname)),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const mimetype = (file.mimetype || '').toLowerCase();
    if (ALLOWED_MIMES.includes(mimetype)) {
      return cb(null, true);
    }
    const err = new Error(
      '지원하지 않는 파일 형식입니다. (jpeg/png/webp/gif/heic/heif)'
    );
    err.status = 400;
    return cb(err);
  },
});

// ---------------------------
// Sharp 리사이즈 유틸리티
// ---------------------------
const clampQuality = (quality) => Math.min(100, Math.max(1, quality));

const applyFormat = (pipeline, format, quality) => {
  const q = clampQuality(quality);
  if (format === 'png') return pipeline.png({ compressionLevel: 9 });
  if (format === 'webp') return pipeline.webp({ quality: q });
  if (['heic', 'heif'].includes(format)) return pipeline.heif({ quality: q });
  if (format === 'gif') return pipeline; // GIF는 리사이즈만 하고 포맷 유지
  return pipeline.jpeg({ quality: q });
};

const generateSizesToDisk = async (sourcePath, filename) => {
  const format = path.extname(filename).replace('.', '').toLowerCase();
  const baseImage = sharp(sourcePath, { failOnError: false }).rotate();

  const targets = [
    { width: 2000, quality: 95, dir: DIR_LARGE }, // [상향] 원본급 고화질
    { width: 1200, quality: 90, dir: DIR_MEDIUM }, // [상향] 중간 사이즈 확대
    { width: 800, quality: 90, dir: DIR_THUMB }, // [상향] 썸네일 400->800px 확대
  ];

  await Promise.all(
    targets.map(({ width, quality, dir }) =>
      applyFormat(
        baseImage
          .clone()
          .resize({ width, fit: 'inside', withoutEnlargement: true }),
        format,
        quality
      ).toFile(path.join(dir, filename))
    )
  );

  return {
    originalPath: sourcePath,
    largePath: path.join(DIR_LARGE, filename),
    mediumPath: path.join(DIR_MEDIUM, filename),
    thumbPath: path.join(DIR_THUMB, filename),
  };
};

// [보완] 로컬 임시 파일 일괄 삭제 헬퍼
const cleanupLocalFiles = async (fileList) => {
  if (!fileList || fileList.length === 0) return;
  const deletions = fileList.map((filename) => {
    return [
      path.join(DIR_ORIGINAL, filename),
      path.join(DIR_LARGE, filename),
      path.join(DIR_MEDIUM, filename),
      path.join(DIR_THUMB, filename),
    ].map((p) => fsp.unlink(p).catch(() => { })); // 에러 무시하고 삭제 시도
  });
  await Promise.all(deletions.flat());
};

// ==================================================================
// ROUTE: 프로젝트 이미지 업로드 (다중)
// ==================================================================
router.post(
  '/projects/:projectId/images',
  protect,
  upload.fields([
    { name: 'mainImageFile', maxCount: 1 },
    { name: 'detailImageFiles', maxCount: 10 },
  ]),
  async (req, res, next) => {
    const uploadedFilenames = []; // 에러 발생 시 청소용

    try {
      const projectId = Number(req.params.projectId);
      if (!projectId || Number.isNaN(projectId))
        throw new Error('유효한 프로젝트 ID가 아닙니다.');

      const fileList = [
        ...(req.files?.mainImageFile || []),
        ...(req.files?.detailImageFiles || []),
      ];

      // [디버그] 업로드된 파일 정보 로깅
      console.log('📤 [Upload Debug] 받은 필드:', Object.keys(req.files || {}));
      console.log('📤 [Upload Debug] mainImageFile:', req.files?.mainImageFile?.map(f => f.originalname));
      console.log('📤 [Upload Debug] detailImageFiles:', req.files?.detailImageFiles?.map(f => f.originalname));
      console.log('📤 [Upload Debug] fileList 총 개수:', fileList.length);
      console.log('📤 [Upload Debug] fileList 파일명:', fileList.map(f => f.originalname));

      if (fileList.length === 0) throw new Error('업로드된 파일이 없습니다.');

      // 청소 목록에 추가
      fileList.forEach((f) => uploadedFilenames.push(f.filename));

      const results = [];

      for (const file of fileList) {
        const originalPath = path.join(DIR_ORIGINAL, file.filename);

        // 1. 로컬 리사이징
        const { largePath, mediumPath, thumbPath } = await generateSizesToDisk(
          originalPath,
          file.filename
        );

        const contentType = file.mimetype || 'image/jpeg';
        // [중요] 폴더 경로를 포함한 Key 생성
        const baseKey = `projects/${projectId}`;

        // 2. R2 업로드 (경로를 포함해서 보냄 -> r2.js가 알아서 처리)
        const [originalR2, largeR2, mediumR2, thumbR2] = await Promise.all([
          uploadFileToR2(
            originalPath,
            `${baseKey}/${file.filename}`,
            contentType
          ),
          uploadFileToR2(
            largePath,
            `${baseKey}/large/${file.filename}`,
            contentType
          ),
          uploadFileToR2(
            mediumPath,
            `${baseKey}/medium/${file.filename}`,
            contentType
          ),
          uploadFileToR2(
            thumbPath,
            `${baseKey}/thumb/${file.filename}`,
            contentType
          ),
        ]);

        const meta = await sharp(originalPath).metadata();

        // 3. DB 저장 (R2에서 반환된 전체 URL 사용)
        const imageRecord = await prisma.projectImage.create({
          data: {
            projectId,
            filename: file.filename,
            originalUrl: originalR2.url,
            largeUrl: largeR2.url,
            mediumUrl: mediumR2.url,
            thumbUrl: thumbR2.url,
            width: meta.width ?? null,
            height: meta.height ?? null,
            sizeBytes: file.size,
          },
        });

        results.push({
          file: file.filename,
          fieldname: file.fieldname, // [추가] 프론트엔드에서 대표 이미지를 식별하기 위해 추가
          db: imageRecord,
          urls: {
            original: originalR2.url,
            thumb: thumbR2.url,
          },
        });
      }

      return res.json({ ok: true, count: results.length, items: results });
    } catch (error) {
      console.error('❌ [Project Upload Error]', error);
      return next(error);
    } finally {
      // [보완] 성공하든 실패하든 로컬 임시 파일은 반드시 삭제
      await cleanupLocalFiles(uploadedFilenames);
    }
  }
);

// ROUTE: 프로젝트 이미지 목록 조회
router.get('/projects/:projectId/images', async (req, res, next) => {
  try {
    const projectId = Number(req.params.projectId);
    if (!projectId || Number.isNaN(projectId))
      throw new Error('유효한 프로젝트 ID가 아닙니다.');

    const images = await prisma.projectImage.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ ok: true, count: images.length, items: images });
  } catch (error) {
    return next(error);
  }
});

// ROUTE: 프로젝트 이미지 삭제
router.delete('/projects/images/:id', protect, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new Error('유효한 이미지 ID가 아닙니다.');

    const image = await prisma.projectImage.findUnique({ where: { id } });
    if (!image) throw new Error('이미지를 찾을 수 없습니다.');

    // R2 파일 삭제 (URL을 넘기면 r2.js가 알아서 Key 추출)
    const urlsToDelete = [
      image.originalUrl,
      image.largeUrl,
      image.mediumUrl,
      image.thumbUrl,
    ].filter(Boolean);

    await Promise.all(urlsToDelete.map((url) => deleteFileFromR2(url)));

    await prisma.projectImage.delete({ where: { id } });

    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

// ==================================================================
// ADMIN: AdminImage (대표 이미지) 관리
// ==================================================================

// ROUTE: 어드민 단일 업로드
router.post(
  '/uploads',
  protect,
  upload.single('file'),
  async (req, res, next) => {
    const uploadedFilenames = [];
    try {
      if (!req.file) throw new Error('업로드된 파일이 없습니다.');
      uploadedFilenames.push(req.file.filename);

      const file = req.file;
      const originalPath = path.join(DIR_ORIGINAL, file.filename);

      // 리사이즈
      const { largePath, mediumPath, thumbPath } = await generateSizesToDisk(
        originalPath,
        file.filename
      );
      const meta = await sharp(originalPath).metadata();
      const contentType = file.mimetype || 'image/jpeg';

      // R2 업로드 (폴더 구조: uploads/original/...)
      const [originalR2, largeR2, mediumR2, thumbR2] = await Promise.all([
        uploadFileToR2(
          originalPath,
          `uploads/original/${file.filename}`,
          contentType
        ),
        uploadFileToR2(
          largePath,
          `uploads/large/${file.filename}`,
          contentType
        ),
        uploadFileToR2(
          mediumPath,
          `uploads/medium/${file.filename}`,
          contentType
        ),
        uploadFileToR2(
          thumbPath,
          `uploads/thumb/${file.filename}`,
          contentType
        ),
      ]);

      const imageRecord = await prisma.adminImage.create({
        data: {
          filename: file.filename,
          title: req.body.title || '',
          category: req.body.category || '',
          sizeBytes: file.size,
          width: meta.width ?? null,
          height: meta.height ?? null,
          originalUrl: originalR2.url,
          largeUrl: largeR2.url,
          mediumUrl: mediumR2.url,
          thumbUrl: thumbR2.url,
        },
      });

      return res.status(201).json({ ok: true, item: imageRecord });
    } catch (error) {
      return next(error);
    } finally {
      await cleanupLocalFiles(uploadedFilenames);
    }
  }
);

// ROUTE: 어드민 다중 업로드
router.post(
  '/uploads-multi',
  protect,
  upload.array('files', MAX_MULTI_FILES),
  async (req, res, next) => {
    const uploadedFilenames = [];
    try {
      if (!req.files || req.files.length === 0)
        throw new Error('업로드된 파일이 없습니다.');
      req.files.forEach((f) => uploadedFilenames.push(f.filename));

      const results = [];
      for (const file of req.files) {
        const originalPath = path.join(DIR_ORIGINAL, file.filename);
        const { largePath, mediumPath, thumbPath } = await generateSizesToDisk(
          originalPath,
          file.filename
        );
        const meta = await sharp(originalPath).metadata();
        const contentType = file.mimetype || 'image/jpeg';

        const [originalR2, largeR2, mediumR2, thumbR2] = await Promise.all([
          uploadFileToR2(
            originalPath,
            `uploads/original/${file.filename}`,
            contentType
          ),
          uploadFileToR2(
            largePath,
            `uploads/large/${file.filename}`,
            contentType
          ),
          uploadFileToR2(
            mediumPath,
            `uploads/medium/${file.filename}`,
            contentType
          ),
          uploadFileToR2(
            thumbPath,
            `uploads/thumb/${file.filename}`,
            contentType
          ),
        ]);

        const imageRecord = await prisma.adminImage.create({
          data: {
            filename: file.filename,
            title: '',
            category: '',
            sizeBytes: file.size,
            width: meta.width ?? null,
            height: meta.height ?? null,
            originalUrl: originalR2.url,
            largeUrl: largeR2.url,
            mediumUrl: mediumR2.url,
            thumbUrl: thumbR2.url,
          },
        });
        results.push(imageRecord);
      }

      return res
        .status(201)
        .json({ ok: true, items: results, count: results.length });
    } catch (error) {
      return next(error);
    } finally {
      await cleanupLocalFiles(uploadedFilenames);
    }
  }
);

// ROUTE: 어드민 이미지 목록 조회
router.get('/uploads', async (req, res, next) => {
  try {
    const q = (req.query.q || '').toString().trim().toLowerCase();
    const category = (req.query.category || '').toString();
    const sort = (req.query.sort || 'recent').toString();
    const limit = Number(req.query.limit || 24);
    const page = Number(req.query.page || 1);
    const skip = (page - 1) * limit;

    const where = {};
    if (q) {
      where.OR = [
        { filename: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;

    const orderBy =
      sort === 'oldest' ? { createdAt: 'asc' } : { createdAt: 'desc' };

    const [total, items] = await prisma.$transaction([
      prisma.adminImage.count({ where }),
      prisma.adminImage.findMany({
        where,
        orderBy,
        take: limit,
        skip,
        include: { galleryImages: { orderBy: { order: 'asc' } } },
      }),
    ]);

    return res.json({
      ok: true,
      total,
      items,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return next(error);
  }
});

// ROUTE: 어드민 이미지 단일 조회
router.get('/uploads/:name', async (req, res, next) => {
  try {
    const { name } = req.params;
    const image = await prisma.adminImage.findUnique({
      where: { filename: name },
      include: { galleryImages: { orderBy: { order: 'asc' } } },
    });

    if (!image) throw new Error('파일을 찾을 수 없습니다.');
    return res.json({ ok: true, item: image });
  } catch (error) {
    return next(error);
  }
});

// ROUTE: 어드민 이미지 수정
router.patch('/uploads/:name', protect, async (req, res, next) => {
  try {
    const { name } = req.params;
    const { title, category } = req.body || {};

    const dataToUpdate = {};
    if (typeof title === 'string') dataToUpdate.title = title;
    if (typeof category === 'string') dataToUpdate.category = category;

    if (Object.keys(dataToUpdate).length === 0) {
      return res
        .status(400)
        .json({ ok: false, error: '수정할 내용이 없습니다.' });
    }

    const updatedImage = await prisma.adminImage.update({
      where: { filename: name },
      data: dataToUpdate,
    });

    return res.json({ ok: true, item: updatedImage });
  } catch (error) {
    if (error.code === 'P2025')
      return res
        .status(404)
        .json({ ok: false, error: '파일을 찾을 수 없습니다.' });
    return next(error);
  }
});

// ROUTE: 어드민 이미지 삭제 (GalleryImage 포함)
router.delete('/uploads/:name', protect, async (req, res, next) => {
  try {
    const { name } = req.params;

    const adminImage = await prisma.adminImage.findUnique({
      where: { filename: name },
      include: { galleryImages: true },
    });

    if (!adminImage) throw new Error('파일을 찾을 수 없습니다.');

    // 1. 대표 이미지 R2 파일 삭제
    const adminImageUrls = [
      adminImage.originalUrl,
      adminImage.largeUrl,
      adminImage.mediumUrl,
      adminImage.thumbUrl,
    ].filter(Boolean);
    await Promise.all(adminImageUrls.map((url) => deleteFileFromR2(url)));

    // 2. 연결된 갤러리 이미지 R2 파일 삭제
    const galleryImageUrls = adminImage.galleryImages.flatMap((g) =>
      [g.originalUrl, g.largeUrl, g.mediumUrl, g.thumbUrl].filter(Boolean)
    );
    await Promise.all(galleryImageUrls.map((url) => deleteFileFromR2(url)));

    // 3. DB 레코드 삭제 (Cascade로 galleryImages 자동 삭제됨)
    await prisma.adminImage.delete({ where: { filename: name } });

    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

// ==================================================================
// ADMIN: GalleryImage (상세 이미지) 관리
// ==================================================================

// ROUTE: 상세 이미지 업로드
router.post(
  '/uploads/:filename/gallery',
  protect,
  upload.array('files', MAX_MULTI_FILES),
  async (req, res, next) => {
    const uploadedFilenames = [];
    try {
      const { filename } = req.params;
      const adminImage = await prisma.adminImage.findUnique({
        where: { filename },
      });

      if (!adminImage) throw new Error('대표 이미지를 찾을 수 없습니다.');
      if (!req.files || req.files.length === 0)
        throw new Error('업로드된 파일이 없습니다.');

      req.files.forEach((f) => uploadedFilenames.push(f.filename));

      const results = [];
      for (const file of req.files) {
        const originalPath = path.join(DIR_ORIGINAL, file.filename);
        const { largePath, mediumPath, thumbPath } = await generateSizesToDisk(
          originalPath,
          file.filename
        );
        const meta = await sharp(originalPath).metadata();
        const fileExtension = extname(file.originalname);

        // DB 선 생성 (ID 확보)
        const tempGalleryImage = await prisma.adminGalleryImage.create({
          data: {
            adminImageId: adminImage.id,
            alt: req.body.alt || '',
            order: Number(req.body.order) || 0,
            originalUrl: '',
            largeUrl: '',
            mediumUrl: '',
            thumbUrl: '',
          },
        });

        const galleryImageId = tempGalleryImage.id;
        // Key 생성 로직 (uploads/gallery/부모ID/자식ID...)
        const baseGalleryKey = `uploads/gallery/${adminImage.id}/${galleryImageId}`;

        const [originalR2, largeR2, mediumR2, thumbR2] = await Promise.all([
          uploadFileToR2(
            originalPath,
            `${baseGalleryKey}${fileExtension}`,
            file.mimetype
          ),
          uploadFileToR2(
            largePath,
            `${baseGalleryKey}_large${fileExtension}`,
            file.mimetype
          ),
          uploadFileToR2(
            mediumPath,
            `${baseGalleryKey}_medium${fileExtension}`,
            file.mimetype
          ),
          uploadFileToR2(
            thumbPath,
            `${baseGalleryKey}_thumb${file.mimetype}`,
            file.mimetype
          ),
        ]);

        const updatedGalleryImage = await prisma.adminGalleryImage.update({
          where: { id: galleryImageId },
          data: {
            originalUrl: originalR2.url,
            largeUrl: largeR2.url,
            mediumUrl: mediumR2.url,
            thumbUrl: thumbR2.url,
            sizeBytes: file.size,
            width: meta.width ?? null,
            height: meta.height ?? null,
          },
        });

        results.push(updatedGalleryImage);
      }

      return res
        .status(201)
        .json({ ok: true, items: results, count: results.length });
    } catch (error) {
      return next(error);
    } finally {
      await cleanupLocalFiles(uploadedFilenames);
    }
  }
);

// ROUTE: 상세 이미지 수정
router.patch('/uploads/gallery/:id', protect, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new Error('유효한 상세 이미지 ID가 아닙니다.');

    const { alt, order } = req.body || {};
    const dataToUpdate = {};
    if (typeof alt === 'string') dataToUpdate.alt = alt;
    if (typeof order === 'number') dataToUpdate.order = order;

    if (Object.keys(dataToUpdate).length === 0)
      return res
        .status(400)
        .json({ ok: false, error: '수정할 내용이 없습니다.' });

    const updatedGalleryImage = await prisma.adminGalleryImage.update({
      where: { id },
      data: dataToUpdate,
    });

    return res.json({ ok: true, item: updatedGalleryImage });
  } catch (error) {
    if (error.code === 'P2025')
      return res
        .status(404)
        .json({ ok: false, error: '상세 이미지를 찾을 수 없습니다.' });
    return next(error);
  }
});

// ROUTE: 상세 이미지 삭제
router.delete('/uploads/gallery/:id', protect, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new Error('유효한 상세 이미지 ID가 아닙니다.');

    const galleryImage = await prisma.adminGalleryImage.findUnique({
      where: { id },
    });
    if (!galleryImage) throw new Error('상세 이미지를 찾을 수 없습니다.');

    const urlsToDelete = [
      galleryImage.originalUrl,
      galleryImage.largeUrl,
      galleryImage.mediumUrl,
      galleryImage.thumbUrl,
    ].filter(Boolean);

    await Promise.all(urlsToDelete.map((url) => deleteFileFromR2(url)));

    await prisma.adminGalleryImage.delete({ where: { id } });

    return res.json({ ok: true });
  } catch (error) {
    if (error.code === 'P2025')
      return res
        .status(404)
        .json({ ok: false, error: '상세 이미지를 찾을 수 없습니다.' });
    return next(error);
  }
});

export default router;
