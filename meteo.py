import io
import os
import requests
from pystac_client import Client
import pandas as pd
from tqdm.auto import tqdm
import pandas as pd
import os

OUTPUT_DIR_PUBLIC = 'frontend/public/data'

STAC_API_URL = "https://data.geo.admin.ch/api/stac/v1"
COLLECTION_ID = "ch.meteoschweiz.ogd-smn"
START_DATE = pd.to_datetime("2017-01-01T00:00:00Z")
END_DATE = pd.to_datetime("2021-12-31T23:59:59Z")

# Parameters (source at: https://www.meteoswiss.admin.ch/dam/jcr:3fbeeab5-97c9-4a13-9f2b-85fd231508e6/Legenden-zu-den-Bodenstationen-.pdf)
# PAR Einheit Beschreibung
# tre200d0 Grad Celsius Lufttemperatur 2 m über Boden; Tagesmittel
# tre200dn Grad Celsius Lufttemperatur 2 m über Boden; Tagesminimum
# tre200dx Grad Celsius Lufttemperatur 2 m über Boden; Tagesmaximum
# rre150d0 Millimeter Niederschlag; Tagessumme 0540 - 0540 Folgetag
# sre000d0 Minuten Sonnenscheindauer; Tagessumme
# sremaxdv Prozent Sonnenscheindauer; relativ zur absolut möglichen Tagessumme
SELECT_COLUMNS = ['station_abbr', 'reference_timestamp', 'tre200d0_7d', 'rre150d0_7d', 'sre000d0_7d']

def ingest_weather() -> None:

    print("Connecting to the MeteoSwiss STAC API...")
    catalog = Client.open(STAC_API_URL)
    search = catalog.search(
        collections=[COLLECTION_ID],
    )

    all_items = search.item_collection()
    stations_list = []
    weather_list = []
    print(f"Found {len(all_items)} files to download")

    # --- Download Loop ---
    # This loop iterates through the found items and downloads them.
    for item in tqdm(all_items, desc="Downloading raw data files"):

        stations_list.append({
            'id': item.id,
            'lon': item.geometry.get('coordinates')[0],
            'lat': item.geometry.get('coordinates')[1],
            'title': item.properties.get('title')
        })

        # Fill in the weather data
        for asset_key, asset in item.assets.items():
            if 'd_historical' in asset_key:
                download_url = asset.href
                response = requests.get(download_url, timeout=30)
                response.raise_for_status()
                df = pd.read_csv(
                    io.StringIO(response.content.decode('utf-8')), 
                    parse_dates=['reference_timestamp'], 
                    sep=';', 
                    date_format='%d.%m.%Y %H:%M'
                )
                df['reference_timestamp'] = df['reference_timestamp'].dt.tz_localize('UTC')
                df = df[(df['reference_timestamp'] >= START_DATE) & (df['reference_timestamp'] <= END_DATE)]
                df.reset_index(drop=True, inplace=True)
                df['tre200d0_7d'] = df['tre200d0'].rolling(window=7, min_periods=1, center=True).mean().round(2)
                df['rre150d0_7d'] = df['rre150d0'].rolling(window=7, min_periods=1, center=True).mean().round(2)
                df['sre000d0_7d'] = df['sre000d0'].rolling(window=7, min_periods=1, center=True).mean().round(2)
                df = df[SELECT_COLUMNS]

                weather_list.append(df)

    # store all stations info
    df_stations = pd.DataFrame(stations_list)
    df_stations.to_parquet(os.path.join(OUTPUT_DIR_PUBLIC, 'stations.parquet'), index=False)

    # Concatenate and save
    if weather_list:
        df_meteo = pd.concat(weather_list, ignore_index=True)
        print(f"\nSuccessfully filtered {len(df_meteo)} rows. Saving file.")
        df_meteo.to_parquet(os.path.join(OUTPUT_DIR_PUBLIC, 'meteo_swiss_filtered.parquet'), index=False)
    else:
        print("\nNo data found in the specified date range.")

    print(weather_list[0].head())