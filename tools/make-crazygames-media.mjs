// Marketing-only capture harness. No production game files are modified.
// node tools/make-crazygames-media.mjs /path/to/output /path/to/cover-masters
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {once} from 'node:events';
const require=createRequire(import.meta.url);
let playwright;try{playwright=require('playwright');}catch{playwright=require((process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'/workspace/Riippel/node_modules')+'/playwright');}
const root=process.cwd(),out=resolve(process.argv[2]||'marketing/crazygames'),masters=resolve(process.argv[3]||'marketing/masters');
await mkdir(out,{recursive:true});await mkdir(join(out,'covers'),{recursive:true});await mkdir(join(out,'videos'),{recursive:true});await mkdir(join(out,'screenshots'),{recursive:true});
function run(cmd,args){return new Promise((resolve,reject)=>{const p=spawn(cmd,args,{stdio:['ignore','ignore','pipe']});let error='';p.stderr.on('data',x=>error+=x);p.once('exit',code=>code?reject(new Error(error)):resolve());p.once('error',reject);});}
for(const [name,w,h] of [['landscape',1920,1080],['portrait',800,1200],['square',800,800]]) {
  await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',join(masters,`${name}.png`),'-vf',`scale=${w}:${h}:force_original_aspect_ratio=increase:flags=lanczos,crop=${w}:${h},setsar=1`,'-frames:v','1','-q:v','2',join(out,'covers',`ripple-${name}-${w}x${h}.jpg`)]);
}
const captureHTML=`<!doctype html><html><head><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#10383b;cursor:none} .scene,canvas,#cover{position:absolute;inset:0;width:100%;height:100%}canvas{background-repeat:no-repeat}#rock-layer{pointer-events:none}#cover{z-index:20;object-fit:cover;pointer-events:none}
</style></head><body><img id="cover"><script type="module">
import {Renderer} from '/src/renderer.js';import {Wave,cell} from '/src/simulation.js';import {C,lakeForLevel} from '/src/config.js';import {generate} from '/src/levels.js';import {SCRIPTED} from '/src/scripted.js';
const scenes=[];
for(const [index,number] of [3,41,31].entries()){
 const group=document.createElement('div');group.className='scene';group.style.zIndex=index;const canvas=document.createElement('canvas');group.append(canvas);document.body.prepend(group);
 const lake=lakeForLevel(number),level=number<=10?structuredClone(SCRIPTED[number-1]):generate(number);
 const r=new Renderer(canvas,{theme:lake.theme});r.preloadBoulder();r.timeOfDay=lake.themeIndex===3?'night':'day';r.cosmetics={stone:'river',lantern:'bronze'};r.setWaterResolution(900);
 const wave=new Wave(level.rocks);wave.peakIndices=level.lanterns.map(l=>cell(l.x,l.y));wave.reset(level.solution);
 scenes.push({group,r,level,wave,lit:level.lanterns.map(()=>false),dropAt:1+.3*level.solution.length,start:index*6.6,events:[],win:null});
}
await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));
await Promise.all(C.themes.map(t=>new Promise(resolve=>{const i=new Image();i.onload=i.onerror=resolve;i.src=t.art;})));
// The module's own image decoders finish independently of the preload images.
await new Promise(resolve=>setTimeout(resolve,250));
const cover=document.getElementById('cover');cover.src='/__cover';await cover.decode();
window.renderMedia=t=>{
 for(const [index,s] of scenes.entries()){
  const local=t-s.start,opacity=index===0?1:Math.min(1,Math.max(0,local/.45));s.group.style.opacity=opacity;
  if(local<0||local>7.1&&index<2)continue;
  const desired=Math.min(C.visualTailSteps,Math.max(0,Math.floor((local-s.dropAt)*C.tickHz*C.stepsPerTick)));
  while(s.wave.stepNumber<desired){s.wave.step();if(s.wave.stepNumber<=C.steps&&s.win===null){s.level.lanterns.forEach((l,i)=>{if(!s.lit[i]&&s.wave.peak[cell(l.x,l.y)]>=C.threshold){s.lit[i]=true;const time=s.dropAt+s.wave.stepNumber/(C.tickHz*C.stepsPerTick);s.r.burst(l.x,l.y,time);s.events.push({type:'chime',time:s.start+time,index:i});}});if(s.lit.every(Boolean))s.win=s.dropAt+s.wave.stepNumber/(C.tickHz*C.stepsPerTick);}}
  const placed=s.level.solution.filter((_,i)=>local>=.45+i*.3);
  s.r.draw(s.wave,s.level,placed,s.lit,Math.max(0,local),local>=s.dropAt);
 }
 cover.style.opacity=t<.3?1:t<.85?1-(t-.3)/.55:t>19.35?Math.min(1,(t-19.35)/.55):0;
 return scenes.map(s=>({number:s.level.number,par:s.level.par,stones:s.level.solution.length,lit:s.lit,dropAt:s.start+s.dropAt,win:s.win===null?null:s.start+s.win,events:s.events}));
};window.mediaReady=true;
</script></body></html>`;
let coverPath;
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/__capture'){res.setHeader('Content-Type','text/html');res.end(captureHTML);return;}if(url.pathname==='/__cover'){res.setHeader('Content-Type','image/jpeg');res.end(await readFile(coverPath));return;}const path=resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!path.startsWith(root+'/'))throw Error('path');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});
server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;
let browser;const manifest={capturedAt:new Date().toISOString(),fps:30,durationSeconds:20,source:'Unmodified production Renderer, Wave and certified campaign layouts; editorial camera without HUD',videos:[]};
try{
 browser=await playwright.chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 for(const [name,width,height] of [['landscape',1920,1080],['portrait',1080,1620]]){
  coverPath=join(out,'covers',`ripple-${name}-${name==='landscape'?'1920x1080':'800x1200'}.jpg`);
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/__capture');await page.waitForFunction(()=>window.mediaReady,null,{timeout:60000});
  const file=`ripple-preview-${name}-${width}x${height}.mp4`;
  const encoder=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','png','-framerate','30','-i','pipe:0','-an','-vf','scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p','-c:v','libx264','-preset','medium','-crf','19','-maxrate','14M','-bufsize','28M','-threads','2','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-movflags','+faststart',join(out,'videos',file)],{stdio:['pipe','ignore','pipe']});let encoderError='';encoder.stderr.on('data',x=>encoderError+=x);
  const completion=once(encoder,'exit');let state;
  for(let frame=0;frame<600;frame++){
   state=await page.evaluate(t=>window.renderMedia(t),frame/30);
   const png=await page.screenshot({type:'png',omitBackground:false});if(!encoder.stdin.write(png))await once(encoder.stdin,'drain');
   if(frame%90===0)console.log(`${name}: ${frame}/600 frames`);
  }
  encoder.stdin.end();const [code]=await completion;if(code)throw Error(encoderError);if(errors.length)throw Error(errors.join('\n'));
  if(state.some(s=>!s.lit.every(Boolean)))throw Error('A captured puzzle did not solve');
  const bytes=(await stat(join(out,'videos',file))).size;if(bytes>50000000)throw Error('CrazyGames preview exceeds 50 MB');
  manifest.videos.push({file,width,height,bytes,puzzles:state});await page.close();
 }
 const portraitFile='ripple-preview-portrait-720x1080.mp4';
 await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',join(out,'videos','ripple-preview-portrait-1080x1620.mp4'),'-an','-vf','scale=720:1080:flags=lanczos,setsar=1','-c:v','libx264','-crf','19','-preset','medium','-threads','2','-movflags','+faststart',join(out,'videos',portraitFile)]);
 manifest.videos.push({file:portraitFile,width:720,height:1080,bytes:(await stat(join(out,'videos',portraitFile))).size,derivedFrom:'ripple-preview-portrait-1080x1620.mp4'});
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});await page.route('https://sdk.crazygames.com/**',r=>r.abort());
 await page.goto(base+'/?test');await page.waitForFunction(()=>window.__ripple?.state.level);await page.click('#welcome-skip');
 for(const [n,name] of [[3,'01-ripples-meet'],[8,'02-stone-and-echo'],[31,'03-moonlit-water'],[41,'04-autumn-lake']]){
  await page.evaluate(n=>window.__ripple.go(n),n);await page.waitForTimeout(900);await page.evaluate(()=>window.__ripple.place(window.__ripple.state.level.solution.map(s=>({...s}))));await page.mouse.move(-10,-10);
  await page.screenshot({path:join(out,'screenshots',`${name}-1920x1080.jpg`),type:'jpeg',quality:94});
 }
 await page.evaluate(()=>{const p=window.__ripple.state.progress;p.level=42;for(let n=1;n<=40;n++)p.stars[`l${n}`]=n%7===0?2:3;window.__ripple.refresh();});
 await page.click('#collection-top');await page.screenshot({path:join(out,'screenshots','05-levels-1920x1080.jpg'),type:'jpeg',quality:94});await page.close();
 await writeFile(join(out,'capture-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
}finally{await browser?.close();server.close();}
console.log('CrazyGames media capture complete:',out);
