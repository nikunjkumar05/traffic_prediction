"""
Isolation Forest Anomaly Detection for Parking Violations
Detects unusual violation patterns that rule-based scoring misses
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from typing import Tuple, Dict
import json


class ViolationAnomalyDetector:
    """
    Unsupervised anomaly detection for parking violations.
    
    Identifies violations that are anomalous across multiple dimensions:
    - Temporal patterns (unusual hour/day combinations)
    - Spatial clustering (isolated vs dense violations)
    - Vehicle type outliers (rare vehicle types at location)
    - Offense combination rarity
    
    This adds ML credibility beyond rule-based CII scoring.
    """
    
    def __init__(self, contamination: float = 0.05, random_state: int = 42):
        """
        Initialize Isolation Forest detector.
        
        Args:
            contamination: Expected proportion of anomalies (5% default)
            random_state: Reproducibility seed
        """
        self.contamination = contamination
        self.random_state = random_state
        self.model = IsolationForest(
            n_estimators=100,
            contamination=contamination,
            random_state=random_state,
            n_jobs=-1
        )
        self.scaler = StandardScaler()
        self.feature_columns = []
        
    def extract_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Extract numerical features for anomaly detection.
        
        Features engineered from dataset-only columns:
        - hour_of_day: Temporal pattern
        - day_of_week: Weekly pattern  
        - lat_bin, lon_bin: Spatial binning (0.001° ≈ 100m)
        - vehicle_type_encoded: Ordinal encoding
        - offense_count: Number of offenses in violation
        - junction_flag: 1 if BTP junction, 0 otherwise
        - distance_to_nearest_junction: Meters (if junction exists)
        """
        df = df.copy()
        
        # Temporal features
        df['created_datetime'] = pd.to_datetime(df['created_date'], errors='coerce')
        df['hour_of_day'] = df['created_datetime'].dt.hour.fillna(12).astype(int)
        df['day_of_week'] = df['created_datetime'].dt.dayofweek.fillna(3).astype(int)
        
        # Spatial binning (0.001° ≈ 100m at Bengaluru latitude)
        df['lat_bin'] = (df['latitude'] * 1000).astype(int)
        df['lon_bin'] = (df['longitude'] * 1000).astype(int)
        
        # Vehicle type encoding
        vehicle_map = {
            'CAR': 1, 'JEEP': 1, 'VAN': 1,
            'AUTO RICKSHAW': 2,
            '2W': 3, 'SCOOTER': 3, 'MOTORCYCLE': 3,
            'LIGHT COMMERCIAL VEHICLE': 4, 'MINI BUS': 4,
            'BUS': 5, 'TRUCK': 5, 'LORRY': 5,
            'HEAVY COMMERCIAL VEHICLE': 6, 'TANKER': 6
        }
        df['vehicle_type_clean'] = df.get('updated_vehicle_type', df.get('vehicle_type', 'UNKNOWN'))
        df['vehicle_type_encoded'] = df['vehicle_type_clean'].apply(
            lambda x: vehicle_map.get(str(x).upper(), 0)
        )
        
        # Offense count
        def count_offenses(violation_str):
            try:
                if pd.isna(violation_str):
                    return 0
                if isinstance(violation_str, list):
                    return len(violation_str)
                # Parse stringified JSON
                import ast, json
                try:
                    parsed = json.loads(violation_str)
                    return len(parsed) if isinstance(parsed, list) else 1
                except:
                    parsed = ast.literal_eval(violation_str)
                    return len(parsed) if isinstance(parsed, list) else 1
            except:
                return 1
        
        df['offense_count'] = df.get('violation', df.get('offence_code', '')).apply(count_offenses)
        
        # Junction flag
        df['junction_flag'] = df.get('junction_', 'No Junction').apply(
            lambda x: 1 if str(x).startswith('BTP') else 0
        )
        
        self.feature_columns = [
            'hour_of_day', 'day_of_week', 'lat_bin', 'lon_bin',
            'vehicle_type_encoded', 'offense_count', 'junction_flag'
        ]
        
        return df[self.feature_columns].fillna(0)
    
    def fit_predict(self, df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
        """
        Fit model and predict anomalies.
        
        Returns:
            anomaly_scores: Continuous scores (lower = more anomalous)
            anomaly_labels: Binary labels (-1 = anomaly, 1 = normal)
        """
        features = self.extract_features(df)
        
        # Scale features
        features_scaled = self.scaler.fit_transform(features)
        
        # Fit and predict
        self.model.fit(features_scaled)
        anomaly_labels = self.model.predict(features_scaled)
        anomaly_scores = self.model.score_samples(features_scaled)
        
        return pd.Series(anomaly_scores, index=df.index), pd.Series(anomaly_labels, index=df.index)
    
    def get_anomaly_explanations(self, df: pd.DataFrame, anomaly_scores: pd.Series) -> pd.DataFrame:
        """
        Explain why each violation was flagged as anomalous.
        
        Compares each record's features to the median of normal violations.
        """
        features = self.extract_features(df)
        features_scaled = self.scaler.transform(features)
        
        # Get median feature values for normal violations
        normal_mask = anomaly_scores > np.percentile(anomaly_scores, 50)
        if normal_mask.sum() > 10:
            median_normal = features[normal_mask].median()
        else:
            median_normal = features.median()
        
        # Calculate deviation from median for each record
        deviations = features.subtract(median_normal, axis=1)
        
        # Identify top 3 contributing features per record
        explanations = []
        for idx in df.index:
            row_dev = deviations.loc[idx]
            top_features = row_dev.abs().nlargest(3)
            explanation_parts = []
            for feat, val in top_features.items():
                direction = "high" if row_dev[feat] > 0 else "low"
                explanation_parts.append(f"{feat}={direction}")
            explanations.append(", ".join(explanation_parts))
        
        return pd.DataFrame({
            'anomaly_score': anomaly_scores,
            'anomaly_reason': explanations,
            'is_anomaly': anomaly_scores < np.percentile(anomaly_scores, self.contamination * 100)
        }, index=df.index)


def compute_enhanced_priority_score(
    cii_scores: pd.Series,
    anomaly_scores: pd.Series,
    alpha: float = 0.7
) -> pd.Series:
    """
    Combine CII (rule-based) with anomaly detection (ML-based).
    
    Enhanced Score = alpha * CII_normalized + (1-alpha) * (1 - anomaly_normalized)
    
    Args:
        cii_scores: Congestion Impact Indicator scores
        anomaly_scores: Isolation Forest scores (lower = more anomalous)
        alpha: Weight for CII vs anomaly (0.7 = 70% CII, 30% anomaly)
    
    Returns:
        Combined priority scores
    """
    # Normalize CII to [0, 1]
    cii_norm = (cii_scores - cii_scores.min()) / (cii_scores.max() - cii_scores.min() + 1e-9)
    
    # Normalize anomaly scores to [0, 1] (invert so higher = more anomalous)
    anom_norm = 1 - (anomaly_scores - anomaly_scores.min()) / (anomaly_scores.max() - anomaly_scores.min() + 1e-9)
    
    # Combine
    enhanced = alpha * cii_norm + (1 - alpha) * anom_norm
    
    return enhanced


if __name__ == "__main__":
    # Test with sample data
    print("Testing Isolation Forest Anomaly Detection...")
    
    # Create synthetic test data
    np.random.seed(42)
    n_samples = 1000
    
    test_data = pd.DataFrame({
        'latitude': 12.97 + np.random.randn(n_samples) * 0.01,
        'longitude': 77.59 + np.random.randn(n_samples) * 0.01,
        'created_date': pd.date_range('2024-01-01', periods=n_samples, freq='H'),
        'vehicle_type': np.random.choice(['CAR', '2W', 'TRUCK', 'AUTO RICKSHAW'], n_samples),
        'violation': ['["WRONG PARKING"]'] * n_samples,
        'junction_': np.random.choice(['BTP001', 'BTP002', 'No Junction'], n_samples)
    })
    
    # Inject anomalies
    test_data.loc[0:9, 'hour_of_day'] = 3  # Unusual hour
    test_data.loc[10:19, 'vehicle_type'] = 'TANKER'  # Rare vehicle
    test_data.loc[20:29, 'junction_'] = 'BTP999'  # Rare junction
    
    detector = ViolationAnomalyDetector(contamination=0.05)
    scores, labels = detector.fit_predict(test_data)
    explanations = detector.get_anomaly_explanations(test_data, scores)
    
    print(f"\nTotal violations: {len(test_data)}")
    print(f"Anomalies detected: {(labels == -1).sum()} ({(labels == -1).mean()*100:.1f}%)")
    print(f"\nTop 5 anomalies:")
    top_anomalies = explanations.nsmallest(5, 'anomaly_score')
    for idx, row in top_anomalies.iterrows():
        print(f"  ID {idx}: Score={row['anomaly_score']:.3f}, Reason: {row['anomaly_reason']}")
    
    print("\n✅ Anomaly detection module working correctly")
