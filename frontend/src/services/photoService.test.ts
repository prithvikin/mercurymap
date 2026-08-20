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
    const chain = chainOf(mockSupabase);
    expect(chain).toEqual([
      ['select', expect.stringContaining('latitude, longitude')],
      ['is', 'user_id', null],
      ['order', 'created_at', { ascending: false }],
    ]);
    // Explicitly not select('*'). add_semantic_search.sql adds a 384-float
    // embedding column to this table, and a wildcard select would drag it into
    // every map load and photo grid.
    expect(chain[0][1]).not.toBe('*');
    expect(result).toEqual(rows);
  });
});
