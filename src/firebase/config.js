// src/firebase/config.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCtZTym0c45zYK4cQreT5tE7mfdA6ctiJw",
  authDomain: "consultation-system-4e561.firebaseapp.com",
  projectId: "consultation-system-4e561",
  storageBucket: "consultation-system-4e561.firebasestorage.app",
  messagingSenderId: "649559918949",
  appId: "1:649559918949:web:db33f5da629e5f6618798c"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;