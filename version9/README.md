# Priority-Based Flight Route Optimizer

This project implements a Priority-Based Flight Route Optimizer using the Traveling Salesman Problem (TSP) with priority constraints. It provides multiple algorithm implementations to find optimal routes between cities while considering priority levels.

## Features

- Interactive map interface for adding and managing cities
- Priority-based routing (levels 1-5)
- Multiple algorithm implementations:
  - Brute Force (exact solution)
  - Dynamic Programming (exact solution)
  - Greedy/Nearest Neighbor (approximate solution)
- Real-time route visualization
- Distance calculations and statistics
- Algorithm comparison functionality
- Custom starting city selection
- Priority-based city management

## Setup

1. Install Python requirements:
```bash
cd backend
pip install -r requirements.txt
```

2. Start the Flask backend:
```bash
python app.py
```

3. Open `frontend/index.html` in a web browser

## Usage

1. Enter city names and assign priorities (1-5)
2. Optionally select a starting city
3. Choose an algorithm (Brute Force, Dynamic Programming, or Greedy)
4. Click "Find Optimal Route" to calculate the route
5. Use "Compare All Algorithms" to see performance comparisons
6. Reset the map using the "Reset" button

## Technical Details

- Frontend: HTML, CSS, JavaScript with Leaflet.js for mapping
- Backend: Python/Flask
- Algorithms: 
  - Brute Force (O(n!))
  - Dynamic Programming with bitmask (O(n²2ⁿ))
  - Greedy/Nearest Neighbor (O(n²)) 