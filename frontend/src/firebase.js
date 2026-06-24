import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, where } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Helper to load config from LocalStorage
const getStoredFirebaseConfig = () => {
  try {
    const saved = localStorage.getItem("firebase_config");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to parse saved Firebase config", e);
  }
  return null;
};

// Priority: Vite .env variables > LocalStorage config JSON
const getFirebaseConfig = () => {
  if (
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID
  ) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
    };
  }
  return getStoredFirebaseConfig();
};

let app = null;
let authInstance = null;
let firestoreInstance = null;
let storageInstance = null;
let isFirebaseEnabled = false;

const config = getFirebaseConfig();

if (config && config.apiKey && config.projectId) {
  try {
    console.log("Initializing Firebase app with Project ID:", config.projectId);
    if (getApps().length === 0) {
      app = initializeApp(config);
    } else {
      app = getApps()[0];
    }
    authInstance = getAuth(app);
    firestoreInstance = getFirestore(app);
    storageInstance = getStorage(app);
    isFirebaseEnabled = true;
    console.log("Firebase and Firestore initialized successfully! Firestore Enabled:", !!firestoreInstance);
  } catch (error) {
    console.error("Error initializing Firebase:", error);
  }
} else {
  console.warn("Firebase configuration is missing or incomplete. Unable to initialize cloud connection. Config parsed:", config);
}

// ── LocalStorage-first DB layer ──
// Compress an image file into a tiny JPEG thumbnail (safe for localStorage).
// Has full error handling + 3s timeout so it NEVER hangs.
const compressImage = (file, maxWidth = 120, maxHeight = 120, quality = 0.5) => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn("compressImage: timed out after 3s, returning empty");
      resolve("");
    }, 3000);

    try {
      const reader = new FileReader();
      reader.onerror = () => { clearTimeout(timeout); resolve(""); };
      reader.onload = (event) => {
        try {
          const img = new Image();
          img.onerror = () => { clearTimeout(timeout); resolve(""); };
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              let w = img.width, h = img.height;
              if (w > h) { if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; } }
              else { if (h > maxHeight) { w = Math.round((w * maxHeight) / h); h = maxHeight; } }
              canvas.width = w;
              canvas.height = h;
              canvas.getContext("2d").drawImage(img, 0, 0, w, h);
              clearTimeout(timeout);
              resolve(canvas.toDataURL("image/jpeg", quality));
            } catch (e) { clearTimeout(timeout); resolve(""); }
          };
          img.src = event.target.result;
        } catch (e) { clearTimeout(timeout); resolve(""); }
      };
      reader.readAsDataURL(file);
    } catch (e) { clearTimeout(timeout); resolve(""); }
  });
};

let lastError = null;

const sanitizeForFirestore = (obj) => {
  if (obj === undefined || obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item));
  }
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        sanitized[key] = sanitizeForFirestore(obj[key]);
      }
    }
    return sanitized;
  }
  return obj;
};

export const dbService = {
  isEnabled: () => isFirebaseEnabled,
  getLastError: () => lastError,
  clearLastError: () => { lastError = null; },
  getConfigDetails: () => {
    return {
      projectId: config?.projectId || "none",
      source: (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID) ? "env" : "local"
    };
  },

  // Create a tiny thumbnail from a File for localStorage (returns base64 string, never throws)
  createThumbnail: async (file) => {
    if (!file) return "";
    try {
      const thumb = await compressImage(file);
      return thumb || "";
    } catch (e) {
      return "";
    }
  },

  // Upload image to Firebase Storage (best-effort, returns URL or empty string)
  uploadImage: async (file) => {
    if (!file || !isFirebaseEnabled || !storageInstance) return "";
    try {
      const fileRef = ref(storageInstance, `scans/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl || "";
    } catch (err) {
      console.warn("Firebase Storage upload failed:", err);
      return "";
    }
  },

  saveScan: async (userId, scanData) => {
    const newScan = {
      ...scanData,
      timestamp: new Date().toISOString(),
      userId: userId || "anonymous",
      id: "local_" + Date.now()
    };

    // ── 1. ALWAYS save to LocalStorage first ──
    // Strip out large base64 imageUrl to prevent quota overflow.
    // The thumbnail was already created separately and stored in scanData.thumbnailUrl.
    const localScan = { ...newScan };
    // If imageUrl is a huge base64 (> 50KB), replace with thumbnail for localStorage
    if (localScan.imageUrl && localScan.imageUrl.length > 50000) {
      localScan.imageUrl = localScan.thumbnailUrl || "";
    }
    try {
      const localScans = JSON.parse(localStorage.getItem("crop_scans_history") || "[]");
      localScans.unshift(localScan);
      // Keep only last 50 scans to prevent quota overflow
      if (localScans.length > 50) localScans.length = 50;
      localStorage.setItem("crop_scans_history", JSON.stringify(localScans));
      console.log("✅ Scan saved to localStorage successfully. Total scans:", localScans.length);
    } catch (e) {
      console.error("❌ Failed to write LocalStorage:", e);
      // If quota exceeded, try clearing old scans and saving just this one
      try {
        localStorage.setItem("crop_scans_history", JSON.stringify([localScan]));
        console.log("✅ Saved after clearing old scans");
      } catch (e2) {
        console.error("❌ localStorage completely full:", e2);
      }
    }

    // ── 2. Try Firebase Firestore write (best-effort, non-blocking) ──
    if (isFirebaseEnabled && firestoreInstance && userId) {
      try {
        const sanitizedData = sanitizeForFirestore(scanData);
        // Remove huge base64 from Firestore doc too
        if (sanitizedData.imageUrl && sanitizedData.imageUrl.length > 50000) {
          sanitizedData.imageUrl = sanitizedData.thumbnailUrl || "";
        }
        delete sanitizedData.thumbnailUrl; // Don't store duplicate
        const docRef = await addDoc(collection(firestoreInstance, "scan"), {
          ...sanitizedData,
          timestamp: newScan.timestamp,
          userId: newScan.userId
        });
        console.log("✅ Scan saved to Firestore:", docRef.id);
        return { ...newScan, id: docRef.id };
      } catch (err) {
        console.error("Firebase Firestore write failed:", err);
        lastError = err;
      }
    }

    return newScan;
  },

  getScans: async (userId) => {
    // ── 1. ALWAYS read localStorage first (instant, never fails) ──
    let localScans = [];
    try {
      localScans = JSON.parse(localStorage.getItem("crop_scans_history") || "[]");
    } catch (e) {
      localScans = [];
    }

    // ── 2. Try Firestore with a 4-second timeout (best-effort merge) ──
    if (isFirebaseEnabled && firestoreInstance && userId) {
      try {
        const firestorePromise = (async () => {
          const q = query(
            collection(firestoreInstance, "scan"),
            where("userId", "==", userId)
          );
          const querySnapshot = await getDocs(q);
          const firebaseScans = [];
          querySnapshot.forEach((doc) => {
            firebaseScans.push({ id: doc.id, ...doc.data() });
          });
          return firebaseScans;
        })();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Firestore query timed out after 4s")), 4000)
        );

        const firebaseScans = await Promise.race([firestorePromise, timeoutPromise]);

        if (firebaseScans && firebaseScans.length > 0) {
          // Merge and sort in-memory by timestamp descending
          const merged = [...firebaseScans, ...localScans];
          merged.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          // De-duplicate by content (timestamp + disease + crop) since localStorage
          // and Firestore assign different IDs to the same scan
          const seen = new Set();
          return merged.filter(item => {
            const key = `${item.timestamp}_${item.diseaseName}_${item.crop}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        }
      } catch (err) {
        console.error("Firebase Firestore read failed/timed out, using localStorage:", err);
        lastError = err;
      }
    }

    // Sort localStorage scans by timestamp descending
    localScans.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return localScans;
  }
};

