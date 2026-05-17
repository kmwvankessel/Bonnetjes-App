// ══════════════════════════════════════════════════════════════════════════════
// firebase.js — gedeelde config, auth en Firestore helpers
// ══════════════════════════════════════════════════════════════════════════════
export const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAr68zl8HU66MsKlwthA4aizLKKQqabnTs",
  authDomain:        "bonnetjes-app-b9f86.firebaseapp.com",
  projectId:         "bonnetjes-app-b9f86",
  storageBucket:     "bonnetjes-app-b9f86.firebasestorage.app",
  messagingSenderId: "877308791701",
  appId:             "1:877308791701:web:9100e082317baca7d2049c"
};

// ── Armin's e-mailadres (super admin) ⚠ AANPASSEN
export const SUPER_ADMIN_EMAIL = "kmwvankessel@gmail.com";

// ── Google OAuth scopes voor Drive + Sheets
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive"
].join(" ");

// ── Standaard project-types (Armin kan dit uitbreiden via admin)
export const DEFAULT_PROJECT_TYPES = [
  { id: "klussen",    label: "Klussen",     emoji: "🔨", color: "#8B5E2A", active: true },
  { id: "boodschappen",label:"Boodschappen",emoji: "🛒", color: "#2A6A3A", active: true },
  { id: "cadeaus",    label: "Cadeaus",     emoji: "🎁", color: "#8B2A6A", active: true },
  { id: "borrels",    label: "Borrels",     emoji: "🍻", color: "#6A5A2A", active: true },
  { id: "vakantie",   label: "Vakantie",    emoji: "✈️",  color: "#2A5A8B", active: true },
  { id: "overig",     label: "Overig",      emoji: "📦", color: "#5A5A5A", active: true },
];

// ── Standaard bonnetje-categorieën per project-type
export const CATEGORIES_BY_TYPE = {
  klussen: [
    { id:"materiaal",   label:"Materiaal",       emoji:"🪵", color:"#8B5E2A" },
    { id:"gereedschap", label:"Gereedschap",      emoji:"🔧", color:"#2A6A8B" },
    { id:"verf",        label:"Verf & Afwerking", emoji:"🎨", color:"#6A2A8B" },
    { id:"elektra",     label:"Elektra",          emoji:"⚡", color:"#8B7A00" },
    { id:"sanitair",    label:"Sanitair",         emoji:"🚿", color:"#1A7A6A" },
    { id:"overig",      label:"Overig",           emoji:"📦", color:"#5A5A5A" },
  ],
  boodschappen: [
    { id:"groente",  label:"Groente & Fruit", emoji:"🥦", color:"#2A8B3A" },
    { id:"vlees",    label:"Vlees & Vis",     emoji:"🥩", color:"#8B3A2A" },
    { id:"zuivel",   label:"Zuivel",          emoji:"🥛", color:"#6A8B5A" },
    { id:"droog",    label:"Droog",           emoji:"🌾", color:"#8B7A2A" },
    { id:"drank",    label:"Drank",           emoji:"🍷", color:"#6A2A5A" },
    { id:"overig",   label:"Overig",          emoji:"📦", color:"#5A5A5A" },
  ],
  cadeaus: [
    { id:"verjaardag", label:"Verjaardag",  emoji:"🎂", color:"#8B2A6A" },
    { id:"kerst",      label:"Kerst",       emoji:"🎄", color:"#2A8B3A" },
    { id:"overig",     label:"Overig",      emoji:"🎁", color:"#5A5A5A" },
  ],
  borrels: [
    { id:"drank",    label:"Drank",    emoji:"🍻", color:"#6A5A2A" },
    { id:"hapjes",   label:"Hapjes",   emoji:"🧆", color:"#8B5A2A" },
    { id:"locatie",  label:"Locatie",  emoji:"📍", color:"#2A5A8B" },
    { id:"overig",   label:"Overig",   emoji:"📦", color:"#5A5A5A" },
  ],
  vakantie: [
    { id:"vervoer",    label:"Vervoer",    emoji:"✈️",  color:"#2A5A8B" },
    { id:"verblijf",   label:"Verblijf",   emoji:"🏨", color:"#8B6A2A" },
    { id:"eten",       label:"Eten",       emoji:"🍽️",  color:"#2A8B5A" },
    { id:"activiteit", label:"Activiteit", emoji:"🎭", color:"#6A2A8B" },
    { id:"overig",     label:"Overig",     emoji:"📦", color:"#5A5A5A" },
  ],
  overig: [
    { id:"overig", label:"Overig", emoji:"📦", color:"#5A5A5A" },
  ],
};

