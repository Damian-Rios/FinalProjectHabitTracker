import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging.js";

const firebaseConfig = {
    apiKey: "AIzaSyClMhadRcgH-IGmhwcZxCPghxjOVb5OLGY",
    authDomain: "habittracker-45e1d.firebaseapp.com",
    projectId: "habittracker-45e1d",
    storageBucket: "habittracker-45e1d.firebasestorage.app",
    messagingSenderId: "154351030805",
    appId: "1:154351030805:web:2413a81fe953f48844341c",
    measurementId: "G-WYRJ14THMK",
    vapidKey: "BPG6p5LElXTbQ8p5hFEKhKdYoq5pgFzdJcggAJe7RpLYaPlxAnt-WRobfargF2YJc4h-k99wGmLE_OuPb-7UVFc",
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const messaging = getMessaging(app);

export { db, auth, messaging, getToken, onMessage };