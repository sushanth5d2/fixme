import React, { useMemo, useRef, useEffect } from 'react';
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
  latitude: number | string;
  longitude: number | string;
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

  // Safely parse all coordinate numbers
  const validMarkers = useMemo(() => {
    return markers
      .map((m) => ({
        ...m,
        latitude: Number(m.latitude),
        longitude: Number(m.longitude),
      }))
      .filter(
        (m) =>
          !isNaN(m.latitude) &&
          !isNaN(m.longitude) &&
          m.latitude !== 0 &&
          m.longitude !== 0,
      );
  }, [markers]);

  const activeCenterLat = validMarkers.length > 0 ? (centerLat || validMarkers[0].latitude) : centerLat;
  const activeCenterLng = validMarkers.length > 0 ? (centerLng || validMarkers[0].longitude) : centerLng;

  // Dynamically update Leaflet markers without refreshing the WebView
  useEffect(() => {
    if (webViewRef.current && validMarkers.length > 0) {
      const script = `
        if (window.updateMarkers) {
          window.updateMarkers(${JSON.stringify(validMarkers)}, ${JSON.stringify(selectedMarkerId || '')});
        }
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [validMarkers, selectedMarkerId]);

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
    * { box-sizing: border-box; }
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      background: #E2E8F0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    
    /* Pin Point Marker with downward needle tip */
    .pin-anchor {
      position: relative;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .pin-bubble {
      display: flex;
      align-items: center;
      background: #FFFFFF;
      border: 2px solid #2563EB;
      border-radius: 20px;
      padding: 4px 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-weight: 700;
      font-size: 11px;
      white-space: nowrap;
      transition: transform 0.2s ease;
    }
    .pin-anchor.selected .pin-bubble {
      border-color: #EF4444;
      background: #FEF2F2;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.4), 0 6px 16px rgba(0,0,0,0.35);
      transform: scale(1.15);
    }
    .pin-needle {
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 8px solid #2563EB;
      margin-top: -1px;
    }
    .pin-anchor.selected .pin-needle {
      border-top-color: #EF4444;
      border-left-width: 8px;
      border-right-width: 8px;
      border-top-width: 10px;
    }
    .pin-pulse {
      width: 8px;
      height: 8px;
      background: rgba(37, 99, 235, 0.6);
      border-radius: 50%;
      margin-top: 2px;
    }
    .pin-anchor.selected .pin-pulse {
      background: rgba(239, 68, 68, 0.8);
      width: 10px;
      height: 10px;
    }
    .pin-icon {
      font-size: 14px;
      margin-right: 4px;
    }
    .pin-title {
      color: #0F172A;
      max-width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pin-badge {
      margin-left: 4px;
      padding: 1px 5px;
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
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 700;
      color: #1E293B;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      border: 1px solid #CBD5E1;
      cursor: pointer;
    }
    .recenter-btn {
      position: absolute;
      bottom: 20px;
      right: 12px;
      z-index: 999;
      background: #FFFFFF;
      border-radius: 50%;
      width: 42px;
      height: 42px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.25);
      border: 1px solid #CBD5E1;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <button class="layer-control-btn" id="layerBtn" onclick="toggleMapLayer()">🛰️ Satellite</button>
  <button class="recenter-btn" onclick="fitAllMarkers()">🎯</button>

  <script>
    var currentMarkers = ${markersJson};
    var currentSelectedId = ${selectedIdStr};
    var isSatellite = false;

    // High quality street tiles
    var streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    });

    // Satellite layer
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

    function renderPins(markers, selId) {
      markerGroup.clearLayers();
      var bounds = [];

      markers.forEach(function(m) {
        if (!m.latitude || !m.longitude || isNaN(m.latitude) || isNaN(m.longitude)) return;
        bounds.push([m.latitude, m.longitude]);

        var isSelected = m.id === selId;
        var badgeHtml = m.badge
          ? '<span class="pin-badge" style="background:' + (m.badgeBg || '#EFF6FF') + ';color:' + (m.badgeColor || '#2563EB') + '">' + m.badge + '</span>'
          : '';

        var html = '<div class="pin-anchor ' + (isSelected ? 'selected' : '') + '">' +
          '<div class="pin-bubble">' +
          (m.icon ? '<span class="pin-icon">' + m.icon + '</span>' : '📍 ') +
          '<span class="pin-title">' + (m.title || 'Location') + '</span>' +
          badgeHtml +
          '</div>' +
          '<div class="pin-needle"></div>' +
          '<div class="pin-pulse"></div>' +
          '</div>';

        // Pin anchor points right at bottom center
        var customIcon = L.divIcon({
          html: html,
          className: '',
          iconSize: [140, 44],
          iconAnchor: [70, 44]
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
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], ${initialZoom});
      }
    }

    window.updateMarkers = function(markers, selId) {
      currentMarkers = markers;
      currentSelectedId = selId;
      renderPins(currentMarkers, currentSelectedId);
    };

    function fitAllMarkers() {
      if (currentMarkers.length > 0) {
        var bounds = currentMarkers.map(function(m) { return [m.latitude, m.longitude]; });
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      } else {
        map.setView([${activeCenterLat}, ${activeCenterLng}], ${initialZoom});
      }
    }

    // Initial render
    renderPins(currentMarkers, currentSelectedId);
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
