import { useEffect, useState, useMemo } from 'react';
import { asyncBufferFromUrl, parquetReadObjects } from 'hyparquet';
import MapVisualization from './components/MapVisualization';
import './App.css';
import TimelineChart from './components/TimelineChart';

// Interfaces must be defined here for the data returned by Hyparquet
// These match the required types of the MapVisualization component.
interface Station {
  id: string;
  lon: number;
  lat: number;
  title: string;
}

interface MeteoData {
  station_abbr: string;
  date: string;
  tre200d0_7d: number;
  rre150d0_7d: number;
  sre000d0_7d: number;
  rre150d0: number; // Required by MapVisualization's WeatherRecord type
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
  // State to hold the loaded data and control UI flow
  const [meteoData, setMeteoData] = useState<MeteoData[]>([]);
  const [stationsData, setStationsData] = useState<Station[]>([]);
  const [chartsData, setChartsData] = useState<ChartsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        // Load all three files concurrently
        const [meteo, stations, charts] = await Promise.all([
            loadFile<MeteoData>(METEO_PATH),
            loadFile<Station>(STATIONS_PATH),
            loadFile<ChartsData>(CHARTS_PATH),
        ]);
        
        // Update state
        setMeteoData(meteo);
        setStationsData(stations);
        setChartsData(charts);

        // console.log(`--- Data Loading Complete ---`);
        // console.log(`Meteo Records: ${meteo.length}`, meteo[0]);
        // console.log(`Stations Records: ${stations.length}`, stations[0]);
        // console.log(`Charts Records: ${charts.length}`, charts[0]);
        // console.log(`type of date column in meteoData: ${typeof meteo[0]?.date}`);

      } catch (e) {
        console.error("Failed to load data:", e);
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []); 

  // Memoize station data transformation for MapVisualization
  const stationMap = useMemo(() => {
    return stationsData.reduce((acc, station) => {
      acc[station.id] = station;
      return acc;
    }, {} as Record<string, Station>);
  }, [stationsData]);

  // Mock minimal required dailyWeather data
  const dailyWeatherMock = useMemo(() => [{ meanSunshine: 100 }], []);

  if (loading) {
    return <div className="App"><h1>Loading Data...</h1><p>Fetching Parquet files via Hyparquet.</p></div>;
  }
  
  if (error) {
    return <div className="App" style={{ color: 'red' }}><h1>Error Loading Data</h1><p>{error}</p></div>;
  }
  
  // Render the data dashboard
  return (
    <div className="App">
      <h1>Sonic Weather Dashboard</h1>
      <p>Loaded {meteoData.length} weather records and {stationsData.length} stations.</p>

      <div className="stage">
      
        <div className="map-visualization">
        <MapVisualization
          stations={stationMap}
          weather={meteoData as any} 
          selectedDate={meteoData[50]?.date} 
        />
        </div>
        <div className="timeline-chart">
          <TimelineChart data={chartsData} selectedDate={meteoData[50]?.date} />
        </div>
      </div>
      
      <p style={{ marginTop: '20px' }}>
        Check the console for raw data structure validation.
      </p>
    </div>
  );
}

export default App;
