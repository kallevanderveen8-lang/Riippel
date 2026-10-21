import {mkdirSync,readFileSync,writeFileSync,readdirSync,statSync,rmSync,copyFileSync} from 'node:fs';
import {join,relative} from 'node:path';import {deflateRawSync} from 'node:zlib';
const root=process.cwd(),out=join(root,'dist');rmSync(out,{recursive:true,force:true});mkdirSync(join(out,'src'),{recursive:true});
const paths=['index.html','style.css',...readdirSync('src').filter(f=>f.endsWith('.js')).map(f=>'src/'+f)];
for(const f of paths){let content=readFileSync(f,'utf8');if(f==='src/main.js')content=content.split('// Explicit test-only harness;')[0];writeFileSync(join(out,f),content);}
// Dependency-free ZIP (DEFLATE, CRC32, central directory); index.html is at root.
const table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0;}
function crc32(b){let c=0xffffffff;for(const x of b)c=table[(c^x)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
let offset=0;const chunks=[],central=[];
for(const path of paths){const name=Buffer.from(path),data=readFileSync(join(out,path)),zip=deflateRawSync(data,{level:9}),crc=crc32(data);const head=Buffer.alloc(30);head.writeUInt32LE(0x04034b50);head.writeUInt16LE(20,4);head.writeUInt16LE(8,8);head.writeUInt32LE(crc,14);head.writeUInt32LE(zip.length,18);head.writeUInt32LE(data.length,22);head.writeUInt16LE(name.length,26);chunks.push(head,name,zip);const cd=Buffer.alloc(46);cd.writeUInt32LE(0x02014b50);cd.writeUInt16LE(20,4);cd.writeUInt16LE(20,6);cd.writeUInt16LE(8,10);cd.writeUInt32LE(crc,16);cd.writeUInt32LE(zip.length,20);cd.writeUInt32LE(data.length,24);cd.writeUInt16LE(name.length,28);cd.writeUInt32LE(offset,42);central.push(cd,name);offset+=head.length+name.length+zip.length;}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(paths.length,8);end.writeUInt16LE(paths.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);const archive=Buffer.concat([...chunks,directory,end]);
mkdirSync('releases',{recursive:true});writeFileSync('releases/ripple-crazygames.zip',archive);
const raw=paths.reduce((sum,f)=>sum+statSync(join(out,f)).size,0);if(raw>=2000000)throw Error('2 MB build budget exceeded');
const report={files:paths.length,uncompressedBytes:raw,zipBytes:archive.length,externalAssets:0,optionalNetworkDependency:'official CrazyGames v3 SDK only',firstLoadMeasured:false};mkdirSync('reports',{recursive:true});writeFileSync('reports/build.json',JSON.stringify(report,null,2)+'\n');console.log(report);
