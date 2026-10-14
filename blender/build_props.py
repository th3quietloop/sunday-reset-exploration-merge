# Sunday Reset desk props, modeled in Blender and baked for three.js.
# Run headless:  /Applications/Blender.app/Contents/MacOS/Blender --background --python blender/build_props.py
# Writes board/src/props-data.js: for each prop, its triangles grouped by material (color, roughness,
# metalness, glow), positions quantized to 16 bit, plus named anchor points (like the lamp's bulb).
# Blender is Z up; three.js is Y up, so every point is written as (x, z, -y).
import bpy, bmesh, math, struct, base64, json, os
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'board', 'src', 'props-data.js')

bpy.ops.wm.read_factory_settings(use_empty=True)
MATS = {}


def mat(name, hexcol, rough=0.7, metal=0.0, glow=0.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m['hex'], m['rough'], m['metal'], m['glow'] = hexcol, rough, metal, glow
    MATS[name] = m
    return m


def finish(obj, material, bevel=0.0, segs=2):
    obj.data.materials.clear()
    obj.data.materials.append(material)
    if bevel > 0:
        b = obj.modifiers.new('bevel', 'BEVEL')
        b.width, b.segments, b.limit_method = bevel, segs, 'ANGLE'
    return obj


def cyl(r, depth, verts=20, loc=(0, 0, 0), r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=depth, location=loc)
    return bpy.context.active_object


def box(w, d, h, loc):
    """a box sized in its mesh, so bevels stay even"""
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.data.transform(Matrix.Diagonal((w, d, h, 1)))
    return o


def sphere(r, loc, segs=12, rings=8):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=rings, radius=r, location=loc)
    return bpy.context.active_object


def rod(a, b, r, verts=10):
    """a cylinder from point a to point b"""
    a, b = Vector(a), Vector(b)
    d = b - a
    o = cyl(r, d.length, verts, loc=(a + b) / 2)
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    return o


def bake(objs, anchors=None):
    """triangles in world space, grouped by material, quantized"""
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    groups = {}
    for o in objs:
        ev = o.evaluated_get(deps)
        me = ev.to_mesh()
        me.transform(o.matrix_world)
        me.calc_loop_triangles()
        for t in me.loop_triangles:
            key = o.data.materials[t.material_index].name if len(o.data.materials) else 'default'
            arr = groups.setdefault(key, [])
            for vi in t.vertices:
                v = me.vertices[vi].co
                arr += [v.x, v.z, -v.y]
        ev.to_mesh_clear()
    ext = max(abs(c) for arr in groups.values() for c in arr) or 1.0
    out, tris = [], 0
    for key, arr in groups.items():
        m = MATS[key]
        q = [max(-32767, min(32767, round(c / ext * 32767))) for c in arr]
        tris += len(arr) // 9
        out.append({'c': m['hex'], 'r': round(m['rough'], 2), 'm': round(m['metal'], 2), 'g': round(m['glow'], 2),
                    'p': base64.b64encode(struct.pack('<%dh' % len(q), *q)).decode()})
    conv = {k: [round(v[0], 3), round(v[2], 3), round(-v[1], 3)] for k, v in (anchors or {}).items()}
    for o in objs:
        bpy.data.objects.remove(o, do_unlink=True)
    return {'ext': round(ext, 4), 'groups': out, 'anchors': conv, 'tris': tris}


ASSETS = {}

