// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { 
    getFirestore,
    collection,
    doc,
    addDoc,
    getDocs,
    deleteDoc,
    updateDoc,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyClMhadRcgH-IGmhwcZxCPghxjOVb5OLGY",
    authDomain: "habittracker-45e1d.firebaseapp.com",
    projectId: "habittracker-45e1d",
    storageBucket: "habittracker-45e1d.firebasestorage.app",
    messagingSenderId: "154351030805",
    appId: "1:154351030805:web:2413a81fe953f48844341c",
    measurementId: "G-WYRJ14THMK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Add a habit
export async function addHabitToFirebase(habit) {
    try {
        const docRef = await addDoc(collection(db, "habits"), habit);
        return {id: docRef.id, ...habit};
    } catch(error) {
        console.error("error adding habit: ", error);
    }
}

// Get habits
export async function getHabitsFromFirebase() {
    const habits = [];
    try {
        const querySnapshot = await getDocs(collection(db, "habits"));
        querySnapshot.forEach((doc) => {
            habits.push({id: doc.id, ...doc.data()});
        });
    } catch(error){
        console.error("error retrieving habits: ", error);
    }
    return habits;
}

// Delete habits
export async function deleteHabitFromFirebase(id){
    try {
        await deleteDoc(doc(db, "habits", id));
    } catch (error) {
        console.error("error deleting habit: ", error);
    }
}
// Update Habits
export async function updateHabitInFirebase(id, updatedHabit) {
    try {
        const habitRef = doc(db, "habits", id);
        await updateDoc(habitRef, updatedHabit);
    } catch (error) {
        console.error("error updating habit: ", error);
    }
}


// Add a log
export async function addLogToFirebase(log) {
    try {
        const docRef = await addDoc(collection(db, "logs"), log);
        return {id: docRef.id, ...log};
    } catch(error) {
        console.error("error adding log: ", error);
    }
}

// Get logs
export async function getLogsFromFirebase() {
    const logs = [];
    try {
        const querySnapshot = await getDocs(collection(db, "logs"));
        querySnapshot.forEach((doc) => {
            logs.push({id: doc.id, ...doc.data()});
        });
    } catch(error){
        console.error("error retrieving logs: ", error);
    }
    return logs;
}

// Delete logs
export async function deleteLogFromFirebase(id){
    try {
        await deleteDoc(doc(db, "logs", id));
    } catch (error) {
        console.error("error deleting log: ", error);
    }
}

// Update Logs
export async function updateLogInFirebase(id, updatedLog) {
    try {
        const logRef = doc(db, "logs", id);
        await updateDoc(logRef, updatedLog);
    } catch (error) {
        console.error("error updating Log: ", error);
    }
}