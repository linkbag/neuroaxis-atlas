"""Read-only, independent audit of NeuroAxis imaging and model sections.

No atlas assets or registration constants are rewritten. CT figures use the
archived transform, and are not a proposal to restore CT to the public app.
"""
import sys, argparse, json, gzip, io, hashlib, pathlib, textwrap, subprocess, datetime
HERE = pathlib.Path(__file__).resolve().parent
if (HERE/'python-deps').exists(): sys.path.insert(0, str(HERE/'python-deps'))
import numpy as np
import scipy.ndimage as ndi
import nibabel as nib
import pydicom
import trimesh
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection

parser=argparse.ArgumentParser()
parser.add_argument('--repo',type=pathlib.Path,required=True)
parser.add_argument('--sources',type=pathlib.Path,required=True)
parser.add_argument('--out',type=pathlib.Path,required=True)
parser.add_argument('--cache-dir',type=pathlib.Path,required=True)
a=parser.parse_args(); R=a.repo.resolve(); S=a.sources.resolve(); O=a.out.resolve(); C=a.cache_dir.resolve()
if C.is_relative_to(R):raise ValueError('Raw CT cache must be outside the repository.')
O.mkdir(parents=True,exist_ok=True);C.mkdir(parents=True,exist_ok=True)
plt.rcParams.update({'figure.facecolor':'#101b2a','axes.facecolor':'#040b13','text.color':'#e2eaf4','axes.labelcolor':'#c3d1df','xtick.color':'#a3b4c9','ytick.color':'#a3b4c9','axes.edgecolor':'#476078','font.size':10,'savefig.facecolor':'#101b2a'})

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def put(name,obj): (O/name).write_text(json.dumps(obj,indent=2,allow_nan=False)+'\n',encoding='utf-8')
def affine(P,scale,T,base):
    M=np.eye(4);M[:3,:3]=np.diag(scale)@P/1.2;M[:3,3]=T
    return M@base
def xform(M,p):return np.asarray(p)@M[:3,:3].T+M[:3,3]

# Physical geometry, not filenames or nominal SliceThickness, orders the CT.
cache=C/'ct-hu.npy'; meta=C/'ct-physical.json';directory=S/'assets-src/imaging2/vhp-ct'
files=sorted(directory.glob('J.*.gz'));series_hash=hashlib.sha256()
for p in files:series_hash.update(p.name.encode());series_hash.update(hashlib.sha256(p.read_bytes()).digest())
source_hash=series_hash.hexdigest()
cached_hash=json.loads(meta.read_text()).get('aggregateGzipSha256') if meta.exists() else None
if not cache.exists() or cached_hash!=source_hash:
    entries=[]
    for p in files:
        raw=p.read_bytes()
        ds=pydicom.dcmread(io.BytesIO(gzip.decompress(raw)))
        iop=np.asarray(ds.ImageOrientationPatient,dtype=float);n=np.cross(iop[:3],iop[3:]);ipp=np.asarray(ds.ImagePositionPatient,dtype=float)
        pix=ds.pixel_array.astype(np.int16);slope=float(ds.RescaleSlope);inter=float(ds.RescaleIntercept)
        assert slope==1 and inter==-1200, 'Audit cache assumes this series rescale.'
        entries.append((float(ipp@n),pix-1200,{'file':p.name,'ipp':ipp.tolist(),'iop':iop.tolist(),'spacing':list(map(float,ds.PixelSpacing)),'thickness':float(ds.SliceThickness),'rows':int(ds.Rows),'cols':int(ds.Columns)}))
    if not entries:raise ValueError('No source CT slices were found. No atlas assets written.')
    entries.sort(key=lambda e:e[0]);ct_info={'sourceSliceCount':len(entries),'orderedGeometry':[e[2] for e in entries],'aggregateGzipSha256':source_hash}
    np.save(cache,np.stack([e[1] for e in entries]));meta.write_text(json.dumps(ct_info))
    print('CT decoded and physically ordered:',len(entries),flush=True)
