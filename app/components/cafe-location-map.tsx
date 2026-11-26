"use client"

import "leaflet/dist/leaflet.css"
import { useEffect } from "react"
import L from "leaflet"
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet"

type Point = { lat: number; lng: number }

// A CSS pin, so no marker image assets are needed.
const pin = L.divIcon({
  className: "",
  html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:hsl(var(--primary));border:2px solid #fff;box-shadow:0 2px 6px rgb(0 0 0 / .5)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
})

function Follow({ point }: { point: Point | null }) {
  const map = useMap()
  useEffect(() => { if (point) map.setView([point.lat, point.lng], Math.max(map.getZoom(), 16)) }, [map, point])
  return null
}

function ClickToMove({ onChange }: { onChange: (p: Point) => void }) {
  useMapEvents({ click: e => onChange({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

export default function CafeLocationMap({ point, fallback, onChange }: {
  point: Point | null
  fallback: Point
  onChange: (p: Point) => void
}) {
  const center = point || fallback
  return (
    <div className="relative z-0 h-72 overflow-hidden rounded-lg border">
      <MapContainer center={[center.lat, center.lng]} zoom={point ? 16 : 5} scrollWheelZoom className="h-full w-full">
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickToMove onChange={onChange} />
        <Follow point={point} />
        {point && (
          <Marker
            position={[point.lat, point.lng]}
            icon={pin}
            draggable
            eventHandlers={{ dragend: e => { const ll = (e.target as L.Marker).getLatLng(); onChange({ lat: ll.lat, lng: ll.lng }) } }}
          />
        )}
      </MapContainer>
    </div>
  )
}
