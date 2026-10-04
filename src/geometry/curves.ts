/**
 * curves.ts — curve + mirroring helpers shared by the 3D viewer
 * (ENGINEERING_PLAN §5, §8: src/geometry/curves.ts), **plus the twelve
 * cranial-nerve COURSES of NeuroAxis v14** (PLAN.md §3.3/§3.4, §5).
 *
 * All points are triples in the canonical atlas space of plan §2:
 *   x ∈ [-58, 58]  medial→lateral, +x = patient LEFT
 *   y ∈ [-55, 116] inferior→superior
 *   z ∈ [-76, 72]  posterior→anterior (+z = anterior)
 *   1 au = 1.2 mm   (CLIP_BOUNDS, src/components/viewer3d/clipPlanes.ts)
 */
import * as THREE from 'three'
import type { ClinicalItem, Region, Vec3 } from '../types'

/** Convert authored waypoint triples to THREE.Vector3 (no mutation of inputs). */
export function toVector3s(waypoints: readonly Vec3[]): THREE.Vector3[] {
  return waypoints.map((p) => new THREE.Vector3(p[0], p[1], p[2]))
}

/**
 * Smooth Catmull-Rom curve through the authored waypoints, in canonical space.
 * Used by TractTube (TubeGeometry) and by parametric envelope sweeps.
 */
export function toCatmullRom(waypoints: readonly Vec3[], closed = false): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(toVector3s(waypoints), closed, 'catmullrom', 0.5)
}

/** Mirror one canonical point across the mid-sagittal plane (x → −x). */
export function mirrorPoint(p: Vec3): Vec3 {
  return [-p[0], p[1], p[2]]
}

/** Radial explode direction of a structure origin, per plan §5 (normalized xz). */
export function explodeDirection(origin: Vec3): [number, number] {
  const len = Math.hypot(origin[0], origin[2])
  if (len < 1e-4) return [0, 0]
  return [origin[0] / len, origin[2] / len]
}

/* ==================================================================== *
 *  v14 — THE TWELVE CRANIAL-NERVE COURSES
 * ==================================================================== */

/**
 * One cranial nerve as a TRAVELING TRACT: a root, a cisternal segment, the
 * named skull-base opening it traverses and a target — i.e. exactly the
 * `TractRecord` shape the project already renders (Catmull-Rom waypoints +
 * `tubeRadius`), plus the two fields a nerve needs and a tract does not: the
 * `region` it belongs to and the `foramen` it passes through.
 *
 * ## Why these records live HERE, and the migration point
 *
 * PLAN.md §3.2 places the twelve rows in a new
 * `src/data/structures/nerve-courses.json` with the type in `src/types.ts` and
 * the loader split in `src/data/load.ts`. Those three files belong to OTHER
 * tasks of this run (`data-core`, `course-author`) and are not in this task's
 * exclusive write scope, so this task ships the same authored table in the one
 * file it does own — a module with no JSX, no React and no DOM, so the 3D pass
 * (`SceneLayers`), the 2D pass (`sectionAssets`) and the Node gate all read one
 * source of truth.
 *
 * WHEN `load.ts` exports `nerveCourses` (PLAN.md §3.2) the migration is: move
 * this table to `src/data/structures/nerve-courses.json` verbatim
 * (`NerveCourseRecord` is a superset of `TractRecord` and already carries
 * `foramen`), delete it here, and point the two consumers (`SceneLayers`'s
 * course pass and `sectionAssets.SECTION_NERVE_PARTS`) at the loader export.
 * Nothing else changes: the ids, waypoints, radii and foramina below ARE the
 * contract both surfaces read, and `scripts/verify/cranial-nerve-render.mjs`
 * fails loudly if a course loses its exit-landmark anchor, its foramen, or its
 * containment in CLIP_BOUNDS.
 *
 * ## Honesty
 *
 * Every chain is an AUTHORED PATH, not a segmented scan: no cranial-nerve mesh
 * exists in this checkout and none may be added (the anatomy directory sits at
 * 13.8914 MiB of a 14 MiB cap). What IS anchored, and how, is stated per nerve
 * in `anchorNote` — a committed nucleus `origin3d`, a committed exit landmark
 * (`surf-cnN-exit`), or a committed optic-pathway waypoint. The lateral
 * skull-base targets are authored from anatomy: no skull-base, dural-sinus or
 * orbit mesh is committed, so no foramen in this table could be measured
 * against geometry.
 */
export interface NerveCourseRecord {
  /** False withholds a known misleading spatial course; text remains available. */
  meshes?: boolean
  /** The `nrv-*` id of the nerve's StructureRecord — ONE record, two views. */
  id: string
  name: string
  /** Registry region (PLAN.md §3.2) — the area toggle reads this. */
  region: Region
  /** Always 'nerve': the kind its own Systems-row toggle is keyed on. */
  kind: 'nerve'
  /** `TractRecord.direction` — a cranial nerve is efferent, afferent or mixed. */
  direction: 'ascending' | 'descending' | 'mixed'
  /** Fibre class (mirrors the StructureRecord's own `modality`). */
  modality: string
  /** Where the fibres come from, in one clause. */
  origin: string
  /** Where they end, in one clause. */
  target: string
  /** Crossing behaviour — a cranial nerve does not decussate at its own root,
   *  with CN IV the single exception, which the text states. */
  decussation: string
  /** Physiology, 1–3 sentences. */
  function: string
  /** The named skull-base opening this course traverses. */
  foramen: string
  /** The committed landmark the chain is anchored on ('' when none exists). */
  anchorId: string
  /** What stands behind the path — the honesty statement, per nerve. */
  anchorNote: string
  /** Catmull-Rom control points, canonical space: root → cistern → foramen → target. */
  waypoints: Vec3[]
  /** Mid-segment radius in au (PLAN.md §3.4: d_mm / 2.4). */
  tubeRadius: number
  /** The calibre in mm the radius was converted from. */
  calibreMm: number
  color: string
  levels?: string[]
  synonyms?: string[]
  /**
   * The nerve's OWN clinical items and references, carried by the course so
   * `NerveCourseRecord` is a complete superset of `TractRecord`: the record
   * still routes to `StructureDetails` in the InfoPanel — a course is never a
   * substitute for the nerve's function and clinical content — and these are
   * the same items the `nrv-*` StructureRecord already ships.
   */
  clinical: ClinicalItem[]
  refs: string[]
}

/**
 * The twelve courses — PLAN.md §3.3's anchor chains. Every exit landmark
 * appears as a LITERAL waypoint, so the anchor deviation is exactly 0.000 au
 * (the gate's tolerance is 2.0 au; a looser gate than the data would be the
 * weaker check).
 *
 * Radii are PLAN.md §3.4: cisternal-segment calibres in mm at 1 au = 1.2 mm,
 * r_au = d_mm / 2.4.
 */
