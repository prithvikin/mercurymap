// Jest setup, loaded by react-scripts via `setupFilesAfterEnv`.
import '@testing-library/jest-dom';

// Dates are rendered with `toLocaleDateString()`, so pin the zone. Without this
// a `2021-06-01` date string (parsed as UTC midnight) renders as May 31st on a
// machine west of Greenwich and June 1st on one east of it, and date assertions
// pass or fail depending on where CI happens to run.
process.env.TZ = 'UTC';

// The app reads these at module scope (`supabase.ts` throws without a URL).
// Setting them unconditionally -- rather than falling back to a real value from
// .env.local -- keeps a developer's local run identical to CI and guarantees no
// test can accidentally authenticate against the real project.
process.env.REACT_APP_SUPABASE_URL = 'https://test.supabase.co';
process.env.REACT_APP_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.REACT_APP_OPENCAGE_API_KEY = 'test-opencage-key';
process.env.REACT_APP_MAPBOX_TOKEN = 'test-mapbox-token';

// No test may reach the network. jsdom has no `fetch`, so anything that calls it
// would otherwise fail with a confusing "fetch is not defined"; this replaces
// that with an explicit failure naming the URL, and forces tests that exercise
// network code to install their own mock.
beforeEach(() => {
  (global as { fetch?: unknown }).fetch = jest.fn((input: unknown) => {
    throw new Error(
      `Unmocked network request to ${String(input)}. ` +
        'Tests must not hit the network -- mock global.fetch in this test file.'
    );
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});
