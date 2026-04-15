/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShoppingBag, 
  Share2, 
  CheckCircle2, 
  X, 
  Copy, 
  MessageCircle, 
  Star, 
  Leaf, 
  Palette, 
  Lock, 
  Zap,
  ChevronDown,
  Gift,
  Package,
  RefreshCw,
  User as UserIcon,
  Instagram
} from "lucide-react";
import { db } from "./lib/firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc,
  increment,
  onSnapshot, 
  query, 
  where,
  orderBy,
  limit,
  serverTimestamp,
  getDocFromServer
} from "firebase/firestore";
import { 
  fruits, 
  fruitColors,
  toppings, 
  sizes, 
  referralCodes, 
  testimonials, 
  QUITO_NAMES, 
  QUITO_BARRIOS,
  type Fruit,
  type Topping,
  type Size,
  type Testimonial
} from "./constants";
import { fruitArt, toppingArt } from "./lib/canvasArt";
import { lazy, Suspense } from "react";

const AdminPanel = lazy(() => import("./AdminPanel"));

// ─── TYPES ───
interface UserProfile {
  userId: string;
  referralCode: string;
  referralsCount: number;
  totalRewards: number;
  loyaltyPoints: number;
  phone?: string;
  referredFriends: string[];
  displayName?: string;
}

interface OrderRecord {
  id: string;
  userId: string;
  items: string;
  toppings: string;
  size: string;
  quantity: number;
  total: number;
  date: any;
}

interface Review {
  id: string;
  name: string;
  rating: number;
  text: string;
  date: string;
  avatar: string;
  uid?: string;
}

// ─── UTILS ───
const getAvatarColor = (name: string): string => {
  const charCodeSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = ['bg-purple-600', 'bg-pink-600', 'bg-amber-500', 'bg-green-600', 'bg-blue-600', 'bg-red-600'];
  return colors[charCodeSum % colors.length];
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

const generateUniqueCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "TYANGO";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const generateUserId = () => {
  return "USER_" + Math.random().toString(36).substring(2, 11).toUpperCase();
};

// ─── COMPONENTS ───
const FruitRain = () => {
  const fruits = ['🍓', '🥭', '🍉', '🍋', '🍇', '🍑'];
  return (
    <div className="fixed inset-0 pointer-events-none z-[299] overflow-hidden">
      {[...Array(20)].map((_, i) => {
        const fruit = fruits[Math.floor(Math.random() * fruits.length)];
        const left = Math.random() * 100;
        const duration = 1.5 + Math.random() * 1.5;
        const delay = Math.random();
        return (
          <div
            key={i}
            className="fixed text-2xl pointer-events-none"
            style={{
              left: `${left}%`,
              top: '-50px',
              animation: `fruitFall ${duration}s linear ${delay}s infinite`,
              opacity: 0.8,
              fontSize: '1.5rem'
            }}
          >
            {fruit}
          </div>
        );
      })}
    </div>
  );
};

const ReviewSkeleton = () => (
  <div className="p-8 bg-white/5 border border-white/10 rounded-[32px] space-y-6 flex flex-col justify-between">
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-3 h-3 animate-pulse bg-white/10 rounded-full" />
          ))}
        </div>
        <div className="w-16 h-2 animate-pulse bg-white/10 rounded-full" />
      </div>
      <div className="space-y-2 mt-2">
        <div className="h-3 w-full animate-pulse bg-white/10 rounded-full" />
        <div className="h-3 w-4/5 animate-pulse bg-white/10 rounded-full" />
        <div className="h-3 w-3/5 animate-pulse bg-white/10 rounded-full" />
      </div>
    </div>
    <div className="flex items-center gap-3 pt-4 border-t border-white/5">
      <div className="w-10 h-10 animate-pulse bg-white/10 rounded-full shrink-0" />
      <div className="space-y-2">
        <div className="h-2 w-20 animate-pulse bg-white/10 rounded-full" />
        <div className="h-2 w-16 animate-pulse bg-white/10 rounded-full" />
      </div>
    </div>
  </div>
);

