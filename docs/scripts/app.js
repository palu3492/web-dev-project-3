

let app;

function init() {

    app = new Vue({
        el: "#app",
        data: {
            latitude: 44.94317442551431,
            longitude: -93.10775756835939,
            incidents: {},
            showTable: false,
            address: "",
            visibleNeighborhoods: [],
            neighborhoods: {},
            neighborhoodsOnMap: [],
            codes: {},
            neighborhoodMarkers: [],
            incidentMarkers: [],
            open: true,
            loaded: false
        },
        methods: {
            // When 'Go' is pressed
            changeLatLng: function() {
                // Move map to lat and lng with panning animation
                map.panTo([this.latitude, this.longitude]);
            },
            visible: function(neighborhoodNumber) {
                if(this.neighborhoodsOnMap.includes(neighborhoodNumber)){
                    this.neighborhoods[neighborhoodNumber].count += 1;
                    return true;
                }
                return false;
            },
            neighborhoodName: function(neighborhoodNumber) {
                return this.neighborhoods[neighborhoodNumber].name
            },
            incidentType: function(code) {
                return this.codes[code]
            },
            updateNeighborhoodsOnMap: function(){
                this.neighborhoodsOnMap = [];
                for(let n in this.neighborhoods) {
                    let bounds = map.getBounds();
                    let lat = this.neighborhoods[n].latitude;
                    let lng = this.neighborhoods[n].longitude;
                    if (lat > bounds._southWest.lat && lat < bounds._northEast.lat && lng > bounds._southWest.lng && lng < bounds._northEast.lng) {
                        this.neighborhoodsOnMap.push(parseInt(n));
                    }
                }
            },
            toggle: function () {
                this.open = !this.open;
            }
        }
    });

    createLeafletMap();
    setupNeighborhoods();
    getCodes();
    getIncidents();
}

let map;
function createLeafletMap(){
    let stPaulLatLng = [app.latitude, app.longitude]; // Latitude and longitude of St. Paul
    // Create map with custom settings
    map = L.map('map', {
        minZoom: 13,
        maxZoom: 17,
        maxBounds: [[44.875822, -92.984848],[44.99564, -93.229122]],
        center: stPaulLatLng,
        zoom: 13,
        zoomControl: false
    });
    // Set map layers to mapbox
    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 17,
        id: 'mapbox/streets-v11',
        accessToken: 'pk.eyJ1IjoiYWpwMCIsImEiOiJjazN4cGd4MGQxNW1hM3F0NnU5M3Jiem80In0.71DleDv1Fm-ArumkU37BjA', // token to use mapbox
    }).addTo(map);
    // Put zoom buttons in top right
    L.control.zoom({
        position:'topright'
    }).addTo(map);

    map.on('moveend', onMapChange); // Pan finished
    map.on('zoomend', onMapChange); // Zoom finished
    populateNeighborhoodMarkers();
    addBoundary();
}

function populateNeighborhoodMarkers()
{
    L.marker([44.956758, -93.015139]).addTo(map);//.bindPopup(commited[0]+'crimes commited').openPopup();
    L.marker([44.977519, -93.025290]).addTo(map);
    L.marker([44.931369, -93.082249]).addTo(map);
    L.marker([44.957164, -93.057100]).addTo(map);
    L.marker([44.978208, -93.069673]).addTo(map);
    L.marker([44.977405, -93.110969]).addTo(map);
    L.marker([44.960265, -93.118686]).addTo(map);
    L.marker([44.948581, -93.128205]).addTo(map);
    L.marker([44.931735, -93.119224]).addTo(map);
    L.marker([44.982860, -93.150844]).addTo(map);
    L.marker([44.962891, -93.167436]).addTo(map);
    L.marker([44.973546, -93.195991]).addTo(map);
    L.marker([44.948401, -93.174050]).addTo(map);
    L.marker([44.934301, -93.175363]).addTo(map);
    L.marker([44.911489, -93.172075]).addTo(map);
    L.marker([44.937493, -93.136353]).addTo(map);
    L.marker([44.950459, -93.096462]).addTo(map);
}

// When map is zoomed or panned set latitude and longitude inputs to where map is
function onMapChange(){
    let latLng = map.getCenter();
    app.latitude = latLng.lat;
    app.longitude = latLng.lng;
    updateAddress();
    filter();
}

function updateAddress(){
    let apiUrl = 'https://nominatim.openstreetmap.org/reverse?format=json&email=palu3492@stthomas.edu&lat='+app.latitude+'&lon='+app.longitude+'&zoom=18&addressdetails=1';
    $.getJSON(apiUrl)
        .then(data => {
            let addressParts = [];
            if(data.address.house_number) {
                addressParts.push(data.address.house_number);
            }
            if(data.address.road){
                addressParts.push(data.address.road);
            }
            if(addressParts.length > 0) {
                app.address = addressParts.join(' ');
            }else{
                app.address = 'No address';
            }
        })
}

