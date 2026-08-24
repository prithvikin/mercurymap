/**
 * A stand-in for the Supabase client.
 *
 * The real client is constructed at module scope in `lib/supabase.ts`, so tests
 * replace the whole module:
 *
 *   var mockSupabase;
 *   jest.mock('../lib/supabase.ts', () => {
 *     mockSupabase = require('../test-utils/supabaseMock.ts').createSupabaseMock();
 *     return { supabase: mockSupabase };
 *   });
 *
 * Deliberately built from plain closures rather than `jest.fn()`: create-react-app
 * sets `resetMocks: true`, which strips the implementation off every jest mock
 * before each test. A `jest.mock` factory runs once, at import time, so mocks
 * defined there would be hollowed out by the time the first test body runs.
 *
 * The query builder records the chain instead of interpreting it. That is the
 * only way to tell `.is('user_id', null)` (public photos) apart from no filter
 * at all -- both resolve to the same canned rows, but only one of them is safe.
 */

export interface QueryResult<T = unknown> {
  data: T | null;
  error: { message: string } | null;
}

/** One `supabase.from(...)` call and every builder method chained onto it. */
export interface RecordedQuery {
  table: string;
  chain: Array<{ method: string; args: unknown[] }>;
}

const BUILDER_METHODS = [
  'select',
  'insert',
  'update',
  'upsert',
  'delete',
  'eq',
  'neq',
  'is',
  'in',
  'not',
  'filter',
  'order',
  'limit',
  'range',
  'single',
  'maybeSingle',
] as const;

export interface SupabaseQueryMock {
  from: (table: string) => Record<string, unknown>;
  /** Every query issued, in order. */
  queries: RecordedQuery[];
  /** What subsequent queries resolve with. */
  setResult: (result: QueryResult) => void;
  resetQueries: () => void;
}

export function createSupabaseQueryMock(
  initialResult: QueryResult = { data: [], error: null }
): SupabaseQueryMock {
  let result = initialResult;
  const queries: RecordedQuery[] = [];

  const from = (table: string) => {
    const record: RecordedQuery = { table, chain: [] };
    queries.push(record);

    // Thenable, so `await supabase.from(...).select(...)...` resolves to the
    // canned result wherever in the chain the caller stops.
    const builder: Record<string, unknown> = {
      then: (
        onFulfilled?: (value: QueryResult) => unknown,
        onRejected?: (reason: unknown) => unknown
      ) => Promise.resolve(result).then(onFulfilled, onRejected),
    };

    for (const method of BUILDER_METHODS) {
      builder[method] = (...args: unknown[]) => {
        record.chain.push({ method, args });
        return builder;
      };
    }

    return builder;
  };

  return {
    from,
    queries,
    setResult: (next: QueryResult) => {
      result = next;
    },
    resetQueries: () => {
      queries.length = 0;
    },
  };
}

export interface FakeUser {
  id: string;
  email: string;
}

export type SignOutOptions = { scope?: 'global' | 'local' | 'others' } | undefined;
export type SignOutHandler = (
  options: SignOutOptions
) => Promise<{ error: { message: string } | null }>;

export interface SupabaseAuthMock {
  auth: {
    getSession: () => Promise<{ data: { session: { user: FakeUser } | null }; error: null }>;
    onAuthStateChange: (
      callback: (event: string, session: { user: FakeUser } | null) => void
    ) => { data: { subscription: { unsubscribe: () => void } } };
    signInWithPassword: () => Promise<{ error: { message: string } | null }>;
    signUp: () => Promise<{ error: { message: string } | null }>;
    signOut: SignOutHandler;
  };
  /** The argument of every `signOut` call, in order. */
  signOutCalls: SignOutOptions[];
  /** Swap in the behaviour `signOut` should exhibit. */
  setSignOutHandler: (handler: SignOutHandler) => void;
  /** Change who `getSession` reports, before the provider mounts. */
  setSessionUser: (user: FakeUser | null) => void;
  /** Whether the AuthProvider tore down its auth subscription. */
  unsubscribed: () => boolean;
  resetAuth: () => void;
}

export function createSupabaseAuthMock(user: FakeUser | null = null): SupabaseAuthMock {
  const signOutCalls: SignOutOptions[] = [];
  const listeners: Array<(event: string, session: { user: FakeUser } | null) => void> = [];
  const defaultSignOut: SignOutHandler = async () => ({ error: null });

  let currentUser = user;
  let unsubscribeCount = 0;
  let signOutHandler = defaultSignOut;

  return {
    signOutCalls,
    setSignOutHandler: (handler: SignOutHandler) => {
      signOutHandler = handler;
    },
    setSessionUser: (nextUser: FakeUser | null) => {
      currentUser = nextUser;
    },
    unsubscribed: () => unsubscribeCount > 0,
    resetAuth: () => {
      signOutCalls.length = 0;
      listeners.length = 0;
      unsubscribeCount = 0;
      currentUser = user;
      signOutHandler = defaultSignOut;
    },
    auth: {
      getSession: async () => ({
        data: { session: currentUser ? { user: currentUser } : null },
        error: null,
      }),
      onAuthStateChange: (callback) => {
        listeners.push(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                unsubscribeCount += 1;
              },
            },
          },
        };
      },
      signInWithPassword: async () => ({ error: null }),
      signUp: async () => ({ error: null }),
      signOut: (options: SignOutOptions) => {
        signOutCalls.push(options);
        return signOutHandler(options);
      },
    },
  };
}

export type SupabaseMock = SupabaseQueryMock & SupabaseAuthMock;

export function createSupabaseMock(
  options: { user?: FakeUser | null; result?: QueryResult } = {}
): SupabaseMock {
  return {
    ...createSupabaseQueryMock(options.result ?? { data: [], error: null }),
    ...createSupabaseAuthMock(options.user ?? null),
  };
}

/** The recorded chain of the n-th query, flattened to `[method, ...args]` rows. */
export function chainOf(mock: SupabaseQueryMock, index = 0): Array<[string, ...unknown[]]> {
  const query = mock.queries[index];
  if (!query) throw new Error(`No query recorded at index ${index}`);
  return query.chain.map(({ method, args }) => [method, ...args] as [string, ...unknown[]]);
}
