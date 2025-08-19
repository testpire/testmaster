import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const CourseCard = ({ 
  course, 
  onEdit, 
  onViewStudents, 
  onManageContent,
  onDelete 
}) => {
  const getSubjectIcon = (subject) => {
    const iconMap = {
      'Physics': 'Atom',
      'Chemistry': 'FlaskConical',
      'Mathematics': 'Calculator',
      'Biology': 'Microscope',
      'English': 'BookOpen',
      'Hindi': 'Languages'
    };
    return iconMap?.[subject] || 'Book';
  };

  const getDifficultyColor = (level) => {
    const colorMap = {
      'Easy': 'text-success bg-success/10',
      'Moderate': 'text-warning bg-warning/10',
      'Tough': 'text-error bg-error/10'
    };
    return colorMap?.[level] || 'text-muted-foreground bg-muted';
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-2">{course?.name}</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {course?.subjects?.map((subject, index) => (
              <div key={index} className="flex items-center space-x-1 bg-muted px-2 py-1 rounded-md">
                <Icon name={getSubjectIcon(subject)} size={14} className="text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{subject}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
            <div className="flex items-center space-x-1">
              <Icon name="Users" size={14} />
              <span>{course?.enrolledStudents} students</span>
            </div>
            <div className="flex items-center space-x-1">
              <Icon name="UserCheck" size={14} />
              <span>{course?.assignedTeachers} teachers</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(course?.difficultyLevel)}`}>
              {course?.difficultyLevel}
            </span>
            <span className="text-xs text-muted-foreground">
              Created: {new Date(course.createdAt)?.toLocaleDateString('en-IN')}
            </span>
          </div>
        </div>
        <div className="flex flex-col space-y-1 ml-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(course)}
            className="h-8 w-8"
          >
            <Icon name="Edit2" size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(course)}
            className="h-8 w-8 text-error hover:text-error"
          >
            <Icon name="Trash2" size={14} />
          </Button>
        </div>
      </div>
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewStudents(course)}
          className="flex-1"
        >
          <Icon name="Users" size={14} />
          <span className="ml-1">View Students</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onManageContent(course)}
          className="flex-1"
        >
          <Icon name="BookOpen" size={14} />
          <span className="ml-1">Manage Content</span>
        </Button>
      </div>
    </div>
  );
};

export default CourseCard;