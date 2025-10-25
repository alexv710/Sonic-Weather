import { useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import Map from 'react-map-gl/maplibre';
import * as maplibre from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Station } from '../types/station';
import type { WeatherRecord } from '../types/weather';
import type { WeatherDailySummary } from '../types/weatherDailySummary';

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
  selectedDate?: string
}

export default function MapVisualization({
  stations,
  weather,
  dailyWeather,
  selectedDate
}: MapVisualizationProps) {

  const layers = useMemo(() => [], []); 

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
