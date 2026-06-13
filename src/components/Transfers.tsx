import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { Transfer, Product, Warehouse, InventoryItem } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, ArrowRightLeft, Clock, CheckCircle2, History, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

export function Transfers() {
  const { profile } = useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isAddTransferOpen, setIsAddTransferOpen] = useState(false);

  useEffect(() => {
    const unsubTransfers = onSnapshot(query(collection(db, 'transfers'), orderBy('createdAt', 'desc')), (snap) => {
      setTransfers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transfer)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'transfers');
    });
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
    });
    const unsubWarehouses = onSnapshot(collection(db, 'warehouses'), (snap) => {
      setWarehouses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Warehouse)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'warehouses');
    });
    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snap) => {
      setInventory(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'inventory');
    });

    return () => {
      unsubTransfers();
      unsubProducts();
      unsubWarehouses();
      unsubInventory();
    };
  }, []);

  const handleInitiateTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const sourceWh = formData.get('sourceWh') as string;
    const destWh = formData.get('destWh') as string;
    const prodId = formData.get('productId') as string;
    const qty = Number(formData.get('quantity'));

    if (sourceWh === destWh) {
      toast.error('Source and destination warehouses must be different');
      return;
    }

    // Check availability
    const sourceInv = inventory.find(i => i.productId === prodId && i.warehouseId === sourceWh);
    if (!sourceInv || sourceInv.quantity < qty) {
      toast.error('Insufficient stock in source warehouse');
      return;
    }

    const newTransfer = {
      sourceWarehouseId: sourceWh,
      destinationWarehouseId: destWh,
      productId: prodId,
      quantity: qty,
      status: 'pending',
      initiatedBy: profile?.uid,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'transfers'), newTransfer);
      setIsAddTransferOpen(false);
      toast.success('Warehouse transfer request initiated');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'transfers');
    }
  };

  const updateStatus = async (transfer: Transfer, newStatus: 'in_transit' | 'received') => {
    try {
      if (newStatus === 'received') {
        const sourceInv = inventory.find(i => i.productId === transfer.productId && i.warehouseId === transfer.sourceWarehouseId);
        const destInv = inventory.find(i => i.productId === transfer.productId && i.warehouseId === transfer.destinationWarehouseId);

        if (sourceInv && destInv) {
          // Deduct from source
          await updateDoc(doc(db, 'inventory', sourceInv.id), {
             quantity: sourceInv.quantity - transfer.quantity,
             lastUpdated: serverTimestamp()
          });
          // Add to dest
          await updateDoc(doc(db, 'inventory', destInv.id), {
             quantity: destInv.quantity + transfer.quantity,
             lastUpdated: serverTimestamp()
          });
        }
      }

      await updateDoc(doc(db, 'transfers', transfer.id), {
         status: newStatus,
         updatedAt: serverTimestamp()
      });
      toast.success(`Transfer status updated to ${newStatus}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `transfers/${transfer.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Warehouse Transfer Log</h2>
          <p className="text-xs text-muted-foreground font-medium tracking-tight">Managing stock movement between Valenzuela facilities</p>
        </div>
        <Dialog open={isAddTransferOpen} onOpenChange={setIsAddTransferOpen}>
          <DialogTrigger className="h-9 gap-2 px-4 bg-[#1A2332] text-white rounded-lg inline-flex items-center justify-center font-medium transition-all hover:bg-[#1A2332]/90">
            <ArrowRightLeft className="w-4 h-4" /> New Transfer Request
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Initiate Stock Movement</DialogTitle>
              <DialogDescription>Request a transfer of inventory items between warehouse locations.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInitiateTransfer} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Source Facility</Label>
                  <Select name="sourceWh" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Origin..." />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map(wh => (
                        <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Destination</Label>
                  <Select name="destWh" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Destination..." />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map(wh => (
                        <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Configuration Item (Product)</Label>
                <Select name="productId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity to Transfer</Label>
                <Input name="quantity" type="number" required min="1" defaultValue="1" />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full">Initiate Pipeline Movement</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest">Movement ID</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest">Asset Details</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest">Traffic Flow</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest">Operational Status</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.map((t) => {
              const product = products.find(p => p.id === t.productId);
              const source = warehouses.find(w => w.id === t.sourceWarehouseId);
              const dest = warehouses.find(w => w.id === t.destinationWarehouseId);
              return (
                <TableRow key={t.id} className="group">
                  <TableCell className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">
                    TFR-{t.id.slice(-6)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-foreground">{product?.name || 'Unknown'}</span>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Qty: {t.quantity}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-foreground">
                      <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{source?.name}</span>
                       <ArrowRightLeft className="w-3 h-3 text-muted-foreground/40" />
                       <span className="bg-[#1A2332] text-white px-1.5 py-0.5 rounded">{dest?.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`gap-1.5 h-6 capitalize text-[10px] font-black ${
                      t.status === 'received' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' :
                      t.status === 'in_transit' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                      'bg-amber-500/10 text-amber-500 border-amber-500/30'
                    }`}>
                      {t.status === 'pending' && <Clock className="w-3 h-3" />}
                      {t.status === 'in_transit' && <Truck className="w-3 h-3" />}
                      {t.status === 'received' && <CheckCircle2 className="w-3 h-3" />}
                      {t.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {t.status === 'pending' && (
                      <Button size="sm" variant="ghost" className="text-xs font-bold h-8" onClick={() => updateStatus(t, 'in_transit')}>
                        Dispatch
                      </Button>
                    )}
                    {t.status === 'in_transit' && (
                      <Button size="sm" variant="ghost" className="text-xs font-bold h-8 text-emerald-500 hover:bg-emerald-500/10" onClick={() => updateStatus(t, 'received')}>
                        Confirm Arrival
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {transfers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-32 flex flex-col items-center justify-center gap-2">
                   <History className="w-8 h-8 text-muted-foreground/30" />
                   <p className="text-xs font-medium text-muted-foreground">No active transfers tracked</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
