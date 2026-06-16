import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { Product } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

export function Pricelist() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const { profile } = useAuth();
  const [hasDelegatedAccess, setHasDelegatedAccess] = useState(false);

  const isAdmin = profile?.role === 'admin';
  const canEditPricelist = isAdmin || hasDelegatedAccess;

  useEffect(() => {
    if (!profile || profile.role !== 'staff') return;
    const q = query(collection(db, 'delegations'), where('staffEmail', '==', profile.email.toLowerCase()));
    const unsub = onSnapshot(q, (snap) => {
      const hasAccess = snap.docs.some(d => d.data().canAdjustPricelist === true);
      setHasDelegatedAccess(hasAccess);
    });
    return () => unsub();
  }, [profile]);

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
      setLoading(false);
    });

    return () => unsubProducts();
  }, []);

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newProduct = {
      sku: formData.get('code'),
      name: formData.get('name'),
      category: formData.get('category'),
      basePrice: Number(formData.get('basePrice')),
      wholesalePrice: Number(formData.get('wholesalePrice')),
      dealerPrice: Number(formData.get('dealerPrice')),
      minStockLevel: 0,
      reorderPoint: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const docRef = await addDoc(collection(db, 'products'), newProduct);
      const whSnap = await getDocs(collection(db, 'warehouses'));
      for (const d of whSnap.docs) {
        await addDoc(collection(db, 'inventory'), {
          productId: docRef.id,
          warehouseId: d.id,
          quantity: 0,
          lastUpdated: serverTimestamp()
        });
      }
      setIsAddProductOpen(false);
      toast.success('Product added to catalog');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'products');
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const categories = useMemo(() => {
    const cats = new Set(filteredProducts.map(p => p.category || 'Uncategorized'));
    return ['All', ...Array.from(cats).sort()];
  }, [filteredProducts]);

  const defaultCategory = 'All';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-foreground uppercase">Pricelist</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input 
              placeholder="Search by product name or Item Code..." 
              className="pl-9 h-10 border-border bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {canEditPricelist && (
            <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
              <DialogTrigger className="h-10 gap-2 px-4 bg-[#1A2332] text-white rounded-lg inline-flex items-center justify-center font-medium transition-all hover:bg-[#1A2332]/90 flex-shrink-0">
                <Plus className="w-4 h-4" /> Add Product
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                  <DialogDescription>Register a new product with pricing into the catalog.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddProduct} className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Item Code</Label>
                      <Input id="code" name="code" required placeholder="AP-XYZ-123" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Item Name</Label>
                      <Input id="name" name="name" required placeholder="Product Name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Input id="category" name="category" placeholder="Category" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="basePrice">Base Cost (₱)</Label>
                      <Input id="basePrice" name="basePrice" type="number" step="0.01" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wholesalePrice">Wholesale (₱)</Label>
                      <Input id="wholesalePrice" name="wholesalePrice" type="number" step="0.01" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dealerPrice">Dealer (₱)</Label>
                      <Input id="dealerPrice" name="dealerPrice" type="number" step="0.01" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full sm:w-auto">Save Product</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border">
          No products found matching your search.
        </div>
      ) : (
        <Tabs defaultValue={defaultCategory} className="w-full">
          <TabsList className="mb-4 flex flex-wrap h-auto bg-muted/50 p-1 rounded-lg">
            {categories.map(category => (
              <TabsTrigger 
                key={category} 
                value={category}
                className="rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm px-4 py-2 font-medium text-sm transition-all"
              >
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {categories.map(category => {
            const categoryProducts = category === 'All' 
              ? filteredProducts 
              : filteredProducts.filter(p => (p.category || 'Uncategorized') === category);
            
            return (
              <TabsContent key={category} value={category} className="mt-0">
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto w-full">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-[120px] text-[10px] font-bold uppercase tracking-widest min-w-[120px]">Item Code</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 min-w-[200px]">Product Name</TableHead>
                          <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest min-w-[100px]">Base Price</TableHead>
                          <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 min-w-[100px]">Wholesale</TableHead>
                          <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 min-w-[100px]">Dealer</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryProducts.map((p) => (
                          <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-mono text-xs text-zinc-500">{p.sku}</TableCell>
                            <TableCell className="font-bold text-sm text-foreground">{p.name}</TableCell>
                            <TableCell className="text-right font-medium">₱{p.basePrice?.toLocaleString() || '0'}</TableCell>
                            <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">₱{p.wholesalePrice?.toLocaleString() || '0'}</TableCell>
                            <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">₱{p.dealerPrice?.toLocaleString() || '0'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
