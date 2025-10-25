import kagglehub
import pandas as pd
import os
from kagglehub import KaggleDatasetAdapter
from tqdm import tqdm

OUTPUT_DIR_PUBLIC = 'frontend/public/data'
os.makedirs(OUTPUT_DIR_PUBLIC, exist_ok=True)

FILE_PATH_CHARTS = "charts.csv"
DATASET_SLUG_CHARTS = "dhruvildave/spotify-charts"
REGION_FILTER = "Switzerland"
REQUIRED_COLS_CHARTS = ['url', 'title', 'streams', 'date', 'region']

FILE_PATH_FEATURES = "SpotifyFeatures.csv"
DATASET_SLUG_FEATURES = "zaheenhamidani/ultimate-spotify-tracks-db"
FEATURE_COLS = ['track_id', 'acousticness', 'danceability', 'energy']
# -------------------------------------------------------
# --- 1. Spotify Charts (Switzerland) Data Processing ---
# download dataset: https://www.kaggle.com/datasets/dhruvildave/spotify-charts
# -------------------------------------------------------
def load_swiss_charts() -> pd.DataFrame:
    print("\nLoading Swiss Charts Data...")
    
    with tqdm(desc=f"Downloading/Loading {FILE_PATH_CHARTS}", total=1, bar_format="{desc}: {n_fmt}/{total_fmt}") as pbar:
        df_partial = kagglehub.dataset_load(
            KaggleDatasetAdapter.PANDAS,
            DATASET_SLUG_CHARTS,
            FILE_PATH_CHARTS,
            pandas_kwargs={"usecols": REQUIRED_COLS_CHARTS} 
        )
        pbar.update(1)

    print("Processing Charts Data...")
    df_partial['track_id'] = df_partial['url'].str.split('/').str[-1]
    df_filtered = df_partial[df_partial['region'] == REGION_FILTER].copy()

    final_charts_columns = ['track_id', 'title', 'streams', 'date']
    df_swiss_charts = df_filtered[final_charts_columns]
    return df_swiss_charts

# --------------------------------------------
## --- 2. Spotify Features Data Processing ---
# download dataset: https://www.kaggle.com/datasets/zaheenhamidani/ultimate-spotify-tracks-db
# --------------------------------------------
def load_spotify_features() -> pd.DataFrame:
    print("\nLoading Spotify Features Data...")

    with tqdm(desc=f"Downloading/Loading {FILE_PATH_FEATURES}", total=1, bar_format="{desc}: {n_fmt}/{total_fmt}") as pbar:
        df_tracks = kagglehub.dataset_load(
            KaggleDatasetAdapter.PANDAS,
            DATASET_SLUG_FEATURES,
            FILE_PATH_FEATURES,
            pandas_kwargs={"usecols": FEATURE_COLS}
        )
        pbar.update(1)

    return df_tracks

# --------------------------------
## --- 3. Merge and Final Save ---
# --------------------------------
def ingest_songs() -> None:
    df_swiss_charts = load_swiss_charts()
    df_tracks = load_spotify_features()

    print("Merging DataFrames...")
    merged = df_swiss_charts.merge(
        df_tracks,
        on='track_id',
        how='inner'
    )

    # Drop all without streams
    merged = merged.dropna(subset=['streams'])

    merged['acousticness_weighted'] = merged['acousticness'] * merged['streams']
    merged['danceability_weighted'] = merged['danceability'] * merged['streams']
    merged['energy_weighted'] = merged['energy'] * merged['streams']

    merged['date'] = pd.to_datetime(merged['date']).dt.date

    daily_summary = merged.groupby('date').agg(
        # Sum of (feature * weight)
        acousticness_sum=pd.NamedAgg(column='acousticness_weighted', aggfunc='sum'),
        danceability_sum=pd.NamedAgg(column='danceability_weighted', aggfunc='sum'),
        energy_sum=pd.NamedAgg(column='energy_weighted', aggfunc='sum'),
        # Sum of weights (total streams)
        total_streams=pd.NamedAgg(column='streams', aggfunc='sum')
    )

    daily_summary['acousticness'] = daily_summary['acousticness_sum'] / daily_summary['total_streams']
    daily_summary['danceability'] = daily_summary['danceability_sum'] / daily_summary['total_streams']
    daily_summary['energy'] = daily_summary['energy_sum'] / daily_summary['total_streams']

    final_cols = ['acousticness', 'danceability', 'energy', 'total_streams']
    merged = daily_summary[final_cols].reset_index()

    # Use tqdm to indicate the final save (disk write)
    with tqdm(desc="Saving to Parquet", total=1, bar_format="{desc}: {n_fmt}/{total_fmt}") as pbar:
        output_path_public = os.path.join(OUTPUT_DIR_PUBLIC, 'swiss_charts_enriched.parquet')
        merged.to_parquet(output_path_public, index=False)
        pbar.update(1)
        
    print(f"\nSpotify Features Data loaded. Shape: {df_tracks.shape}")
    print(f"Final Merged Data saved to: {output_path_public}")
    
    print(merged.head())