'use client';

/* eslint-disable @next/next/no-img-element */

import type { MapLocationData } from '@/game/EventBus';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { isNonEmptyString } from './utils';

interface LocationDetailsCardProps {
  location: MapLocationData;
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!isNonEmptyString(value)) return null;

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-neutral-500 font-eskapade tracking-widest">{label}</span>
      <span className="text-xs text-neutral-300 font-eskapade tracking-widest text-right">
        {value}
      </span>
    </div>
  );
}

export function LocationDetailsCard({ location }: LocationDetailsCardProps) {
  const imageUrl = isNonEmptyString(location.image_url) ? location.image_url.trim() : null;
  const description = isNonEmptyString(location.description) ? location.description.trim() : null;
  const lore = isNonEmptyString(location.lore) ? location.lore.trim() : null;
  const properties = location.metadata?.properties;
  const specialProperties = location.metadata?.special_properties?.filter(isNonEmptyString) ?? [];
  const hasDetails = Boolean(
    imageUrl ||
    description ||
    lore ||
    isNonEmptyString(properties?.region) ||
    isNonEmptyString(properties?.terrain) ||
    isNonEmptyString(properties?.difficulty) ||
    specialProperties.length > 0
  );

  if (!hasDetails) return null;

  return (
    <Card className="bg-black/40 border border-neutral-800 overflow-hidden">
      {imageUrl && (
        <div className="aspect-[16/9] bg-neutral-950 border-b border-neutral-800 overflow-hidden">
          <img
            src={imageUrl}
            alt={`${location.name} image`}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-eskapade tracking-widest text-soul-accent">
          Location Details
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {description && (
          <p className="text-sm text-neutral-300 font-eskapade leading-relaxed">
            {description}
          </p>
        )}

        {lore && (
          <div className="rounded-lg border border-neutral-800/80 bg-neutral-950/40 p-3">
            <div className="text-xs text-neutral-500 font-eskapade tracking-widest mb-1">LORE</div>
            <p className="text-sm text-neutral-300 font-eskapade leading-relaxed whitespace-pre-line">
              {lore}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2">
          <DetailRow label="REGION" value={properties?.region} />
          <DetailRow label="TERRAIN" value={properties?.terrain} />
          <DetailRow label="DIFFICULTY" value={properties?.difficulty} />
        </div>

        {specialProperties.length > 0 && (
          <div className="pt-2 border-t border-neutral-800">
            <div className="text-xs text-neutral-500 font-eskapade tracking-widest mb-2">
              SPECIAL PROPERTIES
            </div>
            <div className="flex flex-wrap gap-2">
              {specialProperties.map((property) => (
                <Badge key={property} variant="outline" className="text-xs">
                  {property}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
