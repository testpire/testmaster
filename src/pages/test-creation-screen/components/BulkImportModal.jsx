import React, { useState, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { questionService } from '../../../services/questionService';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const BulkImportModal = ({ isOpen, onClose, onQuestionsImported }) => {
  const { userProfile } = useAuth();
  const fileInputRef = useRef(null);
  
  const [step, setStep] = useState('upload'); // upload, validate, import, complete
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [validationResults, setValidationResults] = useState(null);
  const [importResults, setImportResults] = useState(null);
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

      const { data: questions, error: parseError } = await questionService?.parseQuestionsFile(selectedFile);
      
      if (parseError) {
        setError(parseError?.message);
        return;
      }

      setParsedQuestions(questions || []);
      setStep('validate');
    } catch (error) {
      setError('Failed to parse file. Please check the file format.');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: results, error: validationError } = await questionService?.bulkImportQuestions(
        parsedQuestions, 
        { 
          importedBy: userProfile?.id,
          validateOnly: true 
        }
      );

      if (validationError) {
        setError(validationError?.message);
        return;
      }

      setValidationResults(results);
      setStep('import');
    } catch (error) {
      setError('Validation failed. Please check your data.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: results, error: importError } = await questionService?.bulkImportQuestions(
        parsedQuestions, 
        { 
          importedBy: userProfile?.id,
          validateOnly: false 
        }
      );

      if (importError) {
        setError(importError?.message);
        return;
      }

      setImportResults(results);
      setStep('complete');

      // Notify parent component
      if (onQuestionsImported && results?.importedQuestions) {
        onQuestionsImported(results?.importedQuestions);
      }
    } catch (error) {
      setError('Import failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setSelectedFile(null);
    setParsedQuestions([]);
    setValidationResults(null);
    setImportResults(null);
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
          
          {/* Progress Steps */}
          <div className="flex items-center space-x-4 mt-4">
            {[
              { key: 'upload', label: 'Upload File', icon: 'Upload' },
              { key: 'validate', label: 'Validate Data', icon: 'CheckCircle' },
              { key: 'import', label: 'Import Questions', icon: 'Download' },
              { key: 'complete', label: 'Complete', icon: 'Check' }
            ]?.map((stepItem, index) => (
              <div key={stepItem?.key} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step === stepItem?.key 
                    ? 'bg-primary text-primary-foreground'
                    : index < ['upload', 'validate', 'import', 'complete']?.indexOf(step)
                    ? 'bg-success text-success-foreground' :'bg-muted text-muted-foreground'
                }`}>
                  <Icon name={stepItem?.icon} size={16} />
                </div>
                <span className={`ml-2 text-sm ${
                  step === stepItem?.key ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}>
                  {stepItem?.label}
                </span>
                {index < 3 && <Icon name="ChevronRight" size={16} className="ml-4 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-4 bg-error/10 border border-error/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <Icon name="AlertCircle" size={16} className="text-error" />
                <p className="text-error font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Step 1: Upload File */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Upload Questions File</h3>
                <p className="text-muted-foreground mb-4">
                  Upload a CSV or JSON file containing questions. Make sure your file includes the required fields.
                </p>
              </div>

              {/* File Format Info */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <h4 className="font-medium text-foreground mb-2">Required Fields:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Required:</strong>
                    <ul className="ml-4 list-disc text-muted-foreground">
                      <li>question_text</li>
                      <li>subject (physics, chemistry, mathematics, biology)</li>
                      <li>question_type (mcq, integer_type, subjective)</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Optional:</strong>
                    <ul className="ml-4 list-disc text-muted-foreground">
                      <li>difficulty_level (easy, moderate, difficult)</li>
                      <li>exam_type (jee, neet, cbse, etc.)</li>
                      <li>class_level (number)</li>
                      <li>marks, negative_marks</li>
                      <li>explanation</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4">
                  <strong>For MCQ Questions:</strong>
                  <ul className="ml-4 list-disc text-muted-foreground text-sm">
                    <li>option_a, option_b, option_c, option_d</li>
                    <li>correct_answer (0 for A, 1 for B, etc.)</li>
                  </ul>
                </div>
              </div>

              {/* File Upload */}
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Icon name="Upload" size={48} className="mx-auto mb-4 text-muted-foreground" />
                <div className="space-y-2">
                  <p className="text-foreground font-medium">Choose a file to upload</p>
                  <p className="text-sm text-muted-foreground">CSV or JSON files up to 10MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
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
                  <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg">
                    <p className="text-success font-medium">{selectedFile?.name}</p>
                    <p className="text-sm text-success">
                      {(selectedFile?.size / 1024)?.toFixed(1)} KB
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Validation Results */}
          {step === 'validate' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Data Validation</h3>
                <p className="text-muted-foreground mb-4">
                  Reviewing {parsedQuestions?.length} questions from your file...
                </p>
              </div>

              {!validationResults ? (
                <div className="text-center py-8">
                  <Icon name="Loader2" size={32} className="animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">Validating questions...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Validation Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-muted/30 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-foreground">{validationResults?.totalQuestions}</div>
                      <div className="text-sm text-muted-foreground">Total Questions</div>
                    </div>
                    <div className="bg-success/10 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-success">{validationResults?.validQuestions}</div>
                      <div className="text-sm text-success">Valid Questions</div>
                    </div>
                    <div className="bg-error/10 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-error">{validationResults?.errors?.length || 0}</div>
                      <div className="text-sm text-error">Errors</div>
                    </div>
                  </div>

                  {/* Errors */}
                  {validationResults?.errors?.length > 0 && (
                    <div className="bg-error/10 border border-error/20 rounded-lg p-4">
                      <h4 className="font-medium text-error mb-2">Validation Errors:</h4>
                      <ul className="space-y-1">
                        {validationResults?.errors?.slice(0, 10)?.map((error, index) => (
                          <li key={index} className="text-sm text-error">• {error}</li>
                        ))}
                        {validationResults?.errors?.length > 10 && (
                          <li className="text-sm text-error">• ... and {validationResults?.errors?.length - 10} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Preview Valid Questions */}
                  {validationResults?.preview?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Preview of Valid Questions:</h4>
                      <div className="space-y-3">
                        {validationResults?.preview?.map((item, index) => (
                          <div key={index} className="border border-border rounded-lg p-3">
                            <div className="font-medium text-foreground">
                              {item?.questionData?.question_text?.substring(0, 100)}...
                            </div>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                              <span>Subject: {item?.questionData?.subject}</span>
                              <span>Type: {item?.questionData?.question_type}</span>
                              <span>Difficulty: {item?.questionData?.difficulty_level}</span>
                              <span>Marks: {item?.questionData?.marks}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Import Confirmation */}
          {step === 'import' && validationResults && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Ready to Import</h3>
                <p className="text-muted-foreground mb-4">
                  {validationResults?.validQuestions} questions are ready to be imported into your question bank.
                </p>
              </div>

              {validationResults?.errors?.length > 0 && (
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon name="AlertTriangle" size={16} className="text-warning" />
                    <span className="font-medium text-warning">Warning</span>
                  </div>
                  <p className="text-warning text-sm">
                    {validationResults?.errors?.length} questions have errors and will be skipped during import.
                  </p>
                </div>
              )}

              <div className="bg-muted/30 p-4 rounded-lg">
                <h4 className="font-medium text-foreground mb-2">Import Summary:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• {validationResults?.validQuestions} questions will be imported</li>
                  <li>• Questions will be added to your question bank</li>
                  <li>• You can use them in tests immediately after import</li>
                  <li>• Import process cannot be undone</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 4: Import Complete */}
          {step === 'complete' && importResults && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                <Icon name="Check" size={32} className="text-success" />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Import Complete!</h3>
                <p className="text-muted-foreground">
                  Your questions have been successfully imported to the question bank.
                </p>
              </div>

              {/* Import Results */}
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="bg-success/10 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-success">{importResults?.totalImported}</div>
                  <div className="text-sm text-success">Questions Imported</div>
                </div>
                <div className="bg-error/10 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-error">{importResults?.totalFailed}</div>
                  <div className="text-sm text-error">Failed Imports</div>
                </div>
              </div>

              {/* Failed Questions */}
              {importResults?.failedQuestions?.length > 0 && (
                <div className="bg-error/10 border border-error/20 rounded-lg p-4 text-left">
                  <h4 className="font-medium text-error mb-2">Failed to Import:</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {importResults?.failedQuestions?.map((failed, index) => (
                      <div key={index} className="text-sm">
                        <div className="font-medium text-error">{failed?.question}...</div>
                        <div className="text-error/70">{failed?.error}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {step === 'upload' && 'Step 1 of 4: Upload your questions file'}
              {step === 'validate' && 'Step 2 of 4: Validate questions data'}
              {step === 'import' && 'Step 3 of 4: Import questions to database'}
              {step === 'complete' && 'Step 4 of 4: Import completed'}
            </div>
            
            <div className="flex items-center space-x-3">
              {step !== 'complete' && (
                <Button variant="outline" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
              )}
              
              {step === 'upload' && (
                <Button 
                  variant="primary" 
                  onClick={handleFileUpload} 
                  disabled={!selectedFile || loading}
                  iconName={loading ? "Loader2" : "Upload"}
                  iconPosition="left"
                  className={loading ? "animate-spin" : ""}
                >
                  {loading ? 'Processing...' : 'Upload & Parse'}
                </Button>
              )}
              
              {step === 'validate' && !validationResults && (
                <Button 
                  variant="primary" 
                  onClick={handleValidate} 
                  disabled={loading}
                  iconName={loading ? "Loader2" : "CheckCircle"}
                  iconPosition="left"
                  className={loading ? "animate-spin" : ""}
                >
                  {loading ? 'Validating...' : 'Validate Questions'}
                </Button>
              )}
              
              {step === 'import' && validationResults && (
                <Button 
                  variant="primary" 
                  onClick={handleImport} 
                  disabled={loading || validationResults?.validQuestions === 0}
                  iconName={loading ? "Loader2" : "Download"}
                  iconPosition="left"
                  className={loading ? "animate-spin" : ""}
                >
                  {loading ? 'Importing...' : `Import ${validationResults?.validQuestions} Questions`}
                </Button>
              )}
              
              {step === 'complete' && (
                <>
                  <Button variant="outline" onClick={handleReset}>
                    Import More
                  </Button>
                  <Button variant="primary" onClick={handleClose}>
                    Done
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;