// Puts polygon around St. Paul on map
function addBoundary(){
    // Polygon for St. Paul
    L.polygon([
        [44.987922, -93.207506],
        [44.991685, -93.005289],
        [44.891321, -93.004774],
        [44.919406, -93.050779],
        [44.919649, -93.128541],
        [44.887429, -93.173517],
        [44.909195, -93.202013]
    ], {fill: false, color: '#000'}).addTo(map);
}

function getIncidents(){
    let apiUrl = 'http://localhost:8000/incidents?start_date=2019-10-01&end_date=2019-10-31';
    $.getJSON(apiUrl)
        .then(data => {
            app.incidents = data;
        });
}

function getCodes(){
    let apiUrl = 'http://localhost:8000/codes';
    $.getJSON(apiUrl)
        .then(data => {
            for(let c in data){
                app.codes[c.substring(1)] = data[c];
            }
        });
}

function setupNeighborhoods(){
    // Get all neighborhoods names
    $.getJSON('http://localhost:8000/neighborhoods')
        .then(data => {
            let promises = [];
            // Loop through neighborhood names
            for(let i=1; i<=17; i++){
                app.neighborhoods[i] = {};
                app.neighborhoods[i].count = 0;
                let name = data['N'+i];
                app.neighborhoods[i].name = name; // match code to name
                // Get lat lng for each neighborhood
                // name = name.match(/([^\/-]+)/)[0];
                name = name.replace(/\//g, ', ');
                name = name.replace(/-/g, ', ');
                console.log(name);
                promises.push(getNeighborhoodLatLng(name)
                    .then(data => {
                        if(data.length > 0) {
                            app.neighborhoods[i].latitude = parseFloat(data[0].lat);
                            app.neighborhoods[i].longitude = parseFloat(data[0].lon);
                            // console.log(app.neighborhoods[i].latitude, app.neighborhoods[i].longitude)
                        }
                    })
                );
            }
            $.when(promises)
                .then(() => {
                    app.loaded = true;
                    filter();
                })
        });
}

// Get the latitude and longitude for neighborhood using neighborhood name
function getNeighborhoodLatLng(neighborhoodName){
    // neighborhood = 'Greater East Side'
    let country = 'United States',
        state = 'Minnesota',
        city = 'St. Paul';
    let apiUrl = 'https://nominatim.openstreetmap.org/search?format=json&email=palu3492@stthomas.edu&country='+country+'&state='+state+'&q='+neighborhoodName;
    // return promise
    return $.getJSON(apiUrl);
}

// Get the latitude and longitude for inputted address
function getLatLngFromAddress(address){
    // 495 Sherburne Ave
    let apiUrl = 'https://nominatim.openstreetmap.org/search?format=json&email=palu3492@stthomas.edu&country=United States&state=MN&city=St. Paul&street='+address;
    return $.getJSON(apiUrl)
}

function searchAddress(){
    getLatLngFromAddress(app.address)
        .then(data => {
            if(data.length > 0) {
                app.latitude = data[0].lat;
                app.longitude = data[0].lon;
                map.panTo([app.latitude, app.longitude]);
            } else {
                alert("Address '"+app.address+"' not found")
            }
        });
}

function addIncidentMarker(address){
    address = address.replace('X', '0');
    console.log(address);
    getLatLngFromAddress(address)
        .then(data => {
            if(data.length > 0) {
                let lat = data[0].lat;
                let lng = data[0].lon;
                let popup = L.popup({closeOnClick: false, autoClose: false}).setContent(address);
                let marker = L.marker([lat, lng], {title: address}).bindPopup(popup).addTo(map).openPopup();
                app.incidentMarkers.push(marker);
                map.panTo([lat, lng]);
            } else {
                alert("Address '"+address+"' not found");
            }
        });
}

function popupsForNeighborhoods(){
    app.neighborhoodMarkers.forEach(marker => {
        marker.remove();
    });
    for(let n in app.neighborhoods){
        if(app.neighborhoodsOnMap.includes(parseInt(n))){
            let latLng = [app.neighborhoods[n].latitude,  app.neighborhoods[n].longitude];
            let name = app.neighborhoods[n].name;
            let popup = L.popup({closeOnClick: false, autoClose: false}).setContent(name);
            let marker = L.marker(latLng, {title: name}).bindPopup(popup).addTo(map).openPopup();
            app.neighborhoodMarkers.push(marker);
        }
    }
}

function filter(){
    app.incidentMarkers.forEach(marker => {
        marker.remove();
    });
    app.updateNeighborhoodsOnMap();
    popupsForNeighborhoods();
}
