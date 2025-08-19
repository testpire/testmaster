import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const TestResults = ({ 
  testData, 
  submissionData, 
  onRetakeTest, 
  onViewDetailedAnalysis,
  onBackToDashboard 
}) => {
  const navigate = useNavigate();
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);

  // Calculate results
  const calculateResults = () => {
    const { answers, questions } = submissionData;
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let unansweredQuestions = 0;
    let totalMarks = 0;
    let marksObtained = 0;
    let negativeMarks = 0;

    const topicPerformance = {};
    const subjectPerformance = {};

    questions?.forEach((question, index) => {
      const userAnswer = answers?.[index];
      const isCorrect = checkAnswer(question, userAnswer);
      
      totalMarks += question?.marks || 4;

      // Initialize topic/subject tracking
      const topic = question?.topic || 'Unknown Topic';
      const subject = question?.subject || 'Unknown Subject';
      
      if (!topicPerformance?.[topic]) {
        topicPerformance[topic] = { correct: 0, total: 0, marks: 0, maxMarks: 0 };
      }
      if (!subjectPerformance?.[subject]) {
        subjectPerformance[subject] = { correct: 0, total: 0, marks: 0, maxMarks: 0 };
      }

      topicPerformance[topic].total += 1;
      topicPerformance[topic].maxMarks += question?.marks || 4;
      subjectPerformance[subject].total += 1;
      subjectPerformance[subject].maxMarks += question?.marks || 4;

      if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
        unansweredQuestions += 1;
      } else if (isCorrect) {
        correctAnswers += 1;
        const questionMarks = question?.marks || 4;
        marksObtained += questionMarks;
        topicPerformance[topic].correct += 1;
        topicPerformance[topic].marks += questionMarks;
        subjectPerformance[subject].correct += 1;
        subjectPerformance[subject].marks += questionMarks;
      } else {
        wrongAnswers += 1;
        const negativeMarksForQuestion = question?.negativeMarks || 1;
        negativeMarks += negativeMarksForQuestion;
        marksObtained -= negativeMarksForQuestion;
      }
    });

    const finalScore = Math.max(0, marksObtained);
    const percentage = totalMarks > 0 ? (finalScore / totalMarks) * 100 : 0;

    // Calculate topic-wise performance percentages
    Object.keys(topicPerformance)?.forEach(topic => {
      const performance = topicPerformance?.[topic];
      performance.percentage = performance?.maxMarks > 0 
        ? (performance?.marks / performance?.maxMarks) * 100 
        : 0;
      performance.accuracy = performance?.total > 0 
        ? (performance?.correct / performance?.total) * 100 
        : 0;
    });

    Object.keys(subjectPerformance)?.forEach(subject => {
      const performance = subjectPerformance?.[subject];
      performance.percentage = performance?.maxMarks > 0 
        ? (performance?.marks / performance?.maxMarks) * 100 
        : 0;
      performance.accuracy = performance?.total > 0 
        ? (performance?.correct / performance?.total) * 100 
        : 0;
    });

    return {
      correctAnswers,
      wrongAnswers,
      unansweredQuestions,
      totalQuestions: questions?.length || 0,
      marksObtained: finalScore,
      totalMarks,
      negativeMarks,
      percentage: Math.round(percentage * 100) / 100,
      topicPerformance,
      subjectPerformance,
      timeSpent: submissionData?.timeSpent || 0,
      rank: Math.floor(Math.random() * 1000) + 1, // Mock rank
      percentile: Math.max(0, Math.min(100, percentage + Math.random() * 10)) // Mock percentile
    };
  };

  const checkAnswer = (question, userAnswer) => {
    if (question?.type === 'mcq') {
      return userAnswer === question?.correctAnswer;
    } else if (question?.type === 'integer') {
      return parseInt(userAnswer) === question?.correctAnswer;
    }
    return false; // Subjective questions require manual checking
  };

  const results = calculateResults();

  const getPerformanceColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    if (percentage >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getGrade = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    return 'F';
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const handleViewDetailedAnalysis = () => {
    if (onViewDetailedAnalysis) {
      onViewDetailedAnalysis(results);
    } else {
      navigate('/analytics-and-reports-screen', {
        state: { testResults: results, testData, submissionData }
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="CheckCircle" size={48} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Completed!</h1>
          <p className="text-gray-600">{testData?.title}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Overall Performance */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Performance</h2>
            
            {/* Score Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{results?.marksObtained}</div>
                <div className="text-sm text-blue-800">Marks Obtained</div>
                <div className="text-xs text-blue-600">out of {results?.totalMarks}</div>
              </div>
              
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                <div className={`text-3xl font-bold ${getPerformanceColor(results?.percentage)}`}>
                  {results?.percentage}%
                </div>
                <div className="text-sm text-green-800">Percentage</div>
                <div className="text-xs text-green-600">Grade: {getGrade(results?.percentage)}</div>
              </div>
              
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">{results?.rank}</div>
                <div className="text-sm text-purple-800">Rank</div>
                <div className="text-xs text-purple-600">{results?.percentile}%ile</div>
              </div>
              
              <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                <div className="text-3xl font-bold text-orange-600">
                  {formatTime(results?.timeSpent)}
                </div>
                <div className="text-sm text-orange-800">Time Taken</div>
                <div className="text-xs text-orange-600">
                  of {Math.floor(testData?.duration / 60)}h {testData?.duration % 60}m
                </div>
              </div>
            </div>

            {/* Question Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="flex items-center p-3 bg-green-50 rounded-lg">
                <Icon name="CheckCircle" size={20} className="text-green-600 mr-3" />
                <div>
                  <div className="text-lg font-semibold text-green-700">{results?.correctAnswers}</div>
                  <div className="text-sm text-green-600">Correct</div>
                </div>
              </div>
              
              <div className="flex items-center p-3 bg-red-50 rounded-lg">
                <Icon name="XCircle" size={20} className="text-red-600 mr-3" />
                <div>
                  <div className="text-lg font-semibold text-red-700">{results?.wrongAnswers}</div>
                  <div className="text-sm text-red-600">Wrong</div>
                </div>
              </div>
              
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <Icon name="Circle" size={20} className="text-gray-600 mr-3" />
                <div>
                  <div className="text-lg font-semibold text-gray-700">{results?.unansweredQuestions}</div>
                  <div className="text-sm text-gray-600">Unanswered</div>
                </div>
              </div>
              
              <div className="flex items-center p-3 bg-orange-50 rounded-lg">
                <Icon name="Minus" size={20} className="text-orange-600 mr-3" />
                <div>
                  <div className="text-lg font-semibold text-orange-700">-{results?.negativeMarks}</div>
                  <div className="text-sm text-orange-600">Negative</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleViewDetailedAnalysis}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Icon name="BarChart3" size={16} />
                Detailed Analysis
              </Button>
              
              {onRetakeTest && (
                <Button
                  onClick={onRetakeTest}
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  <Icon name="RotateCcw" size={16} />
                  Retake Test
                </Button>
              )}
              
              <Button
                onClick={() => navigate('/student-dashboard')}
                variant="outline"
                className="border-gray-600 text-gray-600 hover:bg-gray-50"
              >
                <Icon name="Home" size={16} />
                Back to Dashboard
              </Button>
            </div>
          </div>

          {/* Topic-wise Performance */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Topic-wise Analysis</h3>
            <div className="space-y-4">
              {Object.entries(results?.topicPerformance || {})?.map(([topic, performance]) => (
                <div key={topic} className="border-b border-gray-200 pb-3 last:border-b-0">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-medium text-gray-700">{topic}</h4>
                    <span className={`text-xs font-semibold ${getPerformanceColor(performance?.percentage)}`}>
                      {Math.round(performance?.percentage)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {performance?.correct}/{performance?.total} correct • 
                    {Math.round(performance?.accuracy)}% accuracy
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.min(100, performance?.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subject-wise Performance */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Subject-wise Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(results?.subjectPerformance || {})?.map(([subject, performance]) => (
              <div key={subject} className="p-4 border border-gray-200 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">{subject}</h4>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {Math.round(performance?.percentage)}%
                  </span>
                  <span className="text-sm text-gray-500">
                    {performance?.correct}/{performance?.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                    style={{ width: `${Math.min(100, performance?.percentage)}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500">
                  {performance?.marks}/{performance?.maxMarks} marks
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Icon name="Lightbulb" size={20} className="text-yellow-500 mr-2" />
            Recommendations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-800">Areas to Improve:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {Object.entries(results?.topicPerformance || {})
                  ?.filter(([_, performance]) => performance?.percentage < 60)
                  ?.slice(0, 3)
                  ?.map(([topic, performance]) => (
                    <li key={topic} className="flex items-center">
                      <Icon name="AlertTriangle" size={12} className="text-orange-500 mr-2" />
                      {topic} ({Math.round(performance?.percentage)}%)
                    </li>
                  ))}
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-800">Strong Areas:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {Object.entries(results?.topicPerformance || {})
                  ?.filter(([_, performance]) => performance?.percentage >= 80)
                  ?.slice(0, 3)
                  ?.map(([topic, performance]) => (
                    <li key={topic} className="flex items-center">
                      <Icon name="CheckCircle" size={12} className="text-green-500 mr-2" />
                      {topic} ({Math.round(performance?.percentage)}%)
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestResults;