import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import protect from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// FIX: Use /tmp/uploads instead of __dirname/uploads
// Vercel's /var/task filesystem is read-only — only /tmp is writable
const UPLOADS_DIR = '/tmp/uploads';
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${timestamp}-${random}${ext}`);
  },
});

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024 },
});

const router = Router();

/**
 * @route  POST /api/upload
 * @access Private
 * @desc   Upload a single image file — returns the public URL
 */
router.post(
  '/',
  protect,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: fileUrl,
      filename: req.file.filename,
    });
  })
);

export default router;  