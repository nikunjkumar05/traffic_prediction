"""
ParkIntel — Stage 6: SHAP Explainability Engine
Explains WHY certain junctions have high congestion impact.
Uses SHAP (SHapley Additive exPlanations) for model interpretability.
"""

import numpy as np
import pandas as pd
import shap
import pickle
from pathlib import Path
from typing import Dict, Any, Optional


# --- SHAP Explainer --------------------------------------------------------

class SHAPExplainer:
    """
    SHAP Explainability Engine for ParkIntel.
    
    Explains XGBoost/LightGBM predictions by computing feature contributions.
    
    Usage:
        explainer = SHAPExplainer(model, X_train, feature_names)
        explanation = explainer.explain_junction(junction_data)
    """
    
    def __init__(self, model, X_train: pd.DataFrame, feature_names: list):
        """
        Initialize SHAP explainer.
        
        Args:
            model: Trained XGBoost or LightGBM model
            X_train: Training data (for background distribution)
            feature_names: List of feature column names
        """
        self.model = model
        self.feature_names = feature_names
        self.X_train = X_train
        
        # Create SHAP explainer
        # TreeExplainer is optimized for tree-based models (XGBoost, LightGBM)
        self.explainer = shap.TreeExplainer(model)
        
        # Pre-compute SHAP values for training data (for global importance)
        self.shap_values_train = None
        
    def compute_shap_values(self, X: pd.DataFrame) -> np.ndarray:
        """
        Compute SHAP values for a set of predictions.
        
        Args:
            X: DataFrame with same features as training data
            
        Returns:
            SHAP values array (n_samples, n_features)
        """
        return self.explainer.shap_values(X)
    
    def explain_junction(
        self, 
        junction_data: pd.DataFrame,
        top_n: int = 6
    ) -> Dict[str, Any]:
        """
        Explain why a specific junction has high/low congestion cost.
        
        This is THE key function for the "Why here?" explanation.
        
        Args:
            junction_data: Single row DataFrame with features
            top_n: Number of top features to show
            
        Returns:
            Dict with explanation breakdown
        """
        # Compute SHAP values
        shap_vals = self.explainer.shap_values(junction_data)
        
        # Get feature contributions
        contributions = []
        for i, feature in enumerate(self.feature_names):
            contributions.append({
                'feature': feature,
                'shap_value': float(shap_vals[0][i]),
                'feature_value': float(junction_data.iloc[0][feature]),
            })
        
        # Sort by absolute SHAP value (most impactful first)
        contributions.sort(key=lambda x: abs(x['shap_value']), reverse=True)
        
        # Separate positive and negative contributions
        positive = [c for c in contributions if c['shap_value'] > 0]
        negative = [c for c in contributions if c['shap_value'] < 0]
        
        # Human-readable feature descriptions
        feature_descriptions = self._get_feature_descriptions()
        
        # Build explanation
        explanation = {
            'junction': junction_data.get('mapped_junction', ['Unknown'])[0] if 'mapped_junction' in junction_data.columns else 'Unknown',
            'predicted_cost': float(self.model.predict(junction_data)[0]),
            'top_positive_factors': [
                {
                    'factor': feature_descriptions.get(c['feature'], c['feature']),
                    'impact': round(c['shap_value'], 2),
                    'raw_feature': c['feature'],
                    'feature_value': c['feature_value'],
                }
                for c in positive[:top_n]
            ],
            'top_negative_factors': [
                {
                    'factor': feature_descriptions.get(c['feature'], c['feature']),
                    'impact': round(c['shap_value'], 2),
                    'raw_feature': c['feature'],
                    'feature_value': c['feature_value'],
                }
                for c in negative[:top_n]
            ],
            'base_value': float(self.explainer.expected_value),
            'total_shap': float(shap_vals[0].sum()),
        }
        
        return explanation
    
    def get_global_importance(self) -> pd.DataFrame:
        """
        Get global feature importance across all junctions.
        
        Returns DataFrame with feature importance rankings.
        """
        # Compute SHAP values for training data
        if self.shap_values_train is None:
            # Sample for speed (use 1000 rows max)
            sample_size = min(1000, len(self.X_train))
            X_sample = self.X_train.sample(n=sample_size, random_state=42)
            self.shap_values_train = self.explainer.shap_values(X_sample)
        
        # Mean absolute SHAP value per feature
        importance = pd.DataFrame({
            'feature': self.feature_names,
            'mean_abs_shap': np.abs(self.shap_values_train).mean(axis=0),
        }).sort_values('mean_abs_shap', ascending=False)
        
        # Add human-readable names
        feature_descriptions = self._get_feature_descriptions()
        importance['description'] = importance['feature'].map(feature_descriptions)
        
        return importance
    
    def explain_batch(self, X: pd.DataFrame) -> pd.DataFrame:
        """
        Explain multiple junctions at once.
        
        Returns DataFrame with SHAP values for all junctions.
        """
        shap_vals = self.explainer.shap_values(X)
        
        result = pd.DataFrame(shap_vals, columns=self.feature_names)
        result['predicted_cost'] = self.model.predict(X)
        
        return result
    
    def _get_feature_descriptions(self) -> Dict[str, str]:
        """Human-readable descriptions for features."""
        return {
            'latitude': 'Location (latitude)',
            'longitude': 'Location (longitude)',
            'hour': 'Time of day',
            'day_of_week': 'Day of week',
            'month': 'Month',
            'duration_minutes': 'Parking duration (minutes)',
            'severity': 'Violation severity tier',
            'vehicle_type_encoded': 'Vehicle type',
            'violation_type_encoded': 'Violation type',
            'is_junction': 'At named junction',
            'junction_distance': 'Distance to junction (meters)',
            'is_morning_rush': 'Morning rush hour (7-10am)',
            'is_evening_rush': 'Evening rush hour (5-8pm)',
            'is_weekend': 'Weekend',
            'hour_sin': 'Hour cyclical (sin)',
            'hour_cos': 'Hour cyclical (cos)',
            'day_sin': 'Day cyclical (sin)',
            'day_cos': 'Day cyclical (cos)',
        }
    
    def generate_intervention_recommendations(
        self,
        explanation: Dict[str, Any]
    ) -> list:
        """
        Generate actionable recommendations based on SHAP explanation.
        
        If SHAP says "+No legal parking (+28)", recommendation: "Add parking bays"
        If SHAP says "+Metro exit 50m (+32)", recommendation: "Enforce near metro"
        """
        recommendations = []
        
        for factor in explanation['top_positive_factors']:
            feature = factor['raw_feature']
            impact = factor['impact']
            
            if feature == 'junction_distance' and factor['feature_value'] < 10:
                recommendations.append({
                    'action': 'ENFORCE优先',
                    'reason': f"Violation within {factor['feature_value']:.0f}m of junction (impact: +{impact:.1f})",
                    'intervention': 'Pre-position tow truck 30min before peak',
                })
            elif feature == 'duration_minutes' and factor['feature_value'] > 40:
                recommendations.append({
                    'action': 'ADD_PARKING_BAYS',
                    'reason': f"Long parking duration ({factor['feature_value']:.0f} min, impact: +{impact:.1f})",
                    'intervention': 'Add scooter/car bays within 200m',
                })
            elif feature == 'vehicle_type_encoded' and impact > 5:
                recommendations.append({
                    'action': 'RESTRICT_LARGE_VEHICLES',
                    'reason': f"Large vehicle causing high impact (+{impact:.1f})",
                    'intervention': 'No-stopping zone for HGV/Bus/Tanker',
                })
            elif feature == 'is_morning_rush' or feature == 'is_evening_rush':
                recommendations.append({
                    'action': 'PEAK_PATROL',
                    'reason': f"Rush hour amplifies impact (+{impact:.1f})",
                    'intervention': 'Increase patrol frequency during peak hours',
                })
            elif feature == 'severity' and factor['feature_value'] >= 3:
                recommendations.append({
                    'action': 'IMMEDIATE_TOW',
                    'reason': f"Critical severity violation (impact: +{impact:.1f})",
                    'intervention': 'Dispatch tow truck immediately',
                })
        
        return recommendations


