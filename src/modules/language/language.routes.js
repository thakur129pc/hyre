import express from 'express';
import validate from '../../middlewares/validate.middleware.js';
import { authenticateJWT, authorizeRoles } from '../../middlewares/auth.middleware.js';
import {
  addLanguageSchema,
  editLanguageSchema,
  languageParamSchema,
  languageCodeParamSchema,
  queryLanguagesSchema,
} from './language.validation.js';
import {
  addLanguage,
  editLanguage,
  toggleLanguageStatus,
  deleteLanguage,
  getLanguages,
  getLanguageByCode,
} from './language.controller.js';

const router = express.Router();

// --- PUBLIC/AUTHENTICATED ENDPOINTS ---
// (Accessible to any logged-in Passenger, Rider, or Admin)
router.post('/list', authenticateJWT, validate({ body: queryLanguagesSchema }), getLanguages);
router.post(
  '/code/:code',
  authenticateJWT,
  validate({ params: languageCodeParamSchema }),
  getLanguageByCode
);

// --- ADMINISTRATIVE WRITE ENDPOINTS ---
// (Restricted to super_admin only)
router.use(authenticateJWT, authorizeRoles('super_admin'));

router.post('/add', validate({ body: addLanguageSchema }), addLanguage);
router.post(
  '/edit/:id',
  validate({ params: languageParamSchema, body: editLanguageSchema }),
  editLanguage
);
router.post('/toggle-status/:id', validate({ params: languageParamSchema }), toggleLanguageStatus);
router.post('/delete/:id', validate({ params: languageParamSchema }), deleteLanguage);

export default router;
