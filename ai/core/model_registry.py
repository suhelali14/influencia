"""
Model Registry for Influencia AI/ML System.

Provides centralized model management with:
- Version tracking and comparison
- A/B test allocation
- Automatic rollback on degraded performance
- Model metadata and performance history
"""

import os
import json
import time
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict

logger = logging.getLogger(__name__)


@dataclass
class ModelVersion:
    """Represents a single model version."""
    model_id: str
    version: str
    model_type: str  # 'ranking', 'embedding', 'ensemble'
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    metrics: Dict[str, float] = field(default_factory=dict)
    config: Dict[str, Any] = field(default_factory=dict)
    status: str = 'staged'  # 'staged', 'active', 'retired', 'rollback'
    traffic_pct: float = 0.0  # Percentage of traffic for A/B testing
    path: str = ''  # Path to saved model artifact


class ModelRegistry:
    """
    Central registry for all ML models.
    
    Tracks model versions, manages A/B test allocation,
    and provides automatic rollback on performance degradation.
    """
    
    def __init__(self, registry_path: str = 'ai/models/registry.json'):
        self.registry_path = registry_path
        self._models: Dict[str, List[ModelVersion]] = {}  # model_type -> versions
        self._active_models: Dict[str, str] = {}  # model_type -> active version
        self._ab_tests: Dict[str, Dict] = {}  # test_id -> config
        self._load_registry()
    
    def _load_registry(self) -> None:
        """Load registry from disk."""
        try:
            if os.path.exists(self.registry_path):
                with open(self.registry_path, 'r') as f:
                    data = json.load(f)
                
                for model_type, versions in data.get('models', {}).items():
                    self._models[model_type] = [
                        ModelVersion(**v) for v in versions
                    ]
                self._active_models = data.get('active', {})
                self._ab_tests = data.get('ab_tests', {})
                
                logger.info(
                    f"Loaded registry: {sum(len(v) for v in self._models.values())} "
                    f"model versions across {len(self._models)} types"
                )
        except Exception as e:
            logger.warning(f"Failed to load registry: {e}")
    
    def _save_registry(self) -> None:
        """Save registry to disk."""
        try:
            os.makedirs(os.path.dirname(self.registry_path) or '.', exist_ok=True)
            data = {
                'models': {
                    mt: [asdict(v) for v in versions]
                    for mt, versions in self._models.items()
                },
                'active': self._active_models,
                'ab_tests': self._ab_tests,
            }
            with open(self.registry_path, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save registry: {e}")
    
    def register_model(
        self,
        model_type: str,
        version: str,
        metrics: Dict[str, float],
        config: Optional[Dict] = None,
        model_path: str = ''
    ) -> ModelVersion:
        """
        Register a new model version.
        
        Args:
            model_type: Type of model ('ranking', 'embedding', etc.)
            version: Version string (e.g., '2.1.0')
            metrics: Performance metrics dict
            config: Model configuration
            model_path: Path to saved model artifact
            
        Returns:
            The registered ModelVersion
        """
        model_id = f"{model_type}_{version}_{int(time.time())}"
        
        mv = ModelVersion(
            model_id=model_id,
            version=version,
            model_type=model_type,
            metrics=metrics,
            config=config or {},
            path=model_path,
        )
        
        if model_type not in self._models:
            self._models[model_type] = []
        
        self._models[model_type].append(mv)
        self._save_registry()
        
        logger.info(
            f"Registered model {model_id}: {model_type} v{version} "
            f"(metrics: {metrics})"
        )
        return mv
    
    def promote_model(self, model_type: str, version: str) -> bool:
        """
        Promote a staged model to active status.
        
        Retires the current active model.
        """
        versions = self._models.get(model_type, [])
        
        # Find the target version
        target = None
        for v in versions:
            if v.version == version:
                target = v
                break
        
        if target is None:
            logger.error(f"Model version {version} not found for {model_type}")
            return False
        
        # Retire current active
        current_active = self._active_models.get(model_type)
        if current_active:
            for v in versions:
                if v.version == current_active and v.status == 'active':
                    v.status = 'retired'
        
        # Promote new version
        target.status = 'active'
        target.traffic_pct = 100.0
        self._active_models[model_type] = version
        
        self._save_registry()
        logger.info(f"Promoted {model_type} v{version} to active")
        return True
    
    def get_active_model(self, model_type: str) -> Optional[ModelVersion]:
        """Get the currently active model version."""
        active_version = self._active_models.get(model_type)
        if not active_version:
            return None
        
        for v in self._models.get(model_type, []):
            if v.version == active_version:
                return v
        return None
    
    def compare_models(
        self, model_type: str, metric: str = 'val_ndcg_10'
    ) -> List[Dict]:
        """Compare all versions of a model type by a metric."""
        versions = self._models.get(model_type, [])
        
        comparison = []
        for v in versions:
            comparison.append({
                'version': v.version,
                'status': v.status,
                'metric_value': v.metrics.get(metric, 0),
                'created_at': v.created_at,
            })
        
        comparison.sort(key=lambda x: x['metric_value'], reverse=True)
        return comparison
    
    def setup_ab_test(
        self,
        model_type: str,
        version_a: str,
        version_b: str,
        traffic_split: float = 0.5
    ) -> str:
        """
        Set up an A/B test between two model versions.
        
        Args:
            model_type: Type of model to test
            version_a: Control version
            version_b: Treatment version
            traffic_split: Fraction of traffic to version_b (0-1)
            
        Returns:
            Test ID
        """
        test_id = f"ab_{model_type}_{int(time.time())}"
        
        self._ab_tests[test_id] = {
            'model_type': model_type,
            'version_a': version_a,
            'version_b': version_b,
            'traffic_split': traffic_split,
            'started_at': datetime.now().isoformat(),
            'status': 'active',
            'results_a': {'impressions': 0, 'conversions': 0},
            'results_b': {'impressions': 0, 'conversions': 0},
        }
        
        self._save_registry()
        logger.info(
            f"A/B test {test_id}: {version_a} vs {version_b} "
            f"({traffic_split*100:.0f}% to B)"
        )
        return test_id
    
    def get_ab_version(self, test_id: str) -> str:
        """Get which version to use for a request in an A/B test."""
        import random
        
        test = self._ab_tests.get(test_id)
        if not test or test['status'] != 'active':
            return ''
        
        if random.random() < test['traffic_split']:
            return test['version_b']
        return test['version_a']
    
    def check_rollback(
        self,
        model_type: str,
        current_metrics: Dict[str, float],
        threshold_pct: float = 0.1
    ) -> bool:
        """
        Check if model should be rolled back based on degraded performance.
        
        Returns True if rollback is needed.
        """
        active = self.get_active_model(model_type)
        if not active or not active.metrics:
            return False
        
        # Compare key metrics
        for metric, baseline in active.metrics.items():
            if metric in current_metrics and baseline > 0:
                degradation = (baseline - current_metrics[metric]) / baseline
                if degradation > threshold_pct:
                    logger.warning(
                        f"Model {model_type} degraded on {metric}: "
                        f"{baseline:.4f} -> {current_metrics[metric]:.4f} "
                        f"({degradation*100:.1f}% drop)"
                    )
                    return True
        
        return False
    
    def get_registry_summary(self) -> Dict:
        """Get a summary of the registry state."""
        return {
            'total_models': sum(len(v) for v in self._models.values()),
            'model_types': list(self._models.keys()),
            'active_models': self._active_models,
            'active_ab_tests': len([
                t for t in self._ab_tests.values()
                if t.get('status') == 'active'
            ]),
        }
