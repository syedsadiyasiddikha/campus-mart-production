import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "./data";

export type Profile = {
  photo?: string;
  name: string;
  email: string;
  department: string;
  year: string;
  phone: string;
  residence: "Hostel" | "Day Scholar";
  bio: string;
};

type State = {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  products: Product[];
  wishlist: string[];
  loading: boolean;
};

export function getProductionUrl(): string {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }
  return import.meta.env.VITE_SITE_URL || "https://campus-mart-production.vercel.app";
}

// Cached profile key for fast initial load
const LS_KEY_PROFILE = "campus_mart_profile_cache";

const LS_KEY_PRODUCTS = "campus_mart_products_cache";

let state: State = { user: null, profile: null, products: [], wishlist: [], loading: true };
let initialized = false;
const listeners = new Set<() => void>();

function getStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStored(key: string, value: any) {
  if (typeof window === "undefined") return;
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Storage notice:", e);
  }
}

function deduplicateProducts(list: Product[]): Product[] {
  const byId = new Map<string, Product>();

  for (const p of list) {
    if (!byId.has(p.id)) {
      byId.set(p.id, p);
    }
  }

  return Array.from(byId.values());
}



function setState(patch: Partial<State>) {
  if (patch.products) {
    patch.products = deduplicateProducts(patch.products);
  }
  state = { ...state, ...patch };
  if (patch.profile !== undefined) setStored(LS_KEY_PROFILE, patch.profile);
  if (patch.products !== undefined) setStored(LS_KEY_PRODUCTS, patch.products);
  listeners.forEach((l) => l());
}

function mapProductRow(r: any): Product {
  let images: string[] = [];
  if (r.image_url) {
    try {
      const parsed = JSON.parse(r.image_url);
      if (Array.isArray(parsed)) images = parsed;
      else if (typeof parsed === "string") images = [parsed];
    } catch {
      images = [r.image_url];
    }
  }

  const isSold = Boolean(r.sold) || r.quantity === 0;
  const qty = r.quantity !== undefined ? Number(r.quantity) : (isSold ? 0 : 1);

  return {
    id: r.id,
    name: r.name,
    price: r.price,
    image: images[0] ?? "",
    images: images,
    seller: r.profiles?.name ?? "Student",
    seller_id: r.seller_id,
    department: r.profiles ? `${r.profiles.department ?? ""}${r.profiles.year ? ", " + r.profiles.year : ""}` : "",
    condition: r.condition,
    category: r.category,
    description: r.description ?? "",
    created_at: r.created_at,
    sold: isSold,
    quantity: qty,
  };
}


async function loadProfile(userId: string, email: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase.rpc("get_my_profile");
    if (!error && data) {
      const row: any = Array.isArray(data) ? data[0] : data;
      if (row && row.name) {
        const prof: Profile = {
          photo: row.photo_url ?? undefined,
          name: row.name,
          email: email,
          department: row.department ?? "",
          year: row.year ?? "1st Year",
          phone: row.phone ?? "",
          residence: (row.residence as Profile["residence"]) ?? "Hostel",
          bio: row.bio ?? "",
        };
        return prof;
      }
    }
  } catch (e) {
    console.warn("Supabase get_my_profile notice:", e);
  }

  // Fallback to cached profile if available
  const cachedProf = getStored<Profile | null>(LS_KEY_PROFILE, null);
  if (cachedProf && cachedProf.email === email) return cachedProf;

  // Default initial profile for authenticated user
  const fallbackName = email.split("@")[0] || "Student";
  return {
    name: fallbackName,
    email: email,
    department: "Engineering",
    year: "1st Year",
    phone: "",
    residence: "Hostel",
    bio: "",
  };
}

async function attachSellers(rows: any[]): Promise<any[]> {
  const ids = Array.from(new Set(rows.map((r) => r.seller_id).filter(Boolean)));
  if (ids.length === 0) return rows;
  try {
    const { data: profs } = await supabase.from("profiles").select("id, name, department, year").in("id", ids);
    const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return rows.map((r) => ({ ...r, profiles: byId.get(r.seller_id) ?? null }));
  } catch {
    return rows;
  }
}

export async function refreshProducts() {
  const cachedProducts = getStored<Product[]>(LS_KEY_PRODUCTS, []);
  console.log(`[DIAGNOSTIC] refreshProducts Called | Time: ${new Date().toISOString()}`);
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      const rows = await attachSellers(data);
      const fetched = rows.map(mapProductRow);
      console.log(`[DIAGNOSTIC] refreshProducts Fetched From DB | Count: ${fetched.length}`);
      const cleanList = deduplicateProducts(fetched);
      setState({ products: cleanList });
      return;
    }

  } catch (e) {
    console.warn("[DIAGNOSTIC] Supabase products fetch notice:", e);
  }

  if (cachedProducts.length > 0) {
    console.log(`[DIAGNOSTIC] refreshProducts Using Local Cache | Count: ${cachedProducts.length}`);
    setState({ products: deduplicateProducts(cachedProducts) });
  }
}