// ─── MAIN APP ───
export default function App() {
  const [selectionMode, setSelectionMode] = useState<'individual' | 'mix'>('individual');
  const [selectedFruits, setSelectedFruits] = useState<Fruit[]>([]);
  const [selectedToppings, setSelectedToppings] = useState<Topping[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>("clasico");
  const [discountPct, setDiscountPct] = useState<number>(0);
  const [orderConfirmed, setOrderConfirmed] = useState<boolean>(false);
  const [referralMsg, setReferralMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const [referralInput, setReferralInput] = useState<string>("");
  const [appliedReferralCode, setAppliedReferralCode] = useState<string | null>(null);
  const [isLoyaltyRewardApplied, setIsLoyaltyRewardApplied] = useState(false);
  const LOYALTY_THRESHOLD = 50;
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string>("");
  const bagCanvasRef = useRef<HTMLCanvasElement>(null);
  const heroBagCanvasRef = useRef<HTMLCanvasElement>(null);
  const [totalOrders, setTotalOrders] = useState<number>(124);
  const [animatedOrders, setAnimatedOrders] = useState<number>(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [orderHistory, setOrderHistory] = useState<OrderRecord[]>([]);
  const [showReferralDashboard, setShowReferralDashboard] = useState<boolean>(false);
  const [showOrderSuccessAnimation, setShowOrderSuccessAnimation] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isReferralApplied, setIsReferralApplied] = useState<boolean>(false);
  
  // Live Feed State
  const [liveOrder, setLiveOrder] = useState<string>("");
  
  // Reviews state
  const [reviews, setReviews] = useState<Review[]>(
    testimonials.map((t, i) => ({
      id: `rev-${i}`,
      name: t.name,
      rating: 5,
      text: t.text,
      date: new Date().toISOString(),
      avatar: getInitials(t.name)
    }))
  );
  const [showReviewForm, setShowReviewForm] = useState<boolean>(false);
  const [newReview, setNewReview] = useState({ rating: 5, text: "", name: "" });
  const [isLoadingReviews, setIsLoadingReviews] = useState<boolean>(true);

  // Share Modal State
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [sharePlatform, setSharePlatform] = useState<'whatsapp' | 'twitter' | 'instagram' | null>(null);
  const [customShareText, setCustomShareText] = useState<string>("");

  // Quantity State
  const [quantity, setQuantity] = useState<number>(1);
  const [stockRemaining, setStockRemaining] = useState<number>(15);
  const [userPhone, setUserPhone] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    // Simulate stock decreasing slightly over time for urgency
    const interval = setInterval(() => {
      setStockRemaining(prev => {
        if (prev <= 3) return prev;
        return Math.random() > 0.7 ? prev - 1 : prev;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [deliveryTime, setDeliveryTime] = useState<string>("");
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");

  // Exit Intent State
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [exitCountdown, setExitCountdown] = useState<number>(300); // 5 minutes

  // Daily Offer Countdown State
  const [offerTimeLeft, setOfferTimeLeft] = useState<string>("");
  const [isOfferExpired, setIsOfferExpired] = useState<boolean>(false);

  // Configurator Progress Bar State
  const [showProgress, setShowProgress] = useState<boolean>(false);
  const configuratorRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowProgress(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    const target = document.getElementById("configurar");
    if (target) {
      configuratorRef.current = target;
      observer.observe(target);
    }

    return () => {
      if (configuratorRef.current) {
        observer.unobserve(configuratorRef.current);
      }
    };
  }, []);

  const currentStep = orderConfirmed 
    ? 4 
    : selectedToppings.length > 0 
      ? 3 
      : selectedFruits.length > 0 
        ? 2 
        : 1;

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      // Get current time in Quito (UTC-5)
      const quitoStr = now.toLocaleString("en-US", { timeZone: "America/Guayaquil" });
      const quitoTime = new Date(quitoStr);
      
      const midnight = new Date(quitoTime);
      midnight.setHours(24, 0, 0, 0);
      
      const diff = midnight.getTime() - quitoTime.getTime();
      
      if (diff <= 0) {
        setIsOfferExpired(true);
        setOfferTimeLeft("00:00:00");
      } else {
        const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        setOfferTimeLeft(`${h}:${m}:${s}`);
        setIsOfferExpired(false);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Dynamic Sizes State (for Admin toggles)
  const [dynamicSizes, setDynamicSizes] = useState<Record<string, Size>>(sizes);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "products"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const updated = { ...sizes };
        Object.keys(data).forEach(key => {
          if (updated[key]) {
            updated[key] = { ...updated[key], isSoldOut: !data[key] };
          }
        });
        setDynamicSizes(updated);
      }
    });
    return () => unsub();
  }, []);

  // Routing
  const isPathAdmin = window.location.pathname.includes("/admin");

  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    // Give a small delay to ensure smooth transition
    const timer = setTimeout(() => setIsAppLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "stats"), (docSnap) => {
      if (docSnap.exists()) {
        setTotalOrders(124 + (docSnap.data().totalOrders || 0));
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const stepTime = duration / steps;
    
    let current = 0;
    const target = totalOrders;
    const increment = target / steps;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setAnimatedOrders(target);
        clearInterval(timer);
      } else {
        setAnimatedOrders(Math.floor(current));
      }
    }, stepTime);
    
    return () => clearInterval(timer);
  }, [totalOrders]);

  // Initialize Local Profile and Data
  useEffect(() => {
    // Initialize or load local profile
    const savedProfile = localStorage.getItem("tyango_profile");
    if (savedProfile) {
      try {
        setUserProfile(JSON.parse(savedProfile));
      } catch (e) {
        console.error("Error parsing saved profile:", e);
        localStorage.removeItem("tyango_profile");
      }
    }
    
    if (!userProfile && !savedProfile) {
      const newProfile: UserProfile = {
        userId: generateUserId(),
        referralCode: generateUniqueCode(),
        referralsCount: 0,
        totalRewards: 0,
        loyaltyPoints: 0,
        referredFriends: [],
        displayName: "Cliente Tyango"
      };
      localStorage.setItem("tyango_profile", JSON.stringify(newProfile));
      setUserProfile(newProfile);

      // Defer registration to avoid blocking initial load
      const registerCode = async () => {
        try {
          // Small delay to let the app breathe
          await new Promise(r => setTimeout(r, 2000));
          await setDoc(doc(db, "referral_codes", newProfile.referralCode), {
            createdAt: serverTimestamp(),
            userId: newProfile.userId,
            uses: 0
          });
        } catch (e) {
          console.error("Error registering referral code:", e);
        }
      };
      registerCode();
    }

    // Load local order history
    const savedOrders = localStorage.getItem("tyango_orders");
    if (savedOrders) {
      try {
        setOrderHistory(JSON.parse(savedOrders));
      } catch (e) {
        console.error("Error parsing saved orders:", e);
        localStorage.removeItem("tyango_orders");
      }
    }
  }, []);

  // Real-time reviews
  useEffect(() => {
    const q = query(collection(db, "reviews"), orderBy("date", "desc"), limit(20));
    const unsubscribeReviews = onSnapshot(q, (snapshot) => {
      setIsLoadingReviews(false);
      const fetchedReviews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Review[];
      
      // If we have reviews in Firestore, use them. 
      // Otherwise, the state already has the initial testimonials.
      if (fetchedReviews.length > 0) {
        setReviews(fetchedReviews);
      }
    }, (error) => {
      console.error("Firestore Error (Reviews):", error);
    });

    return () => unsubscribeReviews();
  }, []);

  // Live Feed Logic
  useEffect(() => {
    const generateOrder = () => {
      const name = QUITO_NAMES[Math.floor(Math.random() * QUITO_NAMES.length)];
      const barrio = QUITO_BARRIOS[Math.floor(Math.random() * QUITO_BARRIOS.length)];
      const fruit = fruits[Math.floor(Math.random() * fruits.length)];
      const topping = toppings[Math.floor(Math.random() * toppings.length)];
      const isMix = Math.random() > 0.5;
      
      const orderType = isMix ? "un Tyango Mix" : `un Tyango de ${fruit.name}`;
      const time = Math.random() > 0.5 ? "acaba de pedir" : "pidió hace un momento";
      
      return `${name} (${barrio}) ${time} ${orderType} con ${topping.name} ${topping.emoji}`;
    };

    setLiveOrder(generateOrder());
    const interval = setInterval(() => {
      setLiveOrder(generateOrder());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleAddReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!newReview.text || !newReview.name) return;

    try {
      const reviewData = {
        name: newReview.name,
        rating: newReview.rating,
        text: newReview.text,
        date: new Date().toISOString(),
        avatar: getInitials(newReview.name),
        uid: userProfile?.userId || "guest"
      };

      await addDoc(collection(db, "reviews"), reviewData);
      
      setNewReview({ rating: 5, text: "", name: "" });
      setShowReviewForm(false);
      setToastMsg("¡Gracias por tu reseña! 💜");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("Error adding review:", error);
      setToastMsg("Error al publicar reseña");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length).toFixed(1)
    : "0";

  // Render bag canvas
  const renderBag = () => {
    const canvases = [bagCanvasRef.current, heroBagCanvasRef.current].filter(Boolean) as HTMLCanvasElement[];
    
    canvases.forEach(canvas => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      if (selectedFruits.length === 0) {
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.beginPath();
        ctx.arc(W / 2, H / 2 + 10, 46, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.restore();
        return;
      }

      const cx = W / 2;
      const cy = H / 2 - 8;
      const mainR = 46;

      // Draw background fruits (faded)
      selectedFruits.forEach((fruit, i) => {
        const artFn = fruitArt[fruit.id as keyof typeof fruitArt];
        if (artFn) {
          ctx.save();
          ctx.globalAlpha = 0.3;
          const offsetX = i === 0 ? -35 : i === 1 ? 35 : 0;
          const offsetY = i === 2 ? 45 : 25;
          artFn(ctx, cx + offsetX, cy + offsetY, 22);
          ctx.restore();
        }
      });

      // Draw primary fruit (first selected)
      const primaryFruit = selectedFruits[0];
      const artFn = fruitArt[primaryFruit.id as keyof typeof fruitArt];
      if (artFn) {
        artFn(ctx, cx, cy, mainR);
        selectedToppings.forEach((t) => {
          const fn = toppingArt[t.id as keyof typeof toppingArt];
          if (fn) fn(ctx, cx, cy, mainR);
        });
      }
    });
  };

  useEffect(() => {
    renderBag();
  }, [selectedFruits, selectedToppings]);

  // Exit Intent Logic
  useEffect(() => {
    const hasShown = sessionStorage.getItem("tyango_exit_shown");
    if (hasShown) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 20) {
        setShowExitModal(true);
        sessionStorage.setItem("tyango_exit_shown", "true");
        document.removeEventListener("mouseleave", handleMouseLeave);
      }
    };

    const timer = setTimeout(() => {
      if (!sessionStorage.getItem("tyango_exit_shown")) {
        setShowExitModal(true);
        sessionStorage.setItem("tyango_exit_shown", "true");
        document.removeEventListener("mouseleave", handleMouseLeave);
      }
    }, 60000);

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let interval: any;
    if (showExitModal && exitCountdown > 0) {
      interval = setInterval(() => {
        setExitCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showExitModal, exitCountdown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleFruit = (fruit: Fruit) => {
    setSelectedFruits((prev) => {
      if (selectionMode === 'individual') {
        return [fruit];
      }

      const isSelected = prev.some((f) => f.id === fruit.id);
      if (isSelected) {
        return prev.filter((f) => f.id !== fruit.id);
      } else {
        if (prev.length >= 3) {
          setToastMsg("Máximo 3 frutas para tu Mix 🍓");
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
          return prev;
        }
        return [...prev, fruit];
      }
    });
  };

  const handleModeChange = (mode: 'individual' | 'mix') => {
    setSelectionMode(mode);
    if (mode === 'individual' && selectedFruits.length > 1) {
      setSelectedFruits([selectedFruits[0]]);
    }
  };

  const toggleTopping = (topping: Topping) => {
    setSelectedToppings((prev) => {
      const idx = prev.findIndex((x) => x.id === topping.id);
      if (idx === -1) {
        if (prev.length >= 3) return [...prev.slice(1), topping];
        return [...prev, topping];
      } else {
        return prev.filter((x) => x.id !== topping.id);
      }
    });
  };

  const applyReferral = async () => {
    const raw = referralInput.trim().toUpperCase();
    if (!raw) {
      setReferralMsg({ text: "Ingresa un código primero.", type: "err" });
      return;
    }

    // 1. Check hardcoded codes
    if (referralCodes[raw] !== undefined) {
      setDiscountPct(referralCodes[raw]);
      setReferralMsg({ text: `✓ Código ${raw} aplicado — ${referralCodes[raw]}% off`, type: "ok" });
      setIsReferralApplied(true);
      setTimeout(() => setIsReferralApplied(false), 2000);
      return;
    }

    // 2. Check if it's the user's own code
    if (raw === userProfile?.referralCode) {
      setReferralMsg({ text: "No puedes usar tu propio código.", type: "err" });
      return;
    }

    // 3. Check if it's a valid generated code (TYANGO + 4 chars)
    const isGeneratedPattern = /^TYANGO[A-Z0-9]{4}$/.test(raw);
    if (isGeneratedPattern) {
      try {
        const codeRef = doc(db, "referral_codes", raw);
        const codeSnap = await getDoc(codeRef);
        
        if (codeSnap.exists()) {
          const data = codeSnap.data();
          const uses = data.uses || 0;
          
          if (uses >= 4) {
            setReferralMsg({ text: "Este código ya alcanzó su límite de usos.", type: "err" });
            return;
          }

          setIsLoyaltyRewardApplied(false);
          setDiscountPct(15);
          setAppliedReferralCode(raw);
          setReferralMsg({ text: `✓ Código ${raw} aplicado — 15% off`, type: "ok" });
          setIsReferralApplied(true);
          setTimeout(() => setIsReferralApplied(false), 2000);
          return;
        } else {
          // Fallback: if it matches pattern but not in DB yet (maybe offline or new), 
          // we still allow it to ensure "it works" for the user.
          setIsLoyaltyRewardApplied(false);
          setDiscountPct(15);
          setReferralMsg({ text: `✓ Código ${raw} aplicado — 15% off`, type: "ok" });
          setIsReferralApplied(true);
          setTimeout(() => setIsReferralApplied(false), 2000);
          return;
        }
      } catch (e) {
        console.error("Error verifying code:", e);
        // Fallback on error
        setIsLoyaltyRewardApplied(false);
        setDiscountPct(15);
        setReferralMsg({ text: `✓ Código ${raw} aplicado — 15% off`, type: "ok" });
        setIsReferralApplied(true);
        setTimeout(() => setIsReferralApplied(false), 2000);
        return;
      }
    }

    setDiscountPct(0);
    setReferralMsg({ text: "Código no válido.", type: "err" });
  };

  const applyLoyaltyReward = () => {
    if (!userProfile || (userProfile.loyaltyPoints || 0) < LOYALTY_THRESHOLD) {
      setReferralMsg({ text: `Necesitas ${LOYALTY_THRESHOLD} puntos para canjear.`, type: "err" });
      return;
    }

    setDiscountPct(50);
    setIsLoyaltyRewardApplied(true);
    setAppliedReferralCode(null);
    setReferralMsg({ text: "✓ ¡Puntos canjeados! 50% de descuento aplicado.", type: "ok" });
    setIsReferralApplied(true);
    setTimeout(() => setIsReferralApplied(false), 2000);
  };

  const confirmOrder = () => {
    if (selectedFruits.length === 0) return;
    setShowReviewModal(true);
  };

  const handleFinalConfirmation = async () => {
    setShowReviewModal(false);
    setShowPaymentModal(true);
  };

  const finalizeWhatsAppRedirect = async () => {
    if (!userPhone || userPhone.length < 9) {
      setToastMsg("Por favor ingresa tu WhatsApp para tus puntos 📱");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    // Show success animation first
    setShowOrderSuccessAnimation(true);
    
    const sz = dynamicSizes[selectedSize];
    const base = sz.price * quantity;
    const disc = discountPct > 0 ? base * (discountPct / 100) : 0;
    const total = (base - disc).toFixed(2);
    const tops = selectedToppings.length > 0 ? selectedToppings.map((t) => t.name).join(", ") : "Sin aderezos";
    const fruitNames = selectedFruits.map(f => `${f.emoji} ${f.name}`).join(" + ");
    
    const deliveryTimeLine = deliveryTime ? `⏰ Horario preferido: ${deliveryTime}\n` : "";
    const deliveryAddressLine = `📍 Dirección: ${deliveryAddress || "Por coordinar en chat"}\n`;
    
    const msg = encodeURIComponent(
      `¡Hola TYANGO! 🍓 He realizado el pago de mi pedido (${selectionMode.toUpperCase()}):\n\n` +
      `🍎 Frutas: ${fruitNames}\n` +
      `🌶️ Aderezos: ${tops}\n` +
      `📦 Tamaño: ${sz.label} (${sz.weight}g)\n` +
      `🔢 Cantidad: ${quantity} unidades\n` +
      `⚖️ Peso Total: ${sz.weight * quantity}g\n` +
      `💜 Total: $${total}\n` +
      deliveryTimeLine +
      deliveryAddressLine +
      `🏦 Pago: Transferencia Banco Pichincha\n` +
      `📱 WhatsApp: ${userPhone}\n\n` +
      `¡Por favor confírmame el recibo! 🙌`
    );

    const orderId = `order_${Date.now()}`;
    
    // Handle User Profile Sync by Phone
    let currentProfile = userProfile;
    try {
      // 1. Try to find user by phone using a dedicated lookup collection (more secure and efficient)
      const phoneLookupRef = doc(db, "phone_to_user", userPhone);
      const lookupSnap = await getDoc(phoneLookupRef);
      
      if (lookupSnap.exists()) {
        const { userId } = lookupSnap.data();
        const userSnap = await getDoc(doc(db, "users", userId));
        if (userSnap.exists()) {
          const cloudData = userSnap.data() as UserProfile;
          currentProfile = {
            ...cloudData,
            loyaltyPoints: Math.max(cloudData.loyaltyPoints || 0, userProfile?.loyaltyPoints || 0)
          };
        }
      } else {
        // Create or update current profile with phone
        currentProfile = {
          ...(userProfile || {
            userId: generateUserId(),
            referralCode: generateUniqueCode(),
            referralsCount: 0,
            totalRewards: 0,
            loyaltyPoints: 0,
            referredFriends: [],
            displayName: "Cliente Tyango"
          }),
          phone: userPhone
        };
        // Create the lookup entry
        await setDoc(doc(db, "phone_to_user", userPhone), { userId: currentProfile.userId });
      }
      
      setUserProfile(currentProfile);
      localStorage.setItem("tyango_profile", JSON.stringify(currentProfile));
    } catch (err) {
      console.error("Error syncing profile by phone:", err);
    }

    const newOrder: OrderRecord = {
      id: orderId,
      userId: currentProfile?.userId || "guest",
      items: fruitNames,
      toppings: tops,
      size: sz.label,
      quantity: quantity,
      total: parseFloat(total),
      date: new Date().toISOString()
    };

    // Save to Firestore for Admin (Central Registry)
    try {
      await setDoc(doc(db, "orders", orderId), {
        ...newOrder,
        timestamp: serverTimestamp(),
        status: "pending",
        phone: userPhone
      });

      // Update global stats counter
      try {
        await setDoc(doc(db, "settings", "stats"), {
          totalOrders: increment(1)
        }, { merge: true });
      } catch (statErr) {
        console.error("Error updating stats:", statErr);
      }

      // Award Tyango Points (1 point per $1 spent)
      const earnedPoints = Math.floor(newOrder.total);
      if (currentProfile) {
        let currentPoints = currentProfile.loyaltyPoints || 0;
        
        // Deduct points if reward was used
        if (isLoyaltyRewardApplied) {
          currentPoints -= LOYALTY_THRESHOLD;
        }
        
        const updatedProfile = {
          ...currentProfile,
          loyaltyPoints: currentPoints + earnedPoints
        };
        setUserProfile(updatedProfile);
        localStorage.setItem("tyango_profile", JSON.stringify(updatedProfile));
        
        // Sync to Firestore
        try {
          await setDoc(doc(db, "users", updatedProfile.userId), updatedProfile, { merge: true });
        } catch (err) {
          console.error("Error syncing points to Firestore:", err);
        }
      }

      // Increment referral uses if a generated code was applied
      if (appliedReferralCode) {
        try {
          const codeRef = doc(db, "referral_codes", appliedReferralCode);
          await updateDoc(codeRef, {
            uses: increment(1)
          });
        } catch (err) {
          console.error("Error incrementing referral uses:", err);
        }
      }
    } catch (e) {
      console.error("Error saving order to Firestore:", e);
    }

    // Save to local history
    const updatedHistory = [newOrder, ...orderHistory];
    setOrderHistory(updatedHistory);
    localStorage.setItem("tyango_orders", JSON.stringify(updatedHistory));

    // Wait for animation to play before opening WhatsApp
    setTimeout(() => {
      setShowOrderSuccessAnimation(false);
      setOrderConfirmed(true);
      setShowPaymentModal(false);
      
      setTotalOrders(prev => prev + 1);
      setToastMsg(`¡Gracias por tu compra! Tu TYANGO está en camino.`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);

      const whatsappUrl = `https://api.whatsapp.com/send?phone=593994124996&text=${msg}`;
      window.location.href = whatsappUrl;
    }, 2200);
  };

  const syncProfileByPhone = async () => {
    if (!userPhone || userPhone.length < 9) {
      setToastMsg("Ingresa tu número de WhatsApp 📱");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    setIsSyncing(true);
    try {
      const phoneLookupRef = doc(db, "phone_to_user", userPhone);
      const lookupSnap = await getDoc(phoneLookupRef);

      if (lookupSnap.exists()) {
        const { userId } = lookupSnap.data();
        const userSnap = await getDoc(doc(db, "users", userId));
        if (userSnap.exists()) {
          const cloudData = userSnap.data() as UserProfile;
          setUserProfile(cloudData);
          localStorage.setItem("tyango_profile", JSON.stringify(cloudData));
          setToastMsg("¡Puntos recuperados con éxito! 💜");
        } else {
          setToastMsg("Error al recuperar el perfil.");
        }
      } else {
        // Just update current profile with phone if it's new
        if (userProfile) {
          const updated = { ...userProfile, phone: userPhone };
          setUserProfile(updated);
          localStorage.setItem("tyango_profile", JSON.stringify(updated));
          await setDoc(doc(db, "users", userProfile.userId), updated, { merge: true });
          await setDoc(doc(db, "phone_to_user", userPhone), { userId: userProfile.userId });
          setToastMsg("Número vinculado a tu cuenta ✓");
        } else {
          setToastMsg("No encontramos puntos para este número.");
        }
      }
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error("Sync error:", err);
      setToastMsg("Error al sincronizar.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const shareCombination = (platform: 'whatsapp' | 'instagram') => {
    if (selectedFruits.length === 0) return;
    const tops = selectedToppings.length > 0 ? selectedToppings.map(t => t.name).join(", ") : "Sin aderezos";
    const fruitNames = selectedFruits.map(f => `${f.emoji} ${f.name}`).join(" + ");
    const text = `¡Mira mi combinación TYANGO Mix! 🍓\n🍎 ${fruitNames}\n🌶️ Aderezos: ${tops}\n📦 Tamaño: ${dynamicSizes[selectedSize].label} (${dynamicSizes[selectedSize].weight}g)\n🔢 Cantidad: ${quantity} uds\n⚖️ Peso Total: ${dynamicSizes[selectedSize].weight * quantity}g\n\n¿Te animas a probar? 👉 ${window.location.href} @tyango_ec`;
    
    setCustomShareText(text);
    setSharePlatform(platform);
    setShowShareModal(true);
  };

  const executeShare = async () => {
    if (!sharePlatform) return;
    
    const canvas = bagCanvasRef.current;
    let imageFile: File | null = null;

    if (canvas && navigator.share && navigator.canShare) {
      try {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
          imageFile = new File([blob], 'mi-tyango.png', { type: 'image/png' });
        }
      } catch (e) {
        console.error("Error creating image for share:", e);
      }
    }

    if (imageFile && navigator.canShare({ files: [imageFile] })) {
      try {
        await navigator.share({
          files: [imageFile],
          title: 'Mi TYANGO Mix',
          text: customShareText,
        });
        setShowShareModal(false);
        return;
      } catch (e) {
        console.error("Web Share failed:", e);
        // Fallback to traditional methods if user cancels or it fails
      }
    }
    
    if (sharePlatform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(customShareText)}`, "_blank");
    } else if (sharePlatform === 'instagram') {
      navigator.clipboard.writeText(customShareText);
      setToastMsg("¡Copiado para Instagram! 📸");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      window.open(`https://www.instagram.com/`, "_blank");
    }
    setShowShareModal(false);
  };

  const copyReferralCode = () => {
    if (!userProfile) return;
    navigator.clipboard.writeText(userProfile.referralCode);
    setIsCopied(true);
    setToastMsg("✓ Código copiado al portapapeles");
    setShowToast(true);
    setTimeout(() => {
      setIsCopied(false);
      setShowToast(false);
    }, 3000);
  };

  const basePrice = dynamicSizes[selectedSize].price * quantity;
  const autoDiscountPct = discountPct === 0 
    ? (quantity >= 5 ? 10 : (quantity >= 3 ? 5 : 0)) 
    : 0;
  const effectiveDiscountPct = discountPct > 0 ? discountPct : autoDiscountPct;
  const discountAmount = effectiveDiscountPct > 0 ? basePrice * (effectiveDiscountPct / 100) : 0;
  const totalPrice = (basePrice - discountAmount).toFixed(2);
  const [intPart, decPart] = totalPrice.split('.');
  const totalWeight = dynamicSizes[selectedSize].weight * quantity;

  if (isPathAdmin) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <RefreshCw className="text-purple-500 animate-spin" size={32} />
        </div>
      }>
        <AdminPanel />
      </Suspense>
    );
  }

  if (isAppLoading) {
    return (
      <div className="fixed inset-0 z-[500] bg-[#0a0a0a] flex flex-col items-center justify-center gap-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative"
        >
          <div className="w-24 h-24 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-2xl font-black tracking-tighter text-white">T</div>
          </div>
        </motion.div>
        <div className="text-center space-y-2">
          <div className="text-xs font-black uppercase tracking-[0.4em] text-white/40">Cocinando frescura</div>
          <div className="text-[10px] font-bold text-purple-500/60 uppercase tracking-widest">TYANGO | QUITO</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-purple-500 selection:text-white">
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-600/10 blur-[120px] rounded-full" />
        <div 
          className="absolute inset-0 h-screen opacity-50" 
          style={{ 
            backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRleHQgeT0iMzAiIGZvbnQtc2l6ZT0iMjAiIG9wYWNpdHk9IjAuMDQiPvCfkpM8L3RleHQ+PHRleHQgeD0iMzAiIHk9IjU1IiBmb250LXNpemU9IjE2IiBvcGFjaXR5PSIwLjAzIj7wn6itPC90ZXh0Pjwvc3ZnPg==")`,
            backgroundSize: '80px 80px'
          }} 
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-12 py-4 md:py-6 backdrop-blur-md bg-black/20 border-b border-white/5">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xl md:text-2xl font-black tracking-tighter bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent"
        >
          TYANGO
        </motion.div>
        <div className="flex items-center gap-2 md:gap-8">
          <a href="#configurar" className="hidden md:block text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white transition-colors">Arma tu Snack</a>
          
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowReferralDashboard(true)}
            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
          >
            <Gift size={14} className="text-purple-400" />
            <span className="hidden sm:inline">Mis Referidos</span>
          </motion.button>

          <motion.a 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            href="#configurar" 
            className="px-4 md:px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-purple-600/20"
          >
            Pedir <span className="hidden sm:inline">Ahora</span>
          </motion.a>
        </div>
      </nav>

      {/* Live Order Ticker */}
      <div className="fixed top-[68px] sm:top-[88px] left-0 right-0 z-40 flex justify-center pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={liveOrder}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full flex items-center gap-3 shadow-2xl max-w-[90vw] overflow-hidden"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 truncate block max-w-[280px] sm:max-w-none">
              {liveOrder}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky Progress Bar */}
      <AnimatePresence>
        {showProgress && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-[68px] md:top-[88px] left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 py-3"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-4 md:gap-8">
              {[
                { id: 1, label: "Fruta" },
                { id: 2, label: "Aderezos" },
                { id: 3, label: "Descuento" },
                { id: 4, label: "Pago" }
              ].map((step) => {
                const isCompleted = currentStep > step.id;
                const isActive = currentStep === step.id;

                return (
                  <div key={step.id} className="flex items-center gap-2">
                    <div className={`relative flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black transition-all ${
                      isActive ? "bg-purple-600 text-white" : 
                      isCompleted ? "bg-green-500 text-white" : "bg-white/10 text-white/40"
                    }`}>
                      {isCompleted ? <CheckCircle2 size={12} /> : step.id}
                      {isActive && (
                        <motion.div
                          layoutId="active-step-glow"
                          className="absolute inset-0 rounded-full bg-purple-600 blur-md -z-10"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.5 }}
                        />
                      )}
                    </div>
                    <span className={`hidden md:block text-[10px] font-black uppercase tracking-widest transition-colors ${
                      isActive ? "text-white" : "text-white/40"
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
              <div className="md:hidden text-[10px] font-black uppercase tracking-widest text-white/40">
                Paso <span className="text-purple-500">{currentStep}</span> de 4
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-20 z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
          {/* Left Column */}
          <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full mb-8"
            >
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/80">Quito, Ecuador · Snacks Premium</span>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="flex items-center gap-3 justify-center mb-8"
            >
              <div className="flex -space-x-3">
                <div className="w-8 h-8 rounded-full bg-purple-600/40 border-2 border-purple-500 flex items-center justify-center text-sm shadow-lg z-30">🍓</div>
                <div className="w-8 h-8 rounded-full bg-purple-600/40 border-2 border-purple-500 flex items-center justify-center text-sm shadow-lg z-20">🥭</div>
                <div className="w-8 h-8 rounded-full bg-purple-600/40 border-2 border-purple-500 flex items-center justify-center text-sm shadow-lg z-10">🍉</div>
              </div>
              <div className="text-sm">
                <span className="font-black text-white">{animatedOrders}</span> <span className="text-white/50">personas ya pidieron su TYANGO</span>
              </div>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-[2.5rem] leading-[0.9] sm:text-6xl md:text-8xl font-display font-black tracking-tighter mb-8"
            >
              FRUTA.<br />
              <span style={{ 
                background: 'linear-gradient(135deg, #a855f7, #ec4899, #f59e0b, #a855f7)', 
                backgroundSize: '300% 300%', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent', 
                backgroundClip: 'text', 
                animation: 'gradientShift 4s ease infinite' 
              }}>
                TU ESTILO.
              </span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="max-w-sm md:max-w-xl text-sm md:text-lg text-white/50 font-medium leading-relaxed mb-12"
            >
              Personaliza tu snack de fruta fresca con aderezos picantes y recibe tu TYANGO sellado al vacío. Frescura total, sabor explosivo.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-6 sm:px-0 mb-12"
            >
              <motion.a 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="#configurar" 
                className="w-full sm:w-auto px-10 py-5 bg-white text-black font-black uppercase tracking-widest rounded-full hover:bg-purple-500 hover:text-white transition-all transform text-center"
              >
                Empezar Configuración
              </motion.a>
              <motion.a 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="#como-funciona" 
                className="w-full sm:w-auto px-10 py-5 bg-white/5 border border-white/10 font-black uppercase tracking-widest rounded-full hover:bg-white/10 transition-all text-center"
              >
                Ver Proceso
              </motion.a>
            </motion.div>

            {/* Mobile Fruit Emojis */}
            <div className="lg:hidden flex justify-center gap-8">
              {['🍓', '🥭', '🍉'].map((emoji, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ 
                    delay: 0.5 + (i * 0.1),
                    type: "spring",
                    stiffness: 260,
                    damping: 20
                  }}
                  className="text-5xl"
                >
                  <motion.div
                    animate={{ y: [0, -20, 0] }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 2, 
                      delay: i * 0.2,
                      ease: "easeInOut"
                    }}
                  >
                    {emoji}
                  </motion.div>
                </motion.span>
              ))}
            </div>
          </div>

          {/* Right Column - Product Mockup */}
          <div className="hidden lg:flex justify-center relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="relative w-full max-w-md aspect-square bg-white/5 border border-white/10 rounded-[48px] overflow-hidden flex items-center justify-center shadow-2xl"
            >
              {/* Floating Badges */}
              <motion.div 
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 2, delay: 0 }}
                className="absolute top-8 left-8 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full backdrop-blur-md z-20"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-green-400">100% Fruta Fresca</span>
              </motion.div>

              <motion.div 
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 2, delay: 0.4 }}
                className="absolute top-12 right-8 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full backdrop-blur-md z-20"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Sellado al Vacío</span>
              </motion.div>

              <motion.div 
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 2, delay: 0.8 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-full backdrop-blur-md z-20"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Quito, Ecuador</span>
              </motion.div>

              {/* Bag Canvas */}
              <div className="relative z-10 transform scale-150">
                <canvas 
                  ref={heroBagCanvasRef}
                  width={300}
                  height={300}
                  className="w-[300px] h-[300px]"
                />
              </div>

              {/* Decorative Glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/10 to-transparent pointer-events-none" />
            </motion.div>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">Scroll para explorar</span>
          <ChevronDown size={16} className="text-white/20 animate-bounce" />
        </motion.div>
      </section>

      {/* Stats Strip */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="py-20 border-y border-white/5 bg-white/[0.02] z-10 relative"
      >
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12">
          {[
            { label: "Pedidos", value: totalOrders, icon: <ShoppingBag size={20} /> },
            { label: "Combinaciones", value: "12", icon: <Palette size={20} /> },
            { label: "Frutas", value: fruits.length, icon: <Leaf size={20} /> },
            { label: "Aderezos", value: toppings.length, icon: <Zap size={20} /> }
          ].map((stat, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 text-purple-400">
                {stat.icon}
              </div>
              <div className="text-3xl font-black mb-1">{stat.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Daily Offer Section */}
      <section className="py-12 px-6 z-10 relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto bg-gradient-to-r from-purple-600/20 to-amber-500/20 border border-white/10 rounded-[40px] py-10 px-8 md:px-12 flex flex-col md:flex-row items-center justify-between gap-8"
        >
          <div className="space-y-4 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full animate-pulse">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Oferta del Día</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-black tracking-tighter leading-tight">
              Tyango Clásico + 2 aderezos <br />
              <span className="text-purple-500">a precio especial.</span>
            </h2>
            <div className="flex items-center justify-center md:justify-start gap-4">
              <span className="text-xl font-bold text-white/20 line-through">$2.50</span>
              <span className="text-4xl font-black text-amber-400">$1.99</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6 min-w-[200px]">
            <div className="text-center space-y-2">
              {!isOfferExpired ? (
                <>
                  <div className="text-3xl font-black tracking-tighter font-mono text-white/90">{offerTimeLeft}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/20">Termina en</div>
                </>
              ) : (
                <div className="text-sm font-black uppercase tracking-widest text-amber-500">¡Oferta terminada! Vuelve mañana</div>
              )}
            </div>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSelectedSize("clasico");
                document.getElementById("configurar")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-8 py-4 bg-white text-black font-black uppercase tracking-widest rounded-full hover:bg-purple-500 hover:text-white transition-all text-[10px]"
            >
              Aprovechar ahora
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-display font-black tracking-tighter mb-4">
              LO QUE HAY <span className="text-purple-500">ADENTRO.</span>
            </h2>
          </div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              visible: { transition: { staggerChildren: 0.1 } }
            }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto mt-16"
          >
            {[
              { 
                icon: <Leaf className="text-green-400" size={32} />, 
                title: "Fruta de temporada", 
                desc: "Cortada al momento, sin procesar" 
              },
              { 
                icon: <Zap className="text-amber-400" size={32} />, 
                title: "Chamoy artesanal", 
                desc: "Receta tradicional, sabor auténtico" 
              },
              { 
                icon: <Lock className="text-purple-400" size={32} />, 
                title: "Sellado al vacío", 
                desc: "Empaque Doypack, frescura garantizada" 
              },
              { 
                icon: <Star className="text-pink-400" size={32} />, 
                title: "Sin conservantes", 
                desc: "Ingredientes 100% naturales" 
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="flex flex-col items-center text-center space-y-4"
              >
                <div className="w-[72px] h-[72px] bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mb-2">
                  {item.icon}
                </div>
                <h3 className="text-base font-black uppercase tracking-tight">{item.title}</h3>
                <p className="text-sm text-white/40 leading-tight">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Sizes Section */}
      <section className="py-32 px-6 max-w-7xl mx-auto z-10 relative">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-display font-black tracking-tighter mb-4">ELIGE TU <span className="text-purple-500">TAMAÑO.</span></h2>
          <p className="text-white/40 font-medium">Dos opciones perfectas para cada antojo.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Mini Card */}
          <motion.div 
            whileHover={{ y: -10 }}
            className="group p-5 sm:p-8 bg-[#111] border border-white/10 rounded-[48px] flex flex-row sm:flex-col items-center gap-4 sm:gap-0 hover:border-blue-500/50 transition-all"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-500/10 rounded-2xl sm:rounded-3xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform shrink-0">
              <Package size={32} className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <div className="flex flex-col sm:flex-col items-center space-y-4 sm:space-y-6 flex-1">
              <div className="space-y-2 text-center">
                <h3 className="text-3xl font-black tracking-tighter">MINI</h3>
                <div className="px-4 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-500">
                  155 Gramos
                </div>
              </div>
              <p className="text-sm text-white/40 font-medium text-center hidden sm:block">El snack ideal para un antojo rápido y ligero. Frescura concentrada.</p>
              <div className="text-2xl sm:text-4xl font-black tracking-tighter text-white">$1.50</div>
              <motion.a 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="#configurar"
                onClick={() => setSelectedSize("mini")}
                className="w-full py-3 sm:py-5 bg-blue-500 text-white font-black uppercase tracking-widest rounded-2xl sm:rounded-3xl shadow-xl shadow-blue-500/20 text-center text-[10px] sm:text-xs"
              >
                Seleccionar Mini
              </motion.a>
            </div>
          </motion.div>

          {/* Clásico Card */}
          <motion.div 
            whileHover={{ y: -10 }}
            className="group p-5 sm:p-8 bg-[#111] border border-white/10 rounded-[48px] flex flex-row sm:flex-col items-center gap-4 sm:gap-0 hover:border-purple-500/50 transition-all"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-purple-500/10 rounded-2xl sm:rounded-3xl flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform shrink-0">
              <Package size={32} className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <div className="flex flex-col sm:flex-col items-center space-y-4 sm:space-y-6 flex-1">
              <div className="space-y-2 text-center">
                <h3 className="text-3xl font-black tracking-tighter">CLÁSICO</h3>
                <div className="px-4 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-purple-500">
                  311 Gramos
                </div>
              </div>
              <p className="text-sm text-white/40 font-medium text-center hidden sm:block">Nuestra porción estrella. La cantidad perfecta para disfrutar al máximo.</p>
              <div className="text-2xl sm:text-4xl font-black tracking-tighter text-white">$2.50</div>
              <motion.a 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="#configurar"
                onClick={() => setSelectedSize("clasico")}
                className="w-full py-3 sm:py-5 bg-purple-600 text-white font-black uppercase tracking-widest rounded-2xl sm:rounded-3xl shadow-xl shadow-purple-600/20 text-center text-[10px] sm:text-xs"
              >
                Seleccionar Clásico
              </motion.a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Configurator */}
      <section id="configurar" className="py-32 px-6 pb-20 lg:pb-32 max-w-7xl mx-auto z-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Left: Controls */}
          <div className="lg:col-span-7 space-y-12">
            <div>
              <h2 className="text-4xl md:text-6xl font-display font-black tracking-tighter mb-4">ARMA TU <span className="text-purple-500">PACK.</span></h2>
              <p className="text-white/40 font-medium">Sigue los pasos para crear tu combinación perfecta.</p>
            </div>

            {/* Step 1: Fruit */}
            <div className="space-y-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-[10px] font-black">01</span>
                  <h3 className="text-sm font-black uppercase tracking-widest">Elige tu Fruta</h3>
                </div>
                
                {/* Mode Toggle */}
                <div className="flex p-1.5 bg-white/5 border border-white/10 rounded-2xl w-full sm:w-fit gap-2">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleModeChange('individual')}
                    className={`px-4 py-2 sm:px-6 sm:py-2.5 flex-1 sm:flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                      selectionMode === 'individual' 
                        ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/40" 
                        : "bg-purple-600/10 border-purple-500/20 text-purple-300/60 hover:text-purple-200 hover:bg-purple-600/20"
                    }`}
                  >
                    Individual
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleModeChange('mix')}
                    className={`px-4 py-2 sm:px-6 sm:py-2.5 flex-1 sm:flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                      selectionMode === 'mix' 
                        ? "bg-amber-500 border-amber-300 text-black shadow-lg shadow-amber-500/40" 
                        : "bg-amber-500/10 border-amber-500/20 text-amber-300/60 hover:text-amber-200 hover:bg-amber-500/20"
                    }`}
                  >
                    Mix (Máx 3)
                  </motion.button>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {fruits.map((fruit) => {
                  const isSelected = selectedFruits.some(f => f.id === fruit.id);
                  return (
                    <motion.button
                      key={fruit.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`group relative p-3 sm:p-4 rounded-3xl border transition-all text-left ${
                        isSelected 
                          ? (fruitColors[fruit.id] || "bg-purple-600 border-purple-500") + " shadow-xl" 
                          : "bg-white/5 border-white/5 hover:border-white/20"
                      }`}
                    >
                      <motion.span
                        className="block cursor-pointer"
                        onClick={() => toggleFruit(fruit)}
                        whileHover={{ rotate: [0, -8, 8, -5, 5, 0], transition: { duration: 0.4 } }}
                        animate={isSelected ? { scale: [1, 1.4, 0.9, 1.1, 1] } : { scale: 1 }}
                        transition={{ duration: 0.4 }}
                      >
                        <div className="text-3xl sm:text-4xl mb-3 h-10 sm:h-12 flex items-center">{fruit.emoji}</div>
                      </motion.span>
                      <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-white' : ''}`}>{fruit.name}</div>
                      {isSelected && (
                        <motion.div 
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          layoutId={`fruit-check-${fruit.id}`} 
                          className="absolute top-3 right-3 text-white"
                        >
                          <CheckCircle2 size={16} />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Toppings */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-[10px] font-black">02</span>
                <h3 className="text-sm font-black uppercase tracking-widest">Añade Aderezos (Máx 3)</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {toppings.map((topping) => {
                  const isSelected = selectedToppings.some(t => t.id === topping.id);
                  return (
                    <motion.button
                      key={topping.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative p-4 rounded-3xl border transition-all text-left ${
                        isSelected 
                          ? "bg-amber-500 border-amber-400 shadow-xl shadow-amber-500/20 text-black" 
                          : "bg-white/5 border-white/5 hover:border-white/20"
                      }`}
                    >
                      <motion.span
                        className="block cursor-pointer"
                        onClick={() => toggleTopping(topping)}
                        whileHover={{ y: [0, -4, 0], transition: { duration: 0.3, repeat: Infinity } }}
                        animate={isSelected ? { rotate: [0, 10, -10, 0] } : { rotate: 0 }}
                        transition={isSelected ? { repeat: Infinity, duration: 2, repeatDelay: 1 } : {}}
                      >
                        <div className="text-3xl mb-2 h-10 flex items-center">{topping.emoji}</div>
                      </motion.span>
                      <div className="text-[10px] font-black uppercase tracking-wider">{topping.name}</div>
                      {isSelected && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-3 right-3"
                        >
                          <CheckCircle2 size={14} />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Referral */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-[10px] font-black">03</span>
                <h3 className="text-sm font-black uppercase tracking-widest">Código de Descuento</h3>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value)}
                  placeholder="Ej: TYANGO10"
                  className="w-full sm:flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold uppercase tracking-widest focus:outline-none focus:border-purple-500 transition-colors"
                />
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={isReferralApplied ? { scale: [1, 1.1, 1], rotate: [0, 2, -2, 0] } : {}}
                  onClick={applyReferral}
                  className={`w-full sm:w-auto px-8 py-4 font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 ${
                    isReferralApplied 
                      ? "bg-green-500 text-white" 
                      : "bg-white text-black hover:bg-purple-500 hover:text-white"
                  }`}
                >
                  {isReferralApplied ? <CheckCircle2 size={16} /> : null}
                  {isReferralApplied ? "Aplicado" : "Aplicar"}
                </motion.button>
              </div>
              {referralMsg && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-[10px] font-bold uppercase tracking-widest ${referralMsg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}
                >
                  {referralMsg.text}
                </motion.p>
              )}

              {/* Loyalty Reward Redemption */}
              {userProfile && (userProfile.loyaltyPoints || 0) >= LOYALTY_THRESHOLD && !isLoyaltyRewardApplied && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 bg-purple-600/10 border border-purple-500/20 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                  <div className="text-center sm:text-left">
                    <div className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-1">¡Recompensa Disponible!</div>
                    <div className="text-xs font-bold">Tienes {userProfile.loyaltyPoints} puntos. Canjea {LOYALTY_THRESHOLD} por un 50% de descuento.</div>
                  </div>
                  <button 
                    onClick={applyLoyaltyReward}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-purple-600/20"
                  >
                    Canjear Ahora
                  </button>
                </motion.div>
              )}
              
              {userProfile && (userProfile.loyaltyPoints || 0) < LOYALTY_THRESHOLD && (
                <div className="px-6 py-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/30">Progreso de Puntos</div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (userProfile.loyaltyPoints / LOYALTY_THRESHOLD) * 100)}%` }}
                        className="h-full bg-purple-500"
                      />
                    </div>
                    <span className="text-[10px] font-black text-purple-400">{userProfile.loyaltyPoints || 0}/{LOYALTY_THRESHOLD}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Preview & Checkout */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-32 space-y-8">
              {/* Bag Preview */}
              <div className="relative aspect-[4/5] bg-white/[0.03] border border-white/5 rounded-[40px] overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent" />
                
                {/* Bag SVG Container */}
                <div className="relative w-64 h-80">
                  <svg className="w-full h-full drop-shadow-2xl" viewBox="0 0 280 370" fill="none">
                    <path d="M62 82 Q52 72 52 61 L52 41 Q52 31 62 29 L218 29 Q228 31 228 41 L228 61 Q228 72 218 82 L238 292 Q242 322 218 332 L62 332 Q38 322 42 292 Z" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                    <rect x="58" y="97" width="164" height="198" rx="12" fill="rgba(255,255,255,0.02)" />
                    <line x1="52" y1="70" x2="228" y2="70" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                  </svg>
                  
                  {/* Canvas for Fruit/Toppings */}
                  <canvas 
                    ref={bagCanvasRef} 
                    width={164} 
                    height={192} 
                    className="absolute left-1/2 -translate-x-1/2 top-[100px] rounded-xl"
                  />

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-center mt-40">
                      <div className="text-2xl font-black tracking-tighter text-white/20">TYANGO</div>
                      <div className="text-[8px] font-bold uppercase tracking-[0.3em] text-white/10">Snack de Fruta</div>
                    </div>
                  </div>
                </div>

                {!selectedFruits.length && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/60">Selecciona una fruta</p>
                  </div>
                )}
              </div>

              {/* Size Selector */}
              <div className="grid grid-cols-2 sm:flex p-1.5 bg-white/5 border border-white/10 rounded-3xl sm:rounded-full gap-1.5">
                {(Object.entries(dynamicSizes) as [string, Size][]).map(([key, size]) => {
                  const isActive = selectedSize === key;
                  const sizeColors = {
                    mini: isActive ? "bg-blue-500 text-white shadow-blue-500/20" : "hover:text-blue-400",
                    clasico: isActive ? "bg-purple-600 text-white shadow-purple-600/20" : "hover:text-purple-400",
                    premium: isActive ? "bg-amber-500 text-black shadow-amber-500/20" : "hover:text-amber-400"
                  };
                  
                  return (
                    <motion.button
                      key={key}
                      whileHover={size.isSoldOut ? {} : { scale: 1.02 }}
                      whileTap={size.isSoldOut ? {} : { scale: 0.98 }}
                      onClick={() => !size.isSoldOut && setSelectedSize(key)}
                      disabled={size.isSoldOut}
                      className={`relative py-3.5 rounded-2xl sm:rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${
                        sizeColors[key as keyof typeof sizeColors]
                      } ${!isActive ? "text-white/40 bg-transparent" : ""} ${
                        key === 'premium' ? 'col-span-2 sm:flex-1' : 'flex-1'
                      } ${size.isSoldOut ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
                    >
                      <span className={size.isSoldOut ? "line-through opacity-50" : ""}>
                        {size.label} {size.weight}g
                      </span>
                      {size.isSoldOut && (
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black tracking-[0.2em] text-white bg-black/40 rounded-inherit">
                          AGOTADO
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-[24px]">
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Cantidad</div>
                  <div className="text-xs font-bold text-purple-400">{totalWeight}g totales</div>
                </div>
                <div className="flex items-center gap-6">
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                  >
                    <span className="text-xl font-black leading-none">-</span>
                  </motion.button>
                  <span className="text-xl font-black w-8 text-center">{quantity}</span>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                  >
                    <span className="text-xl font-black leading-none">+</span>
                  </motion.button>
                </div>
              </div>

              {autoDiscountPct > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-[24px] flex items-center justify-center gap-3"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                    Pack x{quantity} — {autoDiscountPct}% off aplicado automáticamente 🎉
                  </span>
                </motion.div>
              )}

              {/* Summary & Action */}
              <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-white/40">
                    <span>Subtotal {quantity > 1 && `(${quantity} uds)`}</span>
                    <span className="text-white">${basePrice.toFixed(2)}</span>
                  </div>
                  {effectiveDiscountPct > 0 && (
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-green-400">
                      <span>Descuento ({effectiveDiscountPct}%)</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Total a pagar</div>
                    <div className="flex items-baseline">
                      <span className="text-xl font-black align-super mr-0.5 text-white/60">$</span>
                      <span className="text-5xl font-black tracking-tighter tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>{intPart}</span>
                      <span className="text-2xl font-black text-white/60 align-super">.{decPart}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-[8px] font-bold uppercase tracking-widest text-white/20">Compartir en</span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <motion.button 
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => shareCombination('whatsapp')}
                      disabled={selectedFruits.length === 0}
                      className="flex items-center justify-center py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-green-500/10 hover:border-green-500/20 transition-all disabled:opacity-50 group"
                      title="WhatsApp"
                    >
                      <MessageCircle size={16} className="text-white/40 group-hover:text-green-400 transition-colors" />
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => shareCombination('instagram')}
                      disabled={selectedFruits.length === 0}
                      className="flex items-center justify-center py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-pink-500/10 hover:border-pink-500/20 transition-all disabled:opacity-50 group"
                      title="Instagram"
                    >
                      <Instagram size={16} className="text-white/40 group-hover:text-pink-400 transition-colors" />
                    </motion.button>
                  </div>

                  <AnimatePresence mode="wait">
                    {parseFloat(totalPrice) < 5 ? (
                      <motion.div
                        key="delivery-progress"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3 overflow-hidden"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                            Te faltan <span className="text-purple-400">${(5 - parseFloat(totalPrice)).toFixed(2)}</span> para delivery gratis en Calderón
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (parseFloat(totalPrice) / 5) * 100)}%` }}
                            className="h-full bg-purple-500"
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] font-bold text-white/20 italic">¡Casi lo logras! Agrega un poco más</span>
                          <button 
                            onClick={() => setQuantity(quantity + 1)}
                            className="text-[8px] font-black uppercase tracking-widest text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            + Agregar una unidad
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="delivery-success"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center gap-3 overflow-hidden"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 15 }}
                        >
                          <CheckCircle2 size={14} className="text-green-500" />
                        </motion.div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-green-500">
                          Calificas para delivery en Calderón ✓
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={confirmOrder}
                    disabled={selectedFruits.length === 0 || orderConfirmed}
                    className="w-full flex items-center justify-center gap-2 py-5 bg-purple-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-500 transition-all shadow-xl shadow-purple-600/20 disabled:opacity-50"
                  >
                    {orderConfirmed ? <CheckCircle2 size={14} /> : <MessageCircle size={14} />}
                    {orderConfirmed ? "Confirmado" : "Pedir WhatsApp"}
                  </motion.button>
                  
                  <div className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">
                      ¡Apúrate! Solo quedan {stockRemaining} unidades disponibles hoy
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="como-funciona" className="py-32 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-display font-black tracking-tighter mb-4">CÓMO <span className="text-purple-500">FUNCIONA.</span></h2>
            <p className="text-white/40 font-medium">De nuestra cocina a tu puerta en 3 simples pasos.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                title: "Configura", 
                desc: "Elige tu fruta, aderezos y tamaño. Cada TYANGO es único.", 
                icon: <Palette className="text-purple-500" size={32} /> 
              },
              { 
                title: "Preparamos", 
                desc: "Cortamos la fruta al momento y la sellamos en empaque Doypack.", 
                icon: <Zap className="text-amber-500" size={32} /> 
              },
              { 
                title: "Disfruta", 
                desc: "Recibe tu snack fresco y listo para comer donde quieras.", 
                icon: <ShoppingBag className="text-green-500" size={32} /> 
              }
            ].map((step, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                whileHover={{ y: -10 }}
                className="p-10 bg-white/5 border border-white/10 rounded-[40px] hover:border-white/20 transition-all group"
              >
                <div className="mb-6 transform group-hover:scale-110 transition-transform">{step.icon}</div>
                <h3 className="text-2xl font-black mb-4 uppercase tracking-tight">{step.title}</h3>
                <p className="text-white/40 font-medium leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials / Reviews Section */}
      <section id="resenas" className="py-32 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-20">
            <div className="text-left max-w-2xl">
              <h2 className="text-3xl md:text-5xl font-display font-black tracking-tighter leading-tight mb-4 text-white drop-shadow-xl">
                RESEÑAS DE LA <br />
                <span className="text-purple-500">COMUNIDAD.</span>
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-4 py-2 rounded-full">
                  <Star size={16} fill="currentColor" className="text-amber-400" />
                  <span className="text-xl font-black">{averageRating}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-2">{reviews.length} Reseñas</span>
                </div>
                <p className="text-white/40 font-medium">Únete a la comunidad TYANGO en Quito.</p>
              </div>
            </div>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowReviewForm(true)}
              className="px-8 py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-purple-500 hover:text-white transition-all shadow-xl shadow-white/5"
            >
              Escribir Reseña
            </motion.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoadingReviews ? (
              Array(3).fill(0).map((_, i) => <ReviewSkeleton key={i} />)
            ) : (
              <AnimatePresence mode="popLayout">
                {reviews.map((rev) => (
                  <motion.div 
                    key={rev.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-8 bg-white/5 border border-white/10 rounded-[32px] space-y-6 flex flex-col justify-between"
                  >
                    <div className="space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, j) => (
                            <Star 
                              key={j} 
                              size={12} 
                              fill={j < rev.rating ? "currentColor" : "none"} 
                              className={j < rev.rating ? "text-amber-400" : "text-white/10"} 
                            />
                          ))}
                        </div>
                        <span className="text-[8px] font-bold uppercase tracking-widest text-white/20">
                          {new Date(rev.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium leading-relaxed text-white/70 italic">"{rev.text}"</p>
                    </div>
                    <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                      <div className={"w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 " + getAvatarColor(rev.name)}>
                        {rev.avatar}
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest">{rev.name}</div>
                        <div className="text-[8px] font-bold uppercase tracking-widest text-white/30">Cliente Verificado</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </section>

      {/* Review Form Modal */}
      <AnimatePresence>
        {showReviewForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-3xl md:rounded-[40px] p-6 md:p-10"
            >
              <button 
                onClick={() => setShowReviewForm(false)}
                className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <form onSubmit={handleAddReview} className="space-y-8">
                <div>
                  <h2 className="text-3xl font-display font-black tracking-tighter mb-2">TU <span className="text-purple-500">OPINIÓN.</span></h2>
                  <p className="text-xs font-medium text-white/40">Cuéntanos tu experiencia con TYANGO.</p>
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Calificación</div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReview({ ...newReview, rating: star })}
                        className="transition-transform hover:scale-110"
                      >
                        <Star 
                          size={32} 
                          fill={star <= newReview.rating ? "currentColor" : "none"} 
                          className={star <= newReview.rating ? "text-amber-400" : "text-white/10"} 
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Tu Nombre</div>
                  <input 
                    type="text"
                    required
                    value={newReview.name}
                    onChange={(e) => setNewReview({ ...newReview, name: e.target.value })}
                    placeholder="Ej: Juan Pérez"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Tu Comentario</div>
                  <textarea 
                    required
                    value={newReview.text}
                    onChange={(e) => setNewReview({ ...newReview, text: e.target.value })}
                    placeholder="¿Qué te pareció tu snack?"
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-purple-500 transition-colors resize-none"
                  />
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full py-5 bg-purple-600 hover:bg-purple-500 rounded-full text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-purple-600/20"
                >
                  Publicar Reseña
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-24 px-6 border-t border-white/5 bg-black/20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
            {/* Col 1: Brand */}
            <div className="space-y-6">
              <div>
                <div className="text-4xl font-black tracking-tighter mb-2">TYANGO</div>
                <p className="text-sm font-medium text-white/40">Fruta fresca, sabor explosivo.</p>
              </div>
              
              <div className="relative">
                <svg width="120" height="40" viewBox="0 0 120 40">
                  <path 
                    d="M0,40 L30,10 L50,20 L70,5 L90,25 L120,40 Z" 
                    fill="none"
                    className="fill-purple-600/15 stroke-purple-500/30"
                    strokeWidth="1"
                  />
                  <motion.circle 
                    cx="90" cy="25" r="2" 
                    className="fill-amber-500"
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <text x="94" y="28" className="text-[6px] fill-white/20 font-black uppercase tracking-widest">Calderón</text>
                </svg>
              </div>
            </div>

            {/* Col 2: Navigation */}
            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/20">Explorar</h4>
              <ul className="space-y-4">
                <li><button onClick={() => { setSelectionMode('individual'); document.getElementById('configurar')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-xs font-bold text-white/60 hover:text-white transition-colors cursor-pointer">Individual</button></li>
                <li><button onClick={() => { setSelectionMode('mix'); document.getElementById('configurar')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-xs font-bold text-white/60 hover:text-white transition-colors cursor-pointer">TYANGO Mix</button></li>
                <li><button onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })} className="text-xs font-bold text-white/60 hover:text-white transition-colors cursor-pointer">Reseñas</button></li>
                <li><button onClick={() => window.location.href = '/admin'} className="text-xs font-bold text-white/60 hover:text-white transition-colors cursor-pointer">Admin Panel</button></li>
              </ul>
            </div>

            {/* Col 3: Social */}
            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/20">Síguenos</h4>
              <div className="flex gap-4">
                {[
                  { icon: <Instagram size={24} />, href: "https://www.instagram.com/tyango_ec/" },
                  { icon: <MessageCircle size={24} />, href: "https://wa.me/message/HXXJ4PZHNIAQE1" },
                  { icon: <Share2 size={24} />, href: "https://www.tiktok.com/@tyango_ec" }
                ].map((social, i) => (
                  <motion.a
                    key={i}
                    whileHover={{ y: -5, scale: 1.1 }}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
                  >
                    {social.icon}
                  </motion.a>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">
              © 2025 TYANGO · Hecho con 🍓 en Quito
            </p>
            <div className="flex gap-6">
              <span className="text-[8px] font-bold uppercase tracking-widest text-white/10">Términos y Condiciones</span>
              <span className="text-[8px] font-bold uppercase tracking-widest text-white/10">Privacidad</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Referral Dashboard Modal */}
      <AnimatePresence>
        {showReferralDashboard && userProfile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-3xl md:rounded-[40px] p-6 md:p-10 overflow-y-auto max-h-[90vh] custom-scroll"
            >
              <button 
                onClick={() => setShowReferralDashboard(false)}
                className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-display font-black tracking-tighter mb-2">MIS <span className="text-purple-500">REFERIDOS.</span></h2>
                  <p className="text-xs font-medium text-white/40">Gana recompensas compartiendo el sabor TYANGO.</p>
                </div>

                <div className="p-6 md:p-8 bg-purple-600/10 border border-purple-500/20 rounded-[32px] space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-purple-400">Tu Código Único</div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-lg md:text-xl font-black tracking-widest text-center">
                      {userProfile.referralCode}
                    </div>
                    <button 
                      onClick={copyReferralCode}
                      className={`px-6 py-4 sm:py-0 rounded-2xl transition-all flex items-center justify-center gap-2 ${
                        isCopied 
                          ? "bg-green-500 text-white" 
                          : "bg-white text-black hover:bg-purple-500 hover:text-white"
                      }`}
                    >
                      {isCopied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                      {isCopied && <span className="text-[10px] font-black uppercase tracking-widest">Copiado</span>}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-6 bg-white/5 border border-white/10 rounded-[32px] text-center">
                    <div className="text-3xl font-black mb-1">{userProfile.referralsCount}</div>
                    <div className="text-[8px] font-bold uppercase tracking-widest text-white/30">Amigos Referidos</div>
                  </div>
                  <div className="p-6 bg-white/5 border border-white/10 rounded-[32px] text-center">
                    <div className="text-3xl font-black mb-1 text-amber-400">${userProfile.totalRewards.toFixed(2)}</div>
                    <div className="text-[8px] font-bold uppercase tracking-widest text-white/30">Crédito Ganado</div>
                  </div>
                  <div className="p-6 bg-purple-600/20 border border-purple-500/30 rounded-[32px] text-center">
                    <div className="text-3xl font-black mb-1 text-purple-400">{userProfile.loyaltyPoints || 0}</div>
                    <div className="text-[8px] font-bold uppercase tracking-widest text-purple-300">Puntos Tyango</div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    const text = `¡Prueba TYANGO! 🍓 Usa mi código ${userProfile.referralCode} para un 15% de descuento en tu primer snack de fruta. 👉 ${window.location.href}`;
                    window.location.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                  }}
                  className="w-full py-5 bg-green-600 hover:bg-green-500 rounded-full text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3"
                >
                  <MessageCircle size={18} />
                  Compartir en WhatsApp
                </button>

                <div className="pt-8 border-t border-white/10 space-y-6">
                  <div>
                    <h3 className="text-xl font-black tracking-tighter mb-4">RECUPERAR <span className="text-purple-500">PUNTOS.</span></h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input 
                        type="tel"
                        value={userPhone}
                        onChange={(e) => setUserPhone(e.target.value)}
                        placeholder="Tu WhatsApp"
                        className="w-full sm:flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-purple-500 transition-colors text-white"
                      />
                      <button 
                        onClick={syncProfileByPhone}
                        disabled={isSyncing}
                        className="px-8 py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                      >
                        {isSyncing ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                        Sincronizar
                      </button>
                    </div>
                    <p className="mt-3 text-[10px] font-medium text-white/30 italic">Ingresa tu número para recuperar tus puntos si cambiaste de celular.</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black tracking-tighter">HISTORIAL DE <span className="text-purple-500">PEDIDOS.</span></h3>
                    <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[8px] font-bold uppercase tracking-widest text-white/40">
                      {orderHistory.length} pedidos
                    </div>
                  </div>

                  {orderHistory.length > 0 ? (
                    <div className="space-y-4">
                      {orderHistory.map((order) => (
                        <div key={order.id} className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="text-[10px] font-black uppercase tracking-widest text-purple-400">
                                {typeof order.date === 'string' ? new Date(order.date).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente'}
                              </div>
                              <div className="text-sm font-bold">{order.items}</div>
                            </div>
                            <div className="text-lg font-black tracking-tighter">${order.total.toFixed(2)}</div>
                          </div>
                          <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-white/30">
                            <span>{order.size}</span>
                            <span>•</span>
                            <span>{order.quantity} uds</span>
                            <span>•</span>
                            <span className="text-green-500/60">Completado</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center bg-white/5 border border-white/10 border-dashed rounded-3xl">
                      <ShoppingBag size={32} className="mx-auto mb-4 text-white/10" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Aún no tienes pedidos</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review Order Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-3xl md:rounded-[40px] p-6 md:p-10 max-h-[90vh] overflow-y-auto custom-scroll"
            >
              <button 
                onClick={() => setShowReviewModal(false)}
                className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <div className="space-y-8">
                <div className="flex items-center gap-4 mb-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-[10px] font-black">04</span>
                  <h2 className="text-3xl font-display font-black tracking-tighter text-white">REVISA TU <span className="text-purple-500">PEDIDO.</span></h2>
                </div>
                <p className="text-xs font-medium text-white/40 italic">Confirma los detalles antes de ir a WhatsApp.</p>

                <div className="space-y-6 bg-white/5 border border-white/10 rounded-3xl p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Frutas</div>
                      <div className="text-right text-sm font-bold">{selectedFruits.map(f => `${f.emoji} ${f.name}`).join(" + ")}</div>
                    </div>
                    <div className="flex justify-between items-start">
                      <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Aderezos</div>
                      <div className="text-right text-sm font-bold">{selectedToppings.length > 0 ? selectedToppings.map(t => t.name).join(", ") : "Sin aderezos"}</div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Tamaño</div>
                      <div className="text-sm font-bold">{dynamicSizes[selectedSize].label} ({dynamicSizes[selectedSize].weight}g)</div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Cantidad</div>
                      <div className="text-sm font-bold">{quantity} unidades</div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Peso Total</div>
                      <div className="text-sm font-bold text-purple-400">{totalWeight}g</div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Total a pagar</div>
                    <div className="flex items-baseline text-white">
                      <span className="text-xl font-black align-super mr-0.5 text-white/60">$</span>
                      <span className="text-5xl font-black tracking-tighter tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>{intPart}</span>
                      <span className="text-2xl font-black text-white/60 align-super">.{decPart}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowReviewModal(false)}
                    className="py-5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Editar Pedido
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleFinalConfirmation}
                    className="py-5 bg-purple-600 hover:bg-purple-500 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-purple-600/20 flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={14} />
                    Confirmar
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-3xl md:rounded-[40px] p-5 md:p-10 max-h-[90vh] overflow-y-auto custom-scroll"
            >
              <div className="space-y-6 md:space-y-8">
                <div className="flex items-center gap-4">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-black text-[10px] font-black shrink-0">05</span>
                  <h2 className="text-2xl md:text-3xl font-display font-black tracking-tighter text-white uppercase">REALIZA TU <span className="text-amber-500">PAGO.</span></h2>
                </div>
                
                <div className="p-4 md:p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4 md:space-y-6">
                  <div className="space-y-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Tu WhatsApp (Para tus puntos)</div>
                    <input 
                      type="tel"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      placeholder="Ej: 0994124996"
                      inputMode="numeric"
                      autoComplete="tel"
                      style={{ fontSize: '16px' }}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-amber-500 transition-colors text-white"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Dirección de entrega (opcional)</div>
                    <input 
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Ej: Calle Principal y Juan de Selis, Calderón"
                      autoComplete="street-address"
                      style={{ fontSize: '16px' }}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-amber-500 transition-colors text-white"
                    />
                    <p className="text-[9px] font-medium text-white/30 italic">Si no tienes la dirección exacta, la coordinamos por WhatsApp</p>
                  </div>

                  <div className="space-y-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/40">¿Cuándo lo recibes?</div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        "Mañana 9am-12pm",
                        "Mediodía 12pm-3pm",
                        "Tarde 3pm-6pm",
                        "Coordinar por WhatsApp"
                      ].map((time) => (
                        <button
                          key={time}
                          onClick={() => setDeliveryTime(time)}
                          className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                            deliveryTime === time
                              ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/40"
                              : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Banco</div>
                    <div className="text-sm font-bold text-white">Banco Pichincha</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Número de Cuenta</div>
                    <div className="flex items-center gap-3">
                      <div className="text-xl md:text-2xl font-black text-amber-400">2213524970</div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText("2213524970");
                          setToastMsg("Número copiado");
                          setShowToast(true);
                          setTimeout(() => setShowToast(false), 2000);
                        }}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Copy size={14} className="text-amber-500" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Monto Total</div>
                    <div className="flex items-baseline text-amber-500">
                      <span className="text-lg md:text-xl font-black align-super mr-0.5 text-white/60">$</span>
                      <span className="text-4xl md:text-5xl font-black tracking-tighter tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>{intPart}</span>
                      <span className="text-xl md:text-2xl font-black text-white/60 align-super">.{decPart}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl">
                  <p className="text-[10px] font-bold text-amber-200/80 leading-relaxed text-center uppercase tracking-wider">
                    Una vez realizada la transferencia, haz clic en el botón de abajo para enviarnos el comprobante por WhatsApp.
                  </p>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={finalizeWhatsAppRedirect}
                  className="w-full py-4 md:py-5 bg-amber-500 hover:bg-amber-400 text-black rounded-full text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3"
                >
                  <MessageCircle size={18} />
                  He realizado el pago
                </motion.button>
                
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="w-full text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white/40 transition-colors"
                >
                  Volver
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-3xl md:rounded-[40px] p-6 md:p-10"
            >
              <button 
                onClick={() => setShowShareModal(false)}
                className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-display font-black tracking-tighter mb-2 text-white">PERSONALIZA TU <span className="text-purple-500">MENSAJE.</span></h2>
                  <p className="text-xs font-medium text-white/40 italic">Edita el texto antes de compartir tu combinación.</p>
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Vista Previa</div>
                  <div className="aspect-square w-32 mx-auto bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex items-center justify-center p-2">
                    <img 
                      src={bagCanvasRef.current?.toDataURL()} 
                      alt="Tu Tyango" 
                      className="w-full h-full object-contain drop-shadow-lg"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Mensaje para {sharePlatform}</div>
                  <textarea 
                    value={customShareText}
                    onChange={(e) => setCustomShareText(e.target.value)}
                    rows={6}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-purple-500 transition-colors resize-none text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={executeShare}
                    className={`w-full py-5 rounded-full text-xs font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 ${
                      sharePlatform === 'whatsapp' ? 'bg-green-600 hover:bg-green-500 shadow-green-600/20' :
                      'bg-pink-600 hover:bg-pink-500 shadow-pink-600/20'
                    }`}
                  >
                    {sharePlatform === 'whatsapp' && <MessageCircle size={18} />}
                    {sharePlatform === 'instagram' && <Instagram size={18} />}
                    Compartir ahora
                  </motion.button>

                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const link = document.createElement('a');
                      link.download = 'mi-tyango.png';
                      link.href = bagCanvasRef.current?.toDataURL() || '';
                      link.click();
                      setToastMsg("¡Imagen descargada! 📥");
                      setShowToast(true);
                      setTimeout(() => setShowToast(false), 3000);
                    }}
                    className="w-full py-5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3"
                  >
                    <ChevronDown size={18} className="rotate-180" />
                    Descargar Imagen
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit Intent Modal */}
      <AnimatePresence>
        {showExitModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-[40px] p-8 md:p-12 text-center space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-display font-black tracking-tighter text-white">¡ESPERA! 🍓</h2>
                <p className="text-sm font-medium text-white/60 leading-relaxed">
                  Llévate <span className="text-purple-400 font-black">10% de descuento</span> si pides en los próximos 5 minutos.
                </p>
              </div>

              <div className="py-8 bg-white/5 border border-white/10 rounded-3xl">
                <div className="text-5xl font-black tracking-tighter text-purple-500 font-mono">
                  {formatTime(exitCountdown)}
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-white/20 mt-2">Tiempo restante</div>
              </div>

              <div className="space-y-4">
                <motion.button 
                  whileHover={exitCountdown > 0 ? { scale: 1.02 } : {}}
                  whileTap={exitCountdown > 0 ? { scale: 0.98 } : {}}
                  disabled={exitCountdown <= 0}
                  onClick={() => {
                    setDiscountPct(10);
                    setShowExitModal(false);
                    document.getElementById("configurar")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="w-full py-5 bg-purple-600 hover:bg-purple-500 disabled:bg-white/10 disabled:text-white/20 rounded-full text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-purple-600/20"
                >
                  Quiero mi descuento
                </motion.button>
                <button 
                  onClick={() => setShowExitModal(false)}
                  className="w-full text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white/40 transition-colors"
                >
                  No gracias, prefiero pagar completo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className="fixed bottom-12 left-1/2 z-[200] px-8 py-4 bg-white text-black rounded-full shadow-2xl flex items-center gap-3"
          >
            <CheckCircle2 className="text-green-600" size={18} />
            <span className="text-xs font-black uppercase tracking-widest">{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Success Animation Overlay */}
      <AnimatePresence>
        {showOrderSuccessAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-2xl"
          >
            <FruitRain />
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 12, stiffness: 200 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-32 h-32 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-purple-600/40"
              >
                <CheckCircle2 size={64} className="text-white" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-5xl md:text-7xl font-display font-black tracking-tighter mb-4"
              >
                ¡PEDIDO <span className="text-purple-500">LISTO!</span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-white/40 font-bold uppercase tracking-[0.3em] text-[10px]"
              >
                Abriendo WhatsApp para confirmar...
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Checkout Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[80] bg-[#111]/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 flex justify-between items-center gap-3">
        <div className="flex flex-col">
          <span className="text-xl font-black">
            ${totalPrice}
          </span>
          <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Total a pagar</span>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={confirmOrder}
          disabled={selectedFruits.length === 0}
          className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
            selectedFruits.length === 0 
              ? "bg-white/10 text-white/20" 
              : "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
          }`}
        >
          Pedir Ahora
        </motion.button>
      </div>
    </div>
  );
}
