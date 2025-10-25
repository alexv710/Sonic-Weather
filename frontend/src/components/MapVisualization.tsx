import { useMemo, useState, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import Map from 'react-map-gl/maplibre';
import * as maplibre from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Station } from '../types/station';
import type { WeatherRecord } from '../types/weather';
import type { WeatherDailySummary } from '../types/weatherDailySummary';
import { ScatterplotLayer } from '@deck.gl/layers';

type MapLibreModule = typeof maplibre & { default?: typeof maplibre }
const resolvedMaplibre = (maplibre as MapLibreModule).default ?? maplibre

const STATIC_CONTROLLER = Object.freeze({
  dragPan: false,
  dragRotate: false,
  doubleClickZoom: false,
  keyboard: false,
  scrollZoom: false,
  touchZoom: false,
  touchRotate: false
})

export const DEFAULT_VIEW = {
  longitude: 8.2275,
  latitude: 46.8182,
  zoom: 6.9,
  pitch: 40,
  bearing: 0
} as const

export interface MapVisualizationProps {
  stations: Record<string, Station>
  weather: WeatherRecord[]
  dailyWeather: WeatherDailySummary[]
  selectedDate?: Date
}

type GlyphDatum = {
  position: [number, number]
  rain: number | null
  station: Station
}

export default function MapVisualization({
  stations,
  weather,
  selectedDate
}: MapVisualizationProps) {
  const [time, setTime] = useState(0)

  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const loop = (t: number) => {
      setTime(t - t0)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const dateKey = useMemo(() => {
    if (selectedDate) return selectedDate.toISOString().slice(0, 10)
    if (weather.length) return String(weather[0].date).slice(0, 10)
    return undefined
  }, [selectedDate, weather])

  const glyphs: GlyphDatum[] = useMemo(() => {
    if (!dateKey) return []
    const rows = weather.filter((w) => String(w.date.toISOString().slice(0, 10)) === dateKey)
    return rows
      .map((r) => {
        const st = stations[r.station_abbr.toLowerCase()]
        if (!st) return null
        return {
          position: [st.lon, st.lat] as [number, number],
          rain: r.rre150d0_7d,
          station: st
        }
      })
      .filter(Boolean) as GlyphDatum[]
  }, [dateKey, weather, stations])

  const rainMax = useMemo(() => {
    const vals = glyphs.map((g) => g.rain ?? 0).filter((v) => Number.isFinite(v))
    return vals.length ? Math.max(...vals) : 1
  }, [glyphs])

  const rainMaxSafe = Math.max(1, rainMax)
  const scatterLayer =
    glyphs.length > 0
      ? new ScatterplotLayer({
          id: 'rain-rings',
          data: glyphs.filter((g) => (g.rain ?? 0) > 0),
          pickable: false,
          stroked: true,
          filled: false,
          radiusUnits: 'meters',
          lineWidthUnits: 'pixels',
          lineWidthMinPixels: 2,
          getLineWidth: (d) => 2 + 6 * ((d.rain ?? 0) / rainMaxSafe),
          getPosition: (d) => d.position,
          getLineColor: [70, 130, 180, 200],
          getRadius: (d) => {
            const rainRatio = (d.rain ?? 0) / rainMaxSafe
            const base = 1000
            const amp  = 8000 * rainRatio
            const speed = 0.002 + 0.004 * rainRatio
            const t = time * speed
            return base + amp * (0.5 + 0.5 * Math.sin(t))
          },
          parameters: { depthTest: false }
        })
      : null

  const layers = [scatterLayer].filter(Boolean) as any[]

  return (
    <DeckGL
    style={{
        height: '100%',
        width: '100%',
        position: 'relative',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        overflow: 'hidden'
      }}
      initialViewState={DEFAULT_VIEW}
      controller={STATIC_CONTROLLER}
      layers={layers}
    >
      <Map
        mapLib={resolvedMaplibre}
        mapStyle="https://api.maptiler.com/maps/dataviz/style.json?key=0zLRN18KJ7iEQRPNKDlo"
        interactive={false}
      />
    </DeckGL>
  )
}
