import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {stat,writeFile} from 'node:fs/promises';import {resolve,join} from 'node:path';import assert from 'node:assert/strict';
const exec=promisify(execFile),out=resolve(process.argv[2]||'marketing/crazygames');
async function probe(path){return JSON.parse((await exec('ffprobe',['-v','error','-show_streams','-show_format','-of','json',path])).stdout);}
const report={checkedAt:new Date().toISOString(),reference:'https://docs.crazygames.com/requirements/game-covers/',covers:[],videos:[],screenshots:[]};
for(const [name,width,height] of [['landscape',1920,1080],['portrait',800,1200],['square',800,800]]){
 const file=`covers/ripple-${name}-${width}x${height}.jpg`,p=await probe(join(out,file)),s=p.streams[0];assert.deepEqual([s.width,s.height],[width,height]);report.covers.push({file,width,height,bytes:(await stat(join(out,file))).size});
}
for(const [name,width,height] of [['landscape',1920,1080],['portrait',1080,1620],['portrait',720,1080]]){
 const file=`videos/ripple-preview-${name}-${width}x${height}.mp4`,path=join(out,file),p=await probe(path),v=p.streams.find(s=>s.codec_type==='video');
 assert.deepEqual([v.width,v.height,v.codec_name,v.pix_fmt],[width,height,'h264','yuv420p']);assert.equal(p.streams.filter(s=>s.codec_type==='audio').length,0);assert.equal(v.avg_frame_rate,'30/1');assert.equal(Number(v.nb_frames),600);assert.equal(Number(p.format.duration),20);assert.ok(Number(p.format.size)<50000000);
 const cover=join(out,'covers',name==='landscape'?'ripple-landscape-1920x1080.jpg':'ripple-portrait-800x1200.jpg');
 const match=await exec('ffmpeg',['-hide_banner','-i',path,'-i',cover,'-filter_complex',`[0:v]select=eq(n\\,0),format=yuv420p[v];[1:v]scale=${width}:${height}:flags=lanczos,format=yuv420p[c];[v][c]psnr`,'-frames:v','1','-f','null','-']);
 const psnr=Number(match.stderr.match(/average:([\d.]+)/)?.[1]);assert.ok(psnr>30,`Opening frame does not match cover: ${file}, PSNR ${psnr}`);
 const black=await exec('ffmpeg',['-hide_banner','-i',path,'-vf','blackdetect=d=0.1:pix_th=0.01','-an','-f','null','-']);assert.ok(!black.stderr.includes('black_start:'),`Black segment in ${file}`);
 report.videos.push({file,width,height,fps:30,frames:600,seconds:20,audioStreams:0,bytes:Number(p.format.size),openingCoverPSNR:psnr,blackSegments:0});
}
for(const name of ['01-ripples-meet','02-stone-and-echo','03-moonlit-water','04-autumn-lake','05-levels']){const file=`screenshots/${name}-1920x1080.jpg`,p=await probe(join(out,file));assert.deepEqual([p.streams[0].width,p.streams[0].height],[1920,1080]);report.screenshots.push({file,width:1920,height:1080});}
report.musicalTrailers=[];
for(const [name,width,height] of [['landscape',1920,1080],['portrait',720,1080]]){const file=`videos/ripple-trailer-music-${name}-${width}x${height}.mp4`,p=await probe(join(out,file)),v=p.streams.find(s=>s.codec_type==='video'),a=p.streams.find(s=>s.codec_type==='audio');assert.deepEqual([v.width,v.height,v.codec_name],[width,height,'h264']);assert.equal(Number(v.nb_frames),450);assert.equal(Number(p.format.duration),15);assert.equal(a.codec_name,'aac');assert.equal(a.channels,2);assert.ok(Number(p.format.size)<50000000);report.musicalTrailers.push({file,width,height,seconds:15,frames:450,audio:'AAC stereo',bytes:Number(p.format.size)});}
await writeFile(join(out,'validation.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS: 3 covers, 3 silent previews, 2 musical trailers, opening frames, no black segments, size budget and 5 screenshots.');
