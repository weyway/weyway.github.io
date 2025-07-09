// Leaflet Game Map Initialization with Grouped Layers

document.addEventListener("DOMContentLoaded", () => {
    console.log("Script started");
    document.querySelectorAll('.leaflet-map').forEach(async (mapEl) => {
        const id = mapEl.id;
        const configUrl = mapEl.dataset.config;
        if (!configUrl) return;

        // 1) FETCH CONFIG JSON
        let config = {};
        try {
            const res = await fetch(configUrl);
            config = await res.json();
        } catch (err) {
            console.error("Failed to load map config:", err);
            return;
        }

        // 2) SETUP MAP & BOUNDS
        const [[minY, minX], [maxY, maxX]] = config.bounds;
        const bounds = [[minY, minX], [maxY, maxX]];

        const map = L.map(id, {
            crs: L.CRS.Simple,
            zoomControl: true,
            scrollWheelZoom: true,
            doubleClickZoom: false,
            gestureHandling: true,
            minZoom: 3,
            maxZoom: 6,
            zoomSnap: 1,
            zoomDelta: 1,
            zoom: 4,
        });

        if (config.baseLayers?.[0]) {
            L.imageOverlay(config.baseLayers[0].image, bounds).addTo(map);
        }
        map.fitBounds(bounds);

        // 3) LOAD MULTI-PIECE POLYGON OVERLAYS
    const overlayPolygonLayers = {};

    (config.overlays || []).forEach(group => {
    const overlayGroup = L.layerGroup();

    (group.overlays || []).forEach(piece => {
        // Remove filtering by enabled here for testing
        // if (!piece.enabled) return;

        let correctedCoords;

        if (Array.isArray(piece.polycoords[0][0])) {
            // Donut polygon (multiple rings: first is outer, rest are holes)
            correctedCoords = piece.polycoords.map(ring =>
                ring.map(([x, y]) => [maxY + minY - y, x])
            );
            console.log("Donut polygon:", correctedCoords);
        } else {
            // Simple polygon
            correctedCoords = piece.polycoords.map(([x, y]) => [maxY + minY - y, x]);
            console.log("Simple polygon:", correctedCoords);
        }

const polygon = L.polygon(correctedCoords, {
    color: piece.color || '#FFFFFF',
    fillColor: piece.color || '#FFFFFF',
    weight: 2,
    fillOpacity: 0.4
});


        if (piece.popup) polygon.bindPopup(piece.popup);
        if (piece.text) {
            if (piece.tooltipPos) {
                const [x, y] = piece.tooltipPos;
                const lat = maxY + minY - y;
                const lng = x;

                const tooltip = L.tooltip({
                    permanent: true,
                    direction: 'top',
                    className: 'custom-polygon-label'
                })
                .setContent(piece.text)
                .setLatLng([lat, lng]);

                tooltip.addTo(overlayGroup);
            } else {
                polygon.bindTooltip(piece.text, {
                    permanent: true,
                    direction: 'top'
                });
            }
        }

        overlayGroup.addLayer(polygon);
    });

    overlayPolygonLayers[group.name] = overlayGroup;

    if (group.enabled) {
        map.addLayer(overlayGroup);
    }
    });

/*     // LEAFLET DRAW

    // Add FeatureGroup to hold drawn items
        const drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);

// Add the draw control and pass the FeatureGroup of editable layers
        const drawControl = new L.Control.Draw({
        edit: {
            featureGroup: drawnItems,
            edit: false,
            remove: false
        },
        draw: {
            polygon: false,
            polyline: false,
            rectangle: false,
            circle: false,
            marker: false,
            circlemarker: false
        }
        });
        map.addControl(drawControl);

// Handle creation of new polygons
        map.on('draw:created', function (e) {
        const layer = e.layer;
        drawnItems.addLayer(layer);

  // Get LatLng array of polygon points
        const latlngs = layer.getLatLngs()[0]; // Assuming simple polygon (one ring)

  // Convert Leaflet LatLng (lat, lng) to your map coords: [x, y]
  // Your map: x = lng, y = maxY + minY - lat
        const coords = latlngs.map(({lat, lng}) => [lng, maxY + minY - lat]);

        console.log('Polygon coords in map coordinates:', coords);
        }); */


        // 4) LAYER GROUPS + SUBGROUPS + MARKERS
        const groupedOverlays = {};

        if (Array.isArray(config.layerGroups) && config.layerGroups.length > 0) {
            config.layerGroups.forEach(group => {
                // Parent group is a LayerGroup holding subgroups
                const parentLayerGroup = L.layerGroup();
                groupedOverlays[group.name] = parentLayerGroup;

                group.subgroups.forEach(subgroup => {
                    // Subgroup LayerGroup
                    const subgroupLayerGroup = L.layerGroup();

                    // Add markers enabled:true only
                    (subgroup.markers || []).forEach(markerDef => {
                        if (markerDef.enabled === false) return; // skip disabled markers

                        const lat = maxY + minY - markerDef.pos[1];
                        const lng = markerDef.pos[0];
                        const latlng = [lat, lng];

                        const icon = L.icon({
                            iconUrl: markerDef.icon,
                            iconSize: [32, 32],
                            iconAnchor: [16, 16],
                            popupAnchor: [0, -16]
                        });

                        const marker = L.marker(latlng, { icon });
                        if (markerDef.popup) {
                            marker.bindPopup(markerDef.popup);
                        }
                        if ("name" in markerDef && markerDef.name) {
                            marker.bindTooltip(markerDef.name, { permanent: true, direction: 'top' });
                        }
                        marker.addTo(subgroupLayerGroup);
                    });

                    // Add subgroup to parent group
                    subgroupLayerGroup.addTo(parentLayerGroup);

                    // Add subgroup layer to map if enabled
                    if (subgroup.enabled) {
                        subgroupLayerGroup.addTo(map);
                    } else {
                        // Remove from map if disabled
                        map.removeLayer(subgroupLayerGroup);
                    }

                    // Store subgroup LayerGroup for control
                    if (!groupedOverlays[subgroup.name]) {
                        groupedOverlays[subgroup.name] = subgroupLayerGroup;
                    }
                });

                // Add parent group to map initially (we control visibility via subgroups)
                // Do NOT add parentLayerGroup to map, or the subgroups would always be visible twice
                // Instead, toggle subgroups on/off for showing/hiding
            });
        } else {
            // Fallback: flat markers array without grouping
            const markerLayers = {};
            (config.markers || []).forEach(m => {
                if (m.enabled === false) return;
                const layerName = m.layer || "Markers";
                if (!markerLayers[layerName]) markerLayers[layerName] = L.layerGroup();

                const lat = maxY + minY - m.pos[1];
                const lng = m.pos[0];
                const latlng = [lat, lng];

                const icon = L.icon({
                    iconUrl: m.icon,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                    popupAnchor: [0, -16]
                });

                L.marker(latlng, { icon })
                    .bindPopup(m.popup || "")
                    .addTo(markerLayers[layerName]);
            });
            Object.entries(markerLayers).forEach(([name, layer]) => {
                layer.addTo(map);
                groupedOverlays[name] = layer;
            });
        }

        // 5) COORDINATES DISPLAY
        let coordDiv;
        const coordsControl = L.control({ position: 'bottomleft' });
        coordsControl.onAdd = () => {
            coordDiv = L.DomUtil.create('div', 'coords-control');
            coordDiv.innerHTML = 'Move cursor';
            return coordDiv;
        };
        coordsControl.addTo(map);
        map.on('mousemove', e => {
            const gx = e.latlng.lng;
            const gy = maxY + minY - e.latlng.lat;
            coordDiv.innerHTML = `X:${gx.toFixed(2)}, Y:${gy.toFixed(2)}`;
        });
        map.on('mouseout', () => { coordDiv.innerHTML = 'Move cursor'; });

        // 6) CREATE NESTED LAYER CONTROL
        // Use leaflet.groupedlayercontrol plugin (make sure it's included)
        if (Array.isArray(config.layerGroups) && config.layerGroups.length > 0) {
            const overlaysForControl = {};
            config.layerGroups.forEach(group => {
                // Prepare object of subgroup name -> LayerGroup for this parent
                const subgroupsObj = {};
                group.subgroups.forEach(subgroup => {
                    if (groupedOverlays[subgroup.name]) {
                        subgroupsObj[subgroup.name] = groupedOverlays[subgroup.name];
                    }
                });
                overlaysForControl[group.name] = subgroupsObj;
            });
            console.log("overlayPolygonLayers:", overlayPolygonLayers);
            const groupedControl = L.control.groupedLayers({},
                {
                    "Overlays": overlayPolygonLayers,
                    ...overlaysForControl
                },
                {
                    collapsed: false,
                    groupCheckboxes: true
                }
            );
            groupedControl.addTo(map);

            // 7) TOGGLE PARENT GROUP TOGGLE ALL SUBGROUPS
            // Add click handler for parent groups in the control to toggle all subgroups at once
            // Note: The groupedLayers plugin doesn't provide events for group toggles by default,
            // so we hack by hooking checkbox changes in DOM.

            // Wait a bit to let control render
            setTimeout(() => {
                const controlEl = document.querySelector('.leaflet-control-layers-group');
                if (!controlEl) return;

                // Parent groups have label > input checkbox
                config.layerGroups.forEach(group => {
                    // Find input checkbox matching the parent group name
                    const label = Array.from(controlEl.querySelectorAll('label')).find(l => l.textContent.trim() === group.name);
                    if (!label) return;
                    const checkbox = label.querySelector('input[type="checkbox"]');
                    if (!checkbox) return;

                    checkbox.addEventListener('change', (e) => {
                        const checked = e.target.checked;

                        // Toggle all subgroup layers accordingly
                        group.subgroups.forEach(subgroup => {
                            const layer = groupedOverlays[subgroup.name];
                            if (!layer) return;

                            if (checked) {
                                if (!map.hasLayer(layer)) map.addLayer(layer);
                            } else {
                                if (map.hasLayer(layer)) map.removeLayer(layer);
                            }

                            // Also update subgroup checkboxes in control to stay in sync
                            // Find subgroup checkbox input and set checked state
                            const subLabel = Array.from(controlEl.querySelectorAll('label')).find(l => l.textContent.trim() === subgroup.name);
                            if (subLabel) {
                                const subCheckbox = subLabel.querySelector('input[type="checkbox"]');
                                if (subCheckbox) subCheckbox.checked = checked;
                            }
                        });
                    });
                });
            }, 100);
        } else {
            // Fallback flat control
            const overlays = Object.assign({}, overlayImageLayers, groupedOverlays);
            const control = L.control.layers(null, overlays, { collapsed: false });
            control.addTo(map);
        }

        // 8) LAYER MENU TOGGLE BUTTON (optional)
        const controlContainer = mapEl.querySelector('.leaflet-control-layers');
        if (controlContainer) {
            controlContainer.classList.add('leaflet-layer-control');

            const toggleBtn = L.DomUtil.create('button', 'layer-toggle-btn');
            toggleBtn.innerText = 'Layers';
            L.DomEvent.on(toggleBtn, 'click touchstart', (e) => {
                L.DomEvent.stopPropagation(e);
                controlContainer.classList.toggle('open');
            });
            mapEl.appendChild(toggleBtn);

            controlContainer.querySelectorAll('a').forEach(link => {
                link.removeAttribute('href');
                link.addEventListener('click', e => { e.preventDefault(); link.blur(); });
            });
        }
    });
});




