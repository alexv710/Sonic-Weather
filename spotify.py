import kagglehub
import pandas as pd
import os
from kagglehub import KaggleDatasetAdapter

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

    df_partial = kagglehub.dataset_load(
        KaggleDatasetAdapter.PANDAS,
        DATASET_SLUG_CHARTS,
        FILE_PATH_CHARTS,
        pandas_kwargs={"usecols": REQUIRED_COLS_CHARTS} 
    )

    # the track_id we need to merge it to the features dataset is the last part of the url
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

    df_tracks = kagglehub.dataset_load(
        KaggleDatasetAdapter.PANDAS,
        DATASET_SLUG_FEATURES,
        FILE_PATH_FEATURES,
        pandas_kwargs={"usecols": FEATURE_COLS}
    )
    return df_tracks

# --------------------------------
## --- 3. Merge and Final Save ---
# --------------------------------
def ingest_songs() -> None:
    df_swiss_charts = load_swiss_charts()
    df_tracks = load_spotify_features()

     # Merge datasets on 'track_id'
    merged = df_swiss_charts.merge(
        df_tracks,
        on='track_id',
        how='inner'
    )

    # Drop all without streams
    merged = merged.dropna(subset=['streams'])

    output_path_public = os.path.join(OUTPUT_DIR_PUBLIC, 'swiss_charts_enriched.parquet')
    merged.to_parquet(output_path_public, index=False)

    print(f"Spotify Features Data loaded. Shape: {df_tracks.shape}")
    print(f"Final Merged Data saved to: {output_path_public}")
    print(merged.head())