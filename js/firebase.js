// firebase.js — نظام الاتصال السريع بالـ SDK المحدثة
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// استبدل الكائن أدناه بكود الفايربيز (Firebase Config) الخاص بك عند توفره
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export {
  auth, db, provider,
  signOut, onAuthStateChanged,
  collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, where
};
