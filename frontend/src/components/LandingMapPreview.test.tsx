import React from 'react';
import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Capture the camera calls the component makes, and hold onto the `onLoad`
// the real <Map> would fire once Mapbox has finished initialising.
const mockFlyTo = jest.fn();
const mockJumpTo = jest.fn();
let mockFireMapLoad: (() => void) | null = null;

jest.mock('react-map-gl', () => {
  const ReactLib = require('react');
  const Map = ReactLib.forwardRef(({ children, onLoad }: any, ref: any) => {
    // react-map-gl populates the ref on mount, well before the map is
    // actually usable. Reproducing that is the point of this mock: the
    // component must not act on the ref's mere existence.
    ReactLib.useImperativeHandle(ref, () => ({ flyTo: mockFlyTo, jumpTo: mockJumpTo }));
    mockFireMapLoad = onLoad;
    return ReactLib.createElement('div', { 'data-testid': 'map' }, children);
  });
  return {
    __esModule: true,
    default: Map,
    Marker: ({ children }: any) => require('react').createElement('div', null, children),
    Popup: ({ children }: any) => require('react').createElement('div', null, children),
  };
});

jest.mock('../services/photoService.ts', () => ({
  photoService: { getAllPhotos: jest.fn() },
}));

import { photoService } from '../services/photoService.ts';
import LandingMapPreview from './LandingMapPreview.tsx';

const photos = [
  { id: '1', latitude: -13.16, longitude: -72.54, country: 'Peru', title: 'Machupicchu', file_url: 'a.jpg' },
  { id: '2', latitude: 41.9, longitude: 12.5, country: 'Italy', title: 'Rome', file_url: 'b.jpg' },
  { id: '3', latitude: 35.7, longitude: 139.7, country: 'Japan', title: 'Tokyo', file_url: 'c.jpg' },
];

const first: [number, number] = [photos[0].longitude, photos[0].latitude];

describe('LandingMapPreview pan sequence', () => {
  // jsdom has no matchMedia; the component asks it about reduced motion.
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  beforeEach(() => {
    jest.useFakeTimers();
    mockFlyTo.mockClear();
    mockJumpTo.mockClear();
    mockFireMapLoad = null;
    (photoService.getAllPhotos as jest.Mock).mockResolvedValue(photos);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Renders and lets the photoService promise settle, so `locations`
  // populates and the <Map> mounts -- but without firing `load`.
  const mountAndResolvePhotos = async () => {
    render(
      <MemoryRouter>
        <LandingMapPreview />
      </MemoryRouter>
    );
    await act(async () => {});
  };

  it('does not fly before the map reports it has loaded', async () => {
    await mountAndResolvePhotos();

    // The map element exists and the ref is populated, but Mapbox has not
    // fired `load` yet. A flight here is what used to get silently swallowed
    // by the optional chaining, costing the whole opening pan.
    expect(mockFlyTo).not.toHaveBeenCalled();
  });

  it('flies immediately once the map loads, without waiting for the interval', async () => {
    await mountAndResolvePhotos();

    act(() => {
      mockFireMapLoad?.();
    });

    // No timers advanced: the opening flight is synchronous with load.
    expect(mockFlyTo).toHaveBeenCalledTimes(1);
    expect(mockFlyTo.mock.calls[0][0].center).toEqual(first);
  });

  it('starts at the first location rather than skipping it', async () => {
    await mountAndResolvePhotos();
    act(() => {
      mockFireMapLoad?.();
    });

    // The swallowed flight still advanced panIndexRef, so the visible
    // sequence used to begin at the second location.
    expect(mockFlyTo.mock.calls[0][0].center).toEqual(first);
  });

  it('opens faster than it pans, then settles into the slower rhythm', async () => {
    await mountAndResolvePhotos();
    act(() => {
      mockFireMapLoad?.();
    });
    const openingDuration = mockFlyTo.mock.calls[0][0].duration;

    act(() => {
      jest.advanceTimersByTime(4500);
    });

    expect(mockFlyTo).toHaveBeenCalledTimes(2);
    expect(mockFlyTo.mock.calls[1][0].duration).toBeGreaterThan(openingDuration);
  });
});
