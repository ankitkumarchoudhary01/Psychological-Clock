const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const protect = require('../middleware/auth');

const router = express.Router();
router.use(protect); // All task routes require authentication

const COLOR_PALETTE = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#f97316', '#8b5cf6', '#14b8a6', '#ef4444', '#84cc16',
];

/**
 * Returns total durationMinutes for a user's tasks.
 * Optionally excludes a specific task (for update validation).
 */
const getTotalDuration = async (userId, excludeTaskId = null) => {
  const match = { userId: new mongoose.Types.ObjectId(userId) };
  if (excludeTaskId) {
    match._id = { $ne: new mongoose.Types.ObjectId(excludeTaskId) };
  }
  const result = await Task.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$durationMinutes' } } },
  ]);
  return result.length > 0 ? result[0].total : 0;
};

// ─── GET /api/tasks ──────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const tasks = await Task.find({ userId: req.user.userId }).sort({ order: 1 });
    return res.status(200).json({ success: true, data: { tasks } });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/tasks ─────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { title, durationMinutes, color } = req.body;

    if (!title || durationMinutes === undefined) {
      return res
        .status(400)
        .json({ success: false, message: 'Title and durationMinutes are required.' });
    }

    const duration = Number(durationMinutes);
    if (!Number.isFinite(duration) || duration < 1 || duration > 1440) {
      return res
        .status(400)
        .json({ success: false, message: 'durationMinutes must be between 1 and 1440.' });
    }

    const currentTotal = await getTotalDuration(req.user.userId);
    if (currentTotal + duration > 1440) {
      return res.status(400).json({
        success: false,
        message: `Adding this task would exceed 24 hours. You have ${1440 - currentTotal} minutes remaining.`,
      });
    }

    // Determine order and auto-color
    const lastTask = await Task.findOne({ userId: req.user.userId }).sort({ order: -1 });
    const nextOrder = lastTask ? lastTask.order + 1 : 0;
    const taskCount = await Task.countDocuments({ userId: req.user.userId });
    const autoColor = COLOR_PALETTE[taskCount % COLOR_PALETTE.length];

    const task = await Task.create({
      userId: req.user.userId,
      title: title.trim(),
      durationMinutes: duration,
      order: nextOrder,
      color: color || autoColor,
    });

    return res.status(201).json({ success: true, data: { task } });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/tasks/:id ──────────────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID.' });
    }

    const task = await Task.findOne({ _id: id, userId: req.user.userId });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const { title, durationMinutes, color, isCompleted } = req.body;

    if (durationMinutes !== undefined) {
      const newDuration = Number(durationMinutes);
      if (!Number.isFinite(newDuration) || newDuration < 1 || newDuration > 1440) {
        return res
          .status(400)
          .json({ success: false, message: 'durationMinutes must be between 1 and 1440.' });
      }
      const otherTotal = await getTotalDuration(req.user.userId, id);
      if (otherTotal + newDuration > 1440) {
        return res.status(400).json({
          success: false,
          message: `Update would exceed 24 hours. ${1440 - otherTotal} minutes available.`,
        });
      }
      task.durationMinutes = newDuration;
    }

    if (title !== undefined) task.title = title.trim();
    if (color !== undefined) task.color = color;
    if (isCompleted !== undefined) task.isCompleted = Boolean(isCompleted);

    await task.save();
    return res.status(200).json({ success: true, data: { task } });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/tasks/:id ───────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID.' });
    }

    const task = await Task.findOneAndDelete({ _id: id, userId: req.user.userId });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    return res.status(200).json({ success: true, data: { message: 'Task deleted.', taskId: id } });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/tasks/reorder ────────────────────────────────────────────────
// NOTE: This route must be defined BEFORE /:id to avoid conflict
router.patch('/reorder', async (req, res, next) => {
  try {
    const { tasks } = req.body;
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'tasks must be a non-empty array of { id, order }.' });
    }

    for (const entry of tasks) {
      if (!entry.id || !mongoose.Types.ObjectId.isValid(entry.id) || entry.order === undefined) {
        return res
          .status(400)
          .json({ success: false, message: 'Each entry must have a valid id and order.' });
      }
    }

    const bulkOps = tasks.map((entry) => ({
      updateOne: {
        filter: {
          _id: new mongoose.Types.ObjectId(entry.id),
          userId: new mongoose.Types.ObjectId(req.user.userId),
        },
        update: { $set: { order: Number(entry.order) } },
      },
    }));

    await Task.bulkWrite(bulkOps);
    const updatedTasks = await Task.find({ userId: req.user.userId }).sort({ order: 1 });

    return res.status(200).json({ success: true, data: { tasks: updatedTasks } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
