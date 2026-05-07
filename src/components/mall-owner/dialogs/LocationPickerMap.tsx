"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon issue
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Yerevan, Armenia coordinates
const YEREVAN_CENTER = { lat: 40.1872, lng: 44.5152 };

interface LocationPickerMapProps {
  position?: { lat: number; lng: number };
  onPositionChange: (position: { lat: number; lng: number }) => void;
}

export default function LocationPickerMap({
  position,
  onPositionChange,
}: LocationPickerMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use provided position or default to Yerevan
  const effectivePosition = position ?? YEREVAN_CENTER;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize map centered on Yerevan
    const map = L.map(containerRef.current, {
      center: [effectivePosition.lat, effectivePosition.lng],
      zoom: 15,
      zoomControl: true,
      attributionControl: false, // Disable attribution control
    });

    // Add Humanitarian OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      maxZoom: 22,
    }).addTo(map);

    // Add draggable marker
    const marker = L.marker([effectivePosition.lat, effectivePosition.lng], {
      icon: defaultIcon,
      draggable: true,
    }).addTo(map);

    // Handle marker drag
    marker.on("dragend", () => {
      const latlng = marker.getLatLng();
      onPositionChange({ lat: latlng.lat, lng: latlng.lng });
    });

    // Handle map click to move marker
    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onPositionChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapRef.current = map;
    markerRef.current = marker;

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Update marker position when prop changes (but not from drag)
  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      const currentPos = markerRef.current.getLatLng();
      // Only update if position actually changed (avoid loop from drag events)
      if (
        Math.abs(currentPos.lat - effectivePosition.lat) > 0.00001 ||
        Math.abs(currentPos.lng - effectivePosition.lng) > 0.00001
      ) {
        markerRef.current.setLatLng([effectivePosition.lat, effectivePosition.lng]);
        mapRef.current.setView([effectivePosition.lat, effectivePosition.lng], mapRef.current.getZoom());
      }
    }
  }, [effectivePosition.lat, effectivePosition.lng]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[300px]"
      style={{ zIndex: 0 }}
    />
  );
}
