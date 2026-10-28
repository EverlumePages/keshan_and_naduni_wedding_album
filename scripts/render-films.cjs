// Render silent photo films from the album's AI-generated still photographs.
// Requires ffmpeg on PATH. No external footage, fonts or audio are downloaded.
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const films = [
  {id:'our-beautiful-beginning', images:['formal','walking','close','garden']},
  {id:'the-promises-we-made', images:['bridal-jewellery','ring-exchange','promises','hands']},
  {id:'an-evening-to-remember', images:['cake','laughter','reception','farewell']}
];
fs.mkdirSync(path.join(root,'assets/videos'), {recursive:true});
for (const film of films) {
  const args = ['-hide_banner','-loglevel','error','-y','-filter_complex_threads','2'];
  for (const image of film.images) args.push('-loop','1','-framerate','24','-t','6','-i',path.join(root,`assets/images/${image}-1600.jpg`));
  const filters = film.images.map((_,i)=>
    `[${i}:v]split=2[bg${i}][fg${i}];`+
    `[bg${i}]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,gblur=sigma=35,eq=brightness=-0.12[back${i}];`+
    `[fg${i}]scale=1240:680:force_original_aspect_ratio=decrease[front${i}];`+
    `[back${i}][front${i}]overlay=(W-w)/2:(H-h)/2,scale=1920:1080,zoompan=z='1+0.00018*on':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1280x720:fps=24,setsar=1,format=yuv420p,settb=AVTB,setpts=PTS-STARTPTS[v${i}]`
  );
  filters.push('[v0][v1]xfade=transition=fade:duration=1:offset=5[x1]','[x1][v2]xfade=transition=fade:duration=1:offset=10[x2]','[x2][v3]xfade=transition=fade:duration=1:offset=15,fade=t=in:st=0:d=0.7,fade=t=out:st=20:d=1[out]');
  args.push('-filter_complex',filters.join(';'),'-map','[out]','-t','21','-an','-c:v','libx264','-threads','2','-preset','fast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',path.join(root,`assets/videos/${film.id}.mp4`));
  console.log(`Rendering ${film.id}…`);
  const result=spawnSync('ffmpeg',args,{stdio:'inherit',windowsHide:true});
  if(result.status!==0)throw new Error(`Film rendering failed: ${film.id}: ${result.error||result.status}`);
}
fs.writeFileSync(path.join(root,'assets/videos/manifest.json'),JSON.stringify({
  kind:'Rendered photo films using AI-generated stills; not full-motion AI wedding footage',
  audio:'Silent',width:1280,height:720,fps:24,durationSeconds:21,
  treatment:'Slow zoom, blurred photographic backdrop, one-second cross-dissolves and fade in/out',
  films:films.map(f=>({...f,source:`assets/videos/${f.id}.mp4`}))
},null,2));
console.log('Three photo films rendered.');
