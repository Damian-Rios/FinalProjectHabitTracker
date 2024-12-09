import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@8/+esm';
import { 
    addHabitToFirebase,
    deleteHabitFromFirebase,
    getHabitsFromFirebase,
    updateHabitInFirebase,
} from "./firebaseDB.js";

import { messaging, getToken, } from './firebaseConfig.js';
import { onMessage } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging.js';
import { currentUser } from './auth.js';

// --- Constants ---
const STORAGE_THRESHOLD = 0.8;
let serviceWorkerRegistration = null;

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', function() {
    initializeMaterializeComponents();
    checkStorageUsage();
    requestPersistentStorage();

    // Add event listener for the Enable Notifications button
    const notificationButton = document.getElementById("enable-notifications-btn");

    // Register service worker
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker
            .register('/serviceworker.js')
            .then((registration) => {
                serviceWorkerRegistration = registration;
                console.log("Service Worker Registered!", registration);
            })
            .catch((err) => console.log("Service Worker Registration failed", err));
    }
});

// --- Functions ---
// Initialize Materialize components
function initializeMaterializeComponents() {
    M.Sidenav.init(document.querySelectorAll('.sidenav'));
    M.Dropdown.init(document.querySelectorAll('.dropdown-trigger'), {
        constrainWidth: false,
        coverTrigger: false,
    });
    M.Modal.init(document.querySelectorAll('.modal'));
    M.FormSelect.init(document.querySelectorAll('select'));
}

// --- Database Operations ---

// Initialize and create the database
let dbPromise;
async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB("habitTracker", 1, {
      upgrade(db) {
        const store = db.createObjectStore("habits", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("synced", "synced");
      },
    });
  }
  return dbPromise;
}

// Sync un-synced habits from IndexedDB to Firebase
export async function syncHabits() {
    const db = await getDB();
    const tx = db.transaction("habits", "readwrite");
    const store = tx.objectStore("habits");
    const habits = await store.getAll();
    await tx.done;
  
    for (const habit of habits) {
      if (!habit.synced && isOnline()) {
        try {
          const habitToSync = {
            title: habit.title,
            description: habit.description,
          };
          const savedHabit = await addHabitToFirebase(habitToSync);
          const txUpdate = db.transaction("habits", "readwrite");
          const storeUpdate = txUpdate.objectStore("habits");
          await storeUpdate.delete(habit.id);
          await storeUpdate.put({ ...habit, id: savedHabit.id, synced: true });
          await txUpdate.done;
        } catch (error) {
          console.error("Error syncing habit:", error);
        }
      }
    }
  }

// Check if the app is online
function isOnline() {
    return navigator.onLine;
}

// --- Habit Management Functions ---
// Add a new habit to either Firebase or IndexedDB
async function addHabit(habit) {
    const db = await getDB();
    let habitId;

    if(isOnline()) {
        try{
            const saveHabit = await addHabitToFirebase(habit);
            habitId = saveHabit.id;

            const tx = db.transaction("habits", "readwrite");
            const store = tx.objectStore("habits");

            await store.put({ ...habit, id: habitId, synced: true });
            await tx.done;
        } catch (error) {
            console.error("Error adding habit to Firebase: ", error);
        }
    } else {
        habitId = `temp-${Date.now()}`;

        const habitToStore = { ...habit, id: habitId, synced: false };

        // Start a transaction
        const tx = db.transaction("habits", "readwrite");
        const store = tx.objectStore("habits");

        // Add habit to store
        await store.add(habitToStore);

        // Complete transaction
        await tx.done;
    }

    // Update storage usage
    checkStorageUsage();

    // Return habit with ID
    return { ...habit, id: habitId };
}

// Edit habit with Transaction
async function editHabit(id, updatedData) {
    if (!id) {
        console.log("Invalid Id passed to editHabit");
        return;
    }

    const db = await getDB();

    if (isOnline()) {
        try {
            await updateHabitInFirebase(id, updatedData);
            //Update in IndexedDB as well
            const tx = db.transaction("habits", "readwrite");
            const store = tx.objectStore("habits");
            await store.put({...updatedData, id: id, synced: true });
            await tx.done;

            // Reload the entire habit list to reflect the updates
            loadHabits();
        } catch (error) {
            console.error("Error updating habit in Firebase: ", error);
        }
    } else {
        // If offline, make an IndexedDB transaction
        const tx = db.transaction("habits", "readwrite");
        const store = tx.objectStore("habits");
        await store.put({...updatedData, id: id, synced: false});
        await tx.done;
        loadHabits();
    }
}


// Delete a habit with Transaction
async function deleteHabit(id) {
    console.log("Attempting to delete habit...")
    if (!id) {
        console.error("Invalid Id passed to deleteHabit");
        return;
    }

    const db = await getDB();
    if (isOnline()) {
        try{
            console.log("asdfasdf");
            await deleteHabitFromFirebase(id);
        } catch (error) {
            console.error("Error deleting habit from Firebase: ", error);
        }
    } else {
        console.log("not online")
    }

    // Start a transaction
    const tx = db.transaction("habits", "readwrite");
    const store = tx.objectStore("habits");
    try {
        // Delete habit by id
        await store.delete(id);
    } catch (error) {
        console.error("Error deleting the habit from indexedDB: ", error);
    }

    // Complete transaction
    await tx.done;

    // Remove habit from UI
    const habitCard = document.querySelector(`[data-id="${id}"]`);
    if (habitCard) {
        habitCard.remove();
    }

    // Update storage usage
    checkStorageUsage();
}

