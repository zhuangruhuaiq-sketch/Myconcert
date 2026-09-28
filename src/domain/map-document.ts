import assets from "../../assets/maps/runtime.json";
import china from "../../assets/maps/china-cities.json";
import taiwan from "../../assets/maps/taiwan-cities.json";
import { boundaryRuntime } from "./map-boundaries";

export type CityPin = { city: string; count: number; watched: number };

export function mapDocument(cities: CityPin[]) {
  const payload = JSON.stringify(cities).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>${assets.css}</style>
<style>html,body,#map{height:100%;margin:0}body{font:14px system-ui;background:#dbeaf2}#map{background:#dbeaf2}#status{position:absolute;bottom:26px;left:10px;right:10px;z-index:500;background:#fffffff0;padding:8px 12px;border-radius:10px;pointer-events:none;color:#352d45}.leaflet-tooltip{font:13px system-ui}.region-label{background:transparent;border:0;box-shadow:none;color:#645370;font:11px system-ui;text-shadow:0 1px 2px white}.region-label:before{display:none}.leaflet-control a{min-width:32px;min-height:32px}</style></head>
<body><div id="map" aria-label="可拖动和缩放的世界地图"></div><div id="status" role="status">正在加载世界地图…</div>
<script>${assets.script.replace(/<\/script/gi, "<\\/script")}</script><script>
const cities=${payload};
const world=${JSON.stringify(assets.world).replace(/</g, "\\u003c")};
const china=${JSON.stringify({ type: "FeatureCollection", features: [...china.features.filter(f => f.properties.name !== "台湾省"), ...taiwan.features] }).replace(/</g, "\\u003c")};
const gazetteer=${JSON.stringify(assets.cities).replace(/</g, "\\u003c")};
const status=document.getElementById('status');
const send=(city)=>{const message=JSON.stringify({type:'myconcert-city',city});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(message);else window.parent.postMessage(message,'*');};
if(!window.L){status.textContent='地图加载失败，请检查网络后重试；下方城市档案仍可使用。';}else{
const map=L.map('map',{worldCopyJump:true,minZoom:2}).setView([25,30],2);
map.createPane('geography');map.getPane('geography').style.zIndex=150;
L.geoJSON(world,{pane:'geography',style:{color:'#9aa9ab',weight:0.7,fillColor:'#f5f1e6',fillOpacity:1},onEachFeature:(feature,layer)=>{const label=document.createElement('span');label.textContent=feature.properties.name;layer.bindTooltip(label);}}).addTo(map);
map.attributionControl.addAttribution('<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a>');
const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map);
let tileError=false,tileLoaded=false;
function useBuiltIn(){if(tileError)return;tileError=true;map.removeLayer(tiles);updateBoundaries();status.textContent='内置地图 · 放大可查看城市行政区域';}
tiles.on('tileerror',useBuiltIn);tiles.on('tileload',()=>{tileLoaded=true;});
setTimeout(()=>{if(!tileLoaded)useBuiltIn();},7000);
${boundaryRuntime}
map.attributionControl.addAttribution('<a href="https://github.com/BarbarossaWang/cn-atlas" target="_blank" rel="noopener">cn-atlas</a> · <a href="https://www.geoboundaries.org/" target="_blank" rel="noopener">geoBoundaries</a> · &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>');
const bounds=[],located=[];let failed=0;
const cacheKey='myconcert.city-coordinates.v2';let cache={};try{cache=JSON.parse(localStorage.getItem(cacheKey)||'{}');}catch{}
async function locate(city){
 const local=gazetteer[city.trim().toLowerCase().replace(/市$/,'')];if(local)return local;
 if(cache[city] && Date.now()-cache[city].at<30*86400000)return cache[city];
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
 try{const response=await fetch('https://photon.komoot.io/api/?q='+encodeURIComponent(city)+'&limit=1&osm_tag=place:city&osm_tag=place:town',{signal:controller.signal});
 if(!response.ok)throw Error('geocoder');const data=await response.json();const feature=data.features&&data.features[0];
 if(!feature)throw Error('unknown');const [lon,lat]=feature.geometry.coordinates;
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw Error('coordinates');
 const result={lat,lon,label:[feature.properties.name,feature.properties.state,feature.properties.country].filter(Boolean).join(' · '),at:Date.now()};
 cache[city]=result;try{localStorage.setItem(cacheKey,JSON.stringify(cache));}catch{}return result;
 }finally{clearTimeout(timeout);}
}
(async()=>{
 for(let i=0;i<cities.length;i++){
 const c=cities[i];status.textContent='正在定位城市 '+(i+1)+' / '+cities.length;
 try{const point=await locate(c.city);located.push({city:c.city,point});const label=document.createElement('span');label.textContent=c.city+' · '+c.count+' 场';
 const popup=document.createElement('div');const title=document.createElement('strong');title.textContent=c.city;popup.append(title);
 const detail=document.createElement('p');detail.textContent='已观看 '+c.watched+' 场 / 全部 '+c.count+' 场';popup.append(detail);
 const location=document.createElement('p');location.textContent='匹配地点：'+point.label;popup.append(location);
 const button=document.createElement('button');button.textContent='查看这座城市的演出';button.style.cssText='padding:10px;border:0;border-radius:8px;background:#6947c2;color:white';button.onclick=()=>send(c.city);popup.append(button);
 L.circleMarker([point.lat,point.lon],{radius:Math.min(22,10+Math.sqrt(c.count)*2),color:'#fff',weight:2,fillColor:c.watched?'#6947c2':'#6b8095',fillOpacity:.9}).addTo(map).bindTooltip(label,{permanent:true,direction:'top',offset:[0,-12]}).bindPopup(popup).on('click',()=>send(c.city));bounds.push([point.lat,point.lon]);
 }catch{failed++;}
 await new Promise(resolve=>setTimeout(resolve,350));
 }
 if(bounds.length)map.fitBounds(bounds,{padding:[36,36],maxZoom:6});
 for(const entry of located){await cityBoundary(entry.city,entry.point);updateBoundaries();}
 status.textContent=(tileError?'内置世界地图 · ':'')+(failed?failed+' 座城市未定位，可在下方查看档案。':'拖动 / 双指缩放 · 点击城市查看演出');
 if(boundaryMissing)status.textContent+=' · '+boundaryMissing+' 座海外城市边界暂不可用';
 if(boundaryUnsaved)status.textContent+=' · 海外边界缓存空间不足，本次可查看';
})();
}
</script></body></html>`;
}
