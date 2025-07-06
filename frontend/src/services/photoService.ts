import { supabase, Photo } from '../lib/supabase.ts';

export const photoService = {
  // Get all photos
  async getAllPhotos(): Promise<Photo[]> {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get photos by country
  async getPhotosByCountry(country: string): Promise<Photo[]> {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('country', country)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get photo by ID
  async getPhotoById(id: string): Promise<Photo | null> {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Upload photo
  async uploadPhoto(
    file: File,
    title: string,
    description: string,
    country: string,
    latitude: number | null,
    longitude: number | null,
    takenDate: string | null
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
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return photoData;
  },



  // Get countries with photo counts
  async getCountriesWithCounts(): Promise<{ country: string; photo_count: number }[]> {
    const { data, error } = await supabase
      .from('photos')
      .select('country')
      .order('country');

    if (error) throw error;

    const counts = data?.reduce((acc, photo) => {
      acc[photo.country] = (acc[photo.country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts || {}).map(([country, photo_count]) => ({
      country,
      photo_count: photo_count as number,
    }));
  },
}; 