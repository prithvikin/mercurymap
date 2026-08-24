import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import PhotoImage from './PhotoImage.tsx';

describe('PhotoImage', () => {
  const original =
    'https://project.supabase.co/storage/v1/object/public/photos/trip/beach.jpg';
  const transformed =
    'https://project.supabase.co/storage/v1/render/image/public/photos/trip/beach.jpg?width=640&quality=75';

  it('starts with the transformed source and falls back to the original once', () => {
    render(<PhotoImage src={original} alt="beach" width={640} />);
    const image = screen.getByRole('img', { name: 'beach' });

    expect(image).toHaveAttribute('src', transformed);

    fireEvent.error(image);
    expect(image).toHaveAttribute('src', original);

    // A broken original must not trigger another alternate URL or an error loop.
    fireEvent.error(image);
    expect(image).toHaveAttribute('src', original);
  });

  it('does not transform the source when no width is requested', () => {
    render(<PhotoImage src={original} alt="full-size beach" />);
    expect(screen.getByRole('img', { name: 'full-size beach' })).toHaveAttribute('src', original);
  });
});
