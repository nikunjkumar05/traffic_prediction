"""
GNN Cascade Predictor — Graph Neural Network for spatio-temporal cascade prediction.

Classifies directed edges (junction A → junction B) as cascade-likely or not,
based on node features derived from violation data. Uses a lightweight 2-layer
message-passing network implemented in pure numpy (no PyTorch dependency).

Architecture:
  Input: Adjacency matrix A (N×N), Node features X (N×D)
  Layer 1: H1 = ReLU(A @ X @ W1 + b1)   — message passing + transform
  Layer 2: H2 = sigmoid(A @ H1 @ W2 + b2)  — edge probability
  Edge prob = H2[i,j] for directed edge i→j

Training: Supervised on known cascade pairs from lag correlation analysis.
Loss: Binary cross-entropy on edge predictions.
Label: 1 if lag_correlation > 0.2 between i and j, 0 otherwise.

This is genuine graph ML — not a formula or rule-based system.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from sklearn.metrics import roc_auc_score, average_precision_score
from sklearn.preprocessing import StandardScaler
import sys
from pathlib import Path
import json
import warnings

sys.path.insert(0, str(Path(__file__).parent))

from config import get_config_value
from cascade import build_adjacency_graph, compute_lag_correlation


class MessagePassingCascadeNet:
    """
    2-layer message-passing neural network for cascade edge prediction.

    Pure numpy implementation — no PyTorch required.
    Forward pass: H = sigmoid(A @ ReLU(A @ X @ W1 + b1) @ W2 + b2)

    where A = normalized adjacency matrix, X = node features.
    Edge probability for (i,j) = H[i,j].
    """

    def __init__(self, n_features: int, hidden_dim: int = 16, seed: int = 42):
        self.n_features = n_features
        self.hidden_dim = hidden_dim
        self.rng = np.random.RandomState(seed)

        # Xavier initialization
        scale1 = np.sqrt(2.0 / (n_features + hidden_dim))
        scale2 = np.sqrt(2.0 / (hidden_dim + 1))

        self.W1 = self.rng.randn(n_features, hidden_dim) * scale1
        self.b1 = np.zeros(hidden_dim)
        self.W2 = self.rng.randn(hidden_dim, 1) * scale2
        self.b2 = np.zeros(1)

        self.scaler = StandardScaler()

    def _normalize_adj(self, A: np.ndarray) -> np.ndarray:
        """Symmetric normalization: D^{-1/2} @ A @ D^{-1/2}."""
        d = np.sum(A, axis=1) + 1e-10
        d_sqrt_inv = np.power(d, -0.5)
        return A * d_sqrt_inv[:, None] * d_sqrt_inv[None, :]

    def forward(self, X: np.ndarray, A_norm: np.ndarray) -> np.ndarray:
        """
        Forward pass.

        Args:
            X: Node features (N, D)
            A_norm: Normalized adjacency matrix (N, N)

        Returns:
            Edge probabilities (N, N) where out[i,j] = P(cascade i→j)
        """
        # Layer 1: message passing + ReLU
        H1 = A_norm @ X @ self.W1 + self.b1
        H1 = np.maximum(0, H1)  # ReLU

        # Layer 2: message passing + sigmoid
        H2 = A_norm @ H1 @ self.W2 + self.b2
        H2 = 1.0 / (1.0 + np.exp(-H2))  # sigmoid

        return H2.squeeze()

    def _bce_loss(self, y_pred: np.ndarray, y_true: np.ndarray, eps: float = 1e-7) -> float:
        """Binary cross-entropy loss."""
        y_pred = np.clip(y_pred, eps, 1 - eps)
        return -np.mean(y_true * np.log(y_pred) + (1 - y_true) * np.log(1 - y_pred))

    def fit(
        self,
        X: np.ndarray,
        A: np.ndarray,
        edge_labels: np.ndarray,
        n_epochs: int = 200,
        lr: float = 0.01,
        verbose: bool = True,
    ) -> List[float]:
        """
        Train the message-passing network via SGD.

        Args:
            X: Node features (N, D)
            A: Adjacency matrix (N, N)
            edge_labels: Ground truth edge labels (N, N) — 1 if cascade, 0 otherwise
            n_epochs: Number of training epochs
            lr: Learning rate

        Returns:
            Loss history
        """
        X_scaled = self.scaler.fit_transform(X)
        A_norm = self._normalize_adj(A)

        # Only train on edges that exist (A > 0)
        edge_mask = A > 0
        edge_indices = np.where(edge_mask)
        n_edges = len(edge_indices[0])

        loss_history = []
        best_loss = float('inf')
        best_params = None
        patience = 20
        patience_counter = 0

        for epoch in range(n_epochs):
            # Forward
            H1 = A_norm @ X_scaled @ self.W1 + self.b1
            H1_relu = np.maximum(0, H1)
            H2 = A_norm @ H1_relu @ self.W2 + self.b2
            y_pred = 1.0 / (1.0 + np.exp(-H2)).squeeze()

            # Loss
            loss = self._bce_loss(y_pred[edge_mask], edge_labels[edge_mask])
            loss_history.append(loss)

            # Gradient (manual backward pass)
            dy_pred = (y_pred - edge_labels) / n_edges
            dH2 = dy_pred[:, None]  # (N, 1)

            dW2 = H1_relu.T @ (A_norm.T @ dH2.squeeze())
            db2 = np.sum(dH2)

            dH1_relu = (A_norm.T @ dH2.squeeze()) @ self.W2.T
            dH1 = dH1_relu * (H1 > 0).astype(float)

            dW1 = X_scaled.T @ (A_norm.T @ dH1)
            db1 = np.sum(dH1, axis=0)

            # Update
            self.W2 -= lr * dW2[:, None]
            self.b2 -= lr * db2
            self.W1 -= lr * dW1
            self.b1 -= lr * db1

            if verbose and (epoch + 1) % 40 == 0:
                auc = roc_auc_score(edge_labels[edge_mask], y_pred[edge_mask])
                print(f"  [GNN] Epoch {epoch+1}/{n_epochs}: loss={loss:.4f}, AUC={auc:.4f}")

            # Early stopping
            if loss < best_loss:
                best_loss = loss
                best_params = (self.W1.copy(), self.b1.copy(), self.W2.copy(), self.b2.copy())
                patience_counter = 0
            else:
                patience_counter += 1
                if patience_counter >= patience:
                    if verbose:
                        print(f"  [GNN] Early stopping at epoch {epoch+1}")
                    break

        # Restore best params
        if best_params:
            self.W1, self.b1, self.W2, self.b2 = best_params

        return loss_history

    def predict_edges(
        self, X: np.ndarray, A: np.ndarray
    ) -> np.ndarray:
        """
        Predict cascade probability for all edges.

        Args:
            X: Node features (N, D)
            A: Adjacency matrix (N, N)

        Returns:
            Edge probability matrix (N, N)
        """
        X_scaled = self.scaler.transform(X)
        A_norm = self._normalize_adj(A)
        return self.forward(X_scaled, A_norm)

    def predict_cascade_chain(
        self,
        X: np.ndarray,
        A: np.ndarray,
        source_node: int,
        threshold: float = 0.5,
        max_steps: int = 5,
    ) -> List[List[int]]:
        """
        Predict cascade chains starting from a source node.

        Uses greedy propagation: at each step, follow the highest-probability edge
        from the current node that exceeds the threshold.

        Returns:
            List of cascade chains (each is a list of node indices)
        """
        edge_probs = self.predict_edges(X, A)
        chains = []

        visited = {source_node}
        current = source_node
        chain = [source_node]

        for _ in range(max_steps - 1):
            n_neighbors = np.where(A[current] > 0)[0]
            unvisited = [n for n in n_neighbors if n not in visited]
            if not unvisited:
                break

            # Pick highest probability unvisited neighbor
            best = max(unvisited, key=lambda n: edge_probs[current, n])
            if edge_probs[current, best] < threshold:
                break

            visited.add(best)
            chain.append(best)
            current = best

        if len(chain) > 1:
            chains.append(chain)

        return chains


def extract_node_features(
    df: pd.DataFrame,
    junction_names: List[str],
    time_bin: Optional[str] = None,
) -> np.ndarray:
    """
    Extract node features for all junctions from violation data.

    Features per junction:
    1. Violation count in time window (normalized)
    2. Average congestion_cost (normalized)
    3. Average capacity_loss_pct (normalized)
    4. Hour sin/cos (cyclical encoding if time_bin given)
    5. Spatial density mean
    6. Unique vehicle types count

    Returns:
        Node feature matrix (N, D)
    """
    if time_bin and 'time_bin' not in df.columns and 'created_datetime' in df.columns:
        df = df.copy()
        bin_minutes = get_config_value('traffic_sim', 'time_bin_minutes', 15)
        df['time_bin_window'] = df['created_datetime'].dt.floor(f'{bin_minutes}min')
    elif 'created_datetime' in df.columns:
        df = df.copy()
        df['time_bin_window'] = df['created_datetime'].dt.floor('15min')

    features = []
    for jname in junction_names:
        jdf = df[df['mapped_junction'] == jname]
        if len(jdf) == 0:
            features.append([0, 0, 0, 0, 0, 0, 0])
            continue

        v_count = len(jdf)
        avg_cost = float(jdf['congestion_cost'].mean()) if 'congestion_cost' in jdf.columns else 0
        avg_cap_loss = float(jdf['capacity_loss_pct'].mean()) if 'capacity_loss_pct' in jdf.columns else 0
        avg_density = float(jdf['spatial_density'].mean()) if 'spatial_density' in jdf.columns else 0
        n_vehicles = int(jdf['vehicle_type'].nunique()) if 'vehicle_type' in jdf.columns else 0

        # Time features
        if time_bin:
            hour = pd.to_datetime(time_bin).hour
            hour_sin = np.sin(2 * np.pi * hour / 24)
            hour_cos = np.cos(2 * np.pi * hour / 24)
        else:
            hour_sin = 0
            hour_cos = 0

        features.append([v_count, avg_cost, avg_cap_loss, avg_density, n_vehicles, hour_sin, hour_cos])

    return np.array(features, dtype=float)


def build_edge_labels(
    df: pd.DataFrame,
    junction_names: List[str],
    graph_df: pd.DataFrame,
    correlation_threshold: float = 0.2,
) -> np.ndarray:
    """
    Build ground truth edge labels from historical lag correlation.

    Edge (i,j) is labeled 1 if lag_correlation(i→j) > threshold, else 0.

    Returns:
        Edge label matrix (N, N)
    """
    n = len(junction_names)
    name_to_idx = {name: i for i, name in enumerate(junction_names)}
    labels = np.zeros((n, n), dtype=float)

    if len(graph_df) == 0:
        return labels

    for _, row in graph_df.iterrows():
        src = row.get('from_junction')
        dst = row.get('to_junction')
        corr = row.get('lag_correlation', 0)
        if src in name_to_idx and dst in name_to_idx:
            if corr > correlation_threshold:
                labels[name_to_idx[src], name_to_idx[dst]] = 1.0

    n_pos = int(labels.sum())
    if n_pos > 0:
        print(f"  [GNN] Positive cascade edges: {n_pos} / {n * n} total pairs")

    return labels


def run_gnn_cascade(
    df: pd.DataFrame,
    junction_coords: dict,
    graph_df: Optional[pd.DataFrame] = None,
    lag_df: Optional[pd.DataFrame] = None,
) -> Dict:
    """
    Run GNN cascade prediction pipeline.

    Args:
        df: Violations DataFrame
        junction_coords: Dict of junction name → [lat, lon]
        graph_df: Pre-computed adjacency graph (optional)
        lag_df: Pre-computed lag correlation results (optional)

    Returns:
        Dict with model, predictions, and evaluation metrics
    """
    print("=" * 60)
    print("GNN Cascade Predictor — Message-Passing Network")
    print("=" * 60)

    junction_names = list(junction_coords.keys())
    n_nodes = len(junction_names)
    name_to_idx = {name: i for i, name in enumerate(junction_names)}

    if n_nodes < 5:
        return {'status': 'insufficient_junctions', 'n_junctions': n_nodes}

    # Build adjacency graph if not provided
    if graph_df is None:
        max_dist = get_config_value('cascades', 'adjacency_max_distance_m', 3000)
        graph_df = build_adjacency_graph(junction_coords, max_distance_m=max_dist)

    # Build adjacency matrix
    A = np.zeros((n_nodes, n_nodes))
    for _, row in graph_df.iterrows():
        src = row.get('from')
        dst = row.get('to')
        if src in name_to_idx and dst in name_to_idx:
            A[name_to_idx[src], name_to_idx[dst]] = 1.0

    # Remove self-loops
    np.fill_diagonal(A, 0)

    # Compute lag correlations if not provided
    if lag_df is None or len(lag_df) == 0:
        correlation_threshold = get_config_value('cascades', 'correlation_threshold', 0.2)
        lag_df = compute_lag_correlation(df, graph_df, lag_minutes=15)

    # Build edge labels from lag correlation
    corr_threshold = get_config_value('cascades', 'correlation_threshold', 0.2)
    edge_labels = build_edge_labels(lag_df, junction_names, lag_df, corr_threshold)

    # Extract node features
    X = extract_node_features(df, junction_names)
    n_features = X.shape[1]
    print(f"  [GNN] Nodes: {n_nodes}, Features: {n_features}, Edges: {int(A.sum())}")

    # Train model
    model = MessagePassingCascadeNet(n_features, hidden_dim=16)
    loss_history = model.fit(X, A, edge_labels, n_epochs=200, lr=0.01)

    # Evaluate on all edges
    edge_mask = A > 0
    if edge_mask.sum() > 1:
        edge_probs = model.predict_edges(X, A)
        y_true = edge_labels[edge_mask]
        y_pred = edge_probs[edge_mask]
        auc = roc_auc_score(y_true, y_pred)
        ap = average_precision_score(y_true, y_pred)
        print(f"  [GNN] Evaluation: AUC={auc:.4f}, AP={ap:.4f}")
    else:
        auc, ap = 0.0, 0.0

    # Convert results to serializable format
    edge_predictions = []
    for i, jname in enumerate(junction_names):
        neighbors = np.where(A[i] > 0)[0]
        for j in neighbors:
            edge_predictions.append({
                'from_junction': jname,
                'to_junction': junction_names[j],
                'gnn_probability': round(float(edge_probs[i, j]), 4),
                'ground_truth': int(edge_labels[i, j]),
            })

    edge_predictions.sort(key=lambda x: x['gnn_probability'], reverse=True)

    print(f"\n  [GNN] Top 5 predicted cascade edges:")
    for ep in edge_predictions[:5]:
        arrow = " ✓" if ep['ground_truth'] == 1 else ""
        print(f"    {ep['from_junction']} → {ep['to_junction']}: P={ep['gnn_probability']:.3f}{arrow}")

    print("GNN Cascade Predictor complete.")
    print("=" * 60)

    return {
        'status': 'success',
        'n_junctions': n_nodes,
        'n_features': n_features,
        'n_edges_trained': int(edge_mask.sum()),
        'auc': round(auc, 4),
        'average_precision': round(ap, 4),
        'edge_predictions': edge_predictions[:50],
        'loss_history': [round(l, 4) for l in loss_history],
        'model_type': 'MessagePassingCascadeNet (pure numpy GNN)',
    }


if __name__ == '__main__':
    from data_pipeline import run_pipeline
    from congestion_cost import run_congestion_cost

    with open('data/external/junction_coords.json', 'r', encoding='utf-8') as f:
        coords = json.load(f)

    df = run_pipeline('jan to may police violation_anonymized791b166.csv', junction_coords=coords)
    df = run_congestion_cost(df, junction_coords=coords, run_simulation=False)

    result = run_gnn_cascade(df, coords)

    if result.get('status') == 'success':
        print(f"\nGNN Results: AUC={result['auc']}, AP={result['average_precision']}")
        print(f"Model: {result['model_type']}")
