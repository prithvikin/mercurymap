import { chainOf, SupabaseMock } from '../test-utils/supabaseMock.ts';

var mockSupabase: SupabaseMock;

jest.mock('../lib/supabase.ts', () => {
  const { createSupabaseMock } = require('../test-utils/supabaseMock.ts');
  mockSupabase = createSupabaseMock();
  return { supabase: mockSupabase };
});

import { photoService } from './photoService.ts';

describe('photoService.getAllPhotos', () => {
  beforeEach(() => {
    mockSupabase.resetQueries();
  });

  it('requests only rows with a null user_id so private photos cannot leak', async () => {
    const rows = [
      { id: 'public-photo', user_id: null },
      { id: 'private-photo', user_id: 'user-123' },
    ];
    mockSupabase.setResult({ data: rows, error: null });

    const result = await photoService.getAllPhotos();

    expect(mockSupabase.queries[0].table).toBe('photos');
    expect(chainOf(mockSupabase)).toEqual([
      ['select', '*'],
      ['is', 'user_id', null],
      ['order', 'created_at', { ascending: false }],
    ]);
    expect(result).toEqual(rows);
  });
});
