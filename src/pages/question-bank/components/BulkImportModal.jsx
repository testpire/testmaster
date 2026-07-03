import React, { useState, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { questionService } from '../../../services/questionService';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { cn } from '../../../utils/cn';
import {
  UPLOAD_TYPES,
  DEFAULT_UPLOAD_TYPE_KEY,
  getUploadType,
  downloadSampleCsv,
  TOPIC_ID_PLACEHOLDER,
} from '../questionUploadTypes';

const BulkImportModal = ({ isOpen, onClose, onQuestionsImported }) => {
  const { userProfile } = useAuth();
  const fileInputRef = useRef(null);

  const [selectedTypeKey, setSelectedTypeKey] = useState(DEFAULT_UPLOAD_TYPE_KEY);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const uploadType = getUploadType(selectedTypeKey);

  const handleSelectType = (key) => {
    if (key === selectedTypeKey) return;
    setSelectedTypeKey(key);
    // A different format means the previous file/result no longer apply.
    setSelectedFile(null);
    setUploadResult(null);
    setError('');
    if (fileInputRef?.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (event) => {
    const file = event?.target?.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setUploadResult(null);

      // Target institute is scoped server-side via the X-Institute-Id header (the switcher's
      // selected institute for SUPER_ADMIN) or the JWT for other roles. The endpoint is
      // chosen by the selected question type (MCQ vs numeric/integer, etc.).
      const { data, error: uploadError } = await questionService.bulkUploadQuestions(
        selectedFile,
        uploadType.endpoint
      );

      if (uploadError) {
        setError(uploadError);
        return;
      }

      setUploadResult(data);

      // Notify parent component if questions were successfully imported
      if (onQuestionsImported && data) {
        // Trigger refresh of questions list
        onQuestionsImported([]);
      }
    } catch (error) {
      setError('Failed to upload file. Please check the file format and try again.');
      console.error('Upload error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setError('');
    if (fileInputRef?.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    handleReset();
    setSelectedTypeKey(DEFAULT_UPLOAD_TYPE_KEY);
    onClose();
  };

  // Defensively unwrap ApiResponseDto { data: ... } and pull out row-level errors.
  const payload = uploadResult?.data ?? uploadResult ?? {};
  const rowErrors = Array.isArray(payload?.errors) ? payload.errors : [];
  const hasRowErrors = rowErrors.length > 0;
  // The backend reports image-upload warnings in `errors[]` even when no row
  // actually failed (failedUploads === 0), so distinguish hard failures.
  const hasFailures = (payload?.failedUploads ?? 0) > 0;
  const resultMessage = uploadResult?.message || payload?.message;

  // Surface any imported-count style fields the backend may return.
  const countEntries = Object.entries(payload).filter(
    ([key, value]) =>
      typeof value === 'number' &&
      /count|created|updated|imported|questions|rows|processed|failed|skipped|upload|success|total/i.test(key)
  );

  const footerContent = (
    <>
      <div className="text-sm text-muted-foreground mr-auto">
        {!uploadResult
          ? `Uploading as: ${uploadType.label}`
          : 'Questions have been successfully imported'}
      </div>
      <Button variant="outline" onClick={handleClose} disabled={loading}>
        {uploadResult ? 'Close' : 'Cancel'}
      </Button>
      {!uploadResult ? (
        <Button
          variant="primary"
          onClick={handleFileUpload}
          disabled={!selectedFile || loading}
          iconName={loading ? 'Loader2' : 'Upload'}
          iconPosition="left"
          className={loading ? 'animate-pulse' : ''}
        >
          {loading ? 'Uploading...' : 'Upload & Parse'}
        </Button>
      ) : (
        <Button variant="primary" onClick={handleReset}>
          Import Another File
        </Button>
      )}
    </>
  );

  const keyColumnNames = uploadType.editColumns.map((c) => c.name);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Import Questions"
      description="Upload a CSV file to import multiple questions at once."
      size="xl"
      footer={footerContent}
    >
      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Icon name="AlertCircle" size={16} className="text-destructive" />
            <p className="text-destructive font-medium">{error}</p>
          </div>
        </div>
      )}

      {!uploadResult ? (
        // Upload form
        <div className="space-y-8">
          {/* Step 1 — choose the question type */}
          <section>
            <StepHeading number={1} title="Choose the question type" />
            <p className="text-sm text-muted-foreground mb-4">
              Each type uses a different CSV layout. Pick the one that matches the questions you
              want to import.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {UPLOAD_TYPES.map((type) => {
                const active = type.key === selectedTypeKey;
                return (
                  <button
                    key={type.key}
                    type="button"
                    onClick={() => handleSelectType(type.key)}
                    aria-pressed={active}
                    className={cn(
                      'text-left p-4 rounded-lg border-2 transition-colors flex items-start gap-3',
                      active
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40 hover:bg-muted/40'
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                        active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Icon name={type.icon} size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{type.label}</span>
                        {active && <Icon name="CheckCircle2" size={16} className="text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{type.tagline}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 2 — download & edit the template */}
          <section>
            <StepHeading number={2} title="Download & edit the template" />
            <p className="text-sm text-muted-foreground mb-4">{uploadType.description}</p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <Button
                variant="primary"
                onClick={() => downloadSampleCsv(uploadType)}
                iconName="Download"
                iconPosition="left"
              >
                Download sample CSV
              </Button>
              <span className="text-xs text-muted-foreground">
                {uploadType.sampleFileName} — a ready-to-edit template with example rows.
              </span>
            </div>

            {/* What the user MUST change before uploading. */}
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="AlertTriangle" size={16} className="text-warning" />
                <h4 className="font-medium text-foreground">Before you upload — edit these columns</h4>
              </div>
              <ul className="space-y-2">
                {uploadType.editColumns.map((col) => (
                  <li key={col.name} className="text-sm text-muted-foreground flex gap-2">
                    <code className="px-1.5 py-0.5 rounded bg-warning/20 text-foreground text-xs font-mono whitespace-nowrap h-fit">
                      {col.name}
                    </code>
                    <span>{col.note}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-3">
                In the sample, every <code className="font-mono">Topic ID</code> is set to{' '}
                <code className="font-mono text-foreground">{TOPIC_ID_PLACEHOLDER}</code> — replace
                it with a real topic id, or the rows will be rejected.
              </p>
            </div>

            {/* The exact columns for this type — makes it obvious which CSV is which. */}
            <details className="group rounded-lg border border-border">
              <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-foreground flex items-center justify-between">
                <span>Columns in this file ({uploadType.headers.length})</span>
                <Icon
                  name="ChevronDown"
                  size={16}
                  className="text-muted-foreground transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="px-4 pb-4 pt-1 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {uploadType.headers.map((header) => {
                    const isKey = keyColumnNames.includes(header);
                    return (
                      <span
                        key={header}
                        className={cn(
                          'px-2 py-0.5 rounded text-xs font-mono border',
                          isKey
                            ? 'bg-primary/10 border-primary/30 text-foreground font-medium'
                            : 'bg-muted/50 border-transparent text-muted-foreground'
                        )}
                      >
                        {header}
                      </span>
                    );
                  })}
                </div>
                {uploadType.notes?.length > 0 && (
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    {uploadType.notes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                )}
              </div>
            </details>
          </section>

          {/* Step 3 — upload the edited file */}
          <section>
            <StepHeading number={3} title="Upload your file" />
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Icon name="Upload" size={48} className="mx-auto mb-4 text-muted-foreground" />
              <div className="space-y-2">
                <p className="text-foreground font-medium">Choose your edited CSV to upload</p>
                <p className="text-sm text-muted-foreground">CSV, Excel files up to 10MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef?.current?.click()}
                className="mt-4"
                iconName="Upload"
                iconPosition="left"
              >
                Select File
              </Button>
              {selectedFile && (
                <div className="mt-4 p-3 bg-success/15 border border-success/40 rounded-lg">
                  <p className="text-success font-medium">{selectedFile?.name}</p>
                  <p className="text-sm text-success">{(selectedFile?.size / 1024)?.toFixed(1)} KB</p>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : (
        // Upload results
        <div className="space-y-6">
          <div className="text-center">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                hasRowErrors ? 'bg-warning/15' : 'bg-success/15'
              }`}
            >
              <Icon
                name={hasRowErrors ? 'AlertTriangle' : 'Check'}
                size={32}
                className={hasRowErrors ? 'text-warning' : 'text-success'}
              />
            </div>
            <h3 className="text-xl font-display font-semibold text-foreground mt-4 mb-1">
              {hasRowErrors ? 'Upload Completed with Issues' : 'Upload Successful!'}
            </h3>
            <p className="text-muted-foreground">
              {resultMessage ||
                (hasRowErrors
                  ? 'Some rows reported issues. Review the details below.'
                  : 'Your questions file has been processed and imported.')}
            </p>
          </div>

          {/* Imported counts, if returned */}
          {countEntries.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {countEntries.map(([key, value]) => (
                <div key={key} className="bg-muted/30 p-3 rounded-lg text-center">
                  <div className="text-2xl font-semibold text-foreground">{value}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Row-level errors */}
          {hasRowErrors && (
            <div
              className={`border rounded-lg overflow-hidden ${
                hasFailures ? 'border-destructive/20' : 'border-warning/40'
              }`}
            >
              <div
                className={`px-4 py-2 text-sm font-medium ${
                  hasFailures ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                }`}
              >
                {rowErrors.length} {hasFailures ? 'error' : 'warning'}
                {rowErrors.length === 1 ? '' : 's'}
              </div>
              <ul className="max-h-48 overflow-y-auto divide-y divide-border text-sm">
                {rowErrors.map((rowError, idx) => (
                  <li key={idx} className="px-4 py-2 text-foreground">
                    {typeof rowError === 'string' ? rowError : JSON.stringify(rowError)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Raw fallback when the shape is unrecognized */}
          {countEntries.length === 0 && !hasRowErrors && (
            <div className="bg-muted/30 p-4 rounded-lg">
              <pre className="text-sm text-left whitespace-pre-wrap">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

// Small numbered step label used to structure the import flow.
const StepHeading = ({ number, title }) => (
  <div className="flex items-center gap-2 mb-1">
    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0">
      {number}
    </span>
    <h3 className="text-base font-display font-semibold text-foreground">{title}</h3>
  </div>
);

export default BulkImportModal;
