"""
Model Monitoring for Influencia AI/ML System.

Provides production monitoring with:
- Feature distribution drift detection (PSI)
- Prediction score distribution monitoring
- Latency percentile tracking
- Alert thresholds for model degradation
"""

import time
import logging
import numpy as np
from collections import deque
from typing import Dict, List, Optional, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)


class FeatureDriftDetector:
    """
    Detect feature distribution drift using Population Stability Index (PSI).
    
    PSI < 0.1: No significant change
    PSI 0.1-0.25: Moderate change (monitor)
    PSI > 0.25: Significant change (alert)
    """
    
    def __init__(self, n_bins: int = 10):
        self.n_bins = n_bins
        self._reference_distributions: Dict[str, np.ndarray] = {}
        self._reference_edges: Dict[str, np.ndarray] = {}
    
    def set_reference(self, feature_name: str, values: np.ndarray) -> None:
        """Set reference distribution for a feature."""
        hist, edges = np.histogram(values, bins=self.n_bins, density=True)
        # Add small epsilon to avoid division by zero
        hist = hist + 1e-8
        hist = hist / hist.sum()
        self._reference_distributions[feature_name] = hist
        self._reference_edges[feature_name] = edges
    
    def compute_psi(
        self, feature_name: str, current_values: np.ndarray
    ) -> float:
        """
        Compute PSI between reference and current distribution.
        
        Returns:
            PSI value (lower = less drift)
        """
        if feature_name not in self._reference_distributions:
            return 0.0
        
        ref_hist = self._reference_distributions[feature_name]
        edges = self._reference_edges[feature_name]
        
        # Compute current distribution using same bins
        current_hist, _ = np.histogram(current_values, bins=edges, density=True)
        current_hist = current_hist + 1e-8
        current_hist = current_hist / current_hist.sum()
        
        # PSI = sum((current - reference) * ln(current / reference))
        psi = np.sum(
            (current_hist - ref_hist) * np.log(current_hist / ref_hist)
        )
        
        return float(psi)
    
    def check_all_features(
        self, feature_vectors: np.ndarray, feature_names: List[str]
    ) -> Dict[str, Dict]:
        """
        Check drift for all features.
        
        Returns dict with PSI values and alert levels.
        """
        results = {}
        
        for i, name in enumerate(feature_names):
            if name in self._reference_distributions:
                psi = self.compute_psi(name, feature_vectors[:, i])
                
                if psi > 0.25:
                    level = 'critical'
                elif psi > 0.1:
                    level = 'warning'
                else:
                    level = 'ok'
                
                results[name] = {
                    'psi': round(psi, 4),
                    'alert_level': level,
                }
        
        return results


