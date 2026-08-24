import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SupabaseMock, FakeUser } from '../test-utils/supabaseMock.ts';

var mockSupabase: SupabaseMock;
const signedInUser: FakeUser = { id: 'user-123', email: 'traveler@example.com' };

jest.mock('../lib/supabase.ts', () => {
  const { createSupabaseMock } = require('../test-utils/supabaseMock.ts');
  mockSupabase = createSupabaseMock({
    user: { id: 'user-123', email: 'traveler@example.com' },
  });
  return { supabase: mockSupabase };
});

import { AuthProvider, useAuth } from './AuthContext.tsx';

function AuthProbe() {
  const { user, loading, signOut } = useAuth();

  if (loading) return <span>Loading session</span>;

  return (
    <div>
      <span>{user?.email ?? 'Signed out'}</span>
      <button onClick={() => void signOut()}>Sign out</button>
    </div>
  );
}

describe('AuthProvider signOut', () => {
  beforeEach(() => {
    mockSupabase.resetAuth();
    window.localStorage.clear();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('uses global sign-out first, then local scope when the session is already expired', async () => {
    let calls = 0;
    mockSupabase.setSignOutHandler(async () => {
      calls += 1;
      return calls === 1 ? { error: { message: 'session missing' } } : { error: null };
    });

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    expect(await screen.findByText(signedInUser.email)).toBeInTheDocument();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Sign out' }));
    });

    await waitFor(() => expect(screen.getByText('Signed out')).toBeInTheDocument());
    expect(mockSupabase.signOutCalls).toEqual([undefined, { scope: 'local' }]);
  });

  it('clears Supabase session keys when both server sign-out attempts fail', async () => {
    mockSupabase.setSignOutHandler(async () => ({ error: { message: 'session missing' } }));
    window.localStorage.setItem('sb-project-auth-token', 'stale session');
    window.localStorage.setItem('unrelated-setting', 'keep me');

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    expect(await screen.findByText(signedInUser.email)).toBeInTheDocument();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Sign out' }));
    });

    await waitFor(() => expect(screen.getByText('Signed out')).toBeInTheDocument());
    expect(mockSupabase.signOutCalls).toEqual([undefined, { scope: 'local' }]);
    expect(window.localStorage.getItem('sb-project-auth-token')).toBeNull();
    expect(window.localStorage.getItem('unrelated-setting')).toBe('keep me');
  });
});
