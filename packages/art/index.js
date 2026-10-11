/*!
 * @petty-tab/art — the Petty Tab character and sticker art, extracted from the approved prototype.
 *
 * Every function returns an SVG markup string. Nothing here touches the DOM, so it runs the same in the
 * browser, in Next.js server components, in Node and in the reel renderer.
 *
 * Style: line-and-tint. Navy outlines (class "o" for outlined shapes, "t" for strokes) are styled by art.css
 * (or by the STYLE string for standalone files). Every outlined shape gets a soft violet rim shadow on its
 * lower right, clipped inside the silhouette, so each instance needs unique clipPath ids: always create one
 * renderer per rendered component with a unique idPrefix (React: useId()).
 *
 * Never pass user-supplied text into these functions. The only text they draw is fixed (sticker labels,
 * the "4/10" paddle); aria-labels go through esc().
 */

export const STYLE=".d{overflow:visible}.d .o{stroke:#1b2440;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.d .t{fill:none;stroke:#1b2440;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.d.sm .o,.d.sm .t{stroke-width:2.5}.d.stk .o,.d.stk .t{stroke-width:3.2}.d text{font-family:Rubik,system-ui,sans-serif}";

export function createArt(options){
  var idPrefix=(options&&options.idPrefix?String(options.idPrefix):'pt').replace(/[^A-Za-z0-9_-]/g,'');
  var C={ink:'#1b2440',paper:'#fcf7ec',linen:'#f3ead9',linen2:'#eadfc9',crimson:'#c8402a',mustard:'#e9b440',gold2:'#f3cc6e',butter:'#f8e7b5',mist:'#dfe3ee',blush:'#f6d5c8',pan:'#2f3550',blue:'#4a63b0',leaf:'#7d9a66',orange:'#ef9440'};
  function esc(s){return String(s).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})}

  /* ───────── drawing primitives ───────── */
  function o(d,fill,x){return '<path class="o" d="'+d+'" fill="'+(fill||'none')+'"'+(x||'')+'/>'}
  function t(d,w,col){return '<path class="t" d="'+d+'"'+((w||col)?' style="'+(w?'stroke-width:'+w+';':'')+(col?'stroke:'+col:'')+'"':'')+'/>'}
  function c(x,y,r,fill){return '<circle class="o" cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'"/>'}
  function e(x,y,rx,ry,fill,rot){return '<ellipse class="o" cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="'+fill+'"'+(rot?' transform="rotate('+rot+' '+x+' '+y+')"':'')+'/>'}
  function dot(x,y,r,fill){return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+(fill||C.ink)+'"/>'}
  function fe(x,y,rx,ry,fill,rot){return '<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="'+fill+'"'+(rot?' transform="rotate('+rot+' '+x+' '+y+')"':'')+'/>'}
  function f(d,fill){return '<path d="'+d+'" fill="'+fill+'"/>'}
  function drop(x,y,k){k=k||1;return '<path d="M'+x+' '+y+'c'+(3*k)+' '+(4*k)+' '+(3*k)+' '+(7*k)+' 0 '+(7*k)+'s'+(-3*k)+' '+(-3*k)+' 0 '+(-7*k)+'Z" fill="'+C.blue+'"/>'}
  function ptxt(x,y,str,fill,size){return '<text x="'+x+'" y="'+y+'" text-anchor="middle" style="font:700 '+(size||8.5)+'px var(--sans,Rubik,system-ui,sans-serif);fill:'+fill+'">'+str+'</text>'}



  /* ───────── the domestic spirit animals · line-and-tint characters ─────────
     Light comes from the upper left: every outlined shape gets a soft violet rim shadow on its lower right,
     markings are clipped inside the silhouette, and expressions are built from lids, pupils, brows and mouths.
     Heads are centred on 0,0 and are about 66 units wide. face: plain | sig | smug | sad | strain. dir: +1 looks right */
  var SP={
    cat:{name:'The Judgy Cat',tag:'The Cat',trait:'Side-eyes everything. Out loud.',bg:'#f8e7b5',vb:'-46 -50 92 92'},
    bear:{name:'The Blanket Bear',tag:'The Bear',trait:'Takes 90% of the duvet. Asleep by minute 4.',bg:'#dfe3ee',vb:'-44 -46 88 88'},
    lion:{name:'The “King” Lion',tag:'The Lion',trait:'Royal speeches. Naps 20 hours. Screams at bugs.',bg:'#d6e3ee',vb:'-52 -52 104 104'},
    rabbit:{name:'The Panic Rabbit',tag:'The Rabbit',trait:'Starts 14 chores at once. Finishes none.',bg:'#e2ebd2',vb:'-56 -84 112 112'},
    turtle:{name:'The Glacial Turtle',tag:'The Turtle',trait:'Needs 2.5 hours to put on shoes.',bg:'#f6d5c8',vb:'-42 -44 84 84'},
    sheep:{name:'The “Innocent” Sheep',tag:'The Sheep',trait:'“Who, me?” The evidence says yes.',bg:'#f6dea0',vb:'-54 -62 108 108'},
    raccoon:{name:'The Midnight Raccoon',tag:'The Raccoon',trait:'Raids the fridge at 2 AM. Crumbs in bed.',bg:'#cdd3ea',vb:'-48 -50 96 96'},
    capy:{name:'The Chill Capybara',tag:'The Capybara',trait:'The dishes are “soaking”. Since Tuesday.',bg:'#d2e6e1',vb:'-44 -54 88 88'},
    pup:{name:'The Dramatic Pup',tag:'The Pup',trait:'Caught red-handed. Deploys the big eyes.',bg:'#f3cfc0',vb:'-50 -48 100 100'}
  };
  var ORDER=['cat','bear','lion','rabbit','turtle','sheep','raccoon','capy','pup'];
  var FUR={
    cat:{f:'#a9b4cf',l:'#eef1f8',d:'#7d89ab',e:'#f3b8ad'},
    bear:{f:'#b98052',l:'#ecd0a8',d:'#8f5d38',e:'#e2b78c'},
    raccoon:{f:'#aba8b4',l:'#f5eee3',d:'#454b66',e:'#6a6f88'},
    capy:{f:'#c9985e',l:'#ecd2a8',d:'#a37843',e:'#a37843'},
    pup:{f:'#fbf1dc',l:'#ffffff',d:'#d4925a',e:'#d4925a'},
    lion:{f:'#f2cd87',l:'#fcebc8',d:'#b5562e',e:'#e9a56b'},
    turtle:{f:'#a9c191',l:'#dbe7c4',d:'#86a26f',e:'#c9a65c'},
    rabbit:{f:'#f3c4b3',l:'#fdebe2',d:'#e48b7d',e:'#e48b7d'},
    sheep:{f:'#f0d3bd',l:'#fffaf0',d:'#d9a88c',e:'#f0a79a'}
  };
  var KID=0,PFX=idPrefix+'-',SHADE='rgba(48,36,92,.2)',BIG='M-900 -900h1800v1800h-1800Z',WHITE='#fffdf7',DARK='#3a1f2b',PINK='#e2796b';
  function EL(cx,cy,rx,ry){return 'M'+(cx-rx)+' '+cy+'a'+rx+' '+ry+' 0 1 0 '+(2*rx)+' 0a'+rx+' '+ry+' 0 1 0 '+(-2*rx)+' 0Z'}
  /* shaded, outlined shape. x.inn: markup clipped inside the silhouette; x.ns: no rim shadow; x.sw: outline width */
  function S(d,fill,x){
    x=x||{};var a=PFX+(KID++),b=PFX+(KID++),dx=x.dx==null?-3.5:x.dx,dy=x.dy==null?-4.5:x.dy;
    return '<clipPath id="'+a+'"><path d="'+d+'"/></clipPath>'
      +(x.ns?'':'<clipPath id="'+b+'"><path d="'+BIG+d+'" clip-rule="evenodd" transform="translate('+dx+' '+dy+')"/></clipPath>')
      +'<path d="'+d+'" fill="'+fill+'"/><g clip-path="url(#'+a+')">'+(x.inn||'')+(x.ns?'':'<path d="'+d+'" fill="'+SHADE+'" clip-path="url(#'+b+')"/>')+'</g>'
      +'<path class="o" d="'+d+'" fill="none"'+(x.sw?' style="stroke-width:'+x.sw+'"':'')+'/>';
  }
  /* outlined flexible limb: an ink stroke with a fur stroke on top */
  function tube(d,w,fill){return '<path class="t" d="'+d+'" style="stroke-width:'+(w+5.6)+'"/><path class="t" d="'+d+'" style="stroke:'+fill+';stroke-width:'+w+'"/>'}
  function mir(m){return '<g transform="scale(-1 1)">'+m+'</g>'}
  function scal(cx,cy,R,n,rot,kk){
    var p=[],i,an,r=R*Math.sin(Math.PI/n)*(kk||1.12);
    for(i=0;i<n;i++){an=(rot||0)+i*2*Math.PI/n;p.push([(cx+R*Math.cos(an)).toFixed(1),(cy+R*Math.sin(an)).toFixed(1)])}
    var d='M'+p[0][0]+' '+p[0][1];
    for(i=1;i<=n;i++)d+='A'+r.toFixed(1)+' '+r.toFixed(1)+' 0 0 1 '+p[i%n][0]+' '+p[i%n][1];
    return d+'Z';
  }
  function tear(x,y,kk){kk=kk||1;return '<path class="o" d="M'+x+' '+y+'c'+(3.4*kk)+' '+(4.4*kk)+' '+(4*kk)+' '+(8.6*kk)+' 0 '+(9*kk)+'c'+(-4*kk)+' '+(-.4*kk)+' '+(-3.4*kk)+' '+(-4.6*kk)+' 0 '+(-9*kk)+'Z" fill="#8fb4ec" style="stroke-width:1.5"/>'}
  /* sclera eye. q: px,py pupil offset · pr pupil radius · iris · slit · lid/low 0..1 · tilt · fur (lid colour) · cls (animates the pupil) */
  function eyeS(x,y,r,q){
    q=q||{};var id=PFX+(KID++),pr=q.pr||r*.5,px=x+(q.px||0),py=y+(q.py||0);
    var s='<clipPath id="'+id+'"><circle cx="'+x+'" cy="'+y+'" r="'+r+'"/></clipPath><circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+WHITE+'"/><g clip-path="url(#'+id+')">';
    var pu=(q.iris?dot(px,py,r*.8,q.iris):'')+(q.slit?fe(px,py,pr*.6,pr*1.3,C.ink):dot(px,py,pr))+dot(px-pr*.4,py-pr*.45,Math.max(1,pr*.36),'#fff');
    s+=q.cls?'<g class="'+q.cls+'"'+(q.sty?' style="'+q.sty+'"':'')+'>'+pu+'</g>':pu;
    s+='<circle cx="'+x+'" cy="'+(y-r*1.42)+'" r="'+(r*1.1)+'" fill="'+SHADE+'"/>';
    if(q.lid){var ly=y-r+2*r*q.lid;s+='<g transform="rotate('+(q.tilt||0)+' '+x+' '+y+')"><rect x="'+(x-r-6)+'" y="'+(y-r-9)+'" width="'+(2*r+12)+'" height="'+(ly-y+r+9)+'" fill="'+q.fur+'"/><path class="t" d="M'+(x-r-5)+' '+ly+'h'+(2*r+10)+'" style="stroke-width:2.8"/></g>'}
    if(q.low){var uy=y+r-2*r*q.low;s+='<rect x="'+(x-r-6)+'" y="'+uy+'" width="'+(2*r+12)+'" height="'+(2*r)+'" fill="'+q.fur+'"/><path class="t" d="M'+(x-r-5)+' '+uy+'h'+(2*r+10)+'" style="stroke-width:2"/>'}
    return s+'</g><circle class="o" cx="'+x+'" cy="'+y+'" r="'+r+'" fill="none" style="stroke-width:2.4"/>';
  }
  function bead(x,y,rx,ry){return fe(x,y,rx,ry,C.ink)+dot(x-rx*.28,y-ry*.36,rx*.38,'#fff')}
  /* dizzy eye: a spinning spiral on a white disc */
  function spiral(x,y,r){
    var d='',i,a,rr;for(i=0;i<=36;i++){a=i/36*Math.PI*3.4;rr=r*.8*i/36;d+=(i?'L':'M')+(x+rr*Math.cos(a)).toFixed(2)+' '+(y+rr*Math.sin(a)).toFixed(2)}
    return '<circle class="o" cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+WHITE+'" style="stroke-width:2.4"/><g class="spin"><circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="none"/>'+t(d,1.7)+'</g>';
  }
  function shut(x,y,w,up){return t('M'+(x-w)+' '+y+'q'+w+' '+(up?-w*.9:w*.9)+' '+(2*w)+' 0',3)}
  function chev(x,y,w,din){return t('M'+(x-din*w)+' '+(y-w*.75)+'l'+(din*w*1.6)+' '+(w*.75)+'l'+(-din*w*1.6)+' '+(w*.75),3)}
  function mouth(kind,y,w){
    w=w||5;
    if(kind==='smile')return t('M'+(-w)+' '+y+'q'+w+' '+(w*.95)+' '+(2*w)+' 0',2.6);
    if(kind==='flat')return t('M'+(-w)+' '+(y+1)+'h'+(2*w),2.6);
    if(kind==='smug')return t('M'+(-w)+' '+(y+.8)+'q'+(w*1.1)+' '+(w*1.2)+' '+(2*w+2.5)+' -2.6',2.8);
    if(kind==='sad')return t('M'+(-w)+' '+(y+3.5)+'q'+w+' '+(-w*.95)+' '+(2*w)+' 0',2.6);
    if(kind==='frown')return t('M'+(-w)+' '+(y+2.4)+'q'+(w*.8)+' '+(-w*.6)+' '+(2*w)+' .8',2.6);
    if(kind==='wobble')return t('M'+(-w-1)+' '+(y+2.5)+'q'+((w+1)/2)+' -3.6 '+(w+1)+' 0t'+(w+1)+' 0',2.4);
    if(kind==='o')return '<ellipse class="o" cx="0" cy="'+(y+2)+'" rx="3" ry="3.8" fill="'+DARK+'" style="stroke-width:2"/>';
    if(kind==='grit')return '<rect class="o" x="'+(-w-2.5)+'" y="'+(y-1.5)+'" width="'+(2*w+5)+'" height="8" rx="3" fill="'+WHITE+'" style="stroke-width:2.3"/>'+t('M'+(-w/2-.5)+' '+(y-1.5)+'v8M0 '+(y-1.5)+'v8M'+(w/2+.5)+' '+(y-1.5)+'v8',1.5);
    if(kind==='open')return '<path class="o" d="M'+(-w)+' '+y+'h'+(2*w)+'c0 '+(w*1.3)+' '+(-w*.5)+' '+(w*1.7)+' '+(-w)+' '+(w*1.7)+'s'+(-w)+' '+(-w*.4)+' '+(-w)+' '+(-w*1.7)+'Z" fill="'+DARK+'" style="stroke-width:2.3"/><ellipse cx="0" cy="'+(y+w*1.25)+'" rx="'+(w*.55)+'" ry="'+(w*.4)+'" fill="'+PINK+'"/>';
    return '';
  }
  function zz(x,y,kk){kk=kk||1;return '<g class="nt" style="--nx:'+(8*kk)+'px">'+t('M'+(x-5)+' '+(y-5)+'h10l-10 10h10',2.6)+'</g><g class="nt n2" style="--nx:'+(10*kk)+'px">'+t('M'+(x+10*kk-3.5)+' '+(y-19)+'h7l-7 7h7',2.2)+'</g>'}

  function head(sp,face,dir){
    var U=FUR[sp],F=U.f,L=U.l,D=U.d,E=U.e,k=dir||1,s='',my=17,mw=5,mk=face,INK=C.ink;
    var cheeks=function(x,y,rx,ry){rx=rx||5.5;ry=ry||3.6;var one=function(xx){return '<ellipse cx="'+xx+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="#ec7f6c" opacity=".4"/>'};return one(-x)+one(x)};
    var nose=function(y,rx,ry,col){return fe(0,y,rx,ry,col||INK)+'<ellipse cx="'+(-rx*.3)+'" cy="'+(y-ry*.36)+'" rx="'+(rx*.36)+'" ry="'+(ry*.24)+'" fill="#fff" opacity=".7"/>'};
    var sadBrow=function(e,y,w){w=w||11;return t('M'+(-e-w*.55)+' '+y+'l'+w+' -4.5M'+(e+w*.55)+' '+y+'l'+(-w)+' -4.5',2.6)};
    /* sclera pair with the stock expressions */
    var scl=function(o){
      var e=o.ex,y=o.ey,r=o.r,q=function(x,extra){var z={iris:o.iris,slit:o.slit,fur:o.fur||F,pr:o.pr},i;for(i in extra)z[i]=extra[i];return eyeS(x,y,r,z)};
      if(face==='smug')return q(-e,{px:k*r*.36,py:r*.22,lid:.5,low:.1,tilt:7})+q(e,{px:k*r*.36,py:r*.22,lid:.5,low:.1,tilt:-7})+t('M'+(-k*e-r*.9)+' '+(y-r-4.5)+'q'+(r*.9)+' '+(-r*.55)+' '+(r*1.8)+' 0',2.6)+t('M'+(k*e-r*.9)+' '+(y-r-2.5)+'h'+(r*1.8),2.6);
      if(face==='strain')return chev(-e,y,r*.66,1)+chev(e,y,r*.66,-1);
      if(face==='dizzy')return spiral(-e,y,Math.max(8,r))+spiral(e,y,Math.max(8,r));
      if(face==='wink')return q(-k*e,{px:k*r*.36,py:r*.22,lid:.5,low:.1,tilt:-k*7})+shut(k*e,y+1,r*.8,1)+t('M'+(-k*e-r*.9)+' '+(y-r-4.5)+'q'+(r*.9)+' '+(-r*.55)+' '+(r*1.8)+' 0',2.6);
      if(face==='sad')return q(-e,{px:k,py:r*.24,lid:.3,tilt:-16})+q(e,{px:k,py:r*.24,lid:.3,tilt:16})+sadBrow(e,y-r-4);
      return q(-e,{px:k*r*.16,lid:o.lid||0})+q(e,{px:k*r*.16,lid:o.lid||0});
    };
    var beads=function(e,y,rx,ry){
      if(face==='smug'){var hm=function(x){return '<path d="M'+(x-rx*1.3)+' '+(y-ry*.2)+'h'+(rx*2.6)+'a'+(rx*1.3)+' '+(ry*1.1)+' 0 0 1 '+(-rx*2.6)+' 0Z" fill="'+INK+'"/>'+dot(x-rx*.4+k*rx*.3,y+ry*.22,rx*.3,'#fff')+t('M'+(x-rx*1.8)+' '+(y-ry*.2)+'h'+(rx*3.6),2.8)};return hm(-e)+hm(e)+t('M'+(-k*e-rx*1.8)+' '+(y-ry-5)+'q'+(rx*1.8)+' '+(-rx*1.1)+' '+(rx*3.6)+' 0',2.6)}
      if(face==='strain')return chev(-e,y,rx*1.5,1)+chev(e,y,rx*1.5,-1);
      if(face==='dizzy')return spiral(-e,y,Math.max(8,rx*2))+spiral(e,y,Math.max(8,rx*2));
      if(face==='wink')return bead(-k*e,y,rx,ry)+shut(k*e,y+1,rx*1.5,1)+t('M'+(-k*e-rx*1.8)+' '+(y-ry-5)+'q'+(rx*1.8)+' '+(-rx*1.1)+' '+(rx*3.6)+' 0',2.6);
      return bead(-e,y,rx,ry)+bead(e,y,rx,ry)+(face==='sad'?sadBrow(e,y-ry-5):'');
    };
    var tearAt=[k*-21,6];

    if(sp==='cat'){
      s+=S('M-31 -6L-31 -38Q-30.5 -45 -25 -41L-6 -24Z',F,{inn:f('M-27.5 -13L-27.5 -34.5L-13.5 -22.5Z',E)})
        +S('M31 -6L31 -38Q30.5 -45 25 -41L6 -24Z',F,{inn:f('M27.5 -13L27.5 -34.5L13.5 -22.5Z',E)});
      s+=S('M-33 2C-33 -15 -19 -27 0 -27C19 -27 33 -15 33 2C33 6 35 9 39 12C34 15.5 31.5 16 29 16.5C24 26 12 30 0 30C-12 30 -24 26 -29 16.5C-31.5 16 -34 15.5 -39 12C-35 9 -33 6 -33 2Z',F,
        {inn:t('M-7 -28v10M0 -29v12M7 -28v10',3.6,D)+t('M-37 3.5h8M-36 10h7M37 3.5h-8M36 10h-7',3.2,D)+fe(0,18.5,15,11.5,L)+cheeks(22,10.5)});
      s+=t('M-15 15l-16 -4M-15 18.5l-16 2.5M15 15l16 -4M15 18.5l16 2.5',1.5);
      if(face==='sig'){
        var ce=function(x){return eyeS(x,-3,9.6,{iris:C.mustard,slit:1,pr:5.2,fur:F,px:k*3.8,py:.8,lid:.46,low:.15,cls:'sideeye',sty:'--k:'+k})};
        s+=ce(-14)+ce(14)+t('M-24 -15.5l13 3',2.8)+t('M5.5 -18q8 -6.5 16 -2',2.8);mk='none';
        s+=t('M-4.5 19.4q4 -2.8 9.5 .4',2.5);
      }else s+=scl({ex:14,ey:-3,r:9.6,iris:C.mustard,slit:1,pr:5.2,lid:.24});
      s+=f('M-3.8 8.6q3.8 -1.5 7.6 0l-3.8 4.4Z',PINK)+t('M0 13v2.6',1.8);my=17.2;mw=4.6;
      if(mk==='plain')mk='flatcat';
    }
    if(sp==='bear'){
      s+=S(EL(-25,-23,11,11),F,{inn:fe(-25,-22,5.6,5.6,E)})+S(EL(25,-23,11,11),F,{inn:fe(25,-22,5.6,5.6,E)});
      s+=S('M-34 2C-34 -17 -19 -29 0 -29C19 -29 34 -17 34 2C34 19 20 30 0 30C-20 30 -34 19 -34 2Z',F,{inn:fe(0,15.5,16,12.5,L)+cheeks(23,9.5)});
      s+=face==='sig'?shut(-13.5,-3.5,5)+shut(13.5,-3.5,5):beads(13.5,-4,3.8,4.7);
      s+=nose(8.5,6.4,4.5)+t('M0 13v3.5',2);my=17.5;
      if(face==='sig'){mk='none';s+=mouth('o',16.5)+'<g class="bub"><circle class="o" cx="'+(k*10)+'" cy="12" r="5.6" fill="#d3e5f5" style="stroke-width:1.8"/>'+dot(k*10-1.8,10.2,1.5,'#fff')+'</g>'+zz(k*36,-30,k)}
    }
    if(sp==='raccoon'){
      s+=S('M-33 -7L-33 -33Q-32 -40 -26 -37L-8 -24Z',F,{inn:f('M-29.5 -13L-29.5 -31L-16 -23Z',D)})+S('M33 -7L33 -33Q32 -40 26 -37L8 -24Z',F,{inn:f('M29.5 -13L29.5 -31L16 -23Z',D)});
      var brow='M-37 2C-31 -17 -12 -21 -2 -13L-2 -5C-14 -14 -30 -10 -38 6Z',mask='M-39 7.5C-36 -8 -18 -14 -2.5 -7C-2 3 -9 11.5 -21 14C-28 15.5 -36 13.5 -39 7.5Z';
      s+=S('M-36 5C-36 -13 -21 -27 0 -27C21 -27 36 -13 36 5C36 8 39 11 43 13C37 19.5 31 21 25.5 21C19 28 9 30 0 30C-9 30 -19 28 -25.5 21C-31 21 -37 19.5 -43 13C-39 11 -36 8 -36 5Z',F,
        {inn:f(brow,L)+mir(f(brow,L))+f(mask,D)+mir(f(mask,D))+f('M-3.5 -28h7l-2 17h-3Z',D)+fe(0,19,13,10.5,L)});
      if(face==='sig'){var re=function(x){return eyeS(x,-1.5,7.4,{fur:D,pr:3.9,cls:'glance'})};s+=re(-15.5)+re(15.5)}
      else s+=scl({ex:15.5,ey:-1.5,r:7.4,fur:D,pr:3.9});
      s+=nose(10,4.8,3.5)+t('M0 13.5v3',2);my=18;mw=4.6;
      if(face==='sig'){mk='none';s+='<g class="chew">'+S(EL(1,24,9.5,9),'#dba75c',{inn:dot(-2.5,21,1.8,'#6b3f26')+dot(4.5,23.5,1.7,'#6b3f26')+dot(-.5,28,1.6,'#6b3f26')})+'</g>'+dot(-17,25,1.5,'#c98f44')+dot(15,29,1.3,'#c98f44')+dot(-11,31,1.2,'#c98f44')}
    }
    if(sp==='capy'){
      s+=S(EL(-21,-25,7.5,6.5),F,{inn:fe(-21,-24,3.6,3.2,D)})+S(EL(21,-25,7.5,6.5),F,{inn:fe(21,-24,3.6,3.2,D)});
      s+=S('M-27 -8C-27 -21 -15 -28 0 -28C15 -28 27 -21 27 -8L31 12C33 25 19 31 0 31C-19 31 -33 25 -31 12Z',F,{inn:fe(0,21,23,14.5,L)});
      if(face==='sig'||face==='plain')s+=t('M-23.5 -9h9.5M14 -9h9.5',3.2)+t('M-22.5 -6.2q3.7 2.2 7.5 0M15 -6.2q3.7 2.2 7.5 0',1.6);
      else s+=beads(18.5,-9,3.2,3.9);
      s+=fe(-6.5,12.5,2,2.8,INK,-16)+fe(6.5,12.5,2,2.8,INK,16)+t('M0 17v4.5',2);my=21.5;mw=6;
      s+='<g class="wob">'+S(EL(0,-36,9,8.5),C.orange,{inn:'<ellipse cx="-3" cy="-39.5" rx="3" ry="2" fill="#fff" opacity=".45"/>'})+S('M1 -44.5c3 -5.5 9.5 -5.5 11.5 -2c-2.5 4 -8.5 5 -11.5 2Z',C.leaf,{ns:1,sw:2})+'</g>';
      if(mk==='sig')mk='plain';
    }
    if(sp==='pup'){
      s+=S('M-32 0C-32 -18 -18 -29 0 -29C18 -29 32 -18 32 0C32 18 20 30 0 30C-20 30 -32 18 -32 0Z',F,{inn:fe(-14,-4,13.5,14.5,'#eccaa2')+fe(0,16.5,13,10.5,'#fff')+cheeks(21.5,11)});
      s+=S('M-22 -26C-37 -31 -48 -13 -45 8C-44 17 -35 19 -32 11C-30 1 -27 -10 -20 -19Z',D)+S('M22 -26C37 -31 48 -13 45 8C44 17 35 19 32 11C30 1 27 -10 20 -19Z',D);
      if(face==='sig'){
        var be=function(x){return dot(x,-3,9.4)+dot(x-3.2,-6.4,3.3,'#fff')+dot(x+3.2,.5,1.5,'#fff')+'<path d="M'+(x-6)+' 2.6q6 4.6 12 0" fill="none" stroke="#8ea2ee" stroke-width="2" stroke-linecap="round"/>'};
        s+=be(-13.5)+be(13.5)+t('M-23 -15.5l11 -5.5M23 -15.5l-11 -5.5',2.6)+'<g class="drip">'+tear(k*-22,5,1)+'</g>';mk='wobble';
      }else s+=beads(13.5,-4,4,5);
      s+=nose(9,5.2,3.9)+t('M0 13v3',2);my=17;
    }
    if(sp==='lion'){
      var mane=scal(0,1,40,11,.28),tf='',i,an;
      for(i=0;i<11;i++){an=.28+(i+.5)*2*Math.PI/11;tf+='M'+(31*Math.cos(an)).toFixed(1)+' '+(1+31*Math.sin(an)).toFixed(1)+'L'+(40*Math.cos(an)).toFixed(1)+' '+(1+40*Math.sin(an)).toFixed(1)}
      s+=S(mane,D,{dx:-5,dy:-6,inn:t(tf,2.2,'#94421f')});
      s+=S(EL(-27,-28,8.5,8.5),F,{inn:fe(-27,-27.5,4.2,4.2,E)})+S(EL(27,-28,8.5,8.5),F,{inn:fe(27,-27.5,4.2,4.2,E)});
      s+=S('M-27 2C-27 -14 -15 -24 0 -24C15 -24 27 -14 27 2C27 17 16 27 0 27C-16 27 -27 17 -27 2Z',F,{inn:fe(0,15.5,14,10.5,L)+'<ellipse cx="18.5" cy="9.5" rx="5" ry="3.2" fill="#ec7f6c" opacity=".4"/>'});
      s+=S('M-10 -22C-9 -33 -1 -35 1 -29C5 -36 12 -31 10 -22C5 -18.5 -5 -18.5 -10 -22Z',D,{dx:-2,dy:-2.5});
      s+='<g transform="rotate(24 -17 9)"><rect class="o" x="-26" y="5.5" width="18" height="7.4" rx="3.7" fill="#f8dfc4" style="stroke-width:1.8"/><rect x="-20" y="6.4" width="6" height="5.6" fill="#eec39c"/></g>';
      if(face==='sig'){s+=shut(-11.5,-3,5.6)+shut(11.5,-3,5.6)+t('M-18.5 -12q6 -5 12.5 -2.5M6 -14.5q6.5 -2.5 12.5 2.5',2.6);mk='none';s+=mouth('open',15,5.4)+f('M-4 15.5l1.8 3.4l1.8 -3.4ZM.4 15.5l1.8 3.4l1.8 -3.4Z',WHITE)}
      else s+=scl({ex:11.5,ey:-4,r:7.2,pr:3.9,lid:.12});
      s+=f('M-5.5 5.5C-5.5 3.8 5.5 3.8 5.5 5.5C5.5 8 2 11 0 11C-2 11 -5.5 8 -5.5 5.5Z','#8e4424')+'<ellipse cx="-1.5" cy="5.8" rx="2" ry=".9" fill="#fff" opacity=".6"/>'+(face==='sig'?'':t('M0 11v3',2))+dot(-9,13.5,1)+dot(-12,16.5,1)+dot(9,13.5,1)+dot(12,16.5,1);my=15.5;mw=4.8;
    }
    if(sp==='turtle'){
      s+=S('M-27 0C-27 -17 -15 -27 0 -27C15 -27 27 -17 27 0C27 9 24 15 20 19C14 26 7 28 0 28C-7 28 -14 26 -20 19C-24 15 -27 9 -27 0Z',F,
        {inn:f('M-30 11C-14 19 14 19 30 11V32H-30Z',L)+dot(-9,-19,2.8,D)+dot(2,-22,2.1,D)+dot(11,-17.5,2.5,D)+dot(-17,-13,1.8,D)+cheeks(19,11,5,3.2)});
      if(face==='sig'){var te=function(x){return eyeS(x,-4,9,{fur:F,pr:4.4,py:2,lid:.52,lcls:'slow'})};s+=te(-13)+te(13)+'<g class="sweat">'+tear(k*-27,-20,1.15)+'</g>'}
      else s+=scl({ex:13,ey:-4,r:9,pr:4.4,lid:.28});
      s+=dot(-2.5,7,1.1)+dot(2.5,7,1.1);my=13;mw=9;
      if(mk==='sig')mk='plain';
    }
    if(sp==='rabbit'){
      s+=S('M-19 -20C-27 -42 -27 -70 -17 -76C-8 -74 -5 -46 -6 -22Z',F,{inn:f('M-17 -26C-22 -44 -21 -62 -16.5 -68C-12 -62 -10 -44 -11 -26Z',D)});
      s+=S('M6 -22C6 -40 10 -56 18 -62C25 -67 39 -62 44 -52C46 -46 40 -43 36 -47C30 -53 24 -50 22 -44C20 -36 20 -28 19 -20Z',F,{inn:f('M11 -26C11 -40 14 -52 20 -57C26 -60 34 -57 38 -52C30 -56 22 -54 18.5 -46C16.5 -40 16 -32 15.5 -26Z',D)});
      s+=S('M-30 3C-30 -15 -17 -26 0 -26C17 -26 30 -15 30 3C30 9 33 12 35 16C30 22 24 24 20 23C14 28 7 29 0 29C-7 29 -14 28 -20 23C-24 24 -30 22 -35 16C-33 12 -30 9 -30 3Z',F,{inn:fe(0,17,12.5,9.5,L)+cheeks(23,12,5.5,3.4)});
      s+=t('M-5 -25l-3 -8M0 -26l1 -9M5 -25l5 -7',2.2);
      if(face==='sig'){
        s+=eyeS(-14,-4,10.4,{fur:F,pr:2.6,px:k*1.5})+eyeS(14,-4,9,{fur:F,pr:2.3,px:k*1.5});
        s+=t('M-25 -17.5l12 -4.5M24 -16l-11 -4.5',2.6)+t('M-20 9q6 2.8 11 .5M9 8q5 2.5 10.5 0',1.5);mk='none';
        s+='<rect class="o" x="-10" y="14.5" width="20" height="9" rx="3.5" fill="'+WHITE+'" style="stroke-width:2.3"/>'+t('M-5 14.5v9M0 14.5v9M5 14.5v9',1.5);
        s+='<g class="spray">'+tear(k*-32,-22,.95)+tear(k*-40,-9,.75)+tear(k*33,-26,.8)+'</g>';
      }else s+=scl({ex:14,ey:-4,r:9.6,pr:4.6});
      s+=f('M-2.8 8.2h5.6l-2.8 3.2Z',PINK);my=15.5;mw=4.8;
      if(mk==='plain'||mk==='smug'){s+='<rect class="o" x="-3.2" y="'+(my+2)+'" width="6.4" height="5.6" rx="1.5" fill="'+WHITE+'" style="stroke-width:1.8"/>'+t('M0 '+(my+2)+'v5.6',1.2)}
    }
    if(sp==='sheep'){
      var W=L;
      s+=S(scal(0,-3,37,9,.35,1.16),W,{dx:-5,dy:-6});
      s+=S('M-22 -3C-33 -11 -46 -9 -50 -2C-46 6 -33 7 -22 3Z',F,{inn:f('M-26 -1.5C-33 -6 -41 -5 -45 -1.5C-41 2 -33 2.5 -26 1Z',E),dx:-2,dy:-3})+S('M22 -3C33 -11 46 -9 50 -2C46 6 33 7 22 3Z',F,{inn:f('M26 -1.5C33 -6 41 -5 45 -1.5C41 2 33 2.5 26 1Z',E),dx:-2,dy:-3});
      s+=S('M-24 3C-24 -12 -14 -21 0 -21C14 -21 24 -12 24 3C24 18 15 29 0 29C-15 29 -24 18 -24 3Z',F,{inn:fe(0,19,11,8.5,'#f8e3d2')+cheeks(16,12,5,3.2)});
      s+=S('M-18 -15C-24 -22 -19 -31 -10 -28C-8 -36 5 -37 8 -29C15 -33 23 -26 18.5 -17C12 -12 -11 -11 -18 -15Z',W,{dx:-2,dy:-3});
      if(face==='sig'||face==='plain')s+='<g class="wob" style="transform-origin:0 -40px"><ellipse cx="0" cy="-52" rx="17" ry="5.2" fill="none" stroke="'+INK+'" stroke-width="7.4"/><ellipse cx="0" cy="-52" rx="17" ry="5.2" fill="none" stroke="'+C.mustard+'" stroke-width="3.4"/></g>';
      if(face==='sig'){
        var she=function(x){return eyeS(x,-2,8.6,{fur:F,pr:4.2,px:k*3,py:-3.2,cls:'peek',sty:'--k:'+k})};
        s+=she(-11)+she(11)+t('M-17 -15.5q5.5 -3.5 11 -1M6 -16.5q5.5 -2.5 11 1',2.2);mk='none';
        s+='<ellipse class="o" cx="'+(k*2.5)+'" cy="20" rx="2.6" ry="3" fill="'+DARK+'" style="stroke-width:2"/>';
        s+=f('M-12 16.5c2 -1.5 4.5 -.5 4.5 1.5s-3 2.5 -4.5 1Z','#7a4a2a')+dot(-15,21,1.3,'#b98052')+dot(9,24,1.2,'#b98052')+dot(-8,24.5,1.1,'#b98052');
        s+='<g class="nt" style="--nx:'+(k*9)+'px">'+t('M'+(k*30)+' 8v-12l8 -2.5v11',2.2)+fe(k*30-2.6,8.5,3.4,2.6,INK,-20)+fe(k*30+5.4,5,3.4,2.6,INK,-20)+'</g>';
      }else s+=scl({ex:11,ey:-2,r:8.6,pr:4.2});
      s+=f('M-2.6 9.5h5.2l-2.6 3Z','#d98d7f')+(face==='sig'?'':t('M0 12.5v3',1.8));my=16.5;mw=4.4;
    }
    if(mk==='flatcat')s+=t('M-4.6 17.8q2.3 2 4.6 0q2.3 2 4.6 0',2.3);
    if(mk==='plain')s+=mouth('smile',my,mw);
    if(mk==='smug'||mk==='wink')s+=mouth('smug',my,mw);
    if(mk==='dizzy')s+=mouth('wobble',my,mw);
    if(mk==='sad')s+=mouth('sad',my,mw)+tear(tearAt[0],tearAt[1],.95);
    if(mk==='wobble')s+=mouth('wobble',my,mw);
    if(mk==='strain')s+=mouth('grit',my,mw)+tear(k*-36,-20,.9)+tear(k*-42,-7,.7);
    return s;
  }

  /* ───────── bodies ───────── */
  var TORSO={std:'M-17 22C-23 35 -28 52 -27 63C-26 77 26 77 27 63C28 52 23 35 17 22Z',
    lion:'M-24 24C-34 34 -32 54 -25 66C-21 77 21 77 25 66C32 54 34 34 24 24Z',
    capy:'M-22 22C-30 34 -33 54 -31 64C-29 78 29 78 31 64C33 54 30 34 22 22Z',
    bear:'M-20 22C-28 34 -32 52 -30 64C-28 78 28 78 30 64C32 52 28 34 20 22Z',
    turtle:'M-16 22C-21 34 -24 52 -23 63C-22 76 22 76 23 63C24 52 21 34 16 22Z'};
  var HEADTOP={cat:-27,bear:-29,lion:-33,rabbit:-26,turtle:-27,sheep:-36,raccoon:-27,capy:-45,pup:-29};
  function belly(sp){
    var U=FUR[sp];
    if(sp==='cat')return fe(0,55,13,18,U.l);
    if(sp==='bear')return fe(0,57,17,17,U.l);
    if(sp==='raccoon')return fe(0,55,13,17,U.l);
    if(sp==='capy')return fe(0,62,19,13,U.l);
    if(sp==='pup')return fe(0,56,13,17,'#fff');
    if(sp==='lion')return fe(0,56,15,18,U.l);
    if(sp==='rabbit')return fe(0,55,12.5,17,U.l);
    if(sp==='turtle')return fe(0,52,17,23,'#f3e6b3')+t('M-17 42h34M-18 54h36M-16 66h32M0 30v46',1.6,'#c9a65c');
    return '';
  }
  function bandaid(x,y,rot,w){w=w||16;return '<g transform="rotate('+rot+' '+x+' '+y+')"><rect class="o" x="'+(x-w/2)+'" y="'+(y-3.3)+'" width="'+w+'" height="6.6" rx="3.3" fill="#f8dfc4" style="stroke-width:1.7"/><rect x="'+(x-2.6)+'" y="'+(y-2.5)+'" width="5.2" height="5" fill="#eec39c"/></g>'}
  function neck(sp){
    var U=FUR[sp];
    if(sp==='cat')return tube('M-17.5 29.5Q0 37 17.5 29.5',2.6,C.crimson)+S(EL(0,37.5,3.3,3.3),C.mustard,{ns:1,sw:1.6});
    if(sp==='pup')return tube('M-18 29.5Q0 38 18 29.5',3.2,C.blue)+S(EL(0,39,3.8,3.8),C.mustard,{ns:1,sw:1.6});
    if(sp==='lion')return S('M-14 27C-10 37 -4 41 0 47C4 41 10 37 14 27C6 31 -6 31 -14 27Z',U.d,{dx:-2,dy:-2.5})+bandaid(11,54,-22);
    return '';
  }
  function arms(kind,F,dir){
    var k=dir||1,L1='M-21 37C-28 46 -26 56 -16 59',R1='M21 37C28 46 26 56 16 59';
    if(kind==='crossed')return tube('M-21 38C-14 52 4 55 15 47',9,F)+tube('M21 38C14 54 -4 57 -15 49',9,F);
    if(kind==='up')return tube('M-21 37C-40 34 -47 8 -41 -30',9,F)+tube('M21 37C40 34 47 8 41 -30',9,F);
    if(kind==='hips')return tube('M-22 36C-38 40 -38 54 -25 58',9,F)+tube('M22 36C38 40 38 54 25 58',9,F);
    if(kind==='bell')return k>0?tube(L1,9,F)+tube('M21 37C33 39 41 32 41 20',9,F):tube(R1,9,F)+tube('M-21 37C-33 39 -41 32 -41 20',9,F);
    if(kind==='none')return '';
    return tube(L1,9,F)+tube(R1,9,F);
  }
  /* tails are drawn for the right-hand side; the caller mirrors them */
  function tailOf(sp){
    var U=FUR[sp];
    if(sp==='cat')return tube('M18 66C44 73 51 51 40 40',8,U.f);
    if(sp==='raccoon')return S('M17 60C36 68 54 58 52 36C51 27 41 26 39 34C39 44 32 50 19 48Z',U.f,{inn:t('M29 45l9 18M40 37l15 9M39 27l16 1',5.5,U.d)});
    if(sp==='pup')return '<g class="wag" style="transform-origin:20px 66px">'+tube('M20 66C34 64 40 54 38 46',6.5,U.d)+'</g>';
    if(sp==='lion')return tube('M18 68C42 75 52 60 45 47',4.6,U.f)+S(EL(44,41,6.5,8),U.d);
    if(sp==='rabbit')return S(scal(27,64,7.5,7,0),U.l);
    if(sp==='sheep')return S(scal(27,60,6.5,6,0),U.l);
    if(sp==='turtle')return S('M21 66l14 4l-12 6Z',U.f,{ns:1});
    return '';
  }
  function shell(){return S(EL(0,50,36,33),'#c9a65c',{dx:-5,dy:-6,inn:'<ellipse cx="0" cy="50" rx="29" ry="26" fill="none" stroke="#a8853f" stroke-width="2"/>'+t('M-36 50h8M36 50h-8M-26 27l6 5M26 27l-6 5M-26 73l6 -5M26 73l-6 -5M0 17v7M0 83v-7',2,'#a8853f')})}
  function torso(sp){var U=FUR[sp];return S(sp==='sheep'?scal(0,50,25,9,.35,1.16):(TORSO[sp]||TORSO.std),sp==='sheep'?U.l:U.f,{inn:belly(sp)})+neck(sp)}
  /* whole figure, head centre at 0,0. pose: sit | lounge | stand. x.arms: rest | crossed | up | hips | bell | none */
  function fig(sp,face,dir,pose,x){
    x=x||{};var U=FUR[sp],LIMB=U.f,a=-(dir||1),s='',PAD=sp==='turtle'?U.d:(sp==='sheep'?'#b98a72':'#f3b8ad');
    s+='<g transform="scale('+a+' 1)">'+tailOf(sp)+'</g>';
    if(sp==='turtle')s+=shell();
    if(pose==='stand')s+=tube('M-11 66v14',10,LIMB)+tube('M11 66v14',10,LIMB)+S(EL(-13,86,10.5,6.5),LIMB)+S(EL(13,86,10.5,6.5),LIMB);
    s+=torso(sp);
    var sole=function(xx,yy,r){return S(EL(xx,yy,r,r*.92),LIMB,{inn:fe(xx,yy+r*.22,r*.5,r*.38,PAD)+dot(xx-r*.5,yy-r*.36,r*.17,PAD)+dot(xx,yy-r*.52,r*.17,PAD)+dot(xx+r*.5,yy-r*.36,r*.17,PAD)})};
    if(pose==='sit')s+=sole(-15,71,9.5)+sole(15,71,9.5);
    if(pose==='lounge')s+=tube('M-11 68L-14 80',11,LIMB)+tube('M11 68L14 80',11,LIMB)+sole(-15.5,87,12)+sole(15.5,87,12);
    s+=arms(x.arms||'rest',LIMB,dir);
    return s+'<g'+(x.tilt?' transform="rotate('+x.tilt+' 0 24)"':'')+'><g class="'+(x.hcls||'')+'">'+head(sp,face,dir)+'</g></g>';
  }
  /* The Blanket Bear's signature: one enormous lump of duvet with a face in it. Face centre at 0,6 */
  function lump(dir){
    var U=FUR.bear,k=dir||1,B='#fcf5e6',s='<g class="snore">';
    s+=S(EL(-24,75,13,7),U.f)+S(EL(26,76,13,7),U.f);
    s+=S('M-72 76C-84 42 -66 6 -46 -10C-52 -32 -30 -42 -22 -27C-10 -33 10 -33 22 -27C30 -42 52 -32 46 -10C66 6 84 42 72 76C42 83 -42 83 -72 76Z',B,
      {dx:-5,dy:-6,inn:t('M-60 -6C-30 -20 30 -20 60 -6',6.5,C.crimson)+t('M-80 26C-42 10 42 10 80 26',6.5,C.crimson)+t('M-84 50C-42 37 42 37 84 50',6.5,C.crimson)+t('M-80 70C-42 60 42 60 80 70',6.5,C.crimson)});
    s+=t('M38 -4C56 18 48 52 57 77',2)+t('M-41 8C-55 28 -46 58 -54 77',2)+t('M-32 -27q3 5 0 10M32 -27q-3 5 0 10',1.8);
    s+='<ellipse cx="0" cy="8" rx="33" ry="29" fill="none" stroke="'+C.ink+'" stroke-width="1.8" stroke-dasharray="3 5" stroke-linecap="round" opacity=".55"/>';
    s+=S(EL(0,8,28,24.5),U.f,{inn:fe(0,21.5,16,12,U.l)+'<ellipse cx="-18.5" cy="15" rx="5.4" ry="3.5" fill="#ec7f6c" opacity=".4"/><ellipse cx="18.5" cy="15" rx="5.4" ry="3.5" fill="#ec7f6c" opacity=".4"/>'});
    s+=shut(-12,3,5.8)+shut(12,3,5.8)+fe(0,14,6.4,4.5,C.ink)+'<ellipse cx="-1.9" cy="12.5" rx="2.3" ry="1.1" fill="#fff" opacity=".7"/>'+mouth('o',21);
    s+='<g class="bub"><circle class="o" cx="'+(k*11)+'" cy="17.5" r="6.4" fill="#d3e5f5" style="stroke-width:1.8"/>'+dot(k*11-2.1,15.3,1.7,'#fff')+'</g></g>';
    return s+zz(k*50,-38,k);
  }
  /* coffee-cup crown; sits with its base on y=-23 */
  function cupcrown(){return '<g class="steam">'+t('M-6 -57q3.5 -3.5 0 -8M5 -58q3.5 -3.5 0 -8',2.2)+'</g>'+t('M15 -38h4.5a5.5 5.5 0 0 1 0 11H15',3)+o('M-15 -40h30v11c0 4 -3 6 -7 6h-16c-4 0 -7 -2 -7 -6Z',C.paper)+f('M-13.4 -33.5h26.8v3.6h-26.8Z',C.crimson)+o('M-15 -40V-51l7.5 6 7.5 -9.5 7.5 9.5 7.5 -6v11Z',C.mustard)+dot(0,-44.5,1.9,C.crimson)}
  /* signature portrait for the picker; designed for viewBox -75 -60 150 107 */
  function bust(sp,dir){
    var U=FUR[sp],F=U.f,L=U.l,k=dir||1,s='',CK='#dba75c',CH='#6b3f26';
    var cookie=function(x,y,r){return S(EL(x,y,r,r*.95),CK,{inn:dot(x-r*.35,y-r*.3,r*.19,CH)+dot(x+r*.4,y,r*.18,CH)+dot(x-r*.1,y+r*.45,r*.17,CH)})};
    if(sp==='bear')return '<g transform="translate(-2 -11) scale(.76)">'+lump(k)+'</g>';
    if(sp==='cat'){
      s+='<g transform="translate(-15 0)"><g transform="scale(-1 1)">'+tailOf('cat')+'</g>'+torso('cat')+tube('M-21 38C-14 52 2 55 13 49',9,F)+tube('M21 38C31 42 41 37 44 26',9,F)+head('cat','sig',k);
      s+='<g class="paddle">'+t('M44.5 27L49.5 12',4,'#9a7748')+S(EL(54,-4,16,16),C.paper,{dx:-2,dy:-3})+'<text x="54" y="1" text-anchor="middle" style="font:700 12px var(--sans,Rubik,system-ui,sans-serif);fill:'+C.crimson+'">4/10</text></g>';
      return s+'</g>';
    }
    if(sp==='lion'){
      s+=torso('lion')+tube('M-22 36C-38 40 -38 54 -25 58',9,F)+'<g transform="rotate(-6 0 24)">'+head('lion','sig',k)+'</g>';
      s+='<g class="orate" style="transform-origin:24px 40px">'+tube('M24 41C38 41 51 31 54 14',9,F)+'</g>';
      s+='<g class="bug">'+S(EL(-35,-27,4.8,4),C.crimson,{ns:1,sw:1.6})+dot(-38.8,-28.4,1.8)+dot(-34,-27.4,.9)+dot(-32.4,-25.6,.8)+'</g>';
      return s+t('M48 -24l7 -6M53 -15l9 -3M54 -6l8 1',2.2);
    }
    if(sp==='turtle'){
      s+=shell()+torso('turtle')+tube('M21 37C28 46 26 56 16 59',9,F)+tube('M-20 37C-34 36 -42 24 -43 10',9,F)+head('turtle','sig',k);
      s+='<g class="dangle" style="transform-origin:-43px 9px">'+t('M-43 9C-46 14 -50 17 -52 22',1.8)+S('M-64 22h9l7 6.5c4 .8 7 2.5 7 5.5v1.5h-23Z',C.crimson,{ns:1,sw:2})+'<rect class="o" x="-65.5" y="34.5" width="26" height="4.4" rx="2.2" fill="'+WHITE+'" style="stroke-width:1.8"/>'+t('M-55.5 26l3.5 -2.4M-52 29.5l3.5 -2.4',1.5,WHITE)+'</g>';
      return s;
    }
    if(sp==='rabbit'){
      s+='<g transform="translate(0 13) scale(.82)"><g class="jit">'+torso('rabbit')+tube('M-21 37C-34 36 -44 26 -46 14',9,F)+tube('M21 37C34 36 44 26 46 12',9,F)+head('rabbit','sig',k);
      s+=S('M-58 -8h15v19a3 3 0 0 1 -3 3h-9a3 3 0 0 1 -3 -3Z',C.blue,{dx:-2,dy:-3})+S('M-55 -18h11v10h-11Z',C.paper,{ns:1,sw:2})+t('M-55 -15h-6',3)+t('M-44 -12l5 4',2.4)+dot(-68,-17,1.5,C.blue)+dot(-73,-12,1.3,C.blue)+dot(-70,-22,1.2,C.blue);
      s+=t('M46 12L53 -10',4,'#9a7748')+S(scal(56,-20,10.5,6,.2),C.mustard,{dx:-2,dy:-3});
      return s+'</g></g>'+t('M-66 30h9M-70 37h11M60 28h9M62 35h11',2);
    }
    if(sp==='sheep'){
      s+='<g transform="translate(0 9) scale(.88)">'+cookie(-30,47,9.5)+dot(-41,56,1.4,'#c98f44')+dot(-37,61,1.2,'#c98f44')+torso('sheep')+head('sheep','sig',k);
      s+='<g transform="rotate(24 33 -26)">'+S('M28 -36h9v12c0 2 6 3.5 6 8s-5 5 -9.5 3.5c-4 -1.5 -5.5 -4.5 -5.5 -8Z',C.crimson,{ns:1,sw:2})+t('M28 -31h9',2,WHITE)+'</g>';
      return s+'</g>';
    }
    if(sp==='raccoon'){
      s+='<path d="M-60 -50a11 11 0 1 0 13 14a9 9 0 0 1 -13 -14Z" fill="'+C.mustard+'" stroke="'+C.ink+'" stroke-width="2" stroke-linejoin="round"/>'+dot(-38,-50,1.5,WHITE)+dot(52,-46,1.7,WHITE)+dot(62,-28,1.2,WHITE)+dot(-66,-18,1.3,WHITE);
      s+=tailOf('raccoon')+torso('raccoon')+head('raccoon','sig',k)+S(EL(-10,29,5.4,4.8),F,{ns:1,sw:2.4})+S(EL(12,29,5.4,4.8),F,{ns:1,sw:2.4});
      return s;
    }
    if(sp==='capy'){
      s+='<g class="steam">'+t('M-48 4q4 -5 0 -10t0 -10M50 0q4 -5 0 -10t0 -10',2)+'</g>';
      s+=S(EL(0,30,57,9),'#cfe3f0',{ns:1})+S(EL(-41,24,9.5,9.5),C.paper,{dx:-2,dy:-2})+t('M40 30L46 6',3)+S(EL(47,2,3.6,5),C.mist,{ns:1,sw:2});
      s+='<g transform="translate(0 -5)">'+head('capy','sig',k)+'</g>';
      s+=S('M-59 30C-40 38.5 40 38.5 59 30L54 53H-54Z','#fbf6ea',{inn:t('M-59 34C-40 42.5 40 42.5 59 34',3,C.crimson)});
      s+='<g class="float">'+S(EL(-22,27,4,4),'#e6f0f7',{ns:1,sw:1.6})+S(EL(25,25,5,5),'#e6f0f7',{ns:1,sw:1.6})+S(EL(33,31,2.8,2.8),'#e6f0f7',{ns:1,sw:1.4})+'</g>';
      return s;
    }
    if(sp==='pup'){
      s+=S(EL(-50,41,18,6.5),'#f3e6b3',{ns:1,sw:2.2})+S('M-66 40C-66 27 -50 23 -42 32C-39 35 -39 38 -40 40Z',C.crimson,{dx:-2,dy:-2.5})+S(scal(-37,33,5.2,6,.2),WHITE,{ns:1,sw:2})+dot(-27,29,1.5,WHITE)+dot(-23,36,1.2,WHITE);
      s+='<g transform="scale(-1 1)">'+tailOf('pup')+'</g>'+torso('pup');
      s+='<g transform="rotate(7 0 24)">'+head('pup','sig',k)+'</g>';
      s+=tube('M-20 40C-21 49 -12 48 -4 43.5',9,F)+tube('M20 40C21 49 12 48 4 43.5',9,F);
      return s+'<path class="o" d="M50 -40l2.6 7 7 2.6-7 2.6-2.6 7-2.6-7-7-2.6 7-2.6Z" fill="'+WHITE+'" style="stroke-width:1.8"/><path class="o" d="M62 -22l1.6 4 4 1.600-4 1.600-1.600 4-1.600-4-4-1.600 4-1.600Z" fill="'+WHITE+'" style="stroke-width:1.500"/>';
    }
    return '';
  }
  function mini(sp,face,lean,dir){
    var U=FUR[sp],F=sp==='sheep'?U.l:U.f;
    return '<g transform="rotate('+lean+')">'+t('M-4 -8L-9 0M4 -8L10 0',3.4)+S('M-8 -24C-8 -32 8 -32 8 -24L9 -9C9 -5 -9 -5 -9 -9Z',F,{ns:1})+'<g class="mini" transform="translate(0 -39) scale(.37)">'+head(sp,face,dir)+'</g></g>';
  }
  function avatar(sp,face){return '<svg class="d" viewBox="'+SP[sp].vb+'" aria-hidden="true">'+head(sp,face||'plain',1)+'</svg>'}

  /* ───────── household objects (viewBox 0 0 48 48) ───────── */
  var OB={
    roll:function(){return o('M22 30v14l4-2.5 4 2.5 4-2.5 4 2.5V24',C.paper)+o('M14 11h21a6.5 10 0 0 1 0 20H14',C.paper)+e(14,21,6.5,10,C.paper)+'<ellipse cx="14" cy="21" rx="2.6" ry="4.2" fill="'+C.linen2+'"/>'+t('M24 17l3 2-3 2M35 17l-3 2 3 2',2)+dot(29.5,25.5,1.9)+f('M42 3c3 4 3 7 0 7s-3 -3 0 -7Z',C.blue)},
    blanket:function(){return o('M5 41C1 29 11 19 21 23C27 13 44 19 42 31C48 35 46 41 44 41Z',C.mustard)+t('M11 33c9-4 19-4 29 0',2.4,C.crimson)+t('M9 38c10-3 22-3 34 0',2.4,C.crimson)+t('M16 28q2.5 2 5 0M26 28q2.5 2 5 0',2)+t('M33 5h7l-7 7h7',2.2)+t('M26 11h4l-4 4h4',1.8)},
    tape:function(){return '<rect class="o" x="5" y="13" width="38" height="26" rx="5" fill="'+C.mustard+'"/><rect class="o" x="10" y="17" width="28" height="12" rx="3" fill="'+C.paper+'"/>'+dot(18,23,3.2)+dot(30,23,3.2)+t('M20 34q4 3 8 0',2)+t('M40 9V3l5 1',2.2)+dot(38.8,9.5,1.7)},
    mug:function(){return o('M10 17h22v15a8 8 0 0 1-8 8h-6a8 8 0 0 1-8-8Z',C.paper)+t('M32 21h4a5 5 0 0 1 0 10h-4',2.5)+t('M16 6q3 3 0 7M25 5q3 3 0 7',2)},
    dish:function(){return c(21,29,13.5,C.paper)+dot(21,29,7,C.linen)+c(38,13,4.5,C.mist)+c(30,7,2.8,C.mist)+c(43,24,2.6,C.mist)},
    foot:function(){return o('M19 44c-7 0-10-7-8-15 2-9 8-15 13-14 6 1 9 8 8 16-1 8-6 13-13 13Z',C.blush)+c(13,12,3.6,C.blush)+c(20,7.5,3,C.blush)+c(27,8,2.7,C.blush)+c(32.5,11.5,2.4,C.blush)+c(36.5,16,2.1,C.blush)},
    gavel:function(){return t('M7 43h20',4)+'<g class="gv">'+t('M27 27l13 14',4)+'<g transform="rotate(-38 22 20)"><rect class="o" x="10" y="13" width="26" height="14" rx="3.5" fill="'+C.mustard+'"/></g></g>'},
    plus:function(){return t('M24 10v28M10 24h28',4,'currentColor')},
    link:function(){return t('M20 28l8-8M17 23l-4 4a6 6 0 0 0 8.5 8.5l4-4M31 25l4-4a6 6 0 0 0-8.5-8.5l-4 4',3)},
    remote:function(){return '<g transform="rotate(18 24 24)"><rect class="o" x="15" y="4" width="18" height="40" rx="6" fill="'+C.paper+'"/>'+dot(24,12,3,C.crimson)+dot(20,22,1.8)+dot(28,22,1.8)+dot(20,29,1.8)+dot(28,29,1.8)+t('M21 37h6',2.4)+'</g>'},
    bag:function(){return c(39,10,5,C.mustard)+t('M39 1v2M47 10h2M45 4l1.5 -1.5',2)+o('M12 22c-4 10-3 22 4 22h16c7 0 8-12 4-22l-6-4H18Z',C.pan)+t('M18 18l6-8 6 8',2.5)+t('M19 18h10',3)},
    tray:function(){return t('M30 10q3 3 0 6',2)+o('M26 20h12v10a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5Z',C.paper)+t('M38 23h2a3.5 3.5 0 0 1 0 7h-2',2.2)+o('M7 34c0-8 6-12 14-10-3 2-3 6 0 10Z',C.mustard)+t('M14 26l1 8',2)+o('M8 38l2 5h28l2-5',C.paper)+t('M4 38h40',3.4)},
    cups:function(){return c(39,9,5,C.mustard)+t('M39 0v2M47 9h1.5M45 3l1.5 -1.5',2)+o('M6 20h20v14a7 7 0 0 1-7 7h-6a7 7 0 0 1-7-7Z',C.paper)+t('M26 24h3.5a4.500 4.500 0 0 1 0 9H26',2.4)+t('M11 9q3 3 0 7M19 8q3 3 0 7',2)+t('M3 44h30',3)}
  };
  function ob(name,cls){return '<svg class="d sm '+(cls||'')+'" viewBox="0 0 48 48" aria-hidden="true">'+OB[name]()+'</svg>'}

  /* ───────── retro stickers for the preset crimes (viewBox 0 0 64 64) ───────── */
  var ST={
    sip:function(){return o('M20 28l6-10h14l6 10v27a3 3 0 0 1-3 3H23a3 3 0 0 1-3-3Z',C.paper)+t('M26 18v-4h14v4M20 28h26',2.8)+f('M21.5 36h23v11h-23z',C.blue)+dot(29,41.5,2,C.paper)+dot(37,41.5,2,C.paper)+t('M30 53q3 -2.5 6 0',2.2)
      +o('M46 17c0-11 14-11 14 0v11l-3.5-2.6-3.5 2.6-3.5-2.6-3.5 2.6Z',C.paper)+dot(50.5,15,1.6)+dot(55.5,15,1.6)+t('M51.5 20q1.5 1.5 3 0',1.8)+drop(9,32,1)+drop(13,44,.8)+drop(7,52,.7)},
    trash:function(){return o('M33 15c-7-3-4-9-1-13 1 4 6 4 5 9 2-1 3-3 3-3 2 5-1 9-7 7Z',C.crimson)+f('M33 13.5c-3-1-2-4 0-6 1 2 3 3 2 6Z',C.mustard)
      +'<g transform="rotate(7 32 20)"><rect class="o" x="23" y="15" width="18" height="8" rx="2" fill="'+C.mustard+'"/></g><g transform="rotate(-8 32 28)"><rect class="o" x="21" y="23" width="20" height="8" rx="2" fill="'+C.paper+'"/></g><g transform="rotate(4 32 35)"><rect class="o" x="19" y="31" width="26" height="8" rx="2" fill="'+C.crimson+'"/></g>'
      +o('M16 40h32l-3 20a2 2 0 0 1-2 2H21a2 2 0 0 1-2-2Z',C.blue)+t('M13 40h38',3.6)+dot(27,49,2,C.paper)+dot(37,49,2,C.paper)+'<path d="M26 56q3-3 6 0t6 0" fill="none" stroke="'+C.paper+'" stroke-width="2.2" stroke-linecap="round"/>'
      +t('M55 32q3-3 0-6t0-6',2.2)+t('M9 32q-3-3 0-6t0-6',2.2)},
    dish:function(){return c(22,27,11,C.paper)+dot(22,27,6,C.linen)+'<g transform="rotate(24 41 25)">'+e(41,25,5,12,C.paper)+'</g><g transform="rotate(-30 31 22)"><rect class="o" x="27" y="8" width="9" height="15" rx="3" fill="'+C.crimson+'"/></g>'
      +t('M50 6l7 17M54 5l1 6M58 7l-2 5',2.4)+t('M10 14l-5-4M14 10l-2-6',2.2)
      +o('M8 34h48l-4 24a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2Z',C.mist)+t('M16 34l2 26M48 34l-2 26M10 47h8M46 47h8',2)
      +t('M24 43l4 2.5-4 2.5M40 43l-4 2.5 4 2.5',2.2)+'<circle class="t" cx="32" cy="54" r="2.6" style="stroke-width:2.2"/>'},
    movie:function(){return c(23,25,6,C.butter)+c(41,25,6,C.butter)+c(32,21,7,C.butter)+c(27,28,5,C.butter)+c(37,28,5,C.butter)
      +o('M18 29h28l-4 30a2 2 0 0 1-2 2H24a2 2 0 0 1-2-2Z',C.paper)+f('M24.6 30.4h4.6l1 29.2h-4z',C.crimson)+f('M34.8 30.4h4.6l-1.6 29.2h-4z',C.crimson)
      +t('M24 43q3 3 6 0M34 43q3 3 6 0',2.4)+t('M29.5 51q2.5 2 5 0',2.2)+t('M48 5h8l-8 8h8',2.6)+t('M53 19h5l-5 5h5',2.2)
      +'<g transform="rotate(-10 12 14)"><rect class="o" x="1" y="8" width="22" height="13" rx="3" fill="'+C.ink+'"/>'+ptxt(12,17.6,'0:04',C.paper)+'</g>'},
    burrito:function(){var B=FUR.bear.f;return '<g transform="rotate(-14 32 38)">'+e(58,34,4,5.5,B)+e(59,43,4,5.5,B)+'<rect class="o" x="13" y="24" width="44" height="27" rx="13.5" fill="'+C.mustard+'"/>'+t('M26 24c-4 7-4 20 0 27M37 24c-4 7-4 20 0 27M48 24c-4 7-4 20 0 27',2.4,C.crimson)
      +c(6,29,4,B)+c(6,46,4,B)+c(13,37.5,10,B)+fe(11,40,5,4,FUR.bear.l)+t('M8 35q2 2 4 0M14.5 35q2 2 4 0',2)+dot(11,39,1.5)+'</g>'
      +'<g transform="rotate(9 50 13)"><rect class="o" x="39" y="6" width="23" height="13" rx="3" fill="'+C.blue+'"/>'+ptxt(50.5,15.6,'95%',C.paper)+'</g>'},
    pan:function(){return t('M18 26c-5-5 5-9 0-16M29 23c-5-5 5-9 0-16M40 26c-5-5 5-9 0-16',2.6)+t('M42 51L59 58',7)+c(29,46,15,C.pan)+dot(29,46,10.5,'#545b7c')+dot(24.5,44.5,2.1,C.paper)+dot(33.5,44.5,2.1,C.paper)+'<path d="M24.5 50q4.5 3.5 9 0" fill="none" stroke="'+C.paper+'" stroke-width="2.2" stroke-linecap="round"/>'
      +c(9,56,3.6,C.mist)+c(52,39,2.8,C.mist)+c(7,43,2.4,C.mist)},
    clock:function(){return o('M46 3l3 8 8-3-3 8 8 3-8 3 3 8-8-3-3 8-3-8-8 3 3-8-8-3 8-3-3-8 8 3Z',C.mustard)+'<g transform="rotate(35 47 22)"><rect class="o" x="38" y="15" width="18" height="14" rx="5" fill="'+C.paper+'"/>'+t('M44 15v6M49.5 15v6',2)+'</g>'
      +e(17,28,6,4,C.crimson,-32)+c(28,43,16,C.paper)+t('M28 43v-9M28 43l6 4',2.6)+t('M36 30l-4 6 6 2-5 7',2.2,C.crimson)+t('M17 56l-4 5M39 56l4 5',3)+t('M8 36l-5-2M8 44H2',2.2)},
    roll:function(){return '<g transform="translate(6 9) scale(1.12)">'+OB.roll()+'</g><g transform="rotate(-8 50 52)"><rect class="o" x="35" y="46" width="28" height="13" rx="3" fill="'+C.crimson+'"/>'+ptxt(49,55.4,'EMPTY',C.paper,7.4)+'</g>'},
    tape:function(){return '<g transform="translate(6 8) scale(1.1)">'+OB.tape()+'</g>'},
    crumbs:function(){return '<rect class="o" x="6" y="30" width="52" height="24" rx="9" fill="'+C.mist+'"/>'+t('M12 42h40',2)+c(25,22,11,C.gold2)+f('M19 18a3 3 0 1 0 .1 0M29 17a2.4 2.4 0 1 0 .1 0M26 25a2.6 2.6 0 1 0 .1 0',C.pan)+o('M36 20a11 11 0 0 0-6-9c2 4-2 7 0 9Z',C.mist,' style="stroke-width:0"')
      +dot(40,38,2,C.gold2)+dot(47,44,1.6,C.gold2)+dot(18,46,1.8,C.gold2)+dot(31,47,1.4,C.gold2)+dot(52,36,1.4,C.gold2)+t('M48 8h7l-7 7h7',2.4)+'<g transform="rotate(8 14 14)"><rect class="o" x="2" y="8" width="24" height="13" rx="3" fill="'+C.ink+'"/>'+ptxt(14,17.6,'2 AM',C.paper)+'</g>'}
  };
  function st(name){return '<svg class="d stk" viewBox="0 0 64 64" aria-hidden="true">'+ST[name]()+'</svg>'}


  function RR(x,y,w,h,r){return 'M'+(x+r)+' '+y+'h'+(w-2*r)+'a'+r+' '+r+' 0 0 1 '+r+' '+r+'v'+(h-2*r)+'a'+r+' '+r+' 0 0 1 '+(-r)+' '+r+'h'+(-(w-2*r))+'a'+r+' '+r+' 0 0 1 '+(-r)+' '+(-r)+'v'+(-(h-2*r))+'a'+r+' '+r+' 0 0 1 '+r+' '+(-r)+'Z'}
  function sofa(x,y,w){
    return t('M'+(x+10)+' '+(y+104)+'v12M'+(x+w-10)+' '+(y+104)+'v12',4)
      +S(RR(x,y,w,92,26),C.mustard,{dx:-5,dy:-6})
      +S(RR(x-4,y+60,w+8,44,16),C.gold2,{dx:-4,dy:-5})
      +S(RR(x-24,y+32,42,76,19),C.mustard,{dx:-4,dy:-5})
      +S(RR(x+w-18,y+32,42,76,19),C.mustard,{dx:-4,dy:-5});
  }
  /* a crime badge as a round token */
  function token(name,x,y,r,rot){return '<g transform="translate('+x+' '+y+') rotate('+(rot||0)+')">'+S(EL(0,0,r,r),C.paper,{dx:-2,dy:-2.5,sw:2.4})+'<g class="tkn" transform="translate('+(-r*.74)+' '+(-r*.74)+') scale('+(r*1.48/64).toFixed(3)+')">'+ST[name]()+'</g></g>'}

  /* ───────── scenes (pure versions of the prototype's illustrations) ───────── */
  function star(x,y,r){return '<path class="o" d="M'+x+' '+(y-r)+'l'+(r*.28)+' '+(r*.72)+' '+(r*.72)+' '+(r*.28)+' '+(-r*.72)+' '+(r*.28)+' '+(-r*.28)+' '+(r*.72)+' '+(-r*.28)+' '+(-r*.72)+' '+(-r*.72)+' '+(-r*.28)+' '+(r*.72)+' '+(-r*.28)+'Z" fill="'+WHITE+'" style="stroke-width:1.7"/>'}
  /* the winner on the sofa: lounging, crowned, drink in hand. Origin = head centre */
  function winnerUnit(sp,face,k){
    return '<g transform="scale('+k+')">'+fig(sp,face,1,'lounge',{arms:'bell'})
      +S('M34.5 1h13.5l-2 19.5h-9.5Z','#e9f1f6',{ns:1,sw:2.2,inn:f('M33 8.5h17v13h-17Z',C.orange)})+t('M44 5l4.5 -14',2.2,C.crimson)+S('M27 -2a9 9 0 0 1 18 0Z',C.crimson,{ns:1,sw:2})+t('M36 -2v5',1.6)
      +'<g transform="translate(0 '+(HEADTOP[sp]+25)+') rotate(-8 0 -30)">'+cupcrown()+'</g></g>';
  }
  /* intro: the whole household. viewBox 0 44 390 292 */
  function heroScene(){
    var R=FUR.raccoon.f;
    var s='<svg class="d" viewBox="0 44 390 292" role="img" aria-label="The whole household: a bear asleep in a duvet lump that takes up the entire sofa, a cat judging it from the armrest, and a sheep, raccoon, turtle, rabbit, capybara, puppy and lion around them">';
    s+='<ellipse cx="195" cy="306" rx="186" ry="13" fill="rgba(27,36,64,.07)"/>';
    s+='<g transform="translate(140 124) scale(.7)">'+head('sheep','sig',1)+'</g>';
    s+='<g transform="translate(331 158) scale(.8)">'+head('raccoon','sig',-1)+'</g>';
    s+=sofa(78,138,234)+S(EL(316,171,6.5,5.5),R,{ns:1,sw:2.4})+S(EL(344,171,6.5,5.5),R,{ns:1,sw:2.4});
    s+='<g transform="translate(206 152) scale(1.08)">'+lump(1)+'</g>';
    s+='<g transform="translate(76 96)"><g class="breathe">'+fig('cat','sig',1,'sit',{arms:'crossed'})+'</g></g>';
    s+='<g transform="translate(46 262) scale(.62)">'+fig('turtle','sig',1,'sit')+'</g>';
    s+='<g transform="translate(120 264) scale(.62)"><g class="jit">'+fig('rabbit','sig',1,'sit')+'</g></g>';
    s+='<g transform="translate(193 264) scale(.62)">'+fig('capy','sig',1,'sit')+'</g>';
    s+='<g transform="translate(264 264) scale(.62)">'+fig('pup','sig',-1,'sit')+'</g>';
    s+='<g transform="translate(338 254) scale(.66)">'+fig('lion','sig',-1,'stand',{arms:'hips',tilt:5})+'</g>';
    return s+'</svg>';
  }
  /* the static verdict illustration (the 9:16 card's picture band). viewBox 0 -30 350 196.
     o: {winner, loser, tokens: [stickerKey x3], label}. Animation hooks: .crown .spk .loser .tower .lz(--i) .ding */
  function verdictScene(o){
    var W=o.winner,Lz=o.loser,tk=o.tokens||[],k=(W==='capy'||W==='rabbit')?.9:1,wx=97,wy=43,lx=276,ls=.8,ly=158-92.5*ls;
    var s='<svg class="d" viewBox="0 -30 350 196" role="img" aria-label="'+esc(o.label||'The winner lounges on the sofa in a coffee-cup crown; the loser staggers under a laundry basket piled with the week’s top crimes.')+'">';
    s+=t('M8 158h334',2.2)+sofa(22,50,150);
    var sy=wy+98*k;
    s+=S(RR(wx-27,sy,54,158-sy,Math.min(8,(158-sy)/2)),C.crimson,{dx:-3,dy:-3})+t('M'+(wx-15)+' '+(sy+(158-sy)/2)+'h30',1.8,'#e9826f');
    s+='<g class="ding" style="transform-origin:176px 82px">'+S('M165 82C165 70 187 70 187 82Z',C.mist,{ns:1,sw:2.4})+t('M161 82.5h30',3.2)+t('M176 71v-3.5',3.6)+'</g>';
    s+='<g transform="translate('+wx+' '+wy+') scale('+k+')">'+fig(W,'smug',1,'lounge',{arms:'bell'});
    s+=S('M34.5 1h13.5l-2 19.5h-9.5Z','#e9f1f6',{ns:1,sw:2.2,inn:f('M33 8.5h17v13h-17Z',C.orange)})+t('M44 5l4.5 -14',2.2,C.crimson)+S('M27 -2a9 9 0 0 1 18 0Z',C.crimson,{ns:1,sw:2})+t('M36 -2v5',1.6);
    s+='</g>';
    s+='<g class="crown" style="transform-origin:'+wx+'px 10px"><g transform="translate('+wx+' '+wy+') scale('+k+') translate(0 '+(HEADTOP[W]+25)+') rotate(-8 0 -30)">'+cupcrown()+'</g></g>';
    s+='<g class="spk">'+star(36,16,7.5)+star(14,62,4.5)+'</g>';
    var ty=ly+HEADTOP[Lz]*ls+4,pos=[[-13,-45,-9],[13,-47,8],[1,-67,-3]];
    s+='<g class="loser" style="transform-origin:'+lx+'px 158px"><g transform="translate('+lx+' '+ly+') scale('+ls+')">'+fig(Lz,'strain',-1,'stand',{arms:'up'})+'</g></g>';
    s+='<g class="tower" style="transform-origin:'+lx+'px '+ty+'px">';
    s+='<g class="lz" style="--i:0">'+S('M'+(lx-25)+' '+(ty-23)+'C'+(lx-28)+' '+(ty-37)+' '+(lx-8)+' '+(ty-40)+' '+(lx-2)+' '+(ty-31)+'C'+(lx+6)+' '+(ty-41)+' '+(lx+28)+' '+(ty-36)+' '+(lx+25)+' '+(ty-23)+'Z',C.mist,{dx:-2,dy:-3})
      +S('M'+(lx-31)+' '+(ty-22)+'h62l-5 22h-52Z','#e7c98f',{inn:t('M'+(lx-19)+' '+(ty-22)+'l3 22M'+(lx-6.5)+' '+(ty-22)+'l1 22M'+(lx+6.5)+' '+(ty-22)+'l-1 22M'+(lx+19)+' '+(ty-22)+'l-3 22M'+(lx-31)+' '+(ty-11)+'h62',1.6,'#b98f4d')})
      +S(RR(lx-34,ty-27,68,8,4),'#d9b473',{ns:1,sw:2.4})
      +S('M'+(lx+20)+' '+(ty-26)+'h10v14c0 3 7 4 7 9s-6 6 -11 4.5c-4 -1.5 -6 -5 -6 -9Z',C.crimson,{ns:1,sw:2.2})+t('M'+(lx+20)+' '+(ty-20)+'h10',2.2,WHITE)+'</g>';
    for(var i=0;i<3&&i<tk.length;i++)s+='<g class="lz" style="--i:'+(i+1)+'">'+token(tk[i],lx+pos[i][0],ty+pos[i][1],14.5,pos[i][2])+'</g>';
    return s+'</g></svg>';
  }
  /* the story reel's illustration, one <svg> per animated layer (all share viewBox 0 0 270 228, drawn at 4 px per unit
     on the 1080x1920 stage at top 420). o: {winner, loser, tokens}. See docs/reel.md for the timeline. */
  function storyLayers(o){
    var W=o.winner,Lz=o.loser,tk=o.tokens||[],k=(W==='capy'||W==='rabbit')?.9:1,FB=189,FL=222,wx=109,wy=FB-115,lx=200,hy=FL-80+HEADTOP[Lz];
    var L={},open=function(){return '<svg class="d" viewBox="0 0 270 228" aria-hidden="true">'},sy=wy+98*k,i;
    L.floor=open()+'<rect x="0" y="170" width="270" height="58" fill="#f2d78e"/>'+t('M0 170h270',2.2)+'</svg>';
    L.sofa=open()+'<ellipse cx="'+wx+'" cy="'+(FB+6)+'" rx="104" ry="9" fill="rgba(27,36,64,.1)"/>'+sofa(34,FB-108,150)+S(RR(wx-27,sy,54,FB-sy,Math.min(8,(FB-sy)/2)),C.crimson,{dx:-3,dy:-3})+t('M'+(wx-15)+' '+(sy+(FB-sy)/2)+'h30',1.8,'#e9826f')+'</svg>';
    L.winner=open()+'<g transform="translate('+wx+' '+wy+')">'+winnerUnit(W,'smug',k)+'</g></svg>';
    L.winnerWink=open()+'<g transform="translate('+wx+' '+wy+')">'+winnerUnit(W,'wink',k)+'</g></svg>';
    L.sparkles=open()+star(44,34,8)+star(18,92,5)+'</svg>';
    L.loserIn=open()+'<ellipse cx="'+lx+'" cy="'+(FL-2)+'" rx="34" ry="5" fill="rgba(27,36,64,.1)"/><g transform="translate('+lx+' '+(FL-92.5)+')">'+fig(Lz,'sad',-1,'stand')+'</g></svg>';
    L.loserBuried=open()+'<g transform="translate('+lx+' '+(FL-80)+')">'+fig(Lz,'dizzy',-1,'sit',{tilt:-7})+'</g></svg>';
    L.basket=open()+'<g transform="rotate(-9 '+lx+' '+hy+')">'+S('M'+(lx-25)+' '+(hy-25)+'h50l8 33h-66Z','#e7c98f',{inn:t('M'+(lx-13)+' '+(hy-25)+'l-3 33M'+lx+' '+(hy-25)+'v33M'+(lx+13)+' '+(hy-25)+'l3 33M'+(lx-33)+' '+(hy-9)+'h66',1.6,'#b98f4d')})
      +S(RR(lx-37,hy+4,74,8,4),'#d9b473',{ns:1,sw:2.4})+S('M'+(lx+27)+' '+(hy+6)+'h10v14c0 3 7 4 7 9s-6 6 -11 4.5c-4 -1.5 -6 -5 -6 -9Z',C.crimson,{ns:1,sw:2.2})+t('M'+(lx+27)+' '+(hy+12)+'h10',2.2,WHITE)+'</g></svg>';
    L.laundry=open()+S('M'+(lx-58)+' '+FL+'C'+(lx-64)+' '+(FL-34)+' '+(lx-40)+' '+(FL-58)+' '+(lx-16)+' '+(FL-49)+'C'+(lx-6)+' '+(FL-63)+' '+(lx+18)+' '+(FL-62)+' '+(lx+24)+' '+(FL-47)+'C'+(lx+48)+' '+(FL-54)+' '+(lx+66)+' '+(FL-30)+' '+(lx+60)+' '+FL+'Z',C.paper,
        {dx:-4,dy:-5,inn:t('M'+(lx-66)+' '+(FL-22)+'C'+(lx-30)+' '+(FL-34)+' '+(lx+30)+' '+(FL-34)+' '+(lx+68)+' '+(FL-22),5.5,C.crimson)+t('M'+(lx-66)+' '+(FL-7)+'C'+(lx-30)+' '+(FL-17)+' '+(lx+30)+' '+(FL-17)+' '+(lx+68)+' '+(FL-7),5.5,C.crimson)+t('M'+(lx-50)+' '+(FL-39)+'C'+(lx-20)+' '+(FL-50)+' '+(lx+24)+' '+(FL-50)+' '+(lx+52)+' '+(FL-38),5.5,C.crimson)})
      +S('M'+(lx+18)+' '+FL+'C'+(lx+14)+' '+(FL-20)+' '+(lx+30)+' '+(FL-30)+' '+(lx+44)+' '+(FL-22)+'C'+(lx+54)+' '+(FL-14)+' '+(lx+54)+' '+(FL-4)+' '+(lx+50)+' '+FL+'Z',C.blue,{dx:-2,dy:-3})+'</svg>';
    var pos=[[lx-38,FL-44,-12],[lx+40,FL-40,10],[lx+3,hy-37,5]];
    L.tokens=[];for(i=0;i<3;i++)L.tokens.push(open()+(tk[i]?token(tk[i],pos[i][0],pos[i][1],13.5,pos[i][2]):'')+'</svg>');
    L.plates=open()+S(EL(lx-72,FL-3,17,4.6),C.paper,{ns:1,sw:2.4})+S(EL(lx-71,FL-8.5,17,4.6),C.paper,{ns:1,sw:2.4})+S(EL(lx-73,FL-14,17,4.6),C.paper,{ns:1,sw:2.4})+'<ellipse cx="'+(lx-73)+'" cy="'+(FL-14)+'" rx="10" ry="2.4" fill="'+C.linen+'"/></svg>';
    L.orbit=open()+'<g transform="translate('+lx+' '+(hy-34)+') scale(1 .36)"><g class="orbit">'+star(34,0,7)+star(-30,-14,6)+star(-10,32,5.5)+'</g></g></svg>';
    L.geometry={unit:4,viewBox:[270,228],stageTop:420,sofaFloor:FB,floor:FL,winnerX:wx,winnerY:wy,winnerScale:k,loserX:lx,loserHeadTop:hy,tokenPositions:pos};
    return L;
  }
  /* the wax seal of the cold open */
  function sealSVG(){return '<svg class="d" viewBox="-70 -70 140 140" aria-hidden="true">'+S(scal(0,0,56,16,0,1.15),C.crimson,{dx:-4,dy:-5})+'<circle cx="0" cy="0" r="41" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2.5"/><g transform="translate(-26 -25) scale(1.1)">'+OB.gavel()+'</g></svg>'}

  /* ───────── wrappers that return complete <svg> elements ───────── */
  function need(kind,ok,v){if(!ok)throw new Error('Unknown '+kind+': '+v)}
  /* tokens are sticker keys (e.g. 'tape'), not crime keys (e.g. 'dj'); map through the crime catalog first */
  function chkScene(o){chk(o.winner);chk(o.loser);need('pair (winner and loser must differ)',o.winner!==o.loser,o.winner);(o.tokens||[]).forEach(function(k){need('sticker',!!ST[k],k)})}
  function chk(sp,face){need('species',!!SP[sp],sp);if(face!=null)need('face',['plain','sig','smug','sad','strain','wink','dizzy'].indexOf(face)>=0,face)}
  function wrap(inner,vb,cls,label){return '<svg class="d'+(cls?' '+cls:'')+'" viewBox="'+vb+'"'+(label?' role="img" aria-label="'+esc(label)+'"':' aria-hidden="true"')+'>'+inner+'</svg>'}
  return {
    /* head only, framed for a round avatar */
    avatar:function(sp,face,label){chk(sp,face);return wrap(head(sp,face||'plain',1),SP[sp].vb,'',label)},
    /* head only, generous frame (ears, halo, sweat drops); dir: 1 looks right, -1 looks left */
    headSVG:function(sp,face,dir,label){chk(sp,face);return wrap(head(sp,face||'plain',dir||1),'-62 -86 124 124','',label)},
    /* head with the die-cut white sticker border (pair with the .stk class in art.css) */
    stickerHead:function(sp,face,dir){chk(sp,face);return wrap(head(sp,face||'plain',dir||1),SP[sp].vb,'stk')},
    /* signature portrait for the picker card; designed for a 150x107 frame */
    portrait:function(sp,label){chk(sp);return wrap(bust(sp,1),'-75 -60 150 107','',label)},
    /* full figure. pose: sit | lounge | stand. arms: rest | crossed | up | hips | bell | none */
    figureSVG:function(sp,face,dir,pose,x){chk(sp,face);need('pose',!pose||['sit','lounge','stand'].indexOf(pose)>=0,pose);return wrap(fig(sp,face||'plain',dir||1,pose||'sit',x||{}),'-70 -90 140 200')},
    lumpSVG:function(){return wrap(lump(1),'-90 -70 180 170')},
    cupCrownSVG:function(){return wrap(cupcrown(),'-26 -64 52 46')},
    /* crime sticker (64x64) and UI icon (48x48) */
    sticker:function(key){need('sticker',!!ST[key],key);return st(key)},
    icon:function(name,cls){need('icon',!!OB[name],name);return ob(name,cls)},
    scenes:{hero:heroScene,verdict:function(o){chkScene(o);return verdictScene(o)},story:function(o){chkScene(o);return storyLayers(o)},seal:sealSVG},
    /* inner markup builders for custom compositions (no <svg> wrapper) */
    raw:{head:head,bust:bust,fig:fig,lump:lump,cupcrown:cupcrown,token:token,sofa:sofa,shape:S,ellipse:EL,roundedRect:RR,scallop:scal,tube:tube,tear:tear,mouth:mouth,star:star,winnerUnit:winnerUnit,mini:mini},
    SPECIES:SP,ORDER:ORDER,FUR:FUR,HEADTOP:HEADTOP,COLORS:C,
    STICKERS:Object.keys(ST),ICONS:Object.keys(OB),
    FACES:['plain','sig','smug','sad','strain','wink','dizzy'],POSES:['sit','lounge','stand'],ARMS:['rest','crossed','up','hips','bell','none']
  };
}

const base=createArt({idPrefix:'pt'});
export const SPECIES=base.SPECIES,ORDER=base.ORDER,FUR=base.FUR,HEADTOP=base.HEADTOP,COLORS=base.COLORS,STICKERS=base.STICKERS,ICONS=base.ICONS,FACES=base.FACES,POSES=base.POSES,ARMS=base.ARMS;

/* add xmlns and the stroke styles so an SVG string works as a standalone .svg file */
export function standalone(svg){return svg.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ').replace(/(<svg[^>]*>)/,'$1<style>'+STYLE+'</style>')}
