'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { Marker as LeafletMarker, divIcon, type LeafletEventHandlerFnMap } from 'leaflet'

import { reverseGeocode } from '../lib/geocoding'

type Coordinates = {
  latitude: number
  longitude: number
}

type LocationPickerMapProps = {
  latitude: number | null
  longitude: number | null
  onChange: (coords: Coordinates) => void
  onAddressResolved?: (address: string) => void
}

const MOSCOW_CENTER: [number, number] = [55.751244, 37.618423]

function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true })
  }, [center, map])

  return null
}

function MapClickHandler({
  onChange,
  onAddressResolved,
}: {
  onChange: (coords: Coordinates) => void
  onAddressResolved?: (address: string) => void
}) {
  useMapEvents({
    click(event) {
      const nextCoordinates = {
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      }

      onChange(nextCoordinates)

      if (onAddressResolved) {
        void reverseGeocode(nextCoordinates)
          .then((resolvedAddress) => {
            if (resolvedAddress) {
              onAddressResolved(resolvedAddress)
            }
          })
          .catch((error) => {
            console.error('Ошибка обратного геокодирования:', error)
          })
      }
    },
  })

  return null
}

export default function LocationPickerMap({
  latitude,
  longitude,
  onChange,
  onAddressResolved,
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

  const markerIcon = useMemo(
    () =>
      divIcon({
        className: '',
        html: '<div style="width:24px;height:24px;border-radius:9999px;background:#0f172a;border:3px solid #ffffff;box-shadow:0 4px 10px rgba(15,23,42,0.3);"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    []
  )

  const markerEventHandlers = useMemo<LeafletEventHandlerFnMap>(
    () => ({
      dragend(event) {
        const marker = event.target as LeafletMarker
        const { lat, lng } = marker.getLatLng()
        const nextCoordinates = { latitude: lat, longitude: lng }

        onChange(nextCoordinates)

        if (onAddressResolved) {
          void reverseGeocode(nextCoordinates)
            .then((resolvedAddress) => {
              if (resolvedAddress) {
                onAddressResolved(resolvedAddress)
              }
            })
            .catch((error) => {
              console.error('Ошибка обратного геокодирования:', error)
            })
        }
      },
    }),
    [onAddressResolved, onChange]
  )

  return (
    <div className="space-y-2">
      <div className="h-64 overflow-hidden rounded-xl border border-slate-200">
        <MapContainer center={center} zoom={12} className="h-full w-full" scrollWheelZoom>
          <MapCenterController center={center} />
          <MapClickHandler onChange={onChange} onAddressResolved={onAddressResolved} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{
              tileerror: () => setTileError(true),
              tileload: () => setTileError(false),
            }}
          />
          {markerPosition ? (
            <Marker
              position={markerPosition}
              icon={markerIcon}
              draggable
              eventHandlers={markerEventHandlers}
            />
          ) : null}
        </MapContainer>
      </div>
      <p className="text-xs text-slate-500">
        Нажмите на карту, чтобы поставить точку, или перетащите маркер в нужное место.
      </p>
      {tileError ? (
        <p className="text-xs text-amber-700">
          Не удалось загрузить часть карты. Проверьте интернет и попробуйте еще раз.
        </p>
      ) : null}
    </div>
  )
}
