import { Router } from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import prisma from './db.js';
import { deleteFileFromR2, uploadFileToR2 } from './r2.js';
import { protect } from './auth.js';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import os from 'os';

dotenv.config();

const router = Router();

// Multer 설정 (메모리 스토리지 - 파일 필드만 파싱)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('허용되지 않는 파일 형식입니다'));
    }
  }
});

// ---------------------------
// 프로젝트 API 라우트
// ---------------------------

// 📌 프로젝트 목록 조회 (GET /api/projects)
router.get('/', async (req, res, next) => {
  try {
    // 최신순 정렬
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        // 대표 이미지 1장만 가져오기 (목록 표시용)
        images: {
          take: 10, // [수정] 혹시 모를 fallback을 위해 여유있게 가져옴
          orderBy: { createdAt: 'desc' },
        },
        costs: true, // 견적 내역 포함
      },
    });

    // [추가] mainImage가 없으면 images 중 하나를 fallback으로 설정
    const projectsWithImage = projects.map((p) => {
      if (!p.mainImage && p.images && p.images.length > 0) {
        // [화질 개선] 썸네일보다 더 선명한 mediumUrl 우선 사용
        p.mainImage =
          p.images[0].mediumUrl ||
          p.images[0].thumbUrl ||
          p.images[0].originalUrl;
      }
      return p;
    });

    res.json({ ok: true, projects: projectsWithImage });
  } catch (error) {
    next(error);
  }
});

// 📌 프로젝트 상세 조회 (GET /api/projects/:id)
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      const error = new Error('유효한 프로젝트 ID가 아닙니다.');
      error.status = 400;
      throw error;
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { createdAt: 'desc' },
        },
        costs: true, // 견적 내역 포함
      },
    });

    if (!project) {
      const error = new Error('프로젝트를 찾을 수 없습니다.');
      error.status = 404;
      throw error;
    }

    // [추가] mainImage가 없으면 images 중 하나를 fallback으로 설정
    if (!project.mainImage && project.images && project.images.length > 0) {
      // 가장 최근 이미지 사용
      // [화질 개선] mediumUrl 우선 사용
      project.mainImage =
        project.images[0].mediumUrl ||
        project.images[0].thumbUrl ||
        project.images[0].originalUrl;
    }

    res.json({ ok: true, project });
  } catch (error) {
    next(error);
  }
});

// 📌 프로젝트 생성 (POST /api/projects)
router.post(
  '/',
  protect,
  upload.fields([
    { name: 'mainImageFile', maxCount: 1 },
    { name: 'detailImageFiles', maxCount: 10 }
  ]),
  async (req, res, next) => {
    try {
      const {
        title,
        description,
        location,
        category,
        year,
        period,
        area,
        costs: costsRaw, // JSON 문자열로 올 수 있음
        mainImage,
        images,
      } = req.body;

      // FormData에서 오는 costs는 JSON 문자열이므로 파싱 필요
      let costs = costsRaw;
      if (typeof costsRaw === 'string' && costsRaw) {
        try {
          costs = JSON.parse(costsRaw);
        } catch (e) {
          console.error('❌ [POST] costs JSON parse error:', e);
          costs = [];
        }
      }

      if (!title) {
        const error = new Error('프로젝트 제목(title)은 필수입니다.');
        error.status = 400;
        throw error;
      }

      // 견적 합계 계산
      let calculatedPrice = 0;
      let costData = [];
      if (Array.isArray(costs)) {
        costData = costs.map((c) => ({
          label: c.label,
          amount: Number(c.amount) || 0,
        }));
        calculatedPrice = costData.reduce((sum, c) => sum + c.amount, 0);
      }

      // 프로젝트 생성 (파일 업로드 전)
      const newProject = await prisma.project.create({
        data: {
          title,
          description: description || '',
          location: location || '',
          category: category || '',
          year: year ? parseInt(year, 10) : null,
          period: period || '',
          area: area ? parseFloat(area) : null,
          price: calculatedPrice,
          mainImage: mainImage || null,
          images: images || undefined,
          costs: { create: costData },
        },
      });

      // 📸 파일 업로드 처리
      let uploadedMainImageUrl = null;

      // 메인 이미지 업로드
      if (req.files?.mainImageFile && req.files.mainImageFile[0]) {
        const file = req.files.mainImageFile[0];
        const tempPath = path.join(os.tmpdir(), `${Date.now()}-${file.originalname}`);
        fs.writeFileSync(tempPath, file.buffer);

        const r2Key = `projects/${newProject.id}/main-${Date.now()}-${file.originalname}`;
        const result = await uploadFileToR2(tempPath, r2Key, file.mimetype);
        uploadedMainImageUrl = result.url;

        fs.unlinkSync(tempPath); // 임시 파일 삭제
      }

      // 상세 이미지 업로드
      const uploadedImages = [];
      if (req.files?.detailImageFiles) {
        for (const file of req.files.detailImageFiles) {
          const tempPath = path.join(os.tmpdir(), `${Date.now()}-${file.originalname}`);
          fs.writeFileSync(tempPath, file.buffer);

          const r2Key = `projects/${newProject.id}/detail-${Date.now()}-${file.originalname}`;
          const result = await uploadFileToR2(tempPath, r2Key, file.mimetype);

          // ProjectImage 레코드 생성을 위한 데이터
          uploadedImages.push({
            projectId: newProject.id,
            filename: file.originalname,
            originalUrl: result.url,
            largeUrl: result.url,
            mediumUrl: result.url,
            thumbUrl: result.url,
          });

          fs.unlinkSync(tempPath);
        }
      }

      // DB 업데이트
      const updates = [];

      // 메인 이미지 업데이트
      if (uploadedMainImageUrl) {
        updates.push(
          prisma.project.update({
            where: { id: newProject.id },
            data: { mainImage: uploadedMainImageUrl },
          })
        );
      }

      // 상세 이미지 레코드 생성
      if (uploadedImages.length > 0) {
        updates.push(
          prisma.projectImage.createMany({
            data: uploadedImages,
          })
        );
      }

      // 모든 업데이트 실행
      if (updates.length > 0) {
        await Promise.all(updates);

        // 최종 프로젝트 조회 (images 포함)
        const finalProject = await prisma.project.findUnique({
          where: { id: newProject.id },
          include: {
            images: true,
            costs: true,
          },
        });

        return res.status(201).json({ ok: true, project: finalProject });
      }

      res.status(201).json({ ok: true, project: newProject });
    } catch (error) {
      next(error);
    }
  });

