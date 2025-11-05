# Map Components

This directory contains UI components for the **Native Map Integration** feature, replacing the iframe-based map with a native Leaflet implementation.

## Components

### NativeMap (SimpleMap)
Native Leaflet map component that displays the WAGDIE world as an interactive map with custom image overlay.

**Features**:
- Native Leaflet map with WAGDIE world image (`wagdiemap.png`)
- Interactive markers for locations and characters
- Layer controls for toggling marker visibility
- Smooth zoom and pan controls
- Responsive design with window resize handling

### LoadingState
WAGDIE-themed loading component for map initialization.

**Features**:
- Animated spinner with WAGDIE colors (gold theme)
- Custom "Initializing WAGDIE World..." message
- Full-screen loading overlay

### MapTooltip
Tooltip component for marker hover states (coming in User Story 2).

### MapPopup
Popup component for detailed marker information (coming in User Story 2).

### CharacterLocationList
Displays user's characters with their current locations.

### LocationSelector
Modal component for selecting a new location to stake characters.

### TransactionStatus
Shows blockchain transaction progress and status.

### NoCharactersState
Empty state for users without characters.

## Usage

```tsx
import { SimpleMap } from '@/components/map/SimpleMap'
import { LoadingState } from '@/components/map/LoadingState'

export default function MapPage() {
  return (
    <div className="w-full h-screen">
      <SimpleMap
        locations={locations}
        characterLocations={characterLocations}
        layers={layers}
        toggleLayer={toggleLayer}
        onMarkerClick={(marker) => {
          console.log('Marker clicked:', marker);
        }}
      />
    </div>
  )
}
```

## Architecture

These components follow the Clean Architecture pattern:

### UI Layer
Pure React components with no business logic
- `SimpleMap.tsx` - Main map component using Leaflet
- `LoadingState.tsx` - Loading state component
- `MapTooltip.tsx` - Tooltip display (TBD)
- `MapPopup.tsx` - Popup display (TBD)

### Application Layer
Custom hooks for state management
- `useMapData` - Fetches locations and character locations from Supabase
- `useMapLayers` - Manages layer visibility state

### Domain Layer
Business logic services
- `locationService.ts` - Location-related business logic
- `characterLocationService.ts` - Character location business logic

### Infrastructure Layer
Data access layer
- `locationRepository.ts` - Supabase queries for locations
- `characterLocationRepository.ts` - Supabase queries for character locations

## Technology Stack

- **Leaflet 1.9.4** - Core mapping library
- **React-Leaflet 4.2.1** - React integration for Leaflet
- **TypeScript 5+** - Type safety
- **Tailwind CSS 3.4** - Styling with WAGDIE theme
- **Supabase** - Data source for locations and character positions

## Key Features

### Phase 1 (Complete)
- ✅ Native Leaflet map implementation
- ✅ WAGDIE world image overlay
- ✅ Basic location and character markers
- ✅ Layer toggle controls (locations, characters)
- ✅ Responsive resize handling
- ✅ Map attribution control

### Phase 2 (In Progress)
- ⏳ Hover tooltips for markers
- ⏳ Detailed popups on marker click
- ⏳ WAGDIE icon integration
- ⏳ Smooth hover animations

### Phase 3 (Planned)
- ⏳ Burn, death, and battle event markers
- ⏳ WAGDIE-themed layer controls
- ⏳ Layer persistence

## Asset Management

### Fonts
Located in `/public/fonts/`:
- `Wagdie_Fraktur_21.otf` - Primary WAGDIE font
- `EskapadeFraktur-Black.ttf` - Decorative font

### Map Assets
Located in `/public/images/`:
- `wagdiemap.png` - Main world map image (9.3MB)
- `map-icons/` - Marker icons for different map layers

## Performance Considerations

- Map image is 9.3MB - may need optimization for production
- React.memo should be added to marker components
- Marker clustering may be needed for 50+ markers
- Loading states implemented for better UX

## Development

### Local Development
1. Ensure dependencies are installed: `npm install leaflet react-leaflet @types/leaflet`
2. Verify assets are in `/public/images/` and `/public/fonts/`
3. Start development server: `npm run dev`
4. Navigate to `/map` to view the native map

### Testing
- Test on multiple screen sizes for responsive design
- Verify markers display correctly
- Check layer toggle functionality
- Ensure map loads without errors

## Future Enhancements

- Marker clustering for performance
- Real-time character location updates
- WAGDIE-themed animations throughout
- Mobile-optimized touch interactions
- Integration with character staking contracts

