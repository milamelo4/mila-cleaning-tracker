import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA9SjxU-DPLLcfE6f4aNsan3adg0HD2uPo",
  authDomain: "mila-cleaning-tracker.firebaseapp.com",
  projectId: "mila-cleaning-tracker",
  storageBucket: "mila-cleaning-tracker.firebasestorage.app",
  messagingSenderId: "349297760733",
  appId: "1:349297760733:web:4db61a0b63d388ee717e34"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});