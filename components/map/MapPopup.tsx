'use client';

import type { Location, CharacterLocation } from '@/lib/types/map';

interface MapPopupProps {
  data: Location | CharacterLocation | null;
  type: 'location' | 'character' | 'burn' | 'death' | 'fight';
  onClose?: () => void;
}

export function MapPopup({ data, type, onClose }: MapPopupProps) {
  if (!data) return null;

  const isLocation = type === 'location';
  const isCharacter = type === 'character';

  let title = '';
  let description = '';
  let details: Array<{ label: string; value: string | number }> = [];
  let actions: Array<{ label: string; onClick: () => void; variant: 'primary' | 'secondary' }> = [];

  if (isLocation) {
    const location = data as Location;
    title = location.name;
    description = location.description || 'A location in the WAGDIE world';
    details = [
      { label: 'Area', value: location.metadata.area || 'Unknown' },
      { label: 'Type', value: location.metadata.properties?.terrain || 'Unknown' },
      { label: 'Difficulty', value: location.metadata.properties?.difficulty || 'Unknown' },
    ];

    if (location.character_locations && location.character_locations.length > 0) {
      details.push({
        label: 'Characters Staked',
        value: location.character_locations.length,
      });
    }

    actions = [
      {
        label: 'Stake Character',
        onClick: () => console.log('Stake character to', location.name),
        variant: 'primary',
      },
      {
        label: 'View Details',
        onClick: () => console.log('View details for', location.name),
        variant: 'secondary',
      },
    ];
  } else if (isCharacter) {
    const charLocation = data as CharacterLocation;
    title = `Character #${charLocation.character_token_id}`;
    description = 'A WAGDIE character';
    details = [
      { label: 'Token ID', value: charLocation.character_token_id },
      { label: 'Location', value: charLocation.location?.name || 'Unknown' },
      { label: 'Status', value: charLocation.status },
      { label: 'Wallet', value: `${charLocation.wallet_address.slice(0, 6)}...${charLocation.wallet_address.slice(-4)}` },
    ];

    actions = [
      {
        label: 'View Character',
        onClick: () => console.log('View character', charLocation.character_token_id),
        variant: 'primary',
      },
      {
        label: 'Move Character',
        onClick: () => console.log('Move character', charLocation.character_token_id),
        variant: 'secondary',
      },
    ];
  }

  return (
    <div className="bg-abyss border-2 border-gold rounded-lg p-4 shadow-xl max-w-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-wagdie text-gold text-lg font-bold">{title}</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-mist hover:text-bone transition-colors"
            aria-label="Close popup"
          >
            ✕
          </button>
        )}
      </div>

      {/* Description */}
      {description && (
        <p className="font-wagdie text-bone text-sm mb-3">{description}</p>
      )}

      {/* Details */}
      <div className="bg-shadow rounded p-3 mb-3">
        <h4 className="font-wagdie text-bone text-sm font-semibold mb-2">Details</h4>
        <div className="space-y-1">
          {details.map((detail, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="font-wagdie text-mist text-xs">{detail.label}:</span>
              <span className="font-wagdie text-bone text-xs font-semibold">{detail.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`flex-1 py-2 px-3 rounded font-wagdie text-xs transition-all ${
              action.variant === 'primary'
                ? 'bg-gold text-abyss hover:bg-ember'
                : 'bg-midnight text-bone hover:bg-shadow border border-midnight'
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
