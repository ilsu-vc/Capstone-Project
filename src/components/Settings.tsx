import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Database, 
  Users, 
  Cpu, 
  ToggleLeft, 
  ToggleRight, 
  CheckCircle2,
  Edit2,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function Settings() {
  const { profile, updateProfileData } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [debugLogs, setDebugLogs] = useState(true);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const isAdmin = profile?.role === 'admin';

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const photoUrl = formData.get('photoUrl') as string;

    await updateProfileData({
      firstName,
      lastName,
      photoUrl
    });
    setIsEditProfileOpen(false);
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-foreground uppercase">System Settings</h2>
          <p className="text-muted-foreground font-medium">Manage your personal preferences and baseline configurations.</p>
        </div>
        {isAdmin && (
          <div className="bg-foreground text-background px-4 py-2 rounded-xl flex items-center gap-3 self-start md:self-center">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Elevated Privileges Active</span>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border overflow-hidden group hover:border-primary/40 transition-colors">
          <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-foreground" />
                <CardTitle className="text-xs font-black uppercase tracking-widest">Account Profile</CardTitle>
              </div>
              <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
                <DialogTrigger render={
                  <Button variant="ghost" size="sm" className="h-8 gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-foreground hover:text-background transition-all">
                    <Edit2 className="w-3 h-3" /> Edit Profile
                  </Button>
                } />
                <DialogContent className="rounded-[2.5rem] p-8">
                  <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Edit Identity</DialogTitle>
                    <DialogDescription className="text-muted-foreground font-medium">Update your system identification and avatar node.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUpdateProfile} className="space-y-6 font-sans">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">First Name</Label>
                        <Input id="firstName" name="firstName" defaultValue={profile?.firstName} required className="rounded-xl border-2 border-border h-12 focus:border-primary transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Last Name</Label>
                        <Input id="lastName" name="lastName" defaultValue={profile?.lastName} required className="rounded-xl border-2 border-border h-12 focus:border-primary transition-all font-bold" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="photoUrl" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Avatar URL</Label>
                      <div className="relative">
                        <Input id="photoUrl" name="photoUrl" defaultValue={profile?.photoUrl} placeholder="https://..." className="rounded-xl border-2 border-border h-12 pl-10 focus:border-primary transition-all font-medium" />
                        <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="text-[9px] text-muted-foreground font-medium italic">Direct link to a JPEG/PNG node for regional display.</p>
                    </div>
                    <DialogFooter className="pt-4">
                      <Button type="submit" className="w-full h-14 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs rounded-2xl group">
                        Propagate Changes <CheckCircle className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform" />
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <CardDescription className="text-xs font-medium">System identification and access metadata.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-muted border-2 border-border overflow-hidden flex-shrink-0">
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt={profile.displayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center font-black text-xl text-muted-foreground">
                    {profile?.displayName?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Authenticated Identity</p>
                  <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest border-border py-0 h-4">{profile?.role}</Badge>
                </div>
                <p className="text-xl font-black text-foreground truncate tracking-tight leading-none">{profile?.displayName || 'N/A'}</p>
                <p className="text-xs font-medium text-muted-foreground mt-1">{profile?.email || 'N/A'}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/40 p-3 rounded-xl border border-border">
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">First Name</p>
                <p className="text-xs font-bold text-foreground">{profile?.firstName || '—'}</p>
              </div>
              <div className="bg-muted/40 p-3 rounded-xl border border-border">
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Last Name</p>
                <p className="text-xs font-bold text-foreground">{profile?.lastName || '—'}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-dashed border-border italic text-[10px] text-muted-foreground font-medium flex items-center justify-between">
              <span>Metadata synced via regional cluster.</span>
              <div className="flex items-center gap-1.5 text-emerald-500 font-bold">
                <CheckCircle2 className="w-3 h-3" /> Encrypted
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border opacity-60 grayscale-[0.3]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Notifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/40 p-4 rounded-xl border border-border">
               <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Notice</p>
               <p className="text-xs text-muted-foreground font-medium leading-relaxed">Alert thresholds are currently controlled at the organizational level to maintain system-wide sync stability.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Exclusive Sections */}
      {isAdmin && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="flex items-center gap-4">
            <Separator className="flex-1 bg-border" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground bg-background px-4">Administrative Engine</h3>
            <Separator className="flex-1 bg-border" />
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             <Card className="border-emerald-500/20 col-span-1 md:col-span-2 lg:col-span-1">
                <CardHeader className="border-b border-emerald-500/10 bg-emerald-500/5">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-[#1A2332] rounded-lg">
                       <Users className="w-4 h-4 text-white" />
                    </div>
                    <CardTitle className="text-xs font-black uppercase tracking-widest">Role Authority</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                   <p className="text-xs text-muted-foreground font-medium mb-4">Modify permissions for agents on this regional node.</p>
                   
                   <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border group hover:border-primary transition-all cursor-pointer">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-black text-[10px] text-primary">JD</div>
                            <div>
                               <p className="text-[10px] font-black uppercase tracking-tight text-foreground">John Doe</p>
                               <p className="text-[8px] text-muted-foreground font-bold uppercase">Active Agent</p>
                            </div>
                         </div>
                         <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase h-8 hover:bg-foreground hover:text-background">Promote</Button>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border opacity-50">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-black text-[10px] text-muted-foreground">SA</div>
                            <div>
                               <p className="text-[10px] font-black uppercase tracking-tight text-foreground">System Auditor</p>
                               <p className="text-[8px] text-muted-foreground font-bold uppercase">External Partner</p>
                            </div>
                         </div>
                         <Badge variant="secondary" className="text-[8px] font-black uppercase">Read Only</Badge>
                      </div>
                   </div>
                </CardContent>
             </Card>

             <Card className="border-primary/30 col-span-1 md:col-span-2">
                <CardHeader className="dark:bg-[#1A2332] bg-muted/30 dark:text-white text-foreground border-b border-border dark:border-none rounded-t-xl">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 dark:bg-white/10 bg-primary/10 rounded-lg">
                           <Cpu className="w-4 h-4 dark:text-white text-primary" />
                        </div>
                        <CardTitle className="text-xs font-black uppercase tracking-widest dark:text-white text-foreground">Global Configuration</CardTitle>
                      </div>
                      <Badge className="bg-emerald-500 text-[8px] uppercase tracking-tighter text-white">Healthy</Badge>
                   </div>
                </CardHeader>
                <CardContent className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <div className="flex items-center justify-between group">
                         <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Maintenance Protocol</p>
                            <p className="text-[10px] text-muted-foreground font-medium">Bypass all regional locks for core updates.</p>
                         </div>
                         <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setMaintenanceMode(!maintenanceMode)}
                          className={`w-12 h-12 ${maintenanceMode ? 'text-red-500' : 'text-muted-foreground'}`}
                        >
                           {maintenanceMode ? <ToggleRight className="w-12 h-12" /> : <ToggleLeft className="w-12 h-12" />}
                         </Button>
                      </div>

                      <div className="flex items-center justify-between group">
                         <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Telemetry Debugging</p>
                            <p className="text-[10px] text-muted-foreground font-medium">Capture millisecond-latency sync logs.</p>
                         </div>
                         <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setDebugLogs(!debugLogs)}
                          className={`w-12 h-12 ${debugLogs ? 'text-emerald-500' : 'text-muted-foreground'}`}
                        >
                           {debugLogs ? <ToggleRight className="w-12 h-12" /> : <ToggleLeft className="w-12 h-12" />}
                         </Button>
                      </div>
                   </div>

                   <div className="bg-muted/40 rounded-2xl p-6 border border-border flex flex-col justify-between">
                      <div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Core Integrity</p>
                         <div className="space-y-3">
                            <div className="flex items-center gap-2">
                               <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                               <span className="text-[10px] font-bold text-foreground">Database Sync: ACTIVE</span>
                            </div>
                            <div className="flex items-center gap-2">
                               <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                               <span className="text-[10px] font-bold text-foreground">CDN Propagation: 100%</span>
                            </div>
                         </div>
                      </div>
                      <Button className="w-full mt-6 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest h-10">
                        Force System Sync
                      </Button>
                   </div>
                </CardContent>
             </Card>
          </div>
        </motion.div>
      )}


    </div>
  );
}
