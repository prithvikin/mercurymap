import { resizedImageUrl } from './imageUrl.ts';

describe('resizedImageUrl', () => {
  it('converts a public Supabase object URL into a render URL with dimensions', () => {
    const source =
      'https://project.supabase.co/storage/v1/object/public/photos/trip/beach.jpg';

    expect(resizedImageUrl(source, 640)).toBe(
      'https://project.supabase.co/storage/v1/render/image/public/photos/trip/beach.jpg?width=640&quality=75'
    );
  });

  it('does not rewrite URLs from other storage providers', () => {
    const source = 'https://cdn.example.com/photos/beach.jpg';

    expect(resizedImageUrl(source, 320)).toBe(source);
  });

  it('does not rewrite a Supabase URL whose path is not a public object path', () => {
    const source = 'https://project.supabase.co/storage/v1/object/sign/photos/beach.jpg';

    expect(resizedImageUrl(source, 320)).toBe(source);
  });
});
