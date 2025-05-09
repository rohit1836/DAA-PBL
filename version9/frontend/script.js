let cities = [];
let nextCityId = 0;
let map, markers = [], routeLine;

// Define default (blue) and starting (red) marker icons.
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

window.onload = () => {
  map = L.map('map').setView([20.5937, 78.9629], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map);

  // Trigger "Add City" on Enter key press in the city input field.
  document.getElementById('city-input').addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
      addCity();
    }
  });
};

function addCity() {
  const cityInput = document.getElementById('city-input');
  const priority = parseInt(document.getElementById('priority-select').value);
  const cityName = cityInput.value.trim();
  
  if (!cityName) return;

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${cityName}`)
    .then(res => res.json())
    .then(data => {
      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        // Assign a unique id for each city.
        cities.push({
          id: nextCityId++,
          name: display_name,
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          priority: priority
        });
        cityInput.value = '';
        updateCityList();
        drawMarkers();
      } else {
        alert('City not found.');
      }
    });
}

function updateCityList() {
  const list = document.getElementById('city-list');
  list.innerHTML = '';
  cities.forEach((city) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span style="flex:1">${city.name} (Priority ${city.priority})</span>
      <input type="text" value="${city.name}" onchange="editCity(${city.id}, this.value)" />
      <button onclick="deleteCity(${city.id})">🗑</button>`;
    list.appendChild(li);
  });
  updateStartingCityOptions();
}

function updateStartingCityOptions() {
  const startingSelect = document.getElementById('starting-city-select');
  startingSelect.innerHTML = '<option value="">--None--</option>';
  // Sort cities by priority for the dropdown.
  const sortedCities = [...cities].sort((a, b) => a.priority - b.priority);
  sortedCities.forEach((city) => {
    const op = document.createElement("option");
    op.value = city.id;
    op.text = `${city.name} (Priority ${city.priority})`;
    startingSelect.appendChild(op);
  });
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
}

function drawMarkers() {
  // Remove any existing markers from the map.
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  let selectedStartingId = document.getElementById('starting-city-select').value;
  if (selectedStartingId !== "") {
    selectedStartingId = parseInt(selectedStartingId);
  }

  cities.forEach(city => {
    const iconToUse = (selectedStartingId !== undefined && selectedStartingId === city.id)
      ? startingIcon : defaultIcon;
    const marker = L.marker([city.lat, city.lon], { icon: iconToUse }).addTo(map);
    marker.bindPopup(`${city.name} (Priority ${city.priority})`);
    markers.push(marker);
  });
}

function findRoute() {
  // Sort cities by priority.
  let orderedCities = [...cities].sort((a, b) => a.priority - b.priority);

  if (orderedCities.length < 2) {
    alert('Add at least two cities.');
    return;
  }
  
  // If a starting city is chosen, reorder the array so that it comes first.
  const startingId = document.getElementById('starting-city-select').value;
  if (startingId !== "") {
    const startingCityId = parseInt(startingId);
    const index = orderedCities.findIndex(city => city.id === startingCityId);
    if (index !== -1) {
      const [startingCity] = orderedCities.splice(index, 1);
      orderedCities.unshift(startingCity);
    }
  }
  
  const startTime = performance.now();
  const { route, distance } = runAlgorithm(document.getElementById('algorithm-select').value, orderedCities);
  const timeTaken = (performance.now() - startTime).toFixed(2);

  // Create a detailed route string with intercity distances.
  const detailedRoute = route.map((c, i) => {
    if (i < route.length - 1) {
      const d = getDistance(c, route[i + 1]).toFixed(2);
      return `${c.name} → (${d} km) → `;
    } else {
      return c.name;
    }
  }).join('');

  document.getElementById('route-output').innerText = detailedRoute;
  document.getElementById('stats-output').innerText = `Total Distance: ${distance.toFixed(2)} km | Time Taken: ${timeTaken} ms`;

  // Display the selected route on the map.
  drawRoute(route);
  drawMarkers(); // Refresh the markers (this will no longer remove the drawn route).
}

function compareAll() {
  // Use the same sorted order for comparing algorithms.
  const orderedCitiesOriginal = [...cities].sort((a, b) => a.priority - b.priority);
  const table = document.getElementById('comparison-table');
  table.innerHTML = '';

  ['brute', 'dp', 'greedy'].forEach(algo => {
    let orderedCities = [...orderedCitiesOriginal];
    const startingId = document.getElementById('starting-city-select').value;
    if (startingId !== "") {
      const startingCityId = parseInt(startingId);
      const index = orderedCities.findIndex(city => city.id === startingCityId);
      if (index !== -1) {
        const [startingCity] = orderedCities.splice(index, 1);
        orderedCities.unshift(startingCity);
      }
    }
    const start = performance.now();
    const { route, distance } = runAlgorithm(algo, orderedCities);
    const timeTaken = (performance.now() - start).toFixed(2);

    const row = `<tr>
      <td>${algo.toUpperCase()}</td>
      <td>${route.map(c => c.name).join(' → ')}</td>
      <td>${distance.toFixed(2)} km</td>
      <td>${timeTaken}</td>
    </tr>`;
    table.innerHTML += row;
  });
}

function runAlgorithm(type, cities) {
  switch (type) {
    case 'brute': return bruteForce(cities);
    case 'dp': return dynamicProgramming(cities);
    case 'greedy': return nearestNeighbour(cities);
    default: return { route: [], distance: 0 };
  }
}

function bruteForce(cities) {
  return { route: cities, distance: computeDistance(cities) };
}

function dynamicProgramming(cities) {
  return { route: cities, distance: computeDistance(cities) };
}

function nearestNeighbour(cities) {
  const visited = [cities[0]];
  const unvisited = cities.slice(1);
  let current = cities[0];

  while (unvisited.length > 0) {
    let nearest = unvisited.reduce((closest, city) => {
      return getDistance(current, city) < getDistance(current, closest) ? city : closest;
    }, unvisited[0]);

    visited.push(nearest);
    unvisited.splice(unvisited.indexOf(nearest), 1);
    current = nearest;
  }
  return { route: visited, distance: computeDistance(visited) };
}

function computeDistance(route) {
  let dist = 0;
  for (let i = 0; i < route.length - 1; i++) {
    dist += getDistance(route[i], route[i + 1]);
  }
  return dist;
}

function getDistance(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const a2 = Math.sin(dLat / 2) ** 2 +
             Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
}

function drawRoute(route) {
  if (routeLine) {
    map.removeLayer(routeLine);
  }
  const latlngs = route.map(c => [c.lat, c.lon]);
  routeLine = L.polyline(latlngs, { color: 'blue' }).addTo(map);
  map.fitBounds(routeLine.getBounds());
}

function resetAll() {
  // Clear the cities array and reset the id counter.
  cities = [];
  nextCityId = 0;
  updateCityList();
  drawMarkers();
  document.getElementById('route-output').innerText = "";
  document.getElementById('stats-output').innerText = "";
  document.getElementById('comparison-table').innerHTML = "";
  if (routeLine) {
    map.removeLayer(routeLine);
    routeLine = null;
  }
}
