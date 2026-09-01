import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";


import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
    increment,
    runTransaction,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


/* =========================================================
   FIREBASE CONFIG
========================================================= */

const firebaseConfig = {

    apiKey:
        "AIzaSyBIeu5hZIJ0KO93RHjkqPUTJXPk5fN5tdU",

    authDomain:
        "payza-31514.firebaseapp.com",

    projectId:
        "payza-31514",

    storageBucket:
        "payza-31514.firebasestorage.app",

    messagingSenderId:
        "976242724173",

    appId:
        "1:976242724173:web:b5d496137a57dbe4f53b04",

    measurementId:
        "G-ZE6FF1741Z"

};


/* =========================================================
   INITIALIZE FIREBASE
========================================================= */

const app =
    initializeApp(firebaseConfig);


/* =========================================================
   FIRESTORE
========================================================= */

const db =
    getFirestore(app);


/* =========================================================
   EXPORT
========================================================= */

export {

    db,

    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,

    collection,
    query,
    where,
    getDocs,

    increment,
    runTransaction,

    onSnapshot,
    serverTimestamp

};