import React, { useState, useRef } from 'react';
import { courseService } from '../../services/courseService';
import Icon from '../AppIcon';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

// Generic CSV uploader for the curriculum bulk-upload endpoint
// (POST /api/curriculum/bulk-upload). One denormalized CSV creates subjects,
// chapters and topics in a single pass; the backend reuses existing entities
// by `code` and reports row-level failures via an `errors[]` array.
const CurriculumUploadModal = ({ isOpen, onClose, onUploaded }) => {
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (event) => {
    const file = event?.target?.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError('Please select a CSV file to upload');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setUploadResult(null);

      const { data, error: uploadError } = await courseService.bulkUploadCurriculum(selectedFile);

      if (uploadError) {
        setError(typeof uploadError === 'string' ? uploadError : uploadError?.message || 'Upload failed');
        return;
      }

      setUploadResult(data);

      // Refresh the parent lists so newly created entities show up.
      if (onUploaded) {
        onUploaded();
      }
    } catch (err) {
      setError('Failed to upload file. Please check the file format and try again.');
      console.error('Curriculum upload error:', err);
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
    onClose();
  };

  // Defensively unwrap ApiResponseDto { data: ... } and pull out row-level errors.
  const payload = uploadResult?.data ?? uploadResult ?? {};
  const rowErrors = Array.isArray(payload?.errors) ? payload.errors : [];
  const hasRowErrors = rowErrors.length > 0;

  // Surface any created-count style fields the backend may return.
  const countEntries = Object.entries(payload).filter(
    ([key, value]) =>
      typeof value === 'number' &&
      /count|created|updated|subjects|chapters|topics|rows|processed/i.test(key)
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Upload Curriculum (CSV)"
      description="Upload a single CSV to create subjects, chapters and topics at once. Existing entities are matched and reused by their code."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {uploadResult ? 'Close' : 'Cancel'}
          </Button>

          {!uploadResult ? (
            <Button
              variant="default"
              onClick={handleFileUpload}
              disabled={!selectedFile || loading}
              iconName={loading ? 'Loader2' : 'Upload'}
              iconPosition="left"
              className={loading ? 'animate-pulse' : ''}
            >
              {loading ? 'Uploading...' : 'Upload & Process'}
            </Button>
          ) : (
            <Button variant="primary" onClick={handleReset}>
              Upload Another File
            </Button>
          )}
        </>
      }
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
        <div className="space-y-6">
          {/* File Upload */}
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <Icon name="FileUp" size={48} className="mx-auto mb-4 text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-foreground font-medium">Choose a CSV file to upload</p>
              <p className="text-sm text-muted-foreground">.csv files only</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
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
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium">{selectedFile?.name}</p>
                <p className="text-sm text-green-600">
                  {(selectedFile?.size / 1024)?.toFixed(1)} KB
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Upload results
        <div className="space-y-6">
          <div className="text-center">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                hasRowErrors ? 'bg-yellow-100' : 'bg-green-100'
              }`}
            >
              <Icon
                name={hasRowErrors ? 'AlertTriangle' : 'Check'}
                size={32}
                className={hasRowErrors ? 'text-yellow-600' : 'text-green-600'}
              />
            </div>
            <h3 className="text-xl font-semibold text-foreground mt-4 mb-1">
              {hasRowErrors ? 'Upload Completed with Issues' : 'Upload Successful!'}
            </h3>
            <p className="text-muted-foreground">
              {payload?.message ||
                (hasRowErrors
                  ? 'Some rows could not be imported. Review the errors below.'
                  : 'Your curriculum file has been processed.')}
            </p>
          </div>

          {/* Created/updated counts, if returned */}
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
            <div className="border border-destructive/20 rounded-lg overflow-hidden">
              <div className="bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
                {rowErrors.length} row{rowErrors.length === 1 ? '' : 's'} failed
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

export default CurriculumUploadModal;
