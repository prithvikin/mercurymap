/**
 * Deliberately small, versioned reference set for coordinate checks.
 *
 * This is not a geocoding database. It is a high-signal safety net for the
 * places used in the evaluation set and a few common destinations. A live
 * answer outside this set is reported as "unverifiable" rather than silently
 * accepted: a map pin is too user-visible to trust an unknown coordinate.
 */
export const GAZETTEER = [
  { place: 'Lisbon', country: 'Portugal', latitude: 38.7223, longitude: -9.1393, aliases: ['lisboa'] },
  { place: 'Porto', country: 'Portugal', latitude: 41.1579, longitude: -8.6291, aliases: ['oporto'] },
  { place: 'Barcelona', country: 'Spain', latitude: 41.3874, longitude: 2.1686, aliases: [] },
  { place: 'Valencia', country: 'Spain', latitude: 39.4699, longitude: -0.3763, aliases: [] },
  { place: 'Venice', country: 'Italy', latitude: 45.4408, longitude: 12.3155, aliases: ['venezia'] },
  { place: 'Naples', country: 'Italy', latitude: 40.8518, longitude: 14.2681, aliases: ['napoli'] },
  { place: 'Amalfi', country: 'Italy', latitude: 40.634, longitude: 14.6027, aliases: [] },
  { place: 'Athens', country: 'Greece', latitude: 37.9838, longitude: 23.7275, aliases: [] },
  { place: 'Copenhagen', country: 'Denmark', latitude: 55.6761, longitude: 12.5683, aliases: [] },
  { place: 'Reykjavik', country: 'Iceland', latitude: 64.1466, longitude: -21.9426, aliases: ['reykjavík'] },
  { place: 'Dublin', country: 'Ireland', latitude: 53.3498, longitude: -6.2603, aliases: [] },
  { place: 'Marrakech', country: 'Morocco', latitude: 31.6295, longitude: -7.9811, aliases: ['marrakesh'] },
  { place: 'Cape Town', country: 'South Africa', latitude: -33.9249, longitude: 18.4241, aliases: [] },
  { place: 'Durban', country: 'South Africa', latitude: -29.8587, longitude: 31.0218, aliases: [] },
  { place: 'Sydney', country: 'Australia', latitude: -33.8688, longitude: 151.2093, aliases: [] },
  { place: 'Melbourne', country: 'Australia', latitude: -37.8136, longitude: 144.9631, aliases: [] },
  { place: 'Auckland', country: 'New Zealand', latitude: -36.8509, longitude: 174.7645, aliases: [] },
  { place: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503, aliases: [] },
  { place: 'Kyoto', country: 'Japan', latitude: 35.0116, longitude: 135.7681, aliases: [] },
  { place: 'Osaka', country: 'Japan', latitude: 34.6937, longitude: 135.5023, aliases: [] },
  { place: 'Sapporo', country: 'Japan', latitude: 43.0618, longitude: 141.3545, aliases: [] },
  { place: 'Nara', country: 'Japan', latitude: 34.6851, longitude: 135.8048, aliases: [] },
  { place: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.006, aliases: ['new york city', 'nyc'] },
  { place: 'San Francisco', country: 'United States', latitude: 37.7749, longitude: -122.4194, aliases: ['sf'] },
  { place: 'New Orleans', country: 'United States', latitude: 29.9511, longitude: -90.0715, aliases: [] },
  { place: 'Vancouver', country: 'Canada', latitude: 49.2827, longitude: -123.1207, aliases: [] },
  { place: 'Mexico City', country: 'Mexico', latitude: 19.4326, longitude: -99.1332, aliases: [] },
  { place: 'Lima', country: 'Peru', latitude: -12.0464, longitude: -77.0428, aliases: [] },
  { place: 'Buenos Aires', country: 'Argentina', latitude: -34.6037, longitude: -58.3816, aliases: [] },
  { place: 'Rio de Janeiro', country: 'Brazil', latitude: -22.9068, longitude: -43.1729, aliases: ['rio'] },
  { place: 'Cartagena', country: 'Colombia', latitude: 10.391, longitude: -75.4794, aliases: [] },
  { place: 'Istanbul', country: 'Turkey', latitude: 41.0082, longitude: 28.9784, aliases: [] },
  { place: 'Cairo', country: 'Egypt', latitude: 30.0444, longitude: 31.2357, aliases: [] },
  { place: 'Nairobi', country: 'Kenya', latitude: -1.2921, longitude: 36.8219, aliases: [] },
  { place: 'Seoul', country: 'South Korea', latitude: 37.5665, longitude: 126.978, aliases: [] },
  { place: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198, aliases: [] },
  { place: 'Bangkok', country: 'Thailand', latitude: 13.7563, longitude: 100.5018, aliases: [] },
  { place: 'Hanoi', country: 'Vietnam', latitude: 21.0278, longitude: 105.8342, aliases: [] },
  { place: 'Bali', country: 'Indonesia', latitude: -8.4095, longitude: 115.1889, aliases: ['ubud'] },
  { place: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.209, aliases: ['new delhi'] },
  { place: 'Dubai', country: 'United Arab Emirates', latitude: 25.2048, longitude: 55.2708, aliases: [] },
];

export const COORDINATE_TOLERANCE_DEGREES = 1;

export function normalizePlace(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function lookupGazetteer(place, country) {
  const normalizedPlace = normalizePlace(place);
  const normalizedCountry = normalizePlace(country);
  return GAZETTEER.find((entry) => {
    const names = [entry.place, ...(entry.aliases ?? [])].map(normalizePlace);
    return names.includes(normalizedPlace) && normalizePlace(entry.country) === normalizedCountry;
  }) ?? null;
}
