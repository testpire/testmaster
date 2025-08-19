import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const AIRecommendations = ({ onStartPractice = () => {} }) => {
  const recommendations = [
    {
      id: 1,
      type: "weak_area",
      title: "Strengthen Organic Chemistry",
      description: "Based on your recent performance, focus on reaction mechanisms and stereochemistry concepts.",
      subject: "Chemistry",
      priority: "high",
      estimatedTime: 45,
      questions: 25,
      topics: ["Reaction Mechanisms", "Stereochemistry", "Named Reactions"],
      confidence: 92
    },
    {
      id: 2,
      type: "chapter_practice",
      title: "Calculus Integration Practice",
      description: "Your integration speed needs improvement. Practice with definite and indefinite integrals.",
      subject: "Mathematics",
      priority: "medium",
      estimatedTime: 60,
      questions: 30,
      topics: ["Definite Integrals", "Integration by Parts", "Substitution Method"],
      confidence: 87
    },
    {
      id: 3,
      type: "speed_improvement",
      title: "Physics Problem Solving Speed",
      description: "You\'re accurate but slow in mechanics problems. Practice time-bound questions.",
      subject: "Physics",
      priority: "medium",
      estimatedTime: 30,
      questions: 20,
      topics: ["Kinematics", "Dynamics", "Work-Energy Theorem"],
      confidence: 89
    },
    {
      id: 4,
      type: "revision",
      title: "Biology Genetics Revision",
      description: "Excellent performance! Quick revision to maintain your strong foundation.",
      subject: "Biology",
      priority: "low",
      estimatedTime: 20,
      questions: 15,
      topics: ["Mendelian Genetics", "Molecular Genetics", "Population Genetics"],
      confidence: 95
    }
  ];

  const getTypeIcon = (type) => {
    switch (type) {
      case 'weak_area': return 'Target';
      case 'chapter_practice': return 'BookOpen';
      case 'speed_improvement': return 'Zap';
      case 'revision': return 'RefreshCw';
      default: return 'Brain';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'weak_area': return 'text-error bg-error/10 border-error/20';
      case 'chapter_practice': return 'text-primary bg-primary/10 border-primary/20';
      case 'speed_improvement': return 'text-warning bg-warning/10 border-warning/20';
      case 'revision': return 'text-success bg-success/10 border-success/20';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      high: 'bg-error text-error-foreground',
      medium: 'bg-warning text-warning-foreground',
      low: 'bg-success text-success-foreground'
    };
    return colors?.[priority] || 'bg-muted text-muted-foreground';
  };

  const getSubjectIcon = (subject) => {
    switch (subject) {
      case 'Physics': return 'Zap';
      case 'Chemistry': return 'Flask';
      case 'Mathematics': return 'Calculator';
      case 'Biology': return 'Leaf';
      default: return 'BookOpen';
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
            <Icon name="Brain" size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground">AI Recommendations</h3>
            <p className="text-sm text-muted-foreground">Personalized study suggestions based on your performance</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">Accuracy: 92%</p>
          <p className="text-xs text-muted-foreground">AI Confidence</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {recommendations?.map((rec) => (
          <div 
            key={rec?.id} 
            className={`border rounded-lg p-4 ${getTypeColor(rec?.type)} hover:shadow-md transition-all duration-200`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Icon name={getTypeIcon(rec?.type)} size={20} />
                <div>
                  <h4 className="font-semibold text-foreground">{rec?.title}</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <Icon name={getSubjectIcon(rec?.subject)} size={14} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{rec?.subject}</span>
                  </div>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(rec?.priority)}`}>
                {rec?.priority}
              </span>
            </div>

            <p className="text-sm text-muted-foreground mb-4">{rec?.description}</p>

            <div className="grid grid-cols-2 gap-4 mb-4 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Icon name="Clock" size={12} />
                <span>{rec?.estimatedTime} min</span>
              </div>
              <div className="flex items-center space-x-1">
                <Icon name="HelpCircle" size={12} />
                <span>{rec?.questions} questions</span>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Focus Topics:</p>
              <div className="flex flex-wrap gap-1">
                {rec?.topics?.map((topic, index) => (
                  <span 
                    key={index} 
                    className="px-2 py-1 bg-muted text-xs rounded-full text-muted-foreground"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-muted rounded-full h-1">
                  <div 
                    className="bg-primary h-1 rounded-full"
                    style={{ width: `${rec?.confidence}%` }}
                  ></div>
                </div>
                <span className="text-xs text-muted-foreground">{rec?.confidence}% match</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStartPractice(rec?.id)}
                iconName="Play"
                iconPosition="left"
              >
                Start Practice
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIRecommendations;