# Sunday Reset: the bag of letters, modeled and rendered in Blender (4.0 or later; made with 5.2).
# Run headless:  /Applications/Blender.app/Contents/MacOS/Blender --background --python blender/build_bag.py
# Writes variants/corners10/assets/bag.png (pulled shut) and bag-open.png (open, letter blocks peeking out),
# each 512 x 512 with a transparent background and the bag's soft shadow baked in. About two minutes.
# Options go after the script:  ... --python blender/build_bag.py -- out=<dir> only=shut|open fast views
# (fast: fewer samples; views: three plain side and top views beside each picture, for checking)
# Everything is made here, nothing is downloaded: the pouch is a surface of revolution with gathered
# folds pushed into it, the cord is swept along paths draped over the cloth by ray casts, and the
# letter blocks are rounded bricks with printed capitals. bag-notes.md beside the pictures says more.
import bpy, math, os, sys, random
import numpy as np
from mathutils import Vector, Matrix, noise
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OPT = dict((a.split('=', 1) if '=' in a else (a, True)) for a in ARGS)
OUT = os.path.abspath(OPT.get('out', os.path.join(HERE, '..', 'variants', 'corners10', 'assets')))
FAST = 'fast' in OPT
SIZE = 512
MARGIN = 7          # px of clear space left around the bag and its shadow

# the camera and the light, in the app's terms
CAM_EL = 38         # degrees above the desk the camera looks down from
CAM_AZ = -24        # the camera stands a little to the bag's left, so the bag reads turned
KEY_EL = 56         # the key light: high, behind the bag, a touch to the left, under half the light
KEY_SIDE = 22       # degrees left of straight behind, so the shadow falls toward you and a little right

FONTS = ['/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf',
         '/Library/Fonts/Arial Rounded Bold.ttf',
         '/System/Library/Fonts/Supplemental/Arial Bold.ttf']


# == small helpers ==
def lin(h):
    """'#RRGGBB' to linear rgb"""
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def smooth(e0, e1, x):
    t = np.clip((np.asarray(x, float) - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def angd(a, b):
    return (a - b + np.pi) % (2 * np.pi) - np.pi


def unit(v):
    v = np.asarray(v, float)
    return v / np.linalg.norm(v)


def view_dir(az, el):
    """unit vector from the bag toward a viewer at azimuth az (0 is the front, -Y) and elevation el"""
    a, e = math.radians(az), math.radians(el)
    return Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))


def crspline(pts, per=24):
    """a centripetal Catmull-Rom curve through pts, as a dense polyline"""
    P = [np.array(p, float) for p in pts]
    P = [2 * P[0] - P[1]] + P + [2 * P[-1] - P[-2]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        t0 = 0.0
        t1 = t0 + max(np.linalg.norm(p1 - p0), 1e-6) ** 0.5
        t2 = t1 + max(np.linalg.norm(p2 - p1), 1e-6) ** 0.5
        t3 = t2 + max(np.linalg.norm(p3 - p2), 1e-6) ** 0.5
        for t in np.linspace(t1, t2, per, endpoint=False):
            a1 = (t1 - t) / (t1 - t0) * p0 + (t - t0) / (t1 - t0) * p1
            a2 = (t2 - t) / (t2 - t1) * p1 + (t - t1) / (t2 - t1) * p2
            a3 = (t3 - t) / (t3 - t2) * p2 + (t - t2) / (t3 - t2) * p3
            b1 = (t2 - t) / (t2 - t0) * a1 + (t - t0) / (t2 - t0) * a2
            b2 = (t3 - t) / (t3 - t1) * a2 + (t - t1) / (t3 - t1) * a3
            out.append((t2 - t) / (t2 - t1) * b1 + (t - t1) / (t2 - t1) * b2)
    out.append(P[-2])
    return np.array(out)


def resample(D, n=None, step=None, weight=None):
    """even spacing along a polyline (optionally denser where weight is high)"""
    seg = np.linalg.norm(np.diff(D, axis=0), axis=1)
    if weight is not None:
        seg = seg * weight((D[1:] + D[:-1]) / 2)
    c = np.r_[0, np.cumsum(seg)]
    if n is None:
        n = max(2, int(round(c[-1] / step)) + 1)
    s = np.linspace(0, c[-1], n)
    return np.stack([np.interp(s, c, D[:, k]) for k in range(D.shape[1])], 1)


def link(o):
    bpy.context.scene.collection.objects.link(o)
    return o


def mesh_obj(name, verts, faces, mats, smooth_shade=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(map(float, v)) for v in verts], [], faces)
    me.update()
    for m in mats:
        me.materials.append(m)
    if smooth_shade:
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    return link(bpy.data.objects.new(name, me))


# == the scene ==
def fresh_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for kind in ('METAL', 'OPTIX', 'CUDA', 'HIP', 'ONEAPI'):
        try:
            prefs.compute_device_type = kind
            prefs.get_devices()
        except Exception:
            continue
        gpus = [d for d in prefs.devices if d.type == kind]
        if gpus:
            for d in prefs.devices:
                d.use = d.type == kind
            sc.cycles.device = 'GPU'
            break
    if sc.cycles.device == 'CPU':
        print('no GPU found, rendering on the CPU (slower, same picture)')
    sc.cycles.samples = 128 if FAST else 640
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.01 if FAST else 0.003
    sc.cycles.use_denoising = True
    try:
        sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception:
        pass
    sc.cycles.max_bounces = 8
    sc.cycles.diffuse_bounces = 4
    sc.cycles.glossy_bounces = 3
    sc.cycles.transmission_bounces = 2
    sc.render.film_transparent = True
    sc.render.resolution_x = sc.render.resolution_y = SIZE
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.color_depth = '8'
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.view_settings.exposure = 0.0
    sc.view_settings.gamma = 1.0
    return sc


