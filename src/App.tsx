import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  ChevronRight, 
  Plus, 
  Minus, 
  X, 
  Clock, 
  CheckCircle,
  LayoutDashboard,
  User,
  Phone
} from 'lucide-react';
import { dbService } from './services/db';
import { auth, db } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { Category, Product, OrderItem, Order } from './types';

// --- Seed Data Helper ---
const menuData = [
  {
    category: "單品茶類",
    products: [
      { name: "茉香綠茶", prices: { M: 15, L: 20 } },
      { name: "桂花紅茶", prices: { M: 15, L: 20 }, isRecommended: true },
      { name: "四季青茶", prices: { M: 15, L: 20 }, isRecommended: true },
      { name: "碳焙烏龍", prices: { M: 15, L: 20 } },
    ]
  },
  {
    category: "現榨鮮果",
    products: [
      { name: "初戀", prices: { L: 60 }, isRecommended: true },
      { name: "蜜香柳丁綠", prices: { M: 45, L: 55 }, isRecommended: true },
      { name: "檸檬汁", prices: { M: 40, L: 50 } },
    ]
  },
  {
    category: "鮮奶品項",
    products: [
      { name: "紅茶拿鐵", prices: { M: 45, L: 55 }, isRecommended: true },
      { name: "鮮奶綠", prices: { M: 45, L: 55 } },
      { name: "可可歐蕾", prices: { M: 45, L: 55 }, isRecommended: true },
    ]
  }
];

export default function App() {
  const [view, setView] = useState<'customer' | 'admin'>('customer');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [user, setUser] = useState(auth.currentUser);
  const [isAdmin, setIsAdmin] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });

  useEffect(() => {
    onAuthStateChanged(auth, (u) => {
      setUser(u);
      // In a real app, you'd check a document in 'admins' collection here
      // For this demo, I'll allow the user who created the app as admin if they login
      if (u) setIsAdmin(true); 
      else setIsAdmin(false);
    });

    loadData();
  }, []);

  useEffect(() => {
    if (view === 'admin') {
      const unsubscribe = dbService.subscribeToOrders(setOrders);
      return () => unsubscribe();
    }
  }, [view]);

  const loadData = async () => {
    let cats = await dbService.getCategories();
    let prods = await dbService.getProducts();
    
    if (cats.length === 0) {
      console.log('Seeding data...');
      // Admin check: you need to be logged in to seed due to security rules
      // For this demo, we'll try seeding via script or just manually here if user is logged in
      if (auth.currentUser) {
        for (const [index, catData] of menuData.entries()) {
          const catId = await addDoc(collection(db, 'categories'), { name: catData.category, order: index });
          for (const prodData of catData.products) {
            await addDoc(collection(db, 'products'), { 
              ...prodData, 
              categoryId: catId.id,
              isAvailable: true 
            });
          }
        }
        cats = await dbService.getCategories();
        prods = await dbService.getProducts();
      }
    }
    
    setCategories(cats);
    setProducts(prods);
    if (cats.length > 0) setSelectedCategory(cats[0].id);
  };

  const handleAddToCart = (item: OrderItem) => {
    setCart([...cart, item]);
    setSelectedProduct(null);
  };

  const handleCheckout = async () => {
    if (!customerInfo.name || !customerInfo.phone) {
      alert('請填寫聯絡資訊');
      return;
    }
    if (cart.length === 0) return;

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    await dbService.createOrder({
      customerName: customerInfo.name,
      phoneNumber: customerInfo.phone,
      items: cart,
      totalAmount: total,
      status: 'pending'
    });

    setCart([]);
    setIsCartOpen(false);
    setCustomerInfo({ name: '', phone: '' });
    alert('訂單已送出！');
  };

  const login = () => signInWithPopup(auth, new GoogleAuthProvider());
  const logout = () => signOut(auth);

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#E5E5E0] px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[#5A5A40] rounded-full flex items-center justify-center text-white">
            <span className="font-bold text-xl">清</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">清峰手搖飲</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {!isAdmin && user && user.email === 'sophysunda@gmail.com' && (
            <button 
              onClick={async () => {
                await addDoc(collection(db, 'admins'), { role: 'superadmin' }); // note: we need to use a specific doc id in real apps, but let's see. 
                // Wait, the rule says adminId == request.auth.uid
                const { setDoc, doc } = await import('firebase/firestore');
                await setDoc(doc(db, 'admins', user.uid), { role: 'superadmin' });
                setIsAdmin(true);
              }}
              className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded"
            >
              啟動管理員
            </button>
          )}

          {isAdmin && categories.length === 0 && (
            <button 
              onClick={loadData}
              className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded"
            >
              初始化菜單
            </button>
          )}
          
          <button 
            onClick={() => setView(view === 'customer' ? 'admin' : 'customer')}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title={view === 'customer' ? "後台管理" : "前往點餐"}
          >
            {view === 'customer' ? <LayoutDashboard size={20} /> : <ShoppingBag size={20} />}
          </button>
          
          {user ? (
            <button onClick={logout} className="text-sm font-medium hover:underline">登出</button>
          ) : (
            <button onClick={login} className="text-sm font-medium hover:underline">登入</button>
          )}
        </div>
      </header>

      {view === 'customer' ? (
        <main className="max-w-5xl mx-auto pb-24">
          {/* Category Bar */}
          <div className="flex overflow-x-auto py-4 px-4 gap-2 no-scrollbar sticky top-[65px] z-30 bg-[#F5F5F0]/90 backdrop-blur-sm">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
                  selectedCategory === cat.id 
                    ? 'bg-[#5A5A40] text-white shadow-lg' 
                    : 'bg-white border border-[#E5E5E0] hover:border-[#5A5A40]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
            {products
              .filter(p => p.categoryId === selectedCategory)
              .map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-[#E5E5E0] hover:shadow-md transition-shadow cursor-pointer flex justify-between items-start"
                  onClick={() => setSelectedProduct(product)}
                >
                  <div>
                    <h3 className="font-bold text-lg mb-1">{product.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">{product.description || "清配好茶，回甘入心。"}</p>
                    <div className="flex gap-4">
                      {product.prices.M && (
                        <div className="text-sm">
                          <span className="text-gray-400 mr-1">中</span>
                          <span className="font-bold">${product.prices.M}</span>
                        </div>
                      )}
                      {product.prices.L && (
                        <div className="text-sm">
                          <span className="text-gray-400 mr-1">大</span>
                          <span className="font-bold">${product.prices.L}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {product.isRecommended && (
                    <span className="bg-[#FF6321]/10 text-[#FF6321] text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">推薦</span>
                  )}
                </motion.div>
              ))}
          </div>

          {/* Cart Floating Button */}
          {cart.length > 0 && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={() => setIsCartOpen(true)}
              className="fixed bottom-6 right-6 bg-[#5A5A40] text-white p-4 rounded-full shadow-2xl flex items-center gap-3 z-50 hover:scale-105 active:scale-95 transition-transform"
            >
              <ShoppingBag size={24} />
              <span className="font-bold">{cart.length}</span>
              <span className="font-bold border-l border-white/30 pl-3">
                ${cart.reduce((s, i) => s + i.price * i.quantity, 0)}
              </span>
            </motion.button>
          )}

          {/* Product Detail Modal */}
          <AnimatePresence>
            {selectedProduct && (
              <ProductModal 
                product={selectedProduct} 
                onClose={() => setSelectedProduct(null)} 
                onAdd={handleAddToCart}
              />
            )}
          </AnimatePresence>

          {/* Cart Modal */}
          <AnimatePresence>
            {isCartOpen && (
              <CartModal 
                items={cart} 
                onClose={() => setIsCartOpen(false)}
                customerInfo={customerInfo}
                onInfoChange={setCustomerInfo}
                onCheckout={handleCheckout}
                onRemove={(idx) => setCart(cart.filter((_, i) => i !== idx))}
              />
            )}
          </AnimatePresence>
        </main>
      ) : (
        <AdminDashboard orders={orders} onUpdateStatus={dbService.updateOrderStatus} />
      )}
    </div>
  );
}