async function refreshWishlist(userId: string) {
  try {
    const { data, error } = await supabase.from("wishlists").select("product_id").eq("user_id", userId);
    if (!error && data) {
      setState({ wishlist: data.map((r: any) => r.product_id) });
      return;
    }
  } catch {}
}

async function handleSession(session: any) {
  if (session?.user) {
    const userObj = { id: session.user.id, email: session.user.email ?? "" };
    const profileObj = await loadProfile(session.user.id, userObj.email);
    setState({ user: userObj, profile: profileObj });
    await refreshWishlist(session.user.id);
  } else {
    setState({ user: null, profile: null, wishlist: [] });
  }
}

async function bootstrap() {
  // Instant load from local cache for 0ms initial render
  const cachedProducts = getStored<Product[]>(LS_KEY_PRODUCTS, []);
  if (cachedProducts.length > 0) {
    setState({ products: deduplicateProducts(cachedProducts), loading: false });
  } else {
    setState({ loading: false });
  }

  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session) {
      handleSession(data.session);
    }
  } catch (e) {
    console.warn("Supabase getSession notice:", e);
  }

  refreshProducts();
}


function initOnce() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  bootstrap();

  // Listen for Supabase Auth state changes (SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT)
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log("[Supabase Auth Event]:", event);
    if (event === "SIGNED_OUT") {
      setState({ user: null, profile: null, wishlist: [] });
      setStored(LS_KEY_PROFILE, null);
    } else if (session) {
      await handleSession(session);
    }
  });
}

const uploadedFileUrls = new WeakMap<File, string>();
let addProductInFlight: Promise<{ ok: true; product: Product } | { ok: false; error: string }> | null = null;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

async function uploadImage(bucket: string, userId: string, file: File): Promise<{ url: string | null; error?: string }> {
  const cached = uploadedFileUrls.get(file);
  if (cached) return { url: cached };
  try {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (!error) {
      const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      const url = data?.signedUrl ?? null;
      if (url) {
        uploadedFileUrls.set(file, url);
        return { url };
      }
    }
  } catch (e: any) {
    console.warn("Storage upload notice:", e);
  }
  const dataUrl = await fileToDataUrl(file);
  return { url: dataUrl };
}

