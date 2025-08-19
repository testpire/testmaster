import React from 'react';

export function TestPireLogo({ size = 'medium', showText = true, className = '' }) {
  const sizes = {
    small: { 
      container: 'w-8 h-8', 
      text: 'text-lg',
      icon: 'w-6 h-6'
    },
    medium: { 
      container: 'w-12 h-12', 
      text: 'text-xl',
      icon: 'w-8 h-8'
    },
    large: { 
      container: 'w-20 h-20', 
      text: 'text-3xl',
      icon: 'w-14 h-14'
    }
  };

  const currentSize = sizes?.[size];

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Logo Icon */}
      <div className={`${currentSize?.container} bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg`}>
        <div className={`${currentSize?.icon} text-white relative`}>
          {/* Test/Quiz Icon */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-full h-full"
          >
            {/* Document/Paper */}
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
            
            {/* Quiz Lines */}
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="17" x2="12" y2="17" />
            
            {/* Checkmark */}
            <polyline points="9,9 10,10 13,7" />
          </svg>
          
          {/* Small star accent */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
            <svg className="w-2 h-2 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        </div>
      </div>
      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col">
          <h1 className={`${currentSize?.text} font-bold text-gray-900 leading-tight`}>
            Test
            <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Pire
            </span>
          </h1>
          {size === 'large' && (
            <p className="text-sm text-gray-600 font-medium -mt-1">
              Excellence in Testing
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Favicon component for use in HTML head
export function TestPireFavicon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <rect width="32" height="32" rx="6" fill="url(#gradient)" />
      
      {/* Test paper icon */}
      <path
        d="M8 6a2 2 0 0 1 2-2h8l4 4v16a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V6z"
        fill="white"
        fillOpacity="0.9"
      />
      
      {/* Quiz lines */}
      <rect x="11" y="12" width="6" height="1" fill="#1e40af" />
      <rect x="11" y="15" width="4" height="1" fill="#1e40af" />
      
      {/* Checkmark */}
      <path
        d="M11 9l1 1 2-2"
        stroke="#10b981"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Star accent */}
      <circle cx="22" cy="10" r="3" fill="#fbbf24" />
      <path
        d="M22 8l.5 1.5L24 10l-1.5.5L22 12l-.5-1.5L20 10l1.5-.5L22 8z"
        fill="#f59e0b"
      />
      
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default TestPireLogo;