// Basic styles (inject to <head> or include in CSS file)
const style = document.createElement('style');
style.textContent = `
/* LEAFLET MAP */

/* Container */
.leaflet-control-layers {
box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5) !important;
border: none !important;
background: var(--page-bg);
border-radius: 4px;
padding: 5px;
}

/* Header toggle button (the little layers icon) */
.leaflet-control-layers-toggle {
background-image: none;
padding: 0.5em;
}

/* Expanded list */
.leaflet-control-layers-list {
padding: 0.75em;
max-height: 400px;
overflow-y: auto;
background: var(--page-bg) !important;
color: var(--headings-color) !important;
box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5) !important;
border-radius: 4px;
}

.leaflet-control-layers-expanded{
padding: 0em !important;
}

/* Scrollbar styling */
.leaflet-control-layers-list::-webkit-scrollbar {
width: 6px;
}
.leaflet-control-layers-list::-webkit-scrollbar-thumb {
background: rgba(0,0,0,0.2);
border-radius: 3px;
}

/* Each layer entry */
.leaflet-control-layers-list label {
display: flex;
align-items: center;
margin: 0.5em 0em 0.5em 0.5em;
cursor: pointer;
color: var(--headings-color) !important;
padding: 2px !important;
}

/* Hover effect on labels */
.leaflet-control-layers-list label:hover,
.leaflet-control-layers label:hover {
background-color: var(--logo-color);
color: var(--page-bg) !important;
border-radius: 4px;
padding: 2px !important;
}

/* Inputs (checkbox/radio) */
.leaflet-control-layers-selector input,
.leaflet-control-layers input[type="checkbox"],
.leaflet-control-layers input[type="radio"] {
margin-right: 0.5em !important;
accent-color: var(--headings-color) !important;
opacity: 1 !important;
visibility: visible !important;
position: relative;
z-index: 10;
}

/* Text label */
.leaflet-control-layers-name {
flex: 1;
line-height: 1.2;
}

/* Container */
.leaflet-container {
z-index: 0;
background: var(--map) !important;
}

/* Coords */
.coords-control {
background-color: var(--page-bg);
padding: 5px;
border-radius: 4px;
box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5) !important;
}

/* zoom buttons */
.leaflet-control-zoom {
background: var(--page-bg);
box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5)!important;
border: none !important;
border-radius: 4px !important;
padding: 0.5em;
}
.leaflet-control-zoom a {
background: var(--page-bg);
color: var(--headings-color);
border-radius: 4px;
border: 1px solid transparent;
padding: 4px 8px;
margin: 2px 0;
text-decoration: none !important;
display: block;
}
.leaflet-control-zoom a:hover {
background: var(--logo-color);
color: var(--page-bg);
border-color: var(--logo-color);
}
.leaflet-control-zoom a.leaflet-disabled, .leaflet-control-zoom a:focus {
color: #888 !important;
background: var(--page-bg) !important;
border: 0px solid #ccc !important;
cursor: not-allowed;
}

.layer-toggle-btn, .layer-toggle-btn:focus {
position: absolute;
top: 10px;
right: 10px;
z-index: 1000;
background: var(--page-bg);
    color: var(--color);
border: 0px solid var(--color);
padding: 5px 10px;
cursor: pointer;
display: none;
}

.layer-toggle-btn:hover {
background: var(--logo-color);
color: var(--page-bg);
border-color: var(--logo-color);
    color: var(--color);
}

.leaflet-layer-control {
display: block;
}

@media (max-width: 1200px) {
.layer-toggle-btn {
display: block;
}

.leaflet-layer-control {
display: none;
position: absolute !important;
top: 50px;
right: 10px;
background: var(--page-bg);
border-radius: 4px;
padding: 10px;
box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
z-index: 1000;
}
.leaflet-layer-control.open {
display: block;
}
}

/* Indent only layers that are not grouped under a visible group label */
.leaflet-control-layers-group-label {
margin-left: 0em !important;
}

/* Hide parent group checkboxes in the grouped layers control */
.leaflet-control-layers-group-selector {
  display: none !important;
}

.leaflet-touch .leaflet-bar a {
	width: 30px;
	height: 30px;
	line-height: 20px;
	padding-left: 7px;
	}
;`
document.head.appendChild(style);