ct=np.load(cache,mmap_mode='r');ct_info=json.loads(meta.read_text());geom=ct_info['orderedGeometry'];first=geom[0];last=geom[-1]
header=pydicom.dcmread(io.BytesIO(gzip.decompress((directory/first['file']).read_bytes())),stop_before_pixels=True)
iop=np.array(first['iop']);normal=np.cross(iop[:3],iop[3:]);ipps=np.array([g['ipp'] for g in geom]);projections=ipps@normal
step=(projections[-1]-projections[0])/(len(geom)-1)
L=np.eye(4);L[:3,0]=iop[:3]*first['spacing'][1];L[:3,1]=iop[3:]*first['spacing'][0];L[:3,2]=(ipps[-1]-ipps[0])/(len(geom)-1);L[:3,3]=ipps[0]
P_ct_bad=np.array([[1,0,0],[0,0,1],[0,1,0]])
P_ct_correct=np.array([[1,0,0],[0,0,1],[0,-1,0]])
P_mri=np.array([[-1,0,0],[0,0,1],[0,1,0]])
ct_m=json.loads((R/'src/assets/imaging/ct-manifest.json').read_text());mr_m=json.loads((R/'src/assets/imaging/mri-manifest.json').read_text())
ctA=affine(P_ct_bad,ct_m['registration']['constants']['scale'],ct_m['registration']['constants']['translateAu'],L)
mr_path=S/'assets-src/imaging/mri/sub-A006_T1w.nii.gz';nif=nib.load(mr_path);mr=np.asarray(nif.dataobj,dtype=np.float32)
mrA=affine(P_mri,mr_m['registration']['constants']['scale'],mr_m['registration']['constants']['translateAu'],nif.affine)
origin=np.array(mr_m['originAu']);spacing=np.array([54/44,100/80,82/66]);dims=np.array(mr_m['dims']);grid_high=origin+(dims-1)*spacing
grids={'MRI':np.fromfile(R/'src/assets/imaging/mri-t1.bin',dtype=np.uint8).reshape(tuple(dims[::-1])),
       'CT':np.fromfile(R/'src/assets/imaging/ct.bin',dtype=np.uint8).reshape(tuple(dims[::-1]))}

def sample_native(which,points,actual_positions=False):
    M=mrA if which=='MRI' else ctA;data=mr if which=='MRI' else ct
    vox=xform(np.linalg.inv(M),points)
    if which=='CT' and actual_positions:
        patient=xform(np.linalg.inv(affine(P_ct_bad,[1,1,1],[7,35,-30],np.eye(4))),points)
        vox[...,2]=np.interp(patient@normal,projections,np.arange(len(projections)),left=-1,right=len(projections))
    valid=np.all((vox>=0)&(vox<=np.array(data.shape if which=='MRI' else data.shape[::-1])-1),axis=-1)
    coords=vox.T if which=='MRI' else vox[:,::-1].T
    val=ndi.map_coordinates(data,coords,order=1,mode='constant',cval=0 if which=='MRI' else -1200,prefilter=False,output=np.float64)
    lo,hi=mr_m['intensity']['windowRawValues'] if which=='MRI' else ct_m['intensity']['window']
    value=np.floor(np.clip((val-lo)*255/(hi-lo),0,255)+.5)
    if which=='CT':value=np.maximum(1,value) # Archived baker reserves 0 for out of FOV.
    value[~valid]=0
    return value.astype(np.uint8),valid

def sample_grid(which,points):
    q=(points-origin)/np.array(mr_m['spacingAu']);valid=np.all((q>=0)&(q<=dims-1),axis=-1)
    val=ndi.map_coordinates(grids[which].astype(np.float32),q[:,::-1].T,order=1,mode='constant',cval=0,prefilter=False)
    return val,valid

