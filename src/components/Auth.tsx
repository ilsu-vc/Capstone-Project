import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Warehouse, LogIn, ArrowLeft, Mail, Lock, Eye, EyeOff, UserPlus, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export function Auth() {
  const { signIn, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isResetMode) {
        await resetPassword(email);
        setIsResetMode(false);
      } else if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setIsResetMode(false);
    setPassword('');
  };

  const toggleReset = () => {
    setIsResetMode(!isResetMode);
    setIsSignUp(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(24,24,27,1)_0%,rgba(9,9,11,1)_100%)]" />
      
      <Link to="/" className="absolute top-8 left-8 z-20">
        <Button variant="ghost" className="text-zinc-500 hover:text-white gap-2 text-xs font-black uppercase tracking-[0.2em]">
          <ArrowLeft className="w-4 h-4" /> Return to Home
        </Button>
      </Link>
      
      <Card className="w-full max-w-md relative z-10 bg-zinc-900 border-zinc-800 text-white shadow-2xl overflow-hidden">
        <div className="h-1 bg-zinc-800 w-full overflow-hidden">
          {isLoading && <div className="h-full bg-white w-1/3 animate-[loading_1s_infinite_linear]" />}
        </div>
        
        <CardHeader className="text-center space-y-1 pb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white rounded-xl shadow-lg ring-4 ring-zinc-800/50">
              <Warehouse className="w-10 h-10 text-black" />
            </div>
          </div>
          <CardTitle className="text-2xl font-black uppercase tracking-tighter">
            {isResetMode ? 'Recover Identity' : isSignUp ? 'Node Registration' : 'System Access'}
          </CardTitle>
          <CardDescription className="text-zinc-500 font-medium text-xs">
            {isResetMode 
              ? 'Initiate credential reset protocol via communication node.' 
              : 'ITIL 4 Service Configuration Management Platform'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Communication Node (Email)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-600" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@corp.activepro" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 pl-10 h-11 text-sm rounded-xl focus-visible:ring-zinc-700 focus-visible:border-zinc-700 transition-all font-medium"
                />
              </div>
            </div>

            {!isResetMode && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Security Key (Password)</Label>
                  {!isSignUp && (
                    <button 
                      type="button"
                      onClick={toggleReset}
                      className="text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-zinc-600" />
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 pl-10 pr-10 h-11 text-sm rounded-xl focus-visible:ring-zinc-700 focus-visible:border-zinc-700 transition-all font-mono"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-white text-black hover:bg-zinc-200 h-12 text-xs font-black uppercase tracking-[0.1em] rounded-xl shadow-xl shadow-white/5 group"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {isResetMode ? 'Send Reset Link' : isSignUp ? 'Provision Node' : 'Initialize Session'}
                  <LogIn className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          {!isResetMode && (
            <>
              <div className="relative flex items-center py-2">
                <Separator className="flex-grow bg-zinc-800" />
                <span className="flex-shrink-0 px-4 text-[9px] font-black uppercase tracking-widest text-zinc-600">OR</span>
                <Separator className="flex-grow bg-zinc-800" />
              </div>

              <Button 
                onClick={signIn}
                variant="outline"
                className="w-full bg-zinc-950 border-zinc-800 text-white hover:bg-zinc-800 h-12 text-xs font-black uppercase tracking-[0.1em] rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sync with Google Node
                </div>
              </Button>
            </>
          )}

          {isResetMode && (
            <Button 
              variant="ghost" 
              onClick={toggleReset}
              className="w-full text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest"
            >
              <ArrowLeft className="w-3 h-3 mr-2" /> Back to Authentication
            </Button>
          )}
        </CardContent>

        <CardFooter className="bg-zinc-950/50 border-t border-zinc-800 p-4 justify-center">
          {!isResetMode && (
            <button 
              onClick={toggleMode}
              className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors flex items-center gap-2"
            >
              {isSignUp ? (
                <><LogIn className="w-3 h-3" /> Existing user? Log In</>
              ) : (
                <><UserPlus className="w-3 h-3" /> New personnel? Register Node</>
              )}
            </button>
          )}
          {isResetMode && (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
              <HelpCircle className="w-3 h-3" /> Tier 1 Support Required?
            </div>
          )}
        </CardFooter>
      </Card>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}} />
    </div>
  );
}

