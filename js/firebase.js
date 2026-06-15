// firebase.js — نظام الاتصال السريع بالـ SDK المحدثة
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// استبدل الكائن أدناه بكود الفايربيز (Firebase Config) الخاص بك عند توفره
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB9Z5Tjc0yWg69GlWdUBTZ9VgUcGrh5mMU",
  authDomain: "v-scans.firebaseapp.com",
  projectId: "v-scans",
  storageBucket: "v-scans.firebasestorage.app",
  messagingSenderId: "545198752043",
  appId: "1:545198752043:web:efdc1656b5fd4f354ec56e",
  measurementId: "G-NDQER8NPM9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
