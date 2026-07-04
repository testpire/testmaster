import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import MathText, { hasMarkdownTable } from '../../../components/MathText';
import QuestionContent from '../../../components/QuestionContent';
import InlineTopicEditor from './InlineTopicEditor';
import { formatDateTime } from '../../test-management/testConstants';

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
  // Multi-select (used for bulk status changes on both tabs).
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
  // Rich content (LaTeX or a markdown table) renders in full: truncating it would
  // slice through $…$ delimiters or a table's rows and break the rendering.
  const isRich = isLatex || hasMarkdownTable(safeQuestion.text);

  // Tags come back comma-separated (QuestionResponseDto.tags); hints as a string[].
  const tagList =
    typeof question.tags === 'string'
      ? question.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : Array.isArray(question.tags)
      ? question.tags
      : [];
  const hintCount = Array.isArray(question.hints)
    ? question.hints.filter((h) => h && String(h).trim()).length
    : 0;

  // Numeric-answer questions (INTEGER/NUMERIC/NUMERICAL) carry a correctAnswer and
  // an answerTolerance (± margin) instead of options; surface them on the card so a
  // reviewer sees the graded answer without opening the editor. `??` (not ||) keeps
  // a legitimate 0 answer / 0 tolerance. Matches the type set in questionService.
  const isNumeric = ['integer', 'numeric', 'numerical', 'integer_type'].includes(
    String(safeQuestion.questionType).toLowerCase()
  );
  const correctAnswer = question.correctAnswer ?? question.correct_integer_answer ?? null;
  const hasCorrectAnswer = correctAnswer != null && String(correctAnswer).trim() !== '';
  const answerTolerance = question.answerTolerance ?? question.answer_tolerance ?? 0;
  const isExactMatch = answerTolerance == null || Number(answerTolerance) === 0;

  // When the question was added (QuestionResponseDto.createdAt, UTC ISO). createdBy
  // is surfaced as a tooltip when present.
  const createdAt = question.createdAt ?? question.created_at ?? null;
  const createdBy = question.createdBy ?? question.created_by ?? '';

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
      case 'easy': return 'text-success bg-success/15';
      case 'medium': return 'text-warning bg-warning/15';
      case 'hard': return 'text-destructive bg-destructive/10';
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
      className={`bg-card border rounded-2xl p-4 shadow-sm transition-all duration-200 hover:shadow-md ${
        isDirty ? 'border-warning/40 ring-1 ring-warning/30' : 'border-border'
      }`}
    >

      {/* Question Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Selection checkbox (bulk status change) */}
          {selectable && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect?.(safeQuestion.id)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              title="Select for bulk action"
            />
          )}

          {/* Question Number */}
          <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
            {(index || 0) + 1}
          </div>

          {/* Question Type Badge */}
          <div className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
            {safeQuestion.questionType.toUpperCase()}
          </div>

          {/* Publish status badge */}
          <div
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              isDraft ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'
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
            <span className="text-[10px] font-medium text-warning bg-warning/10 border border-warning/30 rounded px-1.5 py-0.5">
              Unsaved
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 flex-wrap shrink-0 ml-auto">
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
            onClick={() => safeHandleClick(onEdit, question)}
            className="w-8 h-8"
            title="Edit Question"
          >
            <Icon name="Edit" size={14} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => safeHandleClick(onDelete, safeQuestion.id)}
            className="w-8 h-8 text-destructive hover:text-destructive/80"
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
            isRich ? (
              <QuestionContent text={safeQuestion.text} textFormat={safeQuestion.textFormat} />
            ) : (
              <>
                {showFullQuestion ? safeQuestion.text : truncateText(safeQuestion.text)}
                {safeQuestion.text.length > 150 && (
                  <button
                    onClick={() => setShowFullQuestion(!showFullQuestion)}
                    className="ml-2 text-primary hover:underline text-xs"
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
                    ? 'bg-success/10 border-success/40 text-success'
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

      {/* Correct answer + tolerance for numeric-answer questions (no options). */}
      {isNumeric && (
        <div className="mb-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs p-2 rounded border bg-success/10 border-success/40 text-success">
            <span className="flex items-center gap-1">
              <Icon name="CheckCircle" size={12} className="flex-shrink-0" />
              <span className="font-medium">Correct answer:</span>
              <span>{hasCorrectAnswer ? String(correctAnswer) : '—'}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="font-medium">Tolerance:</span>
              <span>± {answerTolerance ?? 0}{isExactMatch && ' (exact match)'}</span>
            </span>
          </div>
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

      {/* Tags + hint indicator */}
      {(tagList.length > 0 || hintCount > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {tagList.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium px-2 py-0.5"
            >
              <Icon name="Tag" size={11} />
              {tag}
            </span>
          ))}
          {hintCount > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-warning/15 text-warning text-[11px] font-medium px-2 py-0.5"
              title={`${hintCount} hint${hintCount === 1 ? '' : 's'} for practice mode`}
            >
              <Icon name="Lightbulb" size={11} />
              {hintCount} hint{hintCount === 1 ? '' : 's'}
            </span>
          )}
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

          {createdAt && (
            <div
              className="flex items-center space-x-1"
              title={createdBy ? `Added by ${createdBy}` : undefined}
            >
              <Icon name="Calendar" size={12} />
              <span>Added {formatDateTime(createdAt)}</span>
            </div>
          )}
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
        <div className="mt-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded p-2">
          <Icon name="Minus" size={12} className="inline mr-1" />
          Negative marking: -{safeQuestion.negativeMarks} marks
        </div>
      )}
    </div>
  );
};

export default QuestionCard;