# Confirm committed pixels are generated by the suspected transform, rather than
# inferring a baked file's orientation from comments alone.
kk,jj,ii=np.meshgrid(np.arange(0,dims[2],2),np.arange(0,dims[1],2),np.arange(0,dims[0],2),indexing='ij')
points=origin+np.stack([ii.ravel(),jj.ravel(),kk.ravel()],axis=1)*spacing
bake_checks={}
for which in ['CT','MRI']:
    predicted,valid=sample_native(which,points);stored=grids[which][kk.ravel(),jj.ravel(),ii.ravel()];d=np.abs(predicted.astype(float)-stored)
    bake_checks[which]={'stationsCompared':len(d),'fractionExact':float(np.mean(d==0)),'fractionWithinOneGrayLevel':float(np.mean(d<=1)),'meanAbsoluteGrayError':float(d.mean()),'maxGrayError':float(d.max()),'note':'CT uses the legacy averaged-position affine and reserves 0 for outside FOV; MRI manifest rounds its raw window limits.'}
    print(which,'independent bake check',bake_checks[which],flush=True)

# Native GLB node transforms are honored via trimesh; contours are computed with
# independent triangle/plane intersections, not the app's contour extractor.
manifest=json.loads((R/'src/assets/anatomy/anatomy-manifest.json').read_text());meshes={};coverage=[]
for part in manifest['parts']:
    scene=trimesh.load(R/'src/assets/anatomy'/part['file'],force='scene',process=False)
    vs=[];fs=[];offset=0
    for node in scene.graph.nodes_geometry:
        T,gname=scene.graph[node];g=scene.geometry[gname];v=xform(T,g.vertices);vs.append(v);fs.append(np.asarray(g.faces)+offset);offset+=len(v)
    v=np.concatenate(vs);f=np.concatenate(fs);meshes[part['slug']]=(v,f)
    ingrid=np.all((v>=origin)&(v<=grid_high),axis=1);mr_vox=xform(np.linalg.inv(mrA),v);ct_vox=xform(np.linalg.inv(ctA),v)
    coverage.append({'slug':part['slug'],'vertices':len(v),'minAu':v.min(0).tolist(),'maxAu':v.max(0).tolist(),'outsideBakedGridVertexFraction':float(np.mean(~ingrid)),'outsideNativeMRIFieldVertexFraction':float(np.mean(np.any((mr_vox<0)|(mr_vox>np.array(mr.shape)-1),axis=1))),'outsideNativeLegacyCTFieldVertexFraction':float(np.mean(np.any((ct_vox<0)|(ct_vox>np.array(ct.shape[::-1])-1),axis=1))),'note':'Vertex sampling, NOT a tissue-volume percentage or segmentation score.'})

colors={'ctx-hemisphere-l':'#aab7c8','ctx-hemisphere-r':'#aab7c8','ctx-pons-surface':'#00dded','ctx-midbrain-surface':'#ffa531','ctx-medulla-surface':'#5fe397','ctx-cerebellum-l':'#de7ff2','ctx-cerebellum-r':'#de7ff2','ctx-cerebellar-vermis':'#de7ff2','ctx-thalamus-l':'#ffeb66','ctx-thalamus-r':'#ffeb66','ctx-corpus-callosum':'#ffacbd','tel-lateral-ventricle-l':'#ffffff','tel-lateral-ventricle-r':'#ffffff','vent-fourth-ventricle':'#ffffff','vent-third-ventricle':'#ffffff','vent-cerebral-aqueduct':'#ffffff','ctx-hypothalamus-surface':'#e59265'}
limits=[[-58,58],[-55,116],[-76,72]];pair={0:(2,1),1:(0,2),2:(0,1)}
def lines(slug,axis,value):
    vertices,faces=meshes[slug];tri=vertices[faces];d=tri[:,:,axis]-value
    cuts=(d.min(1)<0)&(d.max(1)>0);tri=tri[cuts];d=d[cuts]
    counts=np.zeros(len(tri),dtype=int);segments=np.zeros((len(tri),2,3))
    for u,v in [(0,1),(1,2),(2,0)]:
        cross=(d[:,u]*d[:,v]<0);idx=np.where(cross)[0];t=d[idx,u]/(d[idx,u]-d[idx,v]);pts=tri[idx,u]+t[:,None]*(tri[idx,v]-tri[idx,u]);segments[idx,counts[idx]]=pts;counts[idx]+=1
    return segments[counts==2][:,:,list(pair[axis])]
