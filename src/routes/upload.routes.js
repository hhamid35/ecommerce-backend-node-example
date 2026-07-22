'use strict';

const express = require('express');
const upload = require('../middleware/upload.middleware');
const { uploadPhotos } = require('../controllers/upload.controller');

const router = express.Router();

// Field name must remain "photos" to match the mobile client's form-data.
router.post('/photos/upload', upload.array('photos', 12), uploadPhotos);

module.exports = router;
