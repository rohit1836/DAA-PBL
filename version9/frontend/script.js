/**
 * Priority-Based Flight Route Optimizer - Frontend Script
 * This script handles the interactive map interface, city management,
 * route calculations, and visualization of the Priority-Based TSP solution.
 */

// Global state variables
let cities = [];  // Array to store all cities with their properties
let nextCityId = 0;  // Counter for generating unique city IDs
let map, markers = [], routeLine, distanceLabels = [];  // Map-related variables

// API endpoint configuration
const API_URL = '/api';

// Time complexity mapping for different algorithms
const timeComplexity = {
  'brute': 'O(n!)',
  'dp': 'O(n²2ⁿ)',
  'greedy': 'O(n²)'
};

// Map marker icon configurations
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const startingIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Initialize everything when the DOM is ready
document.addEventListener('DOMContentLoaded', function () {
  // Initialize map with multiple tile layer options
  map = L.map('map').setView([20.5937, 78.9629], 5);
  let osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  });

  let googleStreets = L.tileLayer('http://{s}.google.com/vt?lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
  });
  googleStreets.addTo(map);

  // Set up layer controls
  let baseMaps = {
    "OpenStreetMap": osm,
    "Google Streets": googleStreets
  };

  let overlayMaps = {};
  L.control.layers(baseMaps, overlayMaps).addTo(map);

  // Set up event listeners for user interactions
  document.getElementById('add-city-btn').addEventListener('click', addCity);
  document.getElementById('city-input').addEventListener('keyup', function (event) {
    if (event.key === 'Enter') addCity();
  });
  document.getElementById('starting-city-select').addEventListener('change', startingCityChanged);
  document.getElementById('algorithm-select').addEventListener('change', function () {
    if (cities.length >= 2) {
      findRoute();
      compareAll();
    }
  });
  document.getElementById('find-route-btn').addEventListener('click', findRoute);
  document.getElementById('compare-btn').addEventListener('click', compareAll);
  document.getElementById('reset-btn').addEventListener('click', resetAll);
});

/**
 * Add a new city to the route optimizer.
 * Geocodes the city name, adds it to the cities array, and updates the UI.
 */
function addCity() {
  const cityInput = document.getElementById('city-input');
  const priority = parseInt(document.getElementById('priority-select').value);
  const cityName = cityInput.value.trim();
  
  if (!cityName) return;

  // Geocode city using Nominatim API
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1&addressdetails=1`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Priority-Based Flight Route Optimizer (Educational Project)',
      'Referrer-Policy': 'no-referrer-when-downgrade'
    }
  })
  .then(res => {
    if (!res.ok) {
      console.error('Response not OK:', res.status, res.statusText);
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  })
  .then(data => {
    if (data && data.length > 0) {
      const { lat, lon, display_name } = data[0];
      
      // Parse coordinates as floats
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);
      
      // Validate coordinates
      if (isNaN(latitude) || isNaN(longitude)) {
        throw new Error('Invalid coordinates received');
      }
      
      // Add new city to the array
      cities.push({
        id: nextCityId++,
        name: display_name,
        lat: latitude,
        lon: longitude,
        priority: priority
      });
      
      // Update UI
      cityInput.value = '';
      updateCityList();
      drawMarkers();
      
      // Zoom to the newly added city
      map.setView([latitude, longitude], 5);
      
      // Calculate route if we have enough cities
      if (cities.length >= 2) {
        findRoute();
        compareAll();
      }
    } else {
      alert('City not found. Please try a different city name.');
    }
  })
  .catch(error => {
    console.error('Error details:', error);
    alert('Error finding city. Please try a different city name or try again in a few seconds.');
  });
}

/**
 * Update the displayed list of cities and their priorities.
 * Also updates the starting city selection dropdown.
 */
function updateCityList() {
  const list = document.getElementById('city-list');
  list.innerHTML = '';
  cities.forEach((city) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span style="flex:1">${city.name} (Priority ${city.priority})</span>
      <select onchange="updatePriority(${city.id}, this.value)" value="${city.priority}">
        ${[1, 2, 3, 4, 5].map(p => `
          <option value="${p}" ${city.priority === p ? 'selected' : ''}>
            Priority ${p}${p === 1 ? ' (Highest)' : p === 5 ? ' (Lowest)' : ''}
          </option>
        `).join('')}
      </select>
      <input type="text" value="${city.name}" onchange="editCity(${city.id}, this.value)" />
      <button onclick="deleteCity(${city.id})">🗑</button>`;
    list.appendChild(li);
  });
  updateStartingCityOptions();
}

/**
 * Update a city's priority and recalculate routes.
 * @param {number} id - City ID
 * @param {string} newPriority - New priority value (1-5)
 */
