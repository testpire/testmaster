import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const QuestionCard = ({ 
  question, 
  index, 
  onEdit, 
  onRemove, 
  onReplace, 
  onMoveUp, 
  onMoveDown,
  onDelete,
  isDragging = false,
  dragHandleProps = {}
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
    questionImagePath: question.questionImagePath || ''
  };

  const getDifficultyColor = (difficulty) => {
    const safeLevel = (difficulty || '').toLowerCase();
    switch (safeLevel) {
      case 'easy': return 'text-green-700 bg-green-100';
      case 'medium': return 'text-yellow-700 bg-yellow-100';
      case 'hard': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
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
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm transition-all duration-200 hover:shadow-md">
      
      {/* Question Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {/* Question Number */}
          <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
            {(index || 0) + 1}
          </div>
          
          {/* Question Type Badge */}
          <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {safeQuestion.questionType.toUpperCase()}
          </div>
          
          {/* Difficulty Badge */}
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(safeQuestion.difficultyLevel)}`}>
            {safeQuestion.difficultyLevel}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1">          
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

      {/* Question Content */}
      <div className="mb-3">
        <div className="text-sm text-gray-900 leading-relaxed">
          {safeQuestion.text ? (
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
          ) : (
            <span className="text-gray-400 italic">No question text available</span>
          )}
        </div>
        
        {/* Question Image */}
        {safeQuestion.questionImagePath && (
          <div className="mt-3">
            <img 
              src={safeQuestion.questionImagePath} 
              alt="Question Image"
              className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm"
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
                    : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}
              >
                <div className="flex items-start space-x-2">
                  <span className="font-medium flex-shrink-0">
                    {String.fromCharCode(65 + optionIndex)}.
                  </span>
                  
                  <div className="flex-1">
                    <div>{safeOption.text}</div>
                    
                    {/* Option Image */}
                    {safeOption.optionImagePath && (
                      <div className="mt-2">
                        <img 
                          src={safeOption.optionImagePath} 
                          alt={`Option ${String.fromCharCode(65 + optionIndex)} Image`}
                          className="max-w-full h-auto rounded border border-gray-300 shadow-sm"
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

      {/* Question Metadata */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          {safeQuestion.topicName && (
            <div className="flex items-center space-x-1">
              <Icon name="Tag" size={12} />
              <span>{safeQuestion.topicName}</span>
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