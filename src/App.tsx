/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, FormEvent, lazy, Suspense } from "react";
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
  Zap,
  ChevronDown,
  RefreshCw,
  Instagram,
  Plus,
  Trash2,
  Check,
  Lock,
  Gift,
  Package,
  User as UserIcon
} from "lucide-react";
import { db } from "./lib/firebase";
import { DeliverySlotSelector } from "./components/DeliverySlotSelector";
import { useDeliverySlots } from "./hooks/useDeliverySlots";
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot,
  collection,
  addDoc,
  updateDoc,
  increment,
  serverTimestamp,
  query,
  orderBy,
  limit
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

interface CartItem {
  id: string;
  fruits: Fruit[];
  toppings: Topping[];
  size: string;
  quantity: number;
  price: number;
}

interface OrderRecord {
  id: string;
  userId: string;
  itemsSummary: string;
  itemCount: number;
  total: number;
  date: string;
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

const playSuccessSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContext();
    
    const playNote = (freq: number, startTime: number, duration: number, volume: number = 0.3) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.setValueAtTime(freq, startTime);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    const now = ctx.currentTime;
    playNote(523.25, now, 0.15, 0.25);        // Do
    playNote(659.25, now + 0.12, 0.15, 0.25); // Mi
    playNote(783.99, now + 0.24, 0.15, 0.25); // Sol
    playNote(1046.5, now + 0.36, 0.4, 0.3);   // Do alta
    playNote(783.99, now + 0.50, 0.15, 0.2);  // Sol
    playNote(1046.5, now + 0.62, 0.5, 0.35);  // Do alta larga
  } catch (e) {
    console.log('Audio not available');
  }
};

const playClickSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch(e) {}
};