# --- Convenience Functions -------------------------------------------------

def create_explainer_from_saved_model(
    model_path: str,
    X_train: pd.DataFrame,
    feature_names: list
) -> SHAPExplainer:
    """
    Create SHAP explainer from saved model.
    
    Args:
        model_path: Path to saved .pkl model
        X_train: Training data
        feature_names: Feature column names
        
    Returns: SHAPExplainer instance
    """
    with open(model_path, 'rb') as f:
        model = pickle.load(f)
    
    return SHAPExplainer(model, X_train, feature_names)


def format_explanation_for_display(explanation: Dict[str, Any]) -> str:
    """
    Format SHAP explanation as human-readable text.
    
    Perfect for dashboard display.
    """
    lines = []
    lines.append(f"**Junction:** {explanation['junction']}")
    lines.append(f"**Predicted Delay:** {explanation['predicted_cost']:.1f} vehicle-minutes")
    lines.append("")
    lines.append("**Why is this junction critical?**")
    lines.append("")
    
    # Positive factors (increase delay)
    lines.append("**Factors INCREASING congestion:**")
    for factor in explanation['top_positive_factors'][:4]:
        lines.append(f"  + {factor['factor']}: +{factor['impact']:.1f}")
    
    lines.append("")
    
    # Negative factors (decrease delay)
    if explanation['top_negative_factors']:
        lines.append("**Factors DECREASING congestion:**")
        for factor in explanation['top_negative_factors'][:3]:
            lines.append(f"  - {factor['factor']}: {factor['impact']:.1f}")
    
    return "\n".join(lines)