class PredictionMonitor:
    """
    Monitor prediction score distributions and latency.
    
    Maintains rolling windows for real-time monitoring.
    """
    
    def __init__(
        self,
        window_size: int = 1000,
        latency_window: int = 500
    ):
        self._scores = deque(maxlen=window_size)
        self._latencies_ms = deque(maxlen=latency_window)
        self._error_count = 0
        self._total_count = 0
        self._start_time = time.time()
        
        # Alert thresholds
        self.score_mean_threshold = (0.2, 0.8)  # (min, max) expected mean
        self.latency_p95_threshold = 500.0  # Max acceptable p95 latency (ms)
        self.error_rate_threshold = 0.05  # Max 5% error rate
    
    def record_prediction(
        self, score: float, latency_ms: float, error: bool = False
    ) -> None:
        """Record a single prediction outcome."""
        self._total_count += 1
        
        if error:
            self._error_count += 1
        else:
            self._scores.append(score)
        
        self._latencies_ms.append(latency_ms)
    
    def get_score_stats(self) -> Dict[str, float]:
        """Get prediction score statistics."""
        if not self._scores:
            return {'count': 0}
        
        scores = np.array(self._scores)
        return {
            'count': len(scores),
            'mean': float(np.mean(scores)),
            'std': float(np.std(scores)),
            'median': float(np.median(scores)),
            'min': float(np.min(scores)),
            'max': float(np.max(scores)),
            'p25': float(np.percentile(scores, 25)),
            'p75': float(np.percentile(scores, 75)),
        }
    
    def get_latency_stats(self) -> Dict[str, float]:
        """Get latency statistics in milliseconds."""
        if not self._latencies_ms:
            return {'count': 0}
        
        latencies = np.array(self._latencies_ms)
        return {
            'count': len(latencies),
            'mean_ms': float(np.mean(latencies)),
            'median_ms': float(np.median(latencies)),
            'p95_ms': float(np.percentile(latencies, 95)),
            'p99_ms': float(np.percentile(latencies, 99)),
            'max_ms': float(np.max(latencies)),
        }
    
    def get_error_rate(self) -> float:
        """Get current error rate."""
        if self._total_count == 0:
            return 0.0
        return self._error_count / self._total_count
    
    def check_alerts(self) -> List[Dict]:
        """Check for alert conditions."""
        alerts = []
        
        # Score mean drift
        score_stats = self.get_score_stats()
        if score_stats.get('count', 0) >= 50:
            mean = score_stats['mean']
            if mean < self.score_mean_threshold[0]:
                alerts.append({
                    'type': 'score_too_low',
                    'severity': 'warning',
                    'message': f"Mean score {mean:.3f} below threshold {self.score_mean_threshold[0]}",
                    'value': mean,
                })
            elif mean > self.score_mean_threshold[1]:
                alerts.append({
                    'type': 'score_too_high',
                    'severity': 'warning',
                    'message': f"Mean score {mean:.3f} above threshold {self.score_mean_threshold[1]}",
                    'value': mean,
                })
        
        # Latency
        latency_stats = self.get_latency_stats()
        if latency_stats.get('count', 0) >= 20:
            p95 = latency_stats['p95_ms']
            if p95 > self.latency_p95_threshold:
                alerts.append({
                    'type': 'high_latency',
                    'severity': 'critical',
                    'message': f"p95 latency {p95:.0f}ms exceeds {self.latency_p95_threshold}ms",
                    'value': p95,
                })
        
        # Error rate
        error_rate = self.get_error_rate()
        if self._total_count >= 20 and error_rate > self.error_rate_threshold:
            alerts.append({
                'type': 'high_error_rate',
                'severity': 'critical',
                'message': f"Error rate {error_rate:.1%} exceeds {self.error_rate_threshold:.1%}",
                'value': error_rate,
            })
        
        return alerts
    
    def get_dashboard_data(self) -> Dict:
        """Get all monitoring data for dashboard display."""
        uptime_seconds = time.time() - self._start_time
        
        return {
            'uptime_seconds': round(uptime_seconds, 1),
            'total_predictions': self._total_count,
            'error_rate': round(self.get_error_rate(), 4),
            'scores': self.get_score_stats(),
            'latency': self.get_latency_stats(),
            'alerts': self.check_alerts(),
            'throughput_per_minute': round(
                self._total_count / max(1, uptime_seconds / 60), 1
            ),
        }


class ModelMonitor:
    """
    Unified monitoring combining drift detection and prediction monitoring.
    """
    
    def __init__(self):
        self.drift_detector = FeatureDriftDetector()
        self.prediction_monitor = PredictionMonitor()
        self._last_check = time.time()
        self._check_interval = 300  # Check every 5 minutes
    
    def set_reference_data(
        self,
        feature_names: List[str],
        feature_data: np.ndarray
    ) -> None:
        """Set reference distributions from training data."""
        for i, name in enumerate(feature_names):
            self.drift_detector.set_reference(name, feature_data[:, i])
        logger.info(f"Set reference distributions for {len(feature_names)} features")
    
    def record(
        self, score: float, latency_ms: float, error: bool = False
    ) -> None:
        """Record a prediction for monitoring."""
        self.prediction_monitor.record_prediction(score, latency_ms, error)
    
    def check_health(
        self,
        current_features: Optional[np.ndarray] = None,
        feature_names: Optional[List[str]] = None
    ) -> Dict:
        """
        Comprehensive health check.
        
        Returns health status with alerts and metrics.
        """
        health = {
            'timestamp': datetime.now().isoformat(),
            'status': 'healthy',
            'prediction_stats': self.prediction_monitor.get_dashboard_data(),
        }
        
        # Check drift if features provided
        if current_features is not None and feature_names is not None:
            drift = self.drift_detector.check_all_features(
                current_features, feature_names
            )
            health['feature_drift'] = drift
            
            # Alert on critical drift
            critical_drift = [
                name for name, info in drift.items()
                if info['alert_level'] == 'critical'
            ]
            if critical_drift:
                health['status'] = 'degraded'
                logger.warning(
                    f"Feature drift detected in: {critical_drift}"
                )
        
        # Check prediction alerts
        alerts = self.prediction_monitor.check_alerts()
        if any(a['severity'] == 'critical' for a in alerts):
            health['status'] = 'degraded'
        
        return health
