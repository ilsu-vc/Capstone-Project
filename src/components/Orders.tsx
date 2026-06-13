import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy, 
  where, 
  serverTimestamp, 
  getDocs, 
  writeBatch,
  arrayUnion
} from 'firebase/firestore';
import { Order, OrderStatus, Product, InventoryItem, OrderItem, StatusHistoryEntry } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Clock, 
  Truck, 
  CheckCircle2, 
  Camera, 
  AlertCircle,
  ChevronRight,
  FileText,
  Eye,
  Calendar,
  PackageCheck,
  User as UserIcon,
  UserCog
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addDays, format } from 'date-fns';

export function Orders() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [cart, setCart] = useState<{ productId: string; quantity: number; price: number; name: string; sku: string }[]>([]);
  const [clientInfo, setClientInfo] = useState({ name: '', region: 'Metro Manila' });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDispatchDialogOpen, setIsDispatchDialogOpen] = useState(false);
  const [dispatchOrder, setDispatchOrder] = useState<Order | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');

  const [activeTab, setActiveTab] = useState<'items' | 'history'>('items');

  const filteredOrders = orders.filter(order => {
    const queryStr = searchQuery.toLowerCase();
    const matchesSku = order.skus?.some(sku => sku.toLowerCase().includes(queryStr));
    const matchesOrderNumber = order.orderNumber.toLowerCase().includes(queryStr);
    const matchesClient = order.clientName.toLowerCase().includes(queryStr);
    return matchesSku || matchesOrderNumber || matchesClient;
  });

  useEffect(() => {
    const isAdminOrSecretary = profile?.role === 'admin' || profile?.role === 'secretary';
    const q = isAdminOrSecretary
      ? query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'orders'), where('agentId', '==', profile?.uid || ''), orderBy('createdAt', 'desc'));

    const unsubOrders = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
    });

    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snap) => {
      setInventory(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'inventory');
    });

    return () => {
      unsubOrders();
      unsubProducts();
      unsubInventory();
    };
  }, [profile]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
        );
      }
      return [...prev, { 
        productId: product.id, 
        quantity: 1, 
        price: product.wholesalePrice || product.basePrice,
        name: product.name,
        sku: product.sku
      }];
    });
    toast.success(`${product.name} added to cart`);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const submitOrder = async () => {
    if (!clientInfo.name || cart.length === 0) return;

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deadlineDays = clientInfo.region === 'Metro Manila' ? 7 : 14;
    const deadline = addDays(new Date(), deadlineDays);

    const orderData = {
      orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
      agentId: profile?.uid,
      clientId: `CLI-${Math.random().toString(36).substring(7).toUpperCase()}`,
      clientName: clientInfo.name,
      status: 'pending',
      skus: cart.map(item => item.sku),
      totalAmount,
      paymentStatus: 'unpaid',
      deliveryRegion: clientInfo.region,
      deliveryDeadline: deadline,
      statusHistory: [
        {
          status: 'pending',
          changedBy: profile?.displayName || profile?.email || 'Unknown',
          timestamp: new Date(),
          note: 'Order created via B2B Portal'
        }
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Add items
      for (const item of cart) {
        await addDoc(collection(db, `orders/${orderRef.id}/items`), {
          orderId: orderRef.id,
          productId: item.productId,
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          subtotal: item.price * item.quantity
        });
      }

      setCart([]);
      setClientInfo({ name: '', region: 'Metro Manila' });
      setIsNewOrderOpen(false);
      toast.success('B2B Order successfully queued');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'orders');
    }
  };

  const updateOrderStatus = async (order: Order, newStatus: OrderStatus) => {
    try {
      // Stock Validation and Deduction Pattern
      if (newStatus === 'preparing' && order.status === 'pending') {
        const loadingToast = toast.loading('Synchronizing inventory levels...');
        
        // 1. Fetch order items
        const itemsSnap = await getDocs(collection(db, 'orders', order.id, 'items'));
        const items = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as OrderItem));

        if (items.length === 0) {
          toast.dismiss(loadingToast);
          toast.error('Cannot process empty order');
          return;
        }

        // 2. Consolidate items by Product ID (in case of duplicate lines)
        const consolidatedDemand: Record<string, { quantity: number; name: string }> = {};
        items.forEach(item => {
          if (!consolidatedDemand[item.productId]) {
            consolidatedDemand[item.productId] = { quantity: 0, name: item.name };
          }
          consolidatedDemand[item.productId].quantity += item.quantity;
        });

        // 3. Fetch inventory only for required products
        const productIds = Object.keys(consolidatedDemand);
        const currentInventory: InventoryItem[] = [];
        
        // Firestore 'in' query limit is 10. Most B2B orders are small SKU-wise, but we'll chunk to be safe.
        for (let i = 0; i < productIds.length; i += 10) {
          const chunk = productIds.slice(i, i + 10);
          const invQuery = query(collection(db, 'inventory'), where('productId', 'in', chunk));
          const invSnap = await getDocs(invQuery);
          currentInventory.push(...invSnap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));
        }
        
        const updates: { inventoryId: string, newQuantity: number; adjustment: any }[] = [];
        const insufficient: string[] = [];

        for (const productId in consolidatedDemand) {
          const demand = consolidatedDemand[productId];
          
          // Identify warehouses with enough stock for THIS product
          const warehouseOptions = currentInventory
            .filter(inv => inv.productId === productId && inv.quantity >= demand.quantity)
            .sort((a, b) => b.quantity - a.quantity);

          if (warehouseOptions.length === 0) {
            // Check total stock across all warehouses just to give a better error message
            const totalStock = currentInventory
              .filter(inv => inv.productId === productId)
              .reduce((sum, inv) => sum + inv.quantity, 0);
            
            insufficient.push(`${demand.name} (${demand.quantity} req, ${totalStock} avail)`);
          } else {
            const bestChoice = warehouseOptions[0];
            updates.push({
              inventoryId: bestChoice.id,
              newQuantity: bestChoice.quantity - demand.quantity,
              adjustment: {
                productId: productId,
                warehouseId: bestChoice.warehouseId,
                adjustmentAmount: -demand.quantity,
                reason: `Auto-allocation: Order ${order.orderNumber}`,
                recordedBy: profile?.uid || 'system',
                timestamp: serverTimestamp()
              }
            });
            // Update local copy in case product appears elsewhere somehow (already handled by consolidation but safe)
            bestChoice.quantity -= demand.quantity;
          }
        }

        if (insufficient.length > 0) {
          toast.dismiss(loadingToast);
          toast.error(`Insufficient Stock: ${insufficient.join(', ')}`, {
            duration: 6000,
            icon: <AlertCircle className="text-red-500" />
          });
          return;
        }

        // 4. Commit atomic batch
        const batch = writeBatch(db);
        
        for (const up of updates) {
          const invRef = doc(db, 'inventory', up.inventoryId);
          batch.update(invRef, {
            quantity: up.newQuantity,
            lastUpdated: serverTimestamp()
          });
          
          const adjRef = doc(collection(db, 'stockAdjustments'));
          batch.set(adjRef, up.adjustment);
        }

        const orderRef = doc(db, 'orders', order.id);
        batch.update(orderRef, {
          status: newStatus,
          updatedAt: serverTimestamp(),
          statusHistory: arrayUnion({
            status: newStatus,
            changedBy: profile?.displayName || profile?.email || 'Unknown',
            timestamp: new Date(),
            note: `Transitioned to ${newStatus.replace('_', ' ')} (Inventory Allocated)`
          })
        });

        await batch.commit();
        toast.dismiss(loadingToast);
        toast.success(`Inventory successfully allocated. Order ${order.orderNumber} is now in preparation.`, {
          icon: <PackageCheck className="text-emerald-500" />,
          duration: 4000
        });
        return;
      }

      // Manual Dispatch with Photo Validation
      if (newStatus === 'out_for_delivery' && !order.photoValidationUrl) {
         setDispatchOrder(order);
         setPhotoUrl('');
         setIsDispatchDialogOpen(true);
         return;
      }

      await updateDoc(doc(db, 'orders', order.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        statusHistory: arrayUnion({
          status: newStatus,
          changedBy: profile?.displayName || profile?.email || 'Unknown',
          timestamp: new Date(),
          note: `Status updated to ${newStatus.replace('_', ' ')}`
        }),
        ...(newStatus === 'out_for_delivery' && photoUrl ? { photoValidationUrl: photoUrl } : {})
      });
      toast.success(`Order moving to ${newStatus}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  const handleViewDetails = async (order: Order) => {
    setSelectedOrder(order);
    setIsOrderDetailsOpen(true);
    setIsLoadingItems(true);
    try {
      const itemsSnap = await getDocs(collection(db, 'orders', order.id, 'items'));
      const items = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as OrderItem));
      setOrderItems(items);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `orders/${order.id}/items`);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleDispatch = async () => {
    if (!dispatchOrder || !photoUrl) return;
    try {
      await updateDoc(doc(db, 'orders', dispatchOrder.id), {
        status: 'out_for_delivery',
        photoValidationUrl: photoUrl,
        updatedAt: serverTimestamp(),
        statusHistory: arrayUnion({
          status: 'out_for_delivery',
          changedBy: profile?.displayName || profile?.email || 'Unknown',
          timestamp: new Date(),
          note: 'Order dispatched with photo verification'
        })
      });
      setIsDispatchDialogOpen(false);
      setDispatchOrder(null);
      setPhotoUrl('');
      toast.success('Inventory dispatched for delivery');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${dispatchOrder.id}`);
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return <Clock className="w-3 h-3" />;
      case 'preparing': return <ShoppingCart className="w-3 h-3" />;
      case 'out_for_delivery': return <Truck className="w-3 h-3" />;
      case 'delivered': return <CheckCircle2 className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900">Service Request Queue (Orders)</h2>
        <Dialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
          <DialogTrigger className="h-9 gap-2 px-4 bg-[#1A2332] text-white rounded-lg inline-flex items-center justify-center font-medium transition-all hover:bg-[#1A2332]/90">
            <Plus className="w-4 h-4" /> Create B2B Order
          </DialogTrigger>
          <DialogContent className="sm:max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>B2B Order Entry Portal</DialogTitle>
              <DialogDescription>Input new customer request for multi-warehouse synchronization.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Client Business Name</Label>
                  <Input 
                    placeholder="Enter client name..." 
                    value={clientInfo.name}
                    onChange={e => setClientInfo(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Delivery Region (SLA Mapping)</Label>
                  <Select 
                    value={clientInfo.region} 
                    onValueChange={v => setClientInfo(prev => ({ ...prev, region: v }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Metro Manila">Metro Manila (1 Week SLA)</SelectItem>
                      <SelectItem value="Luzon">Provincial Luzon (10 Days SLA)</SelectItem>
                      <SelectItem value="Visayas">Visayas (14 Days SLA)</SelectItem>
                      <SelectItem value="Mindanao">Mindanao (14 Days SLA)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Available Inventory</Label>
                  <div className="mt-2 space-y-2 min-h-[350px] max-h-[500px] overflow-y-auto border rounded-md p-2">
                    {products.map(p => (
                       <div key={p.id} className="flex items-center justify-between p-2 hover:bg-muted rounded border border-transparent hover:border-border transition-all">
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{p.name}</p>
                          <p className="text-[10px] text-zinc-500">Stock: {inventory.filter(i => i.productId === p.id).reduce((sum, i) => sum + i.quantity, 0)}</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => addToCart(p)}>
                          <Plus className="w-3 h-3 mr-1" /> Add
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="bg-muted rounded-xl p-4 flex flex-col border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-900">Current Cart</h4>
                  <Badge variant="secondary" className="text-[10px]">{cart.length} SKUs</Badge>
                </div>
                <div className="flex-1 space-y-3 mb-4 overflow-y-auto pr-2">
                  {cart.map(item => (
                    <div key={item.productId} className="flex items-center justify-between bg-card p-2 rounded-lg border border-border">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold truncate">{item.name}</p>
                        <p className="text-[10px] text-zinc-500">₱{item.price.toLocaleString()} x {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black">₱{(item.price * item.quantity).toLocaleString()}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => removeFromCart(item.productId)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {cart.length === 0 && (
                    <div className="h-40 flex flex-col items-center justify-center text-zinc-400">
                      <ShoppingCart className="w-8 h-8 mb-2 opacity-20" />
                      <p className="text-xs font-medium">Cart is empty</p>
                    </div>
                  )}
                </div>
                <div className="pt-4 border-top border-zinc-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Grand Total</span>
                    <span className="text-xl font-black text-zinc-900">₱{cart.reduce((s, i) => s + (i.price * i.quantity), 0).toLocaleString()}</span>
                  </div>
                  <Button className="w-full h-11 bg-[#1A2332] text-white font-bold" disabled={cart.length === 0 || !clientInfo.name} onClick={submitOrder}>
                    Confirm and Queue Order
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isOrderDetailsOpen} onOpenChange={setIsOrderDetailsOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between pr-8">
                <span>Order Details: {selectedOrder?.orderNumber}</span>
                <Badge variant="outline" className="capitalize text-[10px] font-bold px-3">
                  {selectedOrder?.status.replace('_', ' ')}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                System ledger summary for current B2B request.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-4 border-b border-border px-6 -mx-6">
              <button 
                className={`pb-3 text-xs font-black uppercase tracking-widest transition-all relative ${
                  activeTab === 'items' ? 'text-primary border-b-2 border-primary' : 'text-zinc-500 hover:text-foreground'
                }`}
                onClick={() => setActiveTab('items')}
              >
                Line Items
              </button>
              <button 
                className={`pb-3 text-xs font-black uppercase tracking-widest transition-all relative ${
                  activeTab === 'history' ? 'text-primary border-b-2 border-primary' : 'text-zinc-500 hover:text-foreground'
                }`}
                onClick={() => setActiveTab('history')}
              >
                Status History
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
              <div className="space-y-4 col-span-2">
                {activeTab === 'items' ? (
                  <div className="border rounded-lg overflow-hidden bg-card">
                    <Table>
                      <TableHeader className="bg-muted">
                        <TableRow>
                          <TableHead className="text-[10px] font-bold uppercase py-2">Item / SKU</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase py-2 text-center">Qty</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase py-2 text-right">Price</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase py-2 text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingItems ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8">
                              <div className="flex flex-col items-center gap-2 text-zinc-400">
                                <div className="w-4 h-4 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Retrieving Line Items...</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          orderItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold">{item.name}</span>
                                  <span className="text-[9px] font-mono text-zinc-400">{item.sku}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center text-xs font-medium">{item.quantity}</TableCell>
                              <TableCell className="text-right text-xs">₱{item.unitPrice.toLocaleString()}</TableCell>
                              <TableCell className="text-right text-xs font-bold">₱{item.subtotal.toLocaleString()}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="space-y-4 pr-2 max-h-[400px] overflow-y-auto">
                    {selectedOrder?.statusHistory?.slice().reverse().map((entry, idx) => (
                      <div key={idx} className="relative pl-6 pb-6 border-l-2 border-border last:pb-0">
                        <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full border-2 border-background ${
                          entry.status === 'delivered' ? 'bg-emerald-500' : 
                          entry.status === 'pending' ? 'bg-zinc-300' : 'bg-blue-500'
                        }`} />
                        <div className="bg-muted rounded-xl p-3 border border-border group hover:border-foreground/20 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900">
                              {entry.status.replace('_', ' ')}
                            </span>
                            <span className="text-[9px] font-medium text-zinc-400">
                              {entry.timestamp && (
                                typeof entry.timestamp.toDate === 'function'
                                  ? format(entry.timestamp.toDate(), 'MMM d, h:mm a')
                                  : format(new Date(entry.timestamp), 'MMM d, h:mm a')
                              )}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-zinc-600 mb-2">{entry.note}</p>
                          <div className="flex items-center gap-1.5 border-t border-zinc-200/50 pt-2">
                            <div className="w-4 h-4 bg-background rounded-full flex items-center justify-center">
                              <UserIcon className="w-2 h-2 text-zinc-500" />
                            </div>
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">Modified by {entry.changedBy}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!selectedOrder?.statusHistory || selectedOrder.statusHistory.length === 0) && (
                      <div className="text-center py-12 text-zinc-400 italic text-xs">
                        No historical status logs found for this entry.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-tighter text-zinc-400">Client Information</p>
                    <div className="bg-muted p-2 rounded-md border border-border">
                      <p className="text-xs font-bold text-zinc-900">{selectedOrder?.clientName}</p>
                      <p className="text-[10px] text-zinc-500 font-medium">{selectedOrder?.deliveryRegion} Region</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-tighter text-zinc-400">SLA Requirements</p>
                    <div className="flex items-center gap-2 bg-muted p-2 rounded-md border border-border">
                      <Calendar className="w-3 h-3 text-zinc-400" />
                      <div>
                        <p className="text-xs font-bold text-zinc-900">
                          {selectedOrder?.deliveryDeadline && (
                            typeof selectedOrder.deliveryDeadline.toDate === 'function' 
                              ? format(selectedOrder.deliveryDeadline.toDate(), 'PPP')
                              : format(new Date(selectedOrder.deliveryDeadline), 'PPP')
                          )}
                        </p>
                        <p className="text-[9px] uppercase font-black text-zinc-500 tracking-tight">Contractual Deadline</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Grand Total</span>
                      <span className="text-lg font-black text-zinc-900">
                        ₱{selectedOrder?.totalAmount.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[9px] text-zinc-400 text-right italic">Inclusive of all taxes and regional fees.</p>
                  </div>

                  {selectedOrder?.photoValidationUrl && (
                    <div className="pt-4 space-y-2">
                       <p className="text-[10px] font-black uppercase tracking-tighter text-zinc-400">Dispatch Proof</p>
                       <img 
                        src={selectedOrder.photoValidationUrl} 
                        alt="Dispatch Validation" 
                         className="w-full h-32 object-cover rounded-lg border border-border"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isDispatchDialogOpen} onOpenChange={setIsDispatchDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dispatch Validation</DialogTitle>
              <DialogDescription>
                Upload proof of dispatch for Order {dispatchOrder?.orderNumber}. Status will remain 'Preparing' until validation is attached.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Dispatch Photo URL (Required)</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="https://example.com/dispatch-photo.jpg" 
                    value={photoUrl}
                    onChange={e => setPhotoUrl(e.target.value)}
                  />
                  <Button variant="outline" size="icon" onClick={() => setPhotoUrl("https://images.unsplash.com/photo-1566576721346-d4a3b4eaad5b?w=800")}>
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-zinc-500 italic">Enter a valid image URL for proof of pickup/dispatch.</p>
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={handleDispatch} 
                disabled={!photoUrl} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Validate and Dispatch
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2 bg-card p-3 border border-border rounded-xl">
        <ShoppingCart className="w-4 h-4 text-zinc-400 ml-1" />
        <Input 
          placeholder="Filter by SKU, Order #, or Client..." 
          className="h-8 text-xs border-none shadow-none focus-visible:ring-0"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2 text-[10px] font-bold uppercase text-zinc-400"
            onClick={() => setSearchQuery('')}
          >
            Clear
          </Button>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest">Order ID</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest">Client Name</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest">Status</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-center">Deadline (SLA)</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right">Amount</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map(order => {
              const deadlineDate = typeof order.deliveryDeadline?.toDate === 'function' ? order.deliveryDeadline.toDate() : null;
              const isOverdue = deadlineDate && deadlineDate < new Date() && !['delivered', 'completed'].includes(order.status);
              return (
                <TableRow key={order.id} className="group transition-colors">
                  <TableCell className="font-mono text-xs text-zinc-400 font-medium">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-900">{order.clientName}</span>
                      <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-tighter">{order.deliveryRegion}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`gap-1.5 h-6 capitalize text-[10px] font-bold ${
                      order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      order.status === 'out_for_delivery' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {getStatusIcon(order.status)}
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className={`text-[10px] font-bold ${isOverdue ? 'text-red-500' : 'text-zinc-500'}`}>
                      {deadlineDate ? deadlineDate.toLocaleDateString() : 'N/A'}
                      {isOverdue && <span className="ml-1 uppercase text-[8px] animate-bounce bg-red-100 px-1 rounded">SLA Breach</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-black text-xs">
                    ₱{order.totalAmount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7 text-muted-foreground hover:text-foreground" 
                      onClick={() => handleViewDetails(order)}
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {profile?.role !== 'agent' && (
                      <>
                        {order.status === 'pending' && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-zinc-900" onClick={() => updateOrderStatus(order, 'preparing')}>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        )}
                        {order.status === 'preparing' && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-500 hover:bg-blue-50" onClick={() => updateOrderStatus(order, 'out_for_delivery')}>
                            <Camera className="w-4 h-4" />
                          </Button>
                        )}
                        {order.status === 'out_for_delivery' && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-500 hover:bg-emerald-50" onClick={() => updateOrderStatus(order, 'delivered')}>
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                      </>
                    )}
                    {order.photoValidationUrl && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-zinc-900" onClick={() => window.open(order.photoValidationUrl)}>
                         <FileText className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-zinc-400">
                    <ShoppingCart className="w-8 h-8 opacity-20" />
                    <p className="text-xs font-medium italic">No orders match your search criteria.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