def generate_shap_summary(
    df: pd.DataFrame,
    model,
    feature_names: list
) -> Dict[str, Any]:
    """
    Generate comprehensive SHAP analysis for dashboard.
    
    Returns dict with:
        - global_importance: Feature importance rankings
        - top_junctions: Explanations for top 10 junctions
        - summary_stats: Overall model behavior
    """
    # Create explainer
    X = df[feature_names].fillna(0)
    explainer = SHAPExplainer(model, X, feature_names)
    
    # Global importance
    global_imp = explainer.get_global_importance()
    
    # Explain top junctions
    junction_stats = df.groupby('mapped_junction').agg({
        'congestion_cost': 'sum',
        'latitude': 'mean',
        'longitude': 'mean',
    }).reset_index().nlargest(10, 'congestion_cost')
    
    top_explanations = []
    for _, row in junction_stats.iterrows():
        junction_data = df[df['mapped_junction'] == row['mapped_junction']].head(1)
        if len(junction_data) > 0:
            exp = explainer.explain_junction(junction_data[feature_names])
            exp['total_delay'] = row['congestion_cost']
            top_explanations.append(exp)
    
    return {
        'global_importance': global_imp,
        'top_explanations': top_explanations,
        'explainer': explainer,
    }


# --- Run SHAP Analysis -----------------------------------------------------

def run_shap_analysis(df, models, output_dir='outputs/reports'):
    """
    Run full SHAP analysis and save results.
    """
    print("=" * 60)
    print("Stage 6: SHAP Explainability Engine")
    print("=" * 60)
    
    if not models or not models.get('xgb_model'):
        print("  No model available — skipping SHAP analysis")
        return {}
    
    from src.prediction import FEATURES, prepare_features
    
    # Prepare features if not already done
    if not all(f in df.columns for f in FEATURES):
        print("\n[1/3] Preparing features...")
        df, features, _ = prepare_features(df)
    else:
        features = FEATURES
    
    # Create explainer
    print("\n[2/3] Creating SHAP explainer...")
    X = df[features].fillna(0)
    explainer = SHAPExplainer(models['xgb_model'], X, features)
    
    # Global importance
    print("\n[3/3] Computing global feature importance...")
    global_imp = explainer.get_global_importance()
    
    print("\n  Top 5 Features by SHAP Importance:")
    for _, row in global_imp.head(5).iterrows():
        print(f"    {row['description']}: {row['mean_abs_shap']:.4f}")
    
    # Explain top junction
    junction_stats = df.groupby('mapped_junction').agg({
        'congestion_cost': 'sum',
    }).reset_index().nlargest(1, 'congestion_cost')
    
    if len(junction_stats) > 0:
        top_junction = junction_stats.iloc[0]['mapped_junction']
        junction_data = df[df['mapped_junction'] == top_junction].head(1)
        if len(junction_data) > 0:
            explanation = explainer.explain_junction(junction_data[features])
            print(f"\n  Top Junction Explanation: {explanation['junction']}")
            print(f"  Predicted: {explanation['predicted_cost']:.1f} vehicle-min")
            print("  Top factors:")
            for f in explanation['top_positive_factors'][:3]:
                print(f"    + {f['factor']}: +{f['impact']:.1f}")
    
    print("=" * 60)
    print("Stage 6 complete.")
    print("=" * 60)
    
    return {
        'explainer': explainer,
        'global_importance': global_imp,
    }


if __name__ == '__main__':
    import sys
    sys.path.insert(0, '.')
    import json
    from src.data_pipeline import run_pipeline
    from src.congestion_cost import run_congestion_cost
    from src.prediction import run_prediction
    
    with open('data/external/junction_coords.json') as f:
        coords = json.load(f)
    
    df = run_pipeline('data/raw/violations.csv', junction_coords=coords)
    df = run_congestion_cost(df, junction_coords=coords)
    models = run_prediction(df)
    shap_results = run_shap_analysis(df, models)
