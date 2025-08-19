import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Icon from '../../../components/AppIcon';

const PerformanceAnalytics = () => {
  const recentTestScores = [
    { test: "Physics Mock 1", score: 85, trend: "up", date: "2025-01-10" },
    { test: "Chemistry Quiz", score: 92, trend: "up", date: "2025-01-08" },
    { test: "Math Practice", score: 78, trend: "down", date: "2025-01-05" },
    { test: "Biology Test", score: 88, trend: "up", date: "2025-01-03" }
  ];

  const subjectAccuracy = [
    { subject: "Physics", accuracy: 85, questions: 120 },
    { subject: "Chemistry", accuracy: 92, questions: 98 },
    { subject: "Mathematics", accuracy: 78, questions: 145 },
    { subject: "Biology", accuracy: 88, questions: 87 }
  ];

  const timeAnalysis = [
    { subject: "Physics", avgTime: 2.3, optimalTime: 2.0 },
    { subject: "Chemistry", avgTime: 1.8, optimalTime: 2.0 },
    { subject: "Math", avgTime: 3.2, optimalTime: 2.5 },
    { subject: "Biology", avgTime: 2.1, optimalTime: 2.0 }
  ];

  const getTrendIcon = (trend) => {
    return trend === 'up' ? 'TrendingUp' : 'TrendingDown';
  };

  const getTrendColor = (trend) => {
    return trend === 'up' ? 'text-success' : 'text-error';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
      {/* Recent Test Scores */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Recent Scores</h3>
          <Icon name="BarChart3" size={20} className="text-primary" />
        </div>
        <div className="space-y-3">
          {recentTestScores?.map((test, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-foreground text-sm">{test?.test}</p>
                <p className="text-xs text-muted-foreground">{test?.date}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-foreground">{test?.score}%</span>
                <Icon 
                  name={getTrendIcon(test?.trend)} 
                  size={16} 
                  className={getTrendColor(test?.trend)} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Subject-wise Accuracy */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Subject Accuracy</h3>
          <Icon name="Target" size={20} className="text-accent" />
        </div>
        <div className="space-y-4">
          {subjectAccuracy?.map((subject, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{subject?.subject}</span>
                <span className="text-sm font-bold text-foreground">{subject?.accuracy}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${subject?.accuracy}%` }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground">{subject?.questions} questions attempted</p>
            </div>
          ))}
        </div>
      </div>
      {/* Time Analysis Chart */}
      <div className="bg-card rounded-lg border border-border p-6 lg:col-span-2 xl:col-span-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Time Analysis</h3>
          <Icon name="Clock" size={20} className="text-warning" />
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeAnalysis}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis 
                dataKey="subject" 
                tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="avgTime" fill="var(--color-primary)" name="Avg Time" />
              <Bar dataKey="optimalTime" fill="var(--color-success)" name="Optimal Time" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default PerformanceAnalytics;