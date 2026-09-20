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
export const NERVE_COURSES: readonly NerveCourseRecord[] = [
  {
    id: 'nrv-cn3-oculomotor',
    name: 'CN III Oculomotor nerve',
    region: 'midbrain',
    kind: 'nerve',
    direction: 'descending',
    modality: 'General somatic efferent + general visceral efferent (parasympathetic)',
    origin: 'Oculomotor nucleus and Edinger-Westphal nucleus, midbrain tegmentum',
    target: 'Superior, medial and inferior recti, inferior oblique, levator palpebrae; ciliary ganglion',
    decussation:
      'No crossing at its own root: each nerve supplies the ipsilateral orbit. Its cortical control is crossed — each frontal eye field drives the contralateral gaze centre.',
    function:
      'The principal motor nerve of the eye: it innervates the medial rectus (adduction), the superior and inferior recti (elevation and depression in adduction), the inferior oblique (elevation in abduction with extorsion) and the levator palpebrae superioris (eyelid opening), and it supplies the parasympathetic fibres that constrict the pupil and accommodate the lens. Its Edinger-Westphal fibres synapse in the ciliary ganglion and reach the sphincter pupillae and ciliary muscle, which is why a lesion produces mydriasis and loss of accommodation as well as diplopia and ptosis.',
    foramen: 'superior orbital fissure',
    anchorId: 'surf-cn3-exit',
    anchorNote:
      'The body is an AUTHORED PATH — root (nuc-oculomotor) to cistern to superior orbital fissure to orbit — not a segmented scan. It is anchored on the committed nucleus origin3d (nuc-oculomotor, midbrain) and on the committed surface landmark surf-cn3-exit, which is waypoint 3 of 6; the orbital target is authored from anatomy, because no orbit or skull-base mesh is committed. 3.0 mm calibre at 1 au = 1.2 mm gives tubeRadius 1.25 au.',
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
        syndrome: 'Complete oculomotor palsy — "down and out" with ptosis and mydriasis',
        findings: 'Ptosis from levator failure, a dilated unreactive pupil from sphincter paralysis, and an eye that rests down and out (unopposed lateral rectus and superior oblique) with impaired adduction, elevation and depression: the patient has diplopia in all directions except outward gaze, and the ptosis may hide it. The palsy localizes to this nerve anywhere along its course, and the FIRST question is whether the pupil is involved, because a pupil-involving palsy is compressive (aneurysm, uncal herniation, tumour) and a pupil-sparing palsy in a vasculopath is usually ischaemic.',
        vascular: 'Posterior communicating artery aneurysm (internal carotid) or diabetic microvascular ischaemia of the vasa nervorum',
        note: 'The pupillomotor fibres are the most superficial in the cisternal nerve, where the posterior communicating artery crosses it — that arrangement, not the size of the lesion, is why compression dilates the pupil early.',
      },
      {
        syndrome: 'Weber syndrome (syn-weber) — fascicular CN III palsy with contralateral hemiparesis',
        findings: 'A midbrain lesion of the fascicles as they cross the crus cerebri produces ipsilateral oculomotor palsy with a contralateral hemiparesis (corticospinal fibres): the palsy and the weakness are on opposite sides, which is what identifies the lesion as fascicular rather than at the nerve\'s exit.',
        vascular: 'Paramedian branches of the posterior cerebral artery, or a small midbrain haemorrhage/infarct',
        note: 'The pupil may or may not be involved depending on whether the Edinger-Westphal fibres are caught; the crossed hemiparesis, not the pupil, is the localizing sign.',
      },
      {
        syndrome: 'Benedikt, Claude and Nothnagel syndromes (syn-benedikt, syn-claude, syn-nothnagel)',
        findings: 'Fascicular CN III palsy with a contralateral tremor and extrapyramidal rigidity is Benedikt (red nucleus and cerebellothalamic fibres); with contralateral ataxia and no weakness is Claude (red nucleus, superior cerebellar peduncle); and with ipsilateral cerebellar ataxia of the limbs plus contralateral hemianesthesia is Nothnagel (tectum and quadrigeminal region). All three share the oculomotor palsy and separate by the adjacent structure the lesion has taken.',
        vascular: 'Posterior cerebral artery perforators and the superior cerebellar artery territory',
        note: 'These are the named midbrain syndromes that make a fascicular third-nerve palsy a localizing sign rather than a nerve sign.',
      },
      {
        syndrome: 'Uncal herniation with a blown pupil',
        findings: 'Expanding supratentorial mass shifts the uncus over the tentorial edge and stretches the cisternal oculomotor nerve against the posterior clinoid and the petroclinoid ligament: the first sign is an ipsilateral dilated pupil that reacts poorly (the superficial pupillomotor fibres fail first), then a complete palsy of the nerve with ptosis and a down-and-out eye, then contralateral hemiparesis from peduncular compression. It is a neurosurgical emergency and the pupil is the earliest reliable sign.',
        vascular: 'Compressive (mass effect); the posterior cerebral artery can also be occluded at the same time, adding an occipital infarct',
        note: 'Pupil first, then palsy, then weakness — the pupil\'s early involvement is the anatomical consequence of the fibre arrangement in the nerve.',
      },
      {
        syndrome: 'Cavernous-sinus syndrome with combined ophthalmoplegia',
        findings: 'A lesion of the cavernous sinus (aneurysm, meningioma, pituitary apoplexy, thrombosis, Tolosa-Hunt) adds CN IV, CN V1 and CN V2 involvement to the CN III palsy, often with proptosis and chemosis, and characteristically spares the pupil or involves it later; the combination of a third-nerve palsy with facial pain in the V1 distribution is the localizing clue to the sinus rather than the orbit or the cistern.',
        vascular: 'Internal carotid artery (vasc-internal-carotid-artery) aneurysm, carotid-cavernous fistula, or meningohypophyseal-trunk supply to the nerve',
      },
    ],
    refs: [
      'Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed., Ch. "Brainstem II: Eye Movements and Pupillary Control"',
      'Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed., Ch. "Brainstem III: Internal Structures and Vascular Supply"',
      'Midbrain, Pons, and Medulla: Anatomy and Syndromes, RadioGraphics 2019 (doi 10.1148/rg.2019180126)',
    ],
    calibreMm: 3,
    color: '#14b8a6',
    levels: ['lvl-midbrain-sc', 'lvl-pons-rostral', 'lvl-thalamus-mid'],
  },
  {
    id: 'nrv-cn4-trochlear',
    name: 'CN IV Trochlear nerve',
    region: 'midbrain',
    kind: 'nerve',
    direction: 'descending',
    modality: 'General somatic efferent',
    origin: 'Trochlear nucleus, caudal midbrain tegmentum at the level of the inferior colliculus',
    target: 'Contralateral superior oblique',
    decussation:
      'The ONLY cranial nerve that decussates completely at its own root, and the only one to leave the brainstem dorsally: the fibres cross in the anterior medullary velum, so the left nucleus supplies the right superior oblique.',
    function:
      'Innervates the superior oblique, which depresses the eye in adduction and intorts it in abduction. Because the nerve is long, thin and crosses before exiting, a lesion produces vertical diplopia that is worst on downward gaze and on head tilt toward the affected side (Bielschowsky), and the crossed root makes an isolated nuclear lesion palsy the CONTRALATERAL eye.',
    foramen: 'superior orbital fissure',
    anchorId: 'surf-cn4-exit',
    anchorNote:
      'The body is an AUTHORED PATH — nuc-trochlear to dorsal exit to around the midbrain to superior orbital fissure to superior oblique — not a segmented scan. It is anchored on the committed nucleus origin3d (nuc-trochlear) and on the committed landmark surf-cn4-exit (waypoint 3 of 7); the long cisternal course around the cerebral peduncle and the orbital target are authored from anatomy. 1.0 mm calibre, the thinnest cranial nerve, at 1 au = 1.2 mm gives tubeRadius 0.42 au.',
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
        syndrome: 'Trochlear (superior oblique) palsy — vertical diplopia with a head tilt',
        findings: 'Failure to depress the adducted eye produces vertical diplopia that is worst on downward gaze and on the side of the lesion\'s field; the patient tilts the head AWAY from the affected side to fuse (Bielschowsky head-tilt test: the hypertropia worsens when the head is tilted toward the affected side). A long-standing palsy produces a compensatory facial asymmetry and neck tilt that can be mistaken for a congenital torticollis.',
        vascular: 'Microvascular ischaemia of the vasa nervorum (diabetes, hypertension) is the commonest cause of an isolated palsy; compression by the superior cerebellar artery is the commonest cause of a chronic one',
        note: 'The head tilt is the diagnostic sign and its direction distinguishes a trochlear palsy from a skew deviation, which is a brainstem sign rather than a nerve sign.',
      },
      {
        syndrome: 'Post-traumatic trochlear palsy',
        findings: 'Closed head injury — even a modest one — tears the thin cisternal nerve against the tentorial edge or the petroclinoid ligament, because its long course around the midbrain is unprotected; the palsy may be bilateral after severe trauma, and it is the commonest traumatic ocular motor palsy in some series.',
        note: 'Mechanical; the nerve\'s dorsal exit and long cisternal course are the anatomical reason it, and not CN III or VI, is the nerve most often torn in head injury',
      },
      {
        syndrome: 'Nuclear versus fascicular trochlear palsy (crossed palsy)',
        findings: 'A lesion of the trochlear NUCLEUS (or of the decussating fibres in the anterior medullary velum) paralyses the superior oblique of the opposite eye — a crossed palsy that also involves the contralateral superior oblique in a bilateral nuclear lesion; a lesion of the fascicle or the cisternal nerve paralyses the ipsilateral muscle. The distinction localizes the damage inside the midbrain rather than outside it, and it is the only cranial nerve for which the rule is inverted.',
        vascular: 'Dorsal midbrain infarct or haemorrhage (posterior cerebral artery perforators)',
        note: 'A nuclear lesion never occurs alone in practice: look for an associated internuclear ophthalmoplegia, Horner syndrome or ataxia of the adjacent structures.',
      },
      {
        syndrome: 'Trochlear palsy in the cavernous sinus and orbit',
        findings: 'In the sinus or the orbital apex the nerve is part of a combined ophthalmoplegia with CN III, CN V1/V2 and CN VI, often with proptosis and periorbital pain; the palsy is then not localizing on its own. A tumour of the superior orbital fissure can produce an isolated trochlear palsy with orbital pain before any other sign.',
        vascular: 'Internal carotid artery aneurysm or carotid-cavernous fistula in the sinus; superior orbital fissure syndrome',
      },
    ],
    refs: [
      'Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed., Ch. "Brainstem II: Eye Movements and Pupillary Control"',
      'Blumenfeld, Neuroanatomy through Clinical Cases, 3rd ed., Ch. \'Brainstem I: Surface Anatomy and Cranial Nerves\'',
      'Fix, High-Yield Neuroanatomy, Ch. "Brainstem and Cranial Nerves"',
    ],
    calibreMm: 1,
    color: '#14b8a6',
    levels: ['lvl-pons-rostral', 'lvl-midbrain-ic'],
  },
  {
    id: 'nrv-cn5-trigeminal',
    name: 'CN V Trigeminal nerve',
    region: 'pons',
    kind: 'nerve',
    direction: 'mixed',
    modality: 'General somatic afferent (V1/V2/V3) + branchial motor (V3)',
    origin: 'Trigeminal motor nucleus and the principal and spinal trigeminal sensory nuclei, mid-pons',
    target:
      'Face and anterior scalp (sensory); muscles of mastication, tensor tympani, tensor veli palatini, anterior digastric and mylohyoid (motor)',
    decussation:
      'No crossing at the root — each root is ipsilateral. The sensory fibres cross a second time in the trigeminothalamic pathway; the motor root is uncrossed.',
    function:
      'The great sensory nerve of the face: it carries touch, pain, temperature and proprioception from the face, teeth, oral and nasal mucosae, dura and the anterior scalp through the trigeminal ganglion, whose central processes end in the principal sensory and spinal trigeminal nuclei. Its small motor root innervates the muscles of mastication. A lesion at the root causes loss of the corneal reflex and of facial sensation in its division territories; motor-root weakness shows as deviation of the jaw toward the weak side.',
    foramen: 'foramen ovale',
    anchorId: 'surf-cn5-exit',
    anchorNote:
      "The body is an AUTHORED PATH — nuc-trigeminal-motor and the principal sensory nucleus to the lateral mid-pons root to the trigeminal ganglion to the foramen ovale to the masticator space — not a segmented scan. It is anchored on the committed nucleus origin3d (nuc-trigeminal-motor) and the committed landmark surf-cn5-exit (waypoint 5 of 7). No skull-base mesh is committed, so the ganglion at the petrous apex and the foramen ovale exit are authored from anatomy; V1 (superior orbital fissure) and V2 (foramen rotundum) leave the same root and are named in this record's own course text. 4.5 mm calibre at 1 au = 1.2 mm gives tubeRadius 1.88 au.",
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
        syndrome: 'Trigeminal neuralgia (tic douloureux)',
        findings: 'Paroxysmal, electric-shock-like unilateral facial pain in one or more divisions (V2 and V3 most often), triggered by chewing, brushing the teeth, a cold wind or touching a trigger zone, with a completely normal neurological examination between attacks. It is a disease of the root entry zone: in most cases an elongated superior cerebellar artery loops against the nerve, and in a younger patient or with sensory loss it means a demyelinating plaque, a tumour of the cerebellopontine angle or Meckel\'s cave, or a vascular malformation.',
        vascular: 'Superior cerebellar artery (or AICA, or a dolichoectatic basilar artery) compressing the trigeminal root entry zone; the microvascular-decompression operation is the anatomical treatment',
        note: 'Sensory loss ON the same side as the pain, or a corneal reflex reduction, means the pain is secondary (a lesion), not idiopathic trigeminal neuralgia.',
      },
      {
        syndrome: 'Trigeminal sensory neuropathy — the division pattern localizes the foramen',
        findings: 'Loss in V1 alone points to the superior orbital fissure or the cavernous sinus; V2 alone to the foramen rotundum or the sinus; V3 alone to the foramen ovale or the infratemporal fossa; all three with a numb chin point to the ganglion, Meckel\'s cave or the brainstem. The corneal reflex is the most sensitive bedside test of the V1 limb, and its loss with a normal ipsilateral facial motor response (CN VII intact) puts the lesion on the trigeminal side.',
        note: 'A numb chin with a normal examination otherwise is a classic presentation of a metastatic lesion at the petrous apex or the mandible, not of a benign trigeminal neuropathy.',
      },
      {
        syndrome: 'Trigeminal motor palsy — jaw deviation and a flaccid bite',
        findings: 'Weakness of the pterygoid muscles makes the jaw deviate TOWARD the side of the lesion on opening (the intact contralateral lateral pterygoid pushes the jaw across), and the masseter and temporalis waste with a reduced jaw jerk; it is almost never isolated, because the motor fibres leave through the foramen ovale with the sensory root, so an isolated motor palsy localizes to the motor nucleus in the pons or to a lesion at the foramen ovale.',
        note: 'The jaw-jerk reflex is the brainstem correlate: it is reduced by an ipsilateral motor lesion and exaggerated by a corticobulbar (supranuclear) lesion.',
      },
      {
        syndrome: 'Trigeminal involvement in brainstem syndromes',
        findings: 'A lateral medullary infarct destroys the descending spinal trigeminal tract and nucleus and produces ipsilateral facial pain and temperature loss in the onion-skin pattern, with contralateral loss of pain and temperature from the body (spinothalamic tract) — the classical crossed sensory deficit. A midpontine lesion produces IPSILATERAL facial sensory loss with CONTRALATERAL hemiparesis and hemisensory loss (Millard-Gubler/Foville territory with trigeminal involvement), because the trigeminal fibres reach the pons at the level of the motor and principal sensory nuclei and the corticospinal tract is already there.',
        vascular: 'PICA and vertebral artery for the medullary pattern; paramedian and circumferential basilar branches for the pontine one',
        note: 'The corneal reflex is often the only sign of a small lateral medullary infarct; testing it is not optional.',
      },
    ],
    refs: [
      'Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed., Ch. "Brainstem III: Internal Structures and Vascular Supply"',
      'Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed., Ch. "Brainstem I: Surface Anatomy and Cross-Sectional Anatomy"',
      'Snell, Clinical Neuroanatomy, trigeminal system sections',
      'Midbrain, Pons, and Medulla: Anatomy and Syndromes, RadioGraphics 2019 (doi 10.1148/rg.2019180126)',
    ],
    calibreMm: 4.5,
    color: '#14b8a6',
    levels: ['lvl-pons-middle', 'lvl-midbrain-ic'],
  },
  {
    id: 'nrv-cn6-abducens',
    name: 'CN VI Abducens nerve',
    region: 'pons',
    kind: 'nerve',
    direction: 'descending',
    modality: 'General somatic efferent',
    origin: 'Abducens nucleus, caudal pons beneath the facial colliculus',
    target: 'Lateral rectus',
    decussation:
      'No crossing at its own root. The abducens NUCLEUS is the exception: its internuclear neurons cross immediately to join the contralateral MLF and reach the contralateral medial-rectus subnucleus, so a nuclear lesion produces a conjugate gaze palsy while a nerve lesion produces an isolated palsy.',
    function:
      'Innervates the lateral rectus, the only abductor of the eye. Because the nerve runs a long course up the clivus and through the cavernous sinus it is the ocular motor nerve most often affected by raised intracranial pressure and by skull-base disease; a palsy gives horizontal diplopia that is worst on gaze toward the affected side, with the eye resting adducted.',
    foramen: 'superior orbital fissure',
    anchorId: 'surf-cn6-exit',
    anchorNote:
      'The body is an AUTHORED PATH — nuc-abducens to ventral pons to prepontine cistern to clivus and Dorello canal to cavernous sinus to superior orbital fissure to lateral rectus — not a segmented scan. It is anchored on the committed nucleus origin3d (nuc-abducens) and the committed landmark surf-cn6-exit (waypoint 3 of 8); the clivus, Dorello canal, cavernous sinus and orbital target are authored from anatomy, because no skull-base or dural-sinus mesh is committed. 1.9 mm calibre at 1 au = 1.2 mm gives tubeRadius 0.79 au.',
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
        syndrome: 'Abducens palsy — failure of abduction with horizontal diplopia',
        findings: 'The eye cannot be abducted past the midline (or abducts incompletely), diplopia is maximal on gaze to the affected side and is horizontal, and the patient turns the head to fuse. The palsy localizes to the nerve anywhere from the nucleus to the orbit, and an isolated, pupil-sparing sixth-nerve palsy in a patient over 50 with vascular risk factors is usually microvascular and recovers in three months.',
        vascular: 'Microvascular ischaemia of the vasa nervorum (diabetes, hypertension); or compression by a dolichoectatic basilar artery (vasc-basilar-artery)',
        note: 'An isolated sixth-nerve palsy is the commonest false localizing sign: it can be the presenting sign of raised intracranial pressure, a pontine glioma, a nasopharyngeal carcinoma at the petrous apex or a Gradenigo syndrome, so imaging is the rule.',
      },
      {
        syndrome: 'False localizing abducens palsy of raised intracranial pressure',
        findings: 'Raised pressure displaces the brainstem caudally and stretches the long, fixed, ascending cisternal nerve against the clivus and the petrosphenoidal ligament, producing a (usually bilateral) abduction palsy with no lesion in the nerve\'s own pathway; it is accompanied by the other signs of raised pressure (headache, papilloedema, a false localizing sign in a patient whose CT is otherwise normal).',
        note: 'The nerve\'s anatomy, not its pathology, is the localizing point: a long nerve tethered at both ends is stretched by displacement of either end.',
      },
      {
        syndrome: 'Nuclear (gaze palsy) versus fascicular (crossed) sixth-nerve lesions',
        findings: 'A nuclear lesion destroys motor and internuclear neurons together, producing an ipsilateral horizontal GAZE palsy with facial palsy on the same side (because the facial fibres loop around the nucleus at that level); a fascicular lesion as the fibres cross the corticospinal tract produces the Foville and Millard-Gubler syndromes — ipsilateral abducens (or gaze) palsy with CONTRALATERAL hemiparesis, often with an ipsilateral facial palsy.',
        vascular: 'Paramedian branches of the basilar artery (pontine infarct); Millard-Gubler and Foville are the classic brainstem localizers (syn-millard-gubler, syn-foville)',
        note: 'The one-and-a-half syndrome (syn-one-and-a-half) is the neighbouring lesion: a PPRF/MLF lesion adds an internuclear ophthalmoplegia to the ipsilateral gaze palsy, leaving only abduction of the contralateral eye.',
      },
      {
        syndrome: 'Gradenigo syndrome and petrous-apex lesions',
        findings: 'Petrous apicitis or a petrous-apex tumour involving the Dorello canal and Meckel\'s cave produces the triad of an ipsilateral abducens palsy, deep facial or retro-orbital pain (V1/V2) and hearing loss or otorrhoea — the anatomical combination of the structures that share the petrous apex.',
        note: 'The petrous apex is where the sixth nerve and the trigeminal ganglion meet; a patient with diplopia, facial pain and ear symptoms has a lesion there, not in the orbit.',
      },
    ],
    refs: [
      'Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed., Ch. "Brainstem II: Eye Movements and Pupillary Control"',
      'Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed., Ch. "Brainstem III: Internal Structures and Vascular Supply"',
      'Fix, High-Yield Neuroanatomy, Ch. "Brainstem and Cranial Nerves"',
    ],
    calibreMm: 1.9,
    color: '#14b8a6',
    levels: ['lvl-pons-caudal', 'lvl-pontomedullary'],
  },
  {
    id: 'nrv-cn7-facial',
    name: 'CN VII Facial nerve',
    region: 'pons',
    kind: 'nerve',
    direction: 'mixed',
    modality:
      'Branchial motor + general visceral efferent + special sensory (taste) + general somatic afferent',
    origin:
      'Facial motor nucleus, superior salivatory nucleus and the nervus intermedius components, caudal pons',
    target:
      'Muscles of facial expression, stapedius, stylohyoid, posterior digastric, lacrimal, submandibular and sublingual glands, anterior two-thirds of the tongue (taste)',
    decussation:
      'No crossing at its own root. Its cortical (corticobulbar) supply is bilateral for the upper face and crossed for the lower face, which is why a supranuclear lesion spares the forehead.',
    function:
      'The motor nerve of the face: it drives all muscles of facial expression and, through the nervus intermedius, carries taste from the anterior two-thirds of the tongue, parasympathetic fibres to the lacrimal and salivary glands, and a small somatic sensory component from the external auditory canal. A lesion at the root produces a complete ipsilateral facial palsy with loss of tearing and of the stapedial reflex; a lesion in the pons adds abducens palsy or long-tract signs.',
    foramen: 'internal acoustic meatus',
    anchorId: 'surf-cn7-exit',
    anchorNote:
      'The body is an AUTHORED PATH — nuc-facial to pontomedullary junction to cerebellopontine angle to internal acoustic meatus to facial canal to stylomastoid foramen to parotid plexus — not a segmented scan. It is anchored on the committed nucleus origin3d (nuc-facial) and the committed landmark surf-cn7-exit (waypoint 2 of 8); the petrous segment and the extra-cranial target are authored from anatomy, because no temporal-bone mesh is committed. 1.9 mm calibre at 1 au = 1.2 mm gives tubeRadius 0.79 au.',
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
        syndrome: 'Peripheral facial palsy (Bell\'s palsy and its mimics)',
        findings: 'A complete lower-motor-neuron palsy paralyses the whole ipsilateral face: the forehead cannot be wrinkled, the eye cannot be closed (with a risk of exposure keratitis), the mouth droops and the patient cannot whistle or hold liquid on that side; hyperacusis, loss of taste in the anterior tongue and a dry eye accompany it when the lesion is inside the facial canal (the geniculate and chorda segments), and are absent when the lesion is distal to the stylomastoid foramen. Bell\'s palsy is idiopathic and self-limiting in most cases; the mimics that must be excluded are a parotid tumour, cholesteatoma, temporal-bone fracture, sarcoidosis, Lyme disease, Guillain-Barré syndrome and a pontine lesion.',
        vascular: 'Microvascular ischaemia and viral inflammation of the nerve inside the facial canal; the diagnosis of exclusion is the reason imaging is advised when the palsy is progressive, painful or recurrent',
        note: 'The site of the lesion is read off the associated signs: loss of tearing (greater petrosal), hyperacusis (stapedius), loss of taste (chorda tympani), loss of saliva (chorda tympani) — a stepwise localization along the facial canal.',
      },
      {
        syndrome: 'Central (supranuclear) facial palsy with forehead sparing',
        findings: 'A corticobulbar lesion above the pons spares the upper face, because the motor neurons for the frontalis and orbicularis oculi receive bilateral cortical input while the lower-face neurons receive only contralateral input: the patient has a drooping mouth but can still wrinkle the forehead and close the eye tightly. It is the single most useful bedside distinction between a hemispheric or capsular lesion and a brainstem or nerve lesion, and it is accompanied by the other signs of the causal lesion (hemiparesis, aphasia, hemianopia or a brainstem crossed syndrome).',
        vascular: 'Middle cerebral artery or internal capsule territory (with hemiparesis); a pontine lesion produces the peripheral type instead, with the crossed pattern of Millard-Gubler (syn-millard-gubler)',
        note: 'The rule is anatomical, not clinical folklore: bilateral corticobulbar supply to the upper-face motor neurons is what spares the forehead.',
      },
      {
        syndrome: 'Hemifacial spasm (root-entry-zone compression)',
        findings: 'Intermittent, involuntary, unilateral clonic contractions of the muscles of facial expression, beginning around the orbicularis oculi and spreading to the mouth, that persist in sleep and can be triggered by voluntary movement; it is usually caused by an arterial loop (most often AICA or the posterior inferior cerebellar artery) compressing the facial nerve at its root exit zone, and microvascular decompression is curative.',
        vascular: 'Anterior inferior cerebellar artery (vasc-anterior-inferior-cerebellar-artery), occasionally the vertebral or basilar artery',
        note: 'The facial-nerve twin of trigeminal neuralgia: both are diseases of the root entry zone, and both are treated by moving the artery rather than by cutting the nerve.',
      },
      {
        syndrome: 'Ramsay Hunt syndrome and other intratemporal causes',
        findings: 'Varicella-zoster reactivation in the geniculate ganglion produces a facial palsy with severe ear pain, vesicles in the external canal or the concha (the sensory zone of CN VII), hearing loss and vertigo — the combination that localizes the lesion to the geniculate ganglion and the meatus rather than to the canal alone.',
        note: 'The vesicles sit exactly in the nerve\'s own sensory distribution, which is why their presence names the diagnosis; a facial palsy with sensorineural hearing loss should always raise the meatus as the site.',
      },
    ],
    refs: [
      'Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed., Ch. "Brainstem III: Internal Structures and Vascular Supply"',
      'Patten, Neurological Differential Diagnosis, 2nd ed., facial palsy localization sections',
      'Fix, High-Yield Neuroanatomy, Ch. "Brainstem and Cranial Nerves"',
    ],
    calibreMm: 1.9,
    color: '#14b8a6',
    levels: ['lvl-pons-caudal', 'lvl-pontomedullary'],
  },
  {
    id: 'nrv-cn8-vestibulocochlear',
    name: 'CN VIII Vestibulocochlear nerve',
    region: 'pons',
    kind: 'nerve',
    direction: 'ascending',
    modality: 'Special sensory afferent (hearing and balance)',
    origin: 'Spiral ganglion of the cochlea and the vestibular ganglion of Scarpa, inner ear',
    target:
      'Cochlear nuclei (ventral and dorsal) and the four vestibular nuclei, pontomedullary junction',
    decussation:
      'No crossing at the root; the central auditory pathway crosses at several levels and the vestibular nuclei project to both sides through the MLF and the vestibulospinal tracts.',
    function:
      'Carries hearing from the cochlear hair cells and balance from the vestibular labyrinth. The cochlear division ends in the cochlear nuclei and the vestibular division in the vestibular nuclei, which drive the vestibulo-ocular and vestibulospinal reflexes. A lesion at the root or in the cerebellopontine angle causes ipsilateral sensorineural deafness, tinnitus and vertigo with nystagmus — the classic presentation of a vestibular schwannoma.',
    foramen: 'internal acoustic meatus',
    anchorId: 'surf-cn8-exit',
    anchorNote:
      'The body is an AUTHORED PATH — nuc-vestibular-medial and nuc-cochlear-ventral to pontomedullary junction to cerebellopontine angle to internal acoustic meatus to fundus to cochlea and labyrinth — not a segmented scan. It is anchored on TWO committed nucleus origin3d values (nuc-vestibular-medial and nuc-cochlear-ventral) and on the committed landmark surf-cn8-exit (waypoint 3 of 8); the meatus, the fundus and the inner-ear target are authored from anatomy. 2.8 mm calibre at 1 au = 1.2 mm gives tubeRadius 1.17 au.',
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
        syndrome: 'Vestibular schwannoma (acoustic neuroma) at the internal acoustic meatus',
        findings: 'A slow-growing tumour of the vestibular division produces unilateral sensorineural hearing loss with poor speech discrimination, tinnitus, and later imbalance; because the meatus is shared, growth eventually adds a facial palsy (CN VII), a reduced corneal reflex and facial numbness (CN V). The early picture is a hearing loss out of proportion to the audiogram\'s apparent severity, which is why speech discrimination testing is the key bedside finding.',
        note: 'Bilateral vestibular schwannomas mean neurofibromatosis type 2; the shared meatus is the anatomical reason this tumour has a syndromic signature at all.',
      },
      {
        syndrome: 'Vestibular neuritis and labyrinthitis (acute unilateral vestibular failure)',
        findings: 'Acute, severe, continuous vertigo with nausea and vomiting, horizontal-torsional nystagmus that beats away from the affected ear, and a positive head-impulse test on the affected side, with NO hearing loss (neuritis) or WITH hearing loss and tinnitus (labyrinthitis). The absence of the other brainstem signs is what separates it from a lateral medullary or AICA infarct, and the head-impulse test is the sign that localizes the failure to the vestibular nerve.',
        vascular: 'Post-viral inflammation of the vestibular division; an AICA infarct is the vascular mimic and is suggested by the additional deafness, facial palsy or ataxia',
        note: 'The HINTS examination (head impulse, nystagmus type, test of skew) separates a peripheral from a central cause at the bedside, because a central lesion can present as isolated vertigo.',
      },
      {
        syndrome: 'AICA syndrome',
        findings: 'Occlusion of the anterior inferior cerebellar artery produces vertigo with vomiting, ipsilateral sensorineural deafness and tinnitus, ipsilateral facial palsy, ipsilateral cerebellar ataxia, and a crossed sensory loss (ipsilateral face, contralateral body) — the whole output of this nerve\'s compartment failing at once, because the labyrinthine branch and the facial and vestibular nerve roots share it.',
        vascular: 'Anterior inferior cerebellar artery (vasc-anterior-inferior-cerebellar-artery)',
        note: 'The combination of deafness and vertigo with a facial palsy and ataxia is the reason a patient with \'labyrinthitis\' who also has a facial droop needs urgent imaging.',
      },
      {
        syndrome: 'Sensorineural hearing loss — cochlear versus retrocochlear localization',
        findings: 'A cochlear lesion (hair-cell loss from noise, ototoxic drugs or Menière disease) produces recruitment and preserved or disproportionate speech discrimination, while a retrocochlear lesion of this nerve or the meatus produces poor discrimination, a disproportionate loss of speech understanding and often an abnormal auditory brainstem response; the distinction is the bedside version of the question \'inner ear or nerve?\', and it decides whether the patient needs an MRI of the meatus.',
        vascular: 'Labyrinthine artery occlusion (an AICA branch) causes sudden retrocochlear-pattern deafness; the vascular cause is an emergency for the ear as well as for the brainstem',
      },
    ],
    refs: [
      'Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed., Ch. "Brainstem III: Internal Structures and Vascular Supply"',
      'Blumenfeld, Neuroanatomy through Clinical Cases, 3rd ed., Ch. \'Auditory System\'',
      'Fix, High-Yield Neuroanatomy, Ch. "Auditory and Vestibular Systems"',
      'Midbrain, Pons, and Medulla: Anatomy and Syndromes, RadioGraphics 2019 (doi 10.1148/rg.2019180126)',
    ],
    calibreMm: 2.8,
    color: '#14b8a6',
    levels: ['lvl-pons-caudal', 'lvl-pontomedullary'],
  },
  {
    id: 'nrv-cn9-glossopharyngeal',
    name: 'CN IX Glossopharyngeal nerve',
    region: 'medulla',
    kind: 'nerve',
    direction: 'mixed',
    modality:
      'Branchial motor + general visceral efferent + general visceral afferent + special sensory (taste) + general somatic afferent',
    origin: 'Nucleus ambiguus, inferior salivatory nucleus and the solitary nucleus, rostral medulla',
    target:
      'Stylopharyngeus, parotid gland, carotid body and carotid sinus, posterior third of the tongue, oropharynx',
    decussation:
      'No crossing at its own root. Its central afferents cross in the dorsal medulla to reach the thalamus; the baroreceptor and chemoreceptor limb is uncrossed.',
    function:
      'A mixed nerve of the oropharynx: it innervates stylopharyngeus, supplies parasympathetic secretomotor fibres to the parotid, carries taste and general sensation from the posterior third of the tongue and the pharynx, and carries the afferents of the carotid sinus (baroreceptor) and carotid body (chemoreceptor). A lesion abolishes the gag reflex on the affected side and blunts carotid-sinus control of blood pressure.',
    foramen: 'jugular foramen',
    anchorId: 'surf-cn9-exit',
    anchorNote:
      'The body is an AUTHORED PATH — nuc-ambiguus to postolivary sulcus to jugular foramen to the parotid and oropharyngeal targets — not a segmented scan. It is anchored on the committed nucleus origin3d (nuc-ambiguus) and on the committed landmark surf-cn9-exit, which is waypoint 2 of 7; the skull-base exit and the targets are authored from anatomy, because no skull-base mesh is committed. 2.0 mm calibre at 1 au = 1.2 mm gives tubeRadius 0.83 au.',
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
        syndrome: 'Glossopharyngeal neuralgia',
        findings: 'Paroxysmal, severe, lancinating pain in the posterior tongue, tonsil, pharynx, angle of the jaw or ear, triggered by swallowing, coughing, yawning or talking — and, in the vagal variant, accompanied by bradycardia, hypotension and syncope (because the vagal efferents are activated at the same time). The pain is in the nerve\'s own sensory distribution and the examination is normal between attacks.',
        vascular: 'A PICA or vertebral artery loop compressing the glossopharyngeal root entry zone; microvascular decompression is the treatment',
        note: 'The syncopal form is the dangerous one: the combination of throat pain and cardiac arrest localizes the lesion to the region shared by CN IX and CN X.',
      },
      {
        syndrome: 'Loss of the gag reflex and pharyngeal sensory loss (jugular-foramen lesion)',
        findings: 'A jugular-foramen lesion (glomus jugulare tumour, meningioma, metastasis, thrombosis) damages CN IX, X and XI together, producing loss of the gag reflex, a deviated uvula, hoarseness, dysphagia, and weakness and wasting of the sternocleidomastoid and trapezius — the Vernet syndrome; adding CN XII through the hypoglossal canal gives the Collet-Sicard syndrome, and adding a Horner syndrome gives Villaret syndrome.',
        note: 'The gag reflex tests CN IX (afferent) and CN X (efferent) together, so its loss localizes to the pair, not to one nerve — the bedside version of the shared jugular foramen.',
      },
      {
        syndrome: 'Glossopharyngeal palsy with loss of parotid secretion and taste',
        findings: 'An isolated IX lesion is rare: it produces a dry mouth (loss of parotid secretomotor drive), loss of taste in the posterior third of the tongue, reduced pharyngeal sensation and a mild dysphagia, and it is usually part of a jugular-foramen or brainstem picture rather than a solitary nerve palsy. The taste loss is separable from that of CN VII because the two nerves serve different thirds of the tongue.',
        note: 'Taste is served by three nerves — CN VII (anterior two-thirds), CN IX (posterior third) and CN X (epiglottis) — so the pattern of taste loss is itself a localizing sign.',
      },
      {
        syndrome: 'Lateral medullary (Wallenberg) syndrome with glossopharyngeal involvement',
        findings: 'The lateral medullary infarct destroys the nucleus ambiguus, the spinal trigeminal tract and the vestibular nuclei, producing vertigo, nystagmus, ipsilateral facial pain and temperature loss, hoarseness, dysphagia, a drooping palate and a reduced gag reflex with contralateral body sensory loss — a rostrocaudal gradient in which the glossopharyngeal fibres are the rostral end of the nerve output that fails here.',
        vascular: 'Posterior inferior cerebellar artery or vertebral artery occlusion',
        note: 'The glossopharyngeal and vagal deficits are efferent (ambiguus) and afferent (solitary and spinal trigeminal) at once, which is why the palatal and gag findings are asymmetric rather than absent.',
      },
    ],
    refs: [
      'Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed., Ch. "Brainstem III: Internal Structures and Vascular Supply"',
      'Fix, High-Yield Neuroanatomy, autonomic nervous system section',
      'Midbrain, Pons, and Medulla: Anatomy and Syndromes, RadioGraphics 2019 (doi 10.1148/rg.2019180126)',
    ],
    calibreMm: 2,
    color: '#14b8a6',
    levels: ['lvl-olivary', 'lvl-pontomedullary'],
  },
  {
    id: 'nrv-cn10-vagus',
    name: 'CN X Vagus nerve',
    region: 'medulla',
    kind: 'nerve',
    direction: 'mixed',
    modality:
      'Branchial motor + general visceral efferent + general visceral afferent + special sensory (taste) + general somatic afferent',
    origin: 'Dorsal motor nucleus of the vagus, nucleus ambiguus and the solitary nucleus, medulla',
    target:
      'Pharyngeal and laryngeal muscles, thoracic and abdominal viscera to the splenic flexure, aortic arch baro- and chemoreceptors, external ear',
    decussation:
      'No crossing at its own root. Its central afferents cross in the medulla; the efferent supply is ipsilateral.',
    function:
      'The longest cranial nerve, and the motor and sensory nerve of the viscera: it drives the pharyngeal constrictors and the muscles of the soft palate and larynx through the recurrent laryngeal nerve, supplies parasympathetic secretomotor and motor fibres to the heart, lungs and gut as far as the splenic flexure, and carries visceral afferents from those organs plus taste from the epiglottis. A lesion causes ipsilateral palatal and vocal-cord weakness with deviation of the uvula, dysphagia and dysphonia.',
    foramen: 'jugular foramen',
    anchorId: 'surf-cn10-exit',
    anchorNote:
      'The body is an AUTHORED PATH — nuc-dmv and nucleus ambiguus to postolivary sulcus to jugular foramen to carotid sheath — not a segmented scan. It is anchored on the committed nucleus origin3d (nuc-dmv) and the committed landmark surf-cn10-exit (waypoint 3 of 8); the skull-base exit and the whole neck and thorax beyond it are authored from anatomy, and the displayed path STOPS at the carotid sheath rather than pretending to trace the nerve to the abdomen. 2.4 mm calibre at 1 au = 1.2 mm gives tubeRadius 1.00 au.',
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
        syndrome: 'Vagal (nuclear and infranuclear) palsy — palatal, pharyngeal and laryngeal failure',
        findings: 'A unilateral lesion of the nucleus ambiguus or of the vagus droops the ipsilateral palate, deviates the uvula AWAY from the side of the lesion, paralyses the ipsilateral vocal fold with hoarseness and a bovine cough, and impairs swallowing with a risk of aspiration; bilateral lesions produce near-complete loss of pharyngeal and laryngeal function, and the loss of the afferent limb (nucleus solitarius) removes the protective cough. The side of the uvular deviation and the side of the vocal-fold palsy localize the lesion to the same side as the nerve.',
        vascular: 'PICA or vertebral artery for a nuclear/lateral medullary lesion; the neck and mediastinum for a peripheral one',
        note: 'The uvula deviates AWAY from the lesion because the intact contralateral palatal muscles pull it across — the opposite of the tongue\'s rule, and a classic bedside trap.',
      },
      {
        syndrome: 'Recurrent laryngeal nerve palsy (an aortic-arch or mediastinal sign)',
        findings: 'Paralysis of the ipsilateral vocal fold with hoarseness, a weak cough and loss of the ability to raise pitch; the left nerve\'s long intrathoracic course under the aortic arch makes a left-sided palsy a classic presentation of an aortic-arch aneurysm, an enlarged left atrium (mitral stenosis), a mediastinal tumour or an apical lung carcinoma, while a right-sided palsy points below the right subclavian artery or at the thyroid.',
        vascular: 'Aortic arch (left recurrent nerve) or right subclavian artery (right recurrent nerve) — the vessel the nerve loops around is the vessel that names the level of the lesion',
        note: 'A patient with hoarseness and a normal larynx on examination needs a chest imaging study, because the nerve can be paralysed far from the larynx.',
      },
      {
        syndrome: 'Vagal dysautonomia, cough syncope and bradyarrhythmia',
        findings: 'Loss of vagal cardiac modulation removes beat-to-beat control of heart rate (producing a fixed tachycardia) while preserved sympathetic tone leaves the patient orthostatic; the opposite — vagal overactivity from irritation of the auricular branch in the external canal, from oesophageal distension or from a jugular-foramen lesion — causes cough syncope and sudden bradycardia or asystole. Gastroparesis and impaired intestinal motility follow loss of the gut\'s vagal drive.',
        vascular: 'Not primarily vascular; the neural-crest and brainstem lesions that cause dysautonomia are degenerative, surgical or traumatic',
        note: 'Vagal and sympathetic failure must be separated: vagal failure causes tachycardia and gut stasis, sympathetic failure causes orthostatic hypotension and a Horner syndrome.',
      },
      {
        syndrome: 'Jugular-foramen and Collet-Sicard syndromes (CN IX, X, XI, XII)',
        findings: 'A lesion at the jugular foramen takes CN IX, X and XI together (Vernet syndrome) and, when it extends to the hypoglossal canal, adds CN XII (Collet-Sicard syndrome), producing loss of the gag reflex, palatal and vocal-fold palsy, dysphagia, and weakness of the sternocleidomastoid, trapezius and tongue on one side — the combination that names the skull base as the site rather than the brainstem, because the brainstem syndromes produce crossed findings and a partial pattern.',
        vascular: 'Glomus jugulare tumour, meningioma, metastasis or internal jugular vein thrombosis',
        note: 'The one-sided, multiple-nerve, non-crossed pattern is what makes this a skull-base syndrome: at the foramen the nerves are physically together, and no brainstem lesion takes exactly this set without adding long-tract signs.',
      },
    ],
    refs: [
      'Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed., Ch. "Brainstem III: Internal Structures and Vascular Supply"',
      'Fix, High-Yield Neuroanatomy, autonomic nervous system section',
      'Snell, Clinical Neuroanatomy, brainstem and cranial nerves chapters',
    ],
    calibreMm: 2.4,
    color: '#14b8a6',
    levels: ['lvl-olivary', 'lvl-pontomedullary'],
  },
  {
    id: 'nrv-cn11-accessory',
    name: 'CN XI Accessory nerve',
    region: 'medulla',
    kind: 'nerve',
    direction: 'descending',
    modality: 'Branchial motor (cranial root) + general somatic efferent (spinal root)',
    origin:
      'Nucleus ambiguus (cranial root) and the C1 to C5 anterior-horn grey matter through the spinal root',
    target: 'Sternocleidomastoid and trapezius',
    decussation:
      'No crossing at its own root, neither root. Its cortical control is crossed and bilateral, so a supranuclear lesion rarely causes isolated weakness.',
    function:
      'A purely motor nerve with two roots: the cranial root joins the vagus for the pharynx and larynx, while the spinal root ascends through the foramen magnum, joins the cranial root briefly at the jugular foramen, and then descends in the neck to supply sternocleidomastoid and trapezius. A lesion paralyses shoulder elevation and turns the head weakly, and because of its long superficial course it is injured in neck surgery and in the jugular foramen syndrome.',
    foramen: 'jugular foramen',
    anchorId: 'surf-cn11-exit',
    anchorNote:
      'The body is an AUTHORED PATH — nuc-ambiguus (cranial root) to medullary rootlets to the spinal root through the foramen magnum to the jugular foramen to the neck to sternocleidomastoid and trapezius — not a segmented scan. It is anchored on the committed nucleus origin3d (nuc-ambiguus) and the committed landmark surf-cn11-exit (waypoint 3 of 8); the foramen magnum segment of the spinal root and the neck targets are authored from anatomy. 1.5 mm calibre at 1 au = 1.2 mm gives tubeRadius 0.63 au.',
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
        syndrome: 'Accessory-nerve palsy — drooping shoulder with weak shrugging',
        findings: 'Weakness and wasting of the trapezius produce a dropped shoulder, an inability to shrug against resistance, winging of the scapula with the arm abducted, and weakness of head extension; sternocleidomastoid weakness makes it difficult to turn the head to the OPPOSITE side and to flex the neck against resistance. The winging is different from that of long thoracic-nerve palsy: the accessory\'s is most obvious with the arm abducted rather than elevated forward. The pattern localizes to the accessory nerve\'s external branch or to its spinal root, and the missing sensory loss is what separates it from a cervical radiculopathy.',
        vascular: 'Not primarily vascular; the commonest causes are surgical (neck dissection, lymph-node biopsy, carotid endarterectomy, internal jugular cannulation) and traumatic',
        note: 'The palsy is a double sign: the same nerve supplies two muscles with different actions, so the examination must test head rotation and shoulder elevation separately.',
      },
      {
        syndrome: 'Jugular-foramen syndrome and Vernet syndrome with accessory involvement',
        findings: 'A jugular-foramen lesion takes CN IX, X and XI: loss of the gag reflex, palatal and vocal-fold palsy with hoarseness and dysphagia, plus a dropped shoulder and weak head rotation. The accessory palsy is the finding that identifies a skull-base lesion rather than a medullary one, because a medullary lesion that destroys the nucleus or rootlets almost always adds long-tract or crossed sensory findings, and an isolated nuclear lesion would not affect the trapezius on the same side as the tongue or palate.',
        vascular: 'Glomus jugulare tumour, meningioma, metastasis, or jugular-vein thrombosis',
        note: 'The three-nerve, one-sided, non-crossed pattern is the skull-base signature; the accessory component is its most conspicuous motor sign.',
      },
      {
        syndrome: 'Foramen-magnum and high-cervical lesions of the spinal root',
        findings: 'The spinal root ascends through the foramen magnum, so a Chiari malformation, a foramen-magnum meningioma, a vertebral-artery dissection or a C1-C2 fracture can produce an accessory palsy with or without a myelopathy; the palsy may be the first sign of a foramen-magnum tumour, and it is typically accompanied by the sensory and long-tract signs of the level.',
        vascular: 'Vertebral artery (vasc-vertebral-artery) dissection or compression at the foramen magnum',
        note: 'A patient with a dropped shoulder and a normal neck examination still needs imaging of the foramen magnum, because the spinal root\'s intracranial ascent is the one part of this nerve that shares the posterior fossa.',
      },
      {
        syndrome: 'Accessory-nerve injury in neck surgery',
        findings: 'The external branch runs subcutaneously across the posterior triangle, where it is at risk during radical neck dissection, cervical lymph-node biopsy, internal jugular vein cannulation and carotid endarterectomy; the injury produces immediate shoulder drop and pain, with a characteristic compensatory elevation of the affected shoulder and a reduced ability to carry weight on that side.',
        vascular: 'Iatrogenic; the transverse cervical artery\'s branches mark the plane in which the nerve runs',
        note: 'The clinical value of the anatomy here is preventive: identification of the nerve at the posterior border of the sternocleidomastoid is the step that prevents the palsy.',
      },
    ],
    refs: [
      'Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed., Ch. "Brainstem III: Internal Structures and Vascular Supply"',
      'Fix, High-Yield Neuroanatomy, Ch. "Brainstem and Cranial Nerves"',
      'Snell, Clinical Neuroanatomy, brainstem and cranial nerves chapters',
    ],
    calibreMm: 1.5,
    color: '#14b8a6',
    levels: ['lvl-olivary', 'lvl-spinal-medulla'],
  },
  {
    id: 'nrv-cn12-hypoglossal',
    name: 'CN XII Hypoglossal nerve',
    region: 'medulla',
    kind: 'nerve',
    direction: 'descending',
    modality: 'General somatic efferent',
    origin: 'Hypoglossal nucleus, dorsal medulla beneath the hypoglossal trigone',
    target: 'All intrinsic tongue muscles and the extrinsic genioglossus, hyoglossus and styloglossus',
    decussation:
      'No crossing at its own root: each nerve supplies the ipsilateral half of the tongue. Its cortical supply is crossed, which is why a supranuclear lesion deviates the tongue AWAY from the weak side.',
    function:
      'The motor nerve of the tongue: it innervates every intrinsic muscle and genioglossus, hyoglossus and styloglossus, controlling speech, mastication and swallowing. A lower-motor-neuron lesion produces atrophy and fasciculation of the ipsilateral tongue with deviation TOWARD the weak side on protrusion; the long course through the hypoglossal canal explains its involvement in occipital-condyle and foramen magnum disease.',
    foramen: 'hypoglossal canal',
    anchorId: 'surf-cn12-exit',
    anchorNote:
      'The body is an AUTHORED PATH — nuc-hypoglossal to preolivary sulcus to hypoglossal canal to tongue musculature — not a segmented scan. It is anchored on the committed nucleus origin3d (nuc-hypoglossal) and the committed landmark surf-cn12-exit (waypoint 3 of 7); the canal and the whole extra-cranial course are authored from anatomy, because no skull-base or tongue mesh is committed. 1.8 mm calibre at 1 au = 1.2 mm gives tubeRadius 0.75 au.',
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
        syndrome: 'Hypoglossal (lower motor neuron) palsy — tongue deviates TOWARD the lesion',
        findings: 'The tongue is weak, wasted and fasciculating on the affected side and deviates TOWARD the side of the lesion on protrusion, because the intact contralateral genioglossus pushes the tip across the midline; speech becomes dysarthric (lingual consonants), chewing and swallowing are impaired, and in long-standing cases the tongue is visibly atrophic with a wrinkled mucosa. The side of the deviation therefore names the side of the lesion — the opposite of the supranuclear rule below.',
        vascular: 'Vertebral artery compression at the hypoglossal canal, or a medullary infarct (medial medullary syndrome); in the neck, carotid dissection, tumour or surgical injury',
        note: 'An isolated twelfth-nerve palsy demands imaging of the canal and the skull base: the nerve can be compressed by an aberrant vertebral artery, a meningioma, a chordoma or a metastasis at the occipital condyle.',
      },
      {
        syndrome: 'Supranuclear (corticobulbar) palsy — tongue deviates AWAY from the lesion',
        findings: 'A lesion above the nucleus (motor cortex, corona radiata, internal capsule) weakens the tongue contralaterally, and because genioglossus has predominantly contralateral cortical input the tongue deviates AWAY from the side of the hemispheric lesion; there is no wasting and no fasciculation, and the tongue retains its automatic movements in swallowing. A capsular lesion adds a contralateral hemiparesis, which is the localizing combination.',
        vascular: 'Middle cerebral artery territory or the internal capsule (vasc-middle-cerebral-artery; lenticulostriate perforators, vasc-lenticulostriate-arteries)',
        note: 'Tongue TOWARD the lesion = nuclear or nerve (lower motor neuron, with wasting); tongue AWAY = supranuclear. The presence of wasting and fasciculation settles it before any imaging.',
      },
      {
        syndrome: 'Medial medullary syndrome with hypoglossal involvement (Dejerine syndrome)',
        findings: 'An infarct of the medial medulla destroys the hypoglossal nerve\'s rootlets or nucleus together with the pyramid and the medial lemniscus: ipsilateral tongue weakness and wasting that deviates toward the lesion, contralateral hemiparesis, and contralateral loss of position and vibration sense — the three-way crossed pattern that names the level.',
        vascular: 'Anterior spinal artery or vertebral artery paramedian branches (vasc-vertebral-artery)',
        note: 'The hypoglossal palsy is the ipsilateral element; the crossed weakness and sensory loss are what separate a medullary lesion from an isolated nerve palsy.',
      },
      {
        syndrome: 'Bilateral hypoglossal palsy with tongue atrophy and obstructive sleep apnoea',
        findings: 'Bilateral involvement — motor neuron disease, syringobulbia, Chiari malformation, a foramen-magnum lesion or bilateral carotid dissection — produces a small, wrinkled, fasciculating tongue with severe dysarthria and dysphagia, and, because the genioglossus is the muscle that holds the airway open, obstructive sleep apnoea and respiratory failure in sleep; it is one of the bulbar presentations of amyotrophic lateral sclerosis.',
        note: 'The tongue is a muscle like any other, so bilateral lower-motor-neuron disease shows the full picture of atrophy, fasciculation and weakness — and the airway consequence is the immediate danger.',
      },
    ],
    refs: [
      'Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed., Ch. "Brainstem III: Internal Structures and Vascular Supply"',
      'Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed., Ch. "Brainstem I: Surface Anatomy and Cross-Sectional Anatomy"',
      'Patten, Neurological Differential Diagnosis, 2nd ed., cranial nerve examination sections',
    ],
    calibreMm: 1.8,
    color: '#14b8a6',
    levels: ['lvl-olivary', 'lvl-pontomedullary'],
  },
  {
    id: 'nrv-cn1-olfactory',
    name: 'CN I Olfactory nerve',
    region: 'telencephalon',
    kind: 'nerve',
    direction: 'ascending',
    modality: 'Special sensory afferent (olfaction)',
    origin: 'Olfactory epithelium of the superior nasal cavity (bipolar receptor neurons)',
    target: 'Olfactory bulb and, through the olfactory tract, the primary olfactory cortex',
    decussation:
      'No crossing at the root: each half of the nasal cavity projects to the ipsilateral bulb. The pathway crosses only indirectly, through the anterior commissure and the commissural connections of the olfactory cortex.',
    function:
      'Carries smell from the olfactory receptor neurons, the only primary sensory neurons that regenerate throughout life. Their axons bundle into the fila olfactoria, cross the cribriform plate of the ethmoid, and synapse in the olfactory bulb, whose mitral and tufted cells project through the olfactory tract to the piriform cortex, amygdala and entorhinal cortex. Because the pathway reaches the temporal lobe without a thalamic relay, a lesion is tested clinically as anosmia per nostril; post-traumatic anosmia reflects shearing of the fila at the cribriform plate.',
    foramen: 'cribriform plate',
    anchorId: '',
    anchorNote:
      'The body is an AUTHORED PATH — olfactory epithelium to cribriform plate of the ethmoid to olfactory bulb to olfactory tract — and the honest basis differs from the other eleven: CN I has NO brainstem root and NO committed exit landmark, and NOTHING behind the first waypoint is a segmented scan, because the epithelium lies outside the committed geometry. The ONE committed anchor is the record own origin3d, which sits on the frontal-lobe orbital surface facing the cribriform plate, and the chain is built to END on it, so the path runs epithelium to bulb rather than starting from a free-hand point. 1.7 mm for the fila olfactoria bundle complex at 1 au = 1.2 mm gives tubeRadius 0.71 au.',
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
        syndrome: 'Anosmia and hyposmia (conductive versus sensorineural)',
        findings: 'Loss of smell must be split into a conductive type (the odorant never reaches the epithelium or the cribriform foramina are blocked — rhinosinusitis, nasal polyposis, allergic rhinitis, a deviated septum) and a sensorineural type (the fila, bulb or tract are damaged). The distinction localizes the lesion, and only the sensorineural type is a neurological sign: a persistently unilateral anosmia in a patient with no nasal disease is a structural lesion until proven otherwise.',
        note: 'The clinically load-bearing test is unilateral testing of each nostril with a familiar odour; bilateral anosmia is often unnoticed by the patient and reported as loss of taste, because retronasal olfaction carries most of the flavour of food while the tongue\'s taste buds (CN VII, IX, X) remain normal.',
      },
      {
        syndrome: 'Post-traumatic anosmia (cribriform-plate shearing)',
        findings: 'Head injury, particularly occipital impact with contre-coup against the anterior cranial fossa, avulses the fila olfactoria as they pass through the cribriform plate; the bulb and tract may also be contused against the orbital roof. The deficit is typically unilateral or asymmetric, is often unnoticed until the patient cannot smell smoke or gas, and is a recognized cause of permanent disability after apparently minor trauma.',
        note: 'Because the fila are the torn element, recovery is possible (they regenerate and re-synapse) but is usually incomplete — the anatomical reason recovery after traumatic anosmia is partial at best, unlike the recovery after a conductive cause is treated.',
      },
      {
        syndrome: 'Foster Kennedy syndrome (olfactory-groove meningioma)',
        findings: 'A meningioma of the olfactory groove compresses the nerve and bulb on one side, producing ipsilateral anosmia and ipsilateral optic atrophy from direct compression of the optic nerve, while raised intracranial pressure produces papilloedema in the other eye; anosmia may precede visual symptoms by years, and a frontal-lobe syndrome with abulia, anosmia and gait disturbance can be the presenting picture.',
        vascular: 'Not vascular — the artery that matters is the anterior cerebral artery displaced by the tumour',
      },
      {
        syndrome: 'Anosmia after subarachnoid haemorrhage and in neurodegenerative disease',
        findings: 'Blood in the subarachnoid space (most often from an anterior communicating artery aneurysm, which lies immediately behind the olfactory tract) damages the nerve and produces anosmia distinct from the headache and meningism; a slowly progressive anosmia with no nasal disease is an early non-motor feature of Parkinson disease and of dementia with Lewy bodies, and it also precedes the memory loss of Alzheimer disease.',
        vascular: 'Anterior communicating artery / anterior cerebral artery territory',
      },
    ],
    refs: [
      'Blumenfeld, Neuroanatomy through Clinical Cases, 3rd ed., Ch. \'Limbic System: Homeostasis, Olfaction, Memory, and Emotion\'',
      'Fix, High-Yield Neuroanatomy, Ch. "Brainstem and Cranial Nerves"',
      'Patten, Neurological Differential Diagnosis, 2nd ed., cranial nerve examination sections',
    ],
    calibreMm: 1.7,
    color: '#14b8a6',
    levels: ['lvl-thalamus-rostral', 'lvl-tel-basal-ganglia'],
  },
  {
    id: 'nrv-cn2-optic',
    name: 'CN II Optic nerve',
    region: 'telencephalon',
    kind: 'nerve',
    direction: 'ascending',
    modality: 'Special sensory afferent (vision)',
    origin: 'Retinal ganglion cells at the optic disc',
    target: 'Optic chiasm, optic tract, lateral geniculate nucleus',
    decussation:
      'Partial decussation at the chiasm: fibres from the nasal hemiretina cross to the contralateral optic tract while temporal fibres stay ipsilateral, which is what makes a chiasmatic lesion produce a bitemporal hemianopia and a pre-chiasmatic lesion a monocular field defect.',
    function:
      'Carries vision from about one million retinal ganglion-cell axons, which converge at the optic disc, leave the globe through the lamina cribrosa, run in the orbit and the optic canal, and cross at the chiasm so that each optic tract carries the contralateral visual field. It is a white-matter tract of the central nervous system rather than a peripheral nerve: it is myelinated by oligodendrocytes, is invested by meninges, and is therefore the one cranial nerve that is a direct extension of the brain — the reason it is damaged by demyelination and by raised intracranial pressure alike.',
    foramen: 'optic canal',
    anchorId: 'tract-optic-nerve',
    anchorNote:
      "The body is an AUTHORED PATH — optic disc to intra-orbital nerve to optic canal to chiasm — while TWO of its five waypoints and two independent committed meshes are NOT authored: waypoint 4 is the committed optic-pathway tract record's first waypoint (tract-optic-nerve, [11,19,33]) and waypoint 5 is its last ([2,23.5,23.5]), and the baked tract-optic-nerve-l and tract-optic-nerve-r GLBs are real geometry spanning the same space (x 0.8 to 27, y -5.1 to 16.2, z 16.7 to 63.2 au: 55.8 mm of z against this path's 51.2 mm of arc, within 9 per cent). The anchor is deliberately the committed WAYPOINTS and not surf-optic-chiasm [0,29,10], which disagrees with the committed mesh by about 7 au.",
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
        syndrome: 'Optic neuritis (demyelinating)',
        findings: 'Subacute painful monocular visual loss with reduced colour vision, a relative afferent pupillary defect and a central scotoma, typically in a young adult woman and often the first symptom of multiple sclerosis; the nerve enhances on MRI and vision usually recovers over weeks. Pain on eye movement localizes the inflammation to the intraorbital and intracanalicular nerve, where the meninges are mobile.',
        note: 'Inflammatory/demyelinating (anti-AQP4 or MOG antibody disease in atypical or bilateral cases), not vascular',
      },
      {
        syndrome: 'Papilloedema from raised intracranial pressure',
        findings: 'Because the optic-nerve sheath is continuous with the subarachnoid space, raised intracranial pressure is transmitted along the cisternal segment and produces bilateral disc swelling, transient visual obscurations and enlarged blind spots; prolonged compression produces optic atrophy. The raised pressure also produces the false localizing abducens palsy (nrv-cn6-abducens) and, in a chronic picture, an empty sella.',
        vascular: 'Not vascular — CSF pressure transmitted through the sheath; the sheath\'s continuity with the subarachnoid space is the anatomical fact',
      },
      {
        syndrome: 'Compressive optic neuropathy (sellar, suprasellar and orbital)',
        findings: 'A pituitary adenoma, craniopharyngioma, tuberculum-sellae or optic-sheath meningioma compressing the cisternal or canalicular nerve causes progressive monocular visual loss with a central scotoma, a junctional scotoma when the nerve-chiasm junction is involved, or optic atrophy; a mass in the orbital apex adds proptosis and ophthalmoplegia from the neighbouring CN III, IV, V1 and VI.',
        note: 'Compressive rather than vascular; the pattern of the field defect — not the acuity — localizes the level',
      },
      {
        syndrome: 'Anterior ischaemic optic neuropathy and central retinal artery occlusion',
        findings: 'Infarction of the anterior nerve from occlusion of the short posterior ciliary arteries gives sudden painless monocular loss with an altitudinal field defect and a swollen disc (arteritic in giant-cell arteritis; non-arteritic otherwise), while central retinal artery occlusion gives sudden painless loss with a cherry-red spot and a markedly attenuated arterial tree. Both are diseases of the nerve\'s own blood supply rather than of the nerve as a conductor.',
        vascular: 'Short posterior ciliary arteries and the central retinal artery (ophthalmic artery); the arteritic form accompanies giant-cell arteritis',
      },
      {
        syndrome: 'Traumatic and iatrogenic optic-nerve injury',
        findings: 'The nerve is fixed at the optic canal, so a deceleration injury tears it or shears its vessels at the canal while the globe is displaced; the deficit is immediate and irreversible. The same fixed point is why the nerve is at risk in endoscopic sinus surgery and during orbital decompression, and why the clinical priority in suspected injury is a documented pupillary examination before any imaging.',
        note: 'Mechanical; the optic canal is the anatomical choke point, and the nerve\'s fixation there is the reason for the injury pattern',
      },
    ],
    refs: [
      'Blumenfeld, Neuroanatomy through Clinical Cases, 3rd ed., Ch. \'Visual System\'',
      'Blumenfeld, Neuroanatomy through Clinical Cases, 3rd ed., Ch. \'Brain and Environs: Cranium, Ventricles, and Meninges\'',
      'Fix, High-Yield Neuroanatomy, Ch. "Brainstem and Cranial Nerves"',
    ],
    calibreMm: 4,
    color: '#14b8a6',
    levels: ['lvl-thalamus-rostral'],
  },
]

/** The twelve course ids, in declaration (and draw) order. */
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