// 📌 프로젝트 수정 (PATCH /api/projects/:id)
router.patch(
  '/:id',
  protect,
  upload.fields([
    { name: 'mainImageFile', maxCount: 1 },
    { name: 'detailImageFiles', maxCount: 10 }
  ]),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        const error = new Error('유효한 프로젝트 ID가 아닙니다.');
        error.status = 400;
        throw error;
      }

      const {
        title,
        description,
        location,
        category,
        year,
        period,
        area,
        costs: costsRaw,
        mainImage,
        images,
      } = req.body;

      // FormData에서 오는 costs는 JSON 문자열이므로 파싱 필요
      let costs = costsRaw;
      if (typeof costsRaw === 'string' && costsRaw) {
        try {
          costs = JSON.parse(costsRaw);
        } catch (e) {
          console.error('❌ [PATCH] costs JSON parse error:', e);
          costs = undefined;
        }
      }

      const dataToUpdate = {};

      if (title !== undefined) dataToUpdate.title = title;
      if (description !== undefined) dataToUpdate.description = description;
      if (location !== undefined) dataToUpdate.location = location;
      if (category !== undefined) dataToUpdate.category = category;
      if (year !== undefined)
        dataToUpdate.year = year ? parseInt(year, 10) : null;
      if (period !== undefined) dataToUpdate.period = period;
      if (area !== undefined) dataToUpdate.area = area ? parseFloat(area) : null;
      if (mainImage !== undefined) dataToUpdate.mainImage = mainImage;
      if (images !== undefined) dataToUpdate.images = images;

      // 견적 내역 업데이트 (기존 내역 삭제 후 재생성)
      if (costs !== undefined && Array.isArray(costs)) {
        // 1. 기존 견적 삭제
        await prisma.projectCost.deleteMany({ where: { projectId: id } });

        // 2. 새 견적 데이터 준비
        const costData = costs.map((c) => ({
          label: c.label,
          amount: Number(c.amount) || 0,
        }));

        // 3. 데이터 업데이트 객체에 추가 (createMany는 nested update에서 지원 안될 수 있으므로 create 사용)
        dataToUpdate.costs = { create: costData };

        // 4. 총액 재계산
        dataToUpdate.price = costData.reduce((sum, c) => sum + c.amount, 0);
      }

      if (Object.keys(dataToUpdate).length === 0 && !req.files?.mainImageFile && !req.files?.detailImageFiles) {
        return res
          .status(400)
          .json({ ok: false, error: '수정할 내용이 없습니다.' });
      }

      // 📸 파일 업로드 처리 (PATCH)
      // 메인 이미지 업로드
      if (req.files?.mainImageFile && req.files.mainImageFile[0]) {
        const file = req.files.mainImageFile[0];
        const tempPath = path.join(os.tmpdir(), `${Date.now()}-${file.originalname}`);
        fs.writeFileSync(tempPath, file.buffer);

        const r2Key = `projects/${id}/main-${Date.now()}-${file.originalname}`;
        const result = await uploadFileToR2(tempPath, r2Key, file.mimetype);
        dataToUpdate.mainImage = result.url;

        fs.unlinkSync(tempPath);
      }

      // 상세 이미지 추가 업로드
      const uploadedImages = [];
      if (req.files?.detailImageFiles && req.files.detailImageFiles.length > 0) {
        for (const file of req.files.detailImageFiles) {
          const tempPath = path.join(os.tmpdir(), `${Date.now()}-${file.originalname}`);
          fs.writeFileSync(tempPath, file.buffer);

          const r2Key = `projects/${id}/detail-${Date.now()}-${file.originalname}`;
          const result = await uploadFileToR2(tempPath, r2Key, file.mimetype);

          // ProjectImage 레코드 생성을 위한 데이터
          uploadedImages.push({
            projectId: id,
            filename: file.originalname,
            originalUrl: result.url,
            largeUrl: result.url,
            mediumUrl: result.url,
            thumbUrl: result.url,
          });

          fs.unlinkSync(tempPath);
        }
      }

      // 프로젝트 업데이트 (dataToUpdate가 있는 경우만)
      if (Object.keys(dataToUpdate).length > 0) {
        await prisma.project.update({
          where: { id },
          data: dataToUpdate,
        });
      }

      // 상세 이미지 레코드 생성
      if (uploadedImages.length > 0) {
        await prisma.projectImage.createMany({
          data: uploadedImages,
        });
      }

      // 최종 프로젝트 조회 (images 포함)
      const updatedProject = await prisma.project.findUnique({
        where: { id },
        include: {
          images: true,
          costs: true,
        },
      });

      res.json({ ok: true, project: updatedProject });
    } catch (error) {
      if (error.code === 'P2025') {
        const err = new Error('프로젝트를 찾을 수 없습니다.');
        err.status = 404;
        return next(err);
      }
      next(error);
    }
  });