const AUTHORED_NERVE_COURSES: readonly NerveCourseRecord[] = [
  {
    id: 'nrv-cn3-oculomotor',
    name: "CN III Oculomotor nerve",
    region: "midbrain",
    kind: 'nerve',
    direction: 'descending',
    modality: "General somatic efferent and preganglionic parasympathetic (general visceral efferent).",
    origin: "Oculomotor somatic motor and Edinger-Westphal preganglionic neurons, rostral midbrain",
    target: "Ipsilateral superior/medial/inferior recti, inferior oblique and levator; ciliary ganglion",
    decussation:
      "The peripheral nerve supplies its ipsilateral orbit. Within the nuclear system, superior-rectus fibers cross and central levator control is bilateral; this differs from the peripheral nerve course.",
    function:
      "Supplies medial, superior and inferior rectus, inferior oblique and levator palpebrae superioris. Superior/inferior recti are tested for elevation/depression with the eye abducted; inferior oblique elevates the adducted eye. Preganglionic parasympathetic fibers synapse in the ciliary ganglion; short ciliary nerves then supply sphincter pupillae and ciliary muscle. Pupil involvement varies by lesion.",
    foramen: "superior orbital fissure",
    anchorId: 'surf-cn3-exit',
    anchorNote:
      "Schematic teaching course: current control points and calibre are authored illustrations, not measured patient nerve anatomy or validated skull-base registration. ",
    waypoints: [
      [0, 14, -4],
      [4, 11, 1],
      [2, 9.5, 8.5],
      [9, 9, 16],
      [17, 8, 23],
      [24, 6, 27],
    ],
    tubeRadius: 1.25,
    clinical: [
  {
    "syndrome": "Oculomotor palsy",
    "findings": "Ptosis, diplopia and impaired adduction/elevation/depression may occur, with a down-and-out eye in a complete somatic palsy. Pupil constriction and accommodation may also be impaired. Pupil sparing does not exclude a compressive lesion such as an aneurysm."
  },
  {
    "syndrome": "Midbrain fascicular palsy",
    "findings": "An ipsilateral third-nerve palsy with contralateral weakness or ataxia suggests accompanying midbrain motor or crossed cerebellar-output involvement. Weber, Claude and Benedikt labels describe overlapping patterns rather than mandatory full syndromes."
  },
  {
    "syndrome": "Cavernous sinus and orbital disease",
    "findings": "Combined III/IV/VI and trigeminal deficits can arise from cavernous sinus or superior orbital fissure lesions. Pupil involvement is variable and cannot distinguish the site by itself."
  },
  {
    "syndrome": "Herniation or aneurysmal compression",
    "findings": "Acute third-nerve dysfunction can accompany posterior communicating aneurysm or transtentorial herniation. The clinical sequence is variable; a fixed pupil-first, palsy-second, weakness-third progression is not reliable."
  }
],
    refs: [
  "Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed. (2010), Ch. 13, ocular nerves, actions and pupillary pathways, printed pp. 568-580 (PDF pp. 594-606).",
  "Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed. (2010), Ch. 13, gaze and ocular motor palsies, printed pp. 585-592 (PDF pp. 611-618).",
  "Patel and Burdon, Isolated third cranial nerve palsies: modern management principles, Eye (2022), https://pmc.ncbi.nlm.nih.gov/articles/PMC8727561/ (pupil sparing does not exclude compression)."
],
    calibreMm: 3,
    color: '#14b8a6',
    levels: [
  "lvl-midbrain-sc",
  "lvl-pons-rostral",
  "lvl-thalamus-mid"
],
  },
  {
    id: 'nrv-cn4-trochlear',
    name: "CN IV Trochlear nerve",
    region: "midbrain",
    kind: 'nerve',
    direction: 'descending',
    modality: "General somatic efferent.",
    origin: "Trochlear motor nucleus at inferior colliculus level",
    target: "Ipsilateral superior oblique relative to the exiting nerve; contralateral to the nucleus",
    decussation:
      "Fibers cross in superior/anterior medullary velum before dorsal emergence. Pre-crossing nuclear/fascicular injury affects the opposite eye; post-crossing nerve injury the same side.",
    function:
      "Supplies superior oblique, which intorts the eye and depresses it most effectively when adducted, with an abducting component. The nucleus supplies the contralateral superior oblique because its fibers cross before dorsal emergence.",
    foramen: "superior orbital fissure",
    anchorId: 'surf-cn4-exit',
    anchorNote:
      "Schematic teaching course: current control points and calibre are authored illustrations, not measured patient nerve anatomy or validated skull-base registration. ",
    waypoints: [
      [0, 8, -5],
      [3, 8, -7],
      [1.5, 7.5, -8],
      [8, 8, -11],
      [16, 8, -10],
      [22, 7, -3],
      [23, 5, 8],
    ],
    tubeRadius: 0.42,
    clinical: [
  {
    "syndrome": "Superior oblique palsy",
    "findings": "Vertical/torsional diplopia and hypertropia may be more evident looking down with the eye adducted. Head tilt toward the affected side can worsen hypertropia and patients may compensate by tilting away. This pattern is helpful but not uniquely diagnostic; skew deviation and other ocular conditions can mimic it."
  },
  {
    "syndrome": "Nuclear, fascicular and peripheral injury",
    "findings": "A lesion of the nucleus or fibers before their decussation affects the contralateral superior oblique. A lesion after crossing affects the ipsilateral eye; a midline decussation lesion can affect both. Trauma, congenital disorders, microvascular disease and other causes can produce trochlear palsy."
  }
],
    refs: [
  "Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed. (2010), Ch. 13, ocular nerves, actions and pupillary pathways, printed pp. 568-580 (PDF pp. 594-606).",
  "Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed. (2010), Ch. 13, gaze and ocular motor palsies, printed pp. 585-592 (PDF pp. 611-618).",
  "Patel and Burdon, Isolated third cranial nerve palsies: modern management principles, Eye (2022), https://pmc.ncbi.nlm.nih.gov/articles/PMC8727561/ (pupil sparing does not exclude compression)."
],
    calibreMm: 1,
    color: '#14b8a6',
    levels: [
  "lvl-pons-rostral",
  "lvl-midbrain-ic"
],
  },
  {
    id: 'nrv-cn5-trigeminal',
    meshes: false, // Former route heads posteriorly towards an unvalidated ganglion target.
    name: "CN V Trigeminal nerve",
    region: "pons",
    kind: 'nerve',
    direction: 'mixed',
    modality: "General somatic afferent and branchial motor (special visceral efferent).",
    origin: "Trigeminal ganglion sensory neurons, mesencephalic proprioceptive neurons and pontine trigeminal motor nucleus",
    target:
      "Principal/spinal sensory nuclei and jaw-proprioceptive circuits; V3 motor muscles",
    decussation:
      "Primary nerve/root fibers do not cross. Many second-order trigeminothalamic projections cross in the brainstem; this is not a second crossing of primary fibers.",
    function:
      "Carries general sensation from much of the face, cornea, oral/nasal cavities, teeth and cranial dura. V3 motor fibers supply mastication, mylohyoid, anterior digastric, tensor tympani and tensor veli palatini. CN V supplies the afferent limb of the corneal blink reflex; CN VII supplies its motor limb.",
    foramen: "V1: superior orbital fissure; V2: foramen rotundum; V3: foramen ovale",
    anchorId: 'surf-cn5-exit',
    anchorNote:
      "Schematic teaching course: current control points and calibre are authored illustrations, not measured patient nerve anatomy or validated skull-base registration. ",
    waypoints: [
      [4, -8, 4],
      [10, -7, 3],
      [13, -6, 0],
      [16, -5, -2],
      [17.1, -4.8, -3.5],
      [21, -4, -9],
      [24, -3, -14],
    ],
    tubeRadius: 1.88,
    clinical: [
  {
    "syndrome": "Trigeminal sensory or motor dysfunction",
    "findings": "Lesions can impair sensation in one or more divisions and reduce the V1 afferent corneal reflex. Pterygoid weakness can cause the jaw to deviate toward the weak side on opening. Division patterns narrow localization but do not uniquely identify one foramen."
  },
  {
    "syndrome": "Trigeminal neuralgia",
    "findings": "Brief recurrent shock-like facial pain may be triggered by innocuous stimuli. Neurovascular compression is one recognized mechanism; secondary causes include demyelination or mass lesions. Sensory deficits prompt investigation but no age or examination rule proves a particular cause."
  },
  {
    "syndrome": "Brainstem sensory lesions",
    "findings": "Spinal trigeminal injury can cause ipsilateral facial pain-temperature loss together with contralateral body pain-temperature loss when adjacent ascending body pathways are involved. Concentric facial loss is possible but not obligatory."
  }
],
    refs: [
  "Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed. (2010), Ch. 12, trigeminal pathways and branches, printed pp. 508-512 (PDF pp. 534-538)."
],
    calibreMm: 4.5,
    color: '#14b8a6',
    levels: [
  "lvl-pons-middle",
  "lvl-midbrain-ic"
],
  },
  {
    id: 'nrv-cn6-abducens',
    name: "CN VI Abducens nerve",
    region: "pons",
    kind: 'nerve',
    direction: 'descending',
    modality: "General somatic efferent.",
    origin: "Caudal pontine abducens motor neurons",
    target: "Ipsilateral lateral rectus",
    decussation:
      "The nerve motor fibers are uncrossed. Crossed internuclear axons ascend in contralateral MLF and are separate CNS fibers, not part of CN VI.",
    function:
      "Supplies ipsilateral lateral rectus for eye abduction. Abducens internuclear neurons cross and ascend in the opposite MLF to the oculomotor nucleus; those axons are central gaze connections and are not carried in CN VI.",
    foramen: "superior orbital fissure",
    anchorId: 'surf-cn6-exit',
    anchorNote:
      "Schematic teaching course: current control points and calibre are authored illustrations, not measured patient nerve anatomy or validated skull-base registration. ",
    waypoints: [
      [1.5, -18, -4],
      [3, -21, 0],
      [2.5, -24, 7.5],
      [4, -20, 13],
      [7, -14, 11],
      [11, -8, 11],
      [16, 0, 12],
      [22, 5, 11],
    ],
    tubeRadius: 0.79,
    clinical: [
  {
    "syndrome": "Abducens nerve palsy",
    "findings": "Impaired abduction produces horizontal diplopia, often greater toward the weak side. Nuclear injury instead usually impairs conjugate gaze toward that side because motor and internuclear neurons are affected."
  },
  {
    "syndrome": "Raised intracranial pressure or local injury",
    "findings": "The long intracranial course can be affected by raised pressure as a false-localizing sign, skull-base disease, cavernous sinus lesions, trauma or microvascular disease. Laterality and recovery are variable."
  }
],
    refs: [
  "Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed. (2010), Ch. 13, ocular nerves, actions and pupillary pathways, printed pp. 568-580 (PDF pp. 594-606).",
  "Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed. (2010), Ch. 13, gaze and ocular motor palsies, printed pp. 585-592 (PDF pp. 611-618).",
  "Patel and Burdon, Isolated third cranial nerve palsies: modern management principles, Eye (2022), https://pmc.ncbi.nlm.nih.gov/articles/PMC8727561/ (pupil sparing does not exclude compression)."
],
    calibreMm: 1.9,
    color: '#14b8a6',
    levels: [
  "lvl-pons-caudal",
  "lvl-pontomedullary"
],
  },
  {
    id: 'nrv-cn7-facial',
    name: "CN VII Facial nerve",
    region: "pons",
    kind: 'nerve',
    direction: 'mixed',
    modality:
      "Branchial motor, preganglionic parasympathetic, taste (special visceral afferent), and a small general sensory component.",
    origin:
      "Facial motor/superior salivatory nuclei and geniculate sensory ganglion",
    target:
      "Facial-expression/second-arch muscles; pterygopalatine/submandibular ganglia; solitary/spinal trigeminal sensory nuclei",
    decussation:
      "Nerve motor fibers supply the same-side face. Bilateral-upper/contralateral-dominant-lower cortical drive is central input, not a peripheral root crossing.",
    function:
      "Supplies facial-expression muscles, stapedius, posterior digastric and stylohyoid; conveys anterior-two-thirds tongue taste; provides parasympathetic supply to lacrimal/nasal/palatal glands through pterygopalatine ganglion and submandibular/sublingual glands through submandibular ganglion. Passing through the parotid does not give it parotid secretomotor function.",
    foramen: "internal acoustic meatus into facial canal; stylomastoid foramen motor exit",
    anchorId: 'surf-cn7-exit',
    anchorNote:
      "Schematic teaching course: current control points and calibre are authored illustrations, not measured patient nerve anatomy or validated skull-base registration. ",
    waypoints: [
      [4, -19, -2],
      [6.5, -23, -3],
      [12, -22, -8],
      [22, -20, -15],
      [26, -17, -10],
      [27, -13, 0],
      [27, -12, -2],
      [26, -11, -10],
    ],
    tubeRadius: 0.79,
    clinical: [
  {
    "syndrome": "Lower motor neuron facial weakness",
    "findings": "Nuclear, fascicular or peripheral motor injury can weaken the entire ipsilateral face, including forehead and eye closure. More proximal lesions may add hyperacusis, taste or secretomotor changes; these are not universal."
  },
  {
    "syndrome": "Supranuclear versus nuclear/peripheral pattern",
    "findings": "Unilateral supranuclear lesions often predominantly affect the contralateral lower face because upper facial input is more bilateral. Forehead sparing is a useful relative pattern, not an absolute rule. A pontine lesion can produce a peripheral-pattern palsy with other brainstem signs."
  },
  {
    "syndrome": "Facial palsy differential",
    "findings": "Bell palsy, infection, inflammatory disease, tumor and traumatic injury are among possible peripheral causes. A facial-weakness pattern alone does not establish Bell palsy."
  }
],
    refs: [
  "Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed. (2010), Ch. 12, facial nerve and taste, printed pp. 513-518 (PDF pp. 539-544)."
],
    calibreMm: 1.9,
    color: '#14b8a6',
    levels: [
  "lvl-pons-caudal",
  "lvl-pontomedullary"
],
  },
  {
    id: 'nrv-cn8-vestibulocochlear',
    name: "CN VIII Vestibulocochlear nerve",
    region: "pons",
    kind: 'nerve',
    direction: 'ascending',
    modality: "Special somatic afferent; small peripheral auditory/vestibular efferent components also exist.",
    origin: "Spiral and vestibular (Scarpa) ganglion primary sensory neurons",
    target:
      "Cochlear nuclei, vestibular nuclei and direct cerebellar vestibular targets",
    decussation:
      "Peripheral sensory roots remain ipsilateral. Crossings/bilateral representation arise in downstream central auditory/vestibular networks; small brainstem efferents also reach inner ear.",
    function:
      "Cochlear fibers transmit sound information to cochlear nuclei. Vestibular fibers carry head-motion/position signals to vestibular nuclei and directly to cerebellar circuitry, supporting balance and vestibulo-ocular reflexes. The downstream ocular motor or spinal output of those reflexes is carried by other pathways.",
    foramen: "internal acoustic meatus",
    anchorId: 'surf-cn8-exit',
    anchorNote:
      "Schematic teaching course: current control points and calibre are authored illustrations, not measured patient nerve anatomy or validated skull-base registration. ",
    waypoints: [
      [3.5, -14, -5.5],
      [6, -19, -4.5],
      [6.8, -22, -4.5],
      [12, -21, -9],
      [22, -19, -16],
      [26, -16, -10],
      [29, -15, -2],
      [29, -14, 2],
    ],
    tubeRadius: 1.17,
    clinical: [
  {
    "syndrome": "Auditory or vestibular dysfunction",
    "findings": "Peripheral cochlear/nerve injury can cause ipsilateral sensorineural hearing loss, tinnitus or imbalance; vestibular injury can cause vertigo and nystagmus. Central and peripheral patterns overlap and the symptoms do not establish one site on their own."
  },
  {
    "syndrome": "Cerebellopontine angle disease",
    "findings": "Vestibular schwannoma and other masses may affect hearing/balance and, with extension, adjacent nerves or brainstem. Hearing loss need not be the first or only finding."
  },
  {
    "syndrome": "Vascular and inflammatory differential",
    "findings": "AICA/labyrinthine ischemia can mimic peripheral vestibular illness, sometimes with hearing loss. Acute vestibular examination requires the appropriate clinical setting and expertise; an atlas pattern is insufficient to exclude stroke."
  }
],
    refs: [
  "Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed. (2010), Ch. 12, auditory and vestibular pathways, printed pp. 518-529 (PDF pp. 544-555).",
  "Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed. (2010), Ch. 14, vertebrobasilar anatomy and lateral pontine syndrome, printed pp. 651-656 (PDF pp. 677-682)."
],
    calibreMm: 2.8,
    color: '#14b8a6',
    levels: [
  "lvl-pons-caudal",
  "lvl-pontomedullary"
],
  },
  {
    id: 'nrv-cn9-glossopharyngeal',
    name: "CN IX Glossopharyngeal nerve",
    region: "medulla",
    kind: 'nerve',
    direction: 'mixed',
    modality:
      "Branchial motor, preganglionic parasympathetic, taste, visceral afferent and general sensory.",
    origin: "Superior/inferior IX sensory ganglia; ambiguus branchiomotor and inferior salivatory parasympathetic neurons",
    target:
      "Stylopharyngeus, otic ganglion/parotid; solitary and spinal trigeminal sensory nuclei",
    decussation:
      "No obligatory crossing of the peripheral nerve; bilateral reflex and supranuclear control occurs centrally.",
    function:
      "Supplies stylopharyngeus; conveys posterior-third tongue taste and pharyngeal general sensation; carries carotid sinus/body sensory input. Inferior salivatory axons reach the otic ganglion via tympanic and lesser petrosal routes, then the parotid through auriculotemporal nerve. CN IX commonly supplies a gag-reflex afferent limb, with vagal motor output.",
    foramen: "jugular foramen",
    anchorId: 'surf-cn9-exit',
    anchorNote:
      "Schematic teaching course: current control points and calibre are authored illustrations, not measured patient nerve anatomy or validated skull-base registration. ",
    waypoints: [
      [3.5, -31, -4],
      [6, -31, 0.5],
      [11, -30, 4],
      [18, -28, 1],
      [21, -26, -3],
      [24, -23, 3],
      [25, -21, 8],
    ],
    tubeRadius: 0.83,
    clinical: [
  {
    "syndrome": "Glossopharyngeal dysfunction",
    "findings": "Posterior tongue/pharyngeal sensory or taste loss and impaired gag afference may occur. Gag responses vary normally and their absence alone does not establish a IX lesion. Combined IX/X lesions can impair swallowing."
  },
  {
    "syndrome": "Glossopharyngeal neuralgia",
    "findings": "Brief severe pain in throat, posterior tongue or ear may be triggered by swallowing or talking. Occasionally vagal cardioinhibitory reflexes accompany attacks; this is not the expected consequence of simply losing IX sensory input."
  },
  {
    "syndrome": "Jugular foramen lesions",
    "findings": "Mass, inflammation or vascular injury near the jugular foramen may combine IX/X/XI deficits. The pattern suggests a region but does not establish one cause."
  }
],
    refs: [
  "Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed. (2010), Ch. 12, CN IX-XII, printed pp. 530-535 (PDF pp. 556-561)."
],
    calibreMm: 2,
    color: '#14b8a6',
    levels: [
  "lvl-olivary",
  "lvl-pontomedullary"
],
  },
  {
    id: 'nrv-cn10-vagus',
    name: "CN X Vagus nerve",
    region: "medulla",
    kind: 'nerve',
    direction: 'mixed',
    modality:
      "Branchial motor, preganglionic parasympathetic, visceral afferent, taste and small general sensory components.",
    origin: "Superior/inferior vagal sensory ganglia; ambiguus branchiomotor/cardiac neurons and DMV visceral parasympathetic neurons",
    target:
      "Palatal/pharyngeal/laryngeal muscles, thoracoabdominal ganglia and solitary/spinal trigeminal sensory nuclei",
    decussation:
      "Peripheral root axons are not an obligatory crossed pathway; central reflex and motor control is bilateral/distributed.",
    function:
      "Motor supply to palate except tensor veli palatini, pharynx except stylopharyngeus, and larynx; external superior laryngeal supplies cricothyroid while recurrent laryngeal supplies other intrinsic laryngeal muscles. Visceral afferents reach solitary nucleus and parasympathetic axons regulate thoracoabdominal organs. Cardiac vagal neurons include an important ambiguus source; DMV contributes particularly to abdominal visceral control. The auricular sensory branch is Arnold nerve.",
    foramen: "jugular foramen",
    anchorId: 'surf-cn10-exit',
    anchorNote:
      "Schematic teaching course: current control points and calibre are authored illustrations, not measured patient nerve anatomy or validated skull-base registration. ",
    waypoints: [
      [2, -32, -7],
      [4, -33, -1],
      [6, -34, 0.5],
      [12, -33, 3],
      [19, -31, 1],
      [22, -29, -3],
      [24, -27, 2],
      [24, -25, 8],
    ],
    tubeRadius: 1.0,
    clinical: [
  {
    "syndrome": "Vagal motor dysfunction",
    "findings": "Unilateral palatal and vocal-fold weakness can cause hoarseness, dysphagia and aspiration; the palate may sag ipsilaterally and uvula deviate away from the weak side. Severity and gag responses vary."
  },
  {
    "syndrome": "Recurrent versus superior laryngeal injury",
    "findings": "Recurrent laryngeal injury can impair vocal-fold movement. External superior laryngeal/cricothyroid injury particularly impairs pitch modulation. Surgery or lesions along neck/chest courses can affect these branches."
  },
  {
    "syndrome": "Autonomic/reflex dysfunction",
    "findings": "Vagal network injury can disturb cardiovascular and gastrointestinal regulation. Bradycardia from increased vagal activity is not equivalent to loss of parasympathetic neurons, which should not be presented as causing inevitable bradycardia/asystole."
  }
],
    refs: [
  "Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed. (2010), Ch. 12, CN IX-XII, printed pp. 530-535 (PDF pp. 556-561)."
],
    calibreMm: 2.4,
    color: '#14b8a6',
    levels: [
  "lvl-olivary",
  "lvl-pontomedullary"
],
  },
  {
    id: 'nrv-cn11-accessory',
    name: "CN XI Accessory nerve",
    region: "medulla",
    kind: 'nerve',
    direction: 'descending',
    modality: "Motor to sternocleidomastoid and trapezius (spinal accessory component).",
    origin:
      "Spinal accessory motor neurons approximately C1-C5/6; historical cranial XI is functionally vagal",
    target: "Ipsilateral sternocleidomastoid and trapezius",
    decussation:
      "Spinal accessory peripheral motor fibers supply the ipsilateral muscles; cortical control is separate and is not a root decussation.",
    function:
      "Supports head turning through sternocleidomastoid and shoulder elevation/scapular movement through trapezius. The spinal nerve is distinct from vagal branchiomotor supply to palate/pharynx/larynx.",
    foramen: "foramen magnum entry; jugular foramen exit",
    anchorId: 'surf-cn11-exit',
    anchorNote:
      "Schematic teaching course: current control points and calibre are authored illustrations, not measured patient nerve anatomy or validated skull-base registration. ",
    waypoints: [
      [3.5, -31, -4],
      [5, -36, 2],
      [6, -43, 2],
      [10, -39, 1],
      [17, -35, -1],
      [21, -31, -2],
      [24, -28, 3],
      [26, -26, 10],
    ],
    tubeRadius: 0.63,
    clinical: [
  {
    "syndrome": "Spinal accessory neuropathy",
    "findings": "Trapezius weakness can cause shoulder droop, impaired shrug and scapular dysfunction; sternocleidomastoid weakness impairs turning the head away from the weak muscle side. Deficits depend on lesion position. Posterior-triangle surgery/trauma is a recognized cause."
  },
  {
    "syndrome": "Jugular foramen versus cervical injury",
    "findings": "Combined IX/X/XI deficits suggest a skull-base region; isolated trapezius weakness can occur farther along the spinal accessory course. No single vascular cause is implied by the pattern."
  }
],
    refs: [
  "Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed. (2010), Ch. 12, CN IX-XII, printed pp. 530-535 (PDF pp. 556-561)."
],
    calibreMm: 1.5,
    color: '#14b8a6',
    levels: [
  "lvl-olivary",
  "lvl-spinal-medulla"
],
  },
  {
    id: 'nrv-cn12-hypoglossal',
    name: "CN XII Hypoglossal nerve",
    region: "medulla",
    kind: 'nerve',
    direction: 'descending',
    modality: "General somatic efferent.",
    origin: "Hypoglossal motor nucleus, medulla",
    target: "Ipsilateral intrinsic/extrinsic tongue muscles except palatoglossus; accompanying C1 fibers have separate spinal targets",
    decussation:
      "Motor root fibers supply the ipsilateral tongue. Contralateral-dominant supranuclear genioglossus control is a central pathway, not crossing within the nerve.",
    function:
      "Supplies intrinsic and extrinsic tongue muscles except palatoglossus (vagus). C1 fibers traveling with XII reach geniohyoid and thyrohyoid and contribute to ansa cervicalis; these are spinal fibers, not axons arising from the hypoglossal nucleus.",
    foramen: "hypoglossal canal",
    anchorId: 'surf-cn12-exit',
    anchorNote:
      "Schematic teaching course: current control points and calibre are authored illustrations, not measured patient nerve anatomy or validated skull-base registration. ",
    waypoints: [
      [0, -31, -4],
      [2, -31, 0],
      [3.5, -32, 6.5],
      [7, -35, 12],
      [10, -37, 11],
      [15, -39, 14],
      [21, -42, 18],
    ],
    tubeRadius: 0.75,
    clinical: [
  {
    "syndrome": "Lower motor neuron tongue weakness",
    "findings": "Nuclear, fascicular or nerve injury can weaken the ipsilateral tongue, which tends to deviate toward the weak side on protrusion. Atrophy and fasciculations may develop with lower motor neuron disease or chronic denervation."
  },
  {
    "syndrome": "Supranuclear and combined lesions",
    "findings": "A unilateral supranuclear lesion often weakens the contralateral tongue, with protrusion toward the weak side. Medial medullary lesions can combine ipsilateral XII weakness and contralateral limb weakness/sensory deficits. Neck/skull-base causes require localization along the nerve rather than one assumed artery."
  }
],
    refs: [
  "Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed. (2010), Ch. 12, CN IX-XII, printed pp. 530-535 (PDF pp. 556-561)."
],
    calibreMm: 1.8,
    color: '#14b8a6',
    levels: [
  "lvl-olivary",
  "lvl-pontomedullary"
],
  },
  {
    id: 'nrv-cn1-olfactory',
    name: "CN I Olfactory nerve",
    region: "telencephalon",
    kind: 'nerve',
    direction: 'ascending',
    modality: "Special sensory: olfaction; often classified as special visceral afferent in traditional cranial-nerve schemes",
    origin: "Olfactory receptor neurons in superior nasal neuroepithelium",
    target: "Olfactory bulb glomeruli: first synapse on mitral/tufted cells; CNS bulb output continues in olfactory tract",
    decussation:
      "Fila project to the ipsilateral bulb without a nerve decussation. Central olfactory pathways have interhemispheric/commissural connections; these do not make CN I itself a crossed tract.",
    function:
      "CN I consists of primary olfactory receptor-neuron axons (olfactory fila) from the superior nasal neuroepithelium to the bulb. Mitral/tufted cells then project in the CNS olfactory tract to primary olfactory regions without a compulsory initial thalamic relay. Olfaction contributes to flavor and emotional/memory networks, but it is distinct from gustatory taste.",
    foramen: 'cribriform plate',
    anchorId: '',
    anchorNote:
      "Schematic teaching course: current control points and calibre are authored illustrations, not measured patient nerve anatomy or validated skull-base registration. ",
    waypoints: [
      [11, 9, 66],
      [10, 10, 60],
      [9, 11, 54],
      [8.5, 11.5, 52],
      [8, 12, 48],
    ],
    tubeRadius: 0.71,
    clinical: [
  {
    "syndrome": "Anosmia/hyposmia",
    "findings": "May follow nasal obstruction/inflammation, viral injury, trauma, intracranial disease or neurodegeneration; reduced smell alone does not establish one neurological diagnosis."
  },
  {
    "syndrome": "Traumatic olfactory injury",
    "findings": "Shearing of fila at the cribriform plate or injury of bulb/tract can impair smell; degree of recovery varies."
  },
  {
    "syndrome": "Foster Kennedy pattern",
    "findings": "A large anterior cranial-fossa lesion can cause ipsilateral optic atrophy and contralateral papilledema, sometimes with anosmia; the full pattern is uncommon."
  }
],
    refs: [
  "Blumenfeld, 2nd ed., pp. 505-506 and 827-828 (PDF pp. 531-532 and 853-854), Figures 18.5-18.6",
  "Blumenfeld, 2nd ed., pp. 395-402 (PDF pp. 421-428), Figures 10.4-10.9; territories and collaterals vary"
],
    calibreMm: 1.7,
    color: '#14b8a6',
    levels: [
  "lvl-thalamus-rostral",
  "lvl-tel-basal-ganglia"
],
  },
  {
    id: 'nrv-cn2-optic',
    name: "CN II Optic nerve",
    region: "telencephalon",
    kind: 'nerve',
    direction: 'ascending',
    modality: "Special somatic afferent: vision/reflex retinal output from the ipsilateral eye before partial chiasmal crossing",
    origin: "Retinal ganglion cells of the ipsilateral eye",
    target: "Optic chiasm and central continuation into optic tracts; no synapse within chiasm",
    decussation:
      "No crossing within optic nerve. Nasal retinal fibres cross at the chiasm while temporal retinal fibres stay ipsilateral. Each postchiasmal tract represents the opposite binocular visual hemifield.",
    function:
      "CN II conveys retinal ganglion-cell output from one eye through the optic canal to the chiasm. The optic nerve is a CNS tract by development and myelination, conventionally named a cranial nerve. Its retinal axons contribute to visual, pupillary and circadian pathways after their central continuation.",
    foramen: 'optic canal',
    anchorId: 'tract-optic-nerve',
    anchorNote:
      "Schematic teaching course: current control points and calibre are authored illustrations, not measured patient nerve anatomy or validated skull-base registration. ",
    waypoints: [
      [26, 16, 57],
      [18, 18, 45],
      [12, 19, 36],
      [11, 19, 33],
      [2, 23.5, 23.5],
    ],
    tubeRadius: 1.67,
    clinical: [
  {
    "syndrome": "Optic neuropathy",
    "findings": "Inflammatory, ischemic, compressive or traumatic injury can cause monocular visual loss, color/field abnormalities and asymmetric afferent pupillary responses; prognosis and pain vary."
  },
  {
    "syndrome": "Papilledema",
    "findings": "Raised intracranial pressure can produce optic-disc swelling through the meningeal sheath; not every swollen disc is papilledema."
  },
  {
    "syndrome": "Retinal versus optic-nerve ischemia",
    "findings": "Central retinal artery occlusion primarily injures inner retina; posterior ciliary ischemia can injure optic-nerve head. These are distinct anterior visual-pathway sites."
  }
],
    refs: [
  "Blumenfeld, 2nd ed., pp. 465-475 and 914-915 (PDF pp. 491-501 and 940-941), Figures 11.8-11.15",
  "Blumenfeld, 2nd ed., p. 506 (PDF p. 532), cranial nerve II",
  "Blumenfeld, 2nd ed., pp. 395-402 (PDF pp. 421-428), Figures 10.4-10.9; territories and collaterals vary"
],
    calibreMm: 4,
    color: '#14b8a6',
    levels: [
  "lvl-thalamus-rostral"
],
  },
]

/** The twelve course ids, in declaration (and draw) order. */
export const NERVE_COURSES: readonly NerveCourseRecord[] = AUTHORED_NERVE_COURSES.filter(course => course.meshes !== false)

export const NERVE_COURSE_IDS: readonly string[] = NERVE_COURSES.map((course) => course.id)

/** One course by id — the lookup the 3D pass and the section registry share. */
export function nerveCourseById(id: string): NerveCourseRecord | undefined {
  return NERVE_COURSES.find((course) => course.id === id)
}

/**
 * Whether a StructureRecord id has a course in this table — i.e. whether the
 * ordinary structure pass must stop drawing its schematic placement ellipsoid.
 * One record, one body: a nerve that gained a course must not also keep a blob.
 *
 * A Set rather than a `.find` because `SceneLayers` asks this once per registry
 * record per render — 248 registry ids against 12 courses.
 */
const COURSE_IDS: ReadonlySet<string> = new Set(NERVE_COURSE_IDS)

export function hasNerveCourse(id: string): boolean {
  return COURSE_IDS.has(id)
}
