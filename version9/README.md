# Priority-Based Flight Route Optimizer

## Project Overview
This project implements a Priority-Based Flight Route Optimizer that solves a modified version of the Traveling Salesman Problem (TSP) with priority constraints. The system helps find optimal routes between cities while considering priority levels, making it useful for scenarios like emergency response planning, supply chain optimization, or travel planning where some destinations have higher priorities than others.

## System Requirements

### Prerequisites
- Python 3.7 or higher
- Modern web browser with JavaScript enabled
- Internet connection (for map tiles)
- Minimum 4GB RAM (recommended 8GB for larger datasets)
- Screen resolution: 1280x720 or higher

### Python Dependencies
```
flask==2.0.1
flask-cors==3.0.10
numpy==1.21.0
```

## Project Structure
```
project/
│
├── backend/
│   ├── app.py              # Flask server and API endpoints
│   ├── algorithms.py       # Core algorithm implementations
│   └── requirements.txt    # Python dependencies
│
├── frontend/
│   ├── index.html         # Main application page
│   ├── style.css          # CSS styles
│   └── script.js          # Frontend JavaScript
│
└── README.md              # Project documentation
```

## Key Features

### Core Functionality
- Interactive map interface for city management
- Priority-based routing system (levels 1-5, where 1 is highest priority)
- Multiple algorithm implementations for route optimization
- Real-time route visualization with distance calculations
- Comparative analysis of different algorithms
- Custom starting city selection
- Priority-based city management and updates

### Algorithm Details

1. **Brute Force Algorithm**
   - Implementation: Recursive permutation generation
   - Time Complexity: O(n!)
   - Space Complexity: O(n)
   - Best for: Small datasets (≤10 cities)
   - Guarantees: Global optimal solution

2. **Dynamic Programming with Bitmask**
   - Implementation: State-space reduction with memoization
   - Time Complexity: O(n²2ⁿ)
   - Space Complexity: O(n2ⁿ)
   - Best for: Medium datasets (10-15 cities)
   - Guarantees: Global optimal solution

3. **Greedy (Nearest Neighbor)**
   - Implementation: Priority-weighted nearest neighbor selection
   - Time Complexity: O(n²)
   - Space Complexity: O(n)
   - Best for: Large datasets (>15 cities)
   - Guarantees: Fast approximate solution

### Priority System
- Priority 1: Highest priority (Emergency/Critical)
- Priority 2: High priority (Urgent)
- Priority 3: Medium priority (Normal)
- Priority 4: Low priority (Flexible)
- Priority 5: Lowest priority (Optional)

### Distance Calculation
- Uses Haversine formula for accurate Earth surface distances
- Accounts for Earth's curvature
- Provides distances in kilometers
- Real-time updates during route changes

## Setup Instructions

### Backend Setup
1. Clone the repository:
```bash
git clone https://github.com/rohit1836/DAA-PBL.git
cd priority-route-optimizer
```

2. Create and activate a virtual environment (recommended):
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

3. Install Python requirements:
```bash
cd backend
pip install -r requirements.txt
```

4. Start the Flask backend:
```bash
python app.py
```
The server will start on http://localhost:5000

### Frontend Setup
1. Open `frontend/index.html` in a web browser
2. Ensure backend server is running
3. Start adding cities and optimizing routes

## Usage Guide

### Basic Operations
1. **Adding Cities**
   - Enter city name in the input field
   - Select priority level (1-5)
   - Click "Add City" or press Enter

2. **Setting Starting Point**
   - Select a starting city from the dropdown
   - System will prioritize this city as the route's starting point

3. **Finding Routes**
   - Choose an algorithm (Brute Force/Dynamic Programming/Greedy)
   - Click "Find Optimal Route"
   - View the calculated route on the map

4. **Comparing Algorithms**
   - Click "Compare All Algorithms"
   - View performance metrics and route differences
   - Compare time taken and distance calculations

### Advanced Features
1. **Priority Management**
   - Update city priorities using dropdown menus
   - Routes automatically recalculate on priority changes
   - System enforces priority constraints in route calculation

2. **Distance Visualization**
   - View distances between consecutive cities
   - Hover over cities for detailed information
   - See total route distance in statistics

## Performance Guidelines

### Dataset Size Recommendations
- 1-10 cities: Use Brute Force for optimal results
- 10-15 cities: Use Dynamic Programming for balanced performance
- 15+ cities: Use Greedy algorithm for faster results

### Memory Usage
- Brute Force: ~100MB for 10 cities
- Dynamic Programming: ~500MB for 15 cities
- Greedy: Minimal memory usage

### Response Times
- Small datasets (<10 cities): <1 second
- Medium datasets (10-15 cities): 1-5 seconds
- Large datasets (>15 cities): 5-10 seconds

## Known Limitations
1. Maximum recommended cities: 20
2. Brute force becomes impractical beyond 10 cities
3. No offline functionality
4. Single-route optimization only
5. No multi-vehicle support

## Troubleshooting

### Common Issues
1. **Server Connection Failed**
   - Ensure Flask server is running
   - Check if port 5000 is available
   - Verify no firewall blocking

2. **Slow Performance**
   - Reduce number of cities
   - Use Greedy algorithm for large datasets
   - Clear browser cache

3. **Map Not Loading**
   - Check internet connection
   - Enable JavaScript
   - Try different browser

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments
- Leaflet.js for mapping functionality
- OpenStreetMap for map data
- Flask framework for backend API
- All contributors and testers

## Version History
- v1.0.0 (Current)
  - Initial release
  - Three algorithm implementations
  - Basic priority system
  - Interactive map interface

## Future Roadmap
1. **Short Term**
   - Mobile responsiveness
   - Route history
   - Export functionality

2. **Medium Term**
   - User authentication
   - Database integration
   - Additional algorithms

3. **Long Term**
   - Multi-vehicle support
   - Real-time traffic integration
   - Machine learning optimization

