import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { RequireProfile } from "@/components/RequireProfile";
import { useStore } from "@/lib/store";
import { formatINR } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { createBackendRazorpayOrder, verifyPaymentSignature } from "@/lib/razorpay";
import { Heart, MessageCircle, ShieldCheck, ArrowLeft, BadgeCheck, Truck, ChevronLeft, ChevronRight, Smartphone, Sparkles, CreditCard, Lock, Trash2 } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";


export const Route = createFileRoute("/product/$id")({
  component: () => <RequireProfile><ProductDetails /></RequireProfile>,
});

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}



function ProductDetails() {
  const { id } = useParams({ from: "/product/$id" });
  const navigate = useNavigate();
  const { allProducts, isWishlisted, toggleWishlist, user, profile, deleteProduct } = useStore();
  const [fetchedProduct, setFetchedProduct] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const product = allProducts.find((p) => p.id === id) || fetchedProduct;
  const isOwn = user?.id === product?.seller_id;

  useEffect(() => {
    if (!product && id) {
      supabase.from("products").select("*").eq("id", id).maybeSingle().then(async ({ data }) => {
        if (data) {
          const { data: prof } = await supabase.from("profiles").select("name, department, year").eq("id", data.seller_id).maybeSingle();
          let images: string[] = [];
          if (data.image_url) {
            try {
              const parsed = JSON.parse(data.image_url);
              images = Array.isArray(parsed) ? parsed : [parsed];
            } catch {
              images = [data.image_url];
            }
          }
          setFetchedProduct({
            id: data.id,
            name: data.name,
            price: data.price,
            image: images[0] || "",
            images: images,
            seller: prof?.name || "Student",
            seller_id: data.seller_id,
            department: prof ? `${prof.department}, ${prof.year}` : "",
            condition: data.condition,
            category: data.category,
            description: data.description || "",
            created_at: data.created_at,
          });
        }
      });
    }
  }, [id, product]);

  async function handleDelete() {
    if (!product || !user || !isOwn) return;
    if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      setDeleting(true);
      await deleteProduct(product.id);
      navigate({ to: "/marketplace" });
    }
  }

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedApp, setSelectedApp] = useState<string>("phonepe");
  const [upiIdInput, setUpiIdInput] = useState<string>("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  if (!product) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl py-20 text-center">
          <h1 className="text-2xl font-bold">Product not found</h1>
          <Link to="/marketplace" className="mt-4 inline-block text-brand-2 hover:underline">Back to marketplace</Link>
        </div>
      </AppShell>
    );
  }

  const related = allProducts.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);
  const wished = isWishlisted(product.id);
  const productImages = product.images && product.images.length > 0 ? product.images : (product.image ? [product.image] : []);


  async function chatWithSeller() {
    if (!user || isOwn) return;
    try {
      const { data: existing } = await supabase
        .from("chats").select("id")
        .eq("product_id", product!.id).eq("buyer_id", user.id).maybeSingle();
      let chatId = existing?.id;
      if (!chatId) {
        const { data: created, error: createErr } = await supabase.from("chats").insert({
          product_id: product!.id, buyer_id: user.id, seller_id: product!.seller_id,
        }).select("id").single();
        if (!createErr && created) {
          chatId = created.id;
        }
      }
      
      const targetId = chatId || `chat_${product!.id}_${user.id}`;
      navigate({ to: "/chat", search: { id: targetId } });
    } catch (e) {
      console.warn("Chat creation error fallback:", e);
      const fallbackId = `chat_${product!.id}_${user.id}`;
      navigate({ to: "/chat", search: { id: fallbackId } });
    }
  }


  async function completeOrder() {
    if (!user || isOwn) return;
    await supabase.from("orders").insert({
      product_id: product!.id, buyer_id: user.id, seller_id: product!.seller_id,
    });
    navigate({ to: "/order-success", search: { id: product!.id } });
  }

  async function handleRazorpayCheckout(preferredApp?: string) {
    if (!user || isOwn || paying) return;
    setPaying(true);

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      alert("Failed to load Razorpay SDK. Please check your internet connection.");
      setPaying(false);
      return;
    }

    try {
      // 1. Create official Razorpay Order ID securely from backend (RAZORPAY_KEY_SECRET never in frontend)
      console.log(`[Checkout Flow]: Requesting backend order creation for amount ₹${product!.price}...`);
      const orderRes = await createBackendRazorpayOrder(product!.price, `product_${product!.id}`);
      
      if (!orderRes.ok || !orderRes.order_id) {
        console.error("[Razorpay Backend Order Error]:", orderRes.error, orderRes.details);
        alert(`Payment error: ${orderRes.error || "Could not initialize Razorpay order."}`);
        setPaying(false);
        return;
      }

      console.log(`[Checkout Flow]: Backend Order ID received: ${orderRes.order_id}. Opening Razorpay Standard Checkout...`);


      // 2. Configure Razorpay Standard Checkout Modal
      const options = {
        key: orderRes.key_id,
        order_id: orderRes.order_id,
        amount: orderRes.amount,
        currency: orderRes.currency || "INR",
        name: "Campus Mart",
        description: `Purchase: ${product!.name}`,
        image: "https://campusmart.app/logo.png",
        handler: async function (response: any) {
          console.log("[Razorpay Checkout Success Response]:", response);
          // 3. Server-side payment verification & DB order insertion
          const verifyRes = await verifyBackendRazorpayPayment({
            razorpay_order_id: response.razorpay_order_id || orderRes.order_id,
            razorpay_payment_id: response.razorpay_payment_id || `pay_${Date.now()}`,
            razorpay_signature: response.razorpay_signature || "",
            product_id: product!.id,
            buyer_id: user.id,
            seller_id: product!.seller_id,
          });

          if (verifyRes.ok) {
            navigate({ to: "/order-success", search: { id: product!.id } });
          } else {
            alert(`Payment verification notice: ${verifyRes.error || "Please contact support."}`);
            setPaying(false);
          }
        },
        prefill: {
          name: profile?.name || "",
          email: user.email || "",
          contact: profile?.phone || "",
        },
        theme: {
          color: "#6366f1",
        },
        modal: {
          ondismiss: function () {
            setPaying(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (resp: any) {
        alert(`Razorpay payment failed: ${resp.error.description}`);
        setPaying(false);
      });
      rzp.open();
    } catch (e: any) {
      console.error("Razorpay Checkout initialization error:", e);
      alert("Payment error: " + (e?.message || "Please try again."));
      setPaying(false);
    }
  }



  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        <Link to="/marketplace" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Marketplace
        </Link>

        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8">
          {/* Left Gallery */}
          <div className="card-soft p-4 sm:p-6 space-y-4">
            <div className="relative aspect-square rounded-2xl bg-muted overflow-hidden flex items-center justify-center">
              {productImages.length > 0 ? (
                <img src={productImages[activeImageIdx]} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="text-muted-foreground text-sm">No Image Provided</div>
              )}

              {productImages.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImageIdx((prev) => (prev === 0 ? productImages.length - 1 : prev - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setActiveImageIdx((prev) => (prev === productImages.length - 1 ? 0 : prev + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail selector */}
            {productImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {productImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`h-16 w-16 rounded-xl overflow-hidden border-2 shrink-0 transition ${
                      activeImageIdx === idx ? "border-brand-2 shadow-md" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt={`Thumb ${idx + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Product Details & Banking App Selector */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-orange">{product.category}</div>
            <h1 className="mt-2 text-3xl font-bold">{product.name}</h1>
            <div className="mt-4 flex items-baseline gap-3">
              <div className="text-4xl font-extrabold">{formatINR(product.price)}</div>
              <div className="text-sm text-muted-foreground">incl. all taxes</div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Badge>Condition: {product.condition}</Badge>
              <Badge>Campus Pickup</Badge>
              <Badge>Verified Student</Badge>
            </div>

            <p className="mt-6 text-muted-foreground leading-relaxed">{product.description}</p>

            <div className="mt-6 card-soft p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full gradient-brand flex items-center justify-center text-primary-foreground font-bold">
                {product.seller.split(" ").map((s) => s[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0">
                <div className="font-semibold flex items-center gap-1.5">{product.seller} <BadgeCheck className="h-4 w-4 text-brand-2" /></div>
                <div className="text-xs text-muted-foreground truncate">{product.department}</div>
              </div>
            </div>

            {!isOwn && (
              <div className="mt-6 space-y-4">
                {/* Official Razorpay Standard Checkout Trigger Block */}
                <div className="card-soft p-5 border border-brand-2/20 bg-accent/10 rounded-2xl space-y-3">
                  <button
                    id="razorpay-pay-btn"
                    onClick={() => handleRazorpayCheckout()}
                    disabled={paying}
                    className="w-full h-14 rounded-2xl gradient-brand text-primary-foreground font-bold text-base flex items-center justify-center gap-3 shadow-lg hover:opacity-95 hover:scale-[1.01] transition disabled:opacity-60"
                  >
                    <CreditCard className="h-5 w-5" />
                    {paying ? "Opening Secure Checkout…" : `Pay ${formatINR(product.price)} with Razorpay`}
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-1">
                    <Lock className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Official 256-bit SSL Encrypted Razorpay Checkout</span>
                  </div>
                </div>


                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button onClick={chatWithSeller} className="h-12 rounded-xl border border-border bg-card hover:bg-muted font-semibold flex items-center justify-center gap-2 transition">
                    <MessageCircle className="h-4 w-4 text-brand-2" /> Chat with Seller
                  </button>
                  <button onClick={() => toggleWishlist(product.id)} className="h-12 rounded-xl border border-border bg-card hover:bg-muted font-medium flex items-center justify-center gap-2 transition">
                    <Heart className={`h-4 w-4 ${wished ? "fill-orange text-orange" : ""}`} />
                    {wished ? "Saved to Wishlist" : "Add to Wishlist"}
                  </button>
                </div>
              </div>
            )}


            {isOwn && (
              <div className="mt-6 card-soft p-5 border border-amber-500/20 bg-amber-500/5 rounded-2xl flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="font-semibold text-sm">Your Listing</div>
                  <div className="text-xs text-muted-foreground mt-0.5">You posted this item on Campus Mart.</div>
                </div>
                <button
                  id="delete-listing-btn"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="h-11 px-4 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-destructive-foreground text-sm font-semibold flex items-center gap-2 transition shadow-xs disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? "Deleting…" : "Delete Listing"}
                </button>
              </div>
            )}


            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <Perk icon={ShieldCheck} title="Safe Trade" desc="Verified students only" />
              <Perk icon={Truck} title="Campus Pickup" desc="Meet on campus, no shipping" />
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-bold mb-4">You may also like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent text-accent-foreground">{children}</span>;
}
function Perk({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="card-soft p-4 flex items-start gap-3">
      <Icon className="h-5 w-5 text-brand-2 shrink-0 mt-0.5" />
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}
