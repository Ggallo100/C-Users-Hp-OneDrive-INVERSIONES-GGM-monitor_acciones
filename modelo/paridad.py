"""Reagrega compacto.json igual que el motor JS y compara con él."""
import json
import os, numpy as np
from estimar import Modelo, k_betabinom, k_dirichlet, LAG_MAX, siguiente

AQUI = os.path.dirname(os.path.abspath(__file__))

D = json.load(open(os.path.join(AQUI, 'compacto.json'), encoding='utf-8'))
LAM, LAMN, FK = 0.65, 0.30, 1.0   # los mismos hiperparametros que usa el HTML
tmax=len(D['periodos'])-1
NT=len(D['turnos']); ND=len(D['deltas']); NM=len(D['modalidades'])

def acum(filas, ini, largo, keyf, lam, ipos):
    m={}
    for f in filas:
        k=keyf(f); w=lam**(tmax-f[ipos])
        a=m.setdefault(k,[0.0]*largo)
        for i in range(largo): a[i]+=f[ini+i]*w
    return m

# continuación: [is,ic,im,ci,pa,ip, n0..3, k0..3]
celda=acum(D['cont'],6,2*LAG_MAX,lambda f:f"{f[0]}|{f[1]}|{f[2]}|{f[3]}|{f[4]}",LAM,5)
carr =acum(D['cont'],6,2*LAG_MAX,lambda f:f"{f[1]}|{f[2]}|{f[3]}|{f[4]}",LAM,5)
moda =acum(D['cont'],6,2*LAG_MAX,lambda f:f"{f[2]}|{f[3]}|{f[4]}",LAM,5)
cipar=acum(D['cont'],6,2*LAG_MAX,lambda f:f"{f[3]}|{f[4]}",LAM,5)
cic  =acum(D['cont'],6,2*LAG_MAX,lambda f:f"{f[3]}",LAM,5)
glob=[0.0]*(2*LAG_MAX)
for f in D['cont']:
    w=LAM**(tmax-f[5])
    for i in range(2*LAG_MAX): glob[i]+=f[6+i]*w
ks={}
for nom,m in [('celda',celda),('carrera',carr),('moda',moda),('ciclopar',cipar),('ciclo',cic)]:
    ks[nom]=[k_betabinom([a[LAG_MAX+L] for a in m.values()],[a[L] for a in m.values()])*FK
             for L in range(LAG_MAX)]
# avance: [ic,im,ci,ip, d...]
avc =acum(D['av'],4,ND,lambda f:f"{f[0]}|{f[1]}|{f[2]}",LAM,3)
avm =acum(D['av'],4,ND,lambda f:f"{f[1]}|{f[2]}",LAM,3)
avci=acum(D['av'],4,ND,lambda f:f"{f[2]}",LAM,3)
avg=[0.0]*ND
for f in D['av']:
    w=LAM**(tmax-f[3])
    for i in range(ND): avg[i]+=f[4+i]*w
# turno: [is,im,ci,it,ip, dest...]
tuc=acum(D['tu'],5,NT,lambda f:f"{f[0]}|{f[1]}|{f[2]}|{f[3]}",LAM,4)
tum=acum(D['tu'],5,NT,lambda f:f"{f[0]}|{f[1]}|{f[3]}",LAM,4)
tus=acum(D['tu'],5,NT,lambda f:f"{f[0]}|{f[3]}",LAM,4)
# nuevos turno: [is,ic,im,ci,pa,ip, dest...]
ntc =acum(D['nt'],6,NT,lambda f:f"{f[0]}|{f[1]}|{f[2]}|{f[3]}|{f[4]}",LAMN,5)
ntcmp=acum(D['nt'],6,NT,lambda f:f"{f[0]}|{f[1]}|{f[2]}|{f[4]}",LAMN,5)
ntcm=acum(D['nt'],6,NT,lambda f:f"{f[0]}|{f[1]}|{f[2]}",LAMN,5)
ntsmp=acum(D['nt'],6,NT,lambda f:f"{f[0]}|{f[2]}|{f[4]}",LAMN,5)
ntsm=acum(D['nt'],6,NT,lambda f:f"{f[0]}|{f[2]}",LAMN,5)
ntse=acum(D['nt'],6,NT,lambda f:f"{f[0]}",LAMN,5)
ntg=[0.0]*NT
for f in D['nt']:
    w=LAMN**(tmax-f[5])
    for i in range(NT): ntg[i]+=f[6+i]*w
# nuevos modalidad: [is,ic,ci,pa,ip, mod...]
nmc =acum(D['nm'],5,NM,lambda f:f"{f[0]}|{f[1]}|{f[2]}|{f[3]}",LAMN,4)
nmcp=acum(D['nm'],5,NM,lambda f:f"{f[0]}|{f[1]}|{f[3]}",LAMN,4)
nmca=acum(D['nm'],5,NM,lambda f:f"{f[0]}|{f[1]}",LAMN,4)
nmsp=acum(D['nm'],5,NM,lambda f:f"{f[0]}|{f[3]}",LAMN,4)
nmse=acum(D['nm'],5,NM,lambda f:f"{f[0]}",LAMN,4)
nmg=[0.0]*NM
for f in D['nm']:
    w=LAMN**(tmax-f[4])
    for i in range(NM): nmg[i]+=f[5+i]*w

def nk(d): return {k:{'n':v[:LAG_MAX],'k':v[LAG_MAX:]} for k,v in d.items()}
iS={v:i for i,v in enumerate(D['sedes'])}; iC={v:i for i,v in enumerate(D['carreras'])}
iM={v:i for i,v in enumerate(D['modalidades'])}
par={'periodos':D['periodos'],'turnos':list(range(NT)),'sedes':D['sedes'],
 'carreras':D['carreras'],'modalidades':D['modalidades'],
 'cicloMax':D['cicloMax'],'planDefecto':D['planDefecto'],'deltas':D['deltas'],'lagMax':LAG_MAX,
 'planCiclos':{str(iC[c]):v for c,v in D['planCiclos'].items()},
 'sedeApertura':{str(iS[s]):v for s,v in D['sedeApertura'].items()},
 'cont_celda':nk(celda),'cont_carrera':nk(carr),'cont_moda':nk(moda),
 'cont_ciclopar':nk(cipar),'cont_ciclo':nk(cic),
 'cont_global':[glob[LAG_MAX+L]/max(glob[L],1e-9) for L in range(LAG_MAX)],
 'k_celda':ks['celda'],'k_carrera':ks['carrera'],'k_moda':ks['moda'],
 'k_ciclopar':ks['ciclopar'],'k_ciclo':ks['ciclo'],
 'av_celda':avc,'av_moda':avm,'av_ciclo':avci,'av_global':avg,
 'k_avance':k_dirichlet(np.array(list(avc.values())))*FK,
 'tu_celda':tuc,'tu_moda':tum,'tu_sede':tus,
 'k_turno':k_dirichlet(np.array(list(tuc.values())))*FK,
 'nt_celda':ntc,'nt_carrera_moda_par':ntcmp,'nt_carrera_moda':ntcm,
 'nt_sede_moda_par':ntsmp,'nt_sede_moda':ntsm,'nt_sede':ntse,'nt_global':ntg,
 'k_nuevos':k_dirichlet(np.array(list(ntc.values())))*FK,
 'nm_celda':nmc,'nm_carrera_par':nmcp,'nm_carrera':nmca,'nm_sede_par':nmsp,
 'nm_sede':nmse,'nm_global':nmg,
 'k_modalidad':k_dirichlet(np.array(list(nmc.values())))*FK}

mod=Modelo(par)
stock0={}
for ip,is_,ic,im,ci,it,v in D['stock']:
    stock0.setdefault(D['periodos'][ip],{})[(str(is_),str(ic),str(im),ci,it)]=float(v)
obs={}
for ip,is_,ic,im,ci,v in D['nuevos']:
    obs.setdefault(D['periodos'][ip],{})[(str(is_),str(ic),str(im),ci)]=float(v)
ult=D['periodos'][-1]; fut=[siguiente(ult,i) for i in range(1,7)]
nv={T: dict(obs[[p for p in D['periodos'] if p%100==T%100][-1]]) for T in fut}
cen,var=mod.proyectar(stock0,nv,fut,varianza=True)
out={'k':{'celda':ks['celda'][0],'moda':ks['moda'][0],'nuevos':par['k_nuevos'],
          'modalidad':par['k_modalidad'],'avance':par['k_avance'],'turno':par['k_turno']},
     'tot':{str(T):{'cen':sum(cen[T].values()),'var':sum(var[T].values())} for T in fut},
     'porMod':{str(T):{m:sum(v for k,v in cen[T].items() if k[2]==str(i))
                       for i,m in enumerate(D['modalidades'])} for T in fut}}
json.dump(out, open(os.path.join(AQUI, 'paridad_py.json'), 'w'), ensure_ascii=False)
print("k celda %.10f | moda %.10f | nuevos %.10f | modalidad %.10f"%(
    ks['celda'][0],ks['moda'][0],par['k_nuevos'],par['k_modalidad']))
for T in fut: print(T, "%.6f"%sum(cen[T].values()))
