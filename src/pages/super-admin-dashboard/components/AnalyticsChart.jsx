import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const AnalyticsChart = () => {
  const [activeChart, setActiveChart] = useState('engagement');

  const engagementData = [
    { name: 'Mon', students: 245, teachers: 12, tests: 8 },
    { name: 'Tue', students: 289, teachers: 15, tests: 12 },
    { name: 'Wed', students: 312, teachers: 18, tests: 15 },
    { name: 'Thu', students: 298, teachers: 14, tests: 11 },
    { name: 'Fri', students: 334, teachers: 20, tests: 18 },
    { name: 'Sat', students: 278, teachers: 16, tests: 14 },
    { name: 'Sun', students: 198, teachers: 8, tests: 6 }
  ];

  const performanceData = [
    { name: 'Jan', completion: 78, average: 72 },
    { name: 'Feb', completion: 82, average: 75 },
    { name: 'Mar', completion: 85, average: 78 },
    { name: 'Apr', completion: 88, average: 81 },
    { name: 'May', completion: 92, average: 84 },
    { name: 'Jun', completion: 89, average: 82 },
    { name: 'Jul', completion: 94, average: 87 }
  ];

  const subjectData = [
    { name: 'Mathematics', value: 35, color: '#2563EB' },
    { name: 'Physics', value: 28, color: '#7C3AED' },
    { name: 'Chemistry', value: 22, color: '#059669' },
    { name: 'Biology', value: 15, color: '#F59E0B' }
  ];

  const chartOptions = [
    { id: 'engagement', label: 'User Engagement', icon: 'Users' },
    { id: 'performance', label: 'Test Performance', icon: 'TrendingUp' },
    { id: 'subjects', label: 'Subject Distribution', icon: 'PieChart' }
  ];

  const renderChart = () => {
    switch (activeChart) {
      case 'engagement':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis dataKey="name" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--color-card)', 
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="students" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="teachers" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="tests" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'performance':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis dataKey="name" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--color-card)', 
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="completion" 
                stroke="var(--color-primary)" 
                strokeWidth={3}
                dot={{ fill: 'var(--color-primary)', strokeWidth: 2, r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="average" 
                stroke="var(--color-secondary)" 
                strokeWidth={3}
                dot={{ fill: 'var(--color-secondary)', strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'subjects':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={subjectData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}%`}
              >
                {subjectData?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry?.color} />
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
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Platform Analytics</h3>
          <Button variant="outline" size="sm">
            <Icon name="Download" size={16} />
            Export
          </Button>
        </div>
        
        <div className="flex space-x-2">
          {chartOptions?.map((option) => (
            <Button
              key={option?.id}
              variant={activeChart === option?.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveChart(option?.id)}
              className="flex items-center space-x-2"
            >
              <Icon name={option?.icon} size={16} />
              <span className="hidden sm:inline">{option?.label}</span>
            </Button>
          ))}
        </div>
      </div>
      <div className="p-6">
        {renderChart()}
        
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {activeChart === 'engagement' && (
            <>
              <div className="text-center">
                <div className="w-4 h-4 bg-primary rounded mx-auto mb-2"></div>
                <p className="text-sm font-medium text-foreground">Students</p>
                <p className="text-xs text-muted-foreground">Daily Active Users</p>
              </div>
              <div className="text-center">
                <div className="w-4 h-4 bg-secondary rounded mx-auto mb-2"></div>
                <p className="text-sm font-medium text-foreground">Teachers</p>
                <p className="text-xs text-muted-foreground">Active Instructors</p>
              </div>
              <div className="text-center">
                <div className="w-4 h-4 bg-accent rounded mx-auto mb-2"></div>
                <p className="text-sm font-medium text-foreground">Tests</p>
                <p className="text-xs text-muted-foreground">Tests Conducted</p>
              </div>
            </>
          )}
          
          {activeChart === 'performance' && (
            <>
              <div className="text-center">
                <div className="w-4 h-4 bg-primary rounded mx-auto mb-2"></div>
                <p className="text-sm font-medium text-foreground">Completion Rate</p>
                <p className="text-xs text-muted-foreground">Test Completion %</p>
              </div>
              <div className="text-center">
                <div className="w-4 h-4 bg-secondary rounded mx-auto mb-2"></div>
                <p className="text-sm font-medium text-foreground">Average Score</p>
                <p className="text-xs text-muted-foreground">Student Performance</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">94%</p>
                <p className="text-xs text-muted-foreground">Current Month</p>
              </div>
            </>
          )}
          
          {activeChart === 'subjects' && (
            <>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Mathematics</p>
                <p className="text-xs text-muted-foreground">Most Popular</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">4 Subjects</p>
                <p className="text-xs text-muted-foreground">Total Active</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">1,245</p>
                <p className="text-xs text-muted-foreground">Total Tests</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsChart;