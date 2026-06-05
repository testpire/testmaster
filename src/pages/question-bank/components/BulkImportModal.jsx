import React, { useState, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { questionService } from '../../../services/questionService';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const BulkImportModal = ({ isOpen, onClose, onQuestionsImported }) => {
  const { userProfile } = useAuth();
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
      setError('Please select a file to upload');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setUploadResult(null);

      // instituteId is now extracted from JWT token on backend
      const { data, error: uploadError } = await questionService.bulkUploadQuestions(selectedFile);
      
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
    onClose();
  };

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg border border-border shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Bulk Import Questions</h2>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
              <Icon name="X" size={24} />
            </button>
          </div>
          <p className="text-muted-foreground mt-2">
            Upload a CSV or Excel file to import multiple questions at once.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
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
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Upload Questions File</h3>
                <p className="text-muted-foreground mb-4">
                  Choose a CSV or Excel file containing your questions. The file will be processed and imported automatically.
                </p>
              </div>

              {/* File Format Info */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <h4 className="font-medium text-foreground mb-2">Expected File Format:</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• CSV or Excel (.csv, .xlsx, .xls) files</p>
                  <p>• Include question text, options, correct answers, and metadata</p>
                  <p>• Follow the format specified in your API documentation</p>
                  <p>• File size should be less than 10MB</p>
                </div>
              </div>

              {/* File Upload */}
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Icon name="Upload" size={48} className="mx-auto mb-4 text-muted-foreground" />
                <div className="space-y-2">
                  <p className="text-foreground font-medium">Choose a file to upload</p>
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
                    hasFailures ? 'border-destructive/20' : 'border-yellow-300'
                  }`}
                >
                  <div
                    className={`px-4 py-2 text-sm font-medium ${
                      hasFailures
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-yellow-50 text-yellow-700'
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
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {!uploadResult ? 'Select a file and click "Upload & Parse" to import questions' : 'Questions have been successfully imported'}
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                {uploadResult ? 'Close' : 'Cancel'}
              </Button>
              
              {!uploadResult ? (
                <Button 
                  variant="primary" 
                  onClick={handleFileUpload} 
                  disabled={!selectedFile || loading}
                  iconName={loading ? "Loader2" : "Upload"}
                  iconPosition="left"
                  className={loading ? "animate-pulse" : ""}
                >
                  {loading ? 'Uploading...' : 'Upload & Parse'}
                </Button>
              ) : (
                <Button variant="primary" onClick={handleReset}>
                  Import Another File
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;