// 📌 프로젝트 삭제 (DELETE /api/projects/:id)
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      const error = new Error('유효한 프로젝트 ID가 아닙니다.');
      error.status = 400;
      throw error;
    }

    // 1. 프로젝트에 연결된 이미지 조회
    const images = await prisma.projectImage.findMany({
      where: { projectId: id },
    });

    // 2. R2에서 이미지 파일 삭제
    for (const img of images) {
      // [수정] 모든 사이즈의 이미지를 삭제하도록 변경
      const urlsToDelete = [
        img.originalUrl,
        img.largeUrl,
        img.mediumUrl,
        img.thumbUrl,
      ].filter(Boolean);
      await Promise.all(urlsToDelete.map((url) => deleteFileFromR2(url)));
    }

    // [추가] 견적 내역 삭제 (Foreign Key 제약 조건 방지)
    await prisma.projectCost.deleteMany({ where: { projectId: id } });

    // 3. DB에서 이미지 레코드 삭제 (Cascade 설정이 없으므로 수동 삭제)
    await prisma.projectImage.deleteMany({ where: { projectId: id } });

    // 4. 프로젝트 삭제
    await prisma.project.delete({
      where: { id },
    });

    res.json({ ok: true, message: '프로젝트가 삭제되었습니다.' });
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('프로젝트를 찾을 수 없습니다.');
      err.status = 404;
      return next(err);
    }
    next(error);
  }
});

// 📌 프로젝트 개별 이미지 삭제 (DELETE /api/projects/images/:imageId)
router.delete('/images/:imageId', protect, async (req, res, next) => {
  try {
    const imageId = Number(req.params.imageId);
    if (isNaN(imageId)) {
      const error = new Error('유효한 이미지 ID가 아닙니다.');
      error.status = 400;
      throw error;
    }

    // 1. 이미지 정보 조회
    const image = await prisma.projectImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      const error = new Error('이미지를 찾을 수 없습니다.');
      error.status = 404;
      throw error;
    }

    // 2. R2에서 파일 삭제
    // [수정] 모든 사이즈의 이미지를 삭제하도록 변경
    const urlsToDelete = [
      image.originalUrl,
      image.largeUrl,
      image.mediumUrl,
      image.thumbUrl,
    ].filter(Boolean);
    await Promise.all(urlsToDelete.map((url) => deleteFileFromR2(url)));

    // 3. DB에서 레코드 삭제
    await prisma.projectImage.delete({
      where: { id: imageId },
    });

    res.json({ ok: true, message: '이미지가 삭제되었습니다.' });
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('이미지를 찾을 수 없습니다.');
      err.status = 404;
      return next(err);
    }
    next(error);
  }
});

export default router;
