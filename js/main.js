// Initialize selected habit variable
let selectedHabit = '';

// Function to save logs to local storage
function saveLog(habit, duration, notes) {
    const logs = JSON.parse(localStorage.getItem('habitLogs')) || [];
    logs.push({ habit, duration, notes, date: new Date().toISOString() });
    localStorage.setItem('habitLogs', JSON.stringify(logs));
}

// Log activity event listener
const logButtons = document.querySelectorAll('.log-activity');

// Set up click event for each log button
logButtons.forEach(button => {
    button.addEventListener('click', function() {
        selectedHabit = this.getAttribute('data-habit');
        document.getElementById('activityHabitName').textContent = `Logging activity for: ${selectedHabit}`;
        M.Modal.getInstance(document.getElementById('logActivityModal')).open(); // Open modal
    });
});

// Handle logging activity
document.getElementById('logActivity').addEventListener('click', function() {
    const duration = document.getElementById('activity_duration').value;
    const notes = document.getElementById('activity_notes').value;

    // Input validation
    if (duration && !isNaN(duration) && duration > 0) {
        // Save the log
        saveLog(selectedHabit, duration, notes);

        // Feedback to the user
        M.toast({ html: 'Activity logged successfully!' });

        // Reset modal inputs
        document.getElementById('activity_duration').value = '';
        document.getElementById('activity_notes').value = '';
        M.updateTextFields(); // Reset floating labels
        selectedHabit = ''; // Clear selected habit
    } else {
        alert('Please enter a valid duration to log the activity.'); // Alert for missing or invalid duration
    }
});

// Event listener for add habit button in habit modal
document.querySelectorAll('.add-habit-icon').forEach(function(icon) {
    icon.onclick = function() {
        var modalInstance = M.Modal.getInstance(document.getElementById('habitModal'));
        modalInstance.open();
    };
});

// Uncomment and modify this part if needed for saving habit parameters
/*
document.getElementById('saveHabit').onclick = function() {
    var goal = document.getElementById('habit_goal').value;
    var period = document.getElementById('habit_period').value;
    var remindersEnabled = document.getElementById('habit_reminders').checked;

    // Perform actions to save these parameters
    console.log("Goal:", goal);
    console.log("Goal Period:", period);
    console.log("Reminders Enabled:", remindersEnabled);

    // Close the modal after saving
    var modalInstance = M.Modal.getInstance(document.getElementById('habitModal'));
    modalInstance.close();
};
*/
