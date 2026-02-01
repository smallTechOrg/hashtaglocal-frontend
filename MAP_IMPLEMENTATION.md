# Map Feature

## Current Implementation

### Files
- **app/map.tsx** - Map screen with Google Maps and user location
- **utils/LocationService.ts** - Location permission and GPS utilities
- **app/_layout.tsx** - Drawer navigation with Map entry

### Features
- Google Maps showing user location with green marker
- Permission handling (request, denied, error states)
- Location overlay: coordinates + accuracy
- Map controls: zoom, pan, compass, my location button
- Loading spinner while fetching location

### Dependencies
- react-native-maps v1.20.1 (requires dev build)
- expo-location v19.0.8

### Navigation
Map accessible via drawer menu (hamburger icon)

### Platform
Android only (dev build required, won't work on Expo Go)

## LocationService API
```typescript
getLocationWithPermission() // Request permission + fetch location
checkLocationPermission()   // Check current permission status
requestLocationPermission() // Request foreground permission
getCurrentLocation(timeout) // One-time GPS fetch
```

## Future
- Issue markers on map
- Continuous location tracking
- iOS support