// ── Firebase SDK imports (via CDN — geen bundler nodig)
import { initializeApp }                    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider,
         signInWithPopup, signOut,
         onAuthStateChanged }               from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc,
         setDoc, updateDoc, deleteDoc,
         collection, query, where,
         getDocs, addDoc, onSnapshot,
         orderBy, serverTimestamp,
         arrayUnion, arrayRemove }          from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Init
const app  = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db   = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope(GOOGLE_SCOPES);

export { auth, db, googleProvider };

// ══════════════════════════════════════════════════════════════════════════════
// AUTH HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/** Log in via Google popup, maak user-doc aan als nieuw */
export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const user   = result.user;
  const token  = result._tokenResponse?.oauthAccessToken || null;

  // Sla Google OAuth token op in sessionStorage voor Drive/Sheets calls
  if (token) sessionStorage.setItem('google_token', token);

  await ensureUserDoc(user);
  return user;
}

export async function logout() {
  sessionStorage.removeItem('google_token');
  await signOut(auth);
}

export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getGoogleToken() {
  return sessionStorage.getItem('google_token');
}

// ══════════════════════════════════════════════════════════════════════════════
// USER HELPERS
// ══════════════════════════════════════════════════════════════════════════════

export async function ensureUserDoc(user) {
  const ref  = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;

  if (!snap.exists()) {
    await setDoc(ref, {
      uid:       user.uid,
      email:     user.email,
      name:      user.displayName || user.email,
      photo:     user.photoURL    || null,
      role:      isSuperAdmin ? 'super_admin' : 'owner',
      blocked:   false,
      createdAt: serverTimestamp(),
    });
  } else if (isSuperAdmin && snap.data().role !== 'super_admin') {
    await updateDoc(ref, { role: 'super_admin' });
  }
}

