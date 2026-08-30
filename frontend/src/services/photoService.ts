import { supabase, Photo } from '../lib/supabase.ts';

// The columns of the Photo interface, listed explicitly rather than select('*').
// add_semantic_search.sql adds `embedding` (384 floats, ~6KB as JSON) and a
// stored `tsv` to this table; select('*') would drag both into every map load
// and photo grid, none of which use them. Naming the columns also means a
// future column can't silently bloat these queries.
const PHOTO_COLUMNS =
  'id, title, description, country, latitude, longitude, taken_date, file_path, file_url, user_id, created_at, updated_at';

export const photoService = {
  // Get all photos (public only)
  async getAllPhotos(): Promise<Photo[]> {
    const { data, error } = await supabase
      .from('photos')
      .select(PHOTO_COLUMNS)
      .is('user_id', null) // Only public photos (no user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get user's photos
  async getUserPhotos(userId: string): Promise<Photo[]> {
    const { data, error } = await supabase
      .from('photos')
      .select(PHOTO_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Upload photo
  async uploadPhoto(
    file: File,
    title: string,
    description: string,
    country: string,
    latitude: number | null,
    longitude: number | null,
    takenDate: string | null,
    userId?: string
  ): Promise<Photo> {
    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `photos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('photos')
      .getPublicUrl(filePath);

    // Insert photo record
    const { data: photoData, error: insertError } = await supabase
      .from('photos')
      .insert({
        title,
        description,
        country,
        latitude,
        longitude,
        taken_date: takenDate,
        file_path: filePath,
        file_url: urlData.publicUrl,
        user_id: userId || null, // Set user_id if provided, otherwise null for public photos
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return photoData;
  },
}; 