// Wrapper for Auth operations (falls back to Mock Auth)
export const authService = {
  isEnabled: () => isFirebaseEnabled,

  onAuthStateChange: (callback) => {
    if (isFirebaseEnabled && authInstance) {
      return onAuthStateChanged(authInstance, (user) => {
        if (user) {
          callback({ uid: user.uid, email: user.email, displayName: user.displayName || user.email.split("@")[0] });
        } else {
          callback(null);
        }
      });
    }

    // Local Storage Mock Session check
    const checkMockUser = () => {
      const mockSession = localStorage.getItem("mock_user_session");
      if (mockSession) {
        callback(JSON.parse(mockSession));
      } else {
        callback(null);
      }
    };
    checkMockUser();

    // Listen for mock login events
    window.addEventListener("mock-auth-change", checkMockUser);
    return () => window.removeEventListener("mock-auth-change", checkMockUser);
  },

  login: async (email, password) => {
    if (isFirebaseEnabled && authInstance) {
      const cred = await signInWithEmailAndPassword(authInstance, email, password);
      return { uid: cred.user.uid, email: cred.user.email };
    }

    // Mock Login
    const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      throw new Error("Invalid email or password");
    }
    const session = { uid: user.uid, email: user.email, displayName: user.email.split("@")[0] };
    localStorage.setItem("mock_user_session", JSON.stringify(session));
    window.dispatchEvent(new Event("mock-auth-change"));
    return session;
  },

  register: async (email, password) => {
    if (isFirebaseEnabled && authInstance) {
      const cred = await createUserWithEmailAndPassword(authInstance, email, password);
      return { uid: cred.user.uid, email: cred.user.email };
    }

    // Mock Register
    const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
    if (users.some(u => u.email === email)) {
      throw new Error("Email already registered");
    }
    const uid = "mock_uid_" + Math.random().toString(36).substr(2, 9);
    const newUser = { uid, email, password };
    users.push(newUser);
    localStorage.setItem("mock_users", JSON.stringify(users));

    const session = { uid, email, displayName: email.split("@")[0] };
    localStorage.setItem("mock_user_session", JSON.stringify(session));
    window.dispatchEvent(new Event("mock-auth-change"));
    return session;
  },

  logout: async () => {
    if (isFirebaseEnabled && authInstance) {
      await signOut(authInstance);
      return;
    }

    // Mock Logout
    localStorage.removeItem("mock_user_session");
    window.dispatchEvent(new Event("mock-auth-change"));
  },

  saveFirebaseConfig: (configJsonStr) => {
    try {
      const parsed = JSON.parse(configJsonStr);
      if (parsed.apiKey && parsed.projectId) {
        localStorage.setItem("firebase_config", JSON.stringify(parsed));
        // Force reload page to initialize Firebase on next load
        window.location.reload();
        return true;
      }
    } catch (e) {
      throw new Error("Invalid JSON configuration structure");
    }
    throw new Error("Missing apiKey or projectId in configuration");
  },

  clearFirebaseConfig: () => {
    localStorage.removeItem("firebase_config");
    window.location.reload();
  }
};
