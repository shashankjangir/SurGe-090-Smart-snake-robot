"""Gen 2.1 compatibility import; implementation is in shared/surge_control."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "gen3-experimental-3d/backend"))
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "shared"))
from surge_control.hardware import ST3215Interface
