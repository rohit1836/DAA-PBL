"""
Priority-Based Flight Route Optimizer - Backend Server
This module implements the Flask server that provides the API endpoints for the route optimizer.
It handles route calculations, algorithm comparisons, and serves the frontend static files.
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from algorithms import (
    create_distance_matrix,
    brute_force_tsp,
    dp_tsp,
    greedy_tsp
)

# Initialize Flask application with static file configuration
app = Flask(__name__, static_folder='../frontend')
CORS(app)  # Enable Cross-Origin Resource Sharing

# Map algorithm names to their corresponding functions
ALGORITHMS = {
    'brute': brute_force_tsp,
    'dp': dp_tsp,
    'greedy': greedy_tsp
}

@app.route('/')
def home():
    """
    Serve the main application page.
    
    Returns:
        HTML: The index.html page from the frontend directory
    """
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files (CSS, JS, etc.)."""
    return send_from_directory(app.static_folder, path)

@app.route('/api/route', methods=['POST'])
def find_route():
    """
    Calculate optimal route using specified algorithm.
    
    Expected JSON payload:
    {
        "cities": [
            {
                "id": int,
                "name": str,
                "lat": float,
                "lon": float,
                "priority": int
            },
            ...
        ],
        "algorithm": str ("brute", "dp", or "greedy"),
        "starting_city_id": int or null
    }
    
    Returns:
        JSON: {
            "route": list of cities in optimal order,
            "distance": float (total distance in km),
            "time": float (computation time in ms),
            "starting_city": dict (selected starting city)
        }
    """
    try:
        data = request.get_json()
        cities = data.get('cities', [])
        algorithm = data.get('algorithm', 'brute')
        starting_city_id = data.get('starting_city_id')
        
        # Validate input
        if len(cities) < 2:
            return jsonify({'error': 'Need at least 2 cities'}), 400
            
        # Create distance matrix for efficiency
        distance_matrix = create_distance_matrix(cities)
        
        # Find starting city index if provided
        start_idx = None
        if starting_city_id is not None:
            for i, city in enumerate(cities):
                if city['id'] == starting_city_id:
                    start_idx = i
                    break
        
        # Get the appropriate algorithm function
        algo_func = ALGORITHMS.get(algorithm)
        if not algo_func:
            return jsonify({'error': 'Invalid algorithm'}), 400
            
        # Calculate route using selected algorithm
        route, distance, time = algo_func(cities, distance_matrix, start_idx)
        
        if route is None:
            return jsonify({'error': 'No valid route found'}), 400
            
        # Get the starting city for the response
        starting_city = route[0] if route else None
            
        return jsonify({
            'route': route,
            'distance': distance,
            'time': time,
            'starting_city': starting_city
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/compare', methods=['POST'])
def compare_algorithms():
    """
    Compare all available algorithms for the given set of cities.
    
    Expected JSON payload:
    {
        "cities": [
            {
                "id": int,
                "name": str,
                "lat": float,
                "lon": float,
                "priority": int
            },
            ...
        ],
        "starting_city_id": int or null
    }
    
    Returns:
        JSON: List of results from each algorithm:
        [{
            "algorithm": str,
            "route": list of cities,
            "distance": float,
            "time": float,
            "starting_city": dict
        }, ...]
    """
    try:
        data = request.get_json()
        cities = data.get('cities', [])
        starting_city_id = data.get('starting_city_id')
        
        # Validate input
        if len(cities) < 2:
            return jsonify({'error': 'Need at least 2 cities'}), 400
            
        # Create distance matrix once for efficiency
        distance_matrix = create_distance_matrix(cities)
        
        # Find starting city index if provided
        start_idx = None
        if starting_city_id is not None:
            for i, city in enumerate(cities):
                if city['id'] == starting_city_id:
                    start_idx = i
                    break
        
        # Run all algorithms and collect results
        results = []
        for name, algo_func in ALGORITHMS.items():
            route, distance, time = algo_func(cities, distance_matrix, start_idx)
            if route is not None:
                results.append({
                    'algorithm': name.upper(),
                    'route': route,
                    'distance': distance,
                    'time': time,
                    'starting_city': route[0] if route else None
                })
                
        return jsonify(results)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Start the Flask development server
    app.run(debug=True) 