# == the mug, on a saucer ==
ceramic = mat('ceramic', '#ECE4D6', 0.32)
glaze = mat('glaze', '#6F8F82', 0.3)
coffee = mat('coffee', '#3E2616', 0.18)
parts = []
saucer = finish(cyl(1.75, 0.12, 28, (0, 0, 0.06), r2=1.9), ceramic, 0.03)
well = finish(cyl(1.05, 0.03, 28, (0, 0, 0.125)), glaze)
body = cyl(1.0, 2.05, 24, (0, 0, 1.17), r2=0.94)
bm = bmesh.new(); bm.from_mesh(body.data)
top = [f for f in bm.faces if f.normal.z > 0.9]
bmesh.ops.delete(bm, geom=top, context='FACES')
bm.to_mesh(body.data); bm.free()
sol = body.modifiers.new('wall', 'SOLIDIFY'); sol.thickness = 0.11; sol.offset = -1
finish(body, ceramic, 0.035)
band = finish(cyl(1.012, 0.34, 24, (0, 0, 0.42), r2=1.0), glaze, 0.02)
brew = finish(cyl(0.88, 0.02, 24, (0, 0, 1.86)), coffee)
# the handle is thick enough to read as a handle at desk scale (it was a thin loop)
bpy.ops.mesh.primitive_torus_add(major_radius=0.5, minor_radius=0.18, major_segments=18, minor_segments=8, location=(1.0, 0, 1.24), rotation=(math.pi / 2, 0, 0))
handle = bpy.context.active_object
bm = bmesh.new(); bm.from_mesh(handle.data)
bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(-0.08, 0, 0), plane_no=(1, 0, 0), clear_inner=True)
bm.to_mesh(handle.data); bm.free()
finish(handle, ceramic)
ASSETS['mug'] = bake([saucer, well, body, band, brew, handle])

# == a snake plant in a terracotta pot ==
# Each blade is folded down its middle so it reads as a thick leaf, not a paper card, and has the
# snake plant's yellow margins, so it can't be mistaken for grass or an aloe. The pot stands on a
# low saucer, which also stops it reading as floating.
clay = mat('clay', '#B8603C', 0.82)
clay_dark = mat('clay_dark', '#9C4E30', 0.85)
soil = mat('soil', '#3F2B1C', 0.95)
leaf_a = mat('leaf_a', '#3E7A47', 0.55)
leaf_b = mat('leaf_b', '#5C9A53', 0.55)
leaf_edge = mat('leaf_edge', '#C9C46A', 0.55)
plate = finish(cyl(1.16, 0.12, 18, (0, 0, 0.06), r2=1.24), clay_dark, 0.03)
pot = finish(cyl(0.95, 1.55, 18, (0, 0, 0.12 + 0.72), r2=1.16), clay, 0.03)
pot.scale = (1, 1, 1.44 / 1.55)
rim = finish(cyl(1.3, 0.32, 18, (0, 0, 1.52), r2=1.3), clay_dark, 0.04)
dirt = finish(cyl(1.14, 0.04, 18, (0, 0, 1.63)), soil)
leaves = []
# (angle around the pot, height, how far it leans out, twist): a fan, tall in the middle, lower at the edges
blades = [(0, 3.6, 0.10, 0.12), (60, 3.1, 0.34, -0.2), (125, 3.3, 0.3, 0.25), (190, 2.8, 0.42, -0.12), (250, 3.2, 0.32, 0.3), (310, 2.6, 0.48, 0.2), (95, 2.3, 0.6, -0.25), (225, 2.1, 0.62, 0.22), (20, 2.4, 0.56, -0.18), (155, 2.0, 0.66, 0.15), (280, 1.9, 0.7, -0.2)]
for i, (ang, height, lean, twist) in enumerate(blades):
    bm = bmesh.new()
    rows = 7
    ring = []
    for k in range(rows + 1):
        t = k / rows
        w = 0.42 * (1 - t ** 1.8) + 0.015
        z = t * height * (1 - lean * 0.25 * t)
        x_off = 0.22 + lean * (t ** 1.3) * height * 0.62
        a = twist * t
        fold = 0.16 * (1 - t) + 0.02
        # across the blade: margin, leaf, the fold, leaf, margin
        row = []
        for u, depth in ((-1, 0), (-0.74, 0.55), (0, 1), (0.74, 0.55), (1, 0)):
            row.append(bm.verts.new((x_off + u * w * math.cos(a), u * w * math.sin(a) * 0.4 + fold * depth, z)))
        ring.append(row)
    for k in range(rows):
        r0, r1 = ring[k], ring[k + 1]
        for j in range(4):
            f = bm.faces.new((r0[j], r0[j + 1], r1[j + 1], r1[j]))
            f.material_index = 1 if j in (0, 3) else 0
    me = bpy.data.meshes.new('blade%d' % i)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('blade%d' % i, me)
    bpy.context.collection.objects.link(o)
    s = o.modifiers.new('thick', 'SOLIDIFY'); s.thickness = 0.05
    o.rotation_euler = (0, 0, math.radians(ang))
    o.location = (0, 0, 1.55)
    o.data.materials.append(leaf_a if i % 2 == 0 else leaf_b)
    o.data.materials.append(leaf_edge)
    leaves.append(o)
