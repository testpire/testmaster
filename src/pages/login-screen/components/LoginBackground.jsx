import React from 'react';

const LoginBackground = ({ children }) => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 overflow-hidden">
      {/* Optimized Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Reduced Floating Geometric Shapes for better performance */}
        <div className="absolute top-20 left-10 w-16 h-16 bg-blue-500/10 rounded-full animate-gentle-pulse"></div>
        <div className="absolute top-40 right-20 w-12 h-12 bg-indigo-500/10 rounded-lg rotate-45 animate-gentle-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-40 left-20 w-10 h-10 bg-emerald-500/10 rounded-full animate-gentle-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 right-40 w-20 h-20 bg-violet-500/10 rounded-lg rotate-12 animate-gentle-pulse" style={{ animationDelay: '0.5s' }}></div>
        
        {/* Optimized Grid Pattern - Reduced elements */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="grid grid-cols-6 gap-12 h-full">
            {Array.from({ length: 24 })?.map((_, i) => (
              <div key={i} className="border border-gray-400"></div>
            ))}
          </div>
        </div>

        {/* Optimized Gradient Orbs with better performance */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-blue-500/12 to-indigo-500/12 rounded-full blur-3xl animate-drift opacity-50"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gradient-to-r from-emerald-500/12 to-violet-500/12 rounded-full blur-3xl animate-drift opacity-50" style={{ animationDelay: '2s' }}></div>
      </div>
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      {/* Optimized Educational Icons Floating - Fixed animation classes */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-16 left-1/4 text-blue-500/20 animate-float">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
          </svg>
        </div>
        <div className="absolute top-32 right-1/3 text-indigo-500/20 animate-float" style={{ animationDelay: '2s' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
          </svg>
        </div>
        <div className="absolute bottom-32 left-1/3 text-emerald-500/20 animate-float" style={{ animationDelay: '4s' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5-1.5 1.5-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16 6.5 6.5 0 0 1 3 9.5 6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14 14 12 14 9.5 12 5 9.5 5z"/>
          </svg>
        </div>
      </div>
      {/* Subtle overlay for better readability */}
      <div className="absolute inset-0 bg-white/5 pointer-events-none"></div>
    </div>
  );
};

export default LoginBackground;