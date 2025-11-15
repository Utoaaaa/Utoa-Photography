'use client';

interface BackToTopButtonProps {
  label?: string;
}

export function BackToTopButton({ label = 'Back to Top' }: BackToTopButtonProps) {
  const handleClick = () => {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  return (
    <button
      type="button"
      data-testid="back-to-top"
      onClick={handleClick}
      className="inline-flex items-center rounded-full border border-gray-300 bg-white/80 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm backdrop-blur transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400"
      aria-label={label}
    >
      {label}
    </button>
  );
}
