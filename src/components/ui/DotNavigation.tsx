'use client';

interface DotNavigationProps {
  totalPhotos: number;
  activeIndex: number;
  onDotClick: (index: number) => void;
  collectionTitle: string;
  // T027: Support for single-screen mode styling
  singleScreen?: boolean;
}

export function DotNavigation({ 
  totalPhotos, 
  activeIndex, 
  onDotClick, 
  collectionTitle,
  singleScreen = false 
}: DotNavigationProps) {
  // T027: Handle large number of photos with scrollable container and grouping
  const maxVisibleDots = 40;
  const shouldGroup = totalPhotos > maxVisibleDots;
  const groupSize = shouldGroup ? Math.ceil(totalPhotos / 10) : 1;
  
  // Calculate which dots to show when grouping
  const visibleDots = shouldGroup 
    ? Array.from({ length: Math.ceil(totalPhotos / groupSize) }, (_, i) => i * groupSize)
    : Array.from({ length: totalPhotos }, (_, i) => i);

  const activeGroupIndex = shouldGroup 
    ? Math.floor(activeIndex / groupSize) * groupSize 
    : activeIndex;

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, dotIndex: number) {
    const currentVisibleIdx = visibleDots.indexOf(dotIndex);
    let nextVisibleIdx = currentVisibleIdx;
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        nextVisibleIdx = Math.max(0, currentVisibleIdx - 1);
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        nextVisibleIdx = Math.min(visibleDots.length - 1, currentVisibleIdx + 1);
        break;
      case 'Home':
        e.preventDefault();
        nextVisibleIdx = 0;
        break;
      case 'End':
        e.preventDefault();
        nextVisibleIdx = visibleDots.length - 1;
        break;
      default:
        return;
    }
    const nextIndex = visibleDots[nextVisibleIdx];
    onDotClick(nextIndex);
  }

  return (
    <nav 
      className={`fixed right-6 top-1/2 transform -translate-y-1/2 z-50 ${
        singleScreen ? 'text-white' : ''
      }`}
      aria-label={`${collectionTitle} photo navigation`}
      data-testid="dot-navigation"
    >
      <div
        role="radiogroup"
        aria-orientation="vertical"
        className={`flex flex-col space-y-2 ${
          shouldGroup ? 'max-h-96 overflow-y-auto scrollbar-thin' : ''
        }`}
      >
        {visibleDots.map((dotIndex) => {
          const isActive = shouldGroup 
            ? activeGroupIndex === dotIndex 
            : activeIndex === dotIndex;
          
          const displayNumber = dotIndex + 1;
          const endNumber = shouldGroup 
            ? Math.min(dotIndex + groupSize, totalPhotos)
            : displayNumber;
          
          return (
            <button
              key={dotIndex}
              onClick={() => onDotClick(dotIndex)}
              onKeyDown={(e) => handleKeyDown(e, dotIndex)}
              className={`relative transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                singleScreen 
                  ? 'focus:ring-white focus:ring-offset-black' 
                  : 'focus:ring-gray-400 focus:ring-offset-white'
              } ${
                shouldGroup 
                  ? 'w-6 h-6 text-xs font-medium rounded border-2' 
                  : 'w-3 h-3 rounded-full border-2'
              } ${
                isActive
                  ? singleScreen
                    ? shouldGroup 
                      ? 'bg-white text-black border-white scale-110'
                      : 'bg-white border-white scale-125'
                    : shouldGroup
                      ? 'bg-gray-900 text-white border-gray-900 scale-110'
                      : 'bg-gray-900 border-gray-900 scale-125'
                  : singleScreen
                    ? shouldGroup
                      ? 'bg-transparent text-white border-white hover:bg-white hover:text-black'
                      : 'bg-transparent border-white hover:bg-white'
                    : shouldGroup
                      ? 'bg-white text-gray-900 border-gray-400 hover:border-gray-600 hover:bg-gray-100'
                      : 'bg-white border-gray-400 hover:border-gray-600 hover:bg-gray-100'
              }`}
              aria-label={shouldGroup 
                ? `Go to photos ${displayNumber} to ${endNumber} of ${totalPhotos}`
                : `Go to photo ${displayNumber} of ${totalPhotos}`
              }
              role="radio"
              aria-checked={isActive}
              data-testid="dot-button"
              tabIndex={isActive ? 0 : -1}
            >
              {shouldGroup && (
                <span className="leading-none">
                  {groupSize === 1 ? displayNumber : `${displayNumber}`}
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Progress indicator with enhanced ARIA support */}
      <div 
        className={`mt-4 text-xs text-center min-w-max ${
          singleScreen ? 'text-white' : 'text-gray-500'
        }`}
        role="status"
        aria-live="polite"
        aria-label={`Currently viewing photo ${activeIndex + 1} of ${totalPhotos}`}
      >
        {activeIndex + 1} / {totalPhotos}
        {shouldGroup && (
          <div className="text-xs opacity-75 mt-1">
            {Math.ceil(totalPhotos / maxVisibleDots) > 1 && 'Grouped view'}
          </div>
        )}
      </div>
    </nav>
  );
}