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
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please provide an email address.');
      return;
    }

    if (!isResetMode && !password) {
      setError('Please provide a password.');
      return;
    }

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
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setIsResetMode(false);
    setPassword('');
    setError('');
  };

  const toggleReset = () => {
    setIsResetMode(!isResetMode);
    setIsSignUp(false);
    setError('');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <Card className="w-full max-w-md relative z-10 shadow-2xl overflow-hidden border-border">
        <div className="h-1 bg-border w-full overflow-hidden">
          {isLoading && <div className="h-full bg-primary w-1/3 animate-[loading_1s_infinite_linear]" />}
        </div>
        
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="Logo" className="h-16 w-auto object-contain drop-shadow-md" />
          </div>
          <CardTitle className="text-2xl font-black uppercase tracking-tighter">
            {isResetMode ? 'Recover Identity' : isSignUp ? 'Node Registration' : 'System Access'}
          </CardTitle>
          {isResetMode && (
            <CardDescription className="text-muted-foreground font-medium text-xs">
              Initiate credential reset protocol via communication node.
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@corp.activepro" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background border-input pl-10 h-11 text-sm rounded-xl focus-visible:ring-ring focus-visible:border-ring transition-all font-medium"
                />
              </div>
            </div>

            {!isResetMode && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Password</Label>
                  {!isSignUp && (
                    <button 
                      type="button"
                      onClick={toggleReset}
                      className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background border-input pl-10 pr-10 h-11 text-sm rounded-xl focus-visible:ring-ring focus-visible:border-ring transition-all font-mono"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="text-red-500 text-xs font-black uppercase tracking-widest text-center animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gold hover:bg-gold-alt text-navy h-12 text-xs font-black uppercase tracking-[0.1em] rounded-xl shadow-xl group"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {isResetMode ? 'Send Reset Link' : isSignUp ? 'Provision Node' : 'Login'}
                  <LogIn className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          {!isResetMode && (
            <>
              <div className="relative flex items-center py-2">
                <Separator className="flex-grow" />
                <span className="flex-shrink-0 px-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">OR</span>
                <Separator className="flex-grow" />
              </div>

              <Button 
                onClick={signIn}
                variant="outline"
                className="w-full h-12 text-xs font-black uppercase tracking-[0.1em] rounded-xl"
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
                  Sign in with Google
                </div>
              </Button>
            </>
          )}

          {isResetMode && (
            <Button 
              variant="ghost" 
              onClick={toggleReset}
              className="w-full text-muted-foreground hover:text-foreground text-[10px] font-black uppercase tracking-widest"
            >
              <ArrowLeft className="w-3 h-3 mr-2" /> Back to Authentication
            </Button>
          )}
        </CardContent>

        <CardFooter className="bg-muted/30 border-t border-border p-4 justify-center">
          {!isResetMode && (
            <button 
              onClick={toggleMode}
              className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              {isSignUp ? (
                <><LogIn className="w-3 h-3" /> Existing user? Log In</>
              ) : (
                <><UserPlus className="w-3 h-3" /> New personnel? Register Node</>
              )}
            </button>
          )}
          {isResetMode && (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
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

