"""
Priority-Based Flight Route Optimizer - Algorithm Implementations
This module contains the core algorithms for solving the Priority-Based Traveling Salesman Problem.
Each algorithm considers both distance and priority constraints when finding routes.
"""

import numpy as np
from math import radians, sin, cos, sqrt, atan2
import time

def haversine_distance(city1, city2):
    """
    Calculate the great circle distance between two cities using the Haversine formula.
    This gives the shortest distance over the earth's surface between two points.
    
    Args:
        city1 (dict): First city with 'lat' and 'lon' keys
        city2 (dict): Second city with 'lat' and 'lon' keys
    
    Returns:
        float: Distance in kilometers between the two cities
    """
    R = 6371  # Earth's radius in kilometers

    lat1, lon1 = radians(city1['lat']), radians(city1['lon'])
    lat2, lon2 = radians(city2['lat']), radians(city2['lon'])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c

def create_distance_matrix(cities):
    """
    Create a distance matrix for all cities using haversine distance.
    
    Args:
        cities (list): List of city dictionaries with 'lat' and 'lon' keys
    
    Returns:
        numpy.ndarray: Matrix of distances between all pairs of cities
    """
    n = len(cities)
    matrix = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            if i != j:
                matrix[i][j] = haversine_distance(cities[i], cities[j])
    return matrix

def get_priority_penalty(from_priority, to_priority):
    """
    Calculate penalty for traveling between cities of different priorities.
    Penalty is applied when moving from higher priority (lower number) to lower priority (higher number).
    
    Args:
        from_priority (int): Priority of the source city (1-5)
        to_priority (int): Priority of the destination city (1-5)
    
    Returns:
        float: Penalty value (0 if moving to same/higher priority, large value otherwise)
    """
    if from_priority <= to_priority:
        return 0
    return (from_priority - to_priority) * 1000  # Large penalty for violating priority

def brute_force_tsp(cities, distance_matrix, start_idx=None):
    """
    Solve TSP using brute force approach with priority constraints.
    Generates all possible permutations and finds the one with minimum cost.
    
    Args:
        cities (list): List of city dictionaries
        distance_matrix (numpy.ndarray): Pre-calculated distance matrix
        start_idx (int, optional): Index of starting city. If None, highest priority city is chosen
    
    Returns:
        tuple: (optimal route, total cost, execution time)
    
    Time Complexity: O(n!)
    Space Complexity: O(n)
    """
    start_time = time.time()
    n = len(cities)
    
    if start_idx is None:
        # Find city with highest priority (lowest number) as default start
        start_idx = min(range(n), key=lambda i: cities[i]['priority'])

    def permutation_cost(perm):
        """Calculate total cost (distance + priority penalties) for a given permutation"""
        if perm[0] != start_idx:
            return float('inf')
        
        total_cost = 0
        for i in range(len(perm)-1):
            from_city = cities[perm[i]]
            to_city = cities[perm[i+1]]
            
            # Add distance cost
            total_cost += distance_matrix[perm[i]][perm[i+1]]
            
            # Add priority penalty
            total_cost += get_priority_penalty(from_city['priority'], to_city['priority'])
            
        # Add return to start
        total_cost += distance_matrix[perm[-1]][perm[0]]
        return total_cost

    # Generate all possible permutations
    indices = list(range(n))
    min_cost = float('inf')
    best_path = None
    
    def generate_permutations(arr, start):
        """Recursively generate all possible permutations"""
        if start == len(arr):
            nonlocal min_cost, best_path
            cost = permutation_cost(arr)
            if cost < min_cost:
                min_cost = cost
                best_path = arr.copy()
        else:
            for i in range(start, len(arr)):
                arr[start], arr[i] = arr[i], arr[start]
                generate_permutations(arr, start + 1)
                arr[start], arr[i] = arr[i], arr[start]  # backtrack
    
    generate_permutations(indices, 0)
    
    if best_path is None:
        return None, float('inf'), time.time() - start_time
        
    # Convert indices back to cities
    route = [cities[i] for i in best_path]
    return route, min_cost, time.time() - start_time

