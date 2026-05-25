import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { fileTypeFromFile } from 'file-type';
import sharp from 'sharp';
import { AppError } from '../utils/appError.util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates custom configured file upload and validation middlewares.
 * @param {Object} config
 * @param {string} config.subFolder - Destination subfolder within public/uploads (e.g. 'vehicleCatalogIcons')
 * @param {Object} config.allowedTypes - Allowed mime-types mapping to extensions (e.g. { 'image/png': ['png'] })
 * @param {number} config.maxSize - Max file size in bytes (defaults to 5MB)
 */
export const createUploadMiddleware = ({
  subFolder,
  allowedTypes = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
  },
  maxSize = 5 * 1024 * 1024,
}) => {
  const uploadsDir = path.join(__dirname, '../../public/uploads', subFolder);

  // Ensure destination directory exists recursively
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = crypto.randomBytes(16).toString('hex');
      const sanitizedOriginalName = file.originalname.replace(/\s+/g, '_');
      cb(null, `${uniqueSuffix}-${sanitizedOriginalName}`);
    },
  });

  const fileFilter = (req, file, cb) => {
    if (Object.keys(allowedTypes).includes(file.mimetype)) {
      cb(null, true);
    } else {
      const extList = Object.values(allowedTypes).flat().join(', ').toUpperCase();
      cb(new AppError(`Invalid file type. Allowed formats: ${extList}`, 400), false);
    }
  };

  const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: maxSize },
  });

  const validateFileIntegrity = async (file) => {
    const currentPath = file.path;

    try {
      // 1. Magic Bytes Integrity Check
      const detectedType = await fileTypeFromFile(currentPath);

      if (!detectedType) {
        return {
          valid: false,
          reason: 'Unable to determine file type. File may be corrupted or empty.',
        };
      }

      const allowedMimes = Object.keys(allowedTypes);
      if (!allowedMimes.includes(detectedType.mime)) {
        return {
          valid: false,
          reason: `File type mismatch. Magic bytes check failed (Detected: ${detectedType.mime}).`,
        };
      }

      // 2. EXIF Metadata Sanitization for Images
      if (detectedType.mime.startsWith('image/')) {
        const tempSanitizedPath = currentPath + '.sanitized';
        await sharp(currentPath)
          .withMetadata({ orientation: 1 }) // Strips EXIF metadata but preserves orientation
          .toFile(tempSanitizedPath);

        fs.renameSync(tempSanitizedPath, currentPath);
      }

      // 3. Align Extension with Validated Magic Bytes
      const validatedExt = detectedType.ext;
      const fileBaseName = path.basename(file.filename, path.extname(file.filename));
      const safeFilename = `${fileBaseName}.${validatedExt}`;
      const newPath = path.join(path.dirname(currentPath), safeFilename);

      if (currentPath !== newPath) {
        fs.renameSync(currentPath, newPath);
        file.path = newPath;
        file.filename = safeFilename;
      }

      // 4. File Size Checks
      const stats = fs.statSync(file.path);
      if (stats.size === 0) {
        return { valid: false, reason: 'File is empty (0 bytes).' };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        reason: `Validation error: ${error.message}`,
      };
    }
  };

  const validateUpload = async (req, res, next) => {
    // If no files uploaded, skip validation
    if (!req.file && (!req.files || Object.keys(req.files).length === 0)) {
      return next();
    }

    const filesToValidate = [];
    if (req.file) {
      filesToValidate.push(req.file);
    }
    if (req.files) {
      if (Array.isArray(req.files)) {
        filesToValidate.push(...req.files);
      } else {
        Object.values(req.files).forEach((fileArray) => {
          if (Array.isArray(fileArray)) {
            filesToValidate.push(...fileArray);
          } else {
            filesToValidate.push(fileArray);
          }
        });
      }
    }

    for (const file of filesToValidate) {
      const validation = await validateFileIntegrity(file);

      if (!validation.valid) {
        // Safe Cleanup: Delete all uploaded files in this request if any file fails integrity checks
        filesToValidate.forEach((f) => {
          if (fs.existsSync(f.path)) {
            try {
              fs.unlinkSync(f.path);
            } catch (err) {
              // Ignore cleanup delete errors
            }
          }
        });

        return next(
          new AppError(`Invalid upload: "${file.originalname}". ${validation.reason}`, 400)
        );
      }
    }

    next();
  };

  return { upload, validateUpload };
};
