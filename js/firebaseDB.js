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
    console.log("Attempting to delete habit from firebase")
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