import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { Order, InventoryItem, Product, Expense } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Package, 
  ArrowUpRight, 
  ArrowDownRight,
  ShoppingCart
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { AuthProvider, useAuth } from '../hooks/useAuth';

export function Dashboard() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeOrders: 0,
    slaBreaches: 0,
    pendingTransfers: 0
  });

  useEffect(() => {
    if (!profile) return;

    // Real-time listener for orders - filter by role
    const ordersQuery = profile.role === 'admin' || profile.role === 'secretary'
      ? query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(50))
      : query(collection(db, 'orders'), where('agentId', '==', profile.uid), orderBy('createdAt', 'desc'), limit(50));

    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ordersData);
      
      const revenue = ordersData
        .filter(o => o.status === 'completed' || o.status === 'delivered')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      
      const active = ordersData.filter(o => ['pending', 'preparing', 'out_for_delivery'].includes(o.status)).length;
      
      // SLA logic: if status is not completed/delivered AND deadline is passed
      const now = new Date();
      const breaches = ordersData.filter(o => 
        !['completed', 'delivered'].includes(o.status) && 
        o.deliveryDeadline && 
        typeof o.deliveryDeadline.toDate === 'function' &&
        o.deliveryDeadline.toDate() < now
      ).length;

      setStats(prev => ({ 
        ...prev, 
        totalRevenue: revenue, 
        activeOrders: active,
        slaBreaches: breaches
      }));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
      setLoading(false);
    });

    // Check low stock products
    const fetchInventory = async () => {
      try {
        const productsSnap = await getDocs(collection(db, 'products'));
        const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        
        const inventorySnap = await getDocs(collection(db, 'inventory'));
        const inventory = inventorySnap.docs.map(doc => doc.data() as InventoryItem);

        const lowStock = products.filter(p => {
          const totalQty = inventory
            .filter(i => i.productId === p.id)
            .reduce((sum, i) => sum + i.quantity, 0);
          return totalQty <= p.reorderPoint;
        });

        setLowStockProducts(lowStock);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'inventory/products');
      }
    };

    fetchInventory();
    return () => unsubscribeOrders();
  }, [profile]);

  const chartData = [
    { name: 'Mon', sales: 4000 },
    { name: 'Tue', sales: 3000 },
    { name: 'Wed', sales: 2000 },
    { name: 'Thu', sales: 2780 },
    { name: 'Fri', sales: 1890 },
    { name: 'Sat', sales: 2390 },
    { name: 'Sun', sales: 3490 },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-zinc-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">₱{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-[10px] text-zinc-500 font-medium mt-1">
              <span className="text-emerald-500 flex items-center gap-0.5 inline-flex">
                <ArrowUpRight className="h-3 w-3" /> 12%
              </span> from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Active Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{stats.activeOrders}</div>
            <p className="text-[10px] text-zinc-500 font-medium mt-1">
              Currently processing in queue
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">SLA Breaches</CardTitle>
            <Clock className={`h-4 w-4 ${stats.slaBreaches > 0 ? 'text-red-500 animate-pulse' : 'text-zinc-400'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-red-600">{stats.slaBreaches}</div>
            <p className="text-[10px] text-zinc-500 font-medium mt-1">
              Fulfillment delays identified
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Low Stock SKU</CardTitle>
            <Package className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-amber-600">{lowStockProducts.length}</div>
            <p className="text-[10px] text-zinc-500 font-medium mt-1">
              Items below reorder point
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Sales Chart */}
        <Card className="lg:col-span-4 border-zinc-200 shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Weekly Sales Analytics</CardTitle>
            <CardDescription className="text-xs">B2B Order volume over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="h-[240px] px-2 overflow-hidden">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#18181b" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#18181b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#71717a' }} 
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18181b', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#18181b" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Orders List */}
        <Card className="lg:col-span-3 border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Active Pipeline</CardTitle>
            <CardDescription className="text-xs">Live order status monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    order.status === 'out_for_delivery' ? 'bg-blue-500' :
                    order.status === 'pending' ? 'bg-amber-500' :
                    'bg-emerald-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate text-zinc-900">{order.clientName}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">
                      {order.orderNumber} • {order.deliveryRegion}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold px-1.5 h-5 bg-zinc-50 border-zinc-200">
                    ₱{order.totalAmount.toLocaleString()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {lowStockProducts.length > 0 && (
        <Card className="border-amber-100 bg-amber-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <CardTitle className="text-sm font-semibold text-amber-900">Inventory Depletion Alerts (ITIL CMDB Monitoring)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lowStockProducts.slice(0, 6).map((item) => (
                <div key={item.id} className="p-3 bg-white border border-amber-100 rounded-lg shadow-sm flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate text-zinc-900">{item.name}</p>
                    <p className="text-[10px] text-zinc-500">SKU: {item.sku}</p>
                  </div>
                  <div className="text-center ml-4">
                    <p className="text-xs font-black text-amber-600">REORDER</p>
                    <p className="text-[10px] text-zinc-400 font-medium">Point: {item.reorderPoint}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
