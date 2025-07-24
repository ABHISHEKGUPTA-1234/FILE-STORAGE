import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
const firebaseConfig = {
  apiKey: "AIzaSyAWxL1zzX6yw8Hnnmx-9MIjvUU1vlJWMB8",
  authDomain: "drive-986db.firebaseapp.com",
  projectId: "drive-986db",
  storageBucket: "drive-986db.firebasestorage.app",
  messagingSenderId: "674888608292",
  appId: "1:674888608292:web:33e3b0944fb6421db386b1",
  measurementId: "G-MQ3QQXWE73" 
};
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
export { storage };