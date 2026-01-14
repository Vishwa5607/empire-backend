const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // ✅ Matches line 5
);

class SupabaseStorageService {
  /**
   * Upload image to Supabase Storage
   */
  async uploadImage(fileBuffer, bucket, folder = '') {
    try {
      console.log('🔄 Compressing image...');
      
      // Compress and optimize image
      const optimizedBuffer = await sharp(fileBuffer)
        .resize(1920, 1080, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();

      console.log('📦 Original size:', fileBuffer.length, 'bytes');
      console.log('📦 Optimized size:', optimizedBuffer.length, 'bytes');

      // Generate unique filename
      const filename = `${uuidv4()}.jpg`;
      const filePath = folder ?  `${folder}/${filename}` : filename;

      console.log('☁️  Uploading to Supabase:', filePath);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, optimizedBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        console.error('❌ Supabase upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        . from(bucket)
        .getPublicUrl(filePath);

      console.log('✅ Image uploaded successfully! ');
      console.log('🔗 Public URL:', publicUrlData.publicUrl);
      
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      throw new Error(`Failed to upload image: ${error. message}`);
    }
  }

  /**
   * Delete image from Supabase Storage
   */
  async deleteImage(imageUrl, bucket) {
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split(`${bucket}/`);
      if (urlParts.length < 2) {
        throw new Error('Invalid image URL');
      }

      const filePath = urlParts[1];

      console.log('🗑️  Deleting image:', filePath);

      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        console.error('❌ Error deleting image:', error);
        throw error;
      }

      console.log('✅ Image deleted:', filePath);
    } catch (error) {
      console.error('❌ Error deleting image:', error);
      throw error;
    }
  }
}

module.exports = new SupabaseStorageService();