def plane_points(axis,value,n=440):
    u,v=pair[axis];ur=limits[u];vr=limits[v];width=n;height=max(180,int(n*(vr[1]-vr[0])/(ur[1]-ur[0])))
    X,Y=np.meshgrid(np.linspace(*ur,width),np.linspace(*vr,height));pts=np.zeros((X.size,3));pts[:,axis]=value;pts[:,u]=X.ravel();pts[:,v]=Y.ravel()
    return pts,(height,width),[ur[0],ur[1],vr[0],vr[1]]
def panel(ax,which,axis,value,overlays=True,n=440):
    points,shape,extent=plane_points(axis,value,n);values,valid=sample_grid(which,points);image=values.reshape(shape)
    ax.imshow(image,origin='lower',extent=extent,cmap='gray',vmin=0,vmax=255,interpolation='nearest',aspect='equal')
    if overlays:
        for slug,color in colors.items():
            seg=lines(slug,axis,value)
            if len(seg):ax.add_collection(LineCollection(seg,colors=color,linewidths=.75,alpha=.9))
    u,v=pair[axis];ax.set_xlim(limits[u]);ax.set_ylim(limits[v]);ax.set_xlabel('xyz'[u]+' (atlas au)');ax.set_ylabel('xyz'[v]+' (atlas au)')
    directions={0:('P','A','S','I'),1:('R','L','A','P'),2:('R','L','S','I')}[axis]
    for (x,y),t in zip([(0,.5),(1,.5),(.5,1),(.5,0)],directions):ax.text(x,y,t,transform=ax.transAxes,ha='center',va='center',bbox={'facecolor':'#101b2a','edgecolor':'none','alpha':.7},color='#47cef5')
    return float(valid.mean()),float(np.mean(image>0))

legend='Contours: gray cortex | cyan pons | orange midbrain | green medulla | violet cerebellum | yellow thalamus | white CSF | pink callosum'
fig,axs=plt.subplots(1,3,figsize=(16,8));panel(axs[0],'MRI',0,3);axs[0].set_title('Public MRI / near sagittal x=+3 au')
panel(axs[1],'CT',0,3);axs[1].set_title('Archived CT / same atlas plane\nAnterior-posterior mapping is reversed')
# Correctly oriented source-space CT image, deliberately with no model overlay.
native_col=(3-7)*1.2;col=(native_col-first['ipp'][0])/first['spacing'][1]
native_kk,native_jj=np.meshgrid(np.arange(ct.shape[0]),np.arange(ct.shape[1]),indexing='ij')
arr=ndi.map_coordinates(ct,np.array([native_kk,native_jj,np.full(native_kk.shape,col)]),order=1,mode='nearest',prefilter=False,output=float)
native_x=- (first['ipp'][1]+np.arange(ct.shape[1])*first['spacing'][0]);order=np.argsort(native_x);arr=arr[:,order]
axs[2].imshow(arr,origin='lower',extent=[native_x.min(),native_x.max(),projections.min(),projections.max()],cmap='gray',vmin=-20,vmax=100,aspect='equal');axs[2].set_title('Original CT / correct patient orientation\nNo registration to model implied');axs[2].set_xlabel('Anterior (+A), patient mm');axs[2].set_ylabel('Superior (+S), patient mm')
fig.suptitle('Independent sagittal audit - registered overlays versus original CT',fontsize=17);fig.text(.5,.035,legend,ha='center',fontsize=9);fig.text(.5,.012,'CT: Courtesy of the U.S. National Library of Medicine. MRI: OpenNeuro ds007313 v1.0.0 (CC0). Teaching model; not a diagnostic validation.',ha='center',fontsize=9);fig.tight_layout(rect=(0,.06,1,.94));fig.savefig(O/'sagittal-overview.png',dpi=155);plt.close(fig)

