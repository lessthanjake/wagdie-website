'use client';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading map...' }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center h-screen bg-abyss">
      <div className="text-center">
        {/* Enhanced WAGDIE Loading Animation */}
        <div className="mb-6 relative">
          <div className="inline-block animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-gold border-r-2 border-l-2"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-ember rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Loading Message */}
        <div className="font-wagdie text-gold text-2xl mb-2 tracking-wide">{message}</div>
        <div className="font-wagdie text-mist text-sm mb-3">Initializing WAGDIE World...</div>

        {/* Progress Bar */}
        <div className="w-64 h-2 bg-midnight rounded-full mx-auto overflow-hidden border border-gold/30">
          <div className="h-full bg-gradient-to-r from-gold via-ember to-gold animate-pulse"></div>
        </div>

        {/* Loading Dots */}
        <div className="flex justify-center gap-1 mt-4">
          <div className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
