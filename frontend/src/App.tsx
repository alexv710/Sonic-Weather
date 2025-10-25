import { useEffect } from 'react';
import { asyncBufferFromUrl, parquetReadObjects } from 'hyparquet';
import './App.css';

interface MeteoData {
  station_abbr: string;
  reference_timestamp: string;
  tre200d0_7d: number;
  rre150d0_7d: number;
  sre000d0_7d: number;
}

interface StationsData {
  id: string;
  lon: number;
  lat: number;
  title: string;
}

interface ChartsData {
  track_id: string;
  title: string;
  streams: number;
  date: string;
  acousticness: number;
  danceability: number;
  energy: number;
}

function App() {
  const METEO_PATH = '/data/meteo_swiss_filtered.parquet'; 
  const STATIONS_PATH = '/data/stations.parquet';
  const CHARTS_PATH = '/data/swiss_charts_enriched.parquet';

  useEffect(() => {
    const loadFile = async <T,>(path: string): Promise<T[]> => {
      const file = await asyncBufferFromUrl({ url: path });
      return parquetReadObjects({ file }) as T[];
    };

    const loadData = async () => {
      try {
        // Load Meteo Data
        const meteoData = await loadFile<MeteoData>(METEO_PATH);
        console.log(`--- Meteo Data Loaded ---`);
        console.log(`Records (${meteoData.length}):`, meteoData.slice(0, 3));

        // Load Stations Data
        const stationsData = await loadFile<StationsData>(STATIONS_PATH);
        console.log(`--- Stations Data Loaded ---`);
        console.log(`Records (${stationsData.length}):`, stationsData.slice(0, 3));

        // Load Charts Data
        const chartsData = await loadFile<ChartsData>(CHARTS_PATH);
        console.log(`--- Charts Data Loaded ---`);
        console.log(`Records (${chartsData.length}):`, chartsData.slice(0, 3));
        
      } catch (e) {
        console.error("Failed to load data:", e);
      }
    };
    loadData();
  }, []); 

  return (
    <div className="App">
      <h1>Data Loading Attempted via Hyparquet</h1>
      <p>Check the console for loaded Parquet data.</p>
    </div>
  );
}

export default App;
