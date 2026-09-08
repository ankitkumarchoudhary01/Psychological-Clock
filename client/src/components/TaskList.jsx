import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { selectTasks, reorderTasks } from '../store/tasksSlice';
import { tasksApi } from '../services/api';
import TaskCard from './TaskCard';
import AddTaskModal from './AddTaskModal';

const TaskList = () => {
  const dispatch = useDispatch();
  const tasks = useSelector(selectTasks);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t._id === active.id);
    const newIndex = tasks.findIndex((t) => t._id === over.id);
    const reordered = arrayMove(tasks, oldIndex, newIndex).map((t, i) => ({ ...t, order: i }));

    dispatch(reorderTasks(reordered));

    try {
      await tasksApi.reorderTasks(reordered.map((t) => ({ id: t._id, order: t.order })));
    } catch {
      toast.error('Failed to save new order.');
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const activeTask = activeId ? tasks.find((t) => t._id === activeId) : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Tasks{' '}
          <span className="text-gray-500 font-normal text-sm">({tasks.length})</span>
        </h2>
        <button
          onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
          className="btn-primary text-sm flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Task
        </button>
      </div>

      {/* Empty state */}
      {tasks.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-8 text-center"
        >
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-400 font-medium">No tasks yet</p>
          <p className="text-gray-500 text-sm mt-1">Add your first task to plan your day</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary mt-4 text-sm"
          >
            Add Your First Task
          </button>
        </motion.div>
      )}

      {/* Sortable List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            <AnimatePresence>
              {tasks.map((task) => (
                <TaskCard key={task._id} task={task} onEdit={handleEdit} />
              ))}
            </AnimatePresence>
          </div>
        </SortableContext>

        {/* Drag overlay (ghost card while dragging) */}
        <DragOverlay>
          {activeTask && (
            <div className="glass-card p-4 flex items-center gap-3 shadow-2xl shadow-indigo-500/30 rotate-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeTask.color }} />
              <span className="text-white font-medium">{activeTask.title}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <AddTaskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        editTask={editingTask}
      />
    </div>
  );
};

export default TaskList;
