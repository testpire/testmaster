import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import PageLayout from '../../components/layout/PageLayout';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import QuestionCard from './components/QuestionCard';
import ManualQuestionModal from './components/ManualQuestionModal';
import BulkImportModal from './components/BulkImportModal';
import { questionService } from '../../services/questionService';

const PAGE_SIZE = 20;

const QuestionBank = () => {
  const { user, userProfile } = useAuth();
  const currentUser = userProfile || user;

  // Try to get SuperAdmin context for institute-change refetch
  let superAdminContext = null;
  try {
    superAdminContext = useSuperAdmin();
  } catch (e) {
    // Not in super-admin context
  }
  
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isManualQuestionModalOpen, setIsManualQuestionModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  
  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // The questions list scrolls inside its own container (not the window), so the
  // infinite-scroll listener must be attached to this element, not `window`.
  const scrollContainerRef = useRef(null);
  // Synchronous guard so a burst of scroll events can't fire overlapping fetches
  // before the `loadingMore` state has a chance to update.
  const loadingMoreRef = useRef(false);

  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 0,
    totalPages: 0,
    totalElements: 0,
    hasMore: false,
    size: 20
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    difficulty: '',
    subject: '',
    chapter: '',
    topic: ''
  });

  // Filter dropdown data
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  // State for questions - starts empty, loads from API
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // Load a specific page of questions from the backend (replaces the current list).
  const loadQuestions = async (page = 0) => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError(null);

      const searchParams = {
        page,
        size: PAGE_SIZE
      };
      // Institute is scoped server-side via the X-Institute-Id header (selected institute
      // for SUPER_ADMIN) or the JWT for other roles — no instituteId needed in the body.

      // Add filters to search params if they exist
      if (filters.difficulty) searchParams.difficulty = filters.difficulty;
      if (filters.subject) searchParams.subjectId = filters.subject;
      if (filters.chapter) searchParams.chapterId = filters.chapter;
      if (filters.topic) searchParams.topicId = filters.topic;

      const result = await questionService.searchQuestions(searchParams);
      const { data, pagination: paginationData } = result;

      setSelectedQuestions(data && Array.isArray(data) ? data : []);
      setPagination(
        paginationData || {
          currentPage: page,
          totalPages: 0,
          totalElements: 0,
          hasMore: false,
          size: PAGE_SIZE
        }
      );
      // Fresh load — scroll the list back to the top.
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    } catch (err) {
      // On error, show empty state
      setSelectedQuestions([]);
      setPagination({
        currentPage: 0,
        totalPages: 0,
        totalElements: 0,
        hasMore: false,
        size: PAGE_SIZE
      });
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch the next page and append it to the current list (infinite scroll).
  const loadMoreQuestions = async () => {
    if (!currentUser || loading || loadingMoreRef.current || !pagination.hasMore) return;

    loadingMoreRef.current = true;
    try {
      setLoadingMore(true);

      const searchParams = {
        page: pagination.currentPage + 1,
        size: PAGE_SIZE
      };
      if (filters.difficulty) searchParams.difficulty = filters.difficulty;
      if (filters.subject) searchParams.subjectId = filters.subject;
      if (filters.chapter) searchParams.chapterId = filters.chapter;
      if (filters.topic) searchParams.topicId = filters.topic;

      const result = await questionService.searchQuestions(searchParams);
      const { data, pagination: paginationData } = result;

      if (data && Array.isArray(data) && data.length > 0) {
        setSelectedQuestions((prev) => [...prev, ...data]);
      }
      if (paginationData) {
        setPagination(paginationData);
      }
    } catch (err) {
      // Soft-fail: keep what we have, don't surface a hard error for a scroll fetch.
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  };

  // Trigger the next-page fetch when the user scrolls near the bottom of the list
  // container. Bound to the scrollable element's onScroll (not window).
  const handleScroll = (event) => {
    const el = event.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      loadMoreQuestions();
    }
  };

  // Load filter data
  const loadSubjects = async () => {
    try {
      const { data } = await questionService.getSubjects();
      setSubjects(data || []);
    } catch (error) {
      console.warn('Failed to load subjects:', error);
    }
  };

  const loadChapters = async (subjectId) => {
    if (!subjectId) {
      setChapters([]);
      return;
    }
    
    try {
      setLoadingFilters(true);
      const { data } = await questionService.getChaptersBySubject(subjectId);
      setChapters(data || []);
    } catch (error) {
      console.warn('Failed to load chapters:', error);
      setChapters([]);
    } finally {
      setLoadingFilters(false);
    }
  };

  const loadTopics = async (chapterId) => {
    if (!chapterId) {
      setTopics([]);
      return;
    }
    
    try {
      setLoadingFilters(true);
      const { data } = await questionService.getTopicsByChapter(chapterId);
      setTopics(data || []);
    } catch (error) {
      console.warn('Failed to load topics:', error);
      setTopics([]);
    } finally {
      setLoadingFilters(false);
    }
  };

  // Load questions when component mounts or filters change (reset to first page)
  useEffect(() => {
    if (currentUser) {
      loadQuestions(0);
    }
  }, [currentUser, filters]);

  // Reload questions when super-admin switches institute
  useEffect(() => {
    if (superAdminContext?.selectedInstitute?.id && currentUser) {
      loadQuestions(0);
    }
  }, [superAdminContext?.selectedInstitute?.id]);

  // Load subjects on mount
  useEffect(() => {
    if (currentUser) {
      loadSubjects();
    }
  }, [currentUser]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isFilterDropdownOpen && !event.target.closest('.filter-dropdown')) {
        setIsFilterDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterDropdownOpen]);

  // Enhanced handlers with API integration
  const handleQuestionCreated = () => {
    setIsManualQuestionModalOpen(false);
    setEditingQuestion(null); // Clear editing state
    // Refresh questions from API with fresh pagination after creating a new question
    if (currentUser && !loading) {
      loadQuestions(0);
    }
  };
  
  const handleDeleteQuestion = async (questionId) => {
    if (!questionId) return;
    if (!window.confirm('Delete this question? This cannot be undone.')) return;

    // Optimistically remove from UI, keep a copy to restore on failure
    const previous = selectedQuestions;
    setSelectedQuestions(prev => prev.filter(q => q.id !== questionId));

    const { error } = await questionService.deleteQuestion(questionId);
    if (error) {
      // Restore and surface the failure
      setSelectedQuestions(previous);
      setError(error.message || 'Failed to delete question');
    }
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...filters, [filterType]: value };
    
    // Reset dependent filters when parent filter changes
    if (filterType === 'subject') {
      newFilters.chapter = '';
      newFilters.topic = '';
      setChapters([]);
      setTopics([]);
      if (value) loadChapters(value);
    } else if (filterType === 'chapter') {
      newFilters.topic = '';
      setTopics([]);
      if (value) loadTopics(value);
    }
    
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      difficulty: '',
      subject: '',
      chapter: '',
      topic: ''
    });
    setChapters([]);
    setTopics([]);
  };

  const handleQuestionEdit = (question) => {
    // Set the editing question for the ManualQuestionModal
    setEditingQuestion(question);
    setIsManualQuestionModalOpen(true);
  };

  const handleQuestionRemove = (index) => {
    setSelectedQuestions(prev => prev?.filter((_, i) => i !== index));
  };

  const handleQuestionReplace = (question) => {
    // Replace question
  };

  const handleQuestionMoveUp = (index) => {
    if (index > 0) {
      setSelectedQuestions(prev => {
        const newQuestions = [...prev];
        [newQuestions[index], newQuestions[index - 1]] = [newQuestions[index - 1], newQuestions[index]];
        return newQuestions;
      });
    }
  };

  const handleQuestionMoveDown = (index) => {
    setSelectedQuestions(prev => {
      if (index < prev.length - 1) {
        const newQuestions = [...prev];
        [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
        return newQuestions;
      }
      return prev;
    });
  };

  // FilterDropdownContent component
  const FilterDropdownContent = ({ filters, onFilterChange, onClearFilters }) => (
    <div className="space-y-4">
      {/* Difficulty Filter */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Difficulty Level
        </label>
        <select
          value={filters.difficulty}
          onChange={(e) => onFilterChange('difficulty', e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
        >
          <option value="">All Difficulty Levels</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
      </div>

      {/* Subject Filter */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Subject
        </label>
        <select
          value={filters.subject}
          onChange={(e) => onFilterChange('subject', e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
        >
          <option value="">All Subjects</option>
          {subjects.map(subject => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>

      {/* Chapter Filter */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Chapter
        </label>
        <select
          value={filters.chapter}
          onChange={(e) => onFilterChange('chapter', e.target.value)}
          disabled={!filters.subject || loadingFilters}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">All Chapters</option>
          {chapters.map(chapter => (
            <option key={chapter.id} value={chapter.id}>
              {chapter.name}
            </option>
          ))}
        </select>
        {loadingFilters && filters.subject && (
          <p className="text-xs text-muted-foreground mt-1">Loading chapters...</p>
        )}
      </div>

      {/* Topic Filter */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Topic
        </label>
        <select
          value={filters.topic}
          onChange={(e) => onFilterChange('topic', e.target.value)}
          disabled={!filters.chapter || loadingFilters}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">All Topics</option>
          {topics.map(topic => (
            <option key={topic.id} value={topic.id}>
              {topic.name}
            </option>
          ))}
        </select>
        {loadingFilters && filters.chapter && (
          <p className="text-xs text-muted-foreground mt-1">Loading topics...</p>
        )}
      </div>

      {/* Clear Filters Button */}
      <div className="pt-2 border-t border-border">
        <Button
          variant="outline"
          onClick={onClearFilters}
          className="w-full text-sm"
          iconName="X"
          iconPosition="left"
        >
          Clear All Filters
        </Button>
      </div>
    </div>
  );

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'super-admin';

  return (
    <PageLayout
      title="Question Bank"
      activeRoute="/question-bank"
      showInstituteDropdown={isSuperAdmin && !!(superAdminContext)}
      institutes={superAdminContext?.allInstitutes || []}
      selectedInstitute={superAdminContext?.selectedInstitute || null}
      onInstituteChange={superAdminContext?.handleInstituteChange || (() => {})}
      institutesLoading={superAdminContext?.institutesLoading || false}
    >
      <div className="h-full flex flex-col">
        {/* Header Section with Actions and Filters */}
        <div className="bg-background border-b border-border px-4 lg:px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Title and Question Count */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4">
              <h1 className="text-xl lg:text-2xl font-bold text-foreground">Question Bank</h1>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1 lg:mt-0">
                <span>
                  {loading && selectedQuestions.length === 0 ? (
                    'Loading questions...'
                  ) : pagination.totalElements > 0 ? (
                    <>
                      Showing {selectedQuestions.length} of {pagination.totalElements} questions
                      {pagination.hasMore && (
                        <span className="text-blue-600 ml-1">(scroll for more)</span>
                      )}
                    </>
                  ) : (
                    '0 Questions'
                  )}
                </span>
              </div>
            </div>

            {/* Action Buttons and Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              {/* Filter Dropdown */}
              <div className="relative filter-dropdown">
                <Button
                  variant="outline"
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  iconName="Filter"
                  iconPosition="left"
                  className="text-sm"
                >
                  Filters
                </Button>
                
                {isFilterDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-[calc(100vw-1rem)] bg-card border border-border rounded-lg shadow-lg z-50">
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-foreground">Filters</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsFilterDropdownOpen(false)}
                          className="w-6 h-6"
                        >
                          <Icon name="X" size={16} />
                        </Button>
                      </div>
                      
                      {/* Filter Content */}
                      <FilterDropdownContent
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onClearFilters={handleClearFilters}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                onClick={() => setIsBulkImportModalOpen(true)}
                iconName="Upload"
                iconPosition="left"
                className="text-sm"
              >
                <span className="hidden sm:inline">Bulk Import</span>
                <span className="sm:hidden">Import</span>
              </Button>

              <Button
                variant="primary"
                onClick={() => setIsManualQuestionModalOpen(true)}
                iconName="Plus"
                iconPosition="left"
                className="text-sm"
              >
                <span className="hidden sm:inline">Add Manual Question</span>
                <span className="sm:hidden">Add Question</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 lg:p-6"
        >
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">Loading questions...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {!loading && !error && selectedQuestions?.length === 0 && (
            <div className="text-center py-12">
              <Icon name="FileText" size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Found</h3>
              <p className="text-gray-600 mb-4">Start by adding your first question or adjust your filters.</p>
              <Button
                variant="primary"
                onClick={() => setIsManualQuestionModalOpen(true)}
                iconName="Plus"
                iconPosition="left"
              >
                Add First Question
              </Button>
            </div>
          )}

          {!loading && selectedQuestions?.length > 0 && (
            <>
              <div className="space-y-4">
                {selectedQuestions.map((question, index) => (
                  <QuestionCard
                    key={question?.id || index}
                    question={question}
                    index={index}
                    onEdit={handleQuestionEdit}
                    onRemove={handleQuestionRemove}
                    onReplace={handleQuestionReplace}
                    onMoveUp={handleQuestionMoveUp}
                    onMoveDown={handleQuestionMoveDown}
                    onDelete={() => handleDeleteQuestion(question?.id)}
                  />
                ))}
              </div>
              
              {/* Loading more indicator */}
              {loadingMore && (
                <div className="py-8 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground text-sm">Loading more questions...</p>
                </div>
              )}

              {/* End of list indicator */}
              {!pagination.hasMore && !loadingMore && selectedQuestions.length > 0 && (
                <div className="py-6 text-center">
                  <p className="text-muted-foreground text-sm">
                    You've reached the end · {pagination.totalElements} questions total
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}

      {isManualQuestionModalOpen && (
        <ManualQuestionModal
          isOpen={isManualQuestionModalOpen}
          onClose={() => {
            setIsManualQuestionModalOpen(false);
            setEditingQuestion(null);
          }}
          onQuestionAdded={handleQuestionCreated}
          currentUser={currentUser}
          editingQuestion={editingQuestion}
        />
      )}

      {isBulkImportModalOpen && (
        <BulkImportModal
          isOpen={isBulkImportModalOpen}
          onClose={() => setIsBulkImportModalOpen(false)}
          onQuestionsImported={() => {
            // Keep the modal open so the upload summary (counts + row errors) stays
            // visible; the user closes it manually. Just refresh the list underneath.
            if (currentUser && !loading) {
              loadQuestions(0);
            }
          }}
        />
      )}
    </PageLayout>
  );
};

export default QuestionBank;