levels=json.loads((R/'src/data/levels.json').read_text());section_metrics=[]
def label(text):return text.replace('â€”','-').replace('â€“','-').replace('—','-').replace('–','-')
for page,start in enumerate(range(0,len(levels),6),1):
    group=levels[start:start+6];fig,axs=plt.subplots(len(group),2,figsize=(12,3.55*len(group)),squeeze=False)
    for row,lev in enumerate(group):
        for c,which in enumerate(['MRI','CT']):
            valid,nonzero=panel(axs[row,c],which,1,lev['y'],n=400);axs[row,c].set_title(textwrap.fill(f"{which} | {label(lev['name'])} | y={lev['y']:+g}",width=48),fontsize=10)
            source_vals,native_valid=sample_native(which,plane_points(1,lev['y'],180)[0])
            section_metrics.append({'level':lev['id'],'name':label(lev['name']),'yAu':lev['y'],'modality':which,'bakedFieldFractionOfAtlasPlane':valid,'nativeFieldFractionOfAtlasPlane':float(native_valid.mean()),'nonzeroDisplayFractionOfAtlasPlane':nonzero,'note':'Field/intensity coverage, not segmented brain agreement.'})
    fig.suptitle(f'All teaching levels - current transforms ({page}/3)',fontsize=17);fig.text(.5,.018,'CT: Courtesy of the U.S. National Library of Medicine. Archived orientation/placement FAILS; no CT is offered in the live app.',ha='center',fontsize=9);fig.tight_layout(rect=(0,.035,1,.97));fig.savefig(O/f'teaching-levels-{page}.png',dpi=120);plt.close(fig)

fig,axs=plt.subplots(3,2,figsize=(12,17))
for row,value in enumerate([-30,0,30]):
    for c,which in enumerate(['MRI','CT']):panel(axs[row,c],which,2,value,n=440);axs[row,c].set_title(f'{which} | coronal z={value:+g} au')
fig.suptitle('Coronal audit - no independent per-plane warps',fontsize=17);fig.text(.5,.015,'CT: Courtesy of the U.S. National Library of Medicine. Images show existing archived transform, not an accepted alignment.',ha='center',fontsize=9);fig.tight_layout(rect=(0,.03,1,.97));fig.savefig(O/'coronal-overview.png',dpi=135);plt.close(fig)

fig,axs=plt.subplots(2,2,figsize=(12,13))
for row,value in enumerate([-15,15]):
    for col,which in enumerate(['MRI','CT']):panel(axs[row,col],which,0,value,n=500);axs[row,col].set_title(f'{which} | parasagittal x={value:+g} au')
fig.suptitle('Parasagittal audit - off-midline structural correspondence',fontsize=17);fig.text(.5,.015,'CT: Courtesy of the U.S. National Library of Medicine. Existing transforms only. White = ventricle; yellow = thalamus.',ha='center',fontsize=9);fig.tight_layout(rect=(0,.03,1,.95));fig.savefig(O/'parasagittal-overview.png',dpi=135);plt.close(fig)

# Is missing cortex solely a bake crop? Show the unbaked MRI with exactly the
# existing affine. This is a diagnostic visualization, not a new fitted warp.
fig,axs=plt.subplots(1,2,figsize=(12,8));panel(axs[0],'MRI',0,3,n=620);axs[0].set_title('Current public MRI grid\nNear sagittal x=+3 au')
points,shape,extent=plane_points(0,3,620);vals,valid=sample_native('MRI',points)
axs[1].imshow(vals.reshape(shape),origin='lower',extent=extent,cmap='gray',vmin=0,vmax=255,aspect='equal')
for slug,color in colors.items():
    seg=lines(slug,0,3)
    if len(seg):axs[1].add_collection(LineCollection(seg,colors=color,linewidths=.75))
axs[1].set_xlim(limits[2]);axs[1].set_ylim(limits[1]);axs[1].set_xlabel('z (atlas au; anterior to right)');axs[1].set_ylabel('y (atlas au; superior up)');axs[1].set_title('Original MRI, SAME existing affine\nNo refit; not a proposed deployment')
for ax in axs:ax.axhline(grid_high[1],color='#ed596b',ls='--',lw=1);ax.text(-70,grid_high[1]+2,'Baked MRI ceiling +85 au',color='#ed596b',fontsize=9)
fig.suptitle('MRI coverage audit - existing affine versus cropped bake',fontsize=17);fig.text(.5,.027,legend,ha='center',fontsize=8);fig.text(.5,.006,'MRI: OpenNeuro ds007313 v1.0.0 (CC0). A model contour is not a source segmentation.',ha='center',fontsize=9);fig.tight_layout(rect=(0,.055,1,.94));fig.savefig(O/'mri-field-extension.png',dpi=155);plt.close(fig)