// ─── RECENT ACTIVITY POPUP ───
const RecentActivity = () => {
  const [activity, setActivity] = useState<{ name: string; barrio: string; size: string; emoji: string } | null>(null);

  useEffect(() => {
    const showActivity = () => {
      const name = QUITO_NAMES[Math.floor(Math.random() * QUITO_NAMES.length)];
      const barrio = QUITO_BARRIOS[Math.floor(Math.random() * QUITO_BARRIOS.length)];
      const sizeKeys = Object.keys(sizes);
      const sizeKey = sizeKeys[Math.floor(Math.random() * sizeKeys.length)];
      const fruit = fruits[Math.floor(Math.random() * fruits.length)];
      
      setActivity({ 
        name, 
        barrio, 
        size: sizes[sizeKey].label,
        emoji: fruit.emoji
      });

      setTimeout(() => setActivity(null), 5000);
    };

    const interval = setInterval(() => {
      if (Math.random() > 0.4) showActivity();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      {activity && (
        <motion.div
          initial={{ opacity: 0, x: -50, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -20, scale: 0.8 }}
          className="fixed bottom-6 left-6 z-[450] flex items-center gap-4 bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl max-w-sm"
        >
          <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-2xl">
            {activity.emoji}
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-0.5">Actividad Reciente</div>
            <div className="text-xs font-bold leading-tight">
              <span className="text-white">{activity.name}</span> en <span className="text-white/60">{activity.barrio}</span> 
              <br />
              <span className="text-white/40">acaba de pedir un </span>
              <span className="text-amber-400 font-black">{activity.size}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState<boolean>(false);
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
  const [loyaltyFreeTopping, setLoyaltyFreeTopping] = useState(false);
  const LOYALTY_THRESHOLD = 30;
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string>("");
  const bagCanvasRef = useRef<HTMLCanvasElement>(null);
  const heroBagCanvasRef = useRef<HTMLCanvasElement>(null);
  const [animatedOrders, setAnimatedOrders] = useState<number>(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const { reservarCupo, nextAvailable, slots: deliverySlots } = useDeliverySlots();
  const [selectedDeliverySlot, setSelectedDeliverySlot] = useState<"miercoles" | "viernes" | null>(null);

  const [showOrderSuccessAnimation, setShowOrderSuccessAnimation] = useState<boolean>(false);
  const [appliedAmbassador, setAppliedAmbassador] = useState<any>(null);
  const [isReferralApplied, setIsReferralApplied] = useState<boolean>(false);
  const [orderHistory, setOrderHistory] = useState<OrderRecord[]>([]);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showReferralDashboard, setShowReferralDashboard] = useState<boolean>(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const totalCarrito = cart.reduce((acc, item) => acc + item.price, 0);

  const miercolesSlot = deliverySlots['miercoles'];
  const viernesSlot = deliverySlots['viernes'];
  const [ambosAgotados, setAmbosAgotados] = useState(false);
  const [slotMiercoles, setSlotMiercoles] = useState({ cuposTotal: 50, cuposUsados: 0, soldOut: false });
  const [slotViernes, setSlotViernes] = useState({ cuposTotal: 50, cuposUsados: 0, soldOut: false });

  useEffect(() => {
    const unsubM = onSnapshot(doc(db, "delivery_slots", "miercoles"), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setSlotMiercoles({
          cuposTotal: d.cuposTotal || 50,
          cuposUsados: d.cuposUsados || 0,
          soldOut: (d.cuposUsados || 0) >= (d.cuposTotal || 50)
        });
      }
    });
    const unsubV = onSnapshot(doc(db, "delivery_slots", "viernes"), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setSlotViernes({
          cuposTotal: d.cuposTotal || 50,
          cuposUsados: d.cuposUsados || 0,
          soldOut: (d.cuposUsados || 0) >= (d.cuposTotal || 50)
        });
      }
    });
    return () => { unsubM(); unsubV(); };
  }, []);

  useEffect(() => {
    setAmbosAgotados(slotMiercoles.soldOut && slotViernes.soldOut);
  }, [slotMiercoles.soldOut, slotViernes.soldOut]);

  const getThemeColor = () => {
    if (selectedFruits.length === 0) return "#a855f7";
    const firstFruit = selectedFruits[0];
    const colorMap: Record<string, string> = {
      fresa: "#ef4444",   // Red
      mango: "#f59e0b",   // Amber
      sandia: "#f43f5e",  // Pink/Red
      limon: "#84cc16",   // Lime
      uva: "#8b5cf6",     // Purple
      durazno: "#fb923c"  // Orange
    };
    return colorMap[firstFruit.id] || "#a855f7";
  };
  const themeColor = getThemeColor();

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
  const [stockRemaining, setStockRemaining] = useState<number>(() => Math.floor(Math.random() * 5) + 28);
  const [userPhone, setUserPhone] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    // Simulate stock decreasing slightly over time for urgency
    const interval = setInterval(() => {
      setStockRemaining(prev => {
        if (prev <= 10) return prev;
        return Math.random() > 0.65 ? prev - 1 : prev;
      });
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [deliveryTime, setDeliveryTime] = useState<string>("");
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [deliveryZone, setDeliveryZone] = useState<'calderon' | 'fuera' | null>(null);

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
  const isPathAdmin = 
    window.location.pathname === "/admin" || 
    window.location.pathname.startsWith("/admin/") ||
    window.location.search.includes("admin") || 
    window.location.hash.includes("admin");

  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    // Give a small delay to ensure smooth transition
    const timer = setTimeout(() => setIsAppLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "stats"), (docSnap) => {
      if (docSnap.exists()) {
        const statsData = docSnap.data();
        setAnimatedOrders(29 + (statsData.totalOrders || 0));
      }
    });
    return () => unsub();
  }, []);

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
    const hardcoded = referralCodes[raw];
    if (hardcoded) {
      if (hardcoded.applyTo === 'grande' && selectedSize === 'mini') {
        setReferralMsg({ 
          text: "Este código aplica solo para el Grande ($2.50). ¡Cámbialo y aprovecha!", 
          type: "err" 
        });
        return;
      }
      
      setDiscountPct(hardcoded.value);
      setAppliedAmbassador(hardcoded.ambassador || null);
      setAppliedReferralCode(raw);
      setReferralMsg({ text: `✓ Código ${raw} aplicado — ${hardcoded.description}`, type: "ok" });
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
      if (selectedSize === 'mini') {
        setReferralMsg({ 
          text: "El código de referido aplica al Grande — te recomendamos cambiarlo para aprovechar mejor.", 
          type: "err" 
        });
        return;
      }

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
          setDiscountPct(10);
          setAppliedAmbassador(null);
          setAppliedReferralCode(raw);
          setReferralMsg({ text: `✓ Código ${raw} aplicado — 10% off en Grande`, type: "ok" });
          setIsReferralApplied(true);
          setTimeout(() => setIsReferralApplied(false), 2000);
          return;
        } else {
          // Fallback: if it matches pattern but not in DB yet (maybe offline or new), 
          // we still allow it to ensure "it works" for the user.
          setIsLoyaltyRewardApplied(false);
          setDiscountPct(10);
          setAppliedAmbassador(null);
          setReferralMsg({ text: `✓ Código ${raw} aplicado — 10% off en Grande`, type: "ok" });
          setIsReferralApplied(true);
          setTimeout(() => setIsReferralApplied(false), 2000);
          return;
        }
      } catch (e) {
        console.error("Error verifying code:", e);
        // Fallback on error
        setIsLoyaltyRewardApplied(false);
        setDiscountPct(10);
        setAppliedAmbassador(null);
        setReferralMsg({ text: `✓ Código ${raw} aplicado — 10% off en Grande`, type: "ok" });
        setIsReferralApplied(true);
        setTimeout(() => setIsReferralApplied(false), 2000);
        return;
      }
    }

    setDiscountPct(0);
    setAppliedAmbassador(null);
    setReferralMsg({ text: "Código no válido.", type: "err" });
  };

  const applyLoyaltyReward = () => {
    if (!userProfile || (userProfile.loyaltyPoints || 0) < LOYALTY_THRESHOLD) {
      setReferralMsg({ text: `Necesitas ${LOYALTY_THRESHOLD} puntos para canjear.`, type: "err" });
      return;
    }

    setLoyaltyFreeTopping(true);
    setIsLoyaltyRewardApplied(true);
    setAppliedReferralCode(null);
    setReferralMsg({ text: "✓ ¡Aderezo gratis desbloqueado! Elige el que quieras sin costo adicional", type: "ok" });
    setIsReferralApplied(true);
    setTimeout(() => setIsReferralApplied(false), 2000);
  };

  const addToCart = () => {
    if (selectedFruits.length === 0) {
      setToastMsg("Selecciona al menos una fruta 🍓");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }
    
    const newItem: CartItem = {
      id: `item_${Date.now()}`,
      fruits: [...selectedFruits],
      toppings: [...selectedToppings],
      size: selectedSize,
      quantity,
      price: parseFloat(totalPrice)
    };
    
    setCart(prev => [...prev, newItem]);
    setSelectedFruits([]);
    setSelectedToppings([]);
    setQuantity(1);
    setShowCart(true);
    playClickSound();
    
    setToastMsg("¡Agregado al carrito! 🛒");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const confirmOrder = () => {
    // If there's an item currently being built, add it to cart automatically
    if (selectedFruits.length > 0) {
      const newItem: CartItem = {
        id: `direct_${Date.now()}`,
        fruits: [...selectedFruits],
        toppings: [...selectedToppings],
        size: selectedSize,
        quantity,
        price: parseFloat(totalPrice)
      };
      
      setCart(prev => [...prev, newItem]);
      // Reset builder state
      setSelectedFruits([]);
      setSelectedToppings([]);
      setQuantity(1);
      
      // We'll show the modal. Since state updates are async, 
      // the modal below will render with the updated cart in the next cycle.
    } else if (cart.length === 0) {
      // If no current selection and nothing in cart
      setToastMsg("Agrega algo a tu pedido primero 🍓");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }
    
    setShowReviewModal(true);
  };

  const handleFinalConfirmation = async () => {
    setShowReviewModal(false);
    setShowPaymentModal(true);
  };

  const finalizeWhatsAppRedirect = async () => {
    if (!deliveryZone) {
      setToastMsg("Por favor selecciona tu zona de entrega 📍");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    if (!selectedDeliverySlot) {
      setToastMsg("Por favor selecciona un día de entrega 📅");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    if (!userPhone || userPhone.length < 9) {
      setToastMsg("Por favor ingresa tu WhatsApp para tus puntos 📱");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    const cupoReservado = await reservarCupo(selectedDeliverySlot);
    if (!cupoReservado) {
      setToastMsg("¡Lo sentimos! Ese día ya no tiene cupos disponibles. Elige otro día.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
      return;
    }

    // Show success animation first
    setShowOrderSuccessAnimation(true);
    
    const cartItemsText = cart.map((item, i) => {
      const sz = dynamicSizes[item.size];
      const fruitNames = item.fruits.map(f => `${f.emoji} ${f.name}`).join(" + ");
      const tops = item.toppings.length > 0 ? item.toppings.map(t => t.name).join(", ") : "Sin aderezos";
      return `${i + 1}. ${sz.label} (${sz.weight}g) de ${fruitNames} con ${tops} x${item.quantity} uds`;
    }).join("\n");

    const totalCartPrice = cart.reduce((acc, item) => acc + item.price, 0);
    
    const deliveryTimeLine = deliveryTime ? `⏰ Horario preferido: ${deliveryTime}\n` : "";
    const deliveryAddressLine = `📍 Dirección: ${deliveryAddress || "Por coordinar en chat"}\n`;
    const slotLabel = selectedDeliverySlot === 'miercoles' ? 'Miércoles' : 'Viernes';
    const deliveryLine = `📅 Día de entrega: ${slotLabel} desde las 12:00pm\n`;
    const loyaltyLine = loyaltyFreeTopping ? "🎁 Aderezo extra GRATIS (canje de puntos)\n" : "";
    const ambassadorLine = appliedAmbassador ? `🎖️ Embajador: ${appliedAmbassador}\n` : "";

    const deliveryCost = deliveryZone === 'fuera' ? 1.50 : 0;
    const finalTotalWithDelivery = (totalCartPrice + deliveryCost).toFixed(2);

    const msg = encodeURIComponent(
      `¡Hola TYANGO! 🍓 He realizado el pago de mi pedido:\n\n` +
      `${cartItemsText}\n\n` +
      `💜 Subtotal: $${totalCartPrice.toFixed(2)}\n` +
      `🛵 Delivery: ${deliveryZone === 'calderon' ? 'Gratis (Calderón)' : '$1.50 (Fuera de Calderón)'}\n` +
      `💰 TOTAL: $${finalTotalWithDelivery}\n` +
      loyaltyLine +
      ambassadorLine +
      deliveryLine +
      deliveryAddressLine +
      `🏦 Pago: Transferencia Banco Pichincha\n` +
      `📱 WhatsApp: ${userPhone}\n\n` +
      `¡Por favor confírmame el recibo! 🙌`
    );

    const orderId = `order_${Date.now()}`;
    // handle logic...
    
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

    const cartSummary = cart.map(item => {
      const f = item.fruits.map(fr => fr.name).join(" + ");
      const t = item.toppings.map(to => to.name).join(", ") || "Sin aderezos";
      return `${item.quantity}x [${dynamicSizes[item.size].label}] ${f} (+ ${t})`;
    }).join("\n");

    const totalToPay = totalCartPrice;

    const commissionOwed = appliedAmbassador 
      ? cart.reduce((acc, item) => acc + (item.size === 'mini' ? 0.20 : 0.25), 0)
      : 0;

    const newOrder = {
      id: orderId,
      userId: currentProfile?.userId || "guest",
      itemsSummary: cartSummary,
      itemCount: cart.length,
      total: totalToPay,
      date: new Date().toISOString(),
      ambassador: appliedAmbassador || null,
      commissionOwed: commissionOwed,
      deliverySlot: selectedDeliverySlot,
      deliveryDay: selectedDeliverySlot === 'miercoles' ? 'Miércoles' : 'Viernes'
    };

    // Save to Firestore for Admin (Central Registry)
    try {
      await setDoc(doc(db, "orders", orderId), {
        ...newOrder,
        timestamp: serverTimestamp(),
        status: "pending",
        phone: userPhone,
        cart: cart // Store the raw cart for better history
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
      const earnedPoints = Math.floor(totalToPay);
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
      playSuccessSound();
      setShowOrderSuccessAnimation(false);
      setOrderConfirmed(true);
      setShowPaymentModal(false);
      
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
  
  const effectiveDiscountPct = discountPct;
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
      {/* Recent Social Proof Popups */}
      <RecentActivity />

      {/* Cart Drawer */}
      <AnimatePresence>
        {showCart && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCart(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[450]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[#0d0d0d] border-l border-white/10 z-[460] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-600/20 rounded-2xl flex items-center justify-center text-purple-400">
                    <ShoppingBag size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">TU CARRITO</h3>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{cart.length} productos seleccionados</p>
                  </div>
                </div>
                <button onClick={() => setShowCart(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                    <div className="text-6xl">🛒</div>
                    <p className="font-black uppercase tracking-widest text-xs">Tu carrito está vacío</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="p-4 bg-white/5 border border-white/10 rounded-[32px] flex items-center gap-4 group">
                      <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl">
                        {item.fruits[0]?.emoji}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-black uppercase tracking-tight mb-1">
                          {item.fruits.map(f => f.name).join(" + ")}
                        </div>
                        <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                          {dynamicSizes[item.size].label} · x{item.quantity}
                        </div>
                        <div className="text-sm font-black text-amber-400">${item.price.toFixed(2)}</div>
                      </div>
                      <button 
                        onClick={() => setCart(prev => prev.filter(x => x.id !== item.id))}
                        className="p-2 text-white/20 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 bg-[#111] border-t border-white/10 space-y-4">
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                      Total estimado
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black text-white">
                        ${totalCarrito.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowCart(false);
                      confirmOrder();
                    }}
                    className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-purple-600/20"
                  >
                    Confirmar Pedido
                  </motion.button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Cart Trigger */}
      <AnimatePresence>
        {cart.length > 0 && !showCart && (
          <motion.button
            initial={{ scale: 0, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: 50 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowCart(true)}
            className="fixed bottom-6 right-6 z-[440] w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-600/40 relative"
          >
            <ShoppingBag size={24} />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 text-black text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#0a0a0a]">
              {cart.reduce((acc, i) => acc + i.quantity, 0)}
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div 
          className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full transition-colors duration-1000" 
          style={{ backgroundColor: `${themeColor}33` }}
        />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-600/10 blur-[120px] rounded-full" />
        <div 
          className="absolute inset-0 h-screen opacity-50" 
          style={{ 
            backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRleHQgeT0iMzAiIGZvbnQtc2l6ZT0iMjAiIG9wYWNpdHk9IjAuMDQiPvCfkpM8L3RleHQ+PHRleHQgeD0iMzAiIHk9IjU1IiBmb250LXNpemU9IjE2IiBvcGFjaXR5PSIwLjAzIj7wn6itPC90ZXh0Pjwvc3ZnPg==")`,
            backgroundSize: '80px 80px'
          }} 
        />
      </div>

      {/* Announcement Bar */}
      <div className="fixed top-0 left-0 right-0 z-60 bg-purple-700 py-2 px-4 flex items-center justify-center gap-3">
        <motion.div
          className="flex items-center gap-8"
          animate={{ x: [0, -20, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        >
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">
            🍓 Entregas Miércoles y Viernes · 12:00pm · Calderón gratis
          </span>
          <span className="text-white/40">·</span>
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">
            🛵 Fuera de Calderón +$1.50
          </span>
          <span className="text-white/40">·</span>
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">
            🍉 50 cupos por día
          </span>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-8 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-12 py-4 md:py-6 backdrop-blur-md bg-black/20 border-b border-white/5">
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
      <section className="relative h-[85vh] overflow-hidden">
        {/* Imagen de fondo */}
        <img
          src="/images/tyango-hero.jpg"
          alt="TYANGO Snack de Fruta Fresca"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        
        {/* Fallback si no hay imagen — canvas actual */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 to-black flex items-center justify-center">
          <div className="relative w-72 h-72 opacity-60">
            <canvas 
              ref={heroBagCanvasRef}
              width={300}
              height={300}
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/75" />

        {/* Badges flotantes */}
        <motion.div 
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 2, delay: 0 }}
          className="absolute top-8 left-6 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full backdrop-blur-md z-20"
        >
          <span className="text-[10px] font-black uppercase tracking-widest text-green-400">
            100% Fruta Fresca
          </span>
        </motion.div>

        <motion.div 
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 2, delay: 0.4 }}
          className="absolute top-12 right-6 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full backdrop-blur-md z-20"
        >
          <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
            Sellado al Vacío
          </span>
        </motion.div>

        {/* Contenido inferior */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-10 z-10">
          
          {/* Contador de pedidos */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 mb-4"
          >
            <div className="flex -space-x-2">
              {['🍓','🥭','🍉'].map((e, i) => (
                <div key={i} className="w-7 h-7 rounded-full bg-purple-600/60 border-2 border-purple-500 flex items-center justify-center text-xs">
                  {e}
                </div>
              ))}
            </div>
            <span className="text-sm text-white/70">
              <span className="font-black text-white">{animatedOrders}</span> personas ya pidieron
            </span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-7xl font-display font-black tracking-tighter leading-[0.88] mb-6 text-white text-left"
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

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-3"
          >
            <a 
              href="#configurar"
              className="flex-1 py-4 bg-white text-black font-black uppercase tracking-widest rounded-full text-[11px] text-center hover:bg-purple-500 hover:text-white transition-all underline-none decoration-transparent"
            >
              Armar mi TYANGO
            </a>
            <a 
              href="#entregas"
              className="px-6 py-4 bg-white/10 border border-white/20 backdrop-blur font-black uppercase tracking-widest rounded-full text-[11px] text-center hover:bg-white/20 transition-all underline-none decoration-transparent"
            >
              Ver cupos
            </a>
          </motion.div>
        </div>
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
            { label: "Pedidos", value: animatedOrders, icon: <ShoppingBag size={20} /> },
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



      {/* DÍAS DE ENTREGA SECTION */}
      <section id="entregas" className="py-20 px-6 relative z-10">
        <div className="max-w-4xl mx-auto">

          {/* Título */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-400/80">
                Disponibilidad esta semana
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-black tracking-tighter mb-4">
              DÍAS DE <span className="text-purple-500">ENTREGA.</span>
            </h2>
            <p className="text-white/40 font-medium text-sm max-w-md mx-auto">
              Abrimos cupos dos veces por semana. Cuando se agotan, se agotan.
            </p>
          </motion.div>

          {/* Cards de días */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">

            {/* MIÉRCOLES */}
            {(() => {
              const restantes = slotMiercoles.cuposTotal - slotMiercoles.cuposUsados;
              const pct = (slotMiercoles.cuposUsados / slotMiercoles.cuposTotal) * 100;
              const urgente = restantes <= 15 && !slotMiercoles.soldOut;
              const muyUrgente = restantes <= 5 && !slotMiercoles.soldOut;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className={`relative p-8 rounded-[32px] border overflow-hidden transition-all ${
                    slotMiercoles.soldOut
                      ? "bg-white/[0.02] border-white/5"
                      : urgente
                        ? "bg-orange-500/5 border-orange-500/20"
                        : "bg-white/5 border-purple-500/20"
                  }`}
                >
                  {/* Sold Out Overlay */}
                  {slotMiercoles.soldOut && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm rounded-[32px] z-10 gap-4">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="text-center space-y-3"
                      >
                        <div className="text-6xl md:text-7xl font-display font-black tracking-tighter text-red-500">
                          SOLD OUT
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-white/40">
                          Cupos agotados · Próxima semana
                        </div>
                      </motion.div>
                    </div>
                  )}

                  {/* Header del día */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">
                        Día de entrega
                      </div>
                      <div className="text-4xl font-display font-black tracking-tighter text-white">
                        Miércoles
                      </div>
                      <div className="text-sm font-bold text-white/40 mt-1">
                        Desde las 12:00pm
                      </div>
                    </div>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${
                      slotMiercoles.soldOut ? "bg-white/5" : urgente ? "bg-orange-500/10" : "bg-purple-500/10"
                    }`}>
                      📦
                    </div>
                  </div>

                  {/* Contador de cupos */}
                  <div className="mb-4">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <div className={`text-5xl font-black tracking-tighter ${
                          muyUrgente ? "text-red-400" : urgente ? "text-orange-400" : "text-purple-400"
                        }`}>
                          {Math.max(0, restantes)}
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-white/30">
                          cupos disponibles
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-white/20">
                          {slotMiercoles.cuposUsados}
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-widest text-white/20">
                          reservados
                        </div>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, pct)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full rounded-full transition-colors ${
                          slotMiercoles.soldOut ? "bg-red-500" :
                          muyUrgente ? "bg-red-500" :
                          urgente ? "bg-orange-500" : "bg-purple-500"
                        }`}
                      />
                    </div>

                    {/* Indicadores de cupos visuales — 10 bloques */}
                    <div className="grid grid-cols-10 gap-1 mt-3">
                      {[...Array(10)].map((_, i) => {
                        const bloqueOcupado = (i + 1) * 5 <= slotMiercoles.cuposUsados;
                        return (
                          <motion.div
                            key={i}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.03 }}
                            className={`h-2 rounded-full transition-all ${
                              bloqueOcupado
                                ? slotMiercoles.soldOut ? "bg-red-500/60" : "bg-purple-500/60"
                                : "bg-white/10"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Badge de urgencia */}
                  {muyUrgente && !slotMiercoles.soldOut && (
                    <motion.div
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl"
                    >
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-red-400">
                        ¡Solo quedan {restantes} cupos!
                      </span>
                    </motion.div>
                  )}
                  {urgente && !muyUrgente && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-orange-400">
                        Quedan pocos cupos — ¡pide pronto!
                      </span>
                    </div>
                  )}
                  {!urgente && !slotMiercoles.soldOut && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-green-400">
                        Cupos disponibles
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })()}

            {/* VIERNES */}
            {(() => {
              const restantes = slotViernes.cuposTotal - slotViernes.cuposUsados;
              const pct = (slotViernes.cuposUsados / slotViernes.cuposTotal) * 100;
              const urgente = restantes <= 15 && !slotViernes.soldOut;
              const muyUrgente = restantes <= 5 && !slotViernes.soldOut;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className={`relative p-8 rounded-[32px] border overflow-hidden transition-all ${
                    slotViernes.soldOut
                      ? "bg-white/[0.02] border-white/5"
                      : urgente
                        ? "bg-orange-500/5 border-orange-500/20"
                        : "bg-white/5 border-amber-500/20"
                  }`}
                >
                  {/* Sold Out Overlay */}
                  {slotViernes.soldOut && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-[32px] z-10">
                      <div className="text-center space-y-3">
                        <div className="text-5xl font-black tracking-tighter text-red-400">SOLD OUT</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-white/40">
                          Cupos agotados · Próxima semana
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Header del día */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">
                        Día de entrega
                      </div>
                      <div className="text-4xl font-display font-black tracking-tighter text-white">
                        Viernes
                      </div>
                      <div className="text-sm font-bold text-white/40 mt-1">
                        Desde las 12:00pm
                      </div>
                    </div>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${
                      slotViernes.soldOut ? "bg-white/5" : urgente ? "bg-orange-500/10" : "bg-amber-500/10"
                    }`}>
                      🛵
                    </div>
                  </div>

                  {/* Contador de cupos */}
                  <div className="mb-4">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <div className={`text-5xl font-black tracking-tighter ${
                          muyUrgente ? "text-red-400" : urgente ? "text-orange-400" : "text-amber-400"
                        }`}>
                          {Math.max(0, restantes)}
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-white/30">
                          cupos disponibles
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-white/20">
                          {slotViernes.cuposUsados}
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-widest text-white/20">
                          reservados
                        </div>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, pct)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full rounded-full transition-colors ${
                          slotViernes.soldOut ? "bg-red-500" :
                          muyUrgente ? "bg-red-500" :
                          urgente ? "bg-orange-500" : "bg-amber-500"
                        }`}
                      />
                    </div>

                    {/* Indicadores de cupos visuales — 10 bloques */}
                    <div className="grid grid-cols-10 gap-1 mt-3">
                      {[...Array(10)].map((_, i) => {
                        const bloqueOcupado = (i + 1) * 5 <= slotViernes.cuposUsados;
                        return (
                          <motion.div
                            key={i}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.03 }}
                            className={`h-2 rounded-full transition-all ${
                              bloqueOcupado
                                ? slotViernes.soldOut ? "bg-red-500/60" : "bg-amber-500/60"
                                : "bg-white/10"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Badge de urgencia */}
                  {muyUrgente && !slotViernes.soldOut && (
                    <motion.div
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl"
                    >
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-red-400">
                        ¡Solo quedan {restantes} cupos!
                      </span>
                    </motion.div>
                  )}
                  {urgente && !muyUrgente && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-orange-400">
                        Quedan pocos cupos — ¡pide pronto!
                      </span>
                    </div>
                  )}
                  {!urgente && !slotViernes.soldOut && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-green-400">
                        Cupos disponibles
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })()}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div className="flex items-center gap-4 p-5 bg-green-500/5 border border-green-500/20 rounded-2xl">
              <div className="text-2xl">🏠</div>
              <div>
                <div className="text-sm font-black text-white">Calderón</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-green-400">
                  Delivery gratis
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
              <div className="text-2xl">🛵</div>
              <div>
                <div className="text-sm font-black text-white">Fuera de Calderón</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  + $1.50 adicional
                </div>
              </div>
            </div>
          </div>

          {/* Banner inferior — ambos agotados */}
          {slotMiercoles.soldOut && slotViernes.soldOut && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 bg-red-500/5 border border-red-500/20 rounded-[32px] text-center space-y-4"
            >
              <div className="text-4xl font-display font-black tracking-tighter text-red-400">
                SOLD OUT 😔
              </div>
              <p className="text-white/40 font-medium text-sm">
                Los cupos de esta semana se agotaron. Vuelve el próximo lunes para reservar tu TYANGO del miércoles o viernes.
              </p>
              <div className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
                  Nuevos cupos cada lunes
                </span>
              </div>
            </motion.div>
          )}

          {/* CTA hacia el configurador */}
          {(!slotMiercoles.soldOut || !slotViernes.soldOut) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mt-8"
            >
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="#configurar"
                className="inline-flex items-center gap-3 px-10 py-5 bg-purple-600 hover:bg-purple-500 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-purple-600/20"
              >
                <span>Reservar cupo</span>
                <ChevronDown size={14} className="rotate-[-90deg]" />
              </motion.a>
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-2">
                {slotMiercoles.soldOut ? 'Miércoles agotado · Quedan cupos para el Viernes' : 'Cupos disponibles para Miércoles y Viernes'}
              </p>
            </motion.div>
          )}

        </div>
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

      {/* Productivity Grid Section */}
      <section id="productos" className="py-16 px-6 relative z-10">
        <div className="max-w-2xl mx-auto">
          
          <div className="mb-10 text-center md:text-left">
            <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">
              Lo que tenemos para ti
            </div>
            <h2 className="text-3xl font-display font-black tracking-tighter text-white">
              Una experiencia de <span className="text-purple-500">sabor real.</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              {
                nombre: "TYANGO Mini",
                desc: "El snack perfecto para el antojo rápido",
                precio: "$1.50",
                peso: "155g",
                color: "from-blue-900/40 to-blue-800/20",
                border: "border-blue-500/20",
                img: "/images/tyango-mini.jpg",
                emoji: "🍓",
                sizeId: "mini"
              },
              {
                nombre: "TYANGO Grande",
                desc: "La porción estrella, sabor al máximo",
                precio: "$2.50",
                peso: "311g",
                color: "from-purple-900/40 to-purple-800/20",
                border: "border-purple-500/20",
                img: "/images/tyango-grande.jpg",
                emoji: "🥭",
                sizeId: "clasico",
                badge: "⭐ Más elegido"
              }
            ].map((prod, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -4 }}
                className={`relative bg-gradient-to-b ${prod.color} border ${prod.border} rounded-[28px] overflow-hidden flex flex-col`}
              >
                {/* Badge */}
                {prod.badge && (
                  <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-purple-600 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-lg">
                    {prod.badge}
                  </div>
                )}

                {/* Imagen con arco redondeado superior — estilo Picosa Flame */}
                <div className="relative h-44 bg-white/5 overflow-hidden">
                  <img
                    src={prod.img}
                    alt={prod.nombre}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  {/* Fallback emoji */}
                  <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-30">
                    {prod.emoji}
                  </div>
                  {/* Arco inferior */}
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-[#0a0a0a] rounded-t-[50%]" />
                </div>

                {/* Info */}
                <div className="p-4 pt-2 flex flex-col flex-1 justify-between gap-3">
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">
                      {prod.peso}
                    </div>
                    <div className="text-base font-black tracking-tight text-white leading-tight">
                      {prod.nombre}
                    </div>
                    <div className="text-[10px] text-white/40 mt-1 leading-tight">
                      {prod.desc}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="text-xl font-black text-white">{prod.precio}</div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedSize(prod.sizeId);
                        document.getElementById('configurar')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="px-4 py-2 bg-purple-600 rounded-full text-[9px] font-black uppercase tracking-widest text-white hover:bg-purple-500 transition-colors"
                    >
                      Pedir
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
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
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={referralInput}
                    onChange={(e) => setReferralInput(e.target.value)}
                    placeholder="Código de descuento"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold uppercase tracking-widest focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <div className="mt-1 ml-2 text-[9px] text-white/30 italic">Los códigos aplican al tamaño Grande</div>
                </div>
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
                    <div className="text-xs font-bold">Tienes {userProfile.loyaltyPoints} puntos. Canjea {LOYALTY_THRESHOLD} por un ADEREZO GRATIS.</div>
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
                      <div className="flex flex-col items-center">
                        <span className={size.isSoldOut ? "line-through opacity-50" : ""}>
                          {size.label} {size.weight}g
                        </span>
                        {key === 'clasico' && isActive && <span className="text-[10px] mt-0.5">⭐</span>}
                      </div>
                      {size.isSoldOut && (
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black tracking-[0.2em] text-white bg-black/40 rounded-inherit">
                          AGOTADO
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {selectedSize === 'clasico' && (
                <p className="text-[9px] text-purple-400/60 italic text-center mt-2">
                  La mayoría de nuestros clientes eligen el Grande
                </p>
              )}

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

              {/* Badges removed */}

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
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Total actual</div>
                    <div className="flex items-baseline">
                      <span className="text-xl font-black align-super mr-0.5 text-white/60">$</span>
                      <span className="text-5xl font-black tracking-tighter tabular-nums" style={{ color: themeColor, fontVariantNumeric: 'tabular-nums' }}>{intPart}</span>
                      <span className="text-2xl font-black text-white/60 align-super">.{decPart}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={addToCart}
                      disabled={selectedFruits.length === 0}
                      className="flex items-center justify-center gap-2 py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-40"
                    >
                      <Plus size={14} />
                      <span>Añadir</span>
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        addToCart();
                        setTimeout(() => setShowCart(true), 300);
                      }}
                      disabled={selectedFruits.length === 0}
                      style={{ backgroundColor: themeColor }}
                      className="flex items-center justify-center gap-2 py-5 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all disabled:opacity-50"
                    >
                      <span>Checkout</span>
                    </motion.button>
                  </div>
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

                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={confirmOrder}
                    disabled={(cart.length === 0 && selectedFruits.length === 0) || orderConfirmed}
                    className="w-full flex items-center justify-center gap-2 py-5 bg-purple-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-500 transition-all shadow-xl shadow-purple-600/20 disabled:opacity-50"
                  >
                    {orderConfirmed ? <CheckCircle2 size={14} /> : <MessageCircle size={14} />}
                    {orderConfirmed 
                      ? "✓ Pedido confirmado" 
                      : cart.length > 0 
                        ? "Agregar al pedido" 
                        : "Pedir Ahora"
                    }
                  </motion.button>
                  
                  <div className="space-y-3">
                    <div className={`flex items-center justify-center gap-2 px-4 py-2 border rounded-xl transition-colors duration-500 ${
                      stockRemaining > 30 
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
                        : stockRemaining > 10 
                          ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' 
                          : 'bg-red-500/10 border-red-500/20 text-red-500 animate-pulse'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full animate-ping ${
                        stockRemaining > 30 
                          ? 'bg-amber-500' 
                          : stockRemaining > 10 
                            ? 'bg-orange-500' 
                            : 'bg-red-500'
                      }`} />
                      <span className="text-[9px] font-black uppercase tracking-widest">
                        {stockRemaining > 30 
                          ? `Solo quedan ${stockRemaining} unidades disponibles hoy` 
                          : stockRemaining > 10 
                            ? `⚠️ ¡Quedan solo ${stockRemaining}! Pide antes de que se agoten` 
                            : `🚨 ¡ÚLTIMAS ${stockRemaining} UNIDADES! Se acaban hoy`}
                      </span>
                    </div>
                    {/* Visual Stock Progress Bar */}
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${
                          stockRemaining > 30 
                            ? 'bg-amber-500' 
                            : stockRemaining > 10 
                              ? 'bg-orange-500' 
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${(stockRemaining / 100) * 100}%` }}
                      />
                    </div>
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

      {/* FAQ Section */}
      <section className="py-16 px-6 relative z-10 border-t border-white/5">
        <div className="max-w-2xl mx-auto">
          
          <div className="text-center mb-12">
            <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">
              Queremos guiar tu experiencia
            </div>
            <h2 className="text-3xl font-display font-black tracking-tighter text-white">
              Preguntas <span className="text-purple-500">frecuentes.</span>
            </h2>
          </div>

          <div className="space-y-0 divide-y divide-white/10">
            {[
              {
                icon: "🍓",
                pregunta: "¿Qué frutas tienen disponibles?",
                respuesta: "Trabajamos con mango, fresa, sandía, pepino y jícama. Las frutas varían según la temporada para garantizar siempre la mejor frescura. Puedes combinar hasta 3 frutas en el modo Mix."
              },
              {
                icon: "📦",
                pregunta: "¿En qué horario realizan las entregas?",
                respuesta: "Entregamos los miércoles y viernes desde las 12:00pm. Abrimos 50 cupos por día. Dentro de Calderón el delivery es gratis, fuera de Calderón tiene un costo adicional de $1.50."
              },
              {
                icon: "🌶️",
                pregunta: "¿Puedo personalizar mi combinación?",
                respuesta: "¡Sí! Ese es el concepto TYANGO. Eliges tu fruta (o hasta 3 en modo Mix), tu aderezo (chamoy, chile limón, tajín o sal limón) y el tamaño. Cada TYANGO es único."
              },
              {
                icon: "💳",
                pregunta: "¿Cómo realizo el pago?",
                respuesta: "El pago se realiza por transferencia bancaria al Banco Pichincha antes de confirmar el pedido. Una vez transferido, nos envías el comprobante por WhatsApp y confirmamos tu cupo."
              },
              {
                icon: "🎁",
                pregunta: "¿Tienen códigos de descuento?",
                respuesta: "Sí, si tienes un código de embajador TYANGO puedes aplicarlo en el configurador para obtener un 5% de descuento. También acumulas puntos TYANGO con cada compra para canjear por aderezos gratis."
              },
              {
                icon: "🔄",
                pregunta: "¿Qué pasa si se agotan los cupos?",
                respuesta: "Los cupos se resetean cada semana el lunes. Si el miércoles está Sold Out, aún puedes reservar para el viernes. Si ambos días están agotados, vuelve el próximo lunes a las 12:00pm para ser de los primeros."
              }
            ].map((faq, i) => (
              <motion.div key={i} className="py-5">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 text-left group transition-all"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xl">{faq.icon}</span>
                    <span className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors leading-snug">
                      {faq.pregunta}
                    </span>
                  </div>
                  <motion.div
                    animate={{ rotate: openFaq === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0"
                  >
                    <ChevronDown size={18} className="text-white/40 group-hover:text-purple-400 transition-colors" />
                  </motion.div>
                </button>
                
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="pt-4 pl-9 text-sm text-white/50 font-medium leading-relaxed">
                        {faq.respuesta}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Instagram / Comunidad Section */}
      <section className="py-16 px-6 relative z-10">
        <div className="max-w-2xl mx-auto">
          
          <h2 className="text-2xl font-display font-black tracking-tighter text-white text-center mb-8 uppercase">
            Síguenos en <span className="text-purple-500">Instagram</span>
          </h2>

          {/* Grid 2x2 de fotos */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { src: "/images/ig-1.jpg", alt: "Joven con dos fundas de Tyango Mix" },
              { src: "/images/ig-2.jpg", alt: "Chica recibiendo su pedido Tyango" },
              { src: "/images/ig-3.jpg", alt: "Cliente feliz con su Tyango en exteriores" },
              { src: "/images/ig-4.jpg", alt: "Joven con su mochila y su Tyango" }
            ].map((foto, i) => (
              <motion.a
                key={i}
                href="https://www.instagram.com/tyango_ec/"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                className="relative aspect-square bg-white/5 border border-white/10 rounded-2xl overflow-hidden group"
              >
                <img
                  src={foto.src}
                  alt={foto.alt}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                {/* Fallback placeholder elegante */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-4xl opacity-20 group-hover:opacity-40 transition-opacity">🍓</div>
                </div>
                {/* Overlay en hover */}
                <div className="absolute inset-0 bg-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Instagram size={24} className="text-white" />
                </div>
              </motion.a>
            ))}
          </div>

          <div className="text-center">
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href="https://www.instagram.com/tyango_ec/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 rounded-full text-[11px] font-black uppercase tracking-widest text-white/70 hover:bg-purple-600/20 hover:border-purple-500/40 hover:text-white transition-all underline-none decoration-transparent"
            >
              <Instagram size={16} />
              @tyango_ec
            </motion.a>
          </div>
        </div>
      </section>

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
                    const text = `¡Prueba TYANGO! 🍓 Usa mi código ${userProfile.referralCode} para un 10% de descuento en tu Grande. 👉 ${window.location.href}`;
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
                              <div className="text-sm font-bold whitespace-pre-line">{order.itemsSummary}</div>
                            </div>
                            <div className="text-lg font-black tracking-tighter">${order.total.toFixed(2)}</div>
                          </div>
                          <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-white/30">
                            <ShoppingBag size={10} />
                            <span>{order.itemCount} {order.itemCount === 1 ? 'ítem' : 'ítems'}</span>
                            <span>•</span>
                            <span className="text-green-500/60 font-black">Completado</span>
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
                  <div className="space-y-6 max-h-[300px] overflow-y-auto custom-scroll pr-2">
                    {cart.map((item, index) => (
                      <div key={item.id} className={`${index !== 0 ? 'pt-6 border-t border-white/10' : ''} space-y-3`}>
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-1">
                              {dynamicSizes[item.size].label} · {item.quantity} unidades
                            </div>
                            <div className="text-sm font-black text-white leading-tight">
                              {item.fruits.map(f => f.name).join(" + ")}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-amber-500">${item.price.toFixed(2)}</div>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <div className="text-[9px] font-black uppercase tracking-widest text-white/20 bg-white/5 px-2 py-1 rounded-md">
                            Aderezos: {item.toppings.length > 0 ? item.toppings.map(t => t.name).join(", ") : "Sin aderezos"}
                          </div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-white/20 bg-white/5 px-2 py-1 rounded-md">
                            {dynamicSizes[item.size].weight * item.quantity}g total
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Total a pagar</div>
                      <div className="text-[9px] font-bold text-white/20 italic">
                        {cart.length} {cart.length === 1 ? 'ítem' : 'ítems'} en tu pedido
                      </div>
                    </div>
                    {(() => {
                      const totalCartValue = cart.reduce((acc, item) => acc + item.price, 0);
                      const deliveryCost = deliveryZone === 'fuera' ? 1.50 : 0;
                      const totalFinalValue = Math.max(0, totalCartValue + deliveryCost).toFixed(2);
                      const [cartInt, cartDec] = totalFinalValue.split('.');
                      return (
                        <div className="flex flex-col items-end gap-1">
                          {deliveryZone && (
                            <div className="text-[10px] font-black uppercase tracking-widest text-white/40">
                              Incluye {deliveryZone === 'calderon' ? 'Envío Gratis' : 'Envío $1.50'}
                            </div>
                          )}
                          <div className="flex items-baseline text-white">
                            <span className="text-xl font-black align-super mr-0.5 text-white/60">$</span>
                            <span className="text-5xl font-black tracking-tighter tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>{cartInt}</span>
                            <span className="text-2xl font-black text-white/60 align-super">.{cartDec}</span>
                          </div>
                        </div>
                      );
                    })()}
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

                  {/* Selector de zona */}
                  <div className="space-y-3">
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/40">
                      Zona de entrega
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {/* Dentro de Calderón */}
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setDeliveryZone('calderon')}
                        className={`relative p-4 rounded-2xl border transition-all text-left ${
                          deliveryZone === 'calderon'
                            ? "bg-green-500/10 border-green-500/40"
                            : "bg-white/5 border-white/10 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                              deliveryZone === 'calderon' ? "bg-green-500/20" : "bg-white/5"
                            }`}>
                              🏠
                            </div>
                            <div>
                              <div className="text-sm font-black text-white">Dentro de Calderón</div>
                              <div className="text-[10px] font-bold text-white/40">
                                Sector Calderón y alrededores
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
                              <span className="text-[10px] font-black uppercase tracking-widest text-green-400">
                                Gratis
                              </span>
                            </div>
                            {deliveryZone === 'calderon' && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                              >
                                <CheckCircle2 size={18} className="text-green-400" />
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </motion.button>

                      {/* Fuera de Calderón */}
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setDeliveryZone('fuera')}
                        className={`relative p-4 rounded-2xl border transition-all text-left ${
                          deliveryZone === 'fuera'
                            ? "bg-amber-500/10 border-amber-500/40"
                            : "bg-white/5 border-white/10 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                              deliveryZone === 'fuera' ? "bg-amber-500/20" : "bg-white/5"
                            }`}>
                              🛵
                            </div>
                            <div>
                              <div className="text-sm font-black text-white">Fuera de Calderón</div>
                              <div className="text-[10px] font-bold text-white/40">
                                Resto de Quito y alrededores
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full">
                              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                                + $1.50
                              </span>
                            </div>
                            {deliveryZone === 'fuera' && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                              >
                                <CheckCircle2 size={18} className="text-amber-400" />
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    </div>

                    {!deliveryZone && (
                      <p className="text-[9px] font-bold text-amber-400/60 italic">
                        * Selecciona tu zona para ver el total final
                      </p>
                    )}
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
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/40">
                      Elige tu día de entrega
                    </div>
                    <DeliverySlotSelector
                      selectedSlot={selectedDeliverySlot}
                      onSelect={(dia) => {
                        setSelectedDeliverySlot(dia);
                        setDeliveryTime(dia === 'miercoles' ? 'Miércoles' : 'Viernes');
                      }}
                    />
                    {!selectedDeliverySlot && (
                      <p className="text-[9px] font-bold text-amber-400/60 italic">
                        * Selecciona un día para continuar
                      </p>
                    )}
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
                    {(() => {
                      const totalCartValue = cart.reduce((acc, item) => acc + item.price, 0);
                      const deliveryCost = deliveryZone === 'fuera' ? 1.50 : 0;
                      const [intP, decP] = Math.max(0, totalCartValue + deliveryCost).toFixed(2).split('.');
                      return (
                        <div className="flex items-baseline text-amber-500">
                          <span className="text-lg md:text-xl font-black align-super mr-0.5 text-white/60">$</span>
                          <span className="text-4xl md:text-5xl font-black tracking-tighter tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>{intP}</span>
                          <span className="text-xl md:text-2xl font-black text-white/60 align-super">.{decP}</span>
                        </div>
                      );
                    })()}
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
                  onClick={() => { setShowPaymentModal(false); setDeliveryZone(null); }}
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
      <div className="lg:hidden fixed bottom-6 left-6 right-6 z-[445] bg-[#111]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex justify-between items-center shadow-2xl">
        <div className="flex flex-col">
          {cart.length > 0 ? (
            <>
              <span className="text-xl font-black text-white">
                ${cart.reduce((acc, i) => acc + i.price, 0).toFixed(2)}
              </span>
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-black">
                {cart.reduce((acc, i) => acc + i.quantity, 0)} {cart.reduce((acc, i) => acc + i.quantity, 0) === 1 ? 'ÍTEM' : 'ÍTEMS'} · CARRITO
              </span>
            </>
          ) : (
            <>
              <span className="text-xl font-black text-white">${totalPrice}</span>
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-black">Total a pagar</span>
            </>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={cart.length > 0 ? () => setShowCart(true) : confirmOrder}
          disabled={selectedFruits.length === 0 && cart.length === 0}
          className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
            selectedFruits.length === 0 && cart.length === 0
              ? "bg-white/10 text-white/20"
              : cart.length > 0
                ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30"
                : "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
          }`}
        >
          {cart.length > 0 ? "Ver Carrito" : "Pedir Ahora"}
        </motion.button>
      </div>
    </div>
  );
}