function updatePriority(id, newPriority) {
  const city = cities.find(c => c.id === id);
  if (city) {
    city.priority = parseInt(newPriority);
    updateCityList();
    drawMarkers(); // Redraw markers to update tooltips
    if (cities.length >= 2) {
      findRoute();
      compareAll(); // Always show comparison
    }
  }
}

/**
 * Update the starting city selection dropdown.
 * Cities are sorted by priority for easier selection.
 */
function updateStartingCityOptions() {
  const startingSelect = document.getElementById('starting-city-select');
  const currentValue = startingSelect.value;  // Store current selection
  startingSelect.innerHTML = '<option value="">--None--</option>';
  const sortedCities = [...cities].sort((a, b) => a.priority - b.priority);
  sortedCities.forEach((city) => {
    const op = document.createElement("option");
    op.value = city.id;
    op.text = `${city.name} (Priority ${city.priority})`;
    startingSelect.appendChild(op);
  });
  // Restore previous selection if city still exists
  if (currentValue && cities.some(c => c.id.toString() === currentValue)) {
    startingSelect.value = currentValue;
  }
}

/**
 * Handle starting city selection change.
 * Recalculates routes when starting city is changed.
 */
function startingCityChanged() {
  if (cities.length >= 2) {
    findRoute();
    compareAll();
  }
}

/**
 * Edit a city's name and update its coordinates.
 * @param {number} id - City ID
 * @param {string} newName - New city name to geocode
 */
function editCity(id, newName) {
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${newName}`)
    .then(res => res.json())
    .then(data => {
      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const city = cities.find(c => c.id === id);
        if (city) {
          city.name = display_name;
          city.lat = parseFloat(lat);
          city.lon = parseFloat(lon);
          updateCityList();
          drawMarkers();
          if (cities.length >= 2) {
            findRoute();
            compareAll();
          }
        }
      } else {
        alert('City not found.');
      }
    });
}

/**
 * Delete a city and update routes.
 * @param {number} id - City ID to delete
 */
function deleteCity(id) {
  cities = cities.filter(city => city.id !== id);
  updateCityList();
  drawMarkers();
  if (cities.length >= 2) {
    findRoute();
    compareAll();
  } else {
    // Clear route and stats if less than 2 cities
    document.getElementById('route-output').innerText = "";
    document.getElementById('stats-output').innerText = "";
    if (routeLine) {
      map.removeLayer(routeLine);
      routeLine = null;
    }
    clearDistanceLabels();
    // Clear comparison table but keep it visible
    document.getElementById('comparison-table').innerHTML = "";
  }
}

/**
 * Clear all distance labels from the map.
 */
function clearDistanceLabels() {
  distanceLabels.forEach(label => map.removeLayer(label));
  distanceLabels = [];
}

/**
 * Draw or update city markers on the map.
 * @param {Object} algorithmStartingCity - City selected as start by algorithm
 */
function drawMarkers(algorithmStartingCity = null) {
  // Remove existing markers and distance labels
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  clearDistanceLabels();

  let selectedStartingId = document.getElementById('starting-city-select').value;
  selectedStartingId = selectedStartingId !== "" ? parseInt(selectedStartingId) : null;

  cities.forEach(city => {
    let iconToUse = defaultIcon;
    let isStarting = false;

    // Use red marker for user-selected starting city
    if (selectedStartingId !== null && selectedStartingId === city.id) {
      iconToUse = startingIcon;
      isStarting = true;
    }
    // Use red marker for algorithm-selected starting city if no user selection
    else if (selectedStartingId === null && algorithmStartingCity &&
      city.id === algorithmStartingCity.id) {
      iconToUse = startingIcon;
      isStarting = true;
    }

    const marker = L.marker([city.lat, city.lon], { icon: iconToUse }).addTo(map);

    // Add tooltip with city name, priority, and starting status
    const tooltipContent = `${city.name}<br>Priority: ${city.priority}${isStarting ? '<br><strong>Starting City</strong>' : ''}`;
    marker.bindTooltip(tooltipContent, {
      permanent: false,
      direction: 'top'
    });

    markers.push(marker);
  });
}

/**
 * Draw the calculated route on the map.
 * @param {Array} route - Array of cities in route order
 */
function drawRoute(route) {
  // Remove existing route and distance labels
  if (routeLine) {
    map.removeLayer(routeLine);
  }
  clearDistanceLabels();

  // Draw new route line
  const routeCoords = route.map(city => [city.lat, city.lon]);
  routeLine = L.polyline(routeCoords, { color: 'blue', weight: 3 }).addTo(map);

  // Add distance labels between consecutive cities
  for (let i = 0; i < route.length - 1; i++) {
    const city1 = route[i];
    const city2 = route[i + 1];
    const distance = getDistance(city1, city2).toFixed(2);

    // Calculate midpoint for label placement
    const midLat = (city1.lat + city2.lat) / 2;
    const midLon = (city1.lon + city2.lon) / 2;

    const label = L.marker([midLat, midLon], {
      icon: L.divIcon({
        className: 'distance-label',
        html: `${distance} km`
      })
    }).addTo(map);

    distanceLabels.push(label);
  }

  // Fit map bounds to show the entire route
  map.fitBounds(routeLine.getBounds());
}

/**
 * Calculate and display route using selected algorithm.
 */
async function findRoute() {
  if (cities.length < 2) {
    alert('Add at least two cities.');
    return;
  }
  
  const startingId = document.getElementById('starting-city-select').value;
  const algorithm = document.getElementById('algorithm-select').value;

  try {
    const response = await fetch(`${API_URL}/route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cities: cities,
        algorithm: algorithm,
        starting_city_id: startingId !== "" ? parseInt(startingId) : null
      })
    });

    const data = await response.json();

    if (data.error) {
      alert('Error: ' + data.error);
      return;
    }

    const { route, distance, time, starting_city } = data;

    // Create detailed route string with distances
    const detailedRoute = route.map((c, i) => {
      if (i < route.length - 1) {
        const d = getDistance(c, route[i + 1]).toFixed(2);
        return `${c.name} → (${d} km) → `;
      }
      return c.name;
    }).join('');

    document.getElementById('route-output').innerText = detailedRoute;
    document.getElementById('stats-output').innerText =
      `Total Distance: ${distance.toFixed(2)} km | Time Taken: ${time?.toFixed(2) || 'N/A'} ms`;

    drawRoute(route);
    // Pass the algorithm-selected starting city if no user selection
    drawMarkers(startingId === "" ? starting_city : null);
  } catch (error) {
    alert('Error connecting to the server. Please make sure the backend is running.');
  }
}

