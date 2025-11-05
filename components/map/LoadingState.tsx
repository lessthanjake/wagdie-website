'use client';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading map...' }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center h-screen bg-abyss">
      <div className="text-center">
        <div className="mb-4">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gold"></div>
        </div>
        <div className="font-wagdie text-bone text-xl">{message}</div>
        <div className="font-wagdie text-mist text-sm mt-2">Initializing WAGDIE World...</div>
      </div>
    </div>
  );
}
