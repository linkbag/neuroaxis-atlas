"""Recompute a constrained diagonal affine from recorded manual observations.

This checks arithmetic reproducibility, not the correctness of a manual pick.
No image assets are written. Dependencies: numpy, scipy.
"""
import argparse, json, pathlib
import numpy as np
from scipy.optimize import least_squares

def recompute(record):
    frame=record['sourceFrame']
    p=np.array([[-1,0,0],[0,0,1],[0,1,0]]) if frame=='RAS' else np.array([[1,0,0],[0,0,1],[0,-1,0]])
    if frame not in ['RAS','LPS']:raise ValueError('Expected RAS or LPS')
    ref=record['fitReference'];rs=np.array(ref['scale']);rt=np.array(ref['translateAu'])
    rows=record['observations']
    source=np.array([p@np.array(r['sourcePointMm'])/1.2*rs+rt for r in rows])
    def residual(par):
        rr=[]
        for s,r in zip(source,rows):
            if r['split']!='fit':continue
            diff=s*par[:3]+par[3:]-r['targetAu'];mask=np.array(r['componentMask'],bool)
            rr.extend(diff[mask]/r['uncertaintyAu'])
        rr.extend((par[:3]-1)/record['regularization']['scaleSigma'])
        rr.extend(par[3:]/record['regularization']['translationSigmaAu'])
        return rr
    bounds=record['boundsRelativeToBaseline']
    lo=[b[0] for b in bounds['scale']]+[b[0] for b in bounds['translationAu']]
    hi=[b[1] for b in bounds['scale']]+[b[1] for b in bounds['translationAu']]
    fit=least_squares(residual,[1,1,1,0,0,0],bounds=(lo,hi),loss='linear',xtol=1e-12,ftol=1e-12,gtol=1e-12)
    q=fit.x
    reg={'scale':(rs*q[:3]).round(8).tolist(),'rotDeg':{'x':0,'y':0,'z':0},'translateAu':(rt*q[:3]+q[3:]).round(8).tolist()}
    results=[]
    for s,r in zip(source,rows):
        mask=np.array(r['componentMask'],bool);diff=(s*q[:3]+q[3:]-r['targetAu'])[mask]
        results.append({'id':r['id'],'split':r['split'],'region':r['region'],'candidateResidualAu':float(np.linalg.norm(diff))})
    return reg,results

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--record',type=pathlib.Path,required=True);a=ap.parse_args()
    record=json.loads(a.record.read_text(encoding='utf-8-sig'));reg,results=recompute(record)
    expected=record['candidate']
    assert np.allclose(reg['scale'],expected['scale'],atol=1e-7,rtol=0)
    assert np.allclose(reg['translateAu'],expected['translateAu'],atol=1e-7,rtol=0)
    print(json.dumps({'recomputed':reg,'observations':results},indent=2))
