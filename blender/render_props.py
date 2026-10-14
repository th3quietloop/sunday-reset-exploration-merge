# Renders every prop in a props-data.js to PNGs on a plank colored desk, from the desk camera and from the side.
# Blender --background --python blender/render_props.py -- board/src/props-data.js <outdir> <tag>
import bpy, sys, json, base64, struct, math, os
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
SRC, OUTDIR, TAG = argv[0], argv[1], argv[2]
txt = open(SRC).read()
data = json.loads(txt[txt.index('root.PropData = ') + 16: txt.rindex('; })')])

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'
sc.render.resolution_x = 520
sc.render.resolution_y = 520
sc.render.film_transparent = False
sc.view_settings.view_transform = 'Standard'
world = bpy.data.worlds.new('w'); sc.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.78, 0.62, 0.42, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = 0.55

def hexrgb(h):
    h = h.lstrip('#'); return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))

# desk plane
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0))
desk = bpy.context.active_object
dm = bpy.data.materials.new('desk'); dm.use_nodes = True
dm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = hexrgb('#C3955F') + (1,)
dm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.9
desk.data.materials.append(dm)

sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.2; sun.angle = 0.2
so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so)
so.rotation_euler = (math.radians(38), 0, math.radians(-150))

cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'
co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co

def build(name, d):
    k = d['ext'] / 32767
    objs = []
    for i, gr in enumerate(d['groups']):
        raw = base64.b64decode(gr['p'])
        q = struct.unpack('<%dh' % (len(raw) // 2), raw)
        verts = []
        for j in range(0, len(q), 3):
            x, y, z = q[j] * k, q[j + 1] * k, q[j + 2] * k
            verts.append((x, -z, y))  # back to Z up
        faces = [(t, t + 1, t + 2) for t in range(0, len(verts), 3)]
        me = bpy.data.meshes.new('%s%d' % (name, i)); me.from_pydata(verts, [], faces)
        o = bpy.data.objects.new(me.name, me); sc.collection.objects.link(o)
        m = bpy.data.materials.new(me.name); m.use_nodes = True
        p = m.node_tree.nodes['Principled BSDF']
        p.inputs['Base Color'].default_value = hexrgb(gr['c']) + (1,)
        p.inputs['Roughness'].default_value = gr['r']; p.inputs['Metallic'].default_value = gr['m'] * 0.6
        if gr.get('g'):
            p.inputs['Emission Color'].default_value = hexrgb(gr['c']) + (1,)
            p.inputs['Emission Strength'].default_value = gr['g'] * 1.6
        me.materials.append(m)
        objs.append(o)
    return objs

for name, d in data.items():
    objs = build(name, d)
    pts = [o.matrix_world @ v.co for o in objs for v in o.data.vertices]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    c = (lo + hi) / 2
    size = max(hi - lo)
    for view, (el, az) in {'desk': (52, -20), 'side': (12, -30)}.items():
        e, a = math.radians(el), math.radians(az)
        dirv = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
        co.location = c + dirv * 40
        co.rotation_euler = (-dirv).to_track_quat('-Z', 'Y').to_euler()
        cam.ortho_scale = size * 1.35
        cam.clip_end = 200
        sc.render.filepath = os.path.join(OUTDIR, '%s-%s-%s.png' % (TAG, name, view))
        bpy.ops.render.render(write_still=True)
    for o in objs:
        bpy.data.objects.remove(o, do_unlink=True)
    print('rendered', name, d['tris'], 'tris', 'size', [round(v, 2) for v in (hi - lo)])
