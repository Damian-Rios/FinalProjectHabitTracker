import { currentUser } from "./auth.js";
import { db } from "./firebaseConfig.js";
import { 
    collection,
    doc,
    setDoc,
    addDoc,
    getDocs,
    deleteDoc,
    updateDoc,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Add a habit
export async function addHabitToFirebase(habit) {
    try {
        if(!currentUser){
            throw new Error("User is not authenticated");
        }
        const userId = currentUser.uid;
        console.log("userID: ", userId);
        const userRef = doc(db, "users", userId);
        await setDoc(
            userRef, 
            { 
                email: currentUser.email,
            }, 
            { merge: true }
        );
        const habitsRef = collection(userRef, "habits");
        const docRef = await addDoc(habitsRef, habit);
        return {id: docRef.id, ...habit};
    } catch(error) {
        console.error("error adding habit: ", error);
    }
}

// Get habits
export async function getHabitsFromFirebase() {
    const habits = [];
    try {
        if (!currentUser){
            throw new Error("User is not authenticated");
        }
        const userId = currentUser.uid;
        const habitRef = collection(doc(db, "users", userId), "habits");
        const querySnapshot = await getDocs(habitRef);
        querySnapshot.forEach((doc) => {
            habits.push({ id: doc.id, ...doc.data() });
        });
    } catch(error){
        console.error("error retrieving habits: ", error);
    }
    return habits;
}

// Delete habits
export async function deleteHabitFromFirebase(id){
    try {
        if (!currentUser){
            throw new Error("User is not authenticated");
        }
        const userId = currentUser.uid;
        await deleteDoc(doc(db, "users", userId, "habits", id));
    } catch (error) {
        console.error("error deleting habit: ", error);
    }
}
// Update Habits
export async function updateHabitInFirebase(id, updatedHabit) {
    try {
        if (!currentUser){
            throw new Error("User is not authenticated");
        }
        const userId = currentUser.uid;
        const habitRef = doc(db, "users", userId, "habits", id);
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