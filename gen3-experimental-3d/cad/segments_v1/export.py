"""Export HEAD/MID/TAIL STEP + STL and the neutral assembly STEP into out/.

File names and STEP labels carry the prototype label until Phase 2."""

import trimesh

import params as P
import assembly as A
from build123d import export_step, export_stl

TAG = "PROTOTYPE_fit_and_load_validation_required"


def main():
    P.OUT.mkdir(parents=True, exist_ok=True)
    for kind in ("head", "mid", "tail"):
        s = A.part_solid(kind)
        s.label = f"{kind.upper()} - {P.PROTOTYPE_LABEL}"
        export_step(s, str(P.OUT / f"{kind}_{TAG}.step"))
        stl = P.OUT / f"{kind}_{TAG}.stl"
        export_stl(s, str(stl), tolerance=0.05, angular_tolerance=0.2)
        # drop zero-area slivers the tessellator leaves where three fillets meet
        m = trimesh.load(str(stl), force="mesh")
        m.update_faces(m.nondegenerate_faces())
        m.remove_unreferenced_vertices()
        m.export(str(stl))
        print("exported", kind)
    A.export_neutral_step(P.OUT / f"assembly_neutral_2048_{TAG}.step")
    print("exported assembly")


if __name__ == "__main__":
    main()
