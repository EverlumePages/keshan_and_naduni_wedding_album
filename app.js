(() => {
  'use strict';
  const config = window.ALBUM;
  const page = document.body.dataset.page || 'home';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const storage = {
    get(key, session = false) { try { return (session ? sessionStorage : localStorage).getItem(key); } catch { return null; } },
    set(key, value, session = false) { try { (session ? sessionStorage : localStorage).setItem(key,value); } catch { /* Optional persistence. */ } }
  };
  const imageURL = (key, width = 960) => `${config.assets.directory}${config.images[key].file}-${width}.jpg`;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const motionAllowed = () => !reducedMotion.matches;
  const lockScroll = () => document.body.classList.toggle('modal-open',!!$('dialog[open]'));
  const el = (tag, className, text) => { const node = document.createElement(tag); if(className) node.className = className; if(text !== undefined) node.textContent = text; return node; };
  const imageElement = (key, lazy = true) => { const img = el('img'); img.dataset.image = key; img.width = 1024; img.height = 1536; img.loading = lazy ? 'lazy' : 'eager'; return img; };
  const photoButton = (key, className = '') => { const button = el('button',`photo ${className}`); button.type = 'button'; button.dataset.photo = key; button.append(imageElement(key)); return button; };

  $$('[data-copy]').forEach(node => { node.textContent = config.copy[node.dataset.copy] || ''; });
  $$('[data-name]').forEach(node => { node.textContent = config.couple[node.dataset.name]; });
  $$('[data-date]').forEach(node => { node.textContent = config.couple.date; });
  $$('[data-location]').forEach(node => { node.textContent = config.couple.location; });
  $$('[data-initials]').forEach(node => { node.textContent = config.couple.initials; });
  const pageLabel = config.navigation.find(item => item.id === page)?.label || 'Home';
  document.title = `${page === 'home' ? 'Our Forever' : pageLabel} · ${config.couple.first} & ${config.couple.second} · ${config.copy.brand}`;
  config.navigation.forEach(item => { const link = $(`[data-nav="${item.id}"]`); if(!link)return; link.textContent=item.label;link.href=item.href;if(item.id===page)link.setAttribute('aria-current','page'); });
  const menuButton=$('#menu-toggle'),nav=$('#site-nav'),mobileNav=matchMedia('(max-width: 900px)');
  function closeMenu(restore=false) { if(!menuButton || !nav)return;nav.classList.remove('is-open');menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Open navigation');if(restore)menuButton.focus(); }
  menuButton?.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')!=='true';nav.classList.toggle('is-open',open);menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Close navigation':'Open navigation');});
  nav?.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape' && menuButton?.getAttribute('aria-expanded')==='true'){event.preventDefault();closeMenu(true);}});
  document.addEventListener('click',event=>{if(!event.target.closest('.masthead'))closeMenu();});
  mobileNav.addEventListener('change',()=>closeMenu());

  function hydrateImages(root=document) {
    $$('img[data-image]:not([data-hydrated])',root).forEach(img=>{
      const key=img.dataset.image,asset=config.images[key];if(!asset)return;
      img.dataset.hydrated='true';img.alt=img.id==='cover-image'?'':asset.alt;img.style.objectPosition=img.closest('.gallery-card')&&asset.format==='portrait'?'50% 0%':asset.position;img.decoding='async';
      img.sizes=img.classList.contains('hero-background')?'(max-width: 700px) 1200px, 100vw':img.closest('.panorama,.story-wide-photo,.film-featured')?'(max-width: 700px) 90vw, 1180px':img.closest('.hero-photo,.collage-large,.chapter-main')?'(max-width: 700px) 85vw, 550px':'(max-width: 700px) 45vw, 420px';
      if(key==='cover')img.sizes='365px';
      img.addEventListener('error',()=>{img.parentElement.classList.add('image-unavailable');const button=img.closest('[data-photo]');if(button){button.disabled=true;button.setAttribute('aria-label',`${asset.caption} — photograph unavailable`);}});
      if(key!=='cover')img.srcset=[480,960,1600].map(width=>`${imageURL(key,width)} ${width}w`).join(', ');
      img.src=imageURL(key);
    });
    $$('[data-photo]',root).forEach(button=>{if(!button.disabled)button.setAttribute('aria-label',`View photograph: ${config.images[button.dataset.photo].caption}`);});
  }
  $$('[data-floral]').forEach(img=>{img.src=config.assets.floral;img.addEventListener('error',()=>{img.style.visibility='hidden';});});
  $$('[data-rings]').forEach(img=>{img.src=config.assets.rings;img.addEventListener('error',()=>{img.style.visibility='hidden';});});
  $$('[data-flower-border]').forEach(border=>{const img=el('img');img.src=config.assets.flowerBorder;img.alt='';img.width=700;img.height=453;img.decoding='async';border.append(img);});

  // Content is visible unless an offscreen group has been successfully observed.
  let revealObserver=null;
  const revealSelector='.section-heading,.editorial-collage,.centered-heading,.arches,.details-grid,.panorama,.closing,.continue-card,.chapter,.film-card,.page-heading,.gallery-card,.story-prologue';
  function reveal(node){node.classList.remove('reveal-pending');node.classList.add('reveal-visible');revealObserver?.unobserve(node);}
  function showAllReveals(){$$('.reveal-pending').forEach(reveal);revealObserver?.disconnect();revealObserver=null;}
  function observeReveals(root=document){
    if(!motionAllowed() || !('IntersectionObserver' in window)){showAllReveals();return;}
    try{
      if(!revealObserver)revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)reveal(entry.target);}),{threshold:.05,rootMargin:'0px 0px -20px 0px'});
      $$(revealSelector,root).forEach((node,index)=>{if(node.dataset.revealObserved)return;node.dataset.revealObserved='true';if(node.getBoundingClientRect().top<innerHeight*.95)return;node.style.setProperty('--reveal-delay',`${Math.min(index%4*80,240)}ms`);revealObserver.observe(node);node.classList.add('reveal-pending');});
    }catch{showAllReveals();}
  }
  document.addEventListener('focusin',event=>{let node=event.target;while(node && node!==document){if(node.classList?.contains('reveal-pending')||node.classList?.contains('reveal-visible')){node.style.transition='none';node.style.setProperty('--reveal-delay','0ms');reveal(node);}node=node.parentElement;}});

  let galleryIds=[...config.gallery],shownCount=0;
  const grid=$('#gallery-grid'),filters=$('#gallery-filters');
  function categoryFromURL(){const value=new URL(location.href).searchParams.get('category');return config.categories.some(item=>item.id===value)?value:'all';}
  function appendGalleryBatch(){
    const nextIds=galleryIds.slice(shownCount,shownCount+config.galleryBatchSize),fragment=document.createDocumentFragment();
    nextIds.forEach((key,index)=>{const card=el('figure','gallery-card');card.dataset.format=config.images[key].format||'landscape';card.append(photoButton(key));const caption=el('figcaption');caption.append(el('span','',config.images[key].caption),el('small','',String(shownCount+index+1).padStart(2,'0')));card.append(caption);fragment.append(card);});
    grid.append(fragment);shownCount+=nextIds.length;
    $('#load-more').hidden=shownCount>=galleryIds.length;
    $('#gallery-progress').textContent=galleryIds.length?`${shownCount} of ${galleryIds.length} photographs · A little piece of our forever`:'More beautiful moments will find their way here.';
    $('#gallery-status').textContent=`${galleryIds.length} ${galleryIds.length===1?'photograph':'photographs'}`;
    hydrateImages(grid);observeReveals(grid);
  }
  function filterGallery(category,updateURL=false){
    galleryIds=config.gallery.filter(key=>category==='all'||config.images[key].category===category);
    $$('.filter-button',filters).forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.category===category)));
    $$('.reveal-pending',grid).forEach(node=>revealObserver?.unobserve(node));grid.replaceChildren();shownCount=0;appendGalleryBatch();
    if(updateURL){const url=new URL(location.href);if(category==='all')url.searchParams.delete('category');else url.searchParams.set('category',category);try{history.pushState(null,'',url);}catch{/* Local-file restrictions must not break filtering. */}}
  }
  if(grid){
    config.categories.forEach(category=>{const count=config.gallery.filter(key=>category.id==='all'||config.images[key].category===category.id).length;const button=el('button','filter-button',category.label);button.type='button';button.dataset.category=category.id;button.setAttribute('aria-pressed','false');button.append(el('span','',String(count)));button.addEventListener('click',()=>filterGallery(category.id,true));filters.append(button);});
    filterGallery(categoryFromURL());
    $('#load-more').addEventListener('click',()=>{const oldCount=shownCount;appendGalleryBatch();grid.children[oldCount]?.querySelector('button')?.focus({preventScroll:true});});
    addEventListener('popstate',()=>filterGallery(categoryFromURL()));
  }
  const chapters=$('#story-chapters');
  if(chapters)config.chapters.forEach(chapter=>{
    const section=el('section','chapter');section.id=chapter.id;section.setAttribute('aria-labelledby',`${chapter.id}-title`);
    const photos=el('div','chapter-photos');photos.append(photoButton(chapter.image,'chapter-main'),photoButton(chapter.secondImage,'chapter-inset'));
    const copy=el('div','chapter-copy'),title=el('h2','',chapter.title);title.id=`${chapter.id}-title`;const sinhala=el('p','sinhala',chapter.sinhala);sinhala.lang='si';
    copy.append(el('span','chapter-number',chapter.number),el('p','eyebrow',chapter.eyebrow),title,el('p','chapter-text',chapter.text),sinhala,el('div','chapter-rule'));section.append(photos,copy);chapters.append(section);
  });

  // Missing footage has a poster and an honest status, never a fake play control.
  const filmViewer=$('#film-viewer'),player=$('#film-player');let filmTrigger=null;
  function playableSource(source){if(!source||typeof source!=='string')return null;try{const url=new URL(source,location.href);if(!/\.mp4$/i.test(url.pathname))return null;if(url.protocol==='https:'||(url.origin===location.origin&&['http:','file:'].includes(url.protocol)))return url.href;}catch{}return null;}
  function closeFilm(){player.pause();player.removeAttribute('src');player.load();filmViewer.close();lockScroll();filmTrigger?.focus({preventScroll:true});}
  function openFilm(film,trigger){const source=playableSource(film.source);if(!source||!filmViewer)return;filmTrigger=trigger;$('#film-viewer-title').textContent=film.title;$('#film-viewer-description').textContent=film.description;$('#film-error').hidden=true;player.poster=imageURL(film.poster,960);player.src=source;player.preload='metadata';filmViewer.showModal();lockScroll();$('#film-close').focus({preventScroll:true});}
  if($('#featured-film')){
    const featured=config.films.find(film=>film.featured)||config.films[0];
    config.films.forEach((film,index)=>{
      const feature=film===featured,card=el('article',`film-card${feature?' film-featured':''}`),poster=el('div','film-poster');poster.append(imageElement(film.poster,!feature));
      const source=playableSource(film.source);poster.append(el('span','film-badge',source?(film.photoFilm?'PHOTO FILM':'A FILM TO REMEMBER'):'Coming soon'),el('span','film-poster-tag',feature?'THE WEDDING FILM':'A CHAPTER OF OUR DAY'));
      if(source){const button=el('button','film-play');button.setAttribute('aria-label',`Open film: ${film.title}`);const symbol=el('span','','▶');symbol.setAttribute('aria-hidden','true');button.append(symbol);button.addEventListener('click',()=>openFilm(film,button));poster.append(button);}
      const info=el('div','film-info'),words=el('div');words.append(el(feature?'h2':'h3','',film.title),el('p','',film.description));info.append(words,el('span','film-number',String(index+1).padStart(2,'0')));card.append(poster,info);$(feature?'#featured-film':'#film-collection').append(card);
    });
    $('#films-message').hidden=config.films.some(film=>playableSource(film.source));$('#film-close').addEventListener('click',closeFilm);filmViewer.addEventListener('cancel',event=>{event.preventDefault();closeFilm();});player.addEventListener('error',()=>{if(player.getAttribute('src'))$('#film-error').hidden=false;});
  }

  const viewer=$('#lightbox');
  if(viewer){
    const viewerImage=$('#viewer-image');let activeIds=[],galleryIndex=0,viewerTrigger=null,touchStart=null;
    const pagePhotoIds=()=>page==='gallery'?[...galleryIds]:page==='home'?[...config.homeGallery]:[...new Set($$('[data-photo]').map(button=>button.dataset.photo))];
    function renderPhoto(index){galleryIndex=(index+activeIds.length)%activeIds.length;const key=activeIds[galleryIndex],asset=config.images[key];viewerImage.style.visibility='visible';viewerImage.alt=asset.alt;viewerImage.src=imageURL(key,1600);$('#viewer-count').textContent=`${String(galleryIndex+1).padStart(2,'0')} / ${String(activeIds.length).padStart(2,'0')}`;$('#viewer-caption').textContent=asset.caption;}
    function closeViewer(){viewer.close();lockScroll();if(viewerTrigger?.isConnected)viewerTrigger.focus({preventScroll:true});else $('.filter-button[aria-pressed=true]')?.focus({preventScroll:true});}
    viewerImage.addEventListener('error',()=>{viewerImage.style.visibility='hidden';$('#viewer-caption').textContent='This photograph could not load. Try the next moment.';});
    document.addEventListener('click',event=>{const button=event.target.closest('[data-photo]');if(!button||button.disabled)return;activeIds=pagePhotoIds();const index=activeIds.indexOf(button.dataset.photo);if(index<0||!activeIds.length)return;viewerTrigger=button;renderPhoto(index);viewer.showModal();lockScroll();$('#viewer-close').focus({preventScroll:true});});
    $('#viewer-close').addEventListener('click',closeViewer);$('#viewer-prev').addEventListener('click',()=>renderPhoto(galleryIndex-1));$('#viewer-next').addEventListener('click',()=>renderPhoto(galleryIndex+1));viewer.addEventListener('cancel',event=>{event.preventDefault();closeViewer();});viewer.addEventListener('click',event=>{if(event.target===viewer)closeViewer();});
    viewer.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();renderPhoto(galleryIndex+(event.key==='ArrowRight'?1:-1));}});
    viewerImage.addEventListener('touchstart',event=>{touchStart=event.touches.length===1?{x:event.touches[0].clientX,y:event.touches[0].clientY}:null;},{passive:true});
    viewerImage.addEventListener('touchend',event=>{if(!touchStart||!event.changedTouches.length)return;const dx=event.changedTouches[0].clientX-touchStart.x,dy=event.changedTouches[0].clientY-touchStart.y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4)renderPhoto(galleryIndex+(dx<0?1:-1));touchStart=null;},{passive:true});viewerImage.addEventListener('touchcancel',()=>{touchStart=null;});
  }

  const petalLayer=$('#petals'),smallScreen=matchMedia('(max-width: 700px)');
  function createPetals(){if(!petalLayer)return;petalLayer.replaceChildren();const count=smallScreen.matches?config.motion.mobilePetals:config.motion.desktopPetals,positions=smallScreen.matches?[1,90,4,87,2]:[1,94,3,91,5,88,2,93,6,90];for(let i=0;i<count;i++){const track=el('span','petal-track');track.style.setProperty('--x',`${positions[i%positions.length]}%`);track.style.setProperty('--size',`${smallScreen.matches?30+i%3*4:38+i%4*4}px`);track.style.setProperty('--petal-opacity','.96');track.style.setProperty('--duration',`${27+i%5*4}s`);track.style.setProperty('--delay',`${-i*4.7-3}s`);track.style.setProperty('--drift',`${i%2?-12:12}px`);const img=el('img');img.src=config.assets.petals[i%config.assets.petals.length];img.alt='';img.addEventListener('error',()=>track.remove());track.append(img);petalLayer.append(track);}}
  let finishIntro=()=>{};
  function updateMotion(){const enabled=motionAllowed();document.body.classList.toggle('motion-paused',!enabled);document.documentElement.style.scrollBehavior=enabled?'':'auto';if(!enabled){showAllReveals();finishIntro();}else observeReveals();}
  reducedMotion.addEventListener('change',updateMotion);smallScreen.addEventListener('change',createPetals);document.addEventListener('visibilitychange',()=>document.body.classList.toggle('page-hidden',document.hidden));
  let scrollFrame=null,previousScroll=scrollY;
  addEventListener('scroll',()=>{if(scrollFrame||!motionAllowed()||!petalLayer)return;scrollFrame=requestAnimationFrame(()=>{petalLayer.style.setProperty('--scroll-shift',`${Math.max(-16,Math.min(16,(scrollY-previousScroll)*-.1))}px`);previousScroll=scrollY;scrollFrame=null;});},{passive:true});
  hydrateImages();createPetals();updateMotion();

  // Home-only enhancement: the other pages do not depend on book elements.
  const intro=$('#book-intro');
  if(intro&&page==='home'){
    const book=$('#book');let timers=[],run=0,returnTo=null;
    const clearTimers=()=>{timers.forEach(clearTimeout);timers=[];};const schedule=(callback,ms)=>timers.push(setTimeout(callback,ms));
    function closeIntro(){clearTimers();run++;if(intro.open)intro.close();intro.classList.remove('is-leaving');book.classList.remove('is-opening');lockScroll();if(returnTo?.isConnected)returnTo.focus({preventScroll:true});else{$('#story').setAttribute('tabindex','-1');$('#story').focus({preventScroll:true});}}
    finishIntro=()=>{if(!intro.open||intro.classList.contains('is-leaving'))return;clearTimers();if(!motionAllowed()){closeIntro();return;}intro.classList.add('is-leaving');schedule(closeIntro,600);};
    async function openIntro(replay=false){if(intro.open)return;clearTimers();const current=++run;returnTo=replay?$('#replay'):null;book.classList.remove('is-opening');intro.classList.remove('is-leaving');intro.showModal();lockScroll();$('#skip-intro').focus({preventScroll:true});$('#intro-status').textContent='A beautiful story is about to unfold';storage.set('everlume-opened-v1','yes',true);await Promise.race([$('#cover-image').decode().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,2200))]);if(current!==run||!intro.open||intro.classList.contains('is-leaving'))return;if(!motionAllowed()){schedule(closeIntro,1100);return;}schedule(()=>{book.classList.add('is-opening');$('#intro-status').textContent='Welcome to our forever';},650);schedule(finishIntro,config.motion.openingMs+850);}
    $('#skip-intro').addEventListener('click',finishIntro);$('#replay').addEventListener('click',()=>openIntro(true));intro.addEventListener('cancel',event=>{event.preventDefault();finishIntro();});if(!storage.get('everlume-opened-v1',true)&&motionAllowed()&&!location.hash)openIntro();
  }
  document.body.dataset.albumReady='true';
})();

