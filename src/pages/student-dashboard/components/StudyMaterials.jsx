import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';

const StudyMaterials = ({ onViewMaterial = () => {} }) => {
  const [activeTab, setActiveTab] = useState('notes');

  const studyNotes = [
    {
      id: 1,
      title: "Organic Chemistry Reaction Mechanisms",
      subject: "Chemistry",
      teacher: "Dr. Priya Sharma",
      uploadDate: "2025-01-10",
      fileType: "PDF",
      fileSize: "2.4 MB",
      downloads: 156,
      rating: 4.8,
      thumbnail: "https://images.pexels.com/photos/207662/pexels-photo-207662.jpeg?w=300&h=200&fit=crop"
    },
    {
      id: 2,
      title: "Calculus Integration Formulas",
      subject: "Mathematics",
      teacher: "Prof. Rajesh Kumar",
      uploadDate: "2025-01-08",
      fileType: "PDF",
      fileSize: "1.8 MB",
      downloads: 203,
      rating: 4.9,
      thumbnail: "https://images.pixabay.com/photo/2016/11/30/20/58/programming-1873854_1280.jpg?w=300&h=200&fit=crop"
    },
    {
      id: 3,
      title: "Physics Mechanics Problem Solutions",
      subject: "Physics",
      teacher: "Dr. Amit Verma",
      uploadDate: "2025-01-05",
      fileType: "PDF",
      fileSize: "3.1 MB",
      downloads: 189,
      rating: 4.7,
      thumbnail: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=300&h=200&fit=crop"
    }
  ];

  const formulaSheets = [
    {
      id: 1,
      title: "JEE Physics Formula Sheet",
      subject: "Physics",
      topics: ["Mechanics", "Thermodynamics", "Optics"],
      lastUpdated: "2025-01-12",
      fileType: "PDF",
      downloads: 445
    },
    {
      id: 2,
      title: "NEET Chemistry Quick Reference",
      subject: "Chemistry",
      topics: ["Organic", "Inorganic", "Physical"],
      lastUpdated: "2025-01-10",
      fileType: "PDF",
      downloads: 378
    },
    {
      id: 3,
      title: "Mathematics Integration Table",
      subject: "Mathematics",
      topics: ["Definite Integrals", "Indefinite Integrals"],
      lastUpdated: "2025-01-08",
      fileType: "PDF",
      downloads: 267
    }
  ];

  const videoRecommendations = [
    {
      id: 1,
      title: "Organic Chemistry Mechanisms Explained",
      channel: "Physics Wallah",
      duration: "45:32",
      views: "2.3M",
      subject: "Chemistry",
      thumbnail: "https://images.pexels.com/photos/3862132/pexels-photo-3862132.jpeg?w=300&h=200&fit=crop",
      url: "https://youtube.com/watch?v=example1"
    },
    {
      id: 2,
      title: "Calculus Integration Tricks",
      channel: "Unacademy",
      duration: "38:15",
      views: "1.8M",
      subject: "Mathematics",
      thumbnail: "https://images.pixabay.com/photo/2016/11/19/14/00/code-1839406_1280.jpg?w=300&h=200&fit=crop",
      url: "https://youtube.com/watch?v=example2"
    },
    {
      id: 3,
      title: "Physics Mechanics Problem Solving",
      channel: "Vedantu",
      duration: "52:18",
      views: "1.5M",
      subject: "Physics",
      thumbnail: "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=300&h=200&fit=crop",
      url: "https://youtube.com/watch?v=example3"
    }
  ];

  const getSubjectIcon = (subject) => {
    switch (subject) {
      case 'Physics': return 'Zap';
      case 'Chemistry': return 'Flask';
      case 'Mathematics': return 'Calculator';
      case 'Biology': return 'Leaf';
      default: return 'BookOpen';
    }
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'PDF': return 'FileText';
      case 'DOC': return 'FileText';
      case 'PPT': return 'Presentation';
      default: return 'File';
    }
  };

  const tabs = [
    { id: 'notes', label: 'Study Notes', icon: 'BookOpen', count: studyNotes?.length },
    { id: 'formulas', label: 'Formula Sheets', icon: 'Calculator', count: formulaSheets?.length },
    { id: 'videos', label: 'Video Links', icon: 'Play', count: videoRecommendations?.length }
  ];

  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-foreground">Study Materials</h3>
        <Icon name="Library" size={20} className="text-primary" />
      </div>
      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-muted p-1 rounded-lg">
        {tabs?.map((tab) => (
          <button
            key={tab?.id}
            onClick={() => setActiveTab(tab?.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === tab?.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon name={tab?.icon} size={16} />
            <span>{tab?.label}</span>
            <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs">
              {tab?.count}
            </span>
          </button>
        ))}
      </div>
      {/* Study Notes Tab */}
      {activeTab === 'notes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {studyNotes?.map((note) => (
            <div key={note?.id} className="border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative">
                <Image
                  src={note?.thumbnail}
                  alt={note?.title}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute top-2 right-2 bg-card/90 backdrop-blur-sm px-2 py-1 rounded-full">
                  <div className="flex items-center space-x-1">
                    <Icon name="Star" size={12} className="text-warning fill-current" />
                    <span className="text-xs font-medium">{note?.rating}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Icon name={getSubjectIcon(note?.subject)} size={16} className="text-primary" />
                  <span className="text-xs text-muted-foreground">{note?.subject}</span>
                </div>
                
                <h4 className="font-semibold text-foreground mb-2 line-clamp-2">{note?.title}</h4>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span>By {note?.teacher}</span>
                  <span>{note?.uploadDate}</span>
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <div className="flex items-center space-x-1">
                    <Icon name={getFileIcon(note?.fileType)} size={12} />
                    <span>{note?.fileType} • {note?.fileSize}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Icon name="Download" size={12} />
                    <span>{note?.downloads}</span>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewMaterial(note?.id, 'note')}
                  iconName="Eye"
                  iconPosition="left"
                  fullWidth
                >
                  View Notes
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Formula Sheets Tab */}
      {activeTab === 'formulas' && (
        <div className="space-y-4">
          {formulaSheets?.map((sheet) => (
            <div key={sheet?.id} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Icon name={getSubjectIcon(sheet?.subject)} size={20} className="text-primary" />
                    <h4 className="font-semibold text-foreground">{sheet?.title}</h4>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {sheet?.topics?.map((topic, index) => (
                      <span key={index} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                        {topic}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Icon name="Calendar" size={12} />
                      <span>Updated {sheet?.lastUpdated}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Icon name="Download" size={12} />
                      <span>{sheet?.downloads} downloads</span>
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewMaterial(sheet?.id, 'formula')}
                  iconName="Download"
                  iconPosition="left"
                >
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Video Recommendations Tab */}
      {activeTab === 'videos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {videoRecommendations?.map((video) => (
            <div key={video?.id} className="border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative">
                <Image
                  src={video?.thumbnail}
                  alt={video?.title}
                  className="w-full h-40 object-cover"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <Icon name="Play" size={20} className="text-primary-foreground ml-1" />
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs">
                  {video?.duration}
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Icon name={getSubjectIcon(video?.subject)} size={16} className="text-primary" />
                  <span className="text-xs text-muted-foreground">{video?.subject}</span>
                </div>
                
                <h4 className="font-semibold text-foreground mb-2 line-clamp-2">{video?.title}</h4>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span>{video?.channel}</span>
                  <div className="flex items-center space-x-1">
                    <Icon name="Eye" size={12} />
                    <span>{video?.views} views</span>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(video?.url, '_blank')}
                  iconName="ExternalLink"
                  iconPosition="left"
                  fullWidth
                >
                  Watch Video
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudyMaterials;