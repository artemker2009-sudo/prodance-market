'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'

type Coordinates = {
  latitude: number
  longitude: number
}

type LocationPickerMapProps = {
  latitude: number | null
  longitude: number | null
  onChange: (coords: Coordinates) => void
}

const MOSCOW_CENTER: [number, number] = [55.751244, 37.618423]

function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true })
  }, [center, map])

  return null
}

function MapClickHandler({ onChange }: { onChange: (coords: Coordinates) => void }) {
  useMapEvents({
    click(event) {
      onChange({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      })
    },
  })

  return null
}

export default function LocationPickerMap({
  latitude,
  longitude,
  onChange,
}: LocationPickerMapProps) {
  const [center, setCenter] = useState<[number, number]>(MOSCOW_CENTER)
  const [tileError, setTileError] = useState(false)

  const markerPosition = useMemo<[number, number] | null>(() => {
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      return [latitude, longitude]
    }

    return null
  }, [latitude, longitude])

  useEffect(() => {
    if (markerPosition) {
      setCenter(markerPosition)
      return
    }

    if (!navigator.geolocation) {
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter([position.coords.latitude, position.coords.longitude])
      },
      () => {
        setCenter(MOSCOW_CENTER)
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 }
    )
  }, [markerPosition])

  return (
    <div className="space-y-2">
      <div className="h-64 overflow-hidden rounded-xl border border-slate-200">
        <MapContainer center={center} zoom={12} className="h-full w-full" scrollWheelZoom>
          <MapCenterController center={center} />
          <MapClickHandler onChange={onChange} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{
              tileerror: () => setTileError(true),
              tileload: () => setTileError(false),
            }}
          />
          {markerPosition ? (
            <CircleMarker center={markerPosition} radius={10} pathOptions={{ color: '#0f172a' }} />
          ) : null}
        </MapContainer>
      </div>
      <p className="text-xs text-slate-500">Нажмите на карту, чтобы поставить точку встречи.</p>
      {tileError ? (
        <p className="text-xs text-amber-700">
          Не удалось загрузить часть карты. Проверьте интернет и попробуйте еще раз.
        </p>
      ) : null}
    </div>
  )
}
