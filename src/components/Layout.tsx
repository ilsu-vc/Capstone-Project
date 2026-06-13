import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Package,
  ShoppingCart,
  Truck,
  DollarSign,
  Settings,
  Menu,
  LogOut,
  ChevronRight,
  User as UserIcon,
  UserCog,
  Shield,
  HelpCircle,
  Sun,
  Moon,
  Tag,
  Activity,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from './ThemeProvider';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { motion, AnimatePresence } from 'motion/react';
import { TutorialOverlay } from './TutorialOverlay';

const navigation = [
  { name: 'Admin Panel', href: '/admin', icon: Shield, roles: ['admin'] },
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3, roles: ['admin', 'secretary'] },
  { name: 'Inventory', href: '/inventory', icon: Package, roles: ['admin', 'secretary', 'agent'] },
  { name: 'Order Entry', href: '/orders', icon: ShoppingCart, roles: ['admin', 'secretary', 'agent'] },
  { name: 'Transfers', href: '/transfers', icon: Truck, roles: ['admin', 'secretary'] },
  { name: 'Financials', href: '/finance', icon: DollarSign, roles: ['admin'] },
  { name: 'Logistics Optimizer', href: '/logistics', icon: Activity, roles: ['admin', 'secretary'] },
  { name: 'Pricelist', href: '/pricelist', icon: Tag, roles: ['admin', 'secretary', 'agent'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin', 'secretary', 'agent'] },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { profile, logout, updateRole } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const isDark = theme === 'dark';

  const filteredNavigation = navigation.filter(item =>
    item.roles.includes(profile?.role || 'agent')
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
            <img src="/logo.png" alt="Active Pro" className="w-full h-full object-contain" />
          </div>
          <span style={{ fontFamily: "'Anton', sans-serif" }} className="text-2xl tracking-tight text-sidebar-foreground leading-none italic">
            Active <span className="text-sidebar-primary">Pro</span>
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all group ${isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                }`}
            >
              <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-sidebar-primary-foreground' : ''}`} />
              <span className="flex-1">{item.name}</span>
              {isActive && (
                <motion.div
                  layoutId="active-pill"
                  className="w-1.5 h-1.5 rounded-full bg-sidebar-primary-foreground"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 mt-auto border-t border-sidebar-border">
        {/* User profile */}
        <Link
          to="/settings"
          className="flex items-center gap-3 px-3 py-3 mb-3 rounded-xl hover:bg-sidebar-accent transition-all group relative overflow-hidden"
        >
          <div className="w-9 h-9 bg-sidebar-foreground/10 rounded-xl flex-shrink-0 overflow-hidden border border-sidebar-border group-hover:border-sidebar-primary/60 transition-colors">
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt={profile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <UserIcon className="w-4 h-4 text-sidebar-foreground/50 m-2.5" />
            )}
          </div>
          <div className="flex flex-col min-w-0 pr-5">
            <span className="text-xs font-bold text-sidebar-foreground truncate tracking-tight">
              {profile?.displayName || 'User'}
            </span>
            <span className="text-[9px] text-sidebar-primary uppercase font-bold tracking-widest mt-0.5">
              {profile?.role} Node
            </span>
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <UserCog className="w-3.5 h-3.5 text-sidebar-foreground/60" />
          </div>
        </Link>

        {/* Dark mode toggle */}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="w-full flex items-center justify-between px-3 py-2.5 mb-3 rounded-lg bg-sidebar-foreground/6 hover:bg-sidebar-foreground/10 transition-all group"
          aria-label="Toggle dark mode"
        >
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${isDark ? 'bg-sidebar-primary/15' : 'bg-sidebar-primary/20'}`}>
              {isDark ? (
                <Moon className="w-3.5 h-3.5 text-sidebar-primary" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-sidebar-primary" />
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/60 group-hover:text-sidebar-foreground/80 transition-colors">
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </span>
          </div>
          {/* Toggle pill */}
          <div className={`relative w-9 h-5 rounded-full transition-colors ${isDark ? 'bg-sidebar-primary' : 'bg-sidebar-foreground/20'}`}>
            <motion.div
              animate={{ x: isDark ? 16 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-0.5 left-0 w-4 h-4 rounded-full bg-white shadow-sm"
            />
          </div>
        </button>

        {/* Dev role controls */}
        <div className="px-1 mb-3 space-y-1">
          <p className="text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/25 mb-2 px-1">Dev Controls</p>
          <div className="grid grid-cols-3 gap-1">
            {(['admin', 'secretary', 'agent'] as const).map((role, i) => (
              <button
                key={role}
                className={`h-7 text-[9px] font-bold rounded-md transition-all ${profile?.role === role
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'bg-sidebar-foreground/8 text-sidebar-foreground/50 hover:bg-sidebar-foreground/15 hover:text-sidebar-foreground'
                  }`}
                onClick={() => updateRole(role)}
              >
                {['ADM', 'SEC', 'AGT'][i]}
              </button>
            ))}
          </div>
        </div>

        <Separator className="mb-3 bg-sidebar-border" />

        <button
          className="w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-foreground/6 rounded-lg transition-all"
          onClick={() => setIsTutorialOpen(true)}
        >
          <HelpCircle className="w-4 h-4" />
          System Guide
        </button>

        <button
          className="w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all mt-0.5"
          onClick={logout}
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <TutorialOverlay open={isTutorialOpen} onOpenChange={setIsTutorialOpen} />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 fixed inset-y-0 z-50 shadow-xl shadow-black/10">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-background/90 backdrop-blur-md border-b border-border lg:px-8">
          {/* Mobile menu */}
          <div className="lg:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger className="inline-flex shrink-0 items-center justify-center rounded-lg h-9 w-9 bg-sidebar text-sidebar-foreground hover:bg-sidebar/90 transition-all">
                <Menu className="w-4 h-4" />
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 border-0">
                <SidebarContent />
              </SheetContent>
            </Sheet>
          </div>

          {/* Page title */}
          <div className="flex flex-col">
          </div>

          {/* Header right: dark mode toggle for quick access + status */}
          <div className="flex items-center gap-3">
            {/* Status badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1A2332] dark:bg-[#fdd001]/10 border border-[#1A2332]/10 dark:border-[#fdd001]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-white dark:text-[#fdd001]/80">Live</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
