// firebase.js — Firebase Init & Auth
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// مفاتيح مشروعك V-SCANS الحقيقية
const firebaseConfig = {
  apiKey: "AIzaSyB9Z5Tjc0yWg69GlWdUBTZ9VgUcGrh5mMU",
  authDomain: "v-scans.firebaseapp.com",
  projectId: "v-scans",
  storageBucket: "v-scans.firebasestorage.app",
  messagingSenderId: "545198752043",
  appId: "1:545198752043:web:efdc1656b5fd4f354ec56e",
  measurementId: "G-NDQER8NPM9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// إعداد دقة اختيار الحساب دائماً لمنع التعليق
provider.setCustomParameters({ prompt: 'select_account' });

export {
  auth, db, provider,
  signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged,
  collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, where
};
