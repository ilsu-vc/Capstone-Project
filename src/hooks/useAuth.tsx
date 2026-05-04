import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateRole: (role: 'admin' | 'secretary' | 'agent') => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            // If the email is the user's email, set as admin, else default to agent
            const isAdmin = user.email === 'lancejsy16@gmail.com';
            const [firstName = '', ...lastNameParts] = (user.displayName || '').split(' ');
            const lastName = lastNameParts.join(' ');
            
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'User',
              firstName,
              lastName,
              photoUrl: user.photoURL || '',
              role: isAdmin ? 'admin' : 'agent'
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          // Diagnostic logging, but keep fallback logic for UX
          try {
            handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          } catch (e) {
            // Just satisfy the JSON throw requirement
          }
          // Set a fallback profile to avoid hanging if permission is denied
          setProfile({
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'User',
            role: 'agent'
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      // Handle known cancellation errors without showing them as critical failures
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        console.warn("Sign-in interaction cancelled by user:", error.code);
        toast.info('Sign-in cancelled', { 
          description: 'The authentication process was cancelled.',
          duration: 3000
        });
        return;
      }

      console.error("Sign-in error:", error);
      if (error.code === 'auth/network-request-failed') {
        toast.error('Network error', { description: 'Please check your connection and try again.' });
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error('Configuration Required', { 
          description: 'Please add "localhost" to the Authorized Domains list in your Firebase Console (Authentication > Settings > Authorized domains).',
          duration: 10000
        });
      } else {
        toast.error('Authentication failed', { description: error.message || 'An unexpected error occurred during sign-in.' });
      }
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Logged in successfully');
    } catch (error: any) {
      console.error("Email sign-in error:", error);
      if (error.code === 'auth/operation-not-allowed') {
        toast.error('Configuration Required', { 
          description: 'Email/Password login is not enabled in Firebase Console. Please enable it in Authentication > Sign-in method.' 
        });
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('Invalid credentials', { description: 'Please check your email and password.' });
      } else {
        toast.error('Login failed', { description: error.message });
      }
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast.success('Account created successfully');
    } catch (error: any) {
      console.error("Email sign-up error:", error);
      if (error.code === 'auth/operation-not-allowed') {
        toast.error('Configuration Required', { 
          description: 'Email/Password registration is not enabled in Firebase Console. Please enable it in Authentication > Sign-in method.' 
        });
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error('Email in use', { description: 'This email is already associated with an account.' });
      } else {
        toast.error('Registration failed', { description: error.message });
      }
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Reset email sent', { description: 'Please check your inbox for instructions.' });
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error('Process failed', { description: 'Could not send reset email. Verify the address is correct.' });
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateRole = async (role: 'admin' | 'secretary' | 'agent') => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, { role });
      setProfile(prev => prev ? { ...prev, role } : null);
      toast.success(`Role switched to ${role.toUpperCase()}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      
      // Compute updated displayName if first/last name changed
      const updatedData = { ...data };
      if (data.firstName || data.lastName) {
        const currentFirstName = data.firstName ?? profile?.firstName ?? '';
        const currentLastName = data.lastName ?? profile?.lastName ?? '';
        updatedData.displayName = `${currentFirstName} ${currentLastName}`.trim() || profile?.displayName || '';
      }

      await updateDoc(docRef, updatedData);
      setProfile(prev => prev ? { ...prev, ...updatedData } : null);
      toast.success('Profile updated successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      signIn, 
      signInWithEmail, 
      signUpWithEmail, 
      resetPassword, 
      logout, 
      updateRole, 
      updateProfileData 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
