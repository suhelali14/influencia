import sys
import traceback
sys.path.insert(0, '.')

try:
    from core.feature_engineering import FeatureEngineer
    print("feature_engineering OK")
except Exception as e:
    traceback.print_exc()
    print(f"\nERROR: {e}")
