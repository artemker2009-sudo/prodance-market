type Coordinates = {
  latitude: number
  longitude: number
}

type NominatimSearchItem = {
  lat?: string
  lon?: string
  display_name?: string
}

type NominatimReverseResponse = {
  display_name?: string
}

export async function geocodeAddress(address: string): Promise<(Coordinates & { label: string }) | null> {
  const normalizedAddress = address.trim()
  if (!normalizedAddress) {
    return null
  }

  const params = new URLSearchParams({
    q: normalizedAddress,
    format: 'json',
    limit: '1',
    addressdetails: '1',
    'accept-language': 'ru',
  })

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`)
  if (!response.ok) {
    return null
  }

  const results = (await response.json()) as NominatimSearchItem[]
  const firstResult = results[0]
  if (!firstResult?.lat || !firstResult?.lon) {
    return null
  }

  const latitude = Number(firstResult.lat)
  const longitude = Number(firstResult.lon)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  return {
    latitude,
    longitude,
    label: firstResult.display_name ?? normalizedAddress,
  }
}

export async function reverseGeocode(coords: Coordinates): Promise<string | null> {
  const params = new URLSearchParams({
    lat: String(coords.latitude),
    lon: String(coords.longitude),
    format: 'json',
    addressdetails: '1',
    zoom: '18',
    'accept-language': 'ru',
  })

  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`)
  if (!response.ok) {
    return null
  }

  const result = (await response.json()) as NominatimReverseResponse
  const label = result.display_name?.trim()

  return label ? label : null
}
