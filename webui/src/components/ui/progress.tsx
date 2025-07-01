import React from 'react';

interface ProgressProps {
  value?: number;
  className?: string;
}

export function Progress({ value = 0, className = '' }: ProgressProps) {
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2.5 ${className}`}>
      <div 
        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
} 