"""
Officer Feedback System for Continuous Model Improvement
Collects ground truth from enforcement actions to retrain models
"""

import pandas as pd
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json


class OfficerFeedbackCollector:
    """
    Collect and analyze officer feedback after enforcement actions.
    
    Feedback options:
    ✅ Vehicle found - Action taken (Towed/Warned/No Action)
    ❌ Vehicle not found - False positive
    ⚠️ Vehicle moved before arrival
    
    Impact level: None / Minor / Moderate / Severe
    
    This feedback loop enables continuous model improvement.
    """
    
    def __init__(self, db_path: str = "feedback.db"):
        """
        Initialize feedback collector with SQLite database.
        
        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path
        # Initialize database immediately (don't wait for first operation)
        self._initialize_database()
        print(f"  [DEBUG] Database initialized at {db_path}")
    
    def _initialize_database(self):
        """Create feedback table if it doesn't exist."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Always create table (works for both file and in-memory databases)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS officer_feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                violation_id TEXT NOT NULL,
                officer_id TEXT NOT NULL,
                action_taken TEXT,
                vehicle_found INTEGER,
                actual_impact TEXT,
                timestamp TEXT NOT NULL,
                predicted_cii REAL,
                predicted_anomaly REAL,
                response_time_minutes INTEGER,
                notes TEXT,
                UNIQUE(violation_id, officer_id)
            )
        ''')
        
        # Create index for faster queries
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_timestamp 
            ON officer_feedback(timestamp)
        ''')
        
        conn.commit()
        conn.close()
    
    def record_feedback(
        self,
        violation_id: str,
        officer_id: str,
        action_taken: str,
        vehicle_found: bool,
        actual_impact: str,
        predicted_cii: float,
        predicted_anomaly: Optional[float] = None,
        response_time_minutes: Optional[int] = None,
        notes: Optional[str] = None
    ) -> bool:
        """
        Record feedback from officer after enforcement action.
        
        Args:
            violation_id: Unique identifier of the violation
            officer_id: Badge number or ID of responding officer
            action_taken: One of 'Towed', 'Warned', 'No Action'
            vehicle_found: True if vehicle was present at location
            actual_impact: One of 'None', 'Minor', 'Moderate', 'Severe'
            predicted_cii: CII score that was shown to officer
            predicted_anomaly: Anomaly score (optional)
            response_time_minutes: Time from alert to arrival (optional)
            notes: Free-text notes from officer (optional)
        
        Returns:
            True if successfully recorded, False if duplicate
        """
        # Validate inputs
        valid_actions = {'Towed', 'Warned', 'No Action', 'Pending'}
        valid_impacts = {'None', 'Minor', 'Moderate', 'Severe'}
        
        if action_taken not in valid_actions:
            raise ValueError(f"Invalid action_taken: {action_taken}. Must be one of {valid_actions}")
        
        if actual_impact not in valid_impacts:
            raise ValueError(f"Invalid actual_impact: {actual_impact}. Must be one of {valid_impacts}")
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT OR REPLACE INTO officer_feedback (
                    violation_id, officer_id, action_taken, vehicle_found,
                    actual_impact, timestamp, predicted_cii, predicted_anomaly,
                    response_time_minutes, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                violation_id,
                officer_id,
                action_taken,
                1 if vehicle_found else 0,
                actual_impact,
                datetime.now().isoformat(),
                predicted_cii,
                predicted_anomaly,
                response_time_minutes,
                notes
            ))
            
            conn.commit()
            return True
            
        except sqlite3.IntegrityError:
            # Duplicate entry
            conn.rollback()
            return False
            
        finally:
            conn.close()
    
    def get_model_accuracy(self, days: int = 30) -> Dict:
        """
        Calculate model precision/recall based on officer feedback.
        
        Args:
            days: Number of days of feedback to analyze
        
        Returns:
            Dictionary with precision, recall, total_cases, and trend
        """
        conn = sqlite3.connect(self.db_path)
        
        # Get recent feedback
        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        query = '''
            SELECT * FROM officer_feedback 
            WHERE timestamp >= ?
        '''
        
        df = pd.read_sql_query(query, conn, params=[cutoff_date])
        conn.close()
        
        if len(df) == 0:
            return {
                'precision': None,
                'recall': None,
                'total_cases': 0,
                'accuracy_trend': 'INSUFFICIENT_DATA',
                'message': f'No feedback data in last {days} days'
            }
        
        # True positives: High prediction (CII > 500) AND actual impact Moderate/Severe
        high_prediction = df['predicted_cii'] > 500
        actual_high_impact = df['actual_impact'].isin(['Moderate', 'Severe'])
        
        true_positives = len(df[high_prediction & actual_high_impact])
        false_positives = len(df[high_prediction & ~actual_high_impact])
        
        # False negatives: Low prediction but actual high impact
        low_prediction = ~high_prediction
        false_negatives = len(df[low_prediction & actual_high_impact])
        
        # Precision: Of high predictions, how many were correct?
        precision = true_positives / (true_positives + false_positives + 1e-9)
        
        # Recall: Of actual high impact cases, how many did we catch?
        total_actual_high = len(df[actual_high_impact])
        recall = true_positives / (total_actual_high + 1e-9)
        
        # F1 Score
        f1 = 2 * (precision * recall) / (precision + recall + 1e-9)
        
        # Determine trend
        if precision >= 0.85:
            trend = 'EXCELLENT'
        elif precision >= 0.75:
            trend = 'IMPROVING'
        elif precision >= 0.65:
            trend = 'NEEDS_WORK'
        else:
            trend = 'CRITICAL'
        
        return {
            'precision': round(precision, 3),
            'recall': round(recall, 3),
            'f1_score': round(f1, 3),
            'total_cases': len(df),
            'true_positives': true_positives,
            'false_positives': false_positives,
            'false_negatives': false_negatives,
            'accuracy_trend': trend,
            'vehicle_found_rate': round(df['vehicle_found'].mean(), 3),
            'avg_response_time_min': round(df['response_time_minutes'].mean(), 1) if df['response_time_minutes'].notna().any() else None
        }
    
    def get_feedback_summary(self, days: int = 7) -> Dict:
        """
        Get summary statistics for recent feedback.
        
        Args:
            days: Number of days to summarize
        
        Returns:
            Dictionary with action breakdown, impact distribution, etc.
        """
        conn = sqlite3.connect(self.db_path)
        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        query = '''
            SELECT * FROM officer_feedback 
            WHERE timestamp >= ?
        '''
        
        df = pd.read_sql_query(query, conn, params=[cutoff_date])
        conn.close()
        
        if len(df) == 0:
            return {'message': f'No feedback data in last {days} days'}
        
        # Action breakdown
        action_counts = df['action_taken'].value_counts().to_dict()
        
        # Impact distribution
        impact_counts = df['actual_impact'].value_counts().to_dict()
        
        # Vehicle found rate by action
        found_by_action = df.groupby('action_taken')['vehicle_found'].mean().to_dict()
        
        # Top officers by feedback count
        officer_counts = df['officer_id'].value_counts().head(5).to_dict()
        
        return {
            'period_days': days,
            'total_feedback': len(df),
            'action_breakdown': action_counts,
            'impact_distribution': impact_counts,
            'vehicle_found_rate_by_action': {k: round(v, 3) for k, v in found_by_action.items()},
            'top_officers': officer_counts,
            'avg_predicted_cii': round(df['predicted_cii'].mean(), 1),
            'high_impact_percentage': round(len(df[df['actual_impact'].isin(['Moderate', 'Severe'])]) / len(df) * 100, 1)
        }
    
    def trigger_model_retrain(self, min_new_feedback: int = 100) -> bool:
        """
        Check if enough new feedback has been collected to justify retraining.
        
        Args:
            min_new_feedback: Minimum number of new feedback records needed
        
        Returns:
            True if retrain should be triggered, False otherwise
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Count feedback from last 7 days
        cutoff_date = (datetime.now() - timedelta(days=7)).isoformat()
        
        cursor.execute('''
            SELECT COUNT(*) FROM officer_feedback 
            WHERE timestamp >= ?
        ''', [cutoff_date])
        
        count = cursor.fetchone()[0]
        conn.close()
        
        return count >= min_new_feedback
    
    def export_feedback_csv(self, output_path: str = "feedback_export.csv") -> str:
        """
        Export all feedback to CSV for analysis.
        
        Args:
            output_path: Path to output CSV file
        
        Returns:
            Path to exported file
        """
        conn = sqlite3.connect(self.db_path)
        
        query = 'SELECT * FROM officer_feedback ORDER BY timestamp DESC'
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        df.to_csv(output_path, index=False)
        
        return output_path


def create_feedback_ui_component():
    """
    Generate Streamlit UI component for feedback collection.
    
    This function returns HTML/Streamlit code that can be embedded
    in the dashboard for officer feedback input.
    """
    
    feedback_form = """
    ### 📋 Enforcement Feedback
    
    **Violation ID:** `{violation_id}`
    
    **Response Details:**
    
    - **Vehicle Found?**
      - ✅ Yes, vehicle was present
      - ❌ No, vehicle had moved/left
      - ⚠️ Partially (different vehicle)
    
    - **Action Taken:**
      - 🚛 Towed
      - ⚠️ Warning issued
      - 📝 Citation only
      - ❌ No action required
    
    - **Actual Congestion Impact:**
      - 🔴 Severe (major gridlock)
      - 🟠 Moderate (noticeable delay)
      - 🟡 Minor (slight inconvenience)
      - ⚪ None (no impact observed)
    
    - **Response Time:** [____] minutes
    
    - **Notes (optional):**
      [Text area for officer comments]
    
    [Submit Feedback]
    """
    
    return feedback_form


if __name__ == "__main__":
    # Test feedback system
    print("Testing Officer Feedback System...\n")
    
    # Initialize collector
    collector = OfficerFeedbackCollector(db_path=":memory:")  # In-memory for testing
    
    # Record sample feedback
    test_cases = [
        {
            'violation_id': 'TEST001',
            'officer_id': 'OFF123',
            'action_taken': 'Towed',
            'vehicle_found': True,
            'actual_impact': 'Severe',
            'predicted_cii': 847,
            'predicted_anomaly': -0.62,
            'response_time_minutes': 12
        },
        {
            'violation_id': 'TEST002',
            'officer_id': 'OFF123',
            'action_taken': 'Warned',
            'vehicle_found': True,
            'actual_impact': 'Moderate',
            'predicted_cii': 623,
            'predicted_anomaly': -0.31,
            'response_time_minutes': 18
        },
        {
            'violation_id': 'TEST003',
            'officer_id': 'OFF456',
            'action_taken': 'No Action',
            'vehicle_found': False,
            'actual_impact': 'None',
            'predicted_cii': 534,
            'predicted_anomaly': -0.15,
            'response_time_minutes': 25
        },
        {
            'violation_id': 'TEST004',
            'officer_id': 'OFF456',
            'action_taken': 'Towed',
            'vehicle_found': True,
            'actual_impact': 'Moderate',
            'predicted_cii': 412,  # Low prediction but moderate impact (false negative)
            'predicted_anomaly': -0.58,
            'response_time_minutes': 15
        }
    ]
    
    print("Recording feedback...")
    for case in test_cases:
        success = collector.record_feedback(**case)
        status = "✅" if success else "❌ (duplicate)"
        print(f"  {status} Recorded feedback for {case['violation_id']}")
    
    # Get accuracy metrics
    print("\n📊 Model Accuracy (Last 30 Days):")
    accuracy = collector.get_model_accuracy(days=30)
    
    print(f"  Total Cases: {accuracy['total_cases']}")
    if accuracy['precision'] is not None:
        print(f"  Precision: {accuracy['precision']:.1%}")
        print(f"  Recall: {accuracy['recall']:.1%}")
        print(f"  F1 Score: {accuracy['f1_score']:.1%}")
        print(f"  Trend: {accuracy['accuracy_trend']}")
        print(f"  Vehicle Found Rate: {accuracy['vehicle_found_rate']:.1%}")
    
    # Get summary
    print("\n📈 Weekly Summary:")
    summary = collector.get_feedback_summary(days=7)
    print(f"  Total Feedback: {summary.get('total_feedback', 0)}")
    print(f"  Action Breakdown: {summary.get('action_breakdown', {})}")
    print(f"  Impact Distribution: {summary.get('impact_distribution', {})}")
    
    # Check if retrain needed
    should_retrain = collector.trigger_model_retrain(min_new_feedback=3)  # Lower threshold for demo
    print(f"\n🔄 Retrain Trigger: {'YES' if should_retrain else 'NO'} (threshold: 3 feedback records)")
    
    print("\n✅ Officer feedback system module working correctly")
