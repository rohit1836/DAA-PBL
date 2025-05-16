let cities = [];
let nextCityId = 0;
let map, markers = [], routeLine, distanceLabels = [];

// Use relative path for API endpoints since we're serving from the same server
const API_URL = '/api';

// Time complexity mapping
const timeComplexity = {
  'brute': 'O(n!)',
  'dp': 'O(n²2ⁿ)',
  'greedy': 'O(n²)'
};

// Define default (blue), starting (red), and current (green) marker icons
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
  // Initialize map
  map = L.map('map').setView([20.5937, 78.9629], 5);
  let osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  });

  let googleStreets = L.tileLayer('http://{s}.google.com/vt?lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
  });
  googleStreets.addTo(map);

  let baseMaps = {
    "OpenStreetMap": osm,
    "Google Streets": googleStreets
  };

  let overlayMaps = {
  };

  L.control.layers(baseMaps, overlayMaps).addTo(map);

  // Set up event listeners
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

function addCity() {
  const cityInput = document.getElementById('city-input');
  const priority = parseInt(document.getElementById('priority-select').value);
  const cityName = cityInput.value.trim();
  
  if (!cityName) return;

  // Add proper headers and parameters for Nominatim
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
      
      cities.push({
        id: nextCityId++,
        name: display_name,
        lat: latitude,
        lon: longitude,
        priority: priority
      });
      
      cityInput.value = '';
      updateCityList();
      drawMarkers();
      
      // Zoom to the newly added city
      map.setView([latitude, longitude], 5);
      
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

function startingCityChanged() {
  if (cities.length >= 2) {
    findRoute();
    compareAll();  // Always update comparison table
  }
}

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
            compareAll();  // Always update comparison table
          }
        }
      } else {
        alert('City not found.');
      }
    });
}

function deleteCity(id) {
  cities = cities.filter(city => city.id !== id);
  updateCityList();
  drawMarkers();
  if (cities.length >= 2) {
    findRoute();
    compareAll();  // Always update comparison table
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

function clearDistanceLabels() {
  distanceLabels.forEach(label => map.removeLayer(label));
  distanceLabels = [];
}

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

    // Create detailed route string
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
