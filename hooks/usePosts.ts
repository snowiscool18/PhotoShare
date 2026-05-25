import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './useAuth';

export interface Post {
  id: string;
  user_id: string;
  description: string | null;
  image_url: string;
  created_at: string;
}

export function usePosts() {
  const { user } = useAuth();
  const supabase = createClient();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!user?.id) {
      setPosts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setPosts(data || []);
    } catch (err: any) {
      console.error('Error fetching posts:', err);
      setError(err.message || 'Failed to load posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, supabase]);

  // Auto-refresh posts when user changes (login/logout)
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Upload image to Supabase Storage and return the public URL
  const uploadImage = async (file: File): Promise<string> => {
    if (!user?.id) throw new Error('User not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('user-timeline-posts')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from('user-timeline-posts')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const createPost = async (file: File, description: string) => {
    if (!user?.id) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      // 1. Upload image
      const imageUrl = await uploadImage(file);

      // 2. Insert post record
      const { data, error: insertError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          description: description.trim() || null,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 3. Optimistically update local state
      setPosts((prev) => [data as Post, ...prev]);

      return data;
    } catch (err: any) {
      console.error('Error creating post:', err);
      setError(err.message || 'Failed to create post');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (postId: string) => {
    if (!user?.id) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      // Find the post to get the image path for deletion
      const postToDelete = posts.find((p) => p.id === postId);
      if (!postToDelete) return;

      // 1. Delete from database
      const { error: dbError } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id); // extra safety

      if (dbError) throw dbError;

      // 2. Delete from storage (best effort)
      try {
        const url = new URL(postToDelete.image_url);
        const pathParts = url.pathname.split('/');
        const filePath = pathParts.slice(pathParts.indexOf('user-timeline-posts') + 1).join('/');

        await supabase.storage
          .from('user-timeline-posts')
          .remove([filePath]);
      } catch (storageErr) {
        console.warn('Could not delete image from storage:', storageErr);
      }

      // 3. Update local state
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err: any) {
      console.error('Error deleting post:', err);
      setError(err.message || 'Failed to delete post');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    posts,
    loading,
    error,
    createPost,
    deletePost,
    refresh: fetchPosts,
  };
}
