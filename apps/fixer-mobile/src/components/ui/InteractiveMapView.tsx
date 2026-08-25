import React, { useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Linking,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../theme/tokens';

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  subtitle?: string;
  icon?: string;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
  urgency?: string;
  data?: any;
}

interface InteractiveMapViewProps {
  markers?: MapMarker[];
  centerLat?: number;
  centerLng?: number;
  initialZoom?: number;
  onMarkerPress?: (marker: MapMarker) => void;
  selectedMarkerId?: string | null;
  height?: number | string;
  showNavigationButton?: boolean;
  style?: any;
}

export function InteractiveMapView({
  markers = [],
  centerLat = 12.9716,
  centerLng = 77.5946,
  initialZoom = 13,
  onMarkerPress,
  selectedMarkerId,
  showNavigationButton = true,
  style,
}: InteractiveMapViewProps) {
  const webViewRef = useRef<WebView>(null);

  // Determine initial center
  const validMarkers = useMemo(() => {
    return markers.filter(
      (m) =>
        typeof m.latitude === 'number' &&
        typeof m.longitude === 'number' &&
        !isNaN(m.latitude) &&
        !isNaN(m.longitude) &&
        m.latitude !== 0 &&
        m.longitude !== 0,
    );
  }, [markers]);

  const activeCenterLat = validMarkers.length > 0 ? (centerLat || validMarkers[0].latitude) : centerLat;
  const activeCenterLng = validMarkers.length > 0 ? (centerLng || validMarkers[0].longitude) : centerLng;

  const htmlContent = useMemo(() => {
    const markersJson = JSON.stringify(validMarkers);
    const selectedIdStr = JSON.stringify(selectedMarkerId || '');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      background: #F3F4F6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .custom-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #FFFFFF;
      border: 2.5px solid #2563EB;
      border-radius: 20px;
      padding: 3px 8px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.25);
      font-weight: 700;
      font-size: 11px;
      white-space: nowrap;
      cursor: pointer;
      transform: translate(-50%, -50%);
    }
    .custom-marker.selected {
      border-color: #EF4444;
      background: #FEF2F2;
      transform: translate(-50%, -50%) scale(1.15);
      z-index: 1000 !important;
    }
    .marker-icon {
      font-size: 14px;
      margin-right: 4px;
    }
    .marker-title {
      color: #0F172A;
      max-width: 90px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .marker-badge {
      margin-left: 4px;
      padding: 1px 4px;
      border-radius: 6px;
      font-size: 9px;
    }
    .layer-control-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 999;
      background: #FFFFFF;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 600;
      color: #1E293B;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      border: 1px solid #E2E8F0;
      cursor: pointer;
    }
    .recenter-btn {
      position: absolute;
      bottom: 20px;
      right: 12px;
      z-index: 999;
      background: #FFFFFF;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      border: 1px solid #CBD5E1;
      cursor: pointer;
    }
    .leaflet-popup-content-wrapper {
      border-radius: 12px;
      padding: 4px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.2);
    }
    .popup-title {
      font-size: 13px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 2px;
    }
    .popup-sub {
      font-size: 11px;
      color: #64748B;
      margin-bottom: 6px;
    }
    .popup-btn {
      background: #2563EB;
      color: #FFFFFF;
      border: none;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <button class="layer-control-btn" id="layerBtn" onclick="toggleMapLayer()">🛰️ Satellite</button>
  <button class="recenter-btn" onclick="fitAllMarkers()">🎯</button>

  <script>
    var markersData = ${markersJson};
    var selectedMarkerId = ${selectedIdStr};
    var isSatellite = false;

    // Street Layer (OpenStreetMap / CartoDB)
    var streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    });

    // Satellite Layer (Esri World Imagery)
    var satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri'
    });

    var map = L.map('map', {
      center: [${activeCenterLat}, ${activeCenterLng}],
      zoom: ${initialZoom},
      zoomControl: true,
      layers: [streetLayer]
    });

    var markerGroup = L.featureGroup().addTo(map);

    function toggleMapLayer() {
      if (isSatellite) {
        map.removeLayer(satelliteLayer);
        map.addLayer(streetLayer);
        document.getElementById('layerBtn').innerHTML = '🛰️ Satellite';
        isSatellite = false;
      } else {
        map.removeLayer(streetLayer);
        map.addLayer(satelliteLayer);
        document.getElementById('layerBtn').innerHTML = '🗺️ Street';
        isSatellite = true;
      }
    }

    function renderMarkers() {
      markerGroup.clearLayers();
      var bounds = [];

      markersData.forEach(function(m) {
        if (!m.latitude || !m.longitude) return;
        bounds.push([m.latitude, m.longitude]);

        var isSelected = m.id === selectedMarkerId;
        var badgeHtml = m.badge
          ? '<span class="marker-badge" style="background:' + (m.badgeBg || '#EFF6FF') + ';color:' + (m.badgeColor || '#2563EB') + '">' + m.badge + '</span>'
          : '';

        var html = '<div class="custom-marker ' + (isSelected ? 'selected' : '') + '">' +
          (m.icon ? '<span class="marker-icon">' + m.icon + '</span>' : '📍 ') +
          '<span class="marker-title">' + (m.title || 'Location') + '</span>' +
          badgeHtml +
          '</div>';

        var customIcon = L.divIcon({
          html: html,
          className: '',
          iconSize: [120, 30],
          iconAnchor: [60, 15]
        });

        var marker = L.marker([m.latitude, m.longitude], { icon: customIcon });

        marker.on('click', function() {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MARKER_CLICK', marker: m }));
          }
        });

        markerGroup.addLayer(marker);
      });

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    }

    function fitAllMarkers() {
      if (markersData.length > 0) {
        var bounds = markersData.map(function(m) { return [m.latitude, m.longitude]; });
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      } else {
        map.setView([${activeCenterLat}, ${activeCenterLng}], ${initialZoom});
      }
    }

    renderMarkers();
  </script>
</body>
</html>
    `;
  }, [validMarkers, selectedMarkerId, activeCenterLat, activeCenterLng, initialZoom]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MARKER_CLICK' && onMarkerPress) {
        onMarkerPress(data.marker);
      }
    } catch {}
  };

  const handleOpenNativeMaps = () => {
    const lat = activeCenterLat;
    const lng = activeCenterLng;
    const label = encodeURIComponent('Customer Location');
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
    Linking.openURL(url || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef as any}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webView as any}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={handleMessage}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.loadingText}>Loading Street Maps...</Text>
          </View>
        )}
      />

      {showNavigationButton && (
        <TouchableOpacity
          style={styles.googleMapsBtn}
          onPress={handleOpenNativeMaps}
          activeOpacity={0.85}
        >
          <Text style={styles.googleMapsIcon}>🗺️</Text>
          <Text style={styles.googleMapsText}>Open in Google Maps</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    position: 'relative',
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.sm,
    fontSize: FontSize.xs,
    color: Colors.muted,
    fontWeight: FontWeight.semibold,
  },
  googleMapsBtn: {
    position: 'absolute',
    bottom: Spacing.base,
    left: Spacing.base,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 999,
  },
  googleMapsIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  googleMapsText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
});
