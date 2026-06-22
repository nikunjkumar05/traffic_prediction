"""Stage 7: SHAP Explainability Engine — Explains WHY certain junctions have high congestion impact."""

import numpy as np
import pandas as pd
import shap
import pickle
from pathlib import Path
from typing import Dict, Any

FEATURE_DESCRIPTIONS = {
    'latitude': 'Location (lat)', 'longitude': 'Location (lon)',
    'hour': 'Time of day', 'day_of_week': 'Day of week', 'month': 'Month',
    'duration_minutes': 'Parking duration (min)', 'severity': 'Violation severity',
    'vehicle_type_encoded': 'Vehicle type', 'violation_type_encoded': 'Violation type',
    'is_junction': 'At named junction', 'junction_distance': 'Distance to junction (m)',
    'is_morning_rush': 'Morning rush (7-10am)', 'is_evening_rush': 'Evening rush (5-8pm)',
    'is_weekend': 'Weekend',
    'hour_sin': 'Hour cyclical (sin)', 'hour_cos': 'Hour cyclical (cos)',
    'day_sin': 'Day cyclical (sin)', 'day_cos': 'Day cyclical (cos)',
}


class SHAPExplainer:
    """SHAP explainability for XGBoost/LightGBM predictions."""

    def __init__(self, model, X_train: pd.DataFrame, feature_names: list):
        self.model = model
        self.feature_names = feature_names
        self.X_train = X_train
        self.explainer = shap.TreeExplainer(model)
        self._shap_cache = None

    def explain_junction(self, junction_data: pd.DataFrame, top_n: int = 6) -> Dict[str, Any]:
        """Explain why a specific junction has high/low congestion cost."""
        shap_vals = self.explainer.shap_values(junction_data)

        contributions = [
            {'feature': f, 'shap_value': float(shap_vals[0][i]),
             'feature_value': float(junction_data.iloc[0][f])}
            for i, f in enumerate(self.feature_names)
        ]
        contributions.sort(key=lambda x: abs(x['shap_value']), reverse=True)

        positive = [c for c in contributions if c['shap_value'] > 0][:top_n]
        negative = [c for c in contributions if c['shap_value'] < 0][:top_n]

        def _fmt(c):
            return {'factor': FEATURE_DESCRIPTIONS.get(c['feature'], c['feature']),
                    'impact': round(c['shap_value'], 2), 'raw_feature': c['feature'],
                    'feature_value': c['feature_value']}

        junction_name = junction_data['mapped_junction'].iloc[0] if 'mapped_junction' in junction_data.columns else 'Unknown'
        return {
            'junction': junction_name,
            'predicted_cost': float(self.model.predict(junction_data)[0]),
            'top_positive_factors': [_fmt(c) for c in positive],
            'top_negative_factors': [_fmt(c) for c in negative],
            'base_value': float(self.explainer.expected_value),
        }

    def get_global_importance(self) -> pd.DataFrame:
        """Get global feature importance (mean |SHAP| across sampled training data)."""
        if self._shap_cache is None:
            sample = self.X_train.sample(n=min(1000, len(self.X_train)), random_state=42)
            self._shap_cache = self.explainer.shap_values(sample)

        imp = pd.DataFrame({
            'feature': self.feature_names,
            'mean_abs_shap': np.abs(self._shap_cache).mean(axis=0),
        }).sort_values('mean_abs_shap', ascending=False)
        imp['description'] = imp['feature'].map(FEATURE_DESCRIPTIONS)
        return imp

    def generate_intervention_recommendations(self, explanation: Dict) -> list:
        """Generate actionable recommendations based on SHAP explanation."""
        recs = []
        for f in explanation['top_positive_factors']:
            feat, impact, val = f['raw_feature'], f['impact'], f['feature_value']
            if feat == 'junction_distance' and val < 10:
                recs.append({'action': 'ENFORCE_NOW', 'reason': f"Within {val:.0f}m of junction (+{impact:.1f})",
                             'intervention': 'Pre-position tow truck 30min before peak'})
            elif feat == 'duration_minutes' and val > 40:
                recs.append({'action': 'ADD_PARKING_BAYS', 'reason': f"Long duration ({val:.0f} min, +{impact:.1f})",
                             'intervention': 'Add scooter/car bays within 200m'})
            elif feat == 'vehicle_type_encoded' and impact > 5:
                recs.append({'action': 'RESTRICT_LARGE_VEHICLES', 'reason': f"Large vehicle (+{impact:.1f})",
                             'intervention': 'No-stopping zone for HGV/Bus/Tanker'})
            elif feat in ('is_morning_rush', 'is_evening_rush'):
                recs.append({'action': 'PEAK_PATROL', 'reason': f"Rush hour amplifies (+{impact:.1f})",
                             'intervention': 'Increase patrol during peak hours'})
            elif feat == 'severity' and val >= 3:
                recs.append({'action': 'IMMEDIATE_TOW', 'reason': f"Critical severity (+{impact:.1f})",
                             'intervention': 'Dispatch tow truck immediately'})
        return recs


def format_explanation_for_display(explanation: Dict) -> str:
    """Format SHAP explanation as human-readable text."""
    lines = [f"**Junction:** {explanation['junction']}",
             f"**Predicted Delay:** {explanation['predicted_cost']:.1f} vehicle-minutes", "",
             "**Factors INCREASING congestion:**"]
    for f in explanation['top_positive_factors'][:4]:
        lines.append(f"  + {f['factor']}: +{f['impact']:.1f}")
    if explanation['top_negative_factors']:
        lines.append("\n**Factors DECREASING congestion:**")
        for f in explanation['top_negative_factors'][:3]:
            lines.append(f"  - {f['factor']}: {f['impact']:.1f}")
    return "\n".join(lines)


def run_shap_analysis(df, models, output_dir='outputs/reports'):
    """Run full SHAP analysis and save results."""
    print("=" * 60)
    print("Stage 7: SHAP Explainability Engine")
    print("=" * 60)

    if not models or not models.get('xgb_model'):
        print("  No model available — skipping")
        return {}

    from src.prediction import FEATURES, prepare_features
    if not all(f in df.columns for f in FEATURES):
        df, features, _ = prepare_features(df)
    else:
        features = FEATURES

    X = df[features].fillna(0)
    explainer = SHAPExplainer(models['xgb_model'], X, features)
    global_imp = explainer.get_global_importance()

    print("\n  Top 5 Features by SHAP Importance:")
    for _, r in global_imp.head(5).iterrows():
        print(f"    {r['description']}: {r['mean_abs_shap']:.4f}")

    junction_agg = df.groupby('mapped_junction')['congestion_cost'].sum()
    top_junction = junction_agg.idxmax() if len(junction_agg) > 0 else 'Unknown'
    junction_data = df[df['mapped_junction'] == top_junction].head(1)
    if len(junction_data) > 0:
        exp = explainer.explain_junction(junction_data[features])
        print(f"\n  Top Junction: {exp['junction']} | Predicted: {exp['predicted_cost']:.1f} veh-min")
        for f in exp['top_positive_factors'][:3]:
            print(f"    + {f['factor']}: +{f['impact']:.1f}")

    print("=" * 60)
    print("Stage 7 complete.")
    print("=" * 60)
    return {'explainer': explainer, 'global_importance': global_imp}