# Correctly oriented, uncropped CT axial source review. Actual per-slice IPP is
# used here, and no model transform is optimized or applied to these images.
fig,axs=plt.subplots(2,3,figsize=(14,10))
patient_L=first['ipp'][0]+np.arange(ct.shape[2])*first['spacing'][1]
patient_A=-(first['ipp'][1]+np.arange(ct.shape[1])*first['spacing'][0]);ap_order=np.argsort(patient_A)
for ax,superior in zip(axs.ravel(),[-170,-150,-130,-110,-70.8,-10]):
    k=float(np.interp(superior,projections,np.arange(len(projections))));lo=int(np.floor(k));t=k-lo
    im=(1-t)*np.asarray(ct[lo],dtype=float)+t*np.asarray(ct[min(lo+1,ct.shape[0]-1)],dtype=float)
    ax.imshow(im[ap_order,:],origin='lower',extent=[patient_L.min(),patient_L.max(),patient_A.min(),patient_A.max()],cmap='gray',vmin=-20,vmax=100,aspect='equal')
    ax.set_xlabel('Patient left (+L), mm');ax.set_ylabel('Patient anterior (+A), mm');ax.set_xlim([-105,95]);ax.set_ylim([-185,20])
    ax.set_title(f'Original CT S={superior:g} mm'+('\nLegacy atlas PMJ y=-24 samples HERE' if superior==-70.8 else ''))
fig.suptitle('Original CT in correct patient coordinates - actual slice positions',fontsize=17);fig.text(.5,.015,'Courtesy of the U.S. National Library of Medicine. This is an archived, visibly artifact-affected source; no clinical diagnosis inferred.',ha='center',fontsize=9);fig.tight_layout(rect=(0,.035,1,.95));fig.savefig(O/'ct-source-axial.png',dpi=135);plt.close(fig)

# CT position fidelity: compare the legacy uniform-step assumption with actual
# ImagePositionPatient. This is a secondary, small error, independent of the AP
# reflection and much larger global placement problem.
ct_legacy,ct_valid=sample_native('CT',points)
ct_physical,ct_valid2=sample_native('CT',points,actual_positions=True)
ct_slice_check={'comparisonPlane':'near-sagittal x=+3 au','sampleCount':len(points),'meanAbsoluteGrayDifference':float(np.abs(ct_legacy.astype(float)-ct_physical).mean()),'note':'Physical-position interpolation versus legacy mean spacing; gray differences are not anatomical error.'}

def bounds(A,shape):
    import itertools
    pts=np.array(list(itertools.product(*[(0,n-1) for n in shape])));pts=xform(A,pts)
    return {'min':pts.min(0).tolist(),'max':pts.max(0).tolist()}
steps=np.diff(projections);linear_pred=projections[0]+np.arange(len(projections))*step
revision=subprocess.run(['git','-C',str(R),'rev-parse','HEAD'],capture_output=True,text=True,check=True).stdout.strip()
lps_example=np.array([12,24,36]);expected=P_ct_correct@lps_example/1.2;legacy=P_ct_bad@lps_example/1.2;mri_equiv=P_mri@np.array([-12,-24,36])/1.2
results={'generatedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'repositoryRevisionAtRun':revision,'purpose':'Registration review only. No live assets rewritten.','canonicalFrame':{'x':'+patient left','y':'+superior','z':'+anterior','declaredMmPerAu':1.2,'note':'Teaching coordinates, not MNI, Talairach or a verified patient reference.'},
 'orientationUnitCheck':{'patientLpsMm':lps_example.tolist(),'expectedCanonicalAu':expected.tolist(),'legacyCTCanonicalAu':legacy.tolist(),'MRIEquivalentRasCanonicalAu':mri_equiv.tolist(),'legacyCTPass':bool(np.allclose(expected,legacy)),'MRIEquivalentPass':bool(np.allclose(expected,mri_equiv))},
 'CT':{'sliceCount':len(geom),'dimensionsVoxelXYZ':list(ct.shape[::-1]),'patientPosition':str(header.get('PatientPosition','not recorded')),'anatomicalOrientationType':str(header.get('AnatomicalOrientationType','absent; DICOM specifies BIPED convention')),'iop':iop.tolist(),'pixelSpacingMm':first['spacing'],'firstIppMm':first['ipp'],'lastIppMm':last['ipp'],'sliceThicknessMm':first['thickness'],'uniqueAdjacentStepsMm':np.unique(np.round(steps,6)).tolist(),'averagedSliceStepMm':float(step),'maxAveragedPositionErrorMm':float(np.max(np.abs(projections-linear_pred))),'nonuniformStepCount':int(np.sum(abs(steps-step)>.01)),'duplicatePositionCount':int(np.sum(steps==0)),'consistentIop':all(np.allclose(g['iop'],iop) for g in geom),'consistentPixelSpacing':all(np.allclose(g['spacing'],first['spacing']) for g in geom),'legacyVoxToCanonical':ctA.tolist(),'legacyNativeFieldBoundsAu':bounds(ctA,ct.shape[::-1]),'aggregateGzipSha256':ct_info['aggregateGzipSha256'],'source':'https://data.lhncbc.nlm.nih.gov/public/Visible-Human/Additional-Head-Images/MR_CT_DICOM/CAT/','credit':'Courtesy of the U.S. National Library of Medicine','warning':'Archived CT affine reverses AP. Full CT source superior extent ending at y=36.667 under this translation is NOT proof the scan omits the upper head.'},
 'MRI':{'dimensionsVoxelXYZ':list(mr.shape),'niftiAxisCodes':list(nib.aff2axcodes(nif.affine)),'qformCode':int(nif.header['qform_code']),'sformCode':int(nif.header['sform_code']),'nativeVoxToRasMm':nif.affine.tolist(),'nativeVoxToCanonical':mrA.tolist(),'nativeFieldBoundsAu':bounds(mrA,mr.shape),'sourceFileSha256':sha(mr_path),'source':'https://openneuro.org/datasets/ds007313/versions/1.0.0','license':'CC0','subjectRelationToCT':'Different source/subject; not paired acquisitions.','affineCaution':'Unequal scales [1,1.25,1.6] preserve axes but deform anatomy, tuned to stylized brainstem, not independently validated globally.'},
 'bakedGrid':{'dimensionsVoxelXYZ':dims.tolist(),'originAu':origin.tolist(),'exactBakerSpacingAu':spacing.tolist(),'consumerManifestSpacingAu':mr_m['spacingAu'],'boundsAu':{'min':origin.tolist(),'max':grid_high.tolist()},'maxEndStationRoundingDisplacementAu':float(np.max(abs((np.array(mr_m['spacingAu'])-spacing)*(dims-1)))),'ctSha256':sha(R/'src/assets/imaging/ct.bin'),'mriSha256':sha(R/'src/assets/imaging/mri-t1.bin')},
 'independentBakeChecks':bake_checks,'ctNonuniformSliceComparison':ct_slice_check,'meshFieldChecks':coverage,'allTeachingLevelCoverage':section_metrics,
 'limits':['CT windowed grayscale threshold is not a brain segmentation.','No Dice/IoU is reported as anatomical accuracy.','Nuclei, tracts and small nerves cannot be established from these CT overlays.','MRI and CT are different subjects; correspondence must use homologous macro landmarks.','Overlay inspection is not clinical validation or population morphometry.']}
put('measurements.json',results)
print(json.dumps({'CT':{k:results['CT'][k] for k in ['sliceCount','uniqueAdjacentStepsMm','maxAveragedPositionErrorMm','legacyNativeFieldBoundsAu']},'MRIField':results['MRI']['nativeFieldBoundsAu'],'cortexCoverage':[c for c in coverage if 'hemisphere' in c['slug']]},indent=2),flush=True)
