import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import WebView from 'react-native-webview';
import { C, R } from '../theme';

export interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
  color?: string;
}

/**
 * Peta ringan berbasis Leaflet di dalam WebView.
 * Berjalan di Android, iOS, dan Web (butuh internet untuk memuat tile OSM).
 */
export function LeafletMap({
  polyline,
  markers = [],
  height = 220,
  center,
  zoom = 14,
}: {
  polyline?: Array<{ lat: number; lng: number }>;
  markers?: MapMarker[];
  height?: number;
  center?: { lat: number; lng: number };
  zoom?: number;
}) {
  const data = {
    polyline: polyline ?? [],
    markers,
    center: center ?? polyline?.[0] ?? markers[0] ?? { lat: -6.2, lng: 106.816666 },
    zoom,
    fit: (polyline?.length ?? 0) > 1 || markers.length > 1,
  };
  const json = JSON.stringify(data).replace(/</g, '\\u003c');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#m{height:100%;margin:0;padding:0}</style></head>
<body><div id="m"></div><script>
var D=${json};
var map=L.map('m',{zoomControl:false,attributionControl:false});
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
D.markers.forEach(function(mk){
  L.circleMarker([mk.lat,mk.lng],{radius:7,color:'#FFFFFF',weight:2,fillColor:mk.color||'${C.accent}',fillOpacity:1})
   .addTo(map).bindTooltip(mk.label||'',{permanent:false,direction:'top'});
});
if(D.polyline.length>1){
  L.polyline(D.polyline.map(function(p){return [p.lat,p.lng];}),{color:'${C.primary}',weight:4,opacity:.9}).addTo(map);
}
if(D.fit){
  var b=[];D.markers.forEach(function(mk){b.push([mk.lat,mk.lng]);});
  D.polyline.forEach(function(p){b.push([p.lat,p.lng]);});
  map.fitBounds(b,{padding:[24,24]});
}else{
  map.setView([D.center.lat,D.center.lng],D.zoom);
}
</script></body></html>`;

  return (
    <View style={{ height, borderRadius: R.card, overflow: 'hidden', backgroundColor: C.border }}>
      <WebView
        source={{ html }}
        style={StyleSheet.absoluteFill}
        originWhitelist={['*']}
        scrollEnabled={false}
        startInLoadingState
        renderLoading={() => (
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <ActivityIndicator color={C.primary} />
          </View>
        )}
      />
    </View>
  );
}

/** Placeholder peta ketika koordinat belum tersedia */
export function MapPlaceholder({ height = 120, text }: { height?: number; text: string }) {
  return (
    <View
      style={{
        height,
        borderRadius: 12,
        backgroundColor: C.divider,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: C.muted }}>{text}</Text>
    </View>
  );
}

export const Touchable = TouchableOpacity;
