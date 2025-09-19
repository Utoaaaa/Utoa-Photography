'use client';

interface DotNavigationProps {
  totalPhotos: number;
  activeIndex: number;
  onDotClick: (index: number) => void;
  collectionTitle: string;
}

export function DotNavigation({ 
  totalPhotos, 
  activeIndex, 
  onDotClick, 
  collectionTitle 
}: DotNavigationProps) {
  return (
    <nav 
      className="fixed right-6 top-1/2 transform -translate-y-1/2 z-50"
      aria-label={`${collectionTitle} photo navigation`}
      data-testid="dot-navigation"
    >
      <div className="flex flex-col space-y-2">
        {Array.from({ length: totalPhotos }, (_, index) => (
          <button
            key={index}
            onClick={() => onDotClick(index)}
            className={`w-3 h-3 rounded-full border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 ${
              index === activeIndex
                ? 'bg-gray-900 border-gray-900 scale-125'
                : 'bg-white border-gray-400 hover:border-gray-600 hover:bg-gray-100'
            }`}
            aria-label={`Go to photo ${index + 1} of ${totalPhotos}`}
            aria-current={index === activeIndex ? 'true' : 'false'}
            data-testid="dot-button"
          />
        ))}
      </div>
      
      {/* Progress indicator */}
      <div className="mt-4 text-xs text-gray-500 text-center min-w-max">
        {activeIndex + 1} / {totalPhotos}
      </div>
    </nav>
  );
}