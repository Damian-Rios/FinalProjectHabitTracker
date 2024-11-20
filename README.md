### INF654 - Mobile Web Development
### Damian Rios
### PWA Prototype


# OnSync Habit Tracker

## Description
OnSync Habit Tracker is a Progressive Web Application (PWA) designed to help users manage and track their daily habits. Users can log activities, view their progress, and receive notifications for reminders. The application features a user-friendly interface built using HTML, CSS (Materialize), and JavaScript.


## Getting Started

### Dependencies
- HTML5
- CSS3 (Materialize CSS Framework)
- JavaScript
- A web browser with PWA support

### Executing Program
1. Clone the repository: To clone, open your terminal and run the following command:

   ```bash
   git clone https://github.com/Damian-Rios/HabitTracker.git

2. Navigate to the project directory:

   ```bash
   cd HabitTracker

3. Set up a live server:
   * You can use an extension like **Live Server** in Visual Studio
   Code, or use a simple HTTP server.

4. Open the app in your browser
   * Once the server is running, open your browser and navigate to [http://localhost:5500](http://localhost:5500) (or the port number shown in your terminal).


## PWA Features
### Service Worker
The service worker caches assets for offline access and faster load times:
- Install: Caches essential files (HTML, JS, icons).
- Activate: Clears old caches to save storage.
- Fetch: Uses a cache-first strategy, serving cached files and fetching new ones as needed.

### Caching Strategy
Uses a Cache-First approach, loading assets from cache first for speed and offline access, with new files dynamically added to the cache during use.

### Web app Manifest
The manifest enables app installation with metadata such as:
- Icons: Device-optimized icons
- Theme/Background Colors: For a cohesive app-like feel
- Display Mode: Standalone mode for a native experience
- Shortcuts: Quick access to features like "Add Habit" and "Track Progress"
- And much more


## Authors

Damian Rios