import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAJhCQgGbGQfhHGCfeaOP0iXjStwNHobes",
  authDomain: "collegeevent-db8a5.firebaseapp.com",
  projectId: "collegeevent-db8a5",
  storageBucket: "collegeevent-db8a5.firebasestorage.app",
  messagingSenderId: "953620328823",
  appId: "1:953620328823:web:05388f47fa314c5ed8f172"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
