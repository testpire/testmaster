import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';

const QuickPractice = ({ onStartPractice = () => {} }) => {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState('');

  const subjects = [
    { value: 'physics', label: 'Physics' },
    { value: 'chemistry', label: 'Chemistry' },
    { value: 'mathematics', label: 'Mathematics' },
    { value: 'biology', label: 'Biology' }
  ];

  const difficulties = [
    { value: 'easy', label: 'Easy' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'tough', label: 'Tough' },
    { value: 'mixed', label: 'Mixed' }
  ];

  const questionCounts = [
    { value: '10', label: '10 Questions (15 min)' },
    { value: '20', label: '20 Questions (30 min)' },
    { value: '30', label: '30 Questions (45 min)' },
    { value: '50', label: '50 Questions (75 min)' }
  ];

  const practiceStats = [
    {
      subject: 'Physics',
      icon: 'Zap',
      practiced: 145,
      accuracy: 78,
      lastSession: '2 hours ago',
      color: 'text-blue-600 bg-blue-50'
    },
    {
      subject: 'Chemistry',
      icon: 'Flask',
      practiced: 132,
      accuracy: 85,
      lastSession: '1 day ago',
      color: 'text-green-600 bg-green-50'
    },
    {
      subject: 'Mathematics',
      icon: 'Calculator',
      practiced: 198,
      accuracy: 72,
      lastSession: '3 hours ago',
      color: 'text-purple-600 bg-purple-50'
    },
    {
      subject: 'Biology',
      icon: 'Leaf',
      practiced: 89,
      accuracy: 91,
      lastSession: '5 hours ago',
      color: 'text-emerald-600 bg-emerald-50'
    }
  ];

  const quickTopics = [
    { id: 1, subject: 'Physics', topic: 'Kinematics', questions: 25, difficulty: 'Easy' },
    { id: 2, subject: 'Chemistry', topic: 'Organic Reactions', questions: 30, difficulty: 'Moderate' },
    { id: 3, subject: 'Mathematics', topic: 'Integration', questions: 20, difficulty: 'Tough' },
    { id: 4, subject: 'Biology', topic: 'Genetics', questions: 35, difficulty: 'Easy' },
    { id: 5, subject: 'Physics', topic: 'Thermodynamics', questions: 28, difficulty: 'Moderate' },
    { id: 6, subject: 'Chemistry', topic: 'Chemical Bonding', questions: 22, difficulty: 'Easy' }
  ];

  const handleStartCustomPractice = () => {
    if (selectedSubject && selectedDifficulty && selectedQuestions) {
      const practiceConfig = {
        subject: selectedSubject,
        difficulty: selectedDifficulty,
        questions: selectedQuestions,
        type: 'custom'
      };
      onStartPractice(practiceConfig);
    }
  };

  const handleQuickTopicPractice = (topic) => {
    const practiceConfig = {
      subject: topic?.subject,
      topic: topic?.topic,
      questions: topic?.questions,
      difficulty: topic?.difficulty,
      type: 'topic'
    };
    onStartPractice(practiceConfig);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'text-success bg-success/10';
      case 'moderate': return 'text-warning bg-warning/10';
      case 'tough': return 'text-error bg-error/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-foreground">Quick Practice</h3>
        <Icon name="Target" size={20} className="text-primary" />
      </div>
      {/* Practice Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {practiceStats?.map((stat, index) => (
          <div key={index} className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat?.color}`}>
                <Icon name={stat?.icon} size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{stat?.subject}</p>
                <p className="text-xs text-muted-foreground">{stat?.lastSession}</p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Questions</span>
                <span className="font-medium text-foreground">{stat?.practiced}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Accuracy</span>
                <span className="font-medium text-foreground">{stat?.accuracy}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Custom Practice Creator */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-foreground">Create Custom Practice</h4>
          
          <Select
            label="Select Subject"
            placeholder="Choose a subject"
            options={subjects}
            value={selectedSubject}
            onChange={setSelectedSubject}
          />

          <Select
            label="Difficulty Level"
            placeholder="Choose difficulty"
            options={difficulties}
            value={selectedDifficulty}
            onChange={setSelectedDifficulty}
          />

          <Select
            label="Number of Questions"
            placeholder="Choose question count"
            options={questionCounts}
            value={selectedQuestions}
            onChange={setSelectedQuestions}
          />

          <Button
            variant="default"
            onClick={handleStartCustomPractice}
            disabled={!selectedSubject || !selectedDifficulty || !selectedQuestions}
            iconName="Play"
            iconPosition="left"
            fullWidth
          >
            Start Custom Practice
          </Button>
        </div>

        {/* Quick Topic Practice */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-foreground">Quick Topic Practice</h4>
          <p className="text-sm text-muted-foreground">Jump into focused practice sessions</p>
          
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {quickTopics?.map((topic) => (
              <div 
                key={topic?.id} 
                className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{topic?.topic}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(topic?.difficulty)}`}>
                      {topic?.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span>{topic?.subject}</span>
                    <span>{topic?.questions} questions</span>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickTopicPractice(topic)}
                  iconName="ArrowRight"
                  iconPosition="right"
                >
                  Start
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Practice Modes */}
      <div className="mt-6 pt-6 border-t border-border">
        <h4 className="text-lg font-semibold text-foreground mb-4">Practice Modes</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors cursor-pointer">
            <div className="flex items-center space-x-3 mb-2">
              <Icon name="Clock" size={20} className="text-primary" />
              <h5 className="font-medium text-foreground">Timed Practice</h5>
            </div>
            <p className="text-sm text-muted-foreground">Practice with exam-like time constraints</p>
          </div>
          
          <div className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors cursor-pointer">
            <div className="flex items-center space-x-3 mb-2">
              <Icon name="Infinity" size={20} className="text-secondary" />
              <h5 className="font-medium text-foreground">Untimed Practice</h5>
            </div>
            <p className="text-sm text-muted-foreground">Focus on accuracy without time pressure</p>
          </div>
          
          <div className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors cursor-pointer">
            <div className="flex items-center space-x-3 mb-2">
              <Icon name="RotateCcw" size={20} className="text-accent" />
              <h5 className="font-medium text-foreground">Revision Mode</h5>
            </div>
            <p className="text-sm text-muted-foreground">Review previously attempted questions</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickPractice;