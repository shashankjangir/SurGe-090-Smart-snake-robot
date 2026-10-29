"""Gen 3 primary entry point: commissioning, hardware gait runs, dashboard, and controller.
"""
import sys
from pathlib import Path

# Add directory and backend to path
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

import test_3d_snake as runner


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "controller":
        import controller_node
        sys.argv.pop(1)
        return controller_node.main()
    if len(sys.argv) > 1 and sys.argv[1] == "dashboard":
        from web_dashboard.web_app import create_app
        sys.argv.pop(1)
        app = create_app()
        app.run(host="0.0.0.0", port=5000, debug=False)
        return 0
    return runner.main()


if __name__ == "__main__":
    sys.exit(main())
