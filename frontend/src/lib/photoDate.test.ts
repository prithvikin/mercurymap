import { photoDate } from '../lib/photoDate.ts';
import { Photo } from '../lib/supabase.ts';

function photo(overrides: Partial<Photo> = {}): Photo {
  return {
    id: 'photo-1',
    title: 'A trip',
    description: null,
    country: 'Japan',
    latitude: 35.6762,
    longitude: 139.6503,
    taken_date: '2024-04-10T12:00:00.000Z',
    file_path: 'photos/photo-1.jpg',
    file_url: 'https://example.com/photo-1.jpg',
    user_id: null,
    created_at: '2024-04-11T12:00:00.000Z',
    updated_at: '2024-04-11T12:00:00.000Z',
    ...overrides,
  };
}

describe('photoDate', () => {
  it('uses the upload date when taken_date is null', () => {
    const result = photoDate(photo({ taken_date: null }));

    expect(result).toBe(new Date('2024-04-11T12:00:00.000Z').toLocaleDateString());
    expect(result).not.toContain('Invalid Date');
  });

  it('falls back to created_at when taken_date is an invalid string', () => {
    const result = photoDate(photo({ taken_date: 'not-a-date' }));

    expect(result).toBe(new Date('2024-04-11T12:00:00.000Z').toLocaleDateString());
    expect(result).not.toContain('Invalid Date');
  });

  it('uses taken_date when it is valid', () => {
    const result = photoDate(photo({ taken_date: '2024-04-10T12:00:00.000Z' }));

    expect(result).toBe(new Date('2024-04-10T12:00:00.000Z').toLocaleDateString());
    expect(result).not.toContain('Invalid Date');
  });
});
