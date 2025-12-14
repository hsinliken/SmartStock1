import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { auth } from './firebase';

export const AuthService = {
  // 註冊
  register: async (email: string, password: string): Promise<User> => {
    if (!auth) throw new Error("Firebase Auth not initialized");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  // 登入
  login: async (email: string, password: string): Promise<User> => {
    if (!auth) throw new Error("Firebase Auth not initialized");
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  // 登出
  logout: async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  },

  // 監聽狀態改變
  subscribe: (callback: (user: User | null) => void) => {
    if (!auth) {
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(auth, callback);
  },

  // 錯誤訊息轉換
  getErrorMessage: (errorCode: string) => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Email 格式不正確';
      case 'auth/user-disabled':
        return '此帳號已被停用';
      case 'auth/user-not-found':
        return '找不到此帳號，請先註冊';
      case 'auth/wrong-password':
        return '密碼錯誤';
      case 'auth/email-already-in-use':
        return '此 Email 已被註冊';
      case 'auth/weak-password':
        return '密碼強度不足 (至少6位)';
      default:
        return '發生錯誤，請稍後再試 (' + errorCode + ')';
    }
  }
};