ASSETS['plant'] = bake([plate, pot, rim, dirt] + leaves)

# == an architect lamp: weighted base, twin brass arms, a green enamel shade ==
# It stands beside the board and leans over its edge. The shade opens toward the board (-x) and
# down, and its anchors give the bulb and the shade's axis, so the light in three.js leaves the
# shade the way the shade points, in a cone the shape of the shade.
iron = mat('iron', '#2B2E33', 0.38, 0.55)
brass = mat('brass', '#C49A45', 0.28, 0.85)
enamel = mat('enamel', '#1F5A50', 0.32, 0.15)
shade_in = mat('shade_in', '#F6E7C6', 0.55, 0.0, 0.45)
bulb = mat('bulb', '#FFE8B8', 0.3, 0.0, 1.0)
base = finish(cyl(1.5, 0.36, 36, (0, 0, 0.18), r2=1.32), iron, 0.07)
step = finish(cyl(0.72, 0.16, 28, (0, 0, 0.44), r2=0.6), iron, 0.04)
foot = finish(sphere(0.24, (0, 0, 0.62)), brass)
p0, p1, p2 = Vector((0.1, 0, 0.62)), Vector((1.35, 0, 5.1)), Vector((-3.1, 0, 6.35))
arms = []
for off in (-0.15, 0.15):
    o = Vector((0, off, 0))
    arms.append(finish(rod(p0 + o, p1 + o, 0.1, 12), brass))
    arms.append(finish(rod(p1 + o, p2 + o, 0.095, 12), brass))
# The spring is a coil that hugs the lower arm. It used to be one thin dark rod standing apart from
# the arms, which read at desk scale as a stray stick.
d01 = (p1 - p0).normalized()
side = Vector((0, 1, 0)).cross(d01).normalized()
sp_a, sp_b = p0 + d01 * 0.9 + side * 0.22, p0 + d01 * 2.9 + side * 0.22
spring = []
for i in range(9):
    at = sp_a.lerp(sp_b, i / 8)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.11, minor_radius=0.032, major_segments=10, minor_segments=5, location=tuple(at))
    c = bpy.context.active_object
    c.rotation_mode = 'QUATERNION'
    c.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d01)
    spring.append(finish(c, iron))
spring.append(finish(rod(sp_a, sp_b, 0.04, 6), iron))
elbow = finish(cyl(0.32, 0.56, 18, tuple(p1)), iron, 0.03)
elbow.rotation_euler = (math.pi / 2, 0, 0)
# brass knobs on the elbow's ends: the joint you'd turn to set the arm
knobs = []
for sy in (-1, 1):
    k_ = finish(cyl(0.2, 0.12, 14, (p1.x, sy * 0.34, p1.z)), brass, 0.02)
    k_.rotation_euler = (math.pi / 2, 0, 0)
    knobs.append(k_)
neck = finish(cyl(0.26, 0.5, 16, tuple(p2)), iron, 0.03)
neck.rotation_euler = (math.pi / 2, 0, 0)
aim = Vector((-0.56, 0, -0.83)).normalized()
L, R_OPEN, R_TOP = 2.0, 1.32, 0.42
top_c = p2 + aim * 0.42
center = top_c + aim * (L / 2)
turn = Vector((0, 0, -1)).rotation_difference(aim).to_matrix().to_4x4()
place = Matrix.Translation(center) @ turn
shade = cyl(R_OPEN, L, 40, (0, 0, 0), r2=R_TOP)
bm = bmesh.new(); bm.from_mesh(shade.data)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.normal.z < -0.9], context='FACES')
bm.to_mesh(shade.data); bm.free()
s = shade.modifiers.new('wall', 'SOLIDIFY'); s.thickness = 0.06
finish(shade, enamel, 0.02)
liner = cyl(R_OPEN - 0.07, L - 0.12, 40, (0, 0, -0.04), r2=R_TOP - 0.05)
bm = bmesh.new(); bm.from_mesh(liner.data)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if abs(f.normal.z) > 0.9], context='FACES')
bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
bm.to_mesh(liner.data); bm.free()
finish(liner, shade_in)
lip = finish(cyl(R_OPEN + 0.03, 0.08, 40, (0, 0, -L / 2 + 0.02)), brass)
socket = finish(cyl(0.3, 0.5, 18, (0, 0, L / 2 + 0.12), r2=0.26), brass, 0.03)
glow_bulb = finish(sphere(0.4, (0, 0, L / 2 - 0.62), 16, 12), bulb)
for o in (shade, liner, lip, socket, glow_bulb):
    o.matrix_world = place @ o.matrix_world
