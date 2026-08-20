import {
  geocoderErrorMessage,
  GEOCODER_NETWORK_ERROR,
} from './geocoderError.ts';

describe('geocoderErrorMessage', () => {
  it.each([401, 403])('gives an unavailable message for HTTP %i', (status) => {
    expect(geocoderErrorMessage(status)).toBe('Location search is unavailable right now.');
  });

  it.each([402, 429])('gives a rate-limit message for HTTP %i', (status) => {
    expect(geocoderErrorMessage(status)).toBe('Too many searches just now — try again in a moment.');
  });

  it.each([400, 404, 500, 503])('gives a generic service message for HTTP %i', (status) => {
    expect(geocoderErrorMessage(status)).toBe("Couldn't reach the location service.");
  });
});

test('the network failure copy is stable for callers to display', () => {
  expect(GEOCODER_NETWORK_ERROR).toBe('Check your connection and try again.');
});
