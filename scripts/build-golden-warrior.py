"""Build the Nerivane golden-unit Warrior v2 as a clean modular GLB.

Run from the repository root:
  blender --background --python scripts/build-golden-warrior.py

The raw Tripo pilot remains the proportion/reference source. This script creates
clean, separated body, weapon, emblem, and base objects so board-scale silhouette
and palette can be revised deterministically before any rigging work begins.
"""

from __future__ import annotations

import math
import os
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = Path(
    os.environ.get(
        "SUNDER_ART_OUTPUT",
        ROOT.parent / "sunder-art-pipeline" / "nerivane-warrior" / "model",
    )
).expanduser().resolve()
OUTPUT_GLB = OUTPUT_DIR / "nerivane-warrior-golden-v2.glb"
OUTPUT_SOURCE_BLEND = OUTPUT_DIR / "nerivane-warrior-golden-v2-source.blend"
OUTPUT_BLEND = OUTPUT_DIR / "nerivane-warrior-golden-v2.blend"

bpy.ops.wm.read_factory_settings(use_empty=True)


def rgba(hex_color: str, alpha: float = 1.0):
    value = hex_color.lstrip("#")
    return tuple(int(value[index : index + 2], 16) / 255 for index in (0, 2, 4)) + (alpha,)


def material(name: str, color: str, *, roughness: float = 0.72, metallic: float = 0.0, emission: float = 0.0):
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    result.diffuse_color = rgba(color)
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = rgba(color)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    if emission:
        emission_color = shader.inputs.get("Emission Color") or shader.inputs.get("Emission")
        emission_strength = shader.inputs.get("Emission Strength")
        if emission_color:
            emission_color.default_value = rgba(color)
        if emission_strength:
            emission_strength.default_value = emission
    return result


MATS = {
    "under": material("Nerivane Under Armor", "#087A76"),
    "armor": material("Nerivane Deep Teal Armor", "#064852", roughness=0.66),
    "armor_light": material("Nerivane Teal Armor", "#0B9891", roughness=0.64),
    "bone": material("Nerivane Bone", "#EDE6CE", roughness=0.78),
    "aqua": material("Nerivane Aqua Rune", "#55E6D5", roughness=0.48, emission=0.32),
    "metal": material("Nerivane Spear Metal", "#AAB2BD", roughness=0.52, metallic=0.45),
    "shaft": material("Nerivane Spear Shaft", "#67564A", roughness=0.82),
    "stone": material("Sunder Plinth Stone", "#343B53", roughness=0.9),
    "stone_dark": material("Sunder Plinth Rim", "#171C34", roughness=0.94),
}

VERTEX_PALETTE = material("Sunder Vertex Palette", "#FFFFFF", roughness=0.72)
palette_nodes = VERTEX_PALETTE.node_tree.nodes
palette_links = VERTEX_PALETTE.node_tree.links
palette_shader = palette_nodes.get("Principled BSDF")
palette_attribute = palette_nodes.new("ShaderNodeVertexColor")
palette_attribute.layer_name = "SunderPalette"
palette_links.new(palette_attribute.outputs["Color"], palette_shader.inputs["Base Color"])


def finish(obj, mat, parent, *, bevel=0.0):
    obj.data.materials.append(mat)
    obj.parent = parent
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
    if bevel:
        modifier = obj.modifiers.new("Single-segment carved edge", "BEVEL")
        modifier.width = bevel
        modifier.segments = 1
        modifier.limit_method = "ANGLE"
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.select_set(False)
    return obj


def cube(name, location, dimensions, mat, parent, *, rotation=(0.0, 0.0, 0.0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, mat, parent, bevel=bevel)


def cylinder(name, location, radius, depth, mat, parent, *, vertices=6, rotation=(0.0, 0.0, 0.0), bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    return finish(obj, mat, parent, bevel=bevel)


def cone(name, location, radius_bottom, radius_top, depth, mat, parent, *, vertices=6, rotation=(0.0, 0.0, 0.0), bevel=0.0):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_bottom,
        radius2=radius_top,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    return finish(obj, mat, parent, bevel=bevel)


def ico(name, location, scale, mat, parent, *, subdivisions=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, mat, parent)


def cylinder_between(name, start, end, radius, mat, parent, *, vertices=6):
    start_vector = Vector(start)
    end_vector = Vector(end)
    direction = end_vector - start_vector
    midpoint = (start_vector + end_vector) / 2
    obj = cylinder(name, midpoint, radius, direction.length, mat, parent, vertices=vertices)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    return obj


def profile_prism(name, profile_xz, y_center, depth, mat, parent):
    count = len(profile_xz)
    front_y = y_center - depth / 2
    back_y = y_center + depth / 2
    vertices = [(x, front_y, z) for x, z in profile_xz] + [(x, back_y, z) for x, z in profile_xz]
    faces = [tuple(range(count - 1, -1, -1)), tuple(range(count, count * 2))]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((index, nxt, count + nxt, count + index))
    mesh = bpy.data.meshes.new(f"{name} Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj, mat, parent)


def lenticular_mask(name, profile_xz, front_y, back_y, mat, parent):
    boundary_y = (front_y + back_y) / 2
    vertices = [(x, boundary_y, z) for x, z in profile_xz]
    vertices.extend([(0.0, front_y, sum(z for _, z in profile_xz) / len(profile_xz)), (0.0, back_y, sum(z for _, z in profile_xz) / len(profile_xz))])
    front_index = len(profile_xz)
    back_index = front_index + 1
    faces = []
    for index in range(len(profile_xz)):
        nxt = (index + 1) % len(profile_xz)
        faces.append((front_index, nxt, index))
        faces.append((back_index, index, nxt))
    mesh = bpy.data.meshes.new(f"{name} Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj, mat, parent)


def sagittal_fin(name, profile_yz, thickness, mat, parent):
    count = len(profile_yz)
    vertices = [(-thickness / 2, y, z) for y, z in profile_yz] + [(thickness / 2, y, z) for y, z in profile_yz]
    faces = [tuple(range(count - 1, -1, -1)), tuple(range(count, count * 2))]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((index, nxt, count + nxt, count + index))
    mesh = bpy.data.meshes.new(f"{name} Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj, mat, parent)


def double_pyramid(name, center, radius_x, radius_y, height, mat, parent):
    x, y, z = center
    vertices = [
        (x, y, z + height / 2),
        (x + radius_x, y, z),
        (x, y + radius_y, z),
        (x - radius_x, y, z),
        (x, y - radius_y, z),
        (x, y, z - height / 2),
    ]
    faces = [
        (0, 1, 2), (0, 2, 3), (0, 3, 4), (0, 4, 1),
        (5, 2, 1), (5, 3, 2), (5, 4, 3), (5, 1, 4),
    ]
    mesh = bpy.data.meshes.new(f"{name} Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj, mat, parent)


def collection_empty(name, parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.empty_display_type = "PLAIN_AXES"
    obj.parent = parent
    return obj


def join_mesh_children(parent, name):
    children = [obj for obj in parent.children if obj.type == "MESH"]
    if not children:
        raise RuntimeError(f"{parent.name} has no mesh children to join")
    bpy.ops.object.select_all(action="DESELECT")
    for obj in children:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = children[0]
    bpy.ops.object.join()
    joined = bpy.context.object
    joined.name = name
    joined.data.name = f"{name} Mesh"
    joined.parent = parent
    return joined


def bake_palette_to_vertex_colors(obj):
    mesh = obj.data
    palette = mesh.color_attributes.new(
        name="SunderPalette", type="BYTE_COLOR", domain="CORNER"
    )
    source_materials = list(mesh.materials)
    for polygon in mesh.polygons:
        source = source_materials[polygon.material_index]
        color = source.diffuse_color if source else (1.0, 1.0, 1.0, 1.0)
        for loop_index in polygon.loop_indices:
            palette.data[loop_index].color = color
        polygon.material_index = 0
    mesh.materials.clear()
    mesh.materials.append(VERTEX_PALETTE)


OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

root = collection_empty("Golden Warrior v2")
body = collection_empty("Body", root)
weapon = collection_empty("Weapon", root)
base = collection_empty("Fractured Hex Base", root)

# Universal Sunder fractured base: broad enough to anchor the silhouette at 40px.
cylinder("Base Rim", (0, 0.02, 0.075), 0.78, 0.15, MATS["stone_dark"], base, vertices=6, rotation=(0, 0, math.radians(30)))
cylinder("Base Top", (0, 0.0, 0.17), 0.70, 0.08, MATS["stone"], base, vertices=6, rotation=(0, 0, math.radians(30)))
for index, (location, dimensions, angle) in enumerate([
    ((-0.18, -0.39, 0.216), (0.46, 0.035, 0.018), math.radians(-18)),
    ((0.13, -0.42, 0.217), (0.34, 0.032, 0.018), math.radians(24)),
    ((0.02, -0.40, 0.218), (0.25, 0.032, 0.018), math.radians(68)),
]):
    cube(f"Aqua Fissure {index + 1}", location, dimensions, MATS["aqua"], base, rotation=(0, 0, angle))

# Chunky legs and boots: deliberately oversized for board-scale readability.
for side, x in (("Left", -0.31), ("Right", 0.31)):
    cone(f"{side} Shin", (x, 0.02, 0.70), 0.24, 0.19, 0.68, MATS["under"], body, vertices=6)
    cube(f"{side} Boot", (x, -0.14, 0.40), (0.46, 0.62, 0.30), MATS["armor"], body, bevel=0.055)
    profile_prism(
        f"{side} Knee Plate",
        [(-0.22 + x, 0.98), (0.22 + x, 0.98), (0.17 + x, 0.71), (x, 0.61), (-0.17 + x, 0.71)],
        -0.24,
        0.12,
        MATS["armor"],
        body,
    )

# Torso, waist, and V-tapered armor.
cone("Under Torso", (0, 0.03, 1.34), 0.43, 0.56, 0.82, MATS["under"], body, vertices=6)
profile_prism(
    "V Chest Armor",
    [(-0.55, 1.73), (0.55, 1.73), (0.47, 1.22), (0.0, 1.05), (-0.47, 1.22)],
    -0.14,
    0.46,
    MATS["armor_light"],
    body,
)
cube("Waist Belt", (0, -0.04, 1.06), (0.88, 0.52, 0.16), MATS["armor"], body, bevel=0.025)
profile_prism("Front Tasset", [(-0.42, 1.08), (0.42, 1.08), (0.31, 0.73), (0, 0.61), (-0.31, 0.73)], -0.28, 0.12, MATS["armor"], body)

# Shoulders and bent arms; mass is 25% broader than the raw Tripo pilot.
for side, sign in (("Left", -1), ("Right", 1)):
    cube(
        f"{side} Shoulder Plate",
        (0.57 * sign, -0.01, 1.65),
        (0.50, 0.55, 0.34),
        MATS["armor"],
        body,
        rotation=(0.0, math.radians(8 * sign), math.radians(12 * sign)),
        bevel=0.055,
    )
    cylinder_between(
        f"{side} Upper Arm",
        (0.48 * sign, -0.02, 1.56),
        (0.68 * sign, -0.10, 1.28),
        0.18,
        MATS["under"],
        body,
    )
    cylinder_between(
        f"{side} Bracer",
        (0.68 * sign, -0.10, 1.28),
        (0.69 * sign, -0.20, 1.03),
        0.20,
        MATS["armor"],
        body,
    )
    ico(f"{side} Bone Hand", (0.69 * sign, -0.22, 0.96), (0.22, 0.18, 0.21), MATS["bone"], body, subdivisions=1)

# Cowl, faceted mask, and a shorter ordinary Warrior crest.
ico("Deep Teal Cowl", (0, 0.0, 2.01), (0.43, 0.34, 0.46), MATS["armor"], body, subdivisions=2)
lenticular_mask(
    "Faceted Bone Mask",
    [(-0.28, 2.22), (0, 2.39), (0.28, 2.22), (0.25, 1.93), (0, 1.76), (-0.25, 1.93)],
    -0.43,
    -0.08,
    MATS["bone"],
    body,
)
profile_prism("Mask Chin Accent", [(-0.09, 1.86), (0.09, 1.86), (0, 1.72)], -0.445, 0.035, MATS["aqua"], body)
sagittal_fin(
    "Short Swept Aqua Crest",
    [(-0.03, 2.27), (-0.01, 2.68), (0.27, 2.53), (0.23, 2.29)],
    0.18,
    MATS["aqua"],
    body,
)

# Oversized high-contrast droplet sigil: bone border with aqua center.
profile_prism("Bone Droplet Border", [(0, 1.63), (0.14, 1.42), (0, 1.25), (-0.14, 1.42)], -0.386, 0.045, MATS["bone"], body)
profile_prism("Aqua Droplet Inset", [(0, 1.57), (0.075, 1.42), (0, 1.32), (-0.075, 1.42)], -0.415, 0.025, MATS["aqua"], body)

# Separate modular spear, gripped by the left hand and deliberately visible at 40px.
cylinder("Spear Shaft", (-0.88, -0.24, 1.38), 0.067, 2.28, MATS["shaft"], weapon, vertices=8)
double_pyramid("Faceted Spearhead", (-0.88, -0.24, 2.72), 0.17, 0.14, 0.55, MATS["metal"], weapon)
double_pyramid("Aqua Spear Inset", (-0.88, -0.385, 2.70), 0.078, 0.025, 0.22, MATS["aqua"], weapon)

# Save the editable authored pieces before runtime consolidation.
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_SOURCE_BLEND))

# Export only three runtime meshes. Vertex colors preserve the nine-value
# palette while material slots, nodes, and draw calls collapse to body + weapon
# + base.
body_mesh = join_mesh_children(body, "Warrior Body")
weapon_mesh = join_mesh_children(weapon, "Warrior Spear")
base_mesh = join_mesh_children(base, "Warrior Fractured Base")
for runtime_mesh in (body_mesh, weapon_mesh, base_mesh):
    bake_palette_to_vertex_colors(runtime_mesh)

# Stable origin on the plinth center; no animations until silhouette approval.
for obj in bpy.context.scene.objects:
    obj.select_set(obj == root or obj.parent is not None)

bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))
bpy.ops.export_scene.gltf(
    filepath=str(OUTPUT_GLB),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
    export_materials="EXPORT",
    export_cameras=False,
    export_lights=False,
)

mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
vertices = sum(len(obj.data.vertices) for obj in mesh_objects)
triangles = sum(sum(max(len(poly.vertices) - 2, 0) for poly in obj.data.polygons) for obj in mesh_objects)
print(f"OUTPUT_GLB={OUTPUT_GLB}")
print(f"OUTPUT_SOURCE_BLEND={OUTPUT_SOURCE_BLEND}")
print(f"OUTPUT_BLEND={OUTPUT_BLEND}")
print(f"OBJECTS={len(mesh_objects)}")
print(f"VERTICES={vertices}")
print(f"TRIANGLES={triangles}")
