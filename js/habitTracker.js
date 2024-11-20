document.addEventListener('DOMContentLoaded', function () {
    // Habit data for different weeks
    const habitData = {
        '2024-09-30': [
            { name: "Exercise", completions: [true, false, true, true, true, false, true] },
            { name: "Reading", completions: [true, true, true, false, true, false, false] },
            { name: "Meditation", completions: [false, true, false, true, false, true, true] }
        ],
        '2024-09-23': [
            { name: "Exercise", completions: [true, true, true, true, false, false, false] },
            { name: "Reading", completions: [true, false, true, false, true, false, true] },
            { name: "Meditation", completions: [true, true, false, false, false, true, true] }
        ],
        '2024-09-16': [
            { name: "Exercise", completions: [false, true, false, true, false, true, false] },
            { name: "Reading", completions: [false, false, true, true, true, false, false] },
            { name: "Meditation", completions: [true, true, true, true, true, true, true] }
        ]
    };

    let currentWeekStart = new Date(); 
    currentWeekStart.setDate(currentWeekStart.getDate() - (currentWeekStart.getDay() + 6) % 7); 

    function formatDateRange(start) {
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    }

    function loadHabits(weekStart) {
        const weekKey = weekStart.toISOString().split('T')[0];
        console.log("Week Key:", weekKey);  // Log the week key
        const habits = habitData[weekKey] || [];
        console.log("Habits for this week:", habits); // Log the retrieved habits
        
        const habitTableBody = document.getElementById('habitTableBody');
        habitTableBody.innerHTML = '';

        let totalCompleted = 0;
        let bestStreak = 0;
        let bestDay = 0;
        let bestDayName = '';

        habits.forEach(habit => {
            const row = document.createElement('tr');
            const habitNameCell = document.createElement('td');
            habitNameCell.textContent = habit.name;
            row.appendChild(habitNameCell);

            let habitCompletedDays = 0;

            habit.completions.forEach((completed, index) => {
                const cell = document.createElement('td');
                cell.textContent = completed ? '✓' : '✗';
                row.appendChild(cell);
                if (completed) {
                    habitCompletedDays++;
                    totalCompleted++;
                }
            });

            let currentStreak = 0;
            for (const completed of habit.completions) {
                if (completed) {
                    currentStreak++;
                } else {
                    bestStreak = Math.max(bestStreak, currentStreak);
                    currentStreak = 0;
                }
            }
            bestStreak = Math.max(bestStreak, currentStreak);

            if (habitCompletedDays > bestDay) {
                bestDay = habitCompletedDays;
                bestDayName = habit.name;
            }

            habitTableBody.appendChild(row);
        });

        document.getElementById('totalCompleted').textContent = totalCompleted;
        document.getElementById('bestStreak').textContent = bestStreak;
        document.getElementById('bestDay').textContent = bestDayName || 'None';
        document.getElementById('dateRange').textContent = formatDateRange(weekStart);
    }

    loadHabits(currentWeekStart);

    document.getElementById('prevWeek').addEventListener('click', function () {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        loadHabits(currentWeekStart);
    });

    document.getElementById('nextWeek').addEventListener('click', function () {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        loadHabits(currentWeekStart);
    });

    document.getElementById('currentWeek').addEventListener('click', function () {
        currentWeekStart = new Date();
        currentWeekStart.setDate(currentWeekStart.getDate() - (currentWeekStart.getDay() + 6) % 7);
        loadHabits(currentWeekStart);
    });
});
