import { openDB } from "https://unpkg.com/idb?module";

// Initialize and create the database
async function createDB() {
    const db = await openDB("habitTracker", 1, {
        upgrade(db) {
            const store = db.createObjectStore("habits", {
                keyPath: "id",
                autoIncrement: true,
            });
            habitStore.createIndex("name", "name");

            // Create an object store for logs
            const logStore = db.createObjectStore("habitLogs", {
                keyPath: "id",
                autoIncrement: true,
            });
            logStore.createIndex("habitId", "habitId");
            logStore.createIndex("date", "date");
            logStore.createIndex("duration", "duration");
            logStore.createIndex("notes", "notes");
        },
    });
    return db;
}

// Add a new habit to the database
async function addHabit(habit) {
    const db = await createDB();

    // Start a transaction
    const tx = db.transaction("habits", "readwrite");
    const store = tx.objectStore("habits");

    // Add habit to store
    await store.add(habit);

    // Complete transaction
    await tx.done;

    // Update storage usage
    checkStorageUsage();
}

// Delete a habit with Transaction
async function deleteHabit(id) {
    const db = await createDB();

    // Start a transaction
    const tx = db.transaction("habits", "readwrite");
    const store = tx.objectStore("habits");

    // Delete habit by id
    await store.delete(id);

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
async function loadHabits() {
    const db = await createDB();

    // Start a transaction (read-only)
    const tx = db.transaction("habits", "readonly");
    const store = tx.objectStore("habits");

    // Get all habits
    const habits = await store.getAll();

    // Complete transaction
    await tx.done;

    const habitContainer = document.querySelector(".habits");
    habitContainer.innerHTML = "";  // Clear habit list before reloading

    habits.forEach((habit) => {
        displayHabit(habit);
    });
}

// Display Task using the existing HTML Structure
function displayHabit(habit) {
    const habitContainer = document.querySelector(".habits");
    const html = `
        <li class="collection-item" data-id="${habit.id}">
            <span>${habit.title}</span>
            <span class="secondary-content">
                <a href="#habitInfo${habit.id}" class="modal-trigger">
                    <i class="material-icons">info</i>
                </a>
                <a href="#logActivityModal" class="modal-trigger log-activity" data-habit="${habit.title}" data-id="${habit.id}">
                    <i class="material-icons">edit</i>
                </a>
                <button class="habit-delete" aria-label="Delete habit">
                    <i class="material-icons">delete</i>
                </button>
            </span>
        </li>
        
        <!-- Modal for habit info -->
        <div id="habitInfo${habit.id}" class="modal">
            <div class="modal-content">
                <h5>${habit.title}</h5>
                <p>${habit.description}</p>
            </div>
            <div class="modal-footer">
                <a href="#" class="modal-close waves-effect waves-green btn-flat">Close</a>
            </div>
        </div>
    `;
    habitContainer.insertAdjacentHTML("beforeend", html);

    // Attach delete event listener
    const deleteButton = habitContainer.querySelector(
        `[data-id="${habit.id}"] .habit-delete`);
    deleteButton.addEventListener("click", () => deleteHabit(habit.id));
}

// Add Habit Button Listener
const addHabitButton = document.querySelector(".btn");
addHabitButton.addEventListener("click", async () => {
    const titleInput = document.querySelector("#custom_habit");
    const descriptionInput = document.querySelector("#custom_description");

    const habit = {
        title: titleInput.value,
        description: descriptionInput.value,
    };

    // Add habit to IndexedDB
    await addHabit(habit);

    // Add habit to the UI
    displayHabit(habit);

    // Clear input fields after adding
    titleInput.value = "";
    descriptionInput.value = "";

    // Close the modal after adding
    const forms = document.querySelector("#habitModal");
    const instance = M.modal.getInstance(forms);
    instance.close();
});






// Add a new log to the database
export async function addLog(habitId, duration, notes) {
    const db = await createDB();
    const tx = db.transaction("habitLogs", "readwrite");
    const store = tx.objectStore("habitLogs");

    const logEntry = {
        habitId: habitId,
        date: new Date().toISOString(),  // Current date
        duration: duration,
        notes: notes,
    };

    await store.add(logEntry);
    await tx.done;

    // Optionally, you can call loadLogs() here to update the UI
    await loadLogs(habitId); // Refresh logs after adding
}

// Add event listener for logging activity
document.getElementById("logActivity").addEventListener("click", async () => {
    const habitId = document.getElementById("activityHabitId").value;
    const duration = document.getElementById("activity_duration").value;
    const notes = document.getElementById("activity_notes").value;

    if (duration) {
        await addLog(habitId, duration, notes); // Call addLog with the necessary parameters
    } else {
        alert("Please enter a duration!");
    }
});

// Load and display logs for a specific habit
export async function loadLogs(habitId) {
    const db = await createDB();
    const tx = db.transaction("habitLogs", "readonly");
    const store = tx.objectStore("habitLogs");

    const logs = await store.index("habitId").getAll(habitId); // Get all logs for this habit
    await tx.done;

    const logContainer = document.querySelector(".logs"); // Replace with your logs container selector
    logContainer.innerHTML = "";  // Clear previous logs

    logs.forEach((log) => {
        const logItem = document.createElement('div');
        logItem.innerHTML = `
            <p>Date: ${new Date(log.date).toLocaleDateString()}</p>
            <p>Duration: ${log.duration} minutes</p>
            <p>Notes: ${log.notes}</p>
        `;
        logContainer.appendChild(logItem);
    });
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