export function useStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    initOnce();
    const l = () => setTick((t) => t + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  const toggleWishlist = useCallback(async (productId: string) => {
    if (!state.user) return;
    const uid = state.user.id;
    let nextW: string[] = [];
    if (state.wishlist.includes(productId)) {
      nextW = state.wishlist.filter((x) => x !== productId);
    } else {
      nextW = [...state.wishlist, productId];
    }
    setState({ wishlist: nextW });
    try {
      if (state.wishlist.includes(productId)) {
        await supabase.from("wishlists").delete().eq("user_id", uid).eq("product_id", productId);
      } else {
        await supabase.from("wishlists").insert({ user_id: uid, product_id: productId });
      }
    } catch {}
  }, []);

  const addProduct = useCallback(async (input: {
    name: string; price: number; category: string; condition: Product["condition"]; description: string; imageFile?: File | null; imageFiles?: File[];
  }): Promise<{ ok: true; product: Product } | { ok: false; error: string }> => {
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    console.log(`[DIAGNOSTIC] addProduct Invoked | RunID: ${runId} | Time: ${new Date().toISOString()}`);

    if (addProductInFlight) {
      console.warn(`[DIAGNOSTIC] addProduct Blocked (In-Flight Active) | RunID: ${runId}`);
      return addProductInFlight;
    }

    const run = async (): Promise<{ ok: true; product: Product } | { ok: false; error: string }> => {
      if (!state.user) {
        return { ok: false, error: "You must be logged in to post a listing." };
      }

      const uid = state.user.id;
      const sellerName = state.profile?.name || "Student Seller";
      const deptInfo = state.profile ? `${state.profile.department}, ${state.profile.year}` : "Campus";

      let imageUrls: string[] = [];
      const filesToUpload = input.imageFiles && input.imageFiles.length > 0 ? input.imageFiles : (input.imageFile ? [input.imageFile] : []);
      
      console.log(`[DIAGNOSTIC] Uploading ${filesToUpload.length} image(s) | RunID: ${runId}`);
      for (const f of filesToUpload) {
        const uploadRes = await uploadImage("product-images", uid, f);
        if (uploadRes.url) imageUrls.push(uploadRes.url);
      }

      const newProduct: Product = {
        id: `prod_${Date.now()}`,
        name: input.name,
        price: input.price,
        image: imageUrls[0] ?? "",
        images: imageUrls,
        seller: sellerName,
        seller_id: uid,
        department: deptInfo,
        condition: input.condition,
        category: input.category,
        description: input.description,
        created_at: new Date().toISOString(),
      };

      try {
        const finalImageValue = imageUrls.length > 0 ? JSON.stringify(imageUrls) : null;
        console.log(`[DIAGNOSTIC] Sending DB Insert Request | RunID: ${runId} | Name: "${input.name}"`);
        const { data, error } = await supabase.from("products").insert({
          seller_id: uid,
          name: input.name,
          price: input.price,
          image_url: finalImageValue,
          condition: input.condition,
          category: input.category,
          description: input.description,
        }).select("*").single();

        console.log(`[DIAGNOSTIC] DB Insert Complete | RunID: ${runId} | Error: ${error ? error.message : "None"} | Returned DB ID: ${data?.id ?? "None"}`);

        if (!error && data) {
          const [row] = await attachSellers([data]);
          const dbProduct = mapProductRow(row);
          const updated = deduplicateProducts([dbProduct, ...state.products]);
          setState({ products: updated });
          return { ok: true, product: dbProduct };
        } else if (error) {
          console.warn("[DIAGNOSTIC] Database Insert Error:", error);
          // If table is missing or RLS fails, fail cleanly instead of silently adding duplicate local fallback records
          return { ok: false, error: `Database error: ${error.message}` };
        }
      } catch (e: any) {
        console.warn("[DIAGNOSTIC] Supabase products insert exception:", e);
        return { ok: false, error: e?.message ?? "Database connection error." };
      }

      console.log(`[DIAGNOSTIC] Using Local Product Fallback | RunID: ${runId}`);
      const updatedProducts = deduplicateProducts([newProduct, ...state.products]);
      setState({ products: updatedProducts });
      return { ok: true, product: newProduct };

    };

    addProductInFlight = run();
    try {
      return await addProductInFlight;
    } finally {
      addProductInFlight = null;
    }
  }, []);


  const signUp = useCallback(async (name: string, email: string, password: string): Promise<{ ok: true; isConfirmationRequired?: boolean } | { ok: false; error: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    const userName = name.trim() || "Student";
    const redirectUrl = `${getProductionUrl()}/auth`;

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: { name: userName },
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      if (error.message.includes("User already registered") || error.message.includes("already registered")) {
        return { ok: false, error: "An account with this email address already exists. Please log in instead." };
      }
      return { ok: false, error: error.message };
    }

    if (data?.session) {
      await handleSession(data.session);
      return { ok: true };
    }

    if (data?.user) {
      return { ok: true, isConfirmationRequired: true };
    }

    return { ok: true };
  }, []);


  const signIn = useCallback(async (email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> => {
    const trimmedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error) return { ok: false, error: error.message };

    if (data?.session) {
      await handleSession(data.session);
    }
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setStored(LS_KEY_PROFILE, null);
    setState({ user: null, profile: null, wishlist: [] });
  }, []);

  const saveProfile = useCallback(async (profile: Profile & { photoFile?: File | null }) => {
    if (!state.user) return;
    const uid = state.user.id;
    let photoUrl = profile.photo;
    if (profile.photoFile) {
      const res = await uploadImage("profile-photos", uid, profile.photoFile);
      if (res.url) photoUrl = res.url;
    }
    const updatedProf = { ...profile, photo: photoUrl };
    setState({ profile: updatedProf });

    try {
      const row = {
        id: uid,
        name: profile.name,
        photo_url: photoUrl ?? null,
        department: profile.department,
        year: profile.year,
        phone: profile.phone,
        residence: profile.residence,
        bio: profile.bio,
        updated_at: new Date().toISOString(),
      };
      await supabase.from("profiles").upsert(row);
      await refreshProducts();
    } catch (e) {
      console.warn("Save profile Supabase notice:", e);
    }
  }, []);

  const deleteProduct = useCallback(async (productId: string): Promise<{ ok: boolean; error?: string }> => {
    if (!state.user) return { ok: false, error: "Not authenticated" };

    const updated = state.products.filter((p) => p.id !== productId);
    setState({ products: updated });

    try {
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) console.warn("Supabase delete product notice:", error);
      return { ok: true };
    } catch (e: any) {
      console.warn("Delete product exception:", e);
      return { ok: true };
    }
  }, []);

  return {
    loading: state.loading,
    user: state.user,
    profile: state.profile,
    isAuthenticated: !!state.user,
    isProfileComplete: !!state.profile,
    allProducts: state.products,
    userProducts: state.products.filter((p) => p.seller_id === state.user?.id),
    wishlist: state.wishlist,
    isWishlisted: (id: string) => state.wishlist.includes(id),
    toggleWishlist,
    addProduct,
    deleteProduct,
    signUp,
    signIn,
    signOut,
    saveProfile,
    refreshProducts,
  };
}

