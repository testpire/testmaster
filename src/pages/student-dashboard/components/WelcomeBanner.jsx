import React from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const WelcomeBanner = ({ 
  studentName = "Arjun Sharma",
  studentPhoto = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  upcomingTests = 3,
  completionRate = 78,
  currentRank = 12,
  totalStudents = 150
}) => {
  const getGreeting = () => {
    const hour = new Date()?.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="bg-gradient-to-r from-primary to-secondary rounded-xl p-6 text-white mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Image
              src={studentPhoto}
              alt={studentName}
              className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center">
              <Icon name="CheckCircle" size={14} className="text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{getGreeting()}, {studentName}!</h1>
            <p className="text-white/80">Ready to ace your next test?</p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center space-x-6">
          <div className="text-center">
            <div className="text-2xl font-bold">{upcomingTests}</div>
            <div className="text-sm text-white/80">Upcoming Tests</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{completionRate}%</div>
            <div className="text-sm text-white/80">Completion Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">#{currentRank}</div>
            <div className="text-sm text-white/80">Rank of {totalStudents}</div>
          </div>
        </div>
      </div>
      
      {/* Mobile Stats */}
      <div className="md:hidden mt-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-xl font-bold">{upcomingTests}</div>
          <div className="text-xs text-white/80">Tests</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold">{completionRate}%</div>
          <div className="text-xs text-white/80">Complete</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold">#{currentRank}</div>
          <div className="text-xs text-white/80">Rank</div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeBanner;