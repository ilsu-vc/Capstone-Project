import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HelpCircle, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Truck, 
  ShieldCheck,
  Zap,
  Camera,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TUTORIAL_PAGES = [
  {
    id: 'intro',
    title: 'The VMSPRO Ecosystem',
    icon: <Zap className="w-8 h-8 text-zinc-900" />,
    content: 'VMSPRO is a centralized logistics engine designed for multi-hub environments. It synchronizes stock levels, financial trajectories, and fulfillment workflows in real-time.',
    highlights: [
      'Real-time Firebase Sync',
      'Multi-Warehouse Architecture',
      'Automated P&L Processing'
    ]
  },
  {
    id: 'inventory',
    title: 'Inventory Precision',
    icon: <Package className="w-8 h-8 text-zinc-900" />,
    content: 'The Inventory module tracks every SKU across your network. You can filter by warehouse hub, monitor low-stock alerts, and perform bulk adjustments.',
    highlights: [
       'SKU Tracking & Categorization',
       'Hub-specific Stock Levels',
       'Visual Stock Trajectories'
    ]
  },
  {
    id: 'orders',
    title: 'Verified Fulfillment',
    icon: <ShoppingCart className="w-8 h-8 text-zinc-900" />,
    content: 'Orders follow a strict lifecycle: Pending → Dispatched → Completed. Our system uses Photo Validation during dispatch to ensure accountability.',
    highlights: [
       'Photo Evidence Requirements',
       'Automatic Stock Decrementing',
       'Order History Persistence'
    ]
  },
  {
    id: 'finance',
    title: 'Financial Intelligence',
    icon: <BarChart3 className="w-8 h-8 text-zinc-900" />,
    content: 'The Finance module balances operational expenses against order revenue. It generates a trajectory chart showing your business health over time.',
    highlights: [
       'Profit & Loss Ledgers',
       'Categorized Expenditure',
       'Revenue vs. Cost Analytics'
    ]
  }
];

export const TutorialOverlay = ({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [showExample, setShowExample] = useState(false);

  const nextPage = () => currentPage < TUTORIAL_PAGES.length - 1 && setCurrentPage(prev => prev + 1);
  const prevPage = () => currentPage > 0 && setCurrentPage(prev => prev - 1);

  const current = TUTORIAL_PAGES[currentPage];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 bg-white border-zinc-200 overflow-hidden rounded-[2rem]">
        <div className="flex flex-col md:flex-row h-[70vh]">
          {/* Left: Interactive Visual */}
          <div className="md:w-2/5 bg-zinc-950 p-10 flex flex-col justify-between text-white relative">
            <div className="relative z-10">
               <div className="bg-white/10 w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-8 border border-white/10">
                  {current.icon}
               </div>
               <h2 className="text-3xl font-black tracking-tighter uppercase mb-4 leading-none">{current.title}</h2>
               <div className="space-y-3">
                  {current.highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                      {h}
                    </div>
                  ))}
               </div>
            </div>

            <div className="relative z-10 pt-12">
               <p className="text-sm font-medium text-zinc-400 italic">"Precision at Scale"</p>
            </div>
            
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="grid grid-cols-4 h-full">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="border-r border-white/20 h-full" />
                ))}
              </div>
            </div>
          </div>

          {/* Right: Content & Example */}
          <div className="md:w-3/5 p-10 flex flex-col bg-white">
            <div className="flex-1 overflow-y-auto pr-2">
               {!showExample ? (
                 <motion.div
                  key="content"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-8"
                 >
                    <p className="text-lg text-zinc-600 font-medium leading-relaxed">
                      {current.content}
                    </p>

                    <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100">
                       <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                          <ShieldCheck className="w-3 h-3" /> Security Protocol
                       </h4>
                       <p className="text-xs text-zinc-500 font-medium">
                          All data is synchronized via regional clusters. Only users with designated {current.id === 'finance' ? 'Admin' : 'Secretary'} roles can modify these records.
                       </p>
                    </div>

                    <Button 
                      variant="outline" 
                      onClick={() => setShowExample(true)}
                      className="w-full h-12 border-2 border-zinc-200 text-[10px] font-black uppercase tracking-widest gap-2 hover:bg-zinc-900 hover:text-white transition-all"
                    >
                      View Live Example Workflow <Zap className="w-3 h-3" />
                    </Button>
                 </motion.div>
               ) : (
                 <motion.div
                  key="example"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                 >
                    <div className="flex items-center justify-between">
                       <h3 className="text-xl font-black tracking-tighter uppercase">Example Scenario</h3>
                       <Button variant="ghost" size="sm" onClick={() => setShowExample(false)} className="text-[10px] font-black uppercase">Close Example</Button>
                    </div>

                    <div className="space-y-4">
                       <div className="relative pl-8 border-l-2 border-zinc-100 pb-4">
                          <div className="absolute top-0 -left-[9px] w-4 h-4 bg-zinc-900 rounded-full flex items-center justify-center">
                             <Package className="w-2 h-2 text-white" />
                          </div>
                          <p className="text-xs font-black uppercase tracking-widest text-zinc-900 mb-1">Step 1: Stock Arrival</p>
                          <p className="text-xs text-zinc-500">You receive 50 units of "Tech-X Headset". You create the product in Inventory and assign it to "Warehouse Hub A".</p>
                       </div>

                       <div className="relative pl-8 border-l-2 border-zinc-100 pb-4">
                          <div className="absolute top-0 -left-[9px] w-4 h-4 bg-zinc-900 rounded-full flex items-center justify-center">
                             <ShoppingCart className="w-2 h-2 text-white" />
                          </div>
                          <p className="text-xs font-black uppercase tracking-widest text-zinc-900 mb-1">Step 2: Order Entry</p>
                          <p className="text-xs text-zinc-500">A customer buys 2 units. You create a "New Order". The system marks it as "Pending".</p>
                       </div>

                       <div className="relative pl-8 border-l-2 border-zinc-100 pb-4">
                          <div className="absolute top-0 -left-[9px] w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                             <Camera className="w-2 h-2 text-white" />
                          </div>
                          <p className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-1">Step 3: Verification</p>
                          <p className="text-xs text-zinc-500">The Dispatcher uploads a photo of the packed box. The order is set to "Dispatched". Inventory drops to 48 units.</p>
                       </div>

                       <div className="relative pl-8 border-l-0 pb-4">
                          <div className="absolute top-0 -left-[9px] w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                             <CheckCircle2 className="w-2 h-2 text-white" />
                          </div>
                          <p className="text-xs font-black uppercase tracking-widest text-blue-600 mb-1">Step 4: Financial Update</p>
                          <p className="text-xs text-zinc-500">The Dashboard trajectory ticks upward. The sale is auto-logged as revenue in the Finance module.</p>
                       </div>
                    </div>
                 </motion.div>
               )}
            </div>

            <div className="mt-8 flex items-center justify-between pt-6 border-t border-zinc-100">
               <div className="flex gap-1">
                  {TUTORIAL_PAGES.map((_, i) => (
                    <div key={i} className={`h-1 rounded-full transition-all ${i === currentPage ? 'w-6 bg-zinc-900' : 'w-2 bg-zinc-200'}`} />
                  ))}
               </div>
               
               <div className="flex gap-2">
                  <Button variant="ghost" onClick={prevPage} disabled={currentPage === 0} className="text-[10px] font-black uppercase"><ChevronLeft className="w-4 h-4 mr-1" /> Prev</Button>
                  {currentPage === TUTORIAL_PAGES.length - 1 ? (
                    <Button onClick={() => onOpenChange(false)} className="bg-zinc-900 text-white text-[10px] font-black uppercase px-6">Finish Setup</Button>
                  ) : (
                    <Button onClick={nextPage} className="bg-zinc-900 text-white text-[10px] font-black uppercase px-6">Next Module <ChevronRight className="w-4 h-4 ml-1" /></Button>
                  )}
               </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
