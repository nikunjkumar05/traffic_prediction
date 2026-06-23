"""
Presence Probability Model — Estimates the likelihood that a reported violation
is still physically present when an officer checks the dashboard.

Problem: created_datetime is the REPORTING time, not the PARKING START time.
A vehicle reported 60 minutes ago may have left 30 minutes ago.
Sending an officer to an empty spot wastes enforcement resources.

Solution: Bayesian logistic decay model.
  P(still_present | t_elapsed, E[duration]) = 1 / (1 + exp((t_elapsed - E[duration]) / k))

  where t_elapsed = minutes since report
        E[duration] = estimated parking duration from config (by violation type × vehicle adjustment)
        k = 15 min spread parameter (when t_elapsed = E[duration], P ≈ 0.5)

This allows the priority queue to filter out violations that have likely
resolved naturally, focusing enforcement on violations still actively blocking roads.
"""

import numpy as np
import pandas as pd
from typing import Optional

# Logistic spread parameter: at t = E[duration], P ≈ 0.5
# Lower k = sharper cutoff (more aggressive filtering)
# Higher k = gentler decay (more conservative filtering)
DEFAULT_SPREAD_MINUTES = 15.0


def presence_probability(
    elapsed_minutes: float,
    estimated_duration: float,
    spread: float = DEFAULT_SPREAD_MINUTES,
) -> float:
    """
    Compute probability that a violation is still present.

    Args:
        elapsed_minutes: Minutes since the violation was reported
        estimated_duration: Estimated parking duration in minutes
        spread: Logistic spread parameter (default 15 min)

    Returns:
        Probability between 0 and 1
    """
    if elapsed_minutes <= 0:
        return 1.0
    if estimated_duration <= 0:
        return 0.0
    return float(1.0 / (1.0 + np.exp((elapsed_minutes - estimated_duration) / spread)))


def compute_presence_for_violation(
    created_at: pd.Timestamp,
    duration_minutes: float,
    reference_time: Optional[pd.Timestamp] = None,
) -> float:
    """
    Compute presence probability for a single violation at a reference time.

    Args:
        created_at: When the violation was reported
        duration_minutes: Estimated parking duration
        reference_time: Time to evaluate against (defaults to now)

    Returns:
        Probability the violation is still present
    """
    if reference_time is None:
        reference_time = pd.Timestamp.now()
    elapsed = (reference_time - created_at).total_seconds() / 60.0
    return presence_probability(elapsed, duration_minutes)


def compute_presence_series(
    df: pd.DataFrame,
    reference_time: Optional[pd.Timestamp] = None,
    created_col: str = 'created_datetime',
    duration_col: str = 'duration_minutes',
) -> pd.Series:
    """
    Compute presence probability for all violations in a DataFrame.

    Args:
        df: Violations DataFrame with created_datetime and duration_minutes columns
        reference_time: Time to evaluate against (defaults to now)
        created_col: Name of the created timestamp column
        duration_col: Name of the duration column

    Returns:
        Series of presence probabilities (0-1)
    """
    if reference_time is None:
        reference_time = pd.Timestamp.now()

    if created_col not in df.columns or duration_col not in df.columns:
        return pd.Series(1.0, index=df.index)

    elapsed = (reference_time - df[created_col]).dt.total_seconds() / 60.0
    durations = df[duration_col].fillna(30.0)

    return pd.Series(
        [
            presence_probability(e, d)
            for e, d in zip(elapsed, durations)
        ],
        index=df.index,
    )


def filter_present_violations(
    df: pd.DataFrame,
    threshold: float = 0.3,
    reference_time: Optional[pd.Timestamp] = None,
) -> pd.DataFrame:
    """
    Filter violations to only those likely still present.

    Args:
        df: Violations DataFrame
        threshold: Minimum probability to keep (default 0.3)
        reference_time: Reference time for presence computation

    Returns:
        Filtered DataFrame with only high-presence-probability violations
    """
    if len(df) == 0:
        return df
    probs = compute_presence_series(df, reference_time)
    mask = probs >= threshold
    dropped = (~mask).sum()
    if dropped > 0:
        print(f"  [PRESENCE] Filtered {dropped}/{len(df)} violations (P < {threshold})")
    return df[mask].copy()
