import React, { useEffect, useState } from "react";
import { db, auth, googleProvider } from "./lib/firebase";
import { signInWithPopup, onAuthStateChanged, User, signOut } from "firebase/auth";
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { referralCodes } from "./constants";
import { 
  Package, 
  Star, 
  Users, 
  Settings, 
  LogOut, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  Clock,
  DollarSign,
  MessageSquare,
  ChevronRight,
  RefreshCw,
  Lock,
  Trash2,
  CheckCircle2,
  Ticket
} from "lucide-react";

const ADMIN_EMAIL = "sebastianemanuel967@gmail.com";

interface Order {
  id: string;
  itemsSummary: string;
  itemCount: number;
  total: number;
  date: string;
  status: string;
  userId: string;
  phone?: string;
  ambassador?: string | null;
  commissionOwed?: number;
}

interface Review {
  id: string;
  name: string;
  rating: number;
  text: string;
  date: string;
}

interface ProductSettings {
  mini: boolean;
  clasico: boolean;
  premium: boolean;
}

interface ReferralCode {
  id: string;
  userId: string;
  uses: number;
  createdAt: any;
}

interface UserData {
  userId: string;
  displayName: string;
  loyaltyPoints: number;
  totalRewards: number;
  phone?: string;
}

export default function AdminPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [referralCodesList, setReferralCodesList] = useState<ReferralCode[]>([]);
  const [usersList, setUsersList] = useState<UserData[]>([]);
  const [referralStats, setReferralStats] = useState({ totalUsers: 0, totalRewards: 0, totalPoints: 0 });
  const [productSettings, setProductSettings] = useState<ProductSettings>({
    mini: true,
    clasico: true,
    premium: false
  });
  const [activeTab, setActiveTab] = useState<"orders" | "reviews" | "referrals" | "settings">("orders");
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u && u.email === ADMIN_EMAIL) {
        setUser(u);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Listen to orders
    const qOrders = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(50));
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    });

    // Listen to reviews
    const qReviews = query(collection(db, "reviews"), orderBy("date", "desc"), limit(50));
    const unsubReviews = onSnapshot(qReviews, (snap) => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() } as Review)));
    });

    // Listen to users for referral stats
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      let totalRewards = 0;
      let totalPoints = 0;
      const users: UserData[] = [];
      snap.docs.forEach(d => {
        const data = d.data();
        totalRewards += data.totalRewards || 0;
        totalPoints += data.loyaltyPoints || 0;
        users.push({
          userId: d.id,
          displayName: data.displayName || "Cliente Tyango",
          loyaltyPoints: data.loyaltyPoints || 0,
          totalRewards: data.totalRewards || 0,
          phone: data.phone
        });
      });
      setUsersList(users);
      setReferralStats({
        totalUsers: snap.size,
        totalRewards,
        totalPoints
      });
    });

    // Listen to referral codes
    const unsubCodes = onSnapshot(collection(db, "referral_codes"), (snap) => {
      setReferralCodesList(snap.docs.map(d => ({ id: d.id, ...d.data() } as ReferralCode)));
    });

    // Listen to product settings
    const unsubSettings = onSnapshot(doc(db, "settings", "products"), (doc) => {
      if (doc.exists()) {
        setProductSettings(doc.data() as ProductSettings);
      }
    });

    return () => {
      unsubOrders();
      unsubReviews();
      unsubUsers();
      unsubCodes();
      unsubSettings();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const toggleProduct = async (key: keyof ProductSettings) => {
    const newVal = !productSettings[key];
    const settingsRef = doc(db, "settings", "products");
    
    // Ensure doc exists
    const d = await getDoc(settingsRef);
    if (!d.exists()) {
      await setDoc(settingsRef, { ...productSettings, [key]: newVal });
    } else {
      await updateDoc(settingsRef, { [key]: newVal });
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { status });
      setToastMsg(`Pedido ${status === 'completed' ? 'completado' : 'cancelado'} ✓`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("Error updating order:", error);
      setToastMsg("Error al actualizar pedido");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      await deleteDoc(doc(db, "orders", orderId));
      setToastMsg("Pedido eliminado ✓");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("Error deleting order:", error);
      setToastMsg("Error al eliminar pedido");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const deleteReview = async (reviewId: string) => {
    try {
      await deleteDoc(doc(db, "reviews", reviewId));
      setToastMsg("Reseña eliminada ✓");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("Error deleting review:", error);
      setToastMsg("Error al eliminar reseña");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <RefreshCw className="text-purple-500 animate-spin" size={32} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-[#111] border border-white/10 rounded-[40px] p-10 text-center space-y-8"
        >
          <div className="w-20 h-20 bg-purple-600/20 rounded-3xl flex items-center justify-center mx-auto">
            <Lock className="text-purple-500" size={40} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-display font-black tracking-tighter">ADMIN <span className="text-purple-500">TYANGO.</span></h1>
            <p className="text-white/40 text-sm font-medium">Acceso exclusivo para Sebastián.</p>
          </div>
          <button 
            onClick={handleLogin}
            className="w-full py-5 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-purple-500 hover:text-white transition-all shadow-xl shadow-white/5"
          >
            Iniciar Sesión con Google
          </button>
          <a href="/" className="block text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors">Volver a la tienda</a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* Sidebar / Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-xl font-black tracking-tighter">TYANGO <span className="text-purple-500">ADMIN</span></div>
          <div className="hidden md:flex items-center gap-1 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[8px] font-black uppercase tracking-widest text-green-500">En Vivo</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Bienvenido</div>
            <div className="text-xs font-bold">{user.displayName}</div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-3 bg-white/5 hover:bg-red-500/20 border border-white/10 rounded-2xl transition-all text-white/60 hover:text-red-500"
          >
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <div className="pt-24 pb-12 px-6 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        {/* Sidebar Menu */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:flex lg:flex-col lg:w-64 gap-2">
          {[
            { id: "orders", icon: Package, label: "Pedidos" },
            { id: "reviews", icon: MessageSquare, label: "Reseñas" },
            { id: "referrals", icon: Users, label: "Referidos" },
            { id: "settings", icon: Settings, label: "Ajustes" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${
                activeTab === item.id 
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" 
                  : "bg-white/5 text-white/40 hover:bg-white/10"
              }`}
            >
              <item.icon size={20} />
              <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-8">
          {/* Stats Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-6 bg-[#111] border border-white/10 rounded-[32px] space-y-2">
              <div className="text-white/40 text-[10px] font-black uppercase tracking-widest">Ventas Totales</div>
              <div className="text-3xl font-black tracking-tighter text-amber-500">
                ${orders.filter(o => o.status === 'completed').reduce((acc, curr) => acc + curr.total, 0).toFixed(2)}
              </div>
            </div>
            <div className="p-6 bg-[#111] border border-white/10 rounded-[32px] space-y-2">
              <div className="text-white/40 text-[10px] font-black uppercase tracking-widest">Pedidos Hoy</div>
              <div className="text-3xl font-black tracking-tighter text-purple-500">
                {orders.filter(o => o.status !== 'cancelled' && new Date(o.date).toDateString() === new Date().toDateString()).length}
              </div>
            </div>
            <div className="p-6 bg-[#111] border border-white/10 rounded-[32px] space-y-2">
              <div className="text-white/40 text-[10px] font-black uppercase tracking-widest">Usuarios</div>
              <div className="text-3xl font-black tracking-tighter">
                {referralStats.totalUsers}
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "orders" && (
              <motion.div 
                key="orders"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <h2 className="text-2xl font-display font-black tracking-tighter">ÚLTIMOS <span className="text-purple-500">PEDIDOS.</span></h2>
                <div className="bg-[#111] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Fecha / Cliente</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Detalle</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Total</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Embajador</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Estado</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {orders.length > 0 ? orders.map((order) => (
                          <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <div className="text-[10px] font-black uppercase tracking-widest text-purple-400">
                                  {new Date(order.date).toLocaleString('es-EC', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </div>
                                {order.phone && (
                                  <div className="text-[10px] font-bold text-amber-500">
                                    📱 {order.phone}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-xs font-bold leading-tight max-w-[200px] truncate" title={order.itemsSummary}>
                                {order.itemsSummary}
                              </div>
                              <div className="text-[8px] font-medium text-white/20 mt-1 uppercase">Items: {order.itemCount}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-black text-white">${order.total.toFixed(2)}</div>
                            </td>
                            <td className="px-6 py-4">
                              {order.ambassador ? (
                                <div className="space-y-1">
                                  <div className="text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-1">
                                    <Star size={10} fill="currentColor" /> {order.ambassador}
                                  </div>
                                  <div className="text-[10px] font-black text-amber-500">
                                    +${(order.commissionOwed || 0).toFixed(2)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[10px] font-black text-white/10 uppercase tracking-widest">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                order.status === 'completed' ? 'bg-green-500/10 text-green-500' : 
                                order.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                              }`}>
                                {order.status || 'pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => updateOrderStatus(order.id, "completed")}
                                  className="p-2 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white border border-green-500/20 rounded-xl transition-all"
                                >
                                  <CheckCircle size={16} />
                                </button>
                                <button 
                                  onClick={() => updateOrderStatus(order.id, "cancelled")}
                                  className="p-2 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white border border-amber-500/20 rounded-xl transition-all"
                                >
                                  <XCircle size={16} />
                                </button>
                                <button 
                                  onClick={() => deleteOrder(order.id)}
                                  className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-xl transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={6} className="py-20 text-center text-white/20 font-black uppercase tracking-widest">
                              No hay pedidos registrados
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Ambassador Summary Table */}
                {(() => {
                  const ambassadors: Record<string, { count: number, total: number }> = {};
                  orders.forEach(o => {
                    if (o.ambassador && o.status !== 'cancelled') {
                      if (!ambassadors[o.ambassador]) {
                        ambassadors[o.ambassador] = { count: 0, total: 0 };
                      }
                      ambassadors[o.ambassador].count += 1;
                      ambassadors[o.ambassador].total += (o.commissionOwed || 0);
                    }
                  });

                  const ambassadorList = Object.entries(ambassadors);
                  if (ambassadorList.length === 0) return null;

                  return (
                    <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                          <Users size={14} /> Comisiones Pendientes
                        </h3>
                        <div className="bg-[#111] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
                          <table className="w-full text-left">
                            <thead className="bg-white/5 border-b border-white/10">
                              <tr>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Embajador</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 text-center">Pedidos</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 text-right">A pagar</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {ambassadorList.map(([name, data]) => (
                                <tr key={name} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="text-xs font-black uppercase tracking-tight text-purple-400">{name}</div>
                                  </td>
                                  <td className="px-6 py-4 text-xs font-bold text-center">{data.count}</td>
                                  <td className="px-6 py-4 text-right text-sm font-black text-amber-500">${data.total.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                          <Ticket size={14} /> Códigos Activos (Constants)
                        </h3>
                        <div className="bg-[#111] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl max-h-[400px] overflow-y-auto custom-scroll">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-white/5 border-b border-white/10 sticky top-0 z-10 backdrop-blur-md">
                              <tr>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Código</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Embajador</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 text-right">Dcto</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {Object.entries(referralCodes).map(([code, config]) => (
                                <tr key={code} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="px-6 py-4">
                                    <code className="text-xs font-black tracking-widest text-white bg-white/5 px-2 py-1 rounded">{code}</code>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                      {config.ambassador || "—"}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <span className="text-xs font-black text-amber-500">{config.value}{config.type === 'pct' ? '%' : '$'}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {activeTab === "reviews" && (
              <motion.div 
                key="reviews"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <h2 className="text-2xl font-display font-black tracking-tighter">RESEÑAS <span className="text-purple-500">RECIBIDAS.</span></h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="p-6 bg-[#111] border border-white/10 rounded-[32px] space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold">{rev.name}</div>
                          <div className="text-[10px] text-white/40">{new Date(rev.date).toLocaleDateString()}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={12} fill={i < rev.rating ? "currentColor" : "none"} className={i < rev.rating ? "text-amber-400" : "text-white/10"} />
                            ))}
                          </div>
                          <button 
                            onClick={() => deleteReview(rev.id)}
                            className="p-2 text-white/20 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-white/60 italic">"{rev.text}"</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "referrals" && (
              <motion.div 
                key="referrals"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-display font-black tracking-tighter">MÉTRICAS DE <span className="text-purple-500">REFERIDOS.</span></h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-8 bg-purple-600/10 border border-purple-500/20 rounded-[40px] text-center space-y-2">
                    <div className="text-5xl font-black tracking-tighter text-purple-500">{referralStats.totalUsers}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-purple-400">Usuarios Registrados</div>
                  </div>
                  <div className="p-8 bg-amber-600/10 border border-amber-500/20 rounded-[40px] text-center space-y-2">
                    <div className="text-5xl font-black tracking-tighter text-amber-500">${referralStats.totalRewards.toFixed(2)}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">Créditos Otorgados</div>
                  </div>
                  <div className="p-8 bg-purple-600/20 border border-purple-500/30 rounded-[40px] text-center space-y-2">
                    <div className="text-5xl font-black tracking-tighter text-purple-400">{referralStats.totalPoints}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-purple-300">Puntos Tyango Totales</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white/40">Ranking de Puntos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {usersList.sort((a, b) => b.loyaltyPoints - a.loyaltyPoints).slice(0, 10).map((u) => (
                      <div key={u.userId} className="p-5 bg-[#111] border border-white/10 rounded-3xl flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold">{u.displayName}</div>
                          <div className="text-[10px] text-white/30 font-medium">
                            {u.phone ? `WhatsApp: ${u.phone}` : `ID: ${u.userId.slice(0, 8)}...`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-black text-purple-400">{u.loyaltyPoints}</div>
                          <div className="text-[8px] font-black uppercase tracking-widest text-white/20">Puntos</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white/40">Códigos Generados</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {referralCodesList.map((code) => (
                      <div key={code.id} className="p-5 bg-[#111] border border-white/10 rounded-3xl flex items-center justify-between">
                        <div>
                          <div className="text-lg font-black tracking-tighter text-purple-400">{code.id}</div>
                          <div className="text-[10px] text-white/30 font-medium">ID: {code.userId.slice(0, 8)}...</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-black">{code.uses || 0}/4</div>
                          <div className="text-[8px] font-black uppercase tracking-widest text-white/20">Usos</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "settings" && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <h2 className="text-2xl font-display font-black tracking-tighter">DISPONIBILIDAD DE <span className="text-purple-500">PRODUCTOS.</span></h2>
                <div className="p-8 bg-[#111] border border-white/10 rounded-[40px] space-y-6">
                  <p className="text-sm text-white/40">Activa o desactiva los tamaños de TYANGO en tiempo real para todos los clientes.</p>
                  <div className="space-y-4">
                    {(Object.keys(productSettings) as Array<keyof ProductSettings>).map((key) => (
                      <div key={key} className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-3xl">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            productSettings[key] ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                          }`}>
                            <Package size={24} />
                          </div>
                          <div>
                            <div className="font-black uppercase tracking-widest text-xs">{key}</div>
                            <div className="text-[10px] text-white/40">{productSettings[key] ? "Disponible" : "Agotado"}</div>
                          </div>
                        </div>
                        <button 
                          onClick={() => toggleProduct(key)}
                          className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            productSettings[key] 
                              ? "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white" 
                              : "bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white"
                          }`}
                        >
                          {productSettings[key] ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className="fixed bottom-12 left-1/2 z-[100] px-8 py-4 bg-white text-black rounded-full shadow-2xl flex items-center gap-3"
          >
            <CheckCircle2 className="text-green-600" size={18} />
            <span className="text-xs font-black uppercase tracking-widest">{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