/**
 * Compare all available algorithms and display results.
 */
async function compareAll() {
  if (cities.length < 2) {
    alert('Add at least two cities.');
    return;
  }

  const startingId = document.getElementById('starting-city-select').value;
  const comparisonSection = document.getElementById('comparison-section');

  try {
    const response = await fetch(`${API_URL}/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cities: cities,
        starting_city_id: startingId !== "" ? parseInt(startingId) : null
      })
    });

    const results = await response.json();

    if (results.error) {
      alert('Error: ' + results.error);
      return;
    }

    // Always show the comparison section
    comparisonSection.style.display = 'block';

    const table = document.getElementById('comparison-table');
    table.innerHTML = '';

    results.forEach(result => {
      const row = `<tr>
        <td>${result.algorithm}</td>
        <td>${result.route.map(c => c.name).join(' → ')}</td>
        <td>${result.distance.toFixed(2)} km</td>
        <td>${result.time?.toFixed(2) || 'N/A'} ms</td>
        <td>${timeComplexity[result.algorithm.toLowerCase()]}</td>
      </tr>`;
      table.innerHTML += row;
    });

    // Show the route for the currently selected algorithm
    const currentAlgorithm = document.getElementById('algorithm-select').value.toUpperCase();
    const selectedResult = results.find(r => r.algorithm === currentAlgorithm);
    if (selectedResult) {
      drawRoute(selectedResult.route);
      // Pass the algorithm-selected starting city if no user selection
      drawMarkers(startingId === "" ? selectedResult.starting_city : null);
    }
  } catch (error) {
    alert('Error connecting to the server. Please make sure the backend is running.');
  }
}

/**
 * Calculate great circle distance between two cities.
 * @param {Object} a - First city with lat/lon
 * @param {Object} b - Second city with lat/lon
 * @returns {number} Distance in kilometers
 */
function getDistance(a, b) {
  const R = 6371; // Earth's radius in km
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const a2 = Math.sin(dLat / 2) ** 2 +
             Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
}

/**
 * Reset the application to its initial state.
 */
function resetAll() {
  cities = [];
  nextCityId = 0;
  updateCityList();
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  clearDistanceLabels();
  if (routeLine) {
    map.removeLayer(routeLine);
    routeLine = null;
  }
  document.getElementById('route-output').innerText = "";
  document.getElementById('stats-output').innerText = "";
  document.getElementById('comparison-table').innerHTML = "";
  document.getElementById('city-input').value = "";
  document.getElementById('priority-select').value = "1";
  document.getElementById('algorithm-select').value = "brute";

  // Clear comparison table but keep it visible
  document.getElementById('comparison-section').style.display = 'block';
}