def room(sc, strength=0.3):
    """a faint sky over everything: warm white from above, falling off toward the horizon. It leaves
    the soft contact shadow under the bag; the bag's own sky light comes from SKY_LAMPS"""
    w = bpy.data.worlds.new('room')
    sc.world = w
    w.use_nodes = True
    nt = w.node_tree
    bg = nt.nodes['Background']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    e0, e1 = ramp.color_ramp.elements
    e0.position, e0.color = 0.0, (0.03, 0.027, 0.024, 1)
    e1.position, e1.color = 1.0, (1.0, 0.97, 0.91, 1)
    mid = ramp.color_ramp.elements.new(0.55)
    mid.color = (0.26, 0.25, 0.23, 1)
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    nt.links.new(sep.outputs['Z'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = strength


def sun(name, toward, strength, color, angle, shadow=True):
    l = bpy.data.lights.new(name, 'SUN')
    l.energy = strength
    l.color = color
    l.angle = math.radians(angle)
    try:
        l.use_shadow = shadow
    except Exception:
        pass
    o = link(bpy.data.objects.new(name, l))
    o.rotation_euler = (-Vector(toward)).to_track_quat('-Z', 'Y').to_euler()
    return o


# the sky as soft lamps that light the bag, its cord, and its letters, and never the desk: in the app
# the sky is a hemisphere light that casts no shadow, so here it shades the cloth (folds, the inside of
# the mouth) without spreading a wide gray ring over the desk. (elevation, how many around, strength)
SKY_LAMPS = [(90, 1, 0.26), (60, 6, 0.075), (30, 8, 0.06)]


def lights(subject=None):
    if subject is not None:
        for el, count, strength in SKY_LAMPS:
            for k in range(count):
                d = view_dir(CAM_AZ + 360 * (k + 0.5 * (el == 30)) / count, el)
                warm = (1.0, 0.97, 0.91) if el > 45 else (1.0, 0.94, 0.86)
                o = sun('sky', d, strength, warm, 34)
                o.light_linking.receiver_collection = subject
    vd = view_dir(CAM_AZ, 0)                      # toward the camera, flat
    away = Vector((-vd.x, -vd.y, 0)).normalized()  # behind the bag
    left = Vector((-math.cos(math.radians(CAM_AZ)), -math.sin(math.radians(CAM_AZ)), 0))
    s = math.radians(KEY_SIDE)
    h = (away * math.cos(s) + left * math.sin(s)).normalized()
    e = math.radians(KEY_EL)
    key = Vector((h.x * math.cos(e), h.y * math.cos(e), math.sin(e)))
    sun('key', key, 0.66, (1.0, 0.89, 0.72), 26)
    # a soft fill from the camera's side so the front of the bag isn't black; it casts no shadow
    f = view_dir(CAM_AZ + 55, 40)
    sun('fill', f, 0.72, (1.0, 0.95, 0.88), 30, shadow=False)


def desk():
    """a shadow catcher: it shows only the shadow, and bounces the desk's warm light back up. The desk
    also gets the rest of the sky as light that casts no shadow (as the app's sky does), so the key's
    shadow takes away a little under half the light at its darkest"""
    v = [(-15, -15, 0), (15, -15, 0), (15, 15, 0), (-15, 15, 0)]
    o = mesh_obj('desk', v, [(0, 1, 2, 3)], [plain('desk', '#B98A5A', 0.85)], smooth_shade=False)
    o.is_shadow_catcher = True
    only = bpy.data.collections.new('desk_only')
    only.objects.link(o)
    sky = sun('desk_sky', (0, 0, 1), 0.46, (1.0, 0.97, 0.91), 60, shadow=False)
    sky.light_linking.receiver_collection = only
    return o


def camera(target, dist=7.5, lens=80):
    cam = bpy.data.cameras.new('cam')
    cam.lens = lens
    cam.sensor_width = 36
    cam.sensor_fit = 'AUTO'
    cam.clip_start = 0.05
    cam.clip_end = 100
    o = link(bpy.data.objects.new('cam', cam))
    bpy.context.scene.camera = o
    d = view_dir(CAM_AZ, CAM_EL)
    o.location = Vector(target) + d * dist
    o.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    return o


# == materials ==
def principled(m):
    return next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')


def setin(p, name, value):
    if name in p.inputs:
        p.inputs[name].default_value = value


def plain(name, hexcol, rough=0.8, spec=0.35):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = principled(m)
    setin(p, 'Base Color', (*lin(hexcol), 1))
    setin(p, 'Roughness', rough)
    setin(p, 'Specular IOR Level', spec)
    return m


def cloth(name, base, dark, sheen_tint, sheen=0.55, sheen_rough=0.55, fuzz=0.03):
    """felt: matte, a soft fuzz at grazing angles, a little blotchy, a fine nap"""
    m = plain(name, base, 1.0, 0.12)
    nt = m.node_tree
    p = principled(m)
    setin(p, 'Sheen Weight', sheen)
    setin(p, 'Sheen Roughness', sheen_rough)
    setin(p, 'Sheen Tint', (*lin(sheen_tint), 1))
    tc = nt.nodes.new('ShaderNodeTexCoord')
    blot = nt.nodes.new('ShaderNodeTexNoise')
    blot.inputs['Scale'].default_value = 2.2
    blot.inputs['Detail'].default_value = 3.0
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    a, b = ramp.color_ramp.elements
    a.position, a.color = 0.35, (*lin(dark), 1)
    b.position, b.color = 0.68, (*lin(base), 1)
    nt.links.new(tc.outputs['Object'], blot.inputs['Vector'])
    nt.links.new(blot.outputs['Fac'], ramp.inputs['Fac'])
    ao = nt.nodes.new('ShaderNodeAmbientOcclusion')
    ao.inputs['Distance'].default_value = 0.12
    ao.only_local = True
    crease = nt.nodes.new('ShaderNodeValToRGB')
    c0, c1 = crease.color_ramp.elements
    c0.position, c0.color = 0.0, (0.55, 0.55, 0.55, 1)
    c1.position, c1.color = 1.0, (1, 1, 1, 1)
    nt.links.new(ao.outputs['AO'], crease.inputs['Fac'])
    mul = nt.nodes.new('ShaderNodeVectorMath')
    mul.operation = 'MULTIPLY'
    nt.links.new(ramp.outputs['Color'], mul.inputs[0])
    nt.links.new(crease.outputs['Color'], mul.inputs[1])
    nt.links.new(mul.outputs['Vector'], p.inputs['Base Color'])
    nap = nt.nodes.new('ShaderNodeTexNoise')
    nap.inputs['Scale'].default_value = 90.0
    nap.inputs['Detail'].default_value = 6.0
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.35
    bump.inputs['Distance'].default_value = fuzz
    nt.links.new(tc.outputs['Object'], nap.inputs['Vector'])
    nt.links.new(nap.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], p.inputs['Normal'])
    return m


def cord_mat(name, hexcol):
    m = plain(name, hexcol, 0.85, 0.2)
    p = principled(m)
    setin(p, 'Sheen Weight', 0.35)
    setin(p, 'Sheen Roughness', 0.5)
    setin(p, 'Sheen Tint', (1, 1, 1, 1))
    return m


def block_mat(name, top, lip, h, band=0.36):
    """one color, with the bottom edge a shade darker, like the board's bricks"""
    m = plain(name, top, 0.62, 0.3)
    nt = m.node_tree
    p = principled(m)
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    a, b = ramp.color_ramp.elements
    a.position, a.color = max(0.0, band - 0.03), (*lin(lip), 1)
    b.position, b.color = min(1.0, band + 0.03), (*lin(top), 1)
    mr = nt.nodes.new('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value = -h / 2
    mr.inputs['From Max'].default_value = h / 2
    nt.links.new(tc.outputs['Object'], sep.inputs[0])
    nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
    nt.links.new(mr.outputs['Result'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], p.inputs['Base Color'])
    return m


# == the pouch ==
def warp(P, cfg):
    """settle the pouch: a little wider than deep, the neck leaning, the header flopped to one side"""
    P = np.asarray(P, float)
    x, y, z = P[..., 0].copy(), P[..., 1].copy(), P[..., 2].copy()
    zn, zt = cfg['zn'], cfg['ztop']
    x *= cfg['sx']
    y *= cfg['sy']
    h = smooth(0.15, zn, z)
    x += cfg['lean'][0] * h
    y += cfg['lean'][1] * h
    u = np.clip((z - zn) / (zt - zn), 0, None)
    x += cfg['flop'][0] * u ** 1.6
    y += cfg['flop'][1] * u ** 1.6
    z -= cfg['flop'][2] * u ** 2
    return np.stack([x, y, z], -1)


def axis_at(cfg, z):
    p = warp(np.array([[0.0, 0.0, z]]), cfg)[0]
    return float(p[0]), float(p[1])


def ridge(TH, center, width):
    x = np.clip(angd(TH, center) / width, -1, 1)
    return np.cos(0.5 * np.pi * x)


def folds(cfg, rng, TH, ZZ):
    """gathers. Below the cord: ridges that start at the cord and fan out down the slack cloth,
    with creases between them, fading out where the letters fill the bag. Above the cord: the
    header's flutes, deeper toward the hem. Each set of folds sinks its creases by `dip` of its own
    mean depth, so the cloth waves in and out around its profile instead of only bulging."""
    zn, zt = cfg['zn'], cfg['ztop']
    D = np.zeros_like(TH)
    below = np.clip(zn - ZZ, 0, None)
    under = ZZ <= zn
    for count, amp, reach, share, dip in cfg['body_folds']:
        base = rng.uniform(0, 2 * np.pi)
        E = np.zeros_like(TH)
        A = np.zeros_like(TH)
        for k in range(count):
            c0 = base + 2 * np.pi * (k + rng.uniform(-0.32, 0.32)) / count
            r_k = reach * rng.uniform(0.65, 1.3)
            a_k = amp * rng.uniform(0.6, 1.15)
            w_k = share * 2 * np.pi / count * rng.uniform(0.8, 1.25)
            drift = rng.uniform(-0.35, 0.35)
            t = np.clip(below / r_k, 0, 1)
            grow = cfg['at_cord'] + (1 - cfg['at_cord']) * smooth(0.0, cfg['pinch'], below)
            env = np.where(under, grow * (1 - t) ** 1.3, cfg['at_cord'] * smooth(cfg['pinch'], 0.0, ZZ - zn))
            E += a_k * env * ridge(TH, c0 + drift * t * t, w_k * (1 + 0.6 * t))
            A += a_k * env / count
        D += E - dip * A
    above = np.clip((ZZ - zn) / (zt - zn), 0, None)
    for count, amp, share, dip in cfg['head_folds']:
        base = rng.uniform(0, 2 * np.pi)
        E = np.zeros_like(TH)
        A = np.zeros_like(TH)
        for k in range(count):
            c0 = base + 2 * np.pi * (k + rng.uniform(-0.28, 0.28)) / count
            a_k = amp * rng.uniform(0.6, 1.2)
            w_k = share * 2 * np.pi / count * rng.uniform(0.8, 1.2)
            sway = rng.uniform(-0.3, 0.3)
            env = smooth(0.0, cfg['head_rise'], above) * (0.45 + 0.55 * above)
            E += a_k * env * ridge(TH, c0 + sway * above, w_k)
            A += a_k * env / count
        D += E - dip * A
    return D


def pouch(cfg, mats, seed):
    rng = random.Random(seed)
    zn = cfg['zn']
    prof = crspline(cfg['profile'], per=40)
    dens = lambda Q: 1.0 + cfg['neck_density'] * np.exp(-((Q[:, 1] - zn) / 0.14) ** 2)
    prof = resample(prof, cfg['rows'], weight=dens)
    R, Z = prof[:, 0], prof[:, 1]
    dR, dZ = np.gradient(R), np.gradient(Z)
    ln = np.hypot(dR, dZ)
    nr, nz = dZ / ln, -dR / ln
    nt = cfg['cols']
    th = np.linspace(0, 2 * np.pi, nt, endpoint=False)
    TH, ZZ = np.meshgrid(th, Z)
    RR = np.repeat(R[:, None], nt, 1)
    D = folds(cfg, rng, TH, ZZ)
    # lumps: the letters inside push the cloth out here and there
    if cfg['lumps']:
        mask = smooth(0.06, 0.25, ZZ) * smooth(zn - 0.05, zn - 0.35, ZZ)
        L = np.zeros_like(D)
        for i in range(D.shape[0]):
            for j in range(nt):
                v = Vector((RR[i, j] * math.cos(th[j]), RR[i, j] * math.sin(th[j]), ZZ[i, j]))
                L[i, j] = noise.noise(v * 1.8 + Vector((seed, 0, 0))) + 0.5 * noise.noise(v * 4.1 + Vector((0, seed, 0)))
        D += cfg['lumps'] * mask * L
    NR, NZ = nr[:, None], nz[:, None]
    RD = np.maximum(RR + D * NR, 0.015)   # creases near the cord never cross the middle
    X = RD * np.cos(TH)
    Y = RD * np.sin(TH)
    Zs = ZZ + D * NZ
    # the hem: the top edge waves up and down a little, with the ruffle's flutes
    above = np.clip((ZZ - zn) / (cfg['ztop'] - zn), 0, None)
    wave = np.zeros(nt)
    for f, a in ((2, 0.5), (3, 0.35), (5, 0.25), (7, 0.15)):
        wave += a * np.sin(f * th + rng.uniform(0, 6.28))
    Zs = Zs + cfg['rim_wave'] * above ** 2 * wave[None, :]
    P = warp(np.stack([X, Y, Zs], -1), cfg)
    P[..., 2] = np.maximum(P[..., 2], 0.0) + 0.001
    ns = P.shape[0]
    verts = list(P.reshape(-1, 3))
    faces = []
    for i in range(ns - 1):
        for j in range(nt):
            a, b = i * nt + j, i * nt + (j + 1) % nt
            faces.append((a, b, b + nt, a + nt))
    verts.append(np.array([0.0, 0.0, 0.001]))
    pole = len(verts) - 1
    for j in range(nt):
        faces.append((pole, (j + 1) % nt, j))
    o = mesh_obj(cfg['name'], verts, faces, [mats['cloth'], mats['cloth_in']])   # outside, inside
    s = o.modifiers.new('cloth', 'SOLIDIFY')
    s.thickness = cfg['thick']
    s.offset = -1
    s.use_even_offset = False
    s.use_quality_normals = True
    s.material_offset = 1
    sub = o.modifiers.new('soft', 'SUBSURF')
    sub.levels = 1
    sub.render_levels = 1
    return o


# == the cord ==
def frames(P, closed=False):
    n = len(P)
    if closed:
        T = np.roll(P, -1, 0) - np.roll(P, 1, 0)
    else:
        T = np.gradient(P, axis=0)
    T = T / np.linalg.norm(T, axis=1, keepdims=True)
    N = np.zeros_like(P)
    a = np.array([0.0, 0.0, 1.0]) if abs(T[0][2]) < 0.9 else np.array([1.0, 0.0, 0.0])
    N[0] = unit(np.cross(T[0], a))
    for i in range(1, n):
        v = np.cross(T[i - 1], T[i])
        s = np.linalg.norm(v)
        prev = N[i - 1]
        if s > 1e-9:
            k = v / s
            ang = math.atan2(s, float(np.dot(T[i - 1], T[i])))
            prev = prev * math.cos(ang) + np.cross(k, prev) * math.sin(ang) + k * np.dot(k, prev) * (1 - math.cos(ang))
        prev = prev - T[i] * np.dot(prev, T[i])
        N[i] = prev / np.linalg.norm(prev)
    B = np.cross(T, N)
    return T, N, B


def sweep(name, P, rc, mat, ring=18, lobes=3, lobe=0.07, lay=None, closed=False, cap_end=True,
          cap_start=False, swell=None):
    """a three strand cord along the path P: a lobed section that turns as it goes"""
    P = np.asarray(P, float)
    T, N, B = frames(P, closed)
    if closed:
        seg = np.linalg.norm(np.roll(P, -1, 0) - P, axis=1)
        L = np.r_[0, np.cumsum(seg)[:-1]]
        total = seg.sum()
    else:
        L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]
        total = L[-1]
    lay = lay or 5.0 * rc
    w = 2 * np.pi / lay
    if closed:
        k = max(1, round(lobes * w * total / (2 * np.pi)))
        w = 2 * np.pi * k / (lobes * total)
    rad = np.full(len(P), rc)
    if swell is not None:
        rad = rad * swell(L, total)
    if cap_end and not closed:
        d = total - L
        e = np.clip(d / rc, 0, 1)
        rad = rad * np.sqrt(np.clip(1 - (1 - e) ** 2, 0.04, 1))
    if cap_start and not closed:
        e = np.clip(L / rc, 0, 1)
        rad = rad * np.sqrt(np.clip(1 - (1 - e) ** 2, 0.04, 1))
    phi = np.linspace(0, 2 * np.pi, ring, endpoint=False)
    Rr = rad[:, None] * (1 + lobe * np.cos(lobes * (phi[None, :] - w * L[:, None])))
    V = P[:, None, :] + Rr[..., None] * (np.cos(phi)[None, :, None] * N[:, None, :] + np.sin(phi)[None, :, None] * B[:, None, :])
    n = len(P)
    verts = list(V.reshape(-1, 3))
    faces = []
    rows = n if closed else n - 1
    for i in range(rows):
        i2 = (i + 1) % n
        for j in range(ring):
            j2 = (j + 1) % ring
            faces.append((i * ring + j, i * ring + j2, i2 * ring + j2, i2 * ring + j))
    if not closed:
        verts.append(P[0])
        c0 = len(verts) - 1
        for j in range(ring):
            faces.append((c0, (j + 1) % ring, j))
        verts.append(P[-1])
        c1 = len(verts) - 1
        base = (n - 1) * ring
        for j in range(ring):
            faces.append((c1, base + j, base + (j + 1) % ring))
    o = mesh_obj(name, verts, faces, [mat])
    sub = o.modifiers.new('soft', 'SUBSURF')
    sub.levels = sub.render_levels = 1
    return o


def relax(P, passes=8, keep=2):
    """smooth a polyline in place, holding its ends: a cord has some stiffness, it doesn't follow
    every bump"""
    P = np.array(P, float)
    for _ in range(passes):
        P[keep:-keep] = 0.25 * P[keep - 1:-keep - 1] + 0.5 * P[keep:-keep] + 0.25 * P[keep + 1:-keep + 1]
    return P


def knot(c, t, rc, turns=1.15, n=56, size=1.05):
    """an overhand knot, near enough: the cord swings once around its own line and carries on"""
    t = unit(t)
    a = np.array([0.0, 0.0, 1.0]) if abs(t[2]) < 0.9 else np.array([1.0, 0.0, 0.0])
    nv = unit(np.cross(t, a))
    bv = np.cross(t, nv)
    u = np.linspace(0, 1, n)
    x = (u - 0.5) * 2.8 * rc
    R = size * rc * np.sin(np.pi * u) ** 0.7
    ang = 2 * np.pi * turns * u + 0.6
    return np.asarray(c)[None, :] + x[:, None] * t + R[:, None] * (np.cos(ang)[:, None] * nv + np.sin(ang)[:, None] * bv)


def envelope(bvh, cfg, z, th, rc):
    """how far out the cloth reaches at height z toward angle th, bridging the valleys between folds"""
    cx, cy = axis_at(cfg, z)
    hit = bvh.ray_cast(Vector((cx + 5 * math.cos(th), cy + 5 * math.sin(th), z)), Vector((-math.cos(th), -math.sin(th), 0)))
    if hit[0] is None:
        return None
    first = math.hypot(hit[0].x - cx, hit[0].y - cy)
    best = None
    win = min(0.6, 2.2 * rc / max(first, 0.08))   # look a cord's width or so either side
    for d in np.linspace(-win, win, 9):
        a = th + d
        hit = bvh.ray_cast(Vector((cx + 5 * math.cos(a), cy + 5 * math.sin(a), z)), Vector((-math.cos(a), -math.sin(a), 0)))
        if hit[0] is None:
            continue
        r = math.hypot(hit[0].x - cx, hit[0].y - cy) * math.cos(d)
        best = r if best is None else max(best, r)
    return best


def drape(bvh, cfg, z0, z1, th0, th1, rc, n=22, bend=1.3, bow=0.0):
    """a strand lying on the cloth from z0 down to z1, hanging straight once it passes the belly"""
    zs = np.linspace(z0, z1, n)
    ths, rs = [], []
    for i, z in enumerate(zs):
        t = i / (n - 1)
        th = th0 + (th1 - th0) * t ** bend + bow * math.sin(math.pi * t)
        r = envelope(bvh, cfg, z, th, rc)
        ths.append(th)
        rs.append(r if r is not None else (rs[-1] if rs else 0.2))
    rs = np.maximum.accumulate(np.array(rs))
    k = np.array([0.25, 0.5, 0.25])
    for _ in range(3):
        rs = np.convolve(np.r_[rs[0], rs, rs[-1]], k, 'valid')
    rs = np.maximum.accumulate(rs)
    Q = np.stack([rs, zs], 1)
    Tq = np.gradient(Q, axis=0)
    Tq /= np.linalg.norm(Tq, axis=1, keepdims=True)
    Nq = np.stack([-Tq[:, 1], Tq[:, 0]], 1)
    C = Q + Nq * rc * 0.92
    out = []
    for i in range(n):
        cx, cy = axis_at(cfg, C[i, 1])
        out.append((cx + C[i, 0] * math.cos(ths[i]), cy + C[i, 0] * math.sin(ths[i]), C[i, 1]))
    return np.array(out), ths


def strand(name, bvh, cfg, s, rc, mat, start):
    """one end of the drawstring: from the tie, over the cloth, maybe onto the desk, then a knot"""
    pts, ths = drape(bvh, cfg, s['z0'], s['z1'], s['th0'], s['th1'], rc, bend=s.get('bend', 1.3), bow=s.get('bow', 0.0))
    ctrl = [start] + [tuple(p) for p in pts[1:]]
    if s.get('desk'):
        last = np.array(pts[-1])
        th = ths[-1]
        out = np.array([math.cos(th), math.sin(th), 0.0])
        ctrl.append(tuple(last + out * 0.03 + np.array([0, 0, -(last[2] - rc) * 0.62])))
        p = last.copy()
        p[2] = rc
        p = p + out * 0.1
        ctrl.append(tuple(p))
        ang = th
        for step, turn in s['desk']:
            ang += math.radians(turn)
            p = p + np.array([math.cos(ang), math.sin(ang), 0.0]) * step
            ctrl.append(tuple(p))
    path = relax(resample(crspline(ctrl, per=16), step=rc * 0.3), 12)
    tdir = path[-1] - path[-4]
    kc = path[-1] + unit(tdir) * 1.3 * rc
    lift = s.get('knot_lift', 1.0 * rc if s.get('desk') else 0.0)
    kc = kc + np.array([0, 0, lift])
    kn = knot(kc, tdir, rc, size=s.get('knot', 1.05))
    tail_dir = unit(kn[-1] - kn[-6])
    tail = [kn[-1] + tail_dir * rc * f for f in np.linspace(0.3, s.get('tail', 2.2), 8)]
    if s.get('desk'):
        for q in tail:
            q[2] = max(q[2], rc * 0.98)
    full = np.vstack([path, kn[1:], np.array(tail)])
    full = resample(full, step=rc * 0.22)
    sw = lambda L, tot: 1.0 + 0.12 * smooth(tot - 0.6 * rc, tot - 0.1 * rc, L)
    return sweep(name, full, rc, mat, swell=sw)


def drawstring(bag, cfg, mats):
    c = cfg['cord']
    rc = c['r']
    zn = cfg['zn']
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    bvh = BVHTree.FromObject(bag, deps)
    # the loop around the neck, pulled into the gathers
    n = 120
    th = np.linspace(0, 2 * np.pi, n, endpoint=False)
    rr = c['ring_r'] + 0.012 * np.sin(3 * th + 1.1)
    zz = zn + c.get('ring_tilt', 0.0) * np.cos(th - c['th']) + 0.01 * np.sin(2 * th + 0.4)
    ring = warp(np.stack([rr * np.cos(th), rr * np.sin(th), zz], 1), cfg)
    parts = [sweep('cord_ring', ring, rc, mats['cord'], closed=True)]
    # the tie at the front, where both ends come out
    j = int(round((c['th'] % (2 * np.pi)) / (2 * np.pi) * n)) % n
    tie = ring[j]
    cx, cy = axis_at(cfg, zn)
    outv = unit([tie[0] - cx, tie[1] - cy, 0.0])
    tang = unit(ring[(j + 1) % n] - ring[j - 1])
    tc = tie + outv * rc * 0.9
    tk = knot(tc, tang, rc, turns=1.0, size=1.1)
    parts.append(sweep('cord_tie', tk, rc, mats['cord'], cap_end=True, cap_start=True))
    start = tuple(tc + outv * rc * 0.4 - np.array([0, 0, rc * 0.5]))
    for i, s in enumerate(c['ends']):
        parts.append(strand('cord_end_%d' % i, bvh, cfg, s, rc, mats['cord'], start))
    return parts


# == letter blocks ==
def rounded_block(name, w, d, h, rv, rb, mat):
    """a rounded brick: corners rounded in plan (rv) and every top and bottom edge rounded (rb)"""
    corners = [(w / 2 - rv, d / 2 - rv, 0), (-(w / 2 - rv), d / 2 - rv, 90), (-(w / 2 - rv), -(d / 2 - rv), 180), (w / 2 - rv, -(d / 2 - rv), 270)]
    arc = 7

    def outline(e):
        pts = []
        for cx, cy, a0 in corners:
            for k in range(arc):
                a = math.radians(a0 + 90 * k / (arc - 1))
                pts.append((cx + (rv - e) * math.cos(a), cy + (rv - e) * math.sin(a)))
        return pts

    steps = 6
    rings = []   # the inset and height of each ring around the rounded edges
    for k in range(steps + 1):
        a = math.radians(90 * k / steps)          # 0 at the underside, 90 at the wall
        rings.append((rb * (1 - math.sin(a)), -h / 2 + rb * (1 - math.cos(a))))
    for k in range(steps + 1):
        a = math.radians(90 * k / steps)          # 0 at the wall, 90 at the top
        rings.append((rb * (1 - math.cos(a)), h / 2 - rb + rb * math.sin(a)))
    verts, faces = [], []
    m = len(outline(0))
    for e, z in rings:
        for x, y in outline(e):
            verts.append((x, y, z))
    for i in range(len(rings) - 1):
        for jj in range(m):
            j2 = (jj + 1) % m
            faces.append((i * m + jj, i * m + j2, (i + 1) * m + j2, (i + 1) * m + jj))
    faces.append(tuple(range(m - 1, -1, -1)))
    top = (len(rings) - 1) * m
    faces.append(tuple(top + jj for jj in range(m)))
    o = mesh_obj(name, verts, faces, [mat])
    return o


def letter_mesh(name, ch, height, font, mat):
    cu = bpy.data.curves.new(name, 'FONT')
    cu.body = ch
    if font:
        cu.font = font
    else:
        cu.offset = 0.035     # the built in font is thin; thicken it
    cu.size = 1.0
    cu.extrude = 0.0
    cu.resolution_u = 10
    to = link(bpy.data.objects.new(name + '_t', cu))
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(to.evaluated_get(deps))
    bpy.data.objects.remove(to)
    co = np.array([v.co[:] for v in me.vertices])
    lo, hi = co.min(0), co.max(0)
    cap = hi[1] - lo[1]
    s = height / cap
    for v in me.vertices:
        v.co.x = (v.co.x - (lo[0] + hi[0]) / 2) * s
        v.co.y = (v.co.y - (lo[1] + hi[1]) / 2) * s
        v.co.z = 0.0
    me.materials.append(mat)
    return link(bpy.data.objects.new(name, me))


def block(name, ch, color, ink, at, normal, up, font, w=0.36, h=0.16):
    """one letter block, placed with its top facing `normal` and its letter's top toward `up`"""
    top_col, lip_col = color
    mat = block_mat(name + '_m', top_col, lip_col, h)
    b = rounded_block(name, w, w, h, 0.075, 0.04, mat)
    lm = letter_mesh(name + '_l', ch, w * 0.5, font, plain(name + '_ink', ink, 0.7, 0.2))
    lm.parent = b
    lm.location = (0, 0, h / 2 + 0.0015)
    nz = Vector(normal).normalized()
    upv = Vector(up)
    ny = (upv - nz * upv.dot(nz)).normalized()
    nx = ny.cross(nz)
    M = Matrix((nx, ny, nz)).transposed().to_4x4()
    M.translation = Vector(at)
    b.matrix_world = M
    return b


def load_font():
    for f in FONTS:
        if os.path.exists(f):
            try:
                return bpy.data.fonts.load(f)
            except Exception:
                pass
    return None


# == the two bags ==
GREEN = '#46735C'
GREEN_DARK = '#406B55'
GREEN_SHEEN = '#A9C4A7'
CORD = '#DDCB9D'

SHUT = {
    'name': 'bag',
    'profile': [(0.02, 0.0), (0.48, 0.0), (0.80, 0.04), (0.98, 0.17), (1.03, 0.33), (0.99, 0.48),
                (0.88, 0.62), (0.66, 0.76), (0.42, 0.88), (0.22, 0.98), (0.09, 1.05), (0.055, 1.08),
                (0.07, 1.12), (0.14, 1.20), (0.23, 1.30), (0.31, 1.40), (0.36, 1.47), (0.38, 1.50)],
    'zn': 1.08, 'ztop': 1.50, 'rows': 200, 'cols': 240, 'neck_density': 2.2,
    'body_folds': [(5, 0.28, 1.05, 0.5, 0.55), (8, 0.14, 0.5, 0.4, 0.5), (10, 0.06, 0.2, 0.32, 0.3)],
    'head_folds': [(9, 0.2, 0.5, 0.85), (5, 0.08, 0.6, 0.3)],
    'at_cord': 0.25, 'pinch': 0.06, 'head_rise': 0.14,
    'rim_wave': 0.035, 'lumps': 0.045,
    'sx': 1.05, 'sy': 0.95, 'lean': (-0.05, 0.03), 'flop': (-0.1, 0.06, 0.05),
    'thick': 0.042,
}
OPEN = {
    'name': 'bag_open',
    'profile': [(0.02, 0.0), (0.48, 0.0), (0.81, 0.05), (0.99, 0.19), (1.04, 0.35), (1.0, 0.52),
                (0.9, 0.66), (0.75, 0.77), (0.6, 0.85), (0.52, 0.9), (0.5, 0.93),
                (0.51, 0.98), (0.55, 1.05), (0.61, 1.12), (0.67, 1.165), (0.71, 1.18)],
    'zn': 0.93, 'ztop': 1.18, 'rows': 180, 'cols': 240, 'neck_density': 1.4,
    'body_folds': [(7, 0.13, 0.6, 0.5, 0.5), (10, 0.06, 0.26, 0.4, 0.3)],
    'head_folds': [(6, 0.11, 0.55, 0.55), (9, 0.045, 0.4, 0.3)],
    'at_cord': 0.45, 'pinch': 0.05, 'head_rise': 0.3,
    'rim_wave': 0.07, 'lumps': 0.03,
    'sx': 1.03, 'sy': 0.96, 'lean': (-0.03, 0.03), 'flop': (-0.05, 0.09, 0.05),
    'thick': 0.042,
}

BLOCKS = {   # the board's colors: (top, bottom edge), letter ink
    'gold': (('#EFB940', '#C08F22'), '#4B3A18'),
    'red': (('#B84A38', '#8E3527'), '#FFFFFF'),
    'plum': (('#8A5AA6', '#68407F'), '#FFFFFF'),
    'blue': (('#2D6EA6', '#1F5180'), '#FFFFFF'),
    'green': (('#3B7F45', '#2A5E32'), '#FFFFFF'),
}


def materials():
    return {
        'cloth': cloth('felt', GREEN, GREEN_DARK, GREEN_SHEEN, sheen=0.8, sheen_rough=0.42),
        'cloth_in': cloth('felt_in', '#33523F', '#2D4A38', '#6F8A70', sheen=0.3),
        'cord': cord_mat('cord', CORD),
    }


def cam_frame():
    """unit vectors on the desk: toward the camera, and to the camera's right"""
    vd = view_dir(CAM_AZ, 0)
    toward = np.array([vd.x, vd.y, 0.0])
    right = np.array([math.cos(math.radians(CAM_AZ)), math.sin(math.radians(CAM_AZ)), 0.0])
    return toward, right, math.atan2(vd.y, vd.x)


def build_shut():
    mats = materials()
    cfg = dict(SHUT)
    bag = pouch(cfg, mats, 11)
    toward, right, thc = cam_frame()
    tie_th = thc + math.radians(26)
    cfg['cord'] = {
        'r': 0.05, 'ring_r': 0.15, 'th': tie_th, 'ring_tilt': 0.015,
        'ends': [
            {'z0': cfg['zn'] - 0.06, 'z1': 0.2, 'th0': tie_th + 0.04, 'th1': tie_th + 0.5, 'bow': 0.12,
             'desk': [(0.1, -20), (0.1, -28)], 'knot': 1.08, 'tail': 2.4},
            {'z0': cfg['zn'] - 0.06, 'z1': 0.62, 'th0': tie_th - 0.05, 'th1': tie_th - 0.32, 'bow': -0.08,
             'knot': 1.08, 'tail': 2.0, 'bend': 1.0},
        ],
    }
    drawstring(bag, cfg, mats)
    return (0.0, 0.0, 0.62)


def build_open():
    mats = materials()
    cfg = dict(OPEN)
    bag = pouch(cfg, mats, 5)
    toward, right, thc = cam_frame()
    tie_th = thc + math.radians(30)
    cfg['cord'] = {
        'r': 0.05, 'ring_r': 0.57, 'th': tie_th, 'ring_tilt': 0.02,
        'ends': [
            {'z0': cfg['zn'] - 0.06, 'z1': 0.2, 'th0': tie_th + 0.04, 'th1': tie_th + 0.42, 'bow': 0.1,
             'desk': [(0.1, -20), (0.1, -30)], 'knot': 1.08, 'tail': 2.4},
            {'z0': cfg['zn'] - 0.06, 'z1': 0.5, 'th0': tie_th - 0.05, 'th1': tie_th - 0.3, 'bow': -0.06,
             'knot': 1.08, 'tail': 2.0, 'bend': 1.0},
        ],
    }
    drawstring(bag, cfg, mats)
    font = load_font()
    zn = cfg['zn']
    cx, cy = axis_at(cfg, zn)
    c = np.array([cx, cy, 0.0])
    up = np.array([0, 0, 1.0])

    def face(back, turn=0.0):
        """a face toward the camera, its top tipped back by `back` degrees from upright, turned by `turn`"""
        b = math.radians(back)
        n = toward * math.cos(b) + up * math.sin(b)
        return np.array(Matrix.Rotation(math.radians(turn), 3, 'Z') @ Vector(n))

    # the letters inside, mostly hidden, heaped a little higher in the middle
    rng = random.Random(3)
    cols = ['plum', 'green', 'blue', 'gold', 'plum', 'blue']   # no red in the heap, so the red E stands alone
    letters = 'ABDEHKLMNOPRTUW'
    for i in range(11):
        a = rng.uniform(0, 2 * np.pi)
        rr = 0.36 * math.sqrt(rng.uniform(0.05, 1))
        p = c + np.array([rr * math.cos(a), rr * math.sin(a), 0.0])
        z = zn - 0.15 - 0.45 * rr ** 2 + rng.uniform(-0.02, 0.02)
        nrm = unit(np.array([rng.uniform(-0.7, 0.7), rng.uniform(-0.7, 0.7), 1.0]))
        upv = np.array([math.cos(a + 1.3), math.sin(a + 1.3), 0.0])
        col = cols[i % len(cols)]
        block('pile%d' % i, rng.choice(letters), BLOCKS[col][0], BLOCKS[col][1], (p[0], p[1], z), nrm, upv, font)
    # four that peek out: one standing up at the back, two tipped against the rim, one fallen out
    heroes = [
        ('S', 'gold', c - toward * 0.08 - right * 0.03 + up * (zn + 0.12), face(16, 3)),
        ('R', 'blue', c + toward * 0.16 - right * 0.25 + up * (zn + 0.06), face(42, -24)),
        ('E', 'red', c + toward * 0.04 + right * 0.26 + up * (zn + 0.05), face(34, 26)),
        ('A', 'plum', c + toward * 1.1 - right * 0.4 + up * 0.081, up),
    ]
    for i, (ch, col, at, n) in enumerate(heroes):
        if abs(np.dot(n, up)) > 0.95:
            upv = np.array(Matrix.Rotation(math.radians(-14), 3, 'Z') @ Vector(-toward))
        else:
            upv = up
        block('hero%d' % i, ch, BLOCKS[col][0], BLOCKS[col][1], at, n, upv, font)
    return (0.0, 0.0, 0.6)


# == render ==
def probe_alpha(sc, path, res=256, samples=48):
    sc.render.resolution_x = sc.render.resolution_y = res
    keep = sc.cycles.samples, sc.cycles.adaptive_threshold
    sc.cycles.samples, sc.cycles.adaptive_threshold = samples, 0.02
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    sc.cycles.samples, sc.cycles.adaptive_threshold = keep
    img = bpy.data.images.load(path, check_existing=False)
    px = np.empty(res * res * 4, np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    os.remove(path)
    a = px.reshape(res, res, 4)[:, :, 3]
    k = np.ones(3) / 3   # a light blur, so a stray noisy pixel can't stretch the box
    a = np.apply_along_axis(lambda r: np.convolve(r, k, 'same'), 0, a)
    a = np.apply_along_axis(lambda r: np.convolve(r, k, 'same'), 1, a)
    return a


def measure(sc, cam, tmp, res):
    """the box around everything with any real alpha (the bag, its cord, its shadow), in lens units"""
    a = probe_alpha(sc, tmp, res)
    ys, xs = np.nonzero(a > 0.05)
    k = cam.lens / cam.sensor_width
    u0, u1 = xs.min() / res - 0.5, (xs.max() + 1) / res - 0.5
    v0, v1 = ys.min() / res - 0.5, (ys.max() + 1) / res - 0.5
    edge = max(a[:2].max(), a[-2:].max(), a[:, :2].max(), a[:, -2:].max()) > 0.05
    # a shift moves the view: a point at lens units p lands at k * p - shift
    return ((u0 + cam.shift_x) / k, (u1 + cam.shift_x) / k, (v0 + cam.shift_y) / k, (v1 + cam.shift_y) / k), edge


def aim(cam, box, pad):
    au0, au1, av0, av1 = box
    k = 1.0 / (max(au1 - au0, av1 - av0) * pad)
    cam.lens = k * cam.sensor_width
    cam.shift_x = (au0 + au1) / 2 * k
    cam.shift_y = (av0 + av1) / 2 * k


def frame_tight(sc, cam_obj, tmp):
    """find the bag and its shadow with a wide quick pass, look again closer, then fit them square"""
    cam = cam_obj.data
    cam.shift_x = cam.shift_y = 0.0
    cam.lens = 28.0
    box, edge = measure(sc, cam, tmp, 384)
    if edge:
        print('warning: something reaches the edge of the wide framing pass')
    for pad in (1.3, 1.7, 2.2):
        aim(cam, box, pad)
        near, edge = measure(sc, cam, tmp, 320)
        if not edge:
            box = near
            break
    aim(cam, box, SIZE / (SIZE - 2 * MARGIN))
    sc.render.resolution_x = sc.render.resolution_y = SIZE


def fade_edges(path):
    """let the last few pixels at the border fall to clear, so a faint shadow is never cut hard"""
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(h, w, 4)
    edge = max(2, MARGIN - 2)
    xs = np.minimum(np.arange(w), np.arange(w)[::-1])
    ys = np.minimum(np.arange(h), np.arange(h)[::-1])
    fx = smooth(0, edge, xs)
    fy = smooth(0, edge, ys)
    px[:, :, 3] *= fy[:, None] * fx[None, :]
    img.pixels.foreach_set(px.ravel())
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)


def render(build, name):
    sc = fresh_scene()
    target = build()
    subject = bpy.data.collections.new('subject')
    for o in list(sc.collection.objects):
        if o.type == 'MESH':
            subject.objects.link(o)
    room(sc)
    lights(subject)
    desk()
    cam = camera(target)
    os.makedirs(OUT, exist_ok=True)
    frame_tight(sc, cam, os.path.join(bpy.app.tempdir or OUT, '_probe_%s.png' % name))
    path = os.path.join(OUT, name + '.png')
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    fade_edges(path)
    print('wrote', path)
    if 'views' in OPT:
        cam.data.shift_x = cam.data.shift_y = 0
        cam.data.lens = 50
        for tag, az, el in (('side', CAM_AZ + 90, 8), ('front', CAM_AZ, 10), ('top', CAM_AZ, 80)):
            d = view_dir(az, el)
            cam.location = Vector(target) + d * 7.5
            cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
            sc.render.resolution_x = sc.render.resolution_y = 384
            sc.cycles.samples = 64
            sc.render.filepath = os.path.join(OUT, '%s-%s.png' % (name, tag))
            bpy.ops.render.render(write_still=True)


if OPT.get('only') in (None, True, 'shut'):
    render(build_shut, 'bag')
if OPT.get('only') in (None, True, 'open'):
    render(build_open, 'bag-open')