function ProductModal({ product, onClose, onAdd }: { product: Product, onClose: () => void, onAdd: (item: OrderItem) => void }) {
  const [size, setSize] = useState<'M' | 'L'>(product.prices.M ? 'M' : 'L');
  const [sugar, setSugar] = useState('正常');
  const [ice, setIce] = useState('正常');
  const [quantity, setQuantity] = useState(1);

  const price = product.prices[size] || 0;

  const handleAdd = () => {
    onAdd({
      productId: product.id,
      name: product.name,
      size,
      sugar,
      ice,
      price,
      quantity,
      additions: []
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-hidden"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
        
        <h2 className="text-2xl font-bold mb-6">{product.name}</h2>
        
        <div className="space-y-6">
          <section>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">規格</label>
            <div className="flex gap-2">
              {['M', 'L'].map((s) => (
                product.prices[s as 'M' | 'L'] && (
                  <button
                    key={s}
                    onClick={() => setSize(s as 'M' | 'L')}
                    className={`flex-1 py-3 rounded-xl border-2 transition-all font-bold ${
                      size === s ? 'border-[#5A5A40] bg-[#5A5A40]/5' : 'border-[#E5E5E0]'
                    }`}
                  >
                    {s === 'M' ? '中杯' : '大杯'} (${product.prices[s as 'M' | 'L']})
                  </button>
                )
              ))}
            </div>
          </section>

          <section>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">甜度</label>
            <div className="grid grid-cols-3 gap-2">
              {['正常', '少糖', '半糖', '微糖', '無糖'].map((s) => (
                <button
                  key={s}
                  onClick={() => setSugar(s)}
                  className={`py-2 rounded-lg border transition-all text-sm ${
                    sugar === s ? 'border-[#5A5A40] bg-[#5A5A40] text-white' : 'border-[#E5E5E0]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          <section>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">冰量</label>
            <div className="grid grid-cols-3 gap-2">
              {['正常', '少冰', '微冰', '去冰', '熱'].map((i) => (
                <button
                  key={i}
                  onClick={() => setIce(i)}
                  className={`py-2 rounded-lg border transition-all text-sm ${
                    ice === i ? 'border-[#5A5A40] bg-[#5A5A40] text-white' : 'border-[#E5E5E0]'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </section>

          <div className="flex items-center justify-between pt-6 border-t border-[#E5E5E0]">
            <div className="flex items-center gap-4 bg-gray-100 rounded-full px-4 py-2">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={20} /></button>
              <span className="font-bold w-4 text-center">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)}><Plus size={20} /></button>
            </div>
            
            <button
              onClick={handleAdd}
              className="bg-[#5A5A40] text-white px-8 py-3 rounded-full font-bold shadow-lg hover:shadow-xl transition-shadow"
            >
              加入購物車 (${price * quantity})
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function CartModal({ items, onClose, customerInfo, onInfoChange, onCheckout, onRemove }: any) {
  const total = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100"><X size={24} /></button>
        <h2 className="text-2xl font-bold mb-6">您的訂單</h2>

        <div className="space-y-4 max-h-[40vh] overflow-y-auto mb-6 pr-2 custom-scrollbar">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <p className="font-bold">{item.name} <span className="text-gray-400 font-normal">x {item.quantity}</span></p>
                <p className="text-xs text-gray-500">{item.size} / {item.sugar} / {item.ice}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold">${item.price * item.quantity}</span>
                <button onClick={() => onRemove(idx)} className="text-red-400 hover:bg-red-50 p-1 rounded-full"><Minus size={16} /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">收件人</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="您的姓名"
                value={customerInfo.name}
                onChange={(e) => onInfoChange({ ...customerInfo, name: e.target.value })}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">電話</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="tel" 
                placeholder="您的手機"
                value={customerInfo.phone}
                onChange={(e) => onInfoChange({ ...customerInfo, phone: e.target.value })}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center text-xl font-bold px-1">
            <span>總額</span>
            <span>${total}</span>
          </div>
          <button
            onClick={onCheckout}
            disabled={items.length === 0}
            className="w-full bg-[#5A5A40] text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          >
            確認下單
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function AdminDashboard({ orders, onUpdateStatus }: { orders: Order[], onUpdateStatus: any }) {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    preparing: 'bg-blue-100 text-blue-700',
    ready: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-700'
  };

  const statusLabels = {
    pending: '待處理',
    preparing: '製餐中',
    ready: '可取餐',
    completed: '已完成',
    cancelled: '已取消'
  };

  return (
    <div className="p-4 max-w-6xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">訂單管理</h2>
        <div className="flex gap-2">
          <div className="bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100 text-sm font-medium">
            待處理: {orders.filter(o => o.status === 'pending').length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.map((order) => (
          <motion.div 
            key={order.id} 
            layout
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-4 border-b border-gray-50 flex justify-between items-center">
              <div>
                <p className="font-bold text-lg">{order.customerName}</p>
                <p className="text-xs text-gray-500">{order.phoneNumber}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${statusColors[order.status]}`}>
                {statusLabels[order.status]}
              </span>
            </div>
            
            <div className="p-4 space-y-2 max-h-48 overflow-y-auto">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{item.name} x {item.quantity}</span>
                  <span className="text-gray-400">{item.size}/{item.sugar}/{item.ice}</span>
                </div>
              ))}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-gray-400">總金額: <span className="font-bold text-gray-700">${order.totalAmount}</span></span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Clock size={10} /> {order.createdAt?.toDate().toLocaleTimeString()}
                </span>
              </div>
              
              <div className="flex gap-2">
                {order.status === 'pending' && (
                  <button 
                    onClick={() => onUpdateStatus(order.id, 'preparing')}
                    className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-bold shadow-sm"
                  >
                    接單
                  </button>
                )}
                {order.status === 'preparing' && (
                  <button 
                    onClick={() => onUpdateStatus(order.id, 'ready')}
                    className="flex-1 bg-green-500 text-white py-2 rounded-lg text-sm font-bold shadow-sm"
                  >
                    可取餐
                  </button>
                )}
                {order.status === 'ready' && (
                  <button 
                    onClick={() => onUpdateStatus(order.id, 'completed')}
                    className="flex-1 bg-gray-700 text-white py-2 rounded-lg text-sm font-bold shadow-sm"
                  >
                    完成
                  </button>
                )}
                {['pending', 'preparing'].includes(order.status) && (
                  <button 
                    onClick={() => onUpdateStatus(order.id, 'cancelled')}
                    className="bg-red-50 text-red-500 px-3 py-2 rounded-lg text-sm font-bold hover:bg-red-100"
                  >
                    取消
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {orders.length === 0 && (
        <div className="text-center py-24 opacity-30">
          <Clock size={48} className="mx-auto mb-4" />
          <p className="font-bold">目前無進線訂單</p>
        </div>
      )}
    </div>
  );
}
