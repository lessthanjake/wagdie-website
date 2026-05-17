import { useEffect, useState } from 'react';
import type { OwnedSearableConcord } from '@/hooks/useSearingConcords';
import { Badge } from '@/components/ui/Badge';

interface SearingPreviewProps {
  wagdieId: number;
  wagdieName: string;
  concord: OwnedSearableConcord | null;
}

type PreviewStatus = 'idle' | 'loading' | 'ready' | 'error';

export function SearingPreview({ wagdieId, wagdieName, concord }: SearingPreviewProps) {
  const previewUrl = concord
    ? `/api/characters/${wagdieId}/searing/preview?concordId=${concord.concordId}`
    : null;

  // Re-fetch the composed image whenever the (character, concord) pair changes.
  const [status, setStatus] = useState<PreviewStatus>('idle');
  useEffect(() => {
    setStatus(previewUrl ? 'loading' : 'idle');
  }, [previewUrl]);

  return (
    <div className="rounded-lg border border-neutral-700 bg-white/5 p-4">
      <p className="text-sm text-neutral-400 font-eskapade">Searing Preview</p>
      <p className="text-lg font-eskapade text-neutral-200">
        {wagdieName} #{wagdieId}
      </p>

      {!concord && (
        <p className="mt-3 text-sm text-neutral-500 font-eskapade">
          Select one of your searable Concords to preview the transformation.
        </p>
      )}

      {concord && previewUrl && (
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative h-48 w-48 shrink-0 overflow-hidden rounded-lg border border-neutral-700 bg-black/40">
            {status === 'loading' && (
              <div className="absolute inset-0 animate-pulse bg-neutral-800/60" aria-hidden="true" />
            )}
            {status !== 'error' ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={previewUrl}
                src={previewUrl}
                alt={`${wagdieName} with ${concord.newTrait || concord.name} applied`}
                className={`h-full w-full object-cover [image-rendering:pixelated] transition-opacity duration-300 ${status === 'ready' ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setStatus('ready')}
                onError={() => setStatus('error')}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={concord.imageUrl}
                  alt={concord.name}
                  className="h-16 w-16 object-cover [image-rendering:pixelated] opacity-70"
                />
                <p className="text-xs text-neutral-400 font-eskapade leading-tight">
                  Preview unavailable. The sear will still apply.
                </p>
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-2">
            <div>
              <p className="truncate text-base text-neutral-100 font-eskapade" title={concord.name}>
                {concord.name}
              </p>
              <p className="text-xs text-neutral-500 font-eskapade">Concord #{concord.concordId}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {concord.location && <Badge variant="outline">{concord.location}</Badge>}
              {concord.newTrait && <Badge variant="accent">{concord.newTrait}</Badge>}
              {concord.makesBald && <Badge variant="default">balding</Badge>}
            </div>
            <p className="text-xs text-neutral-400 font-eskapade">
              This Concord will be burned and its searing trait will be materialized off-chain after the transaction confirms.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
