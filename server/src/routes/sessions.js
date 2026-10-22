const express  = require('express');
const mongoose = require('mongoose');
const auth     = require('../middleware/auth');
const Session  = require('../models/Session');

const router = express.Router();

/* ── POST /api/sessions ── save a completed or partial session ────────────── */
router.post('/', auth, async (req, res, next) => {
  try {
    const {
      taskId,
      taskSnapshot,          // { title, durationMinutes, color }
      startedAt,
      endedAt,
      breaks,
      totalFocusSeconds,
      totalBreakSeconds,
      status,
    } = req.body;

    if (!taskSnapshot?.title || !taskSnapshot?.durationMinutes) {
      return res.status(400).json({ success: false, message: 'taskSnapshot.title and durationMinutes are required.' });
    }

    const session = await Session.create({
      userId:            req.user.userId,
      taskId:            taskId || null,
      taskSnapshot,
      startedAt:         startedAt ? new Date(startedAt) : new Date(),
      endedAt:           endedAt   ? new Date(endedAt)   : new Date(),
      breaks:            Array.isArray(breaks) ? breaks : [],
      totalFocusSeconds: Number(totalFocusSeconds) || 0,
      totalBreakSeconds: Number(totalBreakSeconds) || 0,
      status:            ['completed', 'partial'].includes(status) ? status : 'partial',
    });

    return res.status(201).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
});

/* ── GET /api/sessions ── list user sessions (newest first, max 200) ─────── */
router.get('/', auth, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
    const sessions = await Session.find({ userId: req.user.userId })
      .sort({ startedAt: -1 })
      .limit(limit)
      .select('-__v');
    return res.json({ success: true, data: sessions });
  } catch (err) {
    next(err);
  }
});

/* ── GET /api/sessions/analytics ── daily aggregations (last 30 days) ────── */
router.get('/analytics', auth, async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const uid = new mongoose.Types.ObjectId(req.user.userId);

    const dailyStats = await Session.aggregate([
      { $match: { userId: uid, startedAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id:               { $dateToString: { format: '%Y-%m-%d', date: '$startedAt', timezone: 'Asia/Kolkata' } },
          totalFocusSeconds: { $sum: '$totalFocusSeconds' },
          totalBreakSeconds: { $sum: '$totalBreakSeconds' },
          sessionCount:      { $sum: 1 },
          completedCount:    { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Overall totals
    const totals = await Session.aggregate([
      { $match: { userId: uid } },
      {
        $group: {
          _id:               null,
          totalFocusSeconds: { $sum: '$totalFocusSeconds' },
          totalBreakSeconds: { $sum: '$totalBreakSeconds' },
          totalSessions:     { $sum: 1 },
          completedSessions: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        },
      },
    ]);

    // Most common break reasons
    const breakReasons = await Session.aggregate([
      { $match: { userId: uid } },
      { $unwind: { path: '$breaks', preserveNullAndEmptyArrays: false } },
      { $group: { _id: '$breaks.reason', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    return res.json({
      success: true,
      data: {
        daily:        dailyStats,
        totals:       totals[0] || { totalFocusSeconds: 0, totalBreakSeconds: 0, totalSessions: 0, completedSessions: 0 },
        breakReasons,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* ── DELETE /api/sessions/:id ── remove a session ────────────────────────── */
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const sess = await Session.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!sess) return res.status(404).json({ success: false, message: 'Session not found.' });
    return res.json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
