"""Independent source resampling, field checks and candidate review figures.
Raw CT cache must be outside Git. No application assets are changed.
Requires the optional requirements-registration.txt packages.
"""
import argparse, pathlib, json, hashlib, subprocess, itertools, io, gzip
import numpy as np
import nibabel as nib
import pydicom
import scipy.ndimage as ndi
import trimesh
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection

ap=argparse.ArgumentParser()
for name in ['repo','sources','cache-dir','extension','out']:ap.add_argument('--'+name,type=pathlib.Path,required=True)
ap.add_argument('--baseline-ref',default='89e5f655043817a328915adfad0c8bd3a10485e1')
a=ap.parse_args();R=a.repo.resolve();S=a.sources.resolve();C=a.cache_dir.resolve();O=a.out.resolve();E=a.extension.resolve()
if C.is_relative_to(R) or E.is_relative_to(R):raise ValueError('Raw cache and extension scratch must be outside Git.')
O.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def js(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def old_bytes(path):return subprocess.check_output(['git','-C',str(R),'show',a.baseline_ref+':'+path])
def xf(m,p):return np.asarray(p)@m[:3,:3].T+m[:3,3]
Pmr=np.array([[-1,0,0],[0,0,1],[0,1,0]]);Pct=np.array([[1,0,0],[0,0,1],[0,-1,0]])
def patient_affine(reg,P):
    assert all(v==0 for v in reg['rotDeg'].values()),'This evaluator expects the fixed-zero-rotation candidate.'
    m=np.eye(4);m[:3,:3]=np.diag(reg['scale'])@P/1.2;m[:3,3]=reg['translateAu'];return m

mr_m=js(R/'src/assets/imaging/mri-manifest.json');ct_m=js(R/'src/assets/imaging/ct-manifest.json');old_m=json.loads(old_bytes('src/assets/imaging/mri-manifest.json'));old_ct=json.loads(old_bytes('src/assets/imaging/ct-manifest.json'));ext_m=js(E/'mri-manifest.json')
source_path=S/'assets-src/imaging/mri/sub-A006_T1w.nii.gz';nif=nib.load(source_path);mr=np.asarray(nif.dataobj,dtype=np.float64)
assert sha(source_path)==mr_m['sourceGeometry']['sha256']
mrA=patient_affine(mr_m['registration']['constants'],Pmr)@nif.affine
oldMrA=patient_affine(old_m['registration']['constants'],Pmr)@nif.affine
ct=np.load(C/'ct-hu.npy',mmap_mode='r');geom=js(C/'ct-physical.json');g=geom['orderedGeometry']
ss=S/'assets-src/imaging2/vhp-ct';hh=hashlib.sha256()
for p in sorted(ss.glob('J.*.gz')):hh.update(p.name.encode());hh.update(hashlib.sha256(p.read_bytes()).digest())
assert hh.hexdigest()==geom['aggregateGzipSha256']==ct_m['sourceGeometry']['aggregateGzipSha256']
ipps=np.array([row['ipp'] for row in g]);iop=np.array(g[0]['iop']);normal=np.cross(iop[:3],iop[3:]);proj=ipps@normal
assert np.allclose(ipps[:,:2],ipps[0,:2]),'This independent evaluator expects this source series fixed in-plane origins.'
# Re-decode selected source planes with pydicom, including both physical gaps.
for k in [0,100,200,449,450,451,462]:
    ds=pydicom.dcmread(io.BytesIO(gzip.decompress((ss/g[k]['file']).read_bytes())))
    hu=ds.pixel_array.astype(np.int16)*float(ds.RescaleSlope)+float(ds.RescaleIntercept)
    assert np.array_equal(hu,ct[k]);assert np.allclose(ds.ImagePositionPatient,ipps[k])
ctA=patient_affine(ct_m['registration']['constants'],Pct)

def grid(man,data):return {'m':man,'data':np.frombuffer(data,dtype=np.uint8).reshape(tuple(man['dims'][::-1]))}
grids={'published':grid(old_m,old_bytes('src/assets/imaging/mri-t1.bin')),
       'extension':grid(ext_m,(E/'mri-t1.bin').read_bytes()),
       'MRI':grid(mr_m,(R/'src/assets/imaging/mri-t1.bin').read_bytes()),
       'CT':grid(ct_m,(R/'src/assets/imaging/ct.bin').read_bytes()),
       'oldCT':grid(old_ct,old_bytes('src/assets/imaging/ct.bin'))}
def grid_sample(key,p):
    gr=grids[key];m=gr['m'];q=(p-np.array(m['originAu']))/np.array(m['spacingAu']);valid=np.all((q>=0)&(q<=np.array(m['dims'])-1),axis=1)
    val=ndi.map_coordinates(gr['data'].astype(np.float32),q[:,::-1].T,order=1,mode='constant',cval=0,prefilter=False)
    return val,valid

def source_sample(which,p):
    if which=='MRI':
        q=xf(np.linalg.inv(mrA),p);valid=np.all((q>=0)&(q<=np.array(mr.shape)-1),axis=1)
        v=ndi.map_coordinates(mr,q.T,order=1,prefilter=False,mode='constant',cval=0)
        lo,hi=mr_m['intensity']['windowRawValues']
    else:
        physical=xf(np.linalg.inv(ctA),p);k=np.interp(physical@normal,proj,np.arange(len(proj)),left=-1,right=len(proj))
        delta=physical-ipps[0];x=delta@iop[:3]/g[0]['spacing'][1];y=delta@iop[3:]/g[0]['spacing'][0];q=np.column_stack([k,y,x])
        valid=np.all((q>=0)&(q<=np.array(ct.shape)-1),axis=1)
        v=ndi.map_coordinates(ct,q.T,order=1,prefilter=False,mode='constant',cval=-1200,output=float)
        lo,hi=ct_m['intensity']['window']
    v=np.floor(np.clip((v-lo)*255/(hi-lo),0,255)+.5)
    if which=='CT':v=np.maximum(1,v)
    v[~valid]=0
    return v.astype(np.uint8),valid

bake_checks={}
for which,m in [('MRI',mr_m),('CT',ct_m)]:
    dims=np.array(m['dims']);kk,jj,ii=np.meshgrid(np.arange(0,dims[2],2),np.arange(0,dims[1],2),np.arange(0,dims[0],2),indexing='ij')
    p=np.array(m['originAu'])+np.column_stack([ii.ravel(),jj.ravel(),kk.ravel()])*np.array(m['spacingAu'])
    source,valid=source_sample(which,p);stored=grids[which]['data'][kk.ravel(),jj.ravel(),ii.ravel()];d=abs(source.astype(float)-stored)
    bake_checks[which]={'stationsCompared':len(d),'fractionExact':float(np.mean(d==0)),'fractionWithinOneGrayLevel':float(np.mean(d<=1)),'maximumGrayDifference':float(d.max())}
    assert d.max()<=1,f'{which} independent source resampling differs from the committed bake'
    print(which,bake_checks[which],flush=True)
offset=np.rint((np.array(old_m['originAu'])-ext_m['originAu'])/np.array(ext_m['spacingAu'])).astype(int);od=old_m['dims']
sub=grids['extension']['data'][offset[2]:offset[2]+od[2],offset[1]:offset[1]+od[1],offset[0]:offset[0]+od[0]]
assert np.array_equal(sub,grids['published']['data'])
crop_check={'stationsCompared':int(sub.size),'changedStations':int(np.count_nonzero(sub!=grids['published']['data'])),'maximumGrayDifference':int(abs(sub.astype(int)-grids['published']['data']).max())}

manifest=js(R/'src/assets/anatomy/anatomy-manifest.json');meshes={};coverage=[];geometry_changed=[]
for part in manifest['parts']:
    path=R/'src/assets/anatomy'/part['file'];raw=path.read_bytes()
    if raw!=old_bytes('src/assets/anatomy/'+part['file']):geometry_changed.append(part['slug'])
    scene=trimesh.load(io.BytesIO(raw),file_type='glb',force='scene',process=False);vs=[];fs=[];off=0
    for node in scene.graph.nodes_geometry:
        T,gn=scene.graph[node];mesh=scene.geometry[gn];v=xf(T,mesh.vertices);vs.append(v);fs.append(mesh.faces+off);off+=len(v)
    v=np.concatenate(vs);f=np.concatenate(fs);meshes[part['slug']]=(v,f)
    item={'slug':part['slug'],'vertices':len(v),'minAu':v.min(0).tolist(),'maxAu':v.max(0).tolist()}
    for name,m in [('published',old_m),('candidate',mr_m)]:
        low=np.array(m['originAu']);high=low+(np.array(m['dims'])-1)*np.array(m['spacingAu']);item[name+'OutsideGridVertexFraction']=float(np.mean(np.any((v<low)|(v>high),axis=1)))
    for name,M in [('publishedMRI',oldMrA),('candidateMRI',mrA)]:
        vox=xf(np.linalg.inv(M),v);item[name+'OutsideSourceFovVertexFraction']=float(np.mean(np.any((vox<0)|(vox>np.array(mr.shape)-1),axis=1)))
    coverage.append(item)
assert not geometry_changed,'Anatomy geometry changed during the registration work'

colors={'ctx-hemisphere-l':'#a8b8cd','ctx-hemisphere-r':'#a8b8cd','ctx-pons-surface':'#00deed','ctx-midbrain-surface':'#ffab31','ctx-medulla-surface':'#5be697','ctx-cerebellum-l':'#d979ee','ctx-cerebellum-r':'#d979ee','ctx-cerebellar-vermis':'#d979ee','ctx-corpus-callosum':'#ffa0ba','tel-lateral-ventricle-l':'white','tel-lateral-ventricle-r':'white','vent-fourth-ventricle':'white','vent-third-ventricle':'white','vent-cerebral-aqueduct':'white','ctx-thalamus-l':'#ffeb66','ctx-thalamus-r':'#ffeb66'}
pair={0:(2,1),1:(0,2),2:(0,1)};limits=[[-58,58],[-55,116],[-76,72]]
def segments(slug,axis,value):
    v,f=meshes[slug];t=v[f];d=t[:,:,axis]-value;k=(d.min(1)<0)&(d.max(1)>0);t=t[k];d=d[k];count=np.zeros(len(t),int);seg=np.zeros((len(t),2,3))
    for u,v in [(0,1),(1,2),(2,0)]:
        ids=np.flatnonzero(d[:,u]*d[:,v]<0);fraction=d[ids,u]/(d[ids,u]-d[ids,v]);seg[ids,count[ids]]=t[ids,u]+fraction[:,None]*(t[ids,v]-t[ids,u]);count[ids]+=1
    return seg[count==2][:,:,list(pair[axis])]
def points(axis,value,n=400):
    u,v=pair[axis];xr,yr=limits[u],limits[v];h=int(n*(yr[1]-yr[0])/(xr[1]-xr[0]));xx,yy=np.meshgrid(np.linspace(*xr,n),np.linspace(*yr,h));p=np.zeros((xx.size,3));p[:,axis]=value;p[:,u]=xx.ravel();p[:,v]=yy.ravel();return p,xx.shape,[*xr,*yr]
def panel(ax,key,axis,value):
    p,shape,ext=points(axis,value);vals,valid=grid_sample(key,p);ax.imshow(vals.reshape(shape),origin='lower',extent=ext,cmap='gray',vmin=0,vmax=255,aspect='equal')
    for slug,color in colors.items():
        seg=segments(slug,axis,value)
        if len(seg):ax.add_collection(LineCollection(seg,colors=color,linewidths=.65,alpha=.95))
    u,v=pair[axis];ax.set_xlim(limits[u]);ax.set_ylim(limits[v]);ax.set_xlabel('xyz'[u]+' (atlas au)');ax.set_ylabel('xyz'[v]+' (atlas au)')
    dirs={0:('P','A','S','I'),1:('R','L','A','P'),2:('R','L','S','I')}[axis]
    for xy,label in zip([(0,.5),(1,.5),(.5,1),(.5,0)],dirs):ax.text(*xy,label,transform=ax.transAxes,color='#48cdf3',ha='center',va='center',bbox={'facecolor':'#111c2b','edgecolor':'none','alpha':.7})
    return float(valid.mean())
plt.rcParams.update({'figure.facecolor':'#101b2a','axes.facecolor':'#040b13','text.color':'#e3edf7','axes.labelcolor':'#c3d1df','xtick.color':'#a3b4c9','ytick.color':'#a3b4c9','axes.edgecolor':'#476078','font.size':10,'savefig.facecolor':'#101b2a'})
legend='Unchanged contours: cortex gray | pons cyan | midbrain orange | medulla green | cerebellum violet | callosum pink | CSF white'
figures=[]
def save(fig,name,title,ct=False):
    height=fig.get_size_inches()[1]
    fig.suptitle(title,fontsize=15);fig.text(.5,.49/height,legend,ha='center',fontsize=8)
    credit='MRI: OpenNeuro ds007313 v1.0.0 (CC0). Teaching correspondence only; not clinical registration.'
    if ct:credit+='\nCT: Courtesy of the U.S. National Library of Medicine. Provisional teaching alignment; owner review pending.'
    fig.text(.5,.12/height,credit,ha='center',fontsize=8);fig.tight_layout(rect=(0,1/height,1,.94));fig.savefig(O/name,dpi=145);plt.close(fig);figures.append({'file':name,'title':title})
for axis,value,name,title in [(0,3,'mri-sagittal.png','MRI sagittal comparison (x=+3 au)'),(2,0,'mri-coronal.png','MRI coronal comparison (z=0 au)'),(0,12,'mri-parasagittal.png','MRI parasagittal comparison (x=+12 au)')]:
    fig,axs=plt.subplots(1,3,figsize=(17,8))
    for ax,key,label in zip(axs,['published','extension','MRI'],['Published / cropped','Crop-only extension / same affine','Candidate / global 3D affine']):panel(ax,key,axis,value);ax.set_title(label,fontsize=11)
    save(fig,name,title)
fig,axs=plt.subplots(1,2,figsize=(13,8))
for ax,key,label in zip(axs,['oldCT','CT'],['Archived / AP reflection and old placement','Correct physical axes / provisional global fit']):panel(ax,key,0,3);ax.set_title(label,fontsize=11)
save(fig,'ct-sagittal.png','Provisional CT correction (x=+3 au)',True)
levels=js(R/'src/data/levels.json');teaching=[]
for page,start in enumerate(range(0,len(levels),6),1):
    group=levels[start:start+6];fig,axs=plt.subplots(len(group),2,figsize=(12,len(group)*3.55),squeeze=False)
    for row,level in enumerate(group):
        for col,key in enumerate(['MRI','CT']):
            frac=panel(axs[row,col],key,1,level['y']);axs[row,col].set_title(f'{key} | {level["name"]} | y={level["y"]:+g}',fontsize=9)
            teaching.append({'level':level['id'],'yAu':level['y'],'modality':key,'gridCoverageFraction':frac,'note':'Field coverage, not brain segmentation agreement.'})
    save(fig,f'teaching-levels-{page}.png',f'Candidate MRI / provisional CT - teaching levels ({page}/3)',True)
fig,axs=plt.subplots(2,2,figsize=(12,10))
for row,y in enumerate([100,110]):
    for col,key in enumerate(['published','MRI']):panel(axs[row,col],key,1,y);axs[row,col].set_title(f'{key} / upper cortex y={y}')
save(fig,'upper-cortex-coverage.png','Upper MRI coverage: old image ceiling removed')

record=js(R/'docs/audit/2026-10-04-registration-candidate/mri-landmarks.json')
groups={}
for region in sorted(set(r['region'] for r in record['observations'])):
    rr=[r for r in record['observations'] if r['region']==region]
    groups[region]={'observations':len(rr),'meanBeforeAu':float(np.mean([r['baselineResidualAu'] for r in rr])),'meanCandidateAu':float(np.mean([r['candidateResidualAu'] for r in rr])),'note':'Mixed component observations, not clinical target-registration error.'}
results={'schemaVersion':1,'baselineRevision':a.baseline_ref,'candidateBaseRevision':subprocess.check_output(['git','-C',str(R),'rev-parse','HEAD'],text=True).strip(),
    'sourceHashes':{'MRI':sha(source_path),'CT':hh.hexdigest()},'bakedHashes':{'MRI':sha(R/'src/assets/imaging/mri-t1.bin'),'CT':sha(R/'src/assets/imaging/ct.bin')},
    'independentBakeChecks':bake_checks,'cropOnlyExtension':crop_check,'meshFieldChecks':coverage,'geometryChangedSlugs':geometry_changed,'mriRegionObservations':groups,
    'teachingLevelCoverage':teaching,'figures':figures,'limits':['Vertex fractions are not tissue-volume fractions.','Acquisition FOV is not segmented brain agreement.','Manual picks are approximate and not independent expert annotations.','MRI and CT are different subjects; no paired cross-modality validation is claimed.','Fine nuclei, tracts and cortical areal borders are not verified on this downsampled T1 or artifact-affected CT.']}
(O/'measurements.json').write_text(json.dumps(results,indent=2,allow_nan=False)+'\n')
print('Crop-only station check:',crop_check,flush=True)
print('Cortex coverage:',json.dumps([r for r in coverage if 'hemisphere' in r['slug']],indent=2),flush=True)
