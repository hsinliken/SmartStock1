
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBioGgg40GBKx2ocG8ei77RUM7xP1BNs0A",
  authDomain: "smartstock-ee5b3.firebaseapp.com",
  projectId: "smartstock-ee5b3",
  storageBucket: "smartstock-ee5b3.firebasestorage.app",
  messagingSenderId: "73489114440",
  appId: "1:73489114440:web:254d0e9680a83eeafb7f7d",
  measurementId: "G-D474FDBV3C"
};

// 檢查是否已設定 Config
const isConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY_HERE";

let app: FirebaseApp | undefined;
let db: Firestore | undefined;

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("Firebase initialized successfully with project: " + firebaseConfig.projectId);
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
} else {
  console.warn("Firebase not configured. Using LocalStorage mode.");
}

export { db };
