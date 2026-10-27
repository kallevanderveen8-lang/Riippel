"""Original 15-second Ripple score. Synthesized locally; no stock audio/samples."""
from pathlib import Path
import json, wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

RATE=48000; SECONDS=15; N=RATE*SECONDS; rng=np.random.default_rng(72419)
out=Path('marketing/crazygames/audio');out.mkdir(parents=True,exist_ok=True)
music=np.zeros((N,2),dtype=np.float64);fx=np.zeros_like(music)
def hz(note): return 440*2**((note-69)/12)
def add(bus,signal,start,level=.1,pan=0):
    at=round(start*RATE)
    if at<0 or at>=N:return
    signal=signal[:N-at]*level
    bus[at:at+len(signal),0]+=signal*np.sqrt((1-pan)/2)
    bus[at:at+len(signal),1]+=signal*np.sqrt((1+pan)/2)
def key(note,duration=2.0):
    t=np.arange(round(duration*RATE))/RATE;f=hz(note);s=np.zeros(len(t))
    for harmonic,amp in [(1,1),(2,.25),(3,.11),(4,.045),(5,.018)]:
        s+=amp*np.sin(2*np.pi*f*harmonic*(1+.00012*harmonic)*t)*np.exp(-t*(1.8+.65*harmonic))
    return s*(1-np.exp(-t*170))
def pad(note,duration=3.4):
    t=np.arange(round(duration*RATE))/RATE;f=hz(note)
    s=sum(np.sin(2*np.pi*f*(1+d)*t) for d in [-.0018,0,.0018])/3
    env=np.minimum(1,t/.65)*np.exp(-np.maximum(0,t-2.2)*2.8)
    return s*env
# 96 BPM, six bars: two bars per visual scene. Cmaj9 / Am7 / Fmaj9 / Gadd9 / Am7 / Cmaj9.
chords=[[48,55,59,62,64],[45,52,55,60,64],[41,48,52,55,57],[43,50,57,59,62],[45,52,55,60,64],[48,55,59,62,64]]
for bar,chord in enumerate(chords):
    start=bar*2.5
    for i,note in enumerate(chord):add(music,pad(note),start,.023,(-.65+i*.325))
    # Gentle, clear plucked pulse rather than a busy drum beat.
    pattern=[chord[0]+12,chord[2]+12,chord[1]+12,chord[3]+12]
    for step,note in enumerate(pattern):add(music,key(note),start+step*.625,.085 if step==0 else .060,[-.4,.28,-.18,.4][step])
    t=np.arange(round(.8*RATE))/RATE
    bass=np.sin(2*np.pi*hz(chord[0]-12)*t)*(1-np.exp(-t*80))*np.exp(-t*5)
    add(music,bass,start,.070)
    for beat in [1,3]:
        t=np.arange(round(.075*RATE))/RATE
        brush=sosfilt(butter(2,[1200,4500],btype='bandpass',fs=RATE,output='sos'),rng.normal(size=len(t)))*np.exp(-t*65)
        add(music,brush,start+beat*.625,.012,.3 if beat==1 else -.3)
for time,note,level in [(0.12,76,.055),(1.37,79,.045),(3.25,74,.045),(4.15,76,.05),(5.12,72,.065),(6.37,76,.045),(8.25,74,.05),(9.15,71,.04),(10.12,76,.065),(11.37,79,.05),(12.62,81,.045),(13.56,79,.04),(14.05,72,.06)]:
    add(music,key(note,2.4),time,level,(-.25 if note%2 else .25))
# Actual captured stone drops and lantern moments are mapped onto the shorter edit.
manifest=json.loads(Path('marketing/crazygames/capture-manifest.json').read_text())
clips=[(.9,5.9),(7,12),(13.65,18.65)];notes=[[261.62,392,523.26],[329.62,493.88,659.26],[349.22,523.26,698.46]]
for index,(scene,(begin,end)) in enumerate(zip(manifest['videos'][0]['puzzles'],clips)):
    drop=scene['dropAt']-begin+index*5
    t=np.arange(round(.5*RATE))/RATE
    body=np.sin(2*np.pi*(225*t+(85-225)*t*t/(2*.18)))*np.exp(-t*20)
    splash=sosfilt(butter(2,[300,1600],btype='bandpass',fs=RATE,output='sos'),rng.normal(size=len(t)))*np.exp(-t*15)
    add(fx,body*.65+splash*.4,drop,.10)
    for event in scene['events']:
        if not begin<=event['time']<end:continue
        t=np.arange(round(1.3*RATE))/RATE;f=notes[index][event['index']%3]
        bell=(np.sin(2*np.pi*f*t)+.14*np.sin(2*np.pi*f*2.002*t))*np.exp(-t*4)*(1-np.exp(-t*200))
        add(fx,bell,event['time']-begin+index*5,.07/(1+event['index']*.12),-.2+event['index']*.15)
# Diffuse short stereo hall, with the direct keys kept clearly audible.
ir_time=np.arange(round(1.8*RATE))/RATE
wet=np.zeros_like(music)
for channel in range(2):
    ir=sosfilt(butter(2,3400,fs=RATE,output='sos'),rng.normal(size=len(ir_time)))
    ir*=np.exp(-ir_time/0.32)*np.minimum(1,ir_time/.03)
    ir/=np.sqrt(np.sum(ir*ir))
    wet[:,channel]=fftconvolve(music[:,channel]+fx[:,channel]*.4,ir)[:N]
water=sosfilt(butter(2,[160,850],btype='bandpass',fs=RATE,output='sos'),rng.normal(size=N))
time=np.arange(N)/RATE
mix=music+fx+wet*.19+water[:,None]*.014*(.8+.2*np.sin(time[:,None]*.8+np.array([0,1.2])))
mix*=np.minimum(1,time/.12)[:,None]*np.minimum(1,np.maximum(0,(SECONDS-time)/.65))[:,None]
mix=np.tanh(mix*1.4)/1.4
peak=float(np.max(np.abs(mix)));mix*=.80/max(peak,.001)
with wave.open(str(out/'ripple-original-score.wav'),'wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(RATE);f.writeframes((mix*32767).astype('<i2').tobytes())
(out/'README.md').write_text('Original Ripple trailer music, synthesized for this game.\n15 seconds · 96 BPM · C major · stereo 48 kHz.\nNo stock recordings, external music or third-party samples.\nScore: soft plucked keys, warm pad, quiet water texture and synchronized stone/lantern effects.\nSource composition: tools/make-trailer-music.py.\n')
print('Original score rendered:',out/'ripple-original-score.wav')
