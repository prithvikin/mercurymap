import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import LocationSearch from './LocationSearch.tsx';

describe('LocationSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function searchFor(query: string) {
    fireEvent.change(screen.getByRole('textbox'), { target: { value: query } });
    act(() => {
      jest.advanceTimersByTime(300);
    });
  }

  it('shows returned places as suggestions', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          {
            formatted: 'Kyoto, Japan',
            geometry: { lat: 35.0116, lng: 135.7681 },
            components: { city: 'Kyoto', country: 'Japan' },
          },
        ],
      }),
    });

    render(<LocationSearch onLocationSelect={jest.fn()} />);
    searchFor('Kyoto');

    expect((await screen.findAllByText('Kyoto, Japan')).length).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows a distinct no-results state for an HTTP 200 with an empty result list', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [] }),
    });

    render(<LocationSearch onLocationSelect={jest.fn()} />);
    searchFor('nowhere');

    expect(await screen.findByText('No matching places found.')).toBeInTheDocument();
    expect(screen.queryByText('Location search is unavailable right now.')).not.toBeInTheDocument();
  });

  it('shows the service error instead of mislabeling an HTTP 401 as no results', async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({}),
    });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<LocationSearch onLocationSelect={jest.fn()} />);
    searchFor('Paris');

    expect(await screen.findByText('Location search is unavailable right now.')).toBeInTheDocument();
    expect(screen.queryByText('No matching places found.')).not.toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith(
      'OpenCage geocoding failed: 401 Unauthorized'
    );
    consoleError.mockRestore();
  });
});
