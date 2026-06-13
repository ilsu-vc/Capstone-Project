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
import { useAuth } from '../hooks/useAuth';

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

        <Card className="border border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">₱{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">
              <span className="text-emerald-500 flex items-center gap-0.5 inline-flex">
                <ArrowUpRight className="h-3 w-3" /> 12%
              </span> from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">{stats.activeOrders}</div>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">
              Currently processing in queue
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">SLA Breaches</CardTitle>
            <Clock className={`h-4 w-4 ${stats.slaBreaches > 0 ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-red-500">{stats.slaBreaches}</div>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">
              Fulfillment delays identified
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Low Stock SKU</CardTitle>
            <Package className="h-4 w-4 text-[#fbcc0e]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-[#fbcc0e]">{lowStockProducts.length}</div>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">
              Items below reorder point
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Sales Chart */}
        <Card className="lg:col-span-4 border border-border bg-card overflow-hidden">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground">Weekly Sales Analytics</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">B2B Order volume over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="h-[240px] px-2 overflow-hidden">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fdd001" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#fdd001" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1A2332',
                    border: '1px solid #302f2f',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: '#fdd001' }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#fdd001"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Orders List */}
        <Card className="lg:col-span-3 border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground">Active Pipeline</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Live order status monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    order.status === 'out_for_delivery' ? 'bg-blue-400' :
                    order.status === 'pending' ? 'bg-[#fdd001]' :
                    'bg-emerald-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate text-foreground">{order.clientName}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                      {order.orderNumber} • {order.deliveryRegion}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold px-1.5 h-5 border-border text-muted-foreground">
                    ₱{order.totalAmount.toLocaleString()}
                  </Badge>
                </div>
              ))}
              {orders.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No active orders</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {lowStockProducts.length > 0 && (
        <Card className="border border-[#fbcc0e]/30 bg-[#fbcc0e]/5 dark:bg-[#fbcc0e]/8">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#fbcc0e]" />
              <CardTitle className="text-sm font-semibold text-[#fbcc0e]">Inventory Depletion Alerts (ITIL CMDB Monitoring)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lowStockProducts.slice(0, 6).map((item) => (
                <div key={item.id} className="p-3 bg-card border border-border rounded-lg flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate text-foreground">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">SKU: {item.sku}</p>
                  </div>
                  <div className="text-center ml-4">
                    <p className="text-xs font-black text-[#fbcc0e]">REORDER</p>
                    <p className="text-[10px] text-muted-foreground font-medium">Point: {item.reorderPoint}</p>
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
