export interface Station {
    id: string;
    lon: number;
    lat: number;
    title: string;
}
export interface WeatherRecord {
    station_abbr: string;
    date: Date;
    tre200d0_7d: number;
    rre150d0_7d: number;
    sre000d0_7d: number;
    rre150d0: number;
}
export interface WeatherDailySummary {
    meanSunshine: number | null;
}

export interface MusicDaily {
  date: Date
  totalStreams: number
  count: number
  energy: number | null
  speechiness: number | null
  danceability: number | null
}

