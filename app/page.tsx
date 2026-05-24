"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";

// ============================================
// PhotoShare — Minimal Prototype (v0)
// Only interactive feature: Create a user
// Everything else is non-functional visual prototype
// Real family photo now included in /public/images/
// ============================================

interface Photo {
  id: string;
  name: string;
  dataUrl: string; // base64 encoded image
  uploadedAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  photos?: Photo[];
}

// The user's actual family photo (added to the project)
const FAMILY_PHOTO_URL = "/images/IMG_7557.jpg";
const FAMILY_PHOTO_ALT = "Family photo";

type ToastMessage = {
  id: number;
  text: string;
};

export default function PhotoSharePrototype() {
  // --- Auth / User State (the only real feature) ---
  // Initialize directly from localStorage so we never call setState in an effect
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem("photoshare_demo_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI state for prototype
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // Photo upload state
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist user whenever it changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("photoshare_demo_user", JSON.stringify(currentUser));
    }
  }, [currentUser]);

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
  const handleCreateAccount = (e: React.FormEvent) => {
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
      setFormError("Password must be at least 6 characters (demo only).");
      return;
    }

    setIsSubmitting(true);

    // Simulate a tiny network delay (makes it feel real)
    setTimeout(() => {
      const newUser: User = {
        id: "user_" + Date.now().toString(36),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        createdAt: new Date().toISOString(),
      };

      setCurrentUser(newUser);
      setShowSuccess(true);

      // Clear form
      setName("");
      setEmail("");
      setPassword("");
      setFormError("");

      // After a short celebration, hide the raw success banner
      setTimeout(() => {
        setShowSuccess(false);
      }, 1400);

      setIsSubmitting(false);
    }, 420);
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    localStorage.removeItem("photoshare_demo_user");
    setShowSuccess(false);
    // Gentle reset of form fields for easy re-testing
    setName("");
    setEmail("");
    setPassword("");
    showToast("Signed out — demo data cleared for this browser");
  };

  // ============================================
  // Photo Upload Feature (Prototype - Client Side)
  // ============================================

  const MAX_PHOTOS = 8;

  const convertFileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const addPhotosFromFiles = async (files: FileList | File[]) => {
    if (!currentUser) return;

    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter((file) =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length === 0) {
      showToast("Please select image files (JPG, PNG, etc.)");
      return;
    }

    const currentPhotos = currentUser.photos || [];
    if (currentPhotos.length + imageFiles.length > MAX_PHOTOS) {
      showToast(`You can upload up to ${MAX_PHOTOS} photos in this prototype`);
      return;
    }

    setIsUploading(true);

    try {
      const newPhotos: Photo[] = [];

      for (const file of imageFiles) {
        // Limit individual file size (~4MB after base64)
        if (file.size > 4 * 1024 * 1024) {
          showToast(`${file.name} is too large (max ~4MB)`);
          continue;
        }

        const dataUrl = await convertFileToDataUrl(file);

        newPhotos.push({
          // eslint-disable-next-line react-hooks/purity
          id: "photo_" + (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)),
          name: file.name,
          dataUrl,
          uploadedAt: new Date().toISOString(),
        });
      }

      if (newPhotos.length > 0) {
        const updatedUser: User = {
          ...currentUser,
          photos: [...currentPhotos, ...newPhotos],
        };
        setCurrentUser(updatedUser);
        showToast(
          newPhotos.length === 1
            ? "Photo added successfully"
            : `${newPhotos.length} photos added`
        );
      }
    } catch (error) {
      showToast("Something went wrong while uploading");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePhotoUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addPhotosFromFiles(e.target.files);
      // Reset input so same file can be selected again
      e.target.value = "";
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addPhotosFromFiles(e.dataTransfer.files);
    }
  };

  const deletePhoto = (photoId: string) => {
    if (!currentUser) return;

    const updatedPhotos = (currentUser.photos || []).filter((p) => p.id !== photoId);

    const updatedUser: User = {
      ...currentUser,
      photos: updatedPhotos.length > 0 ? updatedPhotos : undefined,
    };

    setCurrentUser(updatedUser);
    showToast("Photo deleted");
  };

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
            {currentUser ? (
              <div className="flex items-center gap-3 text-sm">
                <span className="hidden text-stone-600 md:inline">Hi, {currentUser.name.split(" ")[0]}</span>
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
        {!currentUser ? (
          <div>
            <div className="text-center mb-8">
              <div className="text-emerald-600 text-sm font-semibold tracking-widest mb-2">STEP 1 OF 1 (FOR NOW)</div>
              <h2 className="text-4xl font-semibold tracking-tight">Create your account</h2>
              <p className="mt-3 text-lg text-stone-600">This is the only fully working part of the prototype.</p>
            </div>

            <div className="rounded-3xl border border-stone-200 bg-white p-8 md:p-10 shadow-sm">
              <form onSubmit={handleCreateAccount} className="space-y-6">
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
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Password (demo)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-2xl border border-stone-300 px-5 py-3.5 text-lg placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    required
                  />
                  <p className="mt-1.5 text-xs text-stone-500">We don’t actually store passwords yet — this is a prototype.</p>
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
                  {isSubmitting ? "Creating your account..." : "Create free account"}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-stone-500">
                By continuing you agree to our (non-existent) Terms — it’s just a prototype.
              </p>
            </div>
          </div>
        ) : (
          /* POST-SIGNUP PROTOTYPE DASHBOARD VIEW */
          <div className="space-y-8">
            {showSuccess && (
              <div className="rounded-3xl bg-emerald-600 text-white px-6 py-5 text-center text-lg font-medium shadow">
                Welcome to PhotoShare, {currentUser.name.split(" ")[0]}! 🎉
              </div>
            )}

            <div className="flex items-end justify-between">
              <div>
                <div className="uppercase tracking-[3px] text-xs text-emerald-700 font-semibold">Welcome back</div>
                <h2 className="text-4xl font-semibold tracking-tighter">{currentUser.name}</h2>
              </div>
              <button
                onClick={handleSignOut}
                className="text-sm font-medium text-stone-500 hover:text-stone-700 underline underline-offset-4"
              >
                Sign out of demo
              </button>
            </div>

            {/* Family Photo (the original one the user added) */}
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
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 text-white">
                  <div className="text-sm opacity-80">Family photo • Your first memory</div>
                  <div className="text-2xl font-semibold tracking-tight">The whole family at the lake</div>
                </div>
              </div>
              <div className="px-6 py-4 text-sm text-stone-600 border-t">
                This photo came with your account. You can now add more photos below.
              </div>
            </div>

            {/* Photo Upload Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight">Your Photos</h3>
                  <p className="text-sm text-stone-500">
                    {(currentUser.photos?.length || 0)} photo{(currentUser.photos?.length || 0) !== 1 ? "s" : ""} • Max {MAX_PHOTOS} in this prototype
                  </p>
                </div>
                <button
                  onClick={handlePhotoUploadClick}
                  disabled={isUploading || (currentUser.photos?.length || 0) >= MAX_PHOTOS}
                  className="flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isUploading ? "Uploading..." : "+ Upload photos"}
                </button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileInputChange}
                className="hidden"
              />

              {/* Drag & Drop Upload Zone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={handlePhotoUploadClick}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all mb-6
                  ${dragActive 
                    ? "border-emerald-500 bg-emerald-50" 
                    : "border-stone-300 hover:border-stone-400 hover:bg-stone-50"
                  }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="text-4xl">📸</div>
                  <div>
                    <p className="font-medium text-stone-700">
                      {isUploading ? "Processing photos..." : "Drop photos here or click to upload"}
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      JPG, PNG • Up to ~4MB each • {MAX_PHOTOS} photos max
                    </p>
                  </div>
                </div>
              </div>

              {/* Uploaded Photos Grid */}
              {currentUser.photos && currentUser.photos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {currentUser.photos.map((photo) => (
                    <div key={photo.id} className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                      <div className="aspect-square relative bg-stone-100">
                        <img
                          src={photo.dataUrl}
                          alt={photo.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium truncate text-stone-700" title={photo.name}>
                          {photo.name}
                        </p>
                        <p className="text-xs text-stone-500">
                          {new Date(photo.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePhoto(photo.id);
                        }}
                        className="absolute top-2 right-2 bg-white/90 hover:bg-red-500 hover:text-white text-red-600 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition shadow"
                        title="Delete photo"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6h12v12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                /* Empty State */
                <div className="border border-stone-200 rounded-3xl p-8 text-center bg-white">
                  <div className="text-5xl mb-4">🖼️</div>
                  <p className="font-medium text-stone-700">No photos yet</p>
                  <p className="text-sm text-stone-500 mt-1">
                    Upload some photos to see them appear here.
                  </p>
                </div>
              )}
            </div>

            <div className="text-center text-sm text-stone-500 max-w-sm mx-auto pt-4">
              Photos are saved in your browser for this demo. They will disappear if you clear your browser data.
            </div>
          </div>
        )}
      </section>

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