// --- UI Functions ---

// Load Habits and sync with Firebase if online
export async function loadHabits() {
    const db = await getDB();
    const habitContainer = document.querySelector(".habits");
    habitContainer.innerHTML = ""; // Clear current habits

    if (isOnline()) {
        const firebaseHabits = await getHabitsFromFirebase();

        // Start a transaction (read-only)
        const tx = db.transaction("habits", "readwrite");
        const store = tx.objectStore("habits");

        for (const habit of firebaseHabits) {
            await store.put({ ...habit, synced: true });
            displayHabit(habit);
        }
        await tx.done;
    } else {
        // Start a transaction (read-only)
        const tx = db.transaction("habits", "readonly");
        const store = tx.objectStore("habits");

        // Get all habits
        const habits = await store.getAll();

        habits.forEach((habit) => {
            displayHabit(habit);
        });

        // Complete transaction
        await tx.done;
    }
}

// Display Habit using the existing HTML Structure
function displayHabit(habit) {
    const habitContainer = document.querySelector(".habits");

    // Check if the habit already exists in the UI and remove it
    const existingHabit = habitContainer.querySelector(`[data-id="${habit.id}"]`);
    if (existingHabit) {
        existingHabit.remove();
    }

    // Create new habit HTML and add it to the container
    const html = `
        <li class="collection-item" data-id="${habit.id}">
            <span>${habit.title}</span>
            <span class="secondary-content">
                <button class="modal-trigger btn-flat info-btn" data-target="habitInfo${habit.id}">
                    <i class="material-icons">info</i>
                </button>
                <button class="habit-edit btn-flat" data-target="habitModal" aria-label="Edit habit">
                    <i class="material-icons">edit</i>
                </button>
                <button class="habit-delete btn-flat" aria-label="Delete habit">
                    <i class="material-icons">delete</i>
                </button>
            </span>
        </li>

        <!--info modal -->
        <div id="habitInfo${habit.id}" class="modal">
            <div class="modal-content">
                <h4>${habit.title}</h4>
                <p>${habit.description || 'No description provided'}</p>
            </div>
            <div class="modal-footer">
                <button class="modal-close btn-flat">Close</button>
            </div>
        </div>
    `;
    habitContainer.insertAdjacentHTML("beforeend", html);

    // Attach delete event listener
    const deleteButton = habitContainer.querySelector(
        `[data-id="${habit.id}"] .habit-delete`
    );
    deleteButton.addEventListener("click", () => deleteHabit(habit.id));

    // Attach edit event listener
    const editButton = habitContainer.querySelector(
        `[data-id="${habit.id}"] .habit-edit`
    );
    editButton.addEventListener("click", () => {
        openEditForm(habit.id, habit.title, habit.description)
    });

    // Attach info button event listener
    const modalElement = document.getElementById(`habitInfo${habit.id}`);
    M.Modal.init(modalElement);
}

// Edit Habit Button Listener
document.addEventListener("DOMContentLoaded", () => {
    const addHabitButton = document.querySelector("#form-action-btn");

    if (addHabitButton) {
        addHabitButton.addEventListener("click", async () => {

            // Collect input values
            const titleInput = document.querySelector("#title");
            const descriptionInput = document.querySelector("#description");
            const habitIdInput = document.querySelector("#habit-id");
            const formActionButton = document.querySelector("#form-action-btn");

            // Validate required fields
            if (!titleInput.value.trim()) {
                M.toast({html: "Title is required!", classes: "red lighten-1"});
                return;
            }

            // Prepare habit data
            const habitId = habitIdInput.value;
            const habitData = {
                title: titleInput.value,
                description: descriptionInput.value,
            };

            try {
                if (habitId) {
                    console.log(`Editing Habit ID ${habitId}`);
                    // If habitId exists, update the habit
                    await editHabit(habitId, habitData);
                    M.toast({html: "Habit updated successfully!", classes: "green lighten-1"});
                    loadHabits();
                } else {
                    // Otherwise, add a new habit
                    const savedHabit = await addHabit(habitData);
                    M.toast({html: "Habit add successfully!", class: "green lighten-1"});
                    displayHabit(savedHabit);
                }

                formActionButton.textContent = "Add";
                closeForm();
            } catch (error) {
                console.error("Error saving habit: ", error);
                M.toast({html: "Failed to save habit. Try again.", classes: "red lighten-1"});
            }
        });
    } else {
        console.error("Form action button not found.");
    }
});

