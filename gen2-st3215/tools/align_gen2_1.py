"""Gen 2.1 planar align tool. Requires the matching receiver firmware."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "gen3-experimental-3d/backend"))
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "shared"))
from surge_control.bench import main
if __name__ == "__main__":
    main("align")
