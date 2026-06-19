import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import MathText from '../../../components/MathText';
import InlineTopicEditor from './InlineTopicEditor';

const DIFFICULTY_VALUES = ['EASY', 'MEDIUM', 'HARD'];

const QuestionCard = ({
  question,
  index,
  onEdit,
  onRemove,
  onReplace,
  onMoveUp,
  onMoveDown,
  onDelete,
  // Inline edit wiring (provided by the question-bank page).
  editable = false,
  bulkMode = false,
  pendingEdit = null,
  subjects = [],
  fetchChapters,
  fetchTopics,
  resolveTopicPath,
  onFieldChange,
  onSaveRow,
  onResetRow,
  savingRow = false,
  rowError = null,
  // Publish / draft wiring.
  onPublish,
  publishing = false,
  // Multi-select (used for bulk publish on the Draft tab).
  selectable = false,
  selected = false,
  onToggleSelect
}) => {
  const [showFullQuestion, setShowFullQuestion] = useState(false);

  // Bulletproof safety checks
  if (!question || typeof question !== 'object') {
    return null; // Don't render anything for invalid data
  }

  const safeQuestion = {
    id: question.id || Math.random(),
    text: question.text || 'No question text',
    questionType: question.questionType || 'mcq',
    difficultyLevel: question.difficultyLevel || 'MEDIUM',
    topicName: question.topicName || '',
    marks: question.marks || 4,
    negativeMarks: question.negativeMarks || 0,
    options: Array.isArray(question.options) ? question.options : [],
    questionImagePath: question.questionImagePath || '',
    textFormat: question.textFormat || 'PLAIN',
    // IDs that locate the question in the Subject→Chapter→Topic tree, used to
    // prefill the inline topic editor with its current path. Mirror the field
    // fallbacks useQuestionForm uses, since the API names vary by endpoint.
    subjectId: question.subjectId ?? question.subject ?? null,
    chapterId: question.chapterId ?? question.chapter ?? null,
    topicId: question.topicId ?? question.topic ?? null
  };

  // A question is a draft until explicitly published. Backend always returns
  // draftMode on QuestionResponseDto; treat a missing value as published.
  const isDraft = question.draftMode === true;

  const isLatex = String(safeQuestion.textFormat).toUpperCase() === 'LATEX';

  // Effective values = the question's own value unless a pending (unsaved) edit
  // overrides it. The card never mutates the question itself; the parent owns the
  // pending-edit map so a single "Save all" can replay every change.
  const effectiveDifficulty = String(
    pendingEdit?.difficultyLevel || safeQuestion.difficultyLevel || 'MEDIUM'
  ).toUpperCase();
  const effectiveTopicName = pendingEdit?.topicName ?? safeQuestion.topicName;
  const isDirty = !!pendingEdit && Object.keys(pendingEdit).length > 0;

  const getDifficultyColor = (difficulty) => {
    const safeLevel = (difficulty || '').toLowerCase();
    switch (safeLevel) {
      case 'easy': return 'text-green-700 bg-green-100';
      case 'medium': return 'text-yellow-700 bg-yellow-100';
      case 'hard': return 'text-red-700 bg-red-100';
      default: return 'text-foreground bg-muted';
    }
  };

  const truncateText = (text, maxLength = 150) => {
    if (!text || typeof text !== 'string') return '';
    return text.length <= maxLength ? text : text.substring(0, maxLength) + '...';
  };

  const safeHandleClick = (handler, ...args) => {
    try {
      if (typeof handler === 'function') {
        handler(...args);
      }
    } catch (error) {
      // Silent fail to prevent crashes
    }
  };

  return (
    <div
      className={`bg-card border rounded-lg p-4 shadow-sm transition-all duration-200 hover:shadow-md ${
        isDirty ? 'border-amber-300 ring-1 ring-amber-200' : 'border-border'
      }`}
    >

      {/* Question Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {/* Selection checkbox (bulk publish) */}
          {selectable && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect?.(safeQuestion.id)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              title="Select for bulk publish"
            />
          )}

          {/* Question Number */}
          <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
            {(index || 0) + 1}
          </div>

          {/* Question Type Badge */}
          <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {safeQuestion.questionType.toUpperCase()}
          </div>

          {/* Publish status badge */}
          <div
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              isDraft ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
            }`}
          >
            {isDraft ? 'Draft' : 'Published'}
          </div>

          {/* Difficulty — inline editable dropdown right where the badge was */}
          {editable ? (
            <select
              value={effectiveDifficulty}
              onChange={(e) => onFieldChange?.(safeQuestion.id, { difficultyLevel: e.target.value })}
              disabled={savingRow}
              title="Change difficulty"
              className={`px-2 py-1 pr-6 rounded-full text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 ${getDifficultyColor(effectiveDifficulty)}`}
            >
              {DIFFICULTY_VALUES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          ) : (
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(effectiveDifficulty)}`}>
              {effectiveDifficulty}
            </div>
          )}

          {isDirty && (
            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
              Unsaved
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1">
          {/* Publish (draft → published) / Unpublish (published → draft).
              The one-click move from draft to published lives right on the card. */}
          {onPublish && isDraft && (
            <Button
              variant="success"
              size="sm"
              onClick={() => onPublish(safeQuestion.id, true)}
              disabled={publishing}
              iconName={publishing ? 'Loader2' : 'CheckCircle'}
              iconPosition="left"
              className={`text-xs ${publishing ? 'animate-pulse' : ''}`}
              title="Publish this question"
            >
              {publishing ? 'Publishing…' : 'Publish'}
            </Button>
          )}
          {onPublish && !isDraft && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPublish(safeQuestion.id, false)}
              disabled={publishing}
              iconName={publishing ? 'Loader2' : 'RotateCcw'}
              iconPosition="left"
              className={`text-xs text-muted-foreground ${publishing ? 'animate-pulse' : ''}`}
              title="Move back to draft"
            >
              {publishing ? 'Working…' : 'Unpublish'}
            </Button>
          )}

          {/* Per-row save lives here in single-row mode; bulk mode saves everything
              at once from the page header, so we hide it to avoid two save paths. */}
          {editable && !bulkMode && isDirty && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onResetRow?.(safeQuestion.id)}
                disabled={savingRow}
                className="text-xs text-muted-foreground"
              >
                Reset
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => onSaveRow?.(safeQuestion.id)}
                disabled={savingRow}
                iconName={savingRow ? 'Loader2' : 'Save'}
                iconPosition="left"
                className={`text-xs ${savingRow ? 'animate-pulse' : ''}`}
              >
                {savingRow ? 'Saving…' : 'Save'}
              </Button>
            </>
          )}

          {/* In bulk mode, offer a per-row revert so a single staged change can be
              dropped without leaving bulk mode. */}
          {editable && bulkMode && isDirty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onResetRow?.(safeQuestion.id)}
              disabled={savingRow}
              className="text-xs text-muted-foreground"
            >
              Reset
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => safeHandleClick(onEdit, safeQuestion)}
            className="w-8 h-8"
            title="Edit Question"
          >
            <Icon name="Edit" size={14} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => safeHandleClick(onDelete, safeQuestion.id)}
            className="w-8 h-8 text-red-600 hover:text-red-700"
            title="Delete Question"
          >
            <Icon name="Trash2" size={14} />
          </Button>
        </div>
      </div>

      {rowError && (
        <div className="mb-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded p-2">
          {rowError}
        </div>
      )}

      {/* Question Content */}
      <div className="mb-3">
        <div className="text-sm text-foreground leading-relaxed">
          {safeQuestion.text ? (
            isLatex ? (
              // Truncating LaTeX would slice through $...$ delimiters and break
              // rendering, so render the full expression for LaTeX questions.
              <MathText text={safeQuestion.text} textFormat="LATEX" />
            ) : (
              <>
                {showFullQuestion ? safeQuestion.text : truncateText(safeQuestion.text)}
                {safeQuestion.text.length > 150 && (
                  <button
                    onClick={() => setShowFullQuestion(!showFullQuestion)}
                    className="ml-2 text-blue-600 hover:underline text-xs"
                  >
                    {showFullQuestion ? 'Show less' : 'Show more'}
                  </button>
                )}
              </>
            )
          ) : (
            <span className="text-muted-foreground italic">No question text available</span>
          )}
        </div>

        {/* Question Image */}
        {safeQuestion.questionImagePath && (
          <div className="mt-3">
            <img
              src={safeQuestion.questionImagePath}
              alt="Question Image"
              className="max-w-full h-auto rounded-lg border border-border shadow-sm"
              style={{ maxHeight: '300px' }}
              onError={(e) => {
                e.target.style.display = 'none';
                console.warn('Failed to load question image:', safeQuestion.questionImagePath);
              }}
            />
          </div>
        )}
      </div>

      {/* Options for MCQ */}
      {safeQuestion.questionType?.toLowerCase() === 'mcq' && safeQuestion.options.length > 0 && (
        <div className="mb-3 space-y-1">
          {safeQuestion.options.map((option, optionIndex) => {
            const safeOption = {
              id: option?.id || optionIndex,
              text: option?.text || 'No option text',
              isCorrect: option?.isCorrect || false,
              optionImagePath: option?.optionImagePath || ''
            };

            return (
              <div
                key={safeOption.id}
                className={`text-xs p-2 rounded border ${
                  safeOption.isCorrect
                    ? 'bg-green-50 border-green-300 text-green-800'
                    : 'bg-muted border-border text-foreground'
                }`}
              >
                <div className="flex items-start space-x-2">
                  <span className="font-medium flex-shrink-0">
                    {String.fromCharCode(65 + optionIndex)}.
                  </span>

                  <div className="flex-1">
                    <MathText as="div" text={safeOption.text} textFormat={safeQuestion.textFormat} />

                    {/* Option Image */}
                    {safeOption.optionImagePath && (
                      <div className="mt-2">
                        <img
                          src={safeOption.optionImagePath}
                          alt={`Option ${String.fromCharCode(65 + optionIndex)} Image`}
                          className="max-w-full h-auto rounded border border-border shadow-sm"
                          style={{ maxHeight: '150px' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            console.warn('Failed to load option image:', safeOption.optionImagePath);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Topic — inline editable cascade right where the topic was shown.
          Given its own row so the expanded Subject→Chapter→Topic dropdowns don't
          fight the stats below for horizontal space. */}
      {editable && (
        <div className="mb-3 text-xs text-muted-foreground">
          <InlineTopicEditor
            subjects={subjects}
            fetchChapters={fetchChapters}
            fetchTopics={fetchTopics}
            resolveTopicPath={resolveTopicPath}
            currentTopicName={effectiveTopicName}
            originalTopicName={safeQuestion.topicName}
            pendingTopicId={pendingEdit?.topicId ?? null}
            initialSubjectId={safeQuestion.subjectId}
            initialChapterId={safeQuestion.chapterId}
            initialTopicId={safeQuestion.topicId}
            disabled={savingRow}
            defaultExpanded={bulkMode}
            onChange={(topicId, topicName) =>
              onFieldChange?.(safeQuestion.id, { topicId, topicName })
            }
            onRevert={() => onFieldChange?.(safeQuestion.id, { topicId: null, topicName: null })}
          />
        </div>
      )}

      {/* Question Metadata */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          {!editable && effectiveTopicName && (
            <div className="flex items-center space-x-1">
              <Icon name="Tag" size={12} />
              <span>{effectiveTopicName}</span>
            </div>
          )}

          <div className="flex items-center space-x-1">
            <Icon name="Hash" size={12} />
            <span>ID: {safeQuestion.id}</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Icon name="Clock" size={12} />
            <span>2 min</span>
          </div>

          <div className="flex items-center space-x-1">
            <Icon name="Target" size={12} />
            <span>{safeQuestion.marks} marks</span>
          </div>
        </div>
      </div>

      {/* Negative Marking Info */}
      {safeQuestion.negativeMarks > 0 && (
        <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
          <Icon name="Minus" size={12} className="inline mr-1" />
          Negative marking: -{safeQuestion.negativeMarks} marks
        </div>
      )}
    </div>
  );
};

export default QuestionCard;
