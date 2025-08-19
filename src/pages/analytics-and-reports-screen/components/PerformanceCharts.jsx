import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

import Button from '../../../components/ui/Button';

const PerformanceCharts = ({ chartData, selectedFilters }) => {
  const [activeChart, setActiveChart] = useState('subject-performance');

  const chartTypes = [
    { id: 'subject-performance', label: 'Subject Performance', icon: 'BarChart3' },
    { id: 'accuracy-trends', label: 'Accuracy Trends', icon: 'TrendingUp' },
    { id: 'difficulty-analysis', label: 'Difficulty Analysis', icon: 'Target' },
    { id: 'time-analysis', label: 'Time Analysis', icon: 'Clock' }
  ];

  const COLORS = ['#2563EB', '#7C3AED', '#059669', '#F59E0B', '#EF4444', '#8B5CF6'];

  const subjectPerformanceData = [
    { subject: 'Physics', averageScore: 78, totalTests: 45, students: 120 },
    { subject: 'Chemistry', averageScore: 82, totalTests: 38, students: 115 },
    { subject: 'Mathematics', averageScore: 75, totalTests: 52, students: 125 },
    { subject: 'Biology', averageScore: 85, totalTests: 41, students: 98 }
  ];

  const accuracyTrendsData = [
    { month: 'Jan', physics: 72, chemistry: 78, mathematics: 70, biology: 80 },
    { month: 'Feb', physics: 75, chemistry: 80, mathematics: 73, biology: 82 },
    { month: 'Mar', physics: 78, chemistry: 82, mathematics: 75, biology: 85 },
    { month: 'Apr', physics: 76, chemistry: 81, mathematics: 74, biology: 83 },
    { month: 'May', physics: 79, chemistry: 84, mathematics: 77, biology: 86 },
    { month: 'Jun', physics: 81, chemistry: 85, mathematics: 79, biology: 88 }
  ];

  const difficultyAnalysisData = [
    { name: 'Easy', value: 45, accuracy: 92 },
    { name: 'Moderate', value: 35, accuracy: 78 },
    { name: 'Tough', value: 20, accuracy: 58 }
  ];

  const timeAnalysisData = [
    { topic: 'Mechanics', avgTime: 2.5, accuracy: 78, questions: 150 },
    { topic: 'Thermodynamics', avgTime: 3.2, accuracy: 72, questions: 120 },
    { topic: 'Optics', avgTime: 2.8, accuracy: 80, questions: 95 },
    { topic: 'Electromagnetism', avgTime: 3.5, accuracy: 68, questions: 110 },
    { topic: 'Modern Physics', avgTime: 4.1, accuracy: 65, questions: 85 }
  ];

  const renderChart = () => {
    switch (activeChart) {
      case 'subject-performance':
        return (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                <XAxis dataKey="subject" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--color-card)', 
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Bar dataKey="averageScore" fill="#2563EB" name="Average Score (%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalTests" fill="#7C3AED" name="Total Tests" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case 'accuracy-trends':
        return (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={accuracyTrendsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--color-card)', 
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Line type="monotone" dataKey="physics" stroke="#2563EB" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="chemistry" stroke="#059669" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="mathematics" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="biology" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );

      case 'difficulty-analysis':
        return (
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={difficultyAnalysisData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, accuracy }) => `${name}: ${value}% (${accuracy}% acc)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {difficultyAnalysisData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS?.[index % COLORS?.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--color-card)', 
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );

      case 'time-analysis':
        return (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeAnalysisData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                <XAxis dataKey="topic" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--color-card)', 
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px'
                  }} 
                />
                <Area type="monotone" dataKey="avgTime" stroke="#2563EB" fill="#2563EB" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Performance Analytics</h2>
        <div className="flex items-center space-x-2">
          {chartTypes?.map((chart) => (
            <Button
              key={chart?.id}
              variant={activeChart === chart?.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveChart(chart?.id)}
              iconName={chart?.icon}
              iconPosition="left"
            >
              <span className="hidden md:inline">{chart?.label}</span>
            </Button>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <h3 className="text-base font-medium text-foreground mb-2">
          {chartTypes?.find(c => c?.id === activeChart)?.label}
        </h3>
        <p className="text-sm text-muted-foreground">
          {activeChart === 'subject-performance' && 'Average performance across different subjects'}
          {activeChart === 'accuracy-trends' && 'Monthly accuracy trends by subject'}
          {activeChart === 'difficulty-analysis' && 'Question distribution by difficulty level'}
          {activeChart === 'time-analysis' && 'Average time spent per topic'}
        </p>
      </div>
      {renderChart()}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {activeChart === 'subject-performance' ? '80%' : 
               activeChart === 'accuracy-trends' ? '+5.2%' :
               activeChart === 'difficulty-analysis' ? '78%' : '3.2 min'}
            </div>
            <div className="text-muted-foreground">
              {activeChart === 'subject-performance' ? 'Overall Average' : 
               activeChart === 'accuracy-trends' ? 'Monthly Growth' :
               activeChart === 'difficulty-analysis' ? 'Avg Accuracy' : 'Avg Time/Question'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success">
              {activeChart === 'subject-performance' ? '176' : 
               activeChart === 'accuracy-trends' ? '6' :
               activeChart === 'difficulty-analysis' ? '100' : '560'}
            </div>
            <div className="text-muted-foreground">
              {activeChart === 'subject-performance' ? 'Total Tests' : 
               activeChart === 'accuracy-trends' ? 'Months Tracked' :
               activeChart === 'difficulty-analysis' ? 'Questions' : 'Total Questions'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">
              {activeChart === 'subject-performance' ? '458' : 
               activeChart === 'accuracy-trends' ? '12.5%' :
               activeChart === 'difficulty-analysis' ? '3' : '5'}
            </div>
            <div className="text-muted-foreground">
              {activeChart === 'subject-performance' ? 'Active Students' : 
               activeChart === 'accuracy-trends' ? 'Best Improvement' :
               activeChart === 'difficulty-analysis' ? 'Difficulty Levels' : 'Topics Analyzed'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceCharts;