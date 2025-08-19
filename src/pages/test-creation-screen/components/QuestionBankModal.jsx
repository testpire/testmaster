import React, { useState, useEffect } from 'react';
import { questionService } from '../../../services/questionService';
import { useAuth } from '../../../contexts/AuthContext';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const QuestionBankModal = ({ isOpen, onClose, onAddQuestions, filters: initialFilters = {} }) => {
  const { userProfile } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    subject: initialFilters?.subject || '',
    difficulty: initialFilters?.difficulty || '',
    examType: initialFilters?.examType || '',
    questionType: initialFilters?.questionType || '',
    ...initialFilters
  });

  // Load questions when modal opens or filters change
  useEffect(() => {
    if (isOpen) {
      loadQuestions();
    }
  }, [isOpen, filters]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError('');
      
      const queryFilters = {
        ...filters,
        search: searchTerm,
        limit: 50, // Limit for better performance
        isActive: true
      };

      const { data, error: questionsError } = await questionService?.getQuestions(queryFilters);
      
      if (questionsError) {
        setError(`Failed to load questions: ${questionsError?.message}`);
        setQuestions([]);
        return;
      }

      setQuestions(data || []);
      
      if (!data || data?.length === 0) {
        setError('No questions found matching your criteria. Try adjusting your filters.');
      }
    } catch (error) {
      const errorMessage = error?.message?.includes('Failed to fetch') 
        ? 'Cannot connect to database. Please check your Supabase connection.'
        : `Error loading questions: ${error?.message}`;
      setError(errorMessage);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadQuestions();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleQuestionSelect = (question) => {
    setSelectedQuestions(prev => {
      const isSelected = prev?.some(q => q?.id === question?.id);
      if (isSelected) {
        return prev?.filter(q => q?.id !== question?.id);
      } else {
        return [...prev, question];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedQuestions?.length === questions?.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions([...questions]);
    }
  };

  const handleAddSelected = () => {
    if (selectedQuestions?.length > 0) {
      // Transform questions to match the expected format
      const transformedQuestions = selectedQuestions?.map((question) => ({
        id: question?.id,
        content: question?.question_text,
        type: question?.question_type,
        difficulty: question?.difficulty_level,
        subject: question?.subject,
        chapter: question?.chapter?.name || 'Unknown Chapter',
        topic: question?.topic?.name || 'Unknown Topic',
        marks: question?.marks || 4,
        estimatedTime: Math.ceil(question?.marks / 2) || 2, // Rough estimate
        negativeMarks: question?.negative_marks || 0,
        explanation: question?.explanation,
        ...(question?.question_type === 'mcq' && question?.options && {
          options: question?.options?.map((option) => ({
            text: option?.option_text,
            isCorrect: option?.is_correct
          })),
          correctAnswer: question?.options?.findIndex(option => option?.is_correct) || 0
        }),
        ...(question?.question_type === 'integer' && {
          correctAnswer: question?.correct_integer_answer || 0
        })
      }));

      onAddQuestions(transformedQuestions);
      setSelectedQuestions([]);
      onClose();
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-50';
      case 'moderate': return 'text-yellow-600 bg-yellow-50';
      case 'difficult': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-xl shadow-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Question Bank</h2>
            <p className="text-muted-foreground">Select questions to add to your test</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <Icon name="X" size={24} className="text-muted-foreground" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-border bg-muted/30">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e?.target?.value)}
                onKeyPress={(e) => e?.key === 'Enter' && handleSearch()}
                className="w-full"
              />
            </div>
            
            <Select
              value={filters?.subject}
              onChange={(value) => handleFilterChange('subject', value)}
              options={[
                { value: '', label: 'All Subjects' },
                { value: 'physics', label: 'Physics' },
                { value: 'chemistry', label: 'Chemistry' },
                { value: 'mathematics', label: 'Mathematics' },
                { value: 'biology', label: 'Biology' }
              ]}
            />

            <Select
              value={filters?.difficulty}
              onChange={(value) => handleFilterChange('difficulty', value)}
              options={[
                { value: '', label: 'All Difficulties' },
                { value: 'easy', label: 'Easy' },
                { value: 'moderate', label: 'Moderate' },
                { value: 'difficult', label: 'Difficult' }
              ]}
            />

            <Select
              value={filters?.questionType}
              onChange={(value) => handleFilterChange('questionType', value)}
              options={[
                { value: '', label: 'All Types' },
                { value: 'mcq', label: 'MCQ' },
                { value: 'integer_type', label: 'Integer' },
                { value: 'subjective', label: 'Subjective' }
              ]}
            />
          </div>

          <div className="flex items-center justify-between mt-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSearch}
              disabled={loading}
            >
              <Icon name="Search" size={16} />
              Search
            </Button>
            
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>{questions?.length} questions found</span>
              <span>{selectedQuestions?.length} selected</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 240px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Icon name="Loader2" size={32} className="animate-spin text-primary mr-3" />
              <p className="text-muted-foreground">Loading questions...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <Icon name="AlertCircle" size={48} className="mx-auto mb-4 text-error" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Questions</h3>
              <p className="text-error mb-4">{error}</p>
              <Button onClick={loadQuestions} variant="outline">
                Try Again
              </Button>
            </div>
          ) : questions?.length === 0 ? (
            <div className="p-6 text-center">
              <Icon name="FileSearch" size={48} className="mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Questions Found</h3>
              <p className="text-muted-foreground mb-4">
                No questions match your current filters. Try adjusting your search criteria.
              </p>
              <Button 
                onClick={() => {
                  setFilters({});
                  setSearchTerm('');
                }} 
                variant="outline"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="p-6">
              {/* Select All */}
              <div className="flex items-center justify-between mb-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedQuestions?.length === questions?.length && questions?.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-primary focus:ring-primary border-border rounded"
                  />
                  <span className="font-medium text-foreground">
                    Select All ({questions?.length} questions)
                  </span>
                </div>
                {selectedQuestions?.length > 0 && (
                  <span className="text-sm text-primary font-medium">
                    {selectedQuestions?.length} selected
                  </span>
                )}
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {questions?.map((question, index) => (
                  <div
                    key={question?.id}
                    className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                      selectedQuestions?.some(q => q?.id === question?.id)
                        ? 'border-primary bg-primary/5' :'border-border hover:bg-muted/30'
                    }`}
                    onClick={() => handleQuestionSelect(question)}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedQuestions?.some(q => q?.id === question?.id)}
                        onChange={() => handleQuestionSelect(question)}
                        className="w-4 h-4 text-primary focus:ring-primary border-border rounded mt-1"
                        onClick={(e) => e?.stopPropagation()}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            Q{index + 1}
                          </span>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(question?.difficulty_level)}`}>
                            {question?.difficulty_level}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {question?.subject} • {question?.question_type?.toUpperCase()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {question?.marks} marks
                          </span>
                        </div>
                        
                        <p className="text-foreground mb-2 line-clamp-3">
                          {question?.question_text}
                        </p>
                        
                        {question?.options && question?.options?.length > 0 && (
                          <div className="space-y-1">
                            {question?.options?.slice(0, 2)?.map((option, optIndex) => (
                              <div key={optIndex} className="text-sm text-muted-foreground">
                                <span className="font-medium">{option?.option_label})</span> {option?.option_text}
                              </div>
                            ))}
                            {question?.options?.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                ... and {question?.options?.length - 2} more options
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                          <span>Chapter: {question?.chapter?.name || 'Unknown'}</span>
                          <span>Topic: {question?.topic?.name || 'Unknown'}</span>
                          <span>Created by: {question?.created_by_user?.full_name || 'Unknown'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/30 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedQuestions?.length > 0 && (
              <span>{selectedQuestions?.length} questions selected</span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSelected}
              disabled={selectedQuestions?.length === 0}
              className="bg-primary text-primary-foreground"
            >
              Add Selected ({selectedQuestions?.length})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionBankModal;