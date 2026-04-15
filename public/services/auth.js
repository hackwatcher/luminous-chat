/**
 * Luminous Auth Service (Firebase v10)
 * Handles Google, Facebook, Phone, and Anonymous authentication.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { 
    getAuth, 
    signInAnonymously, 
    signInWithPopup, 
    GoogleAuthProvider, 
    FacebookAuthProvider,
    signInWithPhoneNumber,
    RecaptchaVerifier,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// --- CONFIGURATION ---
// Replace with your real config from Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyDFAdxWX0-Z6chvRmK2-j_0mRWbhfP4ItI",
    authDomain: "luminous-pro-2026.firebaseapp.com",
    projectId: "luminous-pro-2026",
    storageBucket: "luminous-pro-2026.firebasestorage.app",
    messagingSenderId: "5255171313",
    appId: "1:5255171313:web:b64fa00772ec25cb786d50"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/** 
 * Check if the config is still placeholder 
 */
function checkConfig() {
    if (firebaseConfig.apiKey === "YOUR_API_KEY") {
        console.warn("[Auth] Firebase placeholder config detected.");
        // We will throw an error to trigger the catch blocks in script.js
        // but we'll only alert for "Real" auth methods.
        return false;
    }
    return true;
}

/**
 * Google Login
 */
export async function loginWithGoogle() {
    if (!checkConfig()) {
        alert("Firebase yapılandırması eksik! Lütfen services/auth.js dosyasındaki firebaseConfig bilgilerini güncelleyin.");
        return;
    }
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error("[Auth] Google Error:", error);
        throw error;
    }
}

/**
 * Facebook Login
 */
export async function loginWithFacebook() {
    if (!checkConfig()) {
        alert("Firebase yapılandırması eksik!");
        return;
    }
    // Facebook requires manual App ID setup in Firebase Console
    alert("Facebook Girişi henüz yapılandırılmadı. Lütfen Firebase Console üzerinden Facebook App ID ve Secret ekleyin.");
    return;
    /* Future implementation:
    const provider = new FacebookAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        throw error;
    }
    */
}

/**
 * Anonymous Login (Guest)
 */
export async function loginAnonymously() {
    if (!checkConfig()) {
        // No alert here, script.js will handle the catch and log in as Guest locally
        throw new Error("CONFIG_MISSING");
    }
    try {
        const result = await signInAnonymously(auth);
        return result.user;
    } catch (error) {
        console.error("[Auth] Anon Error:", error);
        throw error;
    }
}

/**
 * Phone Login
 * @param {string} phoneNumber format: +905551234567
 */
export async function loginWithPhone(phoneNumber) {
    if (!checkConfig()) return;
    try {
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'invisible'
        });
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
        // We will need a way to pass the verification code later
        return confirmationResult;
    } catch (error) {
        console.error("[Auth] Phone Error:", error);
        throw error;
    }
}

/**
 * Register with Email/Password
 */
export async function registerWithEmail(email, password) {
    if (!checkConfig()) {
        alert("Firebase yapılandırması eksik! E-posta kaydı için gerçek Firebase bilgileriniz gerekiyor.");
        return;
    }
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        return result.user;
    } catch (error) {
        console.error("[Auth] Register Error:", error);
        throw error;
    }
}

/**
 * Login with Email/Password
 */
export async function loginWithEmail(email, password) {
    if (!checkConfig()) {
        alert("Firebase yapılandırması eksik! Giriş yapmak için gerçek Firebase bilgileriniz gerekiyor.");
        return;
    }
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
    } catch (error) {
        console.error("[Auth] Login Error:", error);
        throw error;
    }
}

/**
 * Global Auth State Listener
 */
export function watchAuthState(callback) {
    onAuthStateChanged(auth, (user) => {
        callback(user);
    });
}

/**
 * Logout
 */
export async function logout() {
    try {
        await signOut(auth);
        localStorage.removeItem('luminous_user');
    } catch (error) {
        console.error("[Auth] Logout Error:", error);
    }
}

/**
 * Save/Update User Profile in Firestore
 */
export async function saveUserProfile(uid, data) {
    try {
        await setDoc(doc(db, "users", uid), {
            ...data,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        return true;
    } catch (error) {
        console.error("[Firestore] Save Error:", error);
        throw error;
    }
}

/**
 * Get User Profile from Firestore
 */
export async function getUserProfile(uid) {
    try {
        const docSnap = await getDoc(doc(db, "users", uid));
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return null;
    } catch (error) {
        console.error("[Firestore] Get Error:", error);
        throw error;
    }
}
