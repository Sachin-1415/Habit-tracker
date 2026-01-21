const express = require('express');
const router = express.Router();
const controller = require('../controllers/habitsController');

// CRUD
router.post('/habits', controller.createHabit);
router.get('/habits', controller.listHabits);
router.patch('/habits/:id/complete', controller.completeHabit);
router.delete('/habits/:id', controller.deleteHabit);

// Optional AI suggestions
router.post('/suggest-habits', controller.suggestHabits);

module.exports = router;

