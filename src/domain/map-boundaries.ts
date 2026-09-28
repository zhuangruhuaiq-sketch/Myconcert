// Kept as browser JavaScript because this runs inside both the iframe and native WebView.
export const boundaryRuntime = String.raw`
const normalizeName=s=>s.trim().toLowerCase().replace(/市$/,'');
function inRing(point,ring){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>point[1])!==(b[1]>point[1]) && point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
function contains(geometry,point){
 const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];
 return polygons.some(rings=>inRing(point,rings[0])&&!rings.slice(1).some(ring=>inRing(point,ring)));
}
function relationGeometry(relation){
 const same=(a,b)=>a[0]===b[0]&&a[1]===b[1];
 const rings={outer:[],inner:[]};
 for(const role of ['outer','inner']){
  const members=(relation.members||[]).filter(m=>(m.role||'outer')===role);
  if(members.some(m=>m.type!=='way'||!m.geometry||m.geometry.some(p=>!p||!Number.isFinite(p.lon)||!Number.isFinite(p.lat))))return null;
  const parts=members.map(m=>m.geometry.map(p=>[p.lon,p.lat]));
  while(parts.length){
   let ring=parts.pop();if(ring.length<2)return null;
   while(!same(ring[0],ring[ring.length-1])){
    const end=ring[ring.length-1];
    const index=parts.findIndex(p=>same(p[0],end)||same(p[p.length-1],end));
    if(index<0)return null;
    let next=parts.splice(index,1)[0];if(!same(next[0],end))next=next.reverse();
    ring=ring.concat(next.slice(1));
   }
   if(ring.length<4)return null;rings[role].push(ring);
  }
 }
 if(!rings.outer.length)return null;
 const coordinates=rings.outer.map(ring=>[ring]);
 for(const hole of rings.inner){const polygon=coordinates.find(p=>inRing(hole[0],p[0]));if(!polygon)return null;polygon.push(hole);}
 return {type:'MultiPolygon',coordinates};
}
const boundaryKey='myconcert.city-boundaries.v1';let boundaryCache={};
try{boundaryCache=JSON.parse(localStorage.getItem(boundaryKey)||'{}')||{};}catch{}
const boundaryLayers=L.featureGroup();
map.createPane('regions');map.getPane('regions').style.zIndex=350;
function addBoundary(feature,city){
 const recorded=!!city;
 const layer=L.geoJSON(feature,{pane:'regions',interactive:recorded,style:{color:recorded?'#6947c2':'#b5a8c3',weight:recorded?1.6:.7,fillColor:recorded?'#dcd0f6':'#f5f1e6',fillOpacity:recorded?.55:.12},onEachFeature:(_feature,polygon)=>{if(city)polygon.on('click',()=>send(city));}});
 const label=document.createElement('span');label.textContent=feature.properties.name;
 layer.bindTooltip(label,{permanent:false,direction:'center',className:'region-label'});
 layer.addTo(boundaryLayers);
}
const chinaNames=new Set(china.features.flatMap(f=>[normalizeName(f.properties.name),normalizeName(f.properties.en)]));
for(const feature of china.features)addBoundary(feature,cities.find(c=>normalizeName(c.city)===normalizeName(feature.properties.name)||normalizeName(c.city)===normalizeName(feature.properties.en))?.city);
function updateBoundaries(){
 const visible=tileError&&map.getZoom()>=5;
 if(visible&&!map.hasLayer(boundaryLayers))boundaryLayers.addTo(map);
 if(!visible&&map.hasLayer(boundaryLayers))map.removeLayer(boundaryLayers);
 boundaryLayers.eachLayer(layer=>{
  layer.unbindTooltip();const label=document.createElement('span');label.textContent=layer.getLayers()[0].feature.properties.name;
  layer.bindTooltip(label,{permanent:visible&&map.getZoom()>=7&&map.getBounds().contains(layer.getBounds().getCenter()),direction:'center',className:'region-label'});
 });
}
map.on('moveend',updateBoundaries);
let boundaryMissing=0,boundaryUnsaved=0;
async function cityBoundary(city,point){
 if(chinaNames.has(normalizeName(city))||china.features.some(f=>contains(f.geometry,[point.lon,point.lat])))return;
 const key=normalizeName(city)+'@'+point.lon.toFixed(2)+','+point.lat.toFixed(2);
 const saved=boundaryCache[key];
 if(saved&&saved.feature){addBoundary(saved.feature,city);return;}
 if(saved&&Date.now()-saved.at<86400000){boundaryMissing++;return;}
 if(boundaryCache.retryAfter>Date.now()){boundaryMissing++;return;}
 const names=[city,...point.label.split(' · ').slice(0,1)];
 for(const [name,p] of Object.entries(gazetteer))if(Math.abs(p.lon-point.lon)<.001&&Math.abs(p.lat-point.lat)<.001)names.push(name);
 const pattern='^('+[...new Set(names.map(normalizeName))].map(s=>s.replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&')).join('|')+')$';
 const query='[out:json][timeout:20];rel(around:50000,'+point.lat+','+point.lon+')["boundary"="administrative"][~"^(name|name:en|name:zh|name:zh-Hans)$"~'+JSON.stringify(pattern)+',i];out geom;';
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
 try{
  const response=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:'data='+encodeURIComponent(query),signal:controller.signal});
  if(!response.ok){boundaryCache.retryAfter=Date.now()+60000;try{localStorage.setItem(boundaryKey,JSON.stringify(boundaryCache));}catch{}throw Error('boundary');}const data=await response.json();
  let feature;
  for(const relation of (data.elements||[]).sort((a,b)=>Number(b.tags?.admin_level||0)-Number(a.tags?.admin_level||0))){
   const geometry=relationGeometry(relation);
   if(geometry&&contains(geometry,[point.lon,point.lat])){feature={type:'Feature',properties:{name:city},geometry};break;}
  }
  if(feature)addBoundary(feature,city);else boundaryMissing++;
  boundaryCache[key]={at:Date.now(),feature};
  try{localStorage.setItem(boundaryKey,JSON.stringify(boundaryCache));}catch{if(feature)boundaryUnsaved++;}
 }catch{boundaryMissing++;}finally{clearTimeout(timer);}
 await new Promise(resolve=>setTimeout(resolve,1100));
}
`;
