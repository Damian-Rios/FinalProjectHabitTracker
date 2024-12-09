import { auth } from "./firebaseConfig.js";

import { 
    onAuthStateChanged,
    signOut,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { loadHabits, syncHabits } from "./ui.js";

export let currentUser = null;

document.addEventListener("DOMContentLoaded", ()=>{
    const logoutBtn = document.getElementById("logout-btn");

    // Check if the user is authenticated
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in.
            currentUser = user;
            console.log("User ID: ", user.uid);
            console.log("Email", user.email);

            if (logoutBtn) {
                logoutBtn.style.display = "block";
            }
            loadHabits();
            syncHabits();
        } else {
            // No user is signed in.
            console.log("No user is currently signed in");
            // If the user is not signed in, redirect to the auth page
            window.location.href = "/pages/auth.html";
        }
    });

    // Handle logout functionality
    if (logoutBtn){
        logoutBtn.addEventListener("click", async() => {
            try {
                await signOut(auth);
                M.toast({ html: "Logout successful!" })
                logoutBtn.style.display = "none";
                window.location.href = "/pages/auth.html";
            } catch (e) {
                M.toast({html: e.message})
            }
        });
    }
});
