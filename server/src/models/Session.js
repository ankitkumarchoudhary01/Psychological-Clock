const { Schema, model } = require('mongoose');

/**
 * Session — one focused work period for a single task.
 * Saved to DB when the user exits the clock page (partial) or the timer
 * completes (completed).
 */
const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Reference to the original Task (may be null if task was later deleted)
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', default: null },

    // Snapshot of task data at session time (so analytics survive task edits/deletes)
    taskSnapshot: {
      title:           { type: String,  required: true },
      durationMinutes: { type: Number,  required: true },
      color:           { type: String,  default: '#6366f1' },
    },

    startedAt: { type: Date, required: true },
    endedAt:   { type: Date },

    breaks: [
      {
        reason:          { type: String, default: 'Unspecified' },
        durationSeconds: { type: Number, default: 0 },
        startedAt:       { type: Date },
      },
    ],

    // Actual focused seconds (excludes break time)
    totalFocusSeconds: { type: Number, default: 0 },
    totalBreakSeconds: { type: Number, default: 0 },

    status: {
      type:    String,
      enum:    ['completed', 'partial'],
      default: 'partial',
    },
  },
  { timestamps: true }
);

// Index for analytics queries: user + date range
sessionSchema.index({ userId: 1, startedAt: -1 });

module.exports = model('Session', sessionSchema);
