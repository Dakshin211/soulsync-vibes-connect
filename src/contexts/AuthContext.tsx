import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import FavoriteArtistsSelection from '@/components/FavoriteArtistsSelection';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsFavoriteArtists, setNeedsFavoriteArtists] = useState(false);

  const signup = async (email: string, password: string, username: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'Users', userCredential.user.uid), {
      username,
      email,
      favoriteArtists: [],
      createdAt: new Date().toISOString(),
    });
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const userDoc = await getDoc(doc(db, 'Users', result.user.uid));
    if (!userDoc.exists()) {
      await setDoc(doc(db, 'Users', result.user.uid), {
        username: result.user.displayName || 'User',
        email: result.user.email,
        favoriteArtists: [],
        createdAt: new Date().toISOString(),
      });
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        const userDoc = await getDoc(doc(db, 'Users', user.uid));
        const userData = userDoc.data();
        
        if (!userData?.favoriteArtists || userData.favoriteArtists.length === 0) {
          setNeedsFavoriteArtists(true);
        } else {
          setNeedsFavoriteArtists(false);
        }
      }
      
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    login,
    signup,
    loginWithGoogle,
    logout,
  };

  if (needsFavoriteArtists && currentUser) {
    return (
      <AuthContext.Provider value={value}>
        <FavoriteArtistsSelection onComplete={() => setNeedsFavoriteArtists(false)} />
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