// Open Edit Form with existing habit data
function openEditForm(id, title, description) {
    const titleInput = document.querySelector("#title");
    const descriptionInput = document.querySelector("#description");
    const habitIdInput = document.querySelector("#habit-id");
    const formActionButton = document.querySelector("#form-action-btn");

    // Fill in the form with existing habit data
    titleInput.value = title;
    descriptionInput.value = description;
    habitIdInput.value = id;
    formActionButton.textContent = "Edit";

    M.updateTextFields();

    const forms = document.querySelector("#habitModal");
    const instance = M.Modal.getInstance(forms);
    instance.open();
}

// Helper function to reset the form after use
function closeForm() {
    const titleInput = document.querySelector("#title");
    const descriptionInput = document.querySelector("#description");
    const habitIdInput = document.querySelector("#habit-id");
    const formActionButton = document.querySelector("#form-action-btn");
    titleInput.value = "";
    descriptionInput.value = "";
    habitIdInput.value = "";
    formActionButton.textContent = "Add";
  }

// Function to check storage usage and show warnings if usage exceeds 80%
async function checkStorageUsage() {
    try {
        // Check if storage API is available
        if (!navigator.storage || !navigator.storage.estimate) {
            console.warn("Storage API is not available in this browser.");
            return; // Early exit if storage is not available
        }

        // Get storage usage estimates
        const { usage, quota } = await navigator.storage.estimate();

        // Convert to MB for easier readability
        const usageInMB = (usage / (1024 * 1024)).toFixed(2);
        const quotaInMB = (quota / (1024 * 1024)).toFixed(2);

        console.log(`Storage used: ${usageInMB} MB of ${quotaInMB} MB`);

        // Update the UI with storage info
        const storageInfo = document.querySelector("#storage-info");
        if (storageInfo) {
            storageInfo.textContent = `Storage used: ${usageInMB} MB of ${quotaInMB} MB`;
        } else {
            console.warn("Storage info element not found in the DOM.");
        }

        // Check if usage exceeds 80% and show warning
        const storageWarning = document.querySelector("#storage-warning");
        if (storageWarning) {
            if (usage / quota > 0.8) {
                storageWarning.textContent = "Warning: You are running low on space";
                storageWarning.style.display = "block";
            } else {
                storageWarning.textContent = "";
                storageWarning.style.display = "none";
            }
        } else {
            console.warn("Storage warning element not found in the DOM.");
        }
    } catch (error) {
        console.error("Error checking storage usage:", error);
    }
}

// Function to request persistent storage
async function requestPersistentStorage() {
    if (navigator.storage && navigator.storage.persist) {
        const isPersistent = await navigator.storage.persist();
        console.log(`Persistent storage granted: ${isPersistent}`);

        // Update the UI with a message
        const storageMessage = document.querySelector("#persistent-storage-info");
        if (storageMessage) {
            if (isPersistent) {
                storageMessage.textContent = "Persistent storage granted. Your data is safe!";
                storageMessage.classList.remove("red-text");
                storageMessage.classList.add("green-text");
            } else {
                storageMessage.textContent = "Persistent storage not granted. Data might be cleared under storage pressure.";
                storageMessage.classList.remove("green-text");
                storageMessage.classList.add("red-text");
            }
        }
    }
}

// Function to request notification permission and retrieve FCM token
async function initNotificationPermission() {
    try{
        const permission = await Notification.requestPermission();
        if(permission === "granted"){
            if(!serviceWorkerRegistration) {
                // Wait until service worker is ready
                serviceWorkerRegistration = await navigator.serviceWorker.ready;
            }
            const token = await getToken(messaging, {
                vapidKey:
                    "BPG6p5LElXTbQ8p5hFEKhKdYoq5pgFzdJcggAJe7RpLYaPlxAnt-WRobfargF2YJc4h-k99wGmLE_OuPb-7UVFc",
                    serviceWorkerRegistration: serviceWorkerRegistration,
            });
            console.log("FCM Token: ", token);

            if (token && currentUser) {
                // Ensure we have a valid currentUser and token before saving
                const userRef = doc(db, "users", currentUser.uid);
                const tokenRef = collection(userRef, "fcmTokens");

                // Try saving the token in Firestore
                await addDoc(tokenRef, { token: token});
                console.log("Token saved to Firestore successfully");
            } else {
                console.log("No valid user or token found.");
            }
        } else {
            console.log("Notification permission denied"); 
        }
    } catch(error){
        console.error("Error requesting notification permission: ", error);
    }
}

// Initialize and handle foreground messages
onMessage(messaging, (payload)=> {
    console.log("Message received ", payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: "/img/icons/OnSyncIcon-192x192.png",
    };
    new Notification(notificationTitle, notificationOptions);
});
window.initNotificationPermission = initNotificationPermission;

setInterval(async () => {
    const now = new Date();
    const habits = await getHabitsFromFirebase(); // Fetch all habits from Firestore
    habits.forEach((habit)=> {
        const reminderDate = new Date(habit.reminderDate);
        if (reminderDate <= now && !habits.notified) {
            // Show local notification
            new Notification("Reminder", {
                body: `Reminder for: ${habit.title}`,
                icon: "/img/icons/OnSyncIcon-192x192.png",
            });
            // Update habit to mark as notified
            habit.notified = true;
            updateHabitInFirebase(habit.id, { notified: true });
        }
    });
}, 60 * 60 * 1000); // Check every hour