export async function getUser(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export async function getCurrentUserDoc() {
  const user = auth.currentUser;
  if (!user) return null;
  return getUser(user.uid);
}

export async function blockUser(uid, blocked) {
  await updateDoc(doc(db, 'users', uid), { blocked });
}

// ══════════════════════════════════════════════════════════════════════════════
// PROJECT HELPERS
// ══════════════════════════════════════════════════════════════════════════════

export async function createProject({ name, type, members, sheetId, folderId }) {
  const user = auth.currentUser;
  const ref  = await addDoc(collection(db, 'projects'), {
    name,
    type,
    ownerUid:   user.uid,
    ownerEmail: user.email,
    members:    members, // array van { email, name, uid (na acceptatie) }
    sheetId:    sheetId  || '',
    folderId:   folderId || '',
    createdAt:  serverTimestamp(),
    archived:   false,
  });

  // Stuur notificatie naar Armin
  await addDoc(collection(db, 'notifications'), {
    type:      'new_project',
    projectId: ref.id,
    projectName: name,
    ownerEmail: user.email,
    ownerName:  user.displayName || user.email,
    createdAt:  serverTimestamp(),
    read:       false,
  });

  return ref.id;
}

export async function getProject(pid) {
  const snap = await getDoc(doc(db, 'projects', pid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateProject(pid, data) {
  await updateDoc(doc(db, 'projects', pid), data);
}

export async function deleteProject(pid) {
  await updateDoc(doc(db, 'projects', pid), { archived: true });
}

/** Alle projecten die de huidige user mag zien */
export async function getMyProjects() {
  const user    = auth.currentUser;
  const userDoc = await getCurrentUserDoc();
  if (!userDoc) return [];

  if (userDoc.role === 'super_admin') {
    const snap = await getDocs(query(
      collection(db, 'projects'),
      where('archived', '==', false),
      orderBy('createdAt', 'desc')
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // Owner: eigen projecten
  const ownSnap = await getDocs(query(
    collection(db, 'projects'),
    where('ownerUid',  '==', user.uid),
    where('archived',  '==', false)
  ));

  // Member: projecten waar email in members staat
  const memSnap = await getDocs(query(
    collection(db, 'projects'),
    where('members',  'array-contains', { email: user.email }),
    where('archived', '==', false)
  ));

  const all = new Map();
  [...ownSnap.docs, ...memSnap.docs].forEach(d => all.set(d.id, { id: d.id, ...d.data() }));
  return [...all.values()].sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
}

// ══════════════════════════════════════════════════════════════════════════════
// BONNETJES HELPERS
// ══════════════════════════════════════════════════════════════════════════════

export async function getBonnetjes(pid) {
  const snap = await getDocs(query(
    collection(db, 'projects', pid, 'bonnetjes'),
    orderBy('datum', 'desc')
  ));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function listenBonnetjes(pid, callback) {
  return onSnapshot(
    query(collection(db, 'projects', pid, 'bonnetjes'), orderBy('datum', 'desc')),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

export async function addBonnetje(pid, data) {
  const ref = await addDoc(collection(db, 'projects', pid, 'bonnetjes'), {
    ...data,
    createdBy: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateBonnetje(pid, bid, data) {
  await updateDoc(doc(db, 'projects', pid, 'bonnetjes', bid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBonnetje(pid, bid) {
  await deleteDoc(doc(db, 'projects', pid, 'bonnetjes', bid));
}

// ══════════════════════════════════════════════════════════════════════════════
// PROJECT TYPES (globaal, beheerd door Armin)
// ══════════════════════════════════════════════════════════════════════════════

export async function getProjectTypes() {
  const snap = await getDoc(doc(db, 'config', 'projectTypes'));
  return snap.exists() ? snap.data().types : DEFAULT_PROJECT_TYPES;
}

export async function saveProjectTypes(types) {
  await setDoc(doc(db, 'config', 'projectTypes'), { types });
}

// ══════════════════════════════════════════════════════════════════════════════
// GOOGLE DRIVE UPLOAD
// ══════════════════════════════════════════════════════════════════════════════

export async function uploadToDrive(base64, filename, folderId) {
  const token = getGoogleToken();
  if (!token) throw new Error("Niet ingelogd met Google");
  if (!folderId) throw new Error("Geen Drive map ingesteld");

  const b64   = base64.includes(",") ? base64.split(",")[1] : base64;
  const mime  = base64.startsWith("data:") ? base64.split(";")[0].split(":")[1] : "image/jpeg";
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const form  = new FormData();
  form.append("metadata", new Blob([JSON.stringify({ name: filename, parents: [folderId] })], { type: "application/json" }));
  form.append("file", new Blob([bytes], { type: mime }));

  const res  = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  const file = await res.json();
  if (!file.id) throw new Error("Drive upload mislukt: " + JSON.stringify(file));

  // Publiek leesbaar maken
  await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" })
  });

  return {
    id:  file.id,
    url: `https://drive.google.com/uc?id=${file.id}`,
    viewUrl: file.webViewLink
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// GOOGLE SHEETS SYNC
// ══════════════════════════════════════════════════════════════════════════════

const SHEET_HDR = ["ID","Winkel","Locatie","Categorieën","Persoon","Datum","Bedrag","Retour","Netto","Status","Garantie","Notitie","Foto URL","Product Foto URL","Aangemaakt door"];

export async function appendToSheet(sheetId, bonnetje, categories) {
  const token = getGoogleToken();
  if (!token || !sheetId) return;

  const cats = (bonnetje.splits||[]).map(s => {
    const c = (categories||[]).find(x => x.id === s.catId);
    return `${c?.label||s.catId} ${s.pct}%`;
  }).join("+");

  const netto = (parseFloat(bonnetje.bedrag)||0) - (parseFloat(bonnetje.retour)||0);
  const row   = [
    bonnetje.id, bonnetje.winkel, bonnetje.locatie||"", cats,
    bonnetje.persoon, bonnetje.datum, bonnetje.bedrag||0, bonnetje.retour||0,
    netto.toFixed(2), bonnetje.status, bonnetje.garantie||"",
    bonnetje.notitie||"", bonnetje.fotoUrl||"", bonnetje.productFotoUrl||"",
    auth.currentUser?.email||""
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Bonnetjes!A:O:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [row] })
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS (voor Armin)
// ══════════════════════════════════════════════════════════════════════════════

export function listenNotifications(callback) {
  return onSnapshot(
    query(collection(db, 'notifications'), where('read','==',false), orderBy('createdAt','desc')),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

export async function markNotificationRead(nid) {
  await updateDoc(doc(db, 'notifications', nid), { read: true });
}

// ══════════════════════════════════════════════════════════════════════════════
// CSV EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export function exportCSV(bonnetjes, categories, projectName) {
  const rows = bonnetjes.map(b => {
    const cats = (b.splits||[]).map(s => {
      const c = (categories||[]).find(x => x.id === s.catId);
      return `${c?.label||s.catId} ${s.pct}%`;
    }).join("+");
    const netto = (parseFloat(b.bedrag)||0) - (parseFloat(b.retour)||0);
    return [b.winkel, b.locatie||"", cats, b.persoon, b.datum, b.bedrag||0,
            b.retour||0, netto.toFixed(2), b.status, b.garantie||"",
            b.notitie||"", b.fotoUrl||"", b.productFotoUrl||""];
  });

  const csv = [SHEET_HDR.slice(0,-1), ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(","))
    .join("\n");

  const a   = document.createElement("a");
  a.href    = URL.createObjectURL(new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8" }));
  a.download = `${(projectName||'project').replace(/[^a-zA-Z0-9]/g,'_')}_bonnetjes.csv`;
  a.click();
}
