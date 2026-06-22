import React from 'react';

export function TestPireLogo({ size = 'medium', showText = true, className = '' }) {
  const sizes = {
    small: {
      container: 'w-8 h-8 rounded-lg',
      text: 'text-lg',
      icon: 'w-[18px] h-[18px]',
      star: 'w-3 h-3 -top-0.5 -right-0.5',
    },
    medium: {
      container: 'w-11 h-11 rounded-xl',
      text: 'text-xl',
      icon: 'w-6 h-6',
      star: 'w-3.5 h-3.5 -top-1 -right-1',
    },
    large: {
      container: 'w-16 h-16 rounded-2xl',
      text: 'text-3xl',
      icon: 'w-9 h-9',
      star: 'w-5 h-5 -top-1 -right-1',
    },
  };

  const currentSize = sizes?.[size] || sizes.medium;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo mark — evergreen tile, paper-colored glyph, honey seal */}
      <div className={`${currentSize.container} bg-primary flex items-center justify-center shadow-md relative`}>
        <div className={`${currentSize.icon} text-primary-foreground relative`}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-full h-full"
          >
            {/* Document / paper */}
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
            {/* Quiz lines */}
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="17" x2="12" y2="17" />
            {/* Checkmark */}
            <polyline points="9,9 10,10 13,7" />
          </svg>
        </div>
        {/* Honey seal */}
        <span className={`${currentSize.star} absolute bg-accent rounded-full flex items-center justify-center ring-2 ring-card`}>
          <svg className="w-2/3 h-2/3 text-accent-foreground" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </span>
      </div>

      {/* Wordmark — Inter display */}
      {showText && (
        <div className="flex flex-col">
          <h1 className={`font-display ${currentSize.text} font-semibold text-foreground leading-none tracking-tight`}>
            Learn<span className="text-primary">X</span>
          </h1>
          {size === 'large' && (
            <p className="text-sm text-muted-foreground font-medium mt-1">
              Excellence in learning
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
      <rect width="32" height="32" rx="8" fill="url(#gradient)" />

      {/* Test paper icon */}
      <path
        d="M8 6a2 2 0 0 1 2-2h8l4 4v16a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V6z"
        fill="#FBF8F2"
        fillOpacity="0.95"
      />

      {/* Quiz lines */}
      <rect x="11" y="12" width="6" height="1.2" rx="0.6" fill="#1F5C46" />
      <rect x="11" y="15" width="4" height="1.2" rx="0.6" fill="#1F5C46" />

      {/* Checkmark */}
      <path
        d="M11 9l1 1 2-2"
        stroke="#2F7A57"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Honey seal */}
      <circle cx="23" cy="9" r="3.2" fill="#E8A33D" />

      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#256E54" />
          <stop offset="100%" stopColor="#1A4F3C" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default TestPireLogo;