bulb_at = place @ Vector((0, 0, L / 2 - 0.62))
ASSETS['lamp'] = bake([base, step, foot] + arms + spring + knobs + [elbow, neck, shade, liner, lip, socket, glow_bulb],
                      {'bulb': tuple(bulb_at), 'aim': tuple(bulb_at + aim), 'head': tuple(center), 'base': (0, 0, 0)})

# == a round desk clock on two feet, tipped back a little so it faces up at you ==
# The hands are made in three.js so they can turn; the anchors give the face's middle, its normal,
# and its 12 o'clock direction after the tip.
case = mat('case', '#2F3A48', 0.42, 0.35)
dial = mat('dial', '#F3E9D6', 0.7)
tick = mat('tick', '#2A2622', 0.6)
CR, CD = 1.45, 0.62
parts = []
body = cyl(CR, CD, 48, (0, 0, 0))
body.rotation_euler = (math.pi / 2, 0, 0)
parts.append(finish(body, case, 0.06, 3))
bpy.ops.mesh.primitive_torus_add(major_radius=CR - 0.04, minor_radius=0.1, major_segments=48, minor_segments=10, location=(0, -CD / 2, 0), rotation=(math.pi / 2, 0, 0))
parts.append(finish(bpy.context.active_object, brass))
face = cyl(CR - 0.14, 0.04, 48, (0, -CD / 2 - 0.005, 0))
face.rotation_euler = (math.pi / 2, 0, 0)
parts.append(finish(face, dial))
for i in range(12):
    a = i / 12 * math.tau
    big = i % 3 == 0
    ln = 0.26 if big else 0.14
    rr_ = CR - 0.3 - ln / 2
    t = box(0.1 if big else 0.05, 0.03, ln, (math.sin(a) * rr_, -CD / 2 - 0.03, math.cos(a) * rr_))
    t.rotation_euler = (0, a, 0)
    parts.append(finish(t, tick))
# two bun feet, big enough to see from the desk camera, so the clock stands rather than floats
for sx in (-0.78, 0.78):
    parts.append(finish(sphere(0.3, (sx, 0.08, -CR + 0.1), 14, 9), brass))
bpy.ops.mesh.primitive_torus_add(major_radius=0.34, minor_radius=0.07, major_segments=20, minor_segments=8, location=(0, 0, CR + 0.22), rotation=(math.pi / 2, 0, 0))
parts.append(finish(bpy.context.active_object, brass))
lift = CR + 0.2
tip = Matrix.Translation(Vector((0, 0, lift))) @ Matrix.Rotation(math.radians(-14), 4, 'X')
for o in parts:
    o.matrix_world = tip @ o.matrix_world
f_c = tip @ Vector((0, -CD / 2 - 0.02, 0))
f_n = (tip.to_3x3() @ Vector((0, -1, 0))).normalized()
f_u = (tip.to_3x3() @ Vector((0, 0, 1))).normalized()
ASSETS['clock'] = bake(parts, {'face': tuple(f_c), 'normal': tuple(f_c + f_n), 'up': tuple(f_c + f_u)})

# == a spiral notepad; the page itself is drawn in three.js so it can list what's due ==
kraft = mat('kraft', '#B38A58', 0.85)
paper = mat('paper', '#F8F3E8', 0.9)
wire = mat('wire', '#3A3D42', 0.35, 0.6)
NW, ND = 3.7, 4.8
back = finish(box(NW, ND, 0.08, (0, 0, 0.04)), kraft, 0.02)
sheets = finish(box(NW - 0.16, ND - 0.36, 0.16, (0, -0.08, 0.16)), paper, 0.03)
coils = []
for i in range(11):
    x = -NW / 2 + 0.4 + i * (NW - 0.8) / 10
    bpy.ops.mesh.primitive_torus_add(major_radius=0.17, minor_radius=0.035, major_segments=14, minor_segments=6, location=(x, ND / 2 - 0.2, 0.2), rotation=(0, math.pi / 2, 0))
    coils.append(finish(bpy.context.active_object, wire))
