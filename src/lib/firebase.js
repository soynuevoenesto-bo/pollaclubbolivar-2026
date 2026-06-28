import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// ⚠️ REEMPLAZA ESTOS VALORES con los de tu proyecto Firebase
// Los encuentras en: Firebase Console → Configuración del proyecto → Tus apps → SDK de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB-_B61r0JDhLtxVPn6FM1tH7exEOjUtIw",
  authDomain: "polla-mundial-2026-efa05.firebaseapp.com",
  projectId: "polla-mundial-2026-efa05",
  storageBucket: "polla-mundial-2026-efa05.firebasestorage.app",
  messagingSenderId: "523804910647",
  appId: "1:523804910647:web:ea3bde33a3a464ba148bb2",
  measurementId: "G-JNENXVHQ8N"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
