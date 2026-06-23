import React, { lazy, Suspense } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import MathText from '../../../components/MathText';

// Lazy so MathLive's bundle is fetched only when an author opens the equation
// editor — never on the question list or the student exam runner.
const MathEquationEditor = lazy(() => import('../../../components/MathEquationEditor'));

// Small "fx" trigger placed beside each text field that opens the equation editor.
const InsertEquationButton = ({ onClick, className }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${className || ''}`}
    title="Insert a math equation"
  >
    <Icon name="Sigma" size={14} />
    <span>Insert equation</span>
  </button>
);

// Reusable image upload control: upload-first flow (file -> S3 -> key + preview url).
const ImageUploadField = ({ previewUrl, uploading, disabled, disabledHint, onFileSelect, onClear }) => {
  const inputRef = React.useRef(null);

  const handleChange = (e) => {
    const file = e?.target?.files?.[0];
    if (file) onFileSelect(file);
    // Reset so selecting the same file again still fires onChange
    if (e?.target) e.target.value = '';
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleChange}
        disabled={disabled || uploading}
      />
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => inputRef?.current?.click()}
        >
          {uploading ? (
            <span className="flex items-center space-x-1">
              <Icon name="Loader2" size={14} className="animate-spin" />
              <span>Uploading...</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1">
              <Icon name="Upload" size={14} />
              <span>{previewUrl ? 'Replace image' : 'Upload image'}</span>
            </span>
          )}
        </Button>
        {previewUrl && !uploading && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive/80"
            onClick={onClear}
          >
            <span className="flex items-center space-x-1">
              <Icon name="Trash2" size={14} />
              <span>Remove</span>
            </span>
          </Button>
        )}
      </div>
      {disabled && disabledHint && (
        <p className="text-xs text-warning mt-1">{disabledHint}</p>
      )}
      {previewUrl && (
        <div className="mt-2">
          <img
            src={previewUrl}
            alt="Preview"
            className="max-h-40 w-auto rounded-lg border border-border shadow-sm"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Presentational form body shared by ManualQuestionModal and the add-questions
 * page. All state/handlers come from `useQuestionForm` (passed in as `form`).
 * Renders the error banner, every field, and the (lazy) equation editor mount.
 * Consumers own the wrapping <form>, any success messaging, and the footer.
 */
const QuestionFormFields = ({ form }) => {
  const {
    error,
    subjects, chapters, topics,
    loadingChapters, loadingTopics,
    uploadingQuestionImage, uploadingOptionIndex,
    formatManual, setFormatManual,
    editorOpen, setEditorOpen,
    questionData,
    recordCaret, openEquationEditor, insertLatexAtCursor,
    handleInputChange, handleOptionChange, handleCorrectAnswerChange,
    handleQuestionImageUpload, handleClearQuestionImage,
    handleOptionImageUpload, handleClearOptionImage
  } = form;

  // Tags + hints live on questionData as arrays (see useQuestionForm). They're edited
  // through handleInputChange like any other field — no dedicated hook handlers needed.
  const tags = questionData?.tags || [];
  const hints = questionData?.hints || [];
  const [tagDraft, setTagDraft] = React.useState('');

  const commitTag = (raw) => {
    const parts = String(raw).split(',').map((t) => t.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const next = [...tags];
    parts.forEach((p) => {
      if (!next.some((t) => t.toLowerCase() === p.toLowerCase())) next.push(p);
    });
    handleInputChange('tags', next);
    setTagDraft('');
  };
  const removeTag = (i) => handleInputChange('tags', tags.filter((_, idx) => idx !== i));
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitTag(tagDraft);
    } else if (e.key === 'Backspace' && !tagDraft && tags.length) {
      removeTag(tags.length - 1);
    }
  };

  const setHint = (i, val) => handleInputChange('hints', hints.map((h, idx) => (idx === i ? val : h)));
  const addHint = () => handleInputChange('hints', [...hints, '']);
  const removeHint = (i) => handleInputChange('hints', hints.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-6">
      {/* Error message */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Icon name="AlertCircle" size={16} className="text-error" />
            <p className="text-error text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Select
          label="Subject *"
          value={questionData?.subject}
          onChange={(value) => handleInputChange('subject', value)}
          options={subjects?.map(subject => ({
            value: subject?.id?.toString(),
            label: `${subject?.name}${subject?.code ? ` (${subject?.code})` : ''}`
          })) || []}
          placeholder="Select subject"
          searchable
        />

        <Select
          label="Chapter *"
          value={questionData?.chapter}
          onChange={(value) => handleInputChange('chapter', value)}
          options={chapters?.map(chapter => ({
            value: chapter?.id?.toString(),
            label: `${chapter?.name}${chapter?.code ? ` (${chapter?.code})` : ''}`
          })) || []}
          placeholder={loadingChapters ? "Loading chapters..." : "Select chapter"}
          disabled={!questionData?.subject || loadingChapters}
          searchable
        />

        <Select
          label="Topic *"
          value={questionData?.topic}
          onChange={(value) => handleInputChange('topic', value)}
          options={topics?.map(topic => ({
            value: topic?.id?.toString(),
            label: `${topic?.name}${topic?.code ? ` (${topic?.code})` : ''}`
          })) || []}
          placeholder={loadingTopics ? "Loading topics..." : "Select topic"}
          disabled={!questionData?.chapter || loadingTopics}
          searchable
        />

        <Select
          label="Question Type *"
          value={questionData?.questionType}
          onChange={(value) => handleInputChange('questionType', value)}
          options={[
            { value: 'mcq', label: 'Multiple Choice' },
            { value: 'integer_type', label: 'Integer Type' },
            { value: 'subjective', label: 'Subjective' }
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="Difficulty Level *"
          value={questionData?.difficultyLevel}
          onChange={(value) => handleInputChange('difficultyLevel', value)}
          options={[
            { value: 'EASY', label: 'EASY' },
            { value: 'MEDIUM', label: 'MEDIUM' },
            { value: 'HARD', label: 'HARD' }
          ]}
        />

        <Input
          label="Marks"
          type="number"
          value={questionData?.marks}
          onChange={(e) => handleInputChange('marks', e?.target?.value)}
          min="1"
          max="10"
        />

        <Input
          label="Negative Marks"
          type="number"
          step="0.25"
          value={questionData?.negativeMarks}
          onChange={(e) => handleInputChange('negativeMarks', e?.target?.value)}
          min="0"
          max="5"
        />
      </div>

      {/* Tags — free-form labels for grouping/searching questions (e.g. "kinematics",
          "JEE-2023", "tricky"). Stored comma-separated; used to build Daily Practice sets. */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Tags <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border border-input rounded-lg bg-card focus-within:ring-2 focus-within:ring-ring/70 focus-within:border-primary">
          {tags.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium pl-2.5 pr-1.5 py-1"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(i)}
                className="rounded-full hover:bg-primary/20 p-0.5 transition-colors"
                title={`Remove ${tag}`}
              >
                <Icon name="X" size={12} />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={() => commitTag(tagDraft)}
            placeholder={tags.length ? 'Add another…' : 'Type a tag and press Enter'}
            className="flex-1 min-w-[8rem] bg-transparent text-sm text-foreground focus:outline-none py-0.5"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Press <kbd className="px-1 rounded border border-border bg-muted text-[10px]">Enter</kbd> or comma to add. Tags help you find questions and assemble Daily Practice sets.
        </p>
      </div>

      {/* Question Text */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-foreground">
            Question Text *
          </label>
          <div className="flex items-center gap-2">
            <InsertEquationButton onClick={() => openEquationEditor('questionText')} />
            <span className="text-xs text-muted-foreground">Format:</span>
            <div className="inline-flex rounded-md border border-border overflow-hidden">
              {['PLAIN', 'LATEX'].map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => { setFormatManual(true); handleInputChange('textFormat', fmt); }}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    (questionData?.textFormat || 'PLAIN') === fmt
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {fmt === 'PLAIN' ? 'Plain' : 'LaTeX'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <textarea
          value={questionData?.questionText}
          onChange={(e) => handleInputChange('questionText', e?.target?.value)}
          onFocus={recordCaret('questionText')}
          onSelect={recordCaret('questionText')}
          rows={4}
          className="w-full px-3 py-2 border border-input rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/70 focus:border-primary resize-vertical"
          placeholder="Enter the question text here..."
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          {(questionData?.textFormat || 'PLAIN') === 'LATEX'
            ? 'LaTeX mode: wrap inline math in $…$ and block math in $$…$$. Applies to the question, options, and explanation.'
            : formatManual
            ? 'Plain text mode.'
            : 'Format auto-detected from your input — switch manually if needed.'}
        </p>
        {(questionData?.textFormat || 'PLAIN') === 'LATEX' && questionData?.questionText?.trim() && (
          <div className="mt-2 p-3 rounded-lg border border-border bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-1">Preview</p>
            <MathText
              as="div"
              className="text-sm text-foreground"
              text={questionData?.questionText}
              textFormat="LATEX"
            />
          </div>
        )}
      </div>

      {/* Question Image */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Question Image
        </label>
        <ImageUploadField
          previewUrl={questionData?.questionImagePreview}
          uploading={uploadingQuestionImage}
          disabled={!questionData?.topic}
          disabledHint="Select a topic first to enable image upload"
          onFileSelect={handleQuestionImageUpload}
          onClear={handleClearQuestionImage}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Optional: PNG, JPEG, WEBP or GIF, up to 2 MB
        </p>
      </div>

      {/* MCQ Options */}
      {questionData?.questionType === 'mcq' && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Answer Options *
          </label>
          <div className="space-y-4">
            {questionData?.options?.map((option, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 transition-all duration-200 ${
                  option?.isCorrect
                    ? 'border-success bg-success/5 shadow-sm'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                {/* Option Header */}
                <div className="flex items-center space-x-3 mb-3">
                  <div className="relative">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={option?.isCorrect}
                      onChange={() => handleCorrectAnswerChange(index)}
                      className="w-5 h-5 text-success focus:ring-success border-border cursor-pointer"
                    />
                    {option?.isCorrect && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full flex items-center justify-center">
                        <Icon name="Check" size={8} className="text-success-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-foreground min-w-[24px] bg-muted rounded px-2 py-1">
                      {option?.label}
                    </span>
                    {option?.isCorrect && (
                      <span className="text-xs bg-success text-success-foreground px-2 py-1 rounded-full font-medium">
                        ✓ Correct Answer
                      </span>
                    )}
                  </div>

                  <Input
                    value={option?.text}
                    onChange={(e) => handleOptionChange(index, 'text', e?.target?.value)}
                    onFocus={recordCaret(index)}
                    onSelect={recordCaret(index)}
                    placeholder={`Enter text for option ${option?.label}`}
                    className={`flex-1 ${option?.isCorrect ? 'border-success' : ''}`}
                    required
                  />
                </div>

                {/* Option Image */}
                <div className="ml-8">
                  <InsertEquationButton
                    onClick={() => openEquationEditor(index)}
                    className="mb-2"
                  />
                  {(questionData?.textFormat || 'PLAIN') === 'LATEX' && option?.text?.trim() && (
                    <div className="mb-2 p-2 rounded border border-border bg-muted/30">
                      <span className="text-xs text-muted-foreground mr-1">Preview:</span>
                      <MathText className="text-sm text-foreground" text={option?.text} textFormat="LATEX" />
                    </div>
                  )}
                  <ImageUploadField
                    previewUrl={option?.optionImagePreview}
                    uploading={uploadingOptionIndex === index}
                    disabled={!questionData?.topic}
                    disabledHint="Select a topic first to enable image upload"
                    onFileSelect={(file) => handleOptionImageUpload(index, file)}
                    onClear={() => handleClearOptionImage(index)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Helper Text */}
          <div className="bg-primary/5 border border-primary/30 rounded-lg p-3 mt-4">
            <div className="flex items-start space-x-2">
              <Icon name="Info" size={16} className="text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-primary">
                  How to mark the correct answer:
                </p>
                <p className="text-xs text-primary/80 mt-1">
                  Click the radio button (○) next to the option you want to mark as correct.
                  The selected option will be highlighted in green with a "✓ Correct Answer" badge.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Integer Answer */}
      {questionData?.questionType === 'integer_type' && (
        <div>
          <Input
            label="Correct Integer Answer *"
            type="number"
            value={questionData?.correctIntegerAnswer}
            onChange={(e) => handleInputChange('correctIntegerAnswer', e?.target?.value)}
            placeholder="Enter the correct integer answer"
            required
          />
        </div>
      )}

      {/* Explanation */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-foreground">
            Explanation (Optional)
          </label>
          <InsertEquationButton onClick={() => openEquationEditor('explanation')} />
        </div>
        <textarea
          value={questionData?.explanation}
          onChange={(e) => handleInputChange('explanation', e?.target?.value)}
          onFocus={recordCaret('explanation')}
          onSelect={recordCaret('explanation')}
          rows={3}
          className="w-full px-3 py-2 border border-input rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/70 focus:border-primary resize-vertical"
          placeholder="Provide a detailed explanation of the solution..."
        />
        {(questionData?.textFormat || 'PLAIN') === 'LATEX' && questionData?.explanation?.trim() && (
          <div className="mt-2 p-3 rounded-lg border border-border bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-1">Preview</p>
            <MathText
              as="div"
              className="text-sm text-foreground"
              text={questionData?.explanation}
              textFormat="LATEX"
            />
          </div>
        )}
      </div>

      {/* Hints — ordered, progressive nudges revealed to students one at a time in
          Daily Practice Problems (self-study). Optional; each empty hint is dropped on save. */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-foreground">
            Hints <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Icon name="Lightbulb" size={13} className="text-warning" />
            Shown step-by-step in practice mode
          </span>
        </div>
        {hints.length > 0 && (
          <div className="space-y-2 mb-2">
            {hints.map((hint, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-2 inline-flex h-6 min-w-6 flex-shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning text-xs font-semibold px-1.5">
                  {i + 1}
                </span>
                <textarea
                  value={hint}
                  onChange={(e) => setHint(i, e.target.value)}
                  rows={2}
                  className="flex-1 px-3 py-2 border border-input rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/70 focus:border-primary resize-vertical"
                  placeholder={`Hint ${i + 1} — a small nudge toward the solution`}
                />
                <button
                  type="button"
                  onClick={() => removeHint(i)}
                  className="mt-1.5 p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                  title="Remove hint"
                >
                  <Icon name="Trash2" size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addHint}
          iconName="Plus"
          iconPosition="left"
        >
          {hints.length ? 'Add another hint' : 'Add a hint'}
        </Button>
      </div>

      {/* Question Properties */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-3">
          Question Properties
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={questionData?.isConceptual}
              onChange={(e) => handleInputChange('isConceptual', e?.target?.checked)}
              className="w-4 h-4 text-primary focus:ring-primary border-border rounded"
            />
            <span className="text-sm text-foreground">Conceptual</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={questionData?.isTheoretical}
              onChange={(e) => handleInputChange('isTheoretical', e?.target?.checked)}
              className="w-4 h-4 text-primary focus:ring-primary border-border rounded"
            />
            <span className="text-sm text-foreground">Theoretical</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={questionData?.isPyq}
              onChange={(e) => handleInputChange('isPyq', e?.target?.checked)}
              className="w-4 h-4 text-primary focus:ring-primary border-border rounded"
            />
            <span className="text-sm text-foreground">Previous Year Question</span>
          </label>
        </div>
      </div>

      {/* Equation editor — only mounted when open so MathLive's chunk loads on demand. */}
      {editorOpen && (
        <Suspense fallback={null}>
          <MathEquationEditor
            isOpen={editorOpen}
            onClose={() => setEditorOpen(false)}
            onInsert={insertLatexAtCursor}
          />
        </Suspense>
      )}
    </div>
  );
};

export default QuestionFormFields;
