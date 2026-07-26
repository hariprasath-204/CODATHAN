import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// PG
const firebaseConfigPG = {
  apiKey: "AIzaSyB8CA75BQil9FGwqdmlBSci5bIU40FNuEQ",
  authDomain: "code-pg.firebaseapp.com",
  projectId: "code-pg",
  storageBucket: "code-pg.firebasestorage.app",
  messagingSenderId: "808012887402",
  appId: "1:808012887402:web:6030d1a286d75ea73f2113",
  measurementId: "G-SNL74165JG"
};
const appPG = initializeApp(firebaseConfigPG, "PG");
export const dbPG = getFirestore(appPG);

// UG
const firebaseConfigUG = {
  apiKey: "AIzaSyBIC561MjgcQMsu2G0rPhhrQeWpRwCH6BA",
  authDomain: "code-ug.firebaseapp.com",
  projectId: "code-ug",
  storageBucket: "code-ug.firebasestorage.app",
  messagingSenderId: "1099253055920",
  appId: "1:1099253055920:web:50088031581efaacdcd675",
  measurementId: "G-E5YVTBBFGV"
};
const appUG = initializeApp(firebaseConfigUG, "UG");
export const dbUG = getFirestore(appUG);