ASSETS['notepad'] = bake([back, sheets] + coils, {'page': (0, -0.08, 0.245), 'size': (NW - 0.3, ND - 0.6, 0)})

# == a yellow pencil: hex body, brass ferrule, pink eraser, sharpened tip ==
yellow = mat('pencil', '#E6B22E', 0.5)
wood = mat('wood', '#E2C08E', 0.8)
lead = mat('lead', '#2E2E30', 0.5, 0.2)
eraser = mat('eraser', '#E48A8A', 0.9)
PL = 5.2
pb = finish(cyl(0.17, PL, 6, (0, 0, 0)), yellow)
pf = finish(cyl(0.175, 0.36, 16, (0, 0, PL / 2 + 0.18)), brass)
pe = finish(cyl(0.16, 0.32, 16, (0, 0, PL / 2 + 0.52)), eraser, 0.03)
pt = finish(cyl(0.05, 0.62, 6, (0, 0, -PL / 2 - 0.31), r2=0.17), wood)
pl_ = finish(cyl(0.0, 0.16, 8, (0, 0, -PL / 2 - 0.66), r2=0.055), lead)
for o in (pb, pf, pe, pt, pl_):
    o.matrix_world = Matrix.Translation(Vector((0, 0, 0.17))) @ Matrix.Rotation(math.pi / 2, 4, 'Y') @ o.matrix_world
ASSETS['pencil'] = bake([pb, pf, pe, pt, pl_])

# == a small stack of cloth bound books, page edges showing ==
page_c = mat('pages', '#EFE5CF', 0.9)
covers = [mat('book_a', '#2F5E7A', 0.7), mat('book_b', '#8E3B32', 0.7), mat('book_c', '#C9A24B', 0.6)]
stack, z = [], 0.0
for i, (w, d, h, rot, dx) in enumerate([(4.4, 3.1, 0.52, 0.0, 0.0), (4.0, 2.9, 0.44, 0.1, 0.15), (3.6, 2.6, 0.4, -0.06, -0.1)]):
    cv = covers[i]
    g = []
    for zz in (z + 0.04, z + h - 0.04):
        g.append(finish(box(w, d, 0.08, (0, 0, zz)), cv, 0.025))
    g.append(finish(box(0.14, d, h, (-w / 2 + 0.06, 0, z + h / 2)), cv, 0.05))
    g.append(finish(box(w - 0.22, d - 0.16, h - 0.12, (0.05, 0, z + h / 2)), page_c, 0.012))
    # two raised bands across the spine, in a color that stands off the cloth
    band_c = covers[0] if i == 2 else covers[2]
    for by in (-0.3 * d, 0.3 * d):
        g.append(finish(box(0.05, 0.12, h - 0.02, (-w / 2 - 0.005, by, z + h / 2)), band_c, 0.01))
    for o in g:
        o.matrix_world = Matrix.Translation(Vector((dx, 0, 0))) @ Matrix.Rotation(rot, 4, 'Z') @ o.matrix_world
    stack += g
    z += h
ASSETS['books'] = bake(stack)

# == the now pin: a brass map pin ==
steel = mat('steel', '#9EA3A8', 0.3, 0.7)
pin_head = finish(sphere(0.2, (0, 0, 0.82), 16, 10), brass)
pin_collar = finish(cyl(0.12, 0.12, 14, (0, 0, 0.62), r2=0.07), brass)
needle = finish(cyl(0.028, 0.58, 8, (0, 0, 0.29), r2=0.01), steel)
ASSETS['pin'] = bake([pin_head, pin_collar, needle])

with open(OUT, 'w') as f:
    f.write('/* Desk props modeled in Blender (blender/build_props.py) and baked for three.js. Generated; do not edit. */\n')
    f.write('(function (root) { root.PropData = ' + json.dumps(ASSETS, separators=(',', ':')) + '; })(typeof window !== \'undefined\' ? window : globalThis);\n')
print('props', {k: v['tris'] for k, v in ASSETS.items()}, os.path.getsize(OUT), 'bytes')
