/**
 * Health Check Routes
 */

const express = require('express');
const router = express.Router();
const { getHealth } = require('../controllers/healthController');

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Health Check
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/', getHealth);


module.exports = router;
