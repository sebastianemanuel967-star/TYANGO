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
  LogOut,
  User as UserIcon,
  Instagram
} from "lucide-react";
import { auth, db, googleProvider } from "./lib/firebase";
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from "firebase/auth";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy,
  limit,
  serverTimestamp,
  getDocFromServer
} from "firebase/firestore";

// ─── TYPES ───
interface Fruit {
  id: string;
  emoji: string;
  name: string;
}

interface Topping {
  id: string;
  emoji: string;
  name: string;
}

interface Size {
  label: string;
  price: number;
  weight: number;
}

interface Testimonial {
  name: string;
  role: string;
  text: string;
  avatar: string;
}

interface UserProfile {
  userId: string;
  referralCode: string;
  referralsCount: number;
  totalRewards: number;
  referredFriends: string[];
  email?: string;
  displayName?: string;
  photoURL?: string;
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

// ─── DATA ───
const fruits: Fruit[] = [
  { id: "mango", emoji: "🥭", name: "Mango" },
  { id: "pina", emoji: "🍍", name: "Piña" },
  { id: "fresa", emoji: "🍓", name: "Fresa" },
  { id: "sandia", emoji: "🍉", name: "Sandía" },
  { id: "pepino", emoji: "🥒", name: "Pepino" },
  { id: "melon", emoji: "🍈", name: "Melón" },
  { id: "manzana", emoji: "🍎", name: "Manzana" },
  { id: "uva", emoji: "🍇", name: "Uva Congelada" },
];

const toppings: Topping[] = [
  { id: "tajin", emoji: "🌶️", name: "Tajín" },
  { id: "tajin_picante", emoji: "🔥", name: "Tajín Picante" },
  { id: "limon", emoji: "🍋", name: "Limón" },
  { id: "miel", emoji: "🍯", name: "Miel" },
  { id: "gomitas", emoji: "🍬", name: "Gomitas" },
  { id: "takis", emoji: "🌮", name: "Takis" },
];

const sizes: Record<string, Size> = {
  mini: { label: "Mini", weight: 60, price: 0.6 },
  clasico: { label: "Clásico", weight: 100, price: 1.25 },
  premium: { label: "Premium", weight: 150, price: 1.75 },
};

const referralCodes: Record<string, number> = {
  TYANGO10: 10,
  AMIGO15: 15,
  PROMO20: 20,
  PRIMERA5: 5,
  FRUTAS10: 10,
  QUITO10: 10,
};

const testimonials: Testimonial[] = [
  {
    name: "María García",
    role: "Estudiante",
    text: "¡ENCHILATE con TYANGO! La mejor combinación de mango con tajín picante. Adictivo.",
    avatar: "👩‍🎓",
  },
  {
    name: "Carlos López",
    role: "Deportista",
    text: "Perfecto para después del gym. Fruta fresca, saludable y delicioso. ¡Recomendado!",
    avatar: "💪",
  },
  {
    name: "Ana Martínez",
    role: "Emprendedora",
    text: "La mejor opción para un snack rápido en la oficina. Calidad premium a buen precio.",
    avatar: "👩‍💼",
  },
  {
    name: "Diego Rodríguez",
    role: "Influencer",
    text: "¡ENCHILATE! Es la frase perfecta para describir TYANGO. Sabor explosivo.",
    avatar: "🎬",
  },
];

// ─── UTILS ───
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

// ─── CANVAS ART ───
const fruitArt = {
  mango: (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    const g = ctx.createRadialGradient(x - r * 0.15, y - r * 0.15, r * 0.08, x, y, r);
    g.addColorStop(0, "#FFF176");
    g.addColorStop(0.45, "#FFB800");
    g.addColorStop(1, "#E07000");
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.72, r, 0, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(180,90,0,.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
  },
  pina: (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    const g = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    g.addColorStop(0, "#FFFDE7");
    g.addColorStop(0.55, "#FFD600");
    g.addColorStop(1, "#E65100");
    ctx.beginPath();
    ctx.arc(x, y, r * 0.82, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(180,80,0,.4)";
    ctx.lineWidth = 2;
    ctx.stroke();
  },
  fresa: (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.2, r * 0.05, x, y, r);
    g.addColorStop(0, "#FF8A80");
    g.addColorStop(0.4, "#F44336");
    g.addColorStop(1, "#B71C1C");
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.88);
    ctx.bezierCurveTo(x - r * 0.82, y + r * 0.22, x - r * 0.95, y - r * 0.28, x - r * 0.5, y - r * 0.58);
    ctx.bezierCurveTo(x - r * 0.18, y - r * 0.92, x, y - r * 0.48, x, y - r * 0.28);
    ctx.bezierCurveTo(x, y - r * 0.48, x + r * 0.18, y - r * 0.92, x + r * 0.5, y - r * 0.58);
    ctx.bezierCurveTo(x + r * 0.95, y - r * 0.28, x + r * 0.82, y + r * 0.22, x, y + r * 0.88);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(130,15,15,.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  },
  sandia: (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.88);
    ctx.lineTo(x - r * 0.88, y + r * 0.72);
    ctx.lineTo(x + r * 0.88, y + r * 0.72);
    ctx.closePath();
    const g = ctx.createLinearGradient(x, y - r * 0.88, x, y + r * 0.72);
    g.addColorStop(0, "#FF5252");
    g.addColorStop(0.82, "#E53935");
    g.addColorStop(1, "#B71C1C");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "#43A047";
    ctx.lineWidth = r * 0.16;
    ctx.stroke();
  },
  pepino: (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    const g = ctx.createRadialGradient(x, y, r * 0.04, x, y, r);
    g.addColorStop(0, "#E8F5E9");
    g.addColorStop(0.48, "#81C784");
    g.addColorStop(1, "#2E7D32");
    ctx.beginPath();
    ctx.arc(x, y, r * 0.82, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "#1B5E20";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  },
  melon: (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.82, 0, Math.PI, false);
    ctx.lineTo(x - r * 0.82, y);
    ctx.closePath();
    const g = ctx.createLinearGradient(x - r, y - r * 0.5, x + r * 0.5, y + r * 0.2);
    g.addColorStop(0, "#FFF9C4");
    g.addColorStop(0.5, "#FFD54F");
    g.addColorStop(1, "#FF8F00");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(150,80,0,.4)";
    ctx.lineWidth = 2;
    ctx.stroke();
  },
  manzana: (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    const g = ctx.createRadialGradient(x - r * 0.22, y - r * 0.22, r * 0.08, x, y, r);
    g.addColorStop(0, "#FFCDD2");
    g.addColorStop(0.5, "#EF5350");
    g.addColorStop(1, "#C62828");
    ctx.beginPath();
    ctx.arc(x, y, r * 0.82, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(120,20,20,.4)";
    ctx.lineWidth = 2;
    ctx.stroke();
  },
  uva: (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    const g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.05, x, y, r);
    g.addColorStop(0, "#9C27B0");
    g.addColorStop(0.5, "#7B1FA2");
    g.addColorStop(1, "#4A148C");
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const px = x + Math.cos(angle) * r * 0.4;
      const py = y + Math.sin(angle) * r * 0.4;
      ctx.beginPath();
      ctx.arc(px, py, r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "rgba(100,50,150,.6)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(100,50,150,.6)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  },
};

const toppingArt = {
  tajin: (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = r * 0.12 + Math.random() * r * 0.65;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.2 + Math.random() * 2.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,${45 + Math.random() * 55},15,${0.5 + Math.random() * 0.38})`;
      ctx.fill();
    }
  },
  tajin_picante: (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = r * 0.1 + Math.random() * r * 0.72;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.2 + Math.random() * 3.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(195,${25 + Math.random() * 35},8,${0.55 + Math.random() * 0.4})`;
      ctx.fill();
    }
  },
  limon: (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * r * 0.7;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 3.5 + Math.random() * 5.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,235,59,${0.22 + Math.random() * 0.28})`;
      ctx.fill();
    }
  },
  miel: (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    for (let i = 0; i < 6; i++) {
      const sx = cx + (Math.random() - 0.5) * r * 0.9;
      ctx.beginPath();
      ctx.moveTo(sx, cy - r * 0.52);
      ctx.quadraticCurveTo(sx + (Math.random() - 0.5) * 10, cy, sx + (Math.random() - 0.5) * 5, cy + r * 0.62);
      ctx.strokeStyle = `rgba(255,179,0,${0.4 + Math.random() * 0.38})`;
      ctx.lineWidth = 3 + Math.random() * 3.5;
      ctx.lineCap = "round";
      ctx.stroke();
    }
  },
  gomitas: (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    const cols = ["#FF5252", "#FF4081", "#40C4FF", "#69F0AE", "#FFFF00", "#FF6D00", "#EA80FC", "#80D8FF"];
    for (let i = 0; i < 11; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = r * 0.08 + Math.random() * r * 0.72;
      const x2 = cx + Math.cos(a) * d;
      const y2 = cy + Math.sin(a) * d;
      const col = cols[Math.floor(Math.random() * cols.length)];
      ctx.beginPath();
      ctx.arc(x2, y2, 5 + Math.random() * 4.5, 0, Math.PI * 2);
      ctx.fillStyle = col + "bb";
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  },
  takis: (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * r * 0.68;
      const x2 = cx + Math.cos(a) * d;
      const y2 = cy + Math.sin(a) * d;
      const rot = Math.random() * Math.PI;
      ctx.save();
      ctx.translate(x2, y2);
      ctx.rotate(rot);
      const g = ctx.createLinearGradient(-11, 0, 11, 0);
      g.addColorStop(0, "#BF360C");
      g.addColorStop(0.5, "#FF5722");
      g.addColorStop(1, "#BF360C");
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 5.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "rgba(60,10,0,.55)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  },
};

const QUITO_NAMES = [
  "Sebas", "Mateo", "Valentina", "Nicolás", "Camila", "Andrés", "Isabella", "Felipe", "Martina", "Lucas", "Daniela", "Joaquín",
  "Alejandra", "Santiago", "Paula", "Gabriel", "Lucía", "Emilio", "Victoria", "Benjamín", "Ximena", "Ricardo", "Elena", "Francisco",
  "Micaela", "Javier", "Sofía", "Diego", "Natalia", "Adrián", "Renata", "Matías"
];

const QUITO_BARRIOS = [
  "Cumbayá", "La Carolina", "El Condado", "Quitumbe", "Villaflora", "San Rafael", "Tumbaco", "Carcelén", "La Floresta", "Guamaní",
  "Ponciano", "Conocoto", "El Recreo", "Iñaquito", "Nayón", "Puembo"
];

// ─── MAIN APP ───
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [selectionMode, setSelectionMode] = useState<'individual' | 'mix'>('individual');
  const [selectedFruits, setSelectedFruits] = useState<Fruit[]>([]);
  const [selectedToppings, setSelectedToppings] = useState<Topping[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>("clasico");
  const [discountPct, setDiscountPct] = useState<number>(0);
  const [orderConfirmed, setOrderConfirmed] = useState<boolean>(false);
  const [referralMsg, setReferralMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const [referralInput, setReferralInput] = useState<string>("");
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string>("");
  const bagCanvasRef = useRef<HTMLCanvasElement>(null);
  const [totalOrders, setTotalOrders] = useState<number>(124);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [orderHistory, setOrderHistory] = useState<OrderRecord[]>([]);
  const [showReferralDashboard, setShowReferralDashboard] = useState<boolean>(false);
  const [showOrderSuccessAnimation, setShowOrderSuccessAnimation] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isReferralApplied, setIsReferralApplied] = useState<boolean>(false);
  
  // Live Feed State
  const [liveOrder, setLiveOrder] = useState<string>("");
  
  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviewForm, setShowReviewForm] = useState<boolean>(false);
  const [newReview, setNewReview] = useState({ rating: 5, text: "", name: "" });

  // Share Modal State
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [sharePlatform, setSharePlatform] = useState<'whatsapp' | 'twitter' | 'instagram' | null>(null);
  const [customShareText, setCustomShareText] = useState<string>("");

  // Quantity State
  const [quantity, setQuantity] = useState<number>(1);

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);

  // Initialize Firebase Auth and Data
  useEffect(() => {
    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
          setToastMsg("Error de conexión con la base de datos");
          setShowToast(true);
        }
      }
    };
    testConnection();

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch or create profile
        const profileRef = doc(db, "users", firebaseUser.uid);
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
          setUserProfile(profileSnap.data() as UserProfile);
        } else {
          const newProfile: UserProfile = {
            userId: firebaseUser.uid,
            referralCode: generateUniqueCode(),
            referralsCount: 0,
            totalRewards: 0,
            referredFriends: [],
            email: firebaseUser.email || "",
            displayName: firebaseUser.displayName || "",
            photoURL: firebaseUser.photoURL || ""
          };
          await setDoc(profileRef, newProfile);
          setUserProfile(newProfile);
        }
      } else {
        setUserProfile(null);
      }
    });

    // Real-time reviews
    const q = query(collection(db, "reviews"), orderBy("date", "desc"), limit(20));
    const unsubscribeReviews = onSnapshot(q, (snapshot) => {
      const fetchedReviews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Review[];
      
      if (fetchedReviews.length > 0) {
        setReviews(fetchedReviews);
      } else {
        // Fallback to testimonials if no reviews in DB
        const initialReviews: Review[] = testimonials.map((t, i) => ({
          id: `rev-${i}`,
          name: t.name,
          rating: 5,
          text: t.text,
          date: new Date().toISOString(),
          avatar: t.avatar
        }));
        setReviews(initialReviews);
      }
    }, (error) => {
      console.error("Firestore Error (Reviews):", error);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeReviews();
    };
  }, []);

  // Real-time Order History
  useEffect(() => {
    if (!user) {
      setOrderHistory([]);
      return;
    }

    const ordersQuery = query(
      collection(db, "orders"),
      orderBy("date", "desc")
    );
    
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const orders = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as OrderRecord))
        .filter(order => order.userId === user.uid);
      setOrderHistory(orders);
    }, (error) => {
      console.error("Firestore Error (Orders):", error);
    });

    return () => unsubscribeOrders();
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setToastMsg("¡Bienvenido a TYANGO! 💜");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("Login Error:", error);
      setToastMsg("Error al iniciar sesión");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setToastMsg("Sesión cerrada");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

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
    if (!user) {
      setToastMsg("Inicia sesión para dejar una reseña");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    try {
      const reviewData = {
        name: newReview.name,
        rating: newReview.rating,
        text: newReview.text,
        date: new Date().toISOString(),
        avatar: ["👤", "🥑", "🍓", "🍍", "🥭"][Math.floor(Math.random() * 5)],
        uid: user.uid
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

  // Draw emoji on canvas
  const drawEmoji = (canvas: HTMLCanvasElement, emoji: string, size: number) => {
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    ctx.font = `${size * 0.76}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, size / 2, size / 2 + size * 0.04);
  };

  // Render bag canvas
  const renderBag = () => {
    const canvas = bagCanvasRef.current;
    if (!canvas) return;
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

  const applyReferral = () => {
    const raw = referralInput.trim().toUpperCase();
    if (!raw) {
      setReferralMsg({ text: "Ingresa un código primero.", type: "err" });
      return;
    }
    if (referralCodes[raw] !== undefined) {
      setDiscountPct(referralCodes[raw]);
      setReferralMsg({ text: `✓ Código ${raw} aplicado — ${referralCodes[raw]}% off`, type: "ok" });
      setIsReferralApplied(true);
      setTimeout(() => setIsReferralApplied(false), 2000);
    } else if (raw === userProfile?.referralCode) {
      setReferralMsg({ text: "No puedes usar tu propio código.", type: "err" });
    } else {
      setDiscountPct(0);
      setReferralMsg({ text: "Código no válido.", type: "err" });
    }
  };

  const confirmOrder = () => {
    if (selectedFruits.length === 0) return;
    setShowReviewModal(true);
  };

  const handleFinalConfirmation = async () => {
    setShowReviewModal(false);
    
    // Show success animation first
    setShowOrderSuccessAnimation(true);
    
    // Wait for animation to play before opening WhatsApp
    setTimeout(async () => {
      setShowOrderSuccessAnimation(false);
      setOrderConfirmed(true);
      
      const sz = sizes[selectedSize];
      const base = sz.price * quantity;
      const disc = discountPct > 0 ? base * (discountPct / 100) : 0;
      const total = (base - disc).toFixed(2);
      const tops = selectedToppings.length > 0 ? selectedToppings.map((t) => t.name).join(", ") : "Sin aderezos";
      const fruitNames = selectedFruits.map(f => `${f.emoji} ${f.name}`).join(" + ");
      
      const msg = encodeURIComponent(
        `¡Hola TYANGO! 🍓 Quiero hacer mi pedido (${selectionMode.toUpperCase()}):\n\n` +
        `🍎 Frutas: ${fruitNames}\n` +
        `🌶️ Aderezos: ${tops}\n` +
        `📦 Tamaño: ${sz.label} (${sz.weight}g)\n` +
        `🔢 Cantidad: ${quantity} unidades\n` +
        `⚖️ Peso Total: ${sz.weight * quantity}g\n` +
        `💜 Total: $${total}\n\n` +
        `¡Por favor confírmame! 🙌`
      );

      // Save to Firestore if logged in
      if (user) {
        try {
          await addDoc(collection(db, "orders"), {
            userId: user.uid,
            items: fruitNames,
            toppings: tops,
            size: sz.label,
            quantity: quantity,
            total: parseFloat(total),
            date: serverTimestamp()
          });
        } catch (error) {
          console.error("Error saving order:", error);
        }
      }

      window.open(`https://wa.me/593994124996?text=${msg}`, "_blank");
      setTotalOrders(prev => prev + 1);
      setToastMsg(`¡Gracias por tu compra! Tu TYANGO está en camino.`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    }, 2200);
  };

  const shareCombination = (platform: 'whatsapp' | 'instagram') => {
    if (selectedFruits.length === 0) return;
    const tops = selectedToppings.length > 0 ? selectedToppings.map(t => t.name).join(", ") : "Sin aderezos";
    const fruitNames = selectedFruits.map(f => `${f.emoji} ${f.name}`).join(" + ");
    const text = `¡Mira mi combinación TYANGO Mix! 🍓\n🍎 ${fruitNames}\n🌶️ Aderezos: ${tops}\n📦 Tamaño: ${sizes[selectedSize].label} (${sizes[selectedSize].weight}g)\n🔢 Cantidad: ${quantity} uds\n⚖️ Peso Total: ${sizes[selectedSize].weight * quantity}g\n\n¿Te animas a probar? 👉 ${window.location.href} @tyango_ec`;
    
    setCustomShareText(text);
    setSharePlatform(platform);
    setShowShareModal(true);
  };

  const executeShare = () => {
    if (!sharePlatform) return;
    
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

  const basePrice = sizes[selectedSize].price * quantity;
  const discountAmount = discountPct > 0 ? basePrice * (discountPct / 100) : 0;
  const totalPrice = (basePrice - discountAmount).toFixed(2);
  const totalWeight = sizes[selectedSize].weight * quantity;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-purple-500 selection:text-white">
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-6 backdrop-blur-md bg-black/20 border-b border-white/5">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-black tracking-tighter bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent"
        >
          TYANGO
        </motion.div>
        <div className="flex items-center gap-4 md:gap-8">
          <a href="#configurar" className="hidden md:block text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white transition-colors">Arma tu Snack</a>
          
          {user ? (
            <div className="flex items-center gap-4">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowReferralDashboard(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
              >
                <Gift size={14} className="text-purple-400" />
                <span className="hidden sm:inline">Mis Referidos</span>
              </motion.button>
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <motion.img 
                    whileHover={{ scale: 1.1 }}
                    src={user.photoURL} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full border border-white/10" 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                    <UserIcon size={14} />
                  </div>
                )}
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleLogout} 
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <LogOut size={16} />
                </motion.button>
              </div>
            </div>
          ) : (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogin}
              className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
            >
              Iniciar Sesión
            </motion.button>
          )}

          <motion.a 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            href="#configurar" 
            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-purple-600/20"
          >
            Pedir Ahora
          </motion.a>
        </div>
      </nav>

      {/* Live Order Ticker */}
      <div className="fixed top-[88px] left-0 right-0 z-40 flex justify-center pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={liveOrder}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full flex items-center gap-3 shadow-2xl"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
              {liveOrder}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 text-center z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full mb-8"
        >
          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/80">Quito, Ecuador · Snacks Premium</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-6xl md:text-9xl font-black tracking-tighter leading-[0.85] mb-8"
        >
          FRUTA.<br />
          <span className="text-purple-500">TU ESTILO.</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-xl text-lg text-white/50 font-medium leading-relaxed mb-12"
        >
          Personaliza tu snack de fruta fresca con aderezos picantes y recibe tu TYANGO sellado al vacío. Frescura total, sabor explosivo.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <motion.a 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            href="#configurar" 
            className="px-10 py-5 bg-white text-black font-black uppercase tracking-widest rounded-full hover:bg-purple-500 hover:text-white transition-all transform"
          >
            Empezar Configuración
          </motion.a>
          <motion.a 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            href="#como-funciona" 
            className="px-10 py-5 bg-white/5 border border-white/10 font-black uppercase tracking-widest rounded-full hover:bg-white/10 transition-all"
          >
            Ver Proceso
          </motion.a>
        </motion.div>

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

      {/* Configurator */}
      <section id="configurar" className="py-32 px-6 max-w-7xl mx-auto z-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Left: Controls */}
          <div className="lg:col-span-7 space-y-12">
            <div>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">ARMA TU <span className="text-purple-500">PACK.</span></h2>
              <p className="text-white/40 font-medium">Sigue los pasos para crear tu combinación perfecta.</p>
            </div>

            {/* Step 1: Fruit */}
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-[10px] font-black">01</span>
                  <h3 className="text-sm font-black uppercase tracking-widest">Elige tu Fruta</h3>
                </div>
                
                {/* Mode Toggle */}
                <div className="flex p-1 bg-white/5 border border-white/10 rounded-2xl w-fit">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleModeChange('individual')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      selectionMode === 'individual' ? "bg-white text-black" : "text-white/40 hover:text-white"
                    }`}
                  >
                    Individual
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleModeChange('mix')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      selectionMode === 'mix' ? "bg-white text-black" : "text-white/40 hover:text-white"
                    }`}
                  >
                    Mix (Máx 3)
                  </motion.button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {fruits.map((fruit) => {
                  const isSelected = selectedFruits.some(f => f.id === fruit.id);
                  return (
                    <motion.button
                      key={fruit.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleFruit(fruit)}
                      className={`group relative p-4 rounded-3xl border transition-all text-left ${
                        isSelected 
                          ? "bg-purple-600 border-purple-500 shadow-xl shadow-purple-600/20" 
                          : "bg-white/5 border-white/5 hover:border-white/20"
                      }`}
                    >
                      <canvas className="w-12 h-12 mb-3" ref={(el) => el && drawEmoji(el, fruit.emoji, 48)} />
                      <div className="text-xs font-bold uppercase tracking-wider">{fruit.name}</div>
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
                      onClick={() => toggleTopping(topping)}
                      className={`relative p-4 rounded-3xl border transition-all text-left ${
                        isSelected 
                          ? "bg-amber-500 border-amber-400 shadow-xl shadow-amber-500/20 text-black" 
                          : "bg-white/5 border-white/5 hover:border-white/20"
                      }`}
                    >
                      <canvas className="w-10 h-10 mb-2" ref={(el) => el && drawEmoji(el, topping.emoji, 40)} />
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
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value)}
                  placeholder="Ej: TYANGO10"
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold uppercase tracking-widest focus:outline-none focus:border-purple-500 transition-colors"
                />
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={isReferralApplied ? { scale: [1, 1.1, 1], rotate: [0, 2, -2, 0] } : {}}
                  onClick={applyReferral}
                  className={`px-8 py-4 font-black uppercase tracking-widest rounded-2xl transition-all flex items-center gap-2 ${
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
            </div>
          </div>

          {/* Right: Preview & Checkout */}
          <div className="lg:col-span-5">
            <div className="sticky top-32 space-y-8">
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
              <div className="flex p-1 bg-white/5 border border-white/10 rounded-full">
                {Object.entries(sizes).map(([key, size]) => (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedSize(key)}
                    className={`flex-1 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                      selectedSize === key ? "bg-white text-black shadow-xl" : "text-white/40 hover:text-white/60"
                    }`}
                  >
                    {size.label} {size.weight}g
                  </motion.button>
                ))}
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

              {/* Summary & Action */}
              <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-white/40">
                    <span>Subtotal {quantity > 1 && `(${quantity} uds)`}</span>
                    <span className="text-white">${basePrice.toFixed(2)}</span>
                  </div>
                  {discountPct > 0 && (
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-green-400">
                      <span>Descuento ({discountPct}%)</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Total a pagar</div>
                    <div className="text-4xl font-black tracking-tighter">${totalPrice}</div>
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
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">CÓMO <span className="text-purple-500">FUNCIONA.</span></h2>
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
      <section id="resenas" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-20">
            <div className="text-left">
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">RESEÑAS DE LA <span className="text-purple-500">COMUNIDAD.</span></h2>
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
                    <div className="text-2xl">{rev.avatar}</div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest">{rev.name}</div>
                      <div className="text-[8px] font-bold uppercase tracking-widest text-white/30">Cliente Verificado</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
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
              className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-[40px] p-10"
            >
              <button 
                onClick={() => setShowReviewForm(false)}
                className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <form onSubmit={handleAddReview} className="space-y-8">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter mb-2">TU <span className="text-purple-500">OPINIÓN.</span></h2>
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
      <footer className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="text-center md:text-left">
            <div className="text-3xl font-black tracking-tighter mb-2">TYANGO</div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Quito, Ecuador · 2025</p>
          </div>
          <div className="flex gap-8">
            <motion.a whileHover={{ y: -2 }} href="https://www.instagram.com/tyango_ec/" target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">Instagram</motion.a>
            <motion.a whileHover={{ y: -2 }} href="https://www.tiktok.com/@tyango_ec" target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">TikTok</motion.a>
            <motion.a whileHover={{ y: -2 }} href="https://wa.me/593994124996" target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">WhatsApp</motion.a>
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
              className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-[40px] p-10 overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => setShowReferralDashboard(false)}
                className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter mb-2">MIS <span className="text-purple-500">REFERIDOS.</span></h2>
                  <p className="text-xs font-medium text-white/40">Gana recompensas compartiendo el sabor TYANGO.</p>
                </div>

                <div className="p-8 bg-purple-600/10 border border-purple-500/20 rounded-[32px] space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-purple-400">Tu Código Único</div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xl font-black tracking-widest text-center">
                      {userProfile.referralCode}
                    </div>
                    <button 
                      onClick={copyReferralCode}
                      className={`px-6 rounded-2xl transition-all flex items-center gap-2 ${
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-white/5 border border-white/10 rounded-[32px] text-center">
                    <div className="text-3xl font-black mb-1">{userProfile.referralsCount}</div>
                    <div className="text-[8px] font-bold uppercase tracking-widest text-white/30">Amigos Referidos</div>
                  </div>
                  <div className="p-6 bg-white/5 border border-white/10 rounded-[32px] text-center">
                    <div className="text-3xl font-black mb-1 text-amber-400">${userProfile.totalRewards.toFixed(2)}</div>
                    <div className="text-[8px] font-bold uppercase tracking-widest text-white/30">Crédito Ganado</div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    const text = `¡Prueba TYANGO! 🍓 Usa mi código ${userProfile.referralCode} para un 15% de descuento en tu primer snack de fruta. 👉 ${window.location.href}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                  }}
                  className="w-full py-5 bg-green-600 hover:bg-green-500 rounded-full text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3"
                >
                  <MessageCircle size={18} />
                  Compartir en WhatsApp
                </button>

                {/* Order History Section */}
                <div className="pt-8 border-t border-white/10 space-y-6">
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
                                {order.date?.toDate ? order.date.toDate().toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente'}
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
              className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-[40px] p-10 max-h-[90vh] overflow-y-auto"
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
                  <h2 className="text-3xl font-black tracking-tighter text-white">REVISA TU <span className="text-purple-500">PEDIDO.</span></h2>
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
                      <div className="text-sm font-bold">{sizes[selectedSize].label} ({sizes[selectedSize].weight}g)</div>
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
                    <div className="text-3xl font-black tracking-tighter text-white">${totalPrice}</div>
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
              className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-[40px] p-10"
            >
              <button 
                onClick={() => setShowShareModal(false)}
                className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter mb-2 text-white">PERSONALIZA TU <span className="text-purple-500">MENSAJE.</span></h2>
                  <p className="text-xs font-medium text-white/40 italic">Edita el texto antes de compartir tu combinación.</p>
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
                className="text-5xl md:text-7xl font-black tracking-tighter mb-4"
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
    </div>
  );
}