def dp_tsp(cities, distance_matrix, start_idx=None):
    """
    Solve TSP using dynamic programming with bitmask and priority constraints.
    Uses memoization to avoid recalculating subproblems.
    
    Args:
        cities (list): List of city dictionaries
        distance_matrix (numpy.ndarray): Pre-calculated distance matrix
        start_idx (int, optional): Index of starting city. If None, highest priority city is chosen
    
    Returns:
        tuple: (optimal route, total cost, execution time)
    
    Time Complexity: O(n²2ⁿ)
    Space Complexity: O(n2ⁿ)
    """
    start_time = time.time()
    n = len(cities)
    
    if start_idx is None:
        # Find city with highest priority (lowest number) as default start
        start_idx = min(range(n), key=lambda i: cities[i]['priority'])
    
    # Initialize DP table
    dp = {}
    
    def solve(pos, mask):
        """
        Recursive function to solve TSP using dynamic programming
        
        Args:
            pos (int): Current city index
            mask (int): Bitmask representing visited cities
        
        Returns:
            tuple: (minimum cost, path)
        """
        if mask == (1 << n) - 1:  # All cities visited
            return distance_matrix[pos][start_idx], [start_idx]
        
        state = (pos, mask)
        if state in dp:
            return dp[state]
        
        min_cost = float('inf')
        best_path = None
        
        for next_city in range(n):
            if not mask & (1 << next_city):  # If city not visited
                # Calculate cost including priority penalty
                cost = distance_matrix[pos][next_city]
                cost += get_priority_penalty(cities[pos]['priority'], cities[next_city]['priority'])
                
                remaining_cost, remaining_path = solve(next_city, mask | (1 << next_city))
                total_cost = cost + remaining_cost
                
                if total_cost < min_cost:
                    min_cost = total_cost
                    best_path = [next_city] + remaining_path
        
        dp[state] = (min_cost, best_path)
        return min_cost, best_path
    
    # Start with only the starting city visited
    initial_mask = 1 << start_idx
    total_cost, path = solve(start_idx, initial_mask)
    
    if path is None:
        return None, float('inf'), time.time() - start_time
        
    # Convert indices back to cities
    route = [cities[start_idx]] + [cities[i] for i in path]
    return route, total_cost, time.time() - start_time

def greedy_tsp(cities, distance_matrix, start_idx=None):
    """
    Solve TSP using greedy (nearest neighbor) approach with priority constraints.
    Always selects the nearest unvisited city that minimizes distance + priority penalty.
    
    Args:
        cities (list): List of city dictionaries
        distance_matrix (numpy.ndarray): Pre-calculated distance matrix
        start_idx (int, optional): Index of starting city. If None, highest priority city is chosen
    
    Returns:
        tuple: (route, total cost, execution time)
    
    Time Complexity: O(n²)
    Space Complexity: O(n)
    """
    start_time = time.time()
    n = len(cities)
    
    if start_idx is None:
        # Find city with highest priority (lowest number) as default start
        start_idx = min(range(n), key=lambda i: cities[i]['priority'])
    
    unvisited = set(range(n))
    current = start_idx
    path = [current]
    unvisited.remove(current)
    total_cost = 0
    
    while unvisited:
        min_cost = float('inf')
        next_city = None
        
        for city in unvisited:
            # Calculate cost including priority penalty
            cost = distance_matrix[current][city]
            cost += get_priority_penalty(cities[current]['priority'], cities[city]['priority'])
            
            if cost < min_cost:
                min_cost = cost
                next_city = city
        
        if next_city is None:
            break
            
        current = next_city
        path.append(current)
        unvisited.remove(current)
        total_cost += min_cost
    
    # Add cost of returning to start
    total_cost += distance_matrix[path[-1]][start_idx]
    
    # Convert indices back to cities
    route = [cities[i] for i in path]
    return route, total_cost, time.time() - start_time 