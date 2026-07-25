import React, { useEffect } from 'react';

const AlertTriangleIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const CheckCircleIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const XIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/**
 * Toast component popping in from the right side.
 */
const Toast = ({ title, message, type = 'warning', onClose, duration = 6000 }) => {
  useEffect(() => {
    if (!duration) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const isWarning = type === 'warning' || type === 'error';

  return (
    <div
      className="fixed top-5 right-5 z-50 max-w-md w-full bg-white border border-amber-200 rounded-xl shadow-2xl p-4 transition-all duration-300 transform translate-x-0 animate-slide-in-right"
      style={{
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        animation: 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
      `}</style>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg flex-shrink-0 ${isWarning ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
          {isWarning ? <AlertTriangleIcon className="w-5 h-5" /> : <CheckCircleIcon className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-bold ${isWarning ? 'text-amber-900' : 'text-emerald-900'}`}>
            {title || (isWarning ? 'Duplicate Complaint Warning' : 'Success')}
          </h4>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed break-words">
            {message}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors flex-shrink-0"
          aria-label="Close notification"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
