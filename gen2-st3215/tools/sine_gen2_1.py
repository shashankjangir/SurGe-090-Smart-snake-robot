"""Gen 2.1 planar sine tool. Requires the matching receiver firmware."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "shared"))
from surge_control.bench import main
if __name__ == "__main__":
    main("sine")
