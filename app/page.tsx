"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePosts } from "@/hooks/usePosts";

// ============================================
// PhotoShare — Minimal Prototype (v0)
// Only interactive feature: Create a user
// Everything else is non-functional visual prototype
// Real family photo now included in /public/images/
// ============================================

import type { Post } from '@/hooks/usePosts';

// The user's actual family photo (added to the project)
const FAMILY_PHOTO_URL = "/images/IMG_7557.jpg";
const FAMILY_PHOTO_ALT = "Family photo";

type ToastMessage = {
  id: number;
  text: string;
};

export default function PhotoSharePrototype() {
  const supabase = createClient();
  const { user, isLoading: isLoadingAuth, signOut } = useAuth();
  const { 
    posts, 
    loading: postsLoading, 
    error: postsError, 
    createPost: createPostFromHook, 
    deletePost: deletePostFromHook,
    refresh: refreshPosts 
  } = usePosts();

  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');

  // Posts come from the usePosts hook (real Supabase data + temporary localStorage fallback)

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI state for prototype
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // Photo upload / Post creation state
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [postDescription, setPostDescription] = useState("");
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Posts loading is now handled automatically inside the usePosts hook
  // based on the authenticated user from useAuth()

  // --- Simple non-blocking toast for prototype actions ---
  const showToast = (text: string) => {
    // eslint-disable-next-line react-hooks/purity
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text }]);

    // Auto dismiss after 2.2 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2200);
  };

  const handleNavClick = (label: string) => {
    showToast(`${label} — Coming soon in a future update`);
  };

  // --- The only real feature: Create user ---
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    // Basic validation
    if (!name.trim() || name.trim().length < 2) {
      setFormError("Please enter your full name (at least 2 characters).");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: name.trim(),
          },
        },
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      if (data.user) {
        showToast("Account created successfully!");

        // Clear form
        setName("");
        setEmail("");
        setPassword("");
        setFormError("");
      }
    } catch (err) {
      setFormError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!email.trim() || !password) {
      setFormError("Please enter your email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      if (data.user) {
        setShowSuccess(true);

        setEmail("");
        setPassword("");
        setFormError("");
      }
    } catch (err) {
      setFormError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    localStorage.removeItem("photoshare_demo_user");
    setShowSuccess(false);
    // Gentle reset of form fields for easy re-testing
    setName("");
    setEmail("");
    setPassword("");
    setAuthMode('signup');
    showToast("Signed out");
  };

  // ============================================
  // Timeline Posts Feature (Instagram/Facebook style)
  // ============================================

  const MAX_POSTS = 10;

  const convertFileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Open the upload modal
  const openUploadModal = () => {
    setPostDescription("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsUploadModalOpen(true);
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setPostDescription("");
  };

  // Handle file selection inside the modal
  const handleFileSelectForModal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image is too large (max 5MB for this demo)");
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Wrapper to use the real hook for creating posts
  const handleCreatePost = async () => {
    if (!user || !selectedFile) return;

    if (posts.length >= MAX_POSTS) {
      showToast(`You've reached the limit of ${MAX_POSTS} posts in this prototype`);
      return;
    }

    setIsUploading(true);

    try {
      await createPostFromHook(selectedFile, postDescription.trim());
      showToast("Post created!");
      closeUploadModal();
    } catch (error: any) {
      showToast(error.message || "Failed to create post");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const deletePost = (postId: string) => {
    deletePostFromHook(postId).catch((err: any) => {
      showToast(err.message || "Failed to delete post");
    });
  };

  // Posts are now managed by usePosts hook (real-time from Supabase in future)

  // Note: Old photo-to-post migration removed as we moved to per-user localStorage storage for posts.

  const scrollToSignup = () => {
    const el = document.getElementById("signup-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      {/* Top Navigation (mostly inert) */}
      <nav className="sticky top-0 z-50 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <span className="text-xl font-semibold tracking-tighter">P</span>
            </div>
            <div>
              <div className="text-xl font-semibold tracking-tight">PhotoShare</div>
              <div className="text-[10px] text-stone-500 -mt-1">PROTOTYPE</div>
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm font-medium md:flex">
            <button onClick={() => handleNavClick("Discover")} className="hover:text-emerald-600 transition-colors">Discover</button>
            <button onClick={() => handleNavClick("Stories")} className="hover:text-emerald-600 transition-colors">Stories</button>
            <button onClick={() => handleNavClick("Pricing")} className="hover:text-emerald-600 transition-colors">Pricing</button>
            <button onClick={() => handleNavClick("Blog")} className="hover:text-emerald-600 transition-colors">Blog</button>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 text-sm">
                <span className="hidden text-stone-600 md:inline">Hi, {user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split('@')[0]}</span>
                <button
                  onClick={handleSignOut}
                  className="rounded-full border border-stone-300 px-4 py-1.5 text-sm font-medium hover:bg-stone-100 active:bg-stone-200 transition"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={scrollToSignup}
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 transition"
              >
                Get started free
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Floating toasts for prototype actions */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm shadow-lg"
          >
            {toast.text}
          </div>
        ))}
      </div>

      {/* Hero with the family photo */}
      <section className="relative border-b border-stone-200 bg-stone-900 text-white">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={FAMILY_PHOTO_URL}
            alt={FAMILY_PHOTO_ALT}
            className="h-full w-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-900/60 via-stone-900/70 to-stone-900/90" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 pb-24 pt-20 text-center md:pt-28">
          <div className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-4 py-1 text-xs font-medium tracking-[2px] mb-6">
            SIMPLE PROTOTYPE • ONE PHOTO • ONE FEATURE
          </div>

          <h1 className="text-6xl md:text-7xl font-semibold tracking-tighter leading-none mb-6">
            Share the moments<br />that matter.
          </h1>
          <p className="mx-auto max-w-md text-xl text-white/80 mb-10">
            The easiest way to keep your family’s photos together.
            This is an early, minimal prototype.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={scrollToSignup}
              className="w-full sm:w-auto rounded-full bg-white px-9 py-4 text-lg font-semibold text-stone-900 hover:bg-stone-100 active:bg-white transition shadow-xl"
            >
              Create your free account
            </button>
            <button
              onClick={() => handleNavClick("Watch demo")}
              className="w-full sm:w-auto rounded-full border border-white/40 px-8 py-4 text-lg font-medium hover:bg-white/10 transition"
            >
              Watch 30s demo
            </button>
          </div>
          <p className="mt-6 text-xs text-white/50">No credit card required • Takes 10 seconds</p>
        </div>
      </section>

      {/* The ONLY working feature on the entire site */}
      <section id="signup-section" className="mx-auto max-w-2xl px-6 pt-16 pb-12">
        {isLoadingAuth ? (
          <div className="text-center py-12">
            <div className="text-stone-500">Loading...</div>
          </div>
        ) : !user ? (
          <div>
            <div className="text-center mb-8">
              <div className="text-emerald-600 text-sm font-semibold tracking-widest mb-2">STEP 1 OF 1 (FOR NOW)</div>
              <h2 className="text-4xl font-semibold tracking-tight">
                {authMode === 'signup' ? 'Create your account' : 'Sign in to your account'}
              </h2>
              <p className="mt-3 text-lg text-stone-600">
                {authMode === 'signup' 
                  ? 'This is the only fully working part of the prototype.' 
                  : 'Welcome back! Sign in to continue.'}
              </p>
            </div>

            {/* Auth Mode Toggle - Option A */}
            <div className="flex mb-6 rounded-2xl border border-stone-200 bg-stone-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setFormError('');
                }}
                className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${
                  authMode === 'signup' 
                    ? 'bg-white text-stone-900 shadow-sm' 
                    : 'text-stone-600 hover:text-stone-800'
                }`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setFormError('');
                  setName(''); // Clear name when switching to signin
                }}
                className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${
                  authMode === 'signin' 
                    ? 'bg-white text-stone-900 shadow-sm' 
                    : 'text-stone-600 hover:text-stone-800'
                }`}
              >
                Sign In
              </button>
            </div>

            <div className="rounded-3xl border border-stone-200 bg-white p-8 md:p-10 shadow-sm">
              <form onSubmit={authMode === 'signup' ? handleCreateAccount : handleSignIn} className="space-y-6">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Full name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Rivera"
                      className="w-full rounded-2xl border border-stone-300 px-5 py-3.5 text-lg placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@family.com"
                    className="w-full rounded-2xl border border-stone-300 px-5 py-3.5 text-lg placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-2xl border border-stone-300 px-5 py-3.5 text-lg placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    required
                  />
                  <p className="mt-1.5 text-xs text-stone-500">
                    {authMode === 'signup' 
                      ? "We'll use this to let you sign in later." 
                      : "Enter your password to sign in."}
                  </p>
                </div>

                {formError && (
                  <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 w-full rounded-2xl bg-emerald-600 py-4 text-lg font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-70 transition flex items-center justify-center gap-2"
                >
                  {isSubmitting 
                    ? (authMode === 'signup' ? "Creating your account..." : "Signing in...") 
                    : (authMode === 'signup' ? "Create free account" : "Sign in")}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-stone-500">
                By continuing you agree to our (non-existent) Terms — it’s just a prototype.
              </p>
            </div>
          </div>
        ) : (
          /* POST-SIGNUP PROTOTYPE DASHBOARD VIEW - Timeline Style */
          <div className="space-y-8">
            {showSuccess && (
              <div className="rounded-3xl bg-emerald-600 text-white px-6 py-5 text-center text-lg font-medium shadow">
                Welcome to PhotoShare, {user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split('@')[0]}! 🎉
              </div>
            )}

            <div className="flex items-end justify-between">
              <div>
                <div className="uppercase tracking-[3px] text-xs text-emerald-700 font-semibold">Welcome back</div>
                <h2 className="text-4xl font-semibold tracking-tighter">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                </h2>
              </div>
              <button
                onClick={handleSignOut}
                className="text-sm font-medium text-stone-500 hover:text-stone-700 underline underline-offset-4"
              >
                Sign out of demo
              </button>
            </div>

            {/* Original Family Photo as a special pinned post */}
            <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
              <div className="relative">
                <Image
                  src={FAMILY_PHOTO_URL}
                  alt={FAMILY_PHOTO_ALT}
                  width={1400}
                  height={875}
                  className="w-full aspect-[16/10] object-cover"
                  priority
                />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="font-semibold">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</div>
                  <div className="text-xs text-stone-500">• Family photo</div>
                </div>
                <p className="text-stone-700">The whole family at the lake. Our favorite place.</p>
              </div>
            </div>

            {/* Upload Button + Timeline Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold tracking-tight">Your Timeline</h3>
                <p className="text-sm text-stone-500">
                  {posts.length} post{posts.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={openUploadModal}
                disabled={isUploading || posts.length >= MAX_POSTS}
                className="flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                + Create post
              </button>
            </div>

            {/* Timeline Feed */}
            {posts.length > 0 ? (
              <div className="space-y-6">
                {posts.map((post) => (
                  <div key={post.id} className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden">
                    {/* Post Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-semibold">
                          {(user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</div>
                          <div className="text-xs text-stone-500">
                            {new Date(post.created_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setPostToDelete(post.id)}
                        className="text-stone-400 hover:text-red-500 p-1 rounded-full hover:bg-stone-100 transition"
                        title="Delete post"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6h12v12" />
                        </svg>
                      </button>
                    </div>

                    {/* Photo */}
                    <div className="bg-stone-100">
                      <img
                        src={post.image_url}
                        alt={post.description || "Uploaded photo"}
                        className="w-full max-h-[520px] object-contain bg-white"
                      />
                    </div>

                    {/* Caption */}
                    <div className="px-5 py-4">
                      <div className="flex gap-2">
                        <span className="font-semibold">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</span>
                        <span className="text-stone-700 whitespace-pre-wrap">{post.description || ""}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-stone-200 rounded-3xl p-10 text-center bg-white">
                <div className="text-5xl mb-4">📷</div>
                <p className="font-medium text-lg">Your timeline is empty</p>
                <p className="text-stone-500 mt-2 max-w-xs mx-auto">
                  Share your first photo with a caption. It will appear here like a social media post.
                </p>
                <button
                  onClick={openUploadModal}
                  className="mt-6 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                >
                  Create your first post
                </button>
              </div>
            )}

            <div className="text-center text-sm text-stone-500 max-w-sm mx-auto pt-2">
              Posts are saved in your browser only. Great for testing the feel of the app.
            </div>
          </div>
        )}
      </section>

      {/* Upload Post Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-lg">Create new post</h3>
              <button onClick={closeUploadModal} className="text-stone-400 hover:text-stone-600 text-2xl leading-none">×</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Image Preview or Upload Prompt */}
              {previewUrl ? (
                <div className="relative rounded-2xl overflow-hidden border border-stone-200">
                  <img src={previewUrl} alt="Preview" className="w-full max-h-[320px] object-contain bg-stone-100" />
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-3 right-3 bg-white/90 text-xs px-3 py-1 rounded-full shadow"
                  >
                    Change photo
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-stone-300 rounded-2xl py-12 cursor-pointer hover:border-stone-400 transition">
                  <div className="text-5xl mb-3">📷</div>
                  <div className="font-medium">Choose a photo</div>
                  <div className="text-xs text-stone-500 mt-1">JPG or PNG up to 5MB</div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelectForModal}
                    className="hidden"
                  />
                </label>
              )}

              {/* Description / Caption */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Write a caption</label>
                <textarea
                  value={postDescription}
                  onChange={(e) => setPostDescription(e.target.value)}
                  placeholder="What’s happening in this photo?"
                  rows={3}
                  className="w-full resize-y rounded-2xl border border-stone-300 px-4 py-3 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-5 py-4 border-t bg-stone-50">
              <button
                onClick={closeUploadModal}
                className="flex-1 rounded-2xl border border-stone-300 py-3 text-sm font-medium hover:bg-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePost}
                disabled={!selectedFile || isUploading}
                className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                {isUploading ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {postToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-xl">
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.595-1.858L5 7m5 4v6m4-6v6m1-10V9a1 1 0 00-1-1H9a1 1 0 00-1 1v1m-2 0h10" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-stone-900">Delete post?</h3>
              <p className="mt-2 text-sm text-stone-600">
                Are you sure? This cannot be undone.
              </p>
            </div>

            <div className="flex border-t">
              <button
                onClick={() => setPostToDelete(null)}
                className="flex-1 py-4 text-sm font-medium text-stone-700 hover:bg-stone-50 transition"
              >
                Cancel
              </button>
              <div className="w-px bg-stone-200" />
              <button
                onClick={() => {
                  if (postToDelete) {
                    deletePost(postToDelete);
                  }
                  setPostToDelete(null);
                }}
                className="flex-1 py-4 text-sm font-semibold text-red-600 hover:bg-red-50 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Static prototype sections below (no real links) */}
      <div className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="text-center mb-12">
            <div className="text-emerald-700 text-sm font-semibold tracking-[2px]">HOW IT WILL WORK</div>
            <h3 className="mt-3 text-4xl font-semibold tracking-tight">Simple by design</h3>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { step: "01", title: "Create your space", desc: "Sign up in seconds. No complex setup." },
              { step: "02", title: "Add your photos", desc: "Upload from your phone or computer. One tap." },
              { step: "03", title: "Share with family", desc: "Invite anyone. They can view and add too." },
            ].map((item, index) => (
              <div key={index} className="rounded-3xl border border-stone-200 p-8">
                <div className="text-5xl font-semibold tracking-tighter text-stone-200 mb-6">{item.step}</div>
                <div className="text-2xl font-semibold tracking-tight mb-3">{item.title}</div>
                <p className="text-stone-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Another inert section for visual weight */}
      <div className="bg-stone-100 border-t border-stone-200">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h4 className="text-3xl font-semibold tracking-tight mb-4">Loved by families</h4>
          <p className="text-stone-600 max-w-sm mx-auto mb-10">
            Real stories will go here once we have real users.
          </p>

          <div className="flex flex-wrap justify-center gap-4 text-sm">
            {["The Rivera Family", "Chen + Kids", "The Patels", "Grandma & Us"].map((name, i) => (
              <div
                key={i}
                onClick={() => showToast("Family stories coming soon")}
                className="cursor-pointer rounded-2xl bg-white border border-stone-200 px-5 py-2 hover:border-stone-300 active:bg-stone-50 transition"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-12 text-sm text-stone-500">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-y-4">
          <div>© {new Date().getFullYear()} PhotoShare (very early prototype)</div>
          <div className="flex gap-6">
            <button onClick={() => handleNavClick("Privacy")} className="hover:text-stone-700">Privacy</button>
            <button onClick={() => handleNavClick("Terms")} className="hover:text-stone-700">Terms</button>
            <button onClick={() => handleNavClick("Contact")} className="hover:text-stone-700">Contact</button>
          </div>
          <div className="text-xs">Built as a starting point • Next.js + Vercel ready</div>
        </div>
      </footer>
    </div>
  );
}
