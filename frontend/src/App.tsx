import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
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
  rre150d0: number;
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

const GITHUB_REPO_URL = 'https://github.com/alexv710/Sonic-Weather'

function App() {
  const introRef = useRef<HTMLDivElement>(null)
  const scrubSectionRef = useRef<HTMLElement>(null)
  const outroRef = useRef<HTMLElement>(null)
  const visRef = useRef<HTMLDivElement>(null)
  // State to hold the loaded data and control UI flow
  const [meteoData, setMeteoData] = useState<MeteoData[]>([]);
  const [stationsData, setStationsData] = useState<Station[]>([]);
  const [chartsData, setChartsData] = useState<ChartsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined)

  const METEO_PATH = '/data/meteo_swiss_filtered.parquet';
  const STATIONS_PATH = '/data/stations.parquet';
  const CHARTS_PATH = '/data/swiss_charts_enriched.parquet';

const availableDates = useMemo(
    () =>
      Array.from(new Set(meteoData.map((d) => d.date))).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      ),
    [meteoData]
  );

  const onScroll = useCallback(() => {
    const scrubEl = scrubSectionRef.current
    
    // Ensure the element and dates are available
    if (!scrubEl || availableDates.length === 0) return

    const scrubRect = scrubEl.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const scrubHeight = scrubRect.height
    const visRefHeight = visRef.current?.getBoundingClientRect().height || 0

    // Calculate the start and end points for the scroll animation
    // Start: When the top of the scrub section hits the top of the viewport (top = 0)
    const scrollStart = 0; 
    // End: When the bottom of the scrub section hits the bottom of the viewport
    // adding the visRefHeight as it is set to sticky
    const scrollEnd = viewportHeight - scrubHeight - visRefHeight;
    const scrollDistance = scrollEnd - scrollStart
    
    // If the scrub section is shorter than the viewport, this logic won't work.
    // We assume it's taller, which it is due to the spacers.
    if (scrollDistance >= 0) return; 
    const progress = (scrubRect.top - scrollStart - visRefHeight) / scrollDistance;
    const clampedProgress = Math.max(0, Math.min(1, progress))
    const dateIndex = Math.floor(clampedProgress * (availableDates.length - 1))
    const newDate = availableDates[dateIndex]
    setSelectedDate(newDate)

  }, [availableDates])


  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [onScroll])

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

        // Set the initial date to the first date string from the data
        setSelectedDate(meteo[0]?.date);

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
  // const dailyWeatherMock = useMemo(() => [{ meanSunshine: 100 }], []);

  if (loading) {
    return <div className="App"><h1>Loading Data...</h1><p>Fetching Parquet files via Hyparquet.</p></div>;
  }

  if (error) {
    return <div className="App" style={{ color: 'red' }}><h1>Error Loading Data</h1><p>{error}</p></div>;
  }

  // Render the data dashboard
  return (
    <div className="App">
      <div className="intro" ref={introRef}>
        <section>
          <h1>Sonic Weather</h1>
          <p>
            Does the weather influence the music we listen to? This project explores the relationship
            between Swiss weather patterns and the music topping the charts from 2017 to 2021.
          </p>
          <p>
            We're looking at daily weather data from MeteoSwiss stations alongside audio features
            like <strong>energy</strong> and <strong>danceability</strong> from Spotify for songs
            on the Swiss charts.
          </p>
          <p style={{ color: 'var(--accent)', marginTop: '2rem' }}>Scroll down to begin the story.</p>
        </section>
      </div>

      <div className="stage" ref={visRef}>

        <div className="map-visualization">
          <MapVisualization
            stations={stationMap}
            weather={meteoData as any}
            selectedDate={selectedDate}
          />
        </div>
        <div className="timeline-chart">
          <TimelineChart data={chartsData} selectedDate={selectedDate} />
        </div>
      </div>

      {/* SCROLLING CONTENT CONTAINER WITH STORY POINTS */}
      <section className="scrub-section" ref={scrubSectionRef}>
        <div className="story-point">
          <h3>A Recurring Pattern</h3>
          <p>
            As we start in 2017, watch the timeline. We immediately see a pattern that repeats every
            year: a sharp dip in "danceability" in December, followed by a quick recovery in the
            new year.
          </p>
        </div>

        <div className="spacer-1"></div>

        <div className="story-point">
          <h3>The Record Heat of 2018</h3>
          <p>
            Summer 2018 was one of the hottest on record in Switzerland. As the heatwaves hit
            in June and July, we see a corresponding dip in the "danceability" of music. By August,
            as temperatures peaked, the "energy" of hit songs also took a noticeable dive.
          </p>
        </div>

        <div className="spacer-2"></div>

        <div className="story-point">
          <h3>A Stable 2019 Ends in a Slump</h3>
          <p>
            The first half of 2019 appears remarkably stable for both energy and danceability.
            However, heading into the colder months, both metrics hit a new low in November and
            December, suggesting a collective down-tempo shift as the year closed.
          </p>
        </div>

        <div className="spacer-3"></div>

        <div className="story-point">
          <h3>The COVID-19 Effect</h3>
          <p>
            The arrival of the pandemic in 2020 brought erratic listening patterns. Lockdowns and
            uncertainty seem to correlate with a desire for higher "energy" music, while
            "danceability" saw a significant drop.
          </p>
        </div>
      </section>

      <section className="outro" ref={outroRef}>
        <h2>Further Exploration</h2>
        <p>
          This is just a brief look into the data, and any connections are purely correlational.
          There are many more patterns to discover.
        </p>
        <p>
          You can find the full source code, data, and methodology for this project on{' '}
          <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          .
        </p>
        <h3>Future Work</h3>
        <ul>
          <li>Correlating data with specific lockdown event timelines.</li>
          <li>Analyzing valence (musical happiness) against weather.</li>
          <li>Adding more data sources, like mobility reports or social media sentiment.</li>
        </ul>
      </section>
    </div>
  );
}

export default App;