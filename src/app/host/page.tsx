'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import { Trophy, Users, Play, Settings, Copy, Check, RefreshCw, QrCode as QrCodeIcon, Home, GripVertical, Plus } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Game {
  id: string;
  room_code: string;
  status: string;
  current_question: number;
  total_questions: number;
  day: number;
  created_at: string;
}

interface Player {
  id: string;
  name: string;
  total_score: number;
}

interface Question {
  id: string;
  day: number;
  question?: string;
  question_text?: string;
  options?: string[];
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer: number | string;
  display_order: number;
}

// Sortable question item component
function SortableQuestionItem({ 
  question, 
  index, 
  onEdit, 
  onDelete,
  isEditing,
  editedQuestion,
  onSaveEdit,
  onCancelEdit,
  onEditChange
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const questionText = question.question || question.question_text;
  const options = question.options || [
    question.option_a,
    question.option_b,
    question.option_c,
    question.option_d,
  ];
  const correctIdx = typeof question.correct_answer === 'number' 
    ? question.correct_answer 
    : ['A', 'B', 'C', 'D'].indexOf(question.correct_answer);

  return (
    <div ref={setNodeRef} style={style} className="bg-white border border-gray-200 rounded-lg p-4 mb-2">
      {isEditing ? (
        // Edit mode
        <div className="space-y-3">
          <input
            type="text"
            value={editedQuestion.question}
            onChange={(e) => onEditChange({ ...editedQuestion, question: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Question text"
          />
          {editedQuestion.options.map((opt: string, idx: number) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="radio"
                checked={editedQuestion.correct_answer === idx}
                onChange={() => onEditChange({ ...editedQuestion, correct_answer: idx })}
                className="w-4 h-4"
              />
              <input
                type="text"
                value={opt}
                onChange={(e) => {
                  const newOpts = [...editedQuestion.options];
                  newOpts[idx] = e.target.value;
                  onEditChange({ ...editedQuestion, options: newOpts });
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <button
              onClick={onSaveEdit}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        // View mode
        <div className="flex gap-3">
          {/* Drag handle */}
          <div {...attributes} {...listeners} className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 pt-1">
            <GripVertical size={20} />
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="font-medium text-gray-900">
                <span className="text-gray-500 mr-2">#{index + 1}</span>
                {questionText}
              </div>
            </div>
            
            <div className="space-y-1 ml-8">
              {options.map((opt: string, idx: number) => (
                <div
                  key={idx}
                  className={`text-sm px-2 py-1 rounded ${
                    idx === correctIdx
                      ? 'bg-green-100 text-green-800 font-medium'
                      : 'text-gray-600'
                  }`}
                >
                  {String.fromCharCode(65 + idx)}. {opt}
                  {idx === correctIdx && ' ✓'}
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onEdit(question)}
                className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(question.id)}
                className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HostDashboard() {
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [day, setDay] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [conferenceDays, setConferenceDays] = useState(5);
  const [isCreating, setIsCreating] = useState(false);
  const [roomCodeCopied, setRoomCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [availableQuestions, setAvailableQuestions] = useState(0);
  const [showCustomQuestions, setShowCustomQuestions] = useState(false);
  const [customQuestionDay, setCustomQuestionDay] = useState(1);
  const [customQuestion, setCustomQuestion] = useState('');
  const [customOptions, setCustomOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [questionCounts, setQuestionCounts] = useState<Record<number, number>>({});
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [showQuestionList, setShowQuestionList] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [insertingAtIndex, setInsertingAtIndex] = useState<number | null>(null);
  const [insertQuestion, setInsertQuestion] = useState('');
  const [insertOptions, setInsertOptions] = useState(['', '', '', '']);
  const [insertCorrectAnswer, setInsertCorrectAnswer] = useState(0);

  // Setup drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Generate random 6-digit room code
  const generateRoomCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Check available questions for selected day and all days
  useEffect(() => {
    const fetchQuestionCounts = async () => {
      // Fetch count for current day
      const { count } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('day', day);
      
      setAvailableQuestions(count || 0);

      // Fetch counts for all conference days
      const counts: Record<number, number> = {};
      for (let i = 1; i <= conferenceDays; i++) {
        const { count } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('day', i);
        counts[i] = count || 0;
      }
      setQuestionCounts(counts);
    };
    
    fetchQuestionCounts();
  }, [day, conferenceDays]);

  // Subscribe to player updates
  useEffect(() => {
    if (!game) return;

    const fetchPlayers = async () => {
      const { data } = await supabase
        .from('players')
        .select('*')
        .order('total_score', { ascending: false });
      
      if (data) setPlayers(data);
    };

    fetchPlayers();

    // Set up real-time subscription for player updates
    const channel = supabase
      .channel('players-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        () => {
          fetchPlayers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game]);

  const handleCreateGame = async () => {
    if (isCreating) return;
    
    try {
    setIsCreating(true);
      const roomCode = generateRoomCode();
      
      const { data: newGame, error } = await supabase
        .from('games')
        .insert({
          room_code: roomCode,
          status: 'waiting',
          current_question: 0,
          total_questions: totalQuestions,
          day: day
        })
        .select()
        .single();
      
      if (error) throw error;
      setGame(newGame);
    } catch (err) {
      console.error('Error creating game:', err);
      alert('Failed to create game. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartGame = async () => {
    if (!game) return;
    
    try {
      // Get first question for the selected day
      const { data: questions, error: questionError } = await supabase
        .from('questions')
        .select('*')
        .eq('day', day)
        .order('id')
        .limit(1);
      
      if (questionError) throw questionError;
      if (!questions || questions.length === 0) {
        alert(`No questions available for Day ${day}. Please add questions first.`);
        return;
      }
      
      // Update game to playing status with first question
      const { error: updateError } = await supabase
        .from('games')
        .update({
          status: 'playing',
          current_question: questions[0].id
        })
        .eq('id', game.id);
      
      if (updateError) throw updateError;
      
      setGame({ ...game, status: 'playing', current_question: questions[0].id });
      alert('Game started! Players can now answer questions.');
    } catch (err) {
      console.error('Error starting game:', err);
      alert('Failed to start game. Please try again.');
    }
  };

  const handleEndGame = async () => {
    if (!game) return;
    
    try {
      const { error } = await supabase
        .from('games')
        .update({ status: 'finished' })
        .eq('id', game.id);
      
      if (error) throw error;
      
      setGame({ ...game, status: 'finished' });
      alert('Game ended! Check the leaderboard for final scores.');
    } catch (err) {
      console.error('Error ending game:', err);
      alert('Failed to end game. Please try again.');
    }
  };

  const copyRoomCode = () => {
    if (game) {
      navigator.clipboard.writeText(game.room_code);
      setRoomCodeCopied(true);
      setTimeout(() => setRoomCodeCopied(false), 2000);
    }
  };

  const getJoinUrl = () => {
    if (!game) return '';
    return `${window.location.origin}/?code=${game.room_code}`;
  };

  const handleAddCustomQuestion = async () => {
    if (!customQuestion.trim() || customOptions.some(opt => !opt.trim())) {
      alert('Please fill in the question and all answer options');
      return;
    }

    setIsAddingQuestion(true);
    try {
      // Try new format first (with options array)
      const questionData: any = {
        day: customQuestionDay,
        question: customQuestion.trim(),
        options: customOptions,
        correct_answer: correctAnswer,
      };

      console.log('Adding question with new format:', questionData);

      let { data, error } = await supabase
        .from('questions')
        .insert(questionData)
        .select();

      // If new format fails, try old format (separate columns)
      if (error && (error.message?.includes('options') || error.message?.includes('question'))) {
        console.log('New format failed, trying old format with separate columns');
        
        const oldFormatData = {
          day: customQuestionDay,
          question_text: customQuestion.trim(),
          option_a: customOptions[0],
          option_b: customOptions[1],
          option_c: customOptions[2],
          option_d: customOptions[3],
          correct_answer: correctAnswer,
        };

        const result = await supabase
          .from('questions')
          .insert(oldFormatData)
          .select();
        
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Supabase error:', JSON.stringify(error, null, 2));
        throw new Error(error.message || error.hint || 'Failed to insert question');
      }

      console.log('Question added successfully:', data);
      alert(`Question added successfully to Day ${customQuestionDay}! ✅`);
      setCustomQuestion('');
      setCustomOptions(['', '', '', '']);
      setCorrectAnswer(0);
      
      // Refresh question counts for all days
      const counts: Record<number, number> = {};
      for (let i = 1; i <= conferenceDays; i++) {
        const { count } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('day', i);
        counts[i] = count || 0;
      }
      setQuestionCounts(counts);
      
      // Update current day count if applicable
      if (customQuestionDay === day) {
        setAvailableQuestions((counts[day] || 0));
      }
    } catch (err: any) {
      console.error('Error adding question:', err);
      const errorMessage = err?.message || JSON.stringify(err) || 'Unknown error';
      alert(`Failed to add question.\n\nError: ${errorMessage}\n\nPlease run the SQL migration in Supabase to add the 'options' and 'question' columns.`);
    } finally {
      setIsAddingQuestion(false);
    }
  };

  const updateCustomOption = (index: number, value: string) => {
    const newOptions = [...customOptions];
    newOptions[index] = value;
    setCustomOptions(newOptions);
  };

  const fetchQuestionsForDay = async (dayNum: number) => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('day', dayNum)
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Ensure display_order is set for all questions
      const questionsWithOrder = (data || []).map((q, idx) => ({
        ...q,
        display_order: q.display_order ?? idx
      }));
      
      setAllQuestions(questionsWithOrder);
    } catch (err) {
      console.error('Error fetching questions:', err);
    }
  };

  // Handle drag end for reordering questions
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = allQuestions.findIndex((q) => q.id === active.id);
    const newIndex = allQuestions.findIndex((q) => q.id === over.id);

    const newOrder = arrayMove(allQuestions, oldIndex, newIndex);
    setAllQuestions(newOrder);

    // Update display_order in database
    try {
      const updates = newOrder.map((q, idx) => ({
        id: q.id,
        display_order: idx
      }));

      for (const update of updates) {
        await supabase
          .from('questions')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }
    } catch (err) {
      console.error('Error updating question order:', err);
      alert('Failed to update question order');
      // Revert on error
      await fetchQuestionsForDay(customQuestionDay);
    }
  };

  // Handle inserting a new question at a specific position
  const handleInsertAtPosition = async (index: number) => {
    if (!insertQuestion.trim() || insertOptions.some(opt => !opt.trim())) {
      alert('Please fill in the question and all answer options');
      return;
    }

    try {
      // Insert the new question
      const questionData: any = {
        day: customQuestionDay,
        question: insertQuestion.trim(),
        options: insertOptions,
        correct_answer: insertCorrectAnswer,
        display_order: index
      };

      const { data, error } = await supabase
        .from('questions')
        .insert(questionData)
        .select()
        .single();

      if (error) throw error;

      // Update display_order for subsequent questions
      const questionsToUpdate = allQuestions.filter(q => q.display_order >= index);
      for (const q of questionsToUpdate) {
        await supabase
          .from('questions')
          .update({ display_order: q.display_order + 1 })
          .eq('id', q.id);
      }

      alert('Question added successfully!');
      setIsAddingQuestion(false);
      setInsertQuestion('');
      setInsertOptions(['', '', '', '']);
      setInsertCorrectAnswer(0);
      await fetchQuestionsForDay(customQuestionDay);
      
      // Refresh question counts
      const counts: Record<number, number> = {};
      for (let i = 1; i <= conferenceDays; i++) {
        const { count } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('day', i);
        counts[i] = count || 0;
      }
      setQuestionCounts(counts);
    } catch (err: any) {
      console.error('Error inserting question:', err);
      alert(`Failed to insert question: ${err.message}`);
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      alert('Question deleted successfully!');
      await fetchQuestionsForDay(customQuestionDay);
      
      // Refresh counts
      const counts: Record<number, number> = {};
      for (let i = 1; i <= conferenceDays; i++) {
        const { count } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('day', i);
        counts[i] = count || 0;
      }
      setQuestionCounts(counts);
    } catch (err) {
      console.error('Error deleting question:', err);
      alert('Failed to delete question');
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return;

    try {
      const updateData: any = {
        question: editingQuestion.question || editingQuestion.question_text,
      };

      // Handle both formats
      if (editingQuestion.options) {
        updateData.options = editingQuestion.options;
      } else {
        updateData.option_a = editingQuestion.options?.[0] || editingQuestion.option_a;
        updateData.option_b = editingQuestion.options?.[1] || editingQuestion.option_b;
        updateData.option_c = editingQuestion.options?.[2] || editingQuestion.option_c;
        updateData.option_d = editingQuestion.options?.[3] || editingQuestion.option_d;
      }

      const { error } = await supabase
        .from('questions')
        .update(updateData)
        .eq('id', editingQuestion.id);

      if (error) throw error;

      alert('Question updated successfully!');
      setEditingQuestion(null);
      await fetchQuestionsForDay(customQuestionDay);
    } catch (err) {
      console.error('Error updating question:', err);
      alert('Failed to update question');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
        {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-4">
            <Trophy className="w-8 h-8 text-purple-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Host Dashboard</h1>
              <p className="text-sm text-gray-600">Leadership Conference Trivia</p>
              </div>
            </div>
          <button
            onClick={() => router.push('/')}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Home className="w-6 h-6" />
          </button>
          </div>
        </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        {!game ? (
          /* Game Setup */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Settings className="w-6 h-6 mr-2" />
              Create New Game
            </h2>

            <div className="space-y-6">
              {/* Conference Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Total Conference Days */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Conference Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={conferenceDays}
                    onChange={(e) => setConferenceDays(Number(e.target.value))}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Total days in the conference
                  </p>
                </div>

                {/* Time Per Question */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Time Per Question (seconds)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="120"
                    value={timePerQuestion}
                    onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Between 10 and 120 seconds
                  </p>
                  </div>
                </div>

              {/* Day Selection */}
                <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Select Game Day
                  </label>
                <select
                  value={day}
                  onChange={(e) => setDay(Number(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                >
                  {Array.from({ length: conferenceDays }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      Day {d}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-600 mt-1">
                  {availableQuestions} questions available for this day
                </p>
                </div>

              {/* Total Questions */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Number of Questions
                  </label>
                    <input
                  type="number"
                  min="1"
                  max={availableQuestions}
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Number(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Maximum: {availableQuestions} questions
                </p>
            </div>

              {/* Manage Questions Section - Integrated Flow */}
              <div className="border-t border-gray-200 pt-6">
                <button
                  onClick={() => {
                    setShowCustomQuestions(!showCustomQuestions);
                    if (!showCustomQuestions) {
                      fetchQuestionsForDay(customQuestionDay);
                    }
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-lg transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <Settings className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-gray-900">Manage Questions</span>
                  </div>
                  <motion.div
                    animate={{ rotate: showCustomQuestions ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </motion.div>
                </button>

                {showCustomQuestions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4 space-y-6 bg-gradient-to-br from-gray-50 to-purple-50 p-6 rounded-lg border border-purple-100"
                  >
                    {/* Question Count Summary */}
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-semibold text-gray-900 mb-3">Question Bank Summary</h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {Array.from({ length: conferenceDays }, (_, i) => i + 1).map((d) => (
                          <div
                            key={d}
                            onClick={() => {
                              setCustomQuestionDay(d);
                              fetchQuestionsForDay(d);
                            }}
                            className={`text-center p-2 rounded-lg cursor-pointer transition-all ${
                              d === customQuestionDay
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <div className="text-xs font-medium">Day {d}</div>
                            <div className="text-lg font-bold">{questionCounts[d] || 0}</div>
                            <div className="text-xs opacity-75">questions</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Integrated Question Flow */}
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-900">
                          Day {customQuestionDay} Questions ({allQuestions.length})
                        </h4>
                      </div>

                      {/* Add New Question Button (Top) */}
                      {!isAddingQuestion && (
                        <button
                          onClick={() => setIsAddingQuestion(true)}
                          className="w-full mb-4 py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-md flex items-center justify-center gap-2"
                        >
                          <Plus size={20} />
                          Add New Question to Day {customQuestionDay}
                        </button>
                      )}

                      {/* Add Question Form (appears at top when triggered) */}
                      {isAddingQuestion && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-green-50 border-2 border-green-300 rounded-lg p-4 mb-4"
                        >
                          <h4 className="font-semibold text-green-900 mb-3">
                            ➕ Add New Question (will be added at the end)
                          </h4>
                          <div className="space-y-3">
                            <textarea
                              value={insertQuestion}
                              onChange={(e) => setInsertQuestion(e.target.value)}
                              placeholder="Question text"
                              rows={2}
                              className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            {insertOptions.map((opt, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  checked={insertCorrectAnswer === i}
                                  onChange={() => setInsertCorrectAnswer(i)}
                                  className="w-4 h-4"
                                />
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const newOpts = [...insertOptions];
                                    newOpts[i] = e.target.value;
                                    setInsertOptions(newOpts);
                                  }}
                                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                  className="flex-1 px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                              </div>
                            ))}
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleInsertAtPosition(allQuestions.length)}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              >
                                Add Question
                              </button>
                              <button
                                onClick={() => {
                                  setIsAddingQuestion(false);
                                  setInsertQuestion('');
                                  setInsertOptions(['', '', '', '']);
                                  setInsertCorrectAnswer(0);
                                }}
                                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Questions List with Drag & Drop */}
                      <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {allQuestions.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <p>No questions added for Day {customQuestionDay} yet.</p>
                            <p className="text-sm mt-2">Click "Add New Question" above to get started!</p>
                          </div>
                        ) : (
                          <>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                              <p className="text-sm text-blue-800 flex items-center gap-2">
                                <GripVertical size={16} />
                                <strong>Tip:</strong> Drag questions to reorder them • New questions are added to the end of the list
                              </p>
                            </div>

                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={handleDragEnd}
                            >
                              <SortableContext
                                items={allQuestions.map(q => q.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                {allQuestions.map((q, idx) => (
                                  <SortableQuestionItem
                                    key={q.id}
                                    question={q}
                                    index={idx}
                                    onEdit={(question: any) => setEditingQuestion(question)}
                                    onDelete={handleDeleteQuestion}
                                    isEditing={editingQuestion?.id === q.id}
                                    editedQuestion={editingQuestion}
                                    onSaveEdit={handleUpdateQuestion}
                                    onCancelEdit={() => setEditingQuestion(null)}
                                    onEditChange={(updated: any) => setEditingQuestion(updated)}
                                  />
                                ))}
                              </SortableContext>
                            </DndContext>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Create Button */}
                <button
                  onClick={handleCreateGame}
                disabled={isCreating || availableQuestions === 0}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-lg font-bold text-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                {isCreating ? 'Creating...' : 'Create Game'}
                </button>
              </div>
          </motion.div>
        ) : (
          /* Active Game Dashboard */
          <div className="space-y-6">
            {/* Room Code Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg p-8"
            >
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Room Code</h2>
                <div className="flex items-center justify-center space-x-4">
                  <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-8 py-4 rounded-lg">
                    <p className="text-5xl font-bold text-purple-800 tracking-widest font-mono">
                      {game.room_code}
                    </p>
                    </div>
                    <button
                      onClick={copyRoomCode}
                    className="p-3 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
                  >
                    {roomCodeCopied ? (
                      <Check className="w-6 h-6 text-green-600" />
                    ) : (
                      <Copy className="w-6 h-6 text-purple-600" />
                    )}
                    </button>
                  </div>
                </div>

              {/* QR Code Section */}
              <div className="border-t pt-6">
                <button
                  onClick={() => setShowQR(!showQR)}
                  className="w-full flex items-center justify-center space-x-2 text-purple-600 hover:text-purple-700 font-semibold mb-4"
                >
                  <QrCodeIcon className="w-5 h-5" />
                  <span>{showQR ? 'Hide QR Code' : 'Show QR Code'}</span>
                </button>

                {showQR && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col items-center space-y-4"
                  >
                    <div className="bg-white p-6 rounded-lg border-4 border-purple-200">
                      <QRCodeSVG
                        value={getJoinUrl()}
                        size={256}
                        level="H"
                        includeMargin={true}
                      />
                  </div>
                    <p className="text-sm text-gray-600 text-center">
                      Players can scan this QR code to join instantly
                    </p>
                    <div className="flex items-center space-x-2 w-full max-w-md">
                      <input
                        type="text"
                        value={getJoinUrl()}
                        readOnly
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono text-gray-700"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(getJoinUrl());
                          setLinkCopied(true);
                          setTimeout(() => setLinkCopied(false), 2000);
                        }}
                        className="p-2 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
                      >
                        {linkCopied ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-purple-600" />
                        )}
                      </button>
                </div>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Game Status Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-lg p-8"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Game Status</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-2xl font-bold text-purple-800 capitalize">{game.status}</p>
              </div>
                <div className="bg-pink-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Day</p>
                  <p className="text-2xl font-bold text-pink-800">Day {game.day}</p>
                      </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Questions</p>
                  <p className="text-2xl font-bold text-blue-800">{game.total_questions}</p>
                    </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Players</p>
                  <p className="text-2xl font-bold text-green-800">{players.length}</p>
              </div>
            </div>

            {/* Game Controls */}
              <div className="flex space-x-4">
                {game.status === 'waiting' && (
                  <button
                    onClick={handleStartGame}
                    className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Play className="w-5 h-5" />
                    <span>Start Game</span>
                  </button>
                )}

                {game.status === 'playing' && (
                  <button
                    onClick={handleEndGame}
                    className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg font-bold hover:bg-red-700 transition-colors"
                  >
                    End Game
                  </button>
                )}

                {game.status === 'finished' && (
                <button
                    onClick={() => setGame(null)}
                    className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg font-bold hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
                >
                    <RefreshCw className="w-5 h-5" />
                    <span>Create New Game</span>
                </button>
                )}
              </div>
            </motion.div>

            {/* Leaderboard Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-lg p-8"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
                Live Leaderboard
              </h2>
              
              {players.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No players yet. Share the room code to get started!</p>
            </div>
              ) : (
                <div className="space-y-2">
                  {players.slice(0, 10).map((player, index) => (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        index === 0
                          ? 'bg-yellow-50 border-2 border-yellow-200'
                          : index === 1
                          ? 'bg-gray-50 border-2 border-gray-200'
                          : index === 2
                          ? 'bg-orange-50 border-2 border-orange-200'
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            index === 0
                              ? 'bg-yellow-400 text-yellow-900'
                              : index === 1
                              ? 'bg-gray-300 text-gray-900'
                              : index === 2
                              ? 'bg-orange-400 text-orange-900'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {index + 1}
                        </div>
                        <span className="font-semibold text-gray-900">{player.name}</span>
                      </div>
                      <span className="text-lg font-bold text-purple-600">
                        {player.total_score} pts
                      </span>
                    </div>
                  ))}
          </div>
        )}
            </motion.div>
      </div>
        )}
      </main>
    </div>
  );
}