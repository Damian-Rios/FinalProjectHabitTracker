import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@8/+esm';
import { addHabitToFirebase, deleteHabitFromFirebase, getHabitsFromFirebase } from "./firebaseDB.js";

document.addEventListener('DOMContentLoaded', function() {
    // Initialize sidenav for mobile view
    var sidenavElems = document.querySelectorAll('.sidenav');
    M.Sidenav.init(sidenavElems);

    // Initialize dropdowns
    var dropdownElems = document.querySelectorAll('.dropdown-trigger');
    M.Dropdown.init(dropdownElems, {
        constrainWidth: false,
        coverTrigger: false
    });

    // Initialize modals
    const modals = document.querySelectorAll('.modal');
    M.Modal.init(modals);

    // Initialize select elements
    var selectElems = document.querySelectorAll('select');
    M.FormSelect.init(selectElems);

    // Check storage usage
    checkStorageUsage();
    // Request persistent storage
    requestPersistentStorage();
});

// Register service worker
if ("serviceWorker" in navigator) {
    navigator.serviceWorker
        .register('/serviceworker.js')
        .then((req) => console.log("Service Worker Registered!", req))
        .catch((err) => console.log("Service Worker Registration failed", err));
}


// Initialize and create the database
async function createDB() {
    const db = await openDB("habitTracker", 1, {
        upgrade(db, oldVersion, newVersion, transaction) {
            console.log(`Upgrading DB from version ${oldVersion} to ${newVersion}`);

            // Check if "habits" store exists before creating it
            if (!db.objectStoreNames.contains("habits")) {
                const habitStore = db.createObjectStore("habits", {
                    keyPath: "id",
                    autoIncrement: true
                });
                habitStore.createIndex("title", "title", {unique: false});
                habitStore.createIndex("description", "description", {unique: false});
            }

            // Check if "logs" store exists before creating it
            if (!db.objectStoreNames.contains("logs")) {
                const logsStore = db.createObjectStore("logs", {
                    keyPath: "id",
                    autoIncrement: true
                });
                logsStore.createIndex("habitId", "habitId", {unique: false});
                logsStore.createIndex("description", "description", { unique: false});
                logsStore.createIndex("timestamp", "timestamp", { unique: false});
            }
        }
    });
    return db;
}


// Add a new habit to the database
async function addHabit(habit) {
    const db = await createDB();
    let habitId;

    if(navigator.onLine) {
        const saveHabit = await addHabitToFirebase(habit);
        habitId = saveHabit.id;

        const tx = db.transaction("habits", "readwrite");
        const store = tx.objectStore("habits");

        await store.put({ ...habit, id: habitId, synced: true });
        await tx.done;
    } else {
        habitId = `temp-${Date.now()}`;

        const habitToStore = { ...habit, habitId, synced: false };
        if(!habitToStore.id){
            console.error("Failed to generate a valid ID for the habit.");
            return // Exit if ID is invalid
        }

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

// Sync habits from indexDB to firebase
export async function syncHabits() {
    const db = await createDB();
    const tx = db.transaction("habits", "readonly");
    const store = tx.objectStore("habits");

    // Fetch all unsynced habits
    const habits = await store.getAll();
    await tx.done;
    
    for (const habit of habits) {
        if (!habit.synced && navigator.onLine) {
            try {
                const habitToSync = {
                    title: habit.title,
                    description: habit.description,
                };

                // Send the habit to firebase
                const savedHabit = await addHabitToFirebase(habitToSync);

                // Replace temporary ID to firebase id
                const txUpdate = db.transaction("habits", "readwrite");
                const storeUpdate = txUpdate.objectStore("habits");

                await storeUpdate.delete(habit.id);
                await storeUpdate.put({ ...habit, id: savedHabit.id, synced: true});
                await txUpdate.done;
            } catch (error) {
                console.error("Error syncing habit: ", error);
            }
        }
    }
}

// Delete a habit with Transaction
async function deleteHabit(id) {
    if (!id) {
        console.error("Invalid Id passed to deleteHabit");
        return;
    }

    const db = await createDB();

    if(navigator.onLine) {
        await deleteHabitFromFirebase(id);
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
    const habitCollection = document.querySelector(`[data-id="${id}"]`);
    if (habitCollection) {
        habitCollection.remove();
    }

    // Update storage usage
    checkStorageUsage();
}

// Load Habits with Transaction
export async function loadHabits() {
    const db = await createDB();

    const habitContainer = document.querySelector(".habits");
    habitContainer.innerHTML = ""; // Clear current habits

    if (navigator.onLine) {
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

    if (document.querySelector(`[data-id="${habit.id}"]`)) {
        return;
    }

    const habitContainer = document.querySelector(".habits");
    const html = `
        <li class="collection-item" data-id="${habit.id}">
            <span>${habit.title}</span>
            <span class="secondary-content">
                <button class="modal-trigger btn-flat" data-target="habitInfo${habit.id}">
                    <i class="material-icons">info</i>
                </button>
                <button class="modal-trigger btn-flat" data-target="logHabit${habit.id}">
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

        <!-- Log Modal -->
        <div id="logHabit${habit.id}" class="modal">
            <div class="modal-content">
                <h4>Log Activity for ${habit.title}</h4>
                <form id="logForm${habit.id}">
                    <div class="input-field">
                        <input type="date" id="logDate${habit.id}" required>
                        <label for="logDate${habit.id}">Date</label>
                    </div>
                    <div class="input-field">
                        <input type="text" id="logDescription${habit.id}" required>
                        <label for="logDescription${habit.id}">Description</label>
                    </div>
                    <button type="submit" class="btn">Save Log</button>
                </form>
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

    // Attach log form submission event listener
    const logForm = document.querySelector(`#logForm${habit.id}`);
    logForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        // Get the form data
        const logDate = document.querySelector(`#logDate${habit.id}`).value;
        const logDescription = document.querySelector(`#logDescription${habit.id}`).value;

        // Create a new log object
        const log = {
            habitId: habit.id,
            description: logDescription,
            timestamp: logDate
        };

        // Add log to the database
        await addLog(log);

        displayLog(log);

        // Clear the form
        logForm.reset();
    });

    // Initialize modal for the info button
    const modalElement = document.getElementById(`habitInfo${habit.id}`);
    M.Modal.init(modalElement);

    // Initialize the modal for the log button
    const logModal = document.getElementById(`logHabit${habit.id}`);
    M.Modal.init(logModal);

}

// Add Habit Button Listener
const addHabitButton = document.querySelector(".btn");
addHabitButton.addEventListener("click", async () => {
    const titleInput = document.querySelector("#custom_habit");
    const descriptionInput = document.querySelector("#custom_description");

    if (!titleInput.value.trim()) {
        alert("Please provide a valid title.");
        return;
    }

    const habit = {
        title: titleInput.value,
        description: descriptionInput.value,
    };

    // Add habit to IndexedDB
    const savedHabit = await addHabit(habit);

    // Add habit to the UI
    displayHabit(savedHabit);

    // Clear input fields after adding
    titleInput.value = "";
    descriptionInput.value = "";
});

// Add a new log
async function addLog(log) {
    const db = await createDB();

    // Start a transaction
    const tx = db.transaction("logs", "readwrite");
    const store = tx.objectStore("logs");

    // Add log to store
    await store.add(log);

    // Complete transaction
    await tx.done;

    // Update storage usage
    checkStorageUsage();
}

// Update a log
async function updateLog(id, updatedDetails) {
    const db = await createDB();

    const tx = db.transaction("logs", "readwrite");
    const store = tx.objectStore("logs");

    // Get the existing log
    const log = await store.get(id);

    // Merge updates and save back
    const updatedLog = { ...log, ...updatedDetails };
    await store.put(updatedLog);

    await tx.done;
    console.log(`Log updated:`, updatedLog);
}

// Delete a log
async function deleteLog(id) {
    const db = await createDB();

    // Start a transaction
    const tx = db.transaction("logs", "readwrite");
    const store = tx.objectStore("logs");

    // Delete log by id
    await store.delete(id);
    
    // Complete Transaction
    await tx.done;

     // Remove log from UI
    const logCard = document.querySelector(`[data-id="${id}"]`);
    if (logCard) {
        logCard.remove();
    }

    // Update storage usage
    checkStorageUsage();
}

// Load Logs with Transaction
export async function loadLogs() {
    const db = await createDB();

    // Start a transaction (read-only)
    const tx = db.transaction("logs", "readonly");
    const store = tx.objectStore("logs");

    // Get all logs
    const logs = await store.getAll();

    // Complete transaction
    await tx.done;

    const logContainer = document.querySelector(".logs");
    logContainer.innerHTML = ""; // Clear current logs

    logs.forEach((log) => {
        displayLog(log);
    });
}

// Fetch the log by its ID, then get the habitId and fetch the habit name
async function getHabitNameFromLog(logId) {
    const db = await createDB();
    
    // First, get the log by its ID
    const tx = db.transaction("logs", "readonly");
    const store = tx.objectStore("logs");
    const log = await store.get(logId);  // Fetch the log by its ID
    
    await tx.done;
    
    if (log) {
        const habitId = log.habitId;  // Extract habitId from the log
        
        // Now fetch the habit name using the habitId
        return getHabitName(habitId);  // This will look up the habit name
    } else {
        console.warn("Log not found for ID:", logId);
        return "Unknown Habit";  // Fallback in case log is not found
    }
}

// Fetch habit name by habitId
async function getHabitName(habitId) {
    if (!habitId) {
        console.error("Invalid habitId:", habitId);
        return "Unknown Habit";  // Fallback to "Unknown Habit"
    }

    try {
        const db = await createDB();
        const tx = db.transaction("habits", "readonly");
        const store = tx.objectStore("habits");
        
        // Fetch the habit by its habitId
        const habit = await store.get(habitId);
        await tx.done;

        if (habit) {
            return habit.title;  // Return the habit's name
        } else {
            console.warn("Habit not found for ID:", habitId);
            return "Unknown Habit";  // Fallback if habit doesn't exist
        }
    } catch (error) {
        console.error("Error fetching habit name:", error);
        return "Unknown Habit";  // Fallback to "Unknown Habit"
    }
}

// Display the log with habit name
async function displayLog(log) {
    const logContainer = document.querySelector(".logs");

    // Fetch the habit name by log.id
    const habitName = await getHabitNameFromLog(log.id);

    const html = `
        <li class="collection-item" data-id="${log.id}">
            <span><strong>Habit:</strong> ${habitName}</span><br>
            <span><strong>Description:</strong> ${log.description}</span><br>
            <span><strong>Timestamp:</strong> ${log.timestamp}</span>
            <button class="log-delete btn-flat secondary-content" aria-label="Delete log">
                <i class="material-icons">delete</i>
            </button>
        </li>
    `;
    logContainer.insertAdjacentHTML("beforeend", html);

    // Attach delete event listener to the delete button
    const deleteButton = logContainer.querySelector(`[data-id="${log.id}"] .log-delete`);
    deleteButton.addEventListener("click", () => deleteLog(log.id));  // Call deleteLog with log.id
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
