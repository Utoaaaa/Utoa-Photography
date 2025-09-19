'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export function LoadingSpinner({ size = 'md', message }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  };
  
  const borderClasses = {
    sm: 'border-2',
    md: 'border-2',
    lg: 'border-4'
  };
  
  return (
    <div className="flex flex-col items-center justify-center" data-testid="loading-spinner">
      <div
        className={`${sizeClasses[size]} ${borderClasses[size]} border-gray-300 border-t-gray-900 rounded-full animate-spin`}
        aria-hidden="true"
      />
      
      {message && (
        <p className="mt-3 text-sm text-gray-600" aria-live="polite">
          {message}
        </p>
      )}
      
      <span className="sr-only">Loading...</span>
    </div>
  );
}