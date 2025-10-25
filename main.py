from spotify import ingest_songs
from meteo import ingest_weather

def main():
    print("Hello from sonic-weather!")
    ingest_songs()
    print("Spotify data ingestion completed.")
    ingest_weather()
    print("Weather data ingestion completed.")


if __name__ == "__main__":
    main()
