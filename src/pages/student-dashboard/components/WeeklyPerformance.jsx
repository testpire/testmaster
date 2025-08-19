import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const WeeklyPerformance = () => {
  const [expandedCard, setExpandedCard] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState('current');

  const weeklyData = [
    { day: 'Mon', tests: 2, score: 85, timeSpent: 120 },
    { day: 'Tue', tests: 1, score: 78, timeSpent: 90 },
    { day: 'Wed', tests: 3, score: 92, timeSpent: 180 },
    { day: 'Thu', tests: 2, score: 88, timeSpent: 150 },
    { day: 'Fri', tests: 1, score: 82, timeSpent: 75 },
    { day: 'Sat', tests: 4, score: 90, timeSpent: 240 },
    { day: 'Sun', tests: 2, score: 86, timeSpent: 120 }
  ];

  const performanceSummary = {
    current: {
      week: 'Jan 13-19, 2025',
      testsCompleted: 15,
      averageScore: 86.4,
      totalTimeSpent: 975, // minutes
      improvement: '+5.2%',
      strongSubjects: ['Chemistry', 'Biology'],
      weakSubjects: ['Mathematics'],
      recommendations: [
        'Focus more on calculus problems',
        'Increase daily practice time by 30 minutes',
        'Review organic chemistry mechanisms'
      ]
    },
    previous: {
      week: 'Jan 6-12, 2025',
      testsCompleted: 12,
      averageScore: 82.1,
      totalTimeSpent: 840,
      improvement: '+2.8%',
      strongSubjects: ['Physics', 'Chemistry'],
      weakSubjects: ['Biology', 'Mathematics'],
      recommendations: [
        'Practice more genetics problems',
        'Work on integration techniques',
        'Review thermodynamics concepts'
      ]
    }
  };

  const currentSummary = performanceSummary?.[selectedWeek];

  const subjectProgress = [
    { subject: 'Physics', current: 85, previous: 82, change: '+3', color: 'text-blue-600' },
    { subject: 'Chemistry', current: 92, previous: 89, change: '+3', color: 'text-green-600' },
    { subject: 'Mathematics', current: 78, previous: 75, change: '+3', color: 'text-purple-600' },
    { subject: 'Biology', current: 90, previous: 86, change: '+4', color: 'text-emerald-600' }
  ];

  const achievements = [
    {
      id: 1,
      title: 'Perfect Score',
      description: 'Scored 100% in Chemistry Quiz',
      icon: 'Trophy',
      color: 'text-warning bg-warning/10',
      date: '2 days ago'
    },
    {
      id: 2,
      title: 'Speed Demon',
      description: 'Completed test 20% faster than average',
      icon: 'Zap',
      color: 'text-primary bg-primary/10',
      date: '3 days ago'
    },
    {
      id: 3,
      title: 'Consistency King',
      description: '7 days streak of daily practice',
      icon: 'Calendar',
      color: 'text-success bg-success/10',
      date: '1 week ago'
    }
  ];

  const toggleCard = (cardId) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Weekly Summary Card */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Weekly Performance</h3>
            <p className="text-sm text-muted-foreground">{currentSummary?.week}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={selectedWeek === 'current' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedWeek('current')}
            >
              Current
            </Button>
            <Button
              variant={selectedWeek === 'previous' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedWeek('previous')}
            >
              Previous
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
            <div className="flex items-center space-x-2 mb-2">
              <Icon name="FileText" size={16} className="text-primary" />
              <span className="text-sm text-muted-foreground">Tests</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{currentSummary?.testsCompleted}</p>
          </div>
          
          <div className="bg-success/5 rounded-lg p-4 border border-success/20">
            <div className="flex items-center space-x-2 mb-2">
              <Icon name="Target" size={16} className="text-success" />
              <span className="text-sm text-muted-foreground">Avg Score</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{currentSummary?.averageScore}%</p>
          </div>
          
          <div className="bg-warning/5 rounded-lg p-4 border border-warning/20">
            <div className="flex items-center space-x-2 mb-2">
              <Icon name="Clock" size={16} className="text-warning" />
              <span className="text-sm text-muted-foreground">Time Spent</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatTime(currentSummary?.totalTimeSpent)}</p>
          </div>
          
          <div className="bg-accent/5 rounded-lg p-4 border border-accent/20">
            <div className="flex items-center space-x-2 mb-2">
              <Icon name="TrendingUp" size={16} className="text-accent" />
              <span className="text-sm text-muted-foreground">Improvement</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{currentSummary?.improvement}</p>
          </div>
        </div>

        {/* Performance Chart */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-foreground mb-4">Daily Performance</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="var(--color-primary)" 
                  strokeWidth={3}
                  dot={{ fill: 'var(--color-primary)', strokeWidth: 2, r: 4 }}
                  name="Score (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {/* Subject Progress & Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Progress */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-foreground">Subject Progress</h4>
            <Icon name="BarChart3" size={20} className="text-primary" />
          </div>
          
          <div className="space-y-4">
            {subjectProgress?.map((subject, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{subject?.subject}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-foreground">{subject?.current}%</span>
                    <span className={`text-xs font-medium ${subject?.color}`}>
                      {subject?.change}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${subject?.current}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Achievements */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-foreground">Recent Achievements</h4>
            <Icon name="Award" size={20} className="text-warning" />
          </div>
          
          <div className="space-y-3">
            {achievements?.map((achievement) => (
              <div key={achievement?.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${achievement?.color}`}>
                  <Icon name={achievement?.icon} size={18} />
                </div>
                <div className="flex-1">
                  <h5 className="font-medium text-foreground">{achievement?.title}</h5>
                  <p className="text-sm text-muted-foreground">{achievement?.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{achievement?.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Expandable Recommendations */}
      <div className="bg-card rounded-lg border border-border p-6">
        <button
          onClick={() => toggleCard('recommendations')}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <Icon name="Lightbulb" size={20} className="text-accent" />
            <h4 className="text-lg font-semibold text-foreground">AI Recommendations</h4>
          </div>
          <Icon 
            name="ChevronDown" 
            size={20} 
            className={`text-muted-foreground transition-transform duration-200 ${
              expandedCard === 'recommendations' ? 'rotate-180' : ''
            }`}
          />
        </button>
        
        {expandedCard === 'recommendations' && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium text-success mb-2">Strong Areas</h5>
                <div className="space-y-2">
                  {currentSummary?.strongSubjects?.map((subject, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Icon name="CheckCircle" size={16} className="text-success" />
                      <span className="text-sm text-foreground">{subject}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h5 className="font-medium text-warning mb-2">Areas to Improve</h5>
                <div className="space-y-2">
                  {currentSummary?.weakSubjects?.map((subject, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Icon name="AlertCircle" size={16} className="text-warning" />
                      <span className="text-sm text-foreground">{subject}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <h5 className="font-medium text-foreground mb-2">Personalized Suggestions</h5>
              <ul className="space-y-2">
                {currentSummary?.recommendations?.map((rec, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <Icon name="ArrowRight" size={16} className="text-primary mt-0.5" />
                    <span className="text-sm text-muted-foreground">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyPerformance;