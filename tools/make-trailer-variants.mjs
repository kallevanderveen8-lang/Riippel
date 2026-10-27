import {spawn} from 'node:child_process';import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';import {join} from 'node:path';
const out='marketing/crazygames',videos=join(out,'videos');
function run(args){return new Promise((resolve,reject)=>{const p=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{stdio:['ignore','ignore','pipe']});let e='';p.stderr.on('data',x=>e+=x);p.once('exit',code=>code?reject(Error(e)):resolve());p.once('error',reject);});}
await mkdir(videos,{recursive:true});
await run(['-i',join(videos,'ripple-preview-portrait-1080x1620.mp4'),'-an','-vf','scale=720:1080:flags=lanczos,setsar=1','-c:v','libx264','-crf','19','-preset','medium','-threads','2','-movflags','+faststart',join(videos,'ripple-preview-portrait-720x1080.mp4')]);
const manifest={durationSeconds:15,fps:30,music:'../audio/ripple-original-score.wav',tempoBPM:96,edit:'Three five-second action clips, straight cuts on two-bar music boundaries. Gameplay is not sped up.',sourceRanges:[[.9,5.9],[7,12],[13.65,18.65]],videos:[]};
for(const [name,w,h] of [['landscape',1920,1080],['portrait',720,1080]]){
 const file=`ripple-trailer-music-${name}-${w}x${h}.mp4`;
 const filter='[0:v]split=3[a][b][c];[a]trim=start=0.9:end=5.9,setpts=PTS-STARTPTS[a1];[b]trim=start=7:end=12,setpts=PTS-STARTPTS[b1];[c]trim=start=13.65:end=18.65,setpts=PTS-STARTPTS[c1];[a1][b1][c1]concat=n=3:v=1:a=0,setsar=1[v];[1:a]loudnorm=I=-18:TP=-1.5:LRA=7,aresample=48000[audio]';
 await run(['-i',join(videos,`ripple-preview-${name}-${w}x${h}.mp4`),'-i',join(out,'audio','ripple-original-score.wav'),'-filter_complex',filter,'-map','[v]','-map','[audio]','-t','15','-r','30','-c:v','libx264','-preset','medium','-crf','19','-maxrate','14M','-bufsize','28M','-threads','2','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',join(videos,file)]);
 manifest.videos.push({file,width:w,height:h,bytes:(await stat(join(videos,file))).size});console.log('Musical trailer ready:',file);
}
const capture=JSON.parse(await readFile(join(out,'capture-manifest.json'),'utf8'));
if(!capture.videos.some(v=>v.file==='ripple-preview-portrait-720x1080.mp4'))capture.videos.push({file:'ripple-preview-portrait-720x1080.mp4',width:720,height:1080,bytes:(await stat(join(videos,'ripple-preview-portrait-720x1080.mp4'))).size,derivedFrom:'ripple-preview-portrait-1080x1620.mp4'});
await writeFile(join(out,'capture-manifest.json'),JSON.stringify(capture,null,2)+'\n');await writeFile(join(out,'trailer-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
