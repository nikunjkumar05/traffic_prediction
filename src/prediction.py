"""Stage 3: Prediction Engine — XGBoost + LightGBM violation prediction with cyclical temporal features."""

import numpy as np
import pandas as pd
import xgboost as xgb
import lightgbm as lgb
from sklearn.metrics import r2_score, mean_absolute_error
from sklearn.preprocessing import LabelEncoder
import pickle
from pathlib import Path

FEATURES = [
    'latitude', 'longitude', 'hour', 'day_of_week', 'month',
    'duration_minutes', 'severity', 'vehicle_type_encoded',
    'violation_type_encoded', 'is_junction', 'junction_distance',
    'is_morning_rush', 'is_evening_rush', 'is_weekend',
    'hour_sin', 'hour_cos', 'day_sin', 'day_cos',
]


def add_temporal_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add cyclical sin/cos encoding for hour and day_of_week (preserves 23→0 continuity)."""
    df = df.copy()
    df['is_morning_rush'] = df['hour'].between(7, 10).astype(int)
    df['is_evening_rush'] = df['hour'].between(17, 20).astype(int)
    df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
    df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
    df['day_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
    df['day_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
    return df


def prepare_features(df: pd.DataFrame):
    """Add temporal features + label-encode categoricals. Returns (df, feature_names, encoders)."""
    df = add_temporal_features(df)

    le_vehicle = LabelEncoder()
    le_violation = LabelEncoder()
    df['vehicle_type_encoded'] = le_vehicle.fit_transform(df['vehicle_type'].astype(str))
    df['violation_type_encoded'] = le_violation.fit_transform(df['single_violation'].astype(str))
    df['is_junction'] = (~df['mapped_junction'].isin(['No Junction', 'Unknown'])).astype(int)

    encoders = {'vehicle': le_vehicle, 'violation': le_violation}
    return df, FEATURES, encoders


def train_model(df: pd.DataFrame, features: list = None, model_type: str = 'xgboost', params: dict = None):
    """Train on Nov-Jan, test on Feb (temporal split). Returns (model, metrics_dict)."""
    features = features or FEATURES
    train = df[df['month'].isin([11, 12, 1])]
    test = df[df['month'] == 2]

    if len(train) == 0 or len(test) == 0:
        print(f"  WARNING: Insufficient data for {model_type}")
        return None, {}

    X_train, y_train = train[features].fillna(0), train['congestion_cost']
    X_test, y_test = test[features].fillna(0), test['congestion_cost']

    if model_type == 'xgboost':
        p = {'n_estimators': 500, 'max_depth': 6, 'learning_rate': 0.05,
             'subsample': 0.8, 'colsample_bytree': 0.8, 'random_state': 42, 'n_jobs': -1}
        model = xgb.XGBRegressor(**(params or p))
        model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
    else:
        p = {'n_estimators': 500, 'max_depth': 6, 'learning_rate': 0.05,
             'random_state': 42, 'n_jobs': -1, 'verbose': -1}
        model = lgb.LGBMRegressor(**(params or p))
        model.fit(X_train, y_train)

    preds = model.predict(X_test)
    metrics = {'r2': round(r2_score(y_test, preds), 4), 'mae': round(mean_absolute_error(y_test, preds), 4),
               'train_size': len(train), 'test_size': len(test)}
    print(f"  {model_type}: R2={metrics['r2']}, MAE={metrics['mae']}")
    return model, metrics


def get_feature_importance(model, features: list) -> pd.DataFrame:
    """Extract and rank feature importance from trained model."""
    return pd.DataFrame({'feature': features, 'importance': model.feature_importances_}).sort_values('importance', ascending=False)


def predict_next_period(model, df: pd.DataFrame, target_hour: int, target_day: int = None):
    """Predict congestion cost per junction for a specific future hour."""
    junction_stats = df.groupby('mapped_junction').agg(
        avg_lat=('latitude', 'mean'), avg_lon=('longitude', 'mean'),
        avg_duration=('duration_minutes', 'median'), avg_severity=('severity', 'median'),
        avg_distance=('junction_distance', 'median'),
        top_vehicle=('vehicle_type', lambda x: x.mode()[0] if len(x) > 0 else 'CAR'),
        top_violation=('single_violation', lambda x: x.mode()[0] if len(x) > 0 else 'WRONG PARKING'),
    ).reset_index()

    day = target_day if target_day is not None else int(df['day_of_week'].median())
    month = int(df['month'].mode()[0])

    pred = junction_stats.copy()
    pred['hour'] = target_hour
    pred['day_of_week'] = day
    pred['month'] = month
    pred['duration_minutes'] = pred['avg_duration']
    pred['severity'] = pred['avg_severity'].astype(int)
    pred['junction_distance'] = pred['avg_distance']
    pred['latitude'] = pred['avg_lat']
    pred['longitude'] = pred['avg_lon']
    pred['vehicle_type'] = pred['top_vehicle']
    pred['single_violation'] = pred['top_violation']

    pred = add_temporal_features(pred)
    # Encode using training distribution (fit on full df, not just pred)
    le_v = LabelEncoder().fit(df['vehicle_type'].astype(str))
    le_vio = LabelEncoder().fit(df['single_violation'].astype(str))
    pred['vehicle_type_encoded'] = le_v.transform(pred['vehicle_type'].astype(str))
    pred['violation_type_encoded'] = le_vio.transform(pred['single_violation'].astype(str))
    pred['is_junction'] = (~pred['mapped_junction'].isin(['No Junction', 'Unknown'])).astype(int)

    pred['predicted_cost'] = model.predict(pred[FEATURES].fillna(0)).round(2)
    max_cost = pred['predicted_cost'].max()
    pred['gridlock_score'] = (pred['predicted_cost'] / max_cost * 100).clip(0, 100).round(1) if max_cost > 0 else 0.0

    return pred[['mapped_junction', 'avg_lat', 'avg_lon', 'predicted_cost', 'gridlock_score']].sort_values('predicted_cost', ascending=False)


def save_model(model, filepath: str):
    Path(filepath).parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, 'wb') as f:
        pickle.dump(model, f)
    print(f"  Model saved: {filepath}")


def run_prediction(df: pd.DataFrame, output_dir: str = 'outputs/models'):
    """Run Stage 3: Train XGBoost + LightGBM, save models."""
    print("=" * 60)
    print("Stage 3: Prediction Engine")
    print("=" * 60)

    print("\n[1/4] Preparing features...")
    df, features, encoders = prepare_features(df)

    print("\n[2/4] Training XGBoost...")
    xgb_model, xgb_metrics = train_model(df, features, 'xgboost')

    print("\n[3/4] Training LightGBM...")
    lgb_model, lgb_metrics = train_model(df, features, 'lightgbm')

    print("\n[4/4] Feature importance (XGBoost):")
    if xgb_model:
        imp = get_feature_importance(xgb_model, features)
        for _, r in imp.head(5).iterrows():
            print(f"    {r['feature']}: {r['importance']:.4f}")

    if xgb_model:
        save_model(xgb_model, f'{output_dir}/xgboost_violation_predictor.pkl')
    if lgb_model:
        save_model(lgb_model, f'{output_dir}/lightgbm_violation_predictor.pkl')

    print("=" * 60)
    print("Stage 3 complete.")
    print("=" * 60)

    return {
        'xgb_model': xgb_model, 'lgb_model': lgb_model,
        'xgb_metrics': xgb_metrics, 'lgb_metrics': lgb_metrics,
        'features': features, 'encoders': encoders,
    }


if __name__ == '__main__':
    import json
    from src.data_pipeline import run_pipeline
    from src.congestion_cost import run_congestion_cost

    with open('data/external/junction_coords.json') as f:
        coords = json.load(f)

    df = run_pipeline('data/raw/violations.csv', junction_coords=coords)
    df = run_congestion_cost(df, junction_coords=coords)
    results = run_prediction(df)

    if results['xgb_model']:
        print("\nPredicted hotspots for 6 PM:")
        pred = predict_next_period(results['xgb_model'], df, target_hour=18)
        print(pred.head(10).to_string())
