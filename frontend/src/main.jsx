import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

const LABELS=[{id:0,name:'Pajonal',color:'#d3ad64'},{id:1,name:'Vegetación herbácea',color:'#8dbb72'},{id:2,name:'Bosque de humedal',color:'#368467'},{id:255,name:'Ignorar',color:'#98a5a2'}];
const EMPTY={type:'FeatureCollection',features:[]};
const STORE='freyr-labeler-sf-v1';
const SAT={type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,attribution:'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community'};
const OSM={type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'};
const styleFor=b=>({version:8,sources:{background:b==='sat'?SAT:OSM},layers:[{id:'background',type:'raster',source:'background'}]});
const colorExpr=['match',['get','class_id'],0,'#d3ad64',1,'#8dbb72',2,'#368467',255,'#98a5a2','#fff'];
function read(){try{const v=JSON.parse(localStorage.getItem(STORE)||'null');return v?.type==='FeatureCollection'&&Array.isArray(v.features)?v:EMPTY}catch{return EMPTY}}
function uuid(){return crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random()}
function App(){
const node=useRef(null),map=useRef(null),modeRef=useRef('navigate'),vertices=useRef([]);
const [features,setFeatures]=useState(read),[basemap,setBasemap]=useState('sat'),[mode,setMode]=useState('navigate'),[cls,setCls]=useState(0),[draft,setDraft]=useState([]),[pending,setPending]=useState(null);
const [interpreter,setInterpreter]=useState(''),[confidence,setConfidence]=useState('alta'),[date,setDate]=useState(''),[notes,setNotes]=useState(''),[message,setMessage]=useState('Seleccioná una herramienta y hacé clic en el mapa.'),[selected,setSelected]=useState(null);
const selectedFeature=features.features.find(f=>f.id===selected);
useEffect(()=>{localStorage.setItem(STORE,JSON.stringify(features));const s=map.current?.getSource('annotations');if(s)s.setData(features)},[features]);
useEffect(()=>{modeRef.current=mode;if(mode!=='polygon'){vertices.current=[];setDraft([])}if(map.current)map.current.getCanvas().style.cursor=mode==='navigate'?'grab':'crosshair'},[mode]);
useEffect(()=>{
const m=new maplibregl.Map({container:node.current,style:styleFor('sat'),center:[-60.63,-31.66],zoom:10,attributionControl:true});
map.current=m;m.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
m.on('load',()=>{
m.addSource('annotations',{type:'geojson',data:read()});
m.addLayer({id:'areas',type:'fill',source:'annotations',filter:['==',['geometry-type'],'Polygon'],paint:{'fill-color':colorExpr,'fill-opacity':.35}});
m.addLayer({id:'edges',type:'line',source:'annotations',filter:['==',['geometry-type'],'Polygon'],paint:{'line-color':colorExpr,'line-width':2.5}});
m.addLayer({id:'points',type:'circle',source:'annotations',filter:['==',['geometry-type'],'Point'],paint:{'circle-color':colorExpr,'circle-radius':7,'circle-stroke-width':1.5,'circle-stroke-color':'#fff'}});
m.addSource('draft',{type:'geojson',data:EMPTY});
m.addLayer({id:'draftline',type:'line',source:'draft',paint:{'line-color':'#fff','line-width':3,'line-dasharray':[2,1]}});
m.addLayer({id:'draftpoints',type:'circle',source:'draft',paint:{'circle-radius':5,'circle-color':'#fff','circle-stroke-color':'#174e3c','circle-stroke-width':2}});
});
m.on('click',e=>{const xy=[e.lngLat.lng,e.lngLat.lat];if(modeRef.current==='point'){setPending({type:'Point',coordinates:xy});setMode('navigate');setMessage('Punto seleccionado. Completá los metadatos y guardá.')}else if(modeRef.current==='polygon'){vertices.current=[...vertices.current,xy];setDraft([...vertices.current]);setMessage('Vértices: '+vertices.current.length+'. Finalizá el polígono desde el panel.')}});
return()=>{m.remove();map.current=null};
},[]);
useEffect(()=>{const m=map.current;if(!m)return;const apply=()=>{const s=m.getSource('draft');if(!s)return;const f=[];if(draft.length>=2)f.push({type:'Feature',properties:{},geometry:{type:'LineString',coordinates:draft}});for(const p of draft)f.push({type:'Feature',properties:{},geometry:{type:'Point',coordinates:p}});s.setData({type:'FeatureCollection',features:f})};if(m.isStyleLoaded())apply();else m.once('load',apply)},[draft]);
function switchBase(b){setBasemap(b);const m=map.current;if(!m)return;m.getSource('background')?.setTiles?.((b==='sat'?SAT:OSM).tiles);m.setStyle(styleFor(b));m.once('style.load',()=>{m.addSource('annotations',{type:'geojson',data:read()});m.addLayer({id:'areas',type:'fill',source:'annotations',filter:['==',['geometry-type'],'Polygon'],paint:{'fill-color':colorExpr,'fill-opacity':.35}});m.addLayer({id:'edges',type:'line',source:'annotations',filter:['==',['geometry-type'],'Polygon'],paint:{'line-color':colorExpr,'line-width':2.5}});m.addLayer({id:'points',type:'circle',source:'annotations',filter:['==',['geometry-type'],'Point'],paint:{'circle-color':colorExpr,'circle-radius':7,'circle-stroke-color':'white','circle-stroke-width':1.5}});m.addSource('draft',{type:'geojson',data:EMPTY});m.addLayer({id:'draftline',type:'line',source:'draft',paint:{'line-color':'white','line-width':3}});m.addLayer({id:'draftpoints',type:'circle',source:'draft',paint:{'circle-color':'white','circle-radius':5}});})}
function finish(){if(draft.length<3){setMessage('Necesitás al menos tres vértices.');return}setPending({type:'Polygon',coordinates:[[...draft,draft[0]]]});setMode('navigate');setMessage('Polígono listo. Completá los metadatos y guardá.')}
function save(){if(!pending)return;const id=uuid();const chosen=LABELS.find(c=>c.id===cls);const feature={type:'Feature',id,geometry:pending,properties:{class_id:cls,class_name:chosen.name,confidence,interpreter:interpreter||'sin identificar',imagery_date:date||null,observations:notes,created_at:new Date().toISOString(),reference_source:basemap==='sat'?'Esri World Imagery':'OpenStreetMap'}};setFeatures(f=>({type:'FeatureCollection',features:[feature,...f.features]}));setSelected(id);setPending(null);vertices.current=[];setDraft([]);setNotes('');setMessage('Etiqueta guardada en este navegador. Exportá una copia GeoJSON.')}
function download(){const blob=new Blob([JSON.stringify(features,null,2)],{type:'application/geo+json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='freyr-labeler-santafe-'+new Date().toISOString().slice(0,10)+'.geojson';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function focus(f){setSelected(f.id);if(f.geometry.type==='Point'){map.current?.flyTo({center:f.geometry.coordinates,zoom:15})}else{const coords=f.geometry.coordinates[0];const bounds=coords.reduce((b,p)=>b.extend(p),new maplibregl.LngLatBounds(coords[0],coords[0]));map.current?.fitBounds(bounds,{padding:100,maxZoom:17})}}
return <div className="app">
<aside className="sidebar"><header className="brand"><strong>FREYR · Labeler</strong><small>Santa Fe — Humedales del Paraná</small></header>
<section className="section"><div className="notice"><b>Versión piloto:</b> las etiquetas se guardan en este navegador, no en la nube. Descargá GeoJSON para respaldarlas.</div></section>
<section className="section"><h3>Mapa de referencia</h3><div className="buttons"><button className={basemap==='sat'?'active':''} onClick={()=>switchBase('sat')}>Satélite Esri</button><button className={basemap==='osm'?'active':''} onClick={()=>switchBase('osm')}>Calles OSM</button></div><p className="hint">El mapa satelital es una referencia visual; no tiene fecha de adquisición verificable. Sentinel-2 temporal se añadirá después.</p></section>
<section className="section"><h3>Herramientas de dibujo</h3><div className="buttons"><button className={mode==='navigate'?'active':''} onClick={()=>setMode('navigate')}>Explorar</button><button className={mode==='point'?'active':''} onClick={()=>setMode('point')}>Punto</button><button className={mode==='polygon'?'active':''} onClick={()=>setMode('polygon')}>Polígono</button></div>{mode==='polygon'&&<button className="action alt wide" onClick={finish}>Finalizar polígono ({draft.length})</button>}<p className="hint">Dibujá sobre el mapa; para los polígonos, marcá al menos tres vértices.</p></section>
<section className="section"><h3>Clase de vegetación</h3>{LABELS.map(c=><button key={c.id} className={'class-button '+(cls===c.id?'active':'')} onClick={()=>setCls(c.id)}><span className="swatch" style={{background:c.color}}/>{c.name}<small>{c.id}</small></button>)}</section>
<section className="section"><h3>Metadatos</h3><label className="field">Intérprete<input value={interpreter} maxLength={100} onChange={e=>setInterpreter(e.target.value)} placeholder="Nombre o iniciales"/></label><label className="field">Fecha de imagen (solo si se conoce)<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label className="field">Confianza<select value={confidence} onChange={e=>setConfidence(e.target.value)}><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></label><label className="field">Observaciones<textarea rows={2} value={notes} maxLength={3000} onChange={e=>setNotes(e.target.value)} placeholder="Vegetación, inundación, incertidumbre..."/></label><button className="action wide" disabled={!pending} onClick={save}>Guardar anotación</button>{pending&&<button className="action alt wide" onClick={()=>setPending(null)}>Cancelar selección</button>}</section>
<section className="section"><h3>Anotaciones ({features.features.length})</h3><button className="action alt wide" onClick={download}>Descargar GeoJSON</button>{features.features.slice(0,100).map(f=><div role="button" tabIndex={0} className={'item '+(selected===f.id?'active':'')} key={f.id} onClick={()=>focus(f)} onKeyDown={e=>e.key==='Enter'&&focus(f)}><span className="swatch" style={{background:LABELS.find(c=>c.id===f.properties.class_id)?.color}}/><span>{f.properties.class_name}<small>{f.geometry.type==='Point'?'Punto':'Polígono'} · {f.properties.confidence}</small></span></div>)}{selectedFeature&&<div className="selected">Seleccionado: {selectedFeature.id.slice(0,8)}<button className="action danger wide" onClick={()=>{if(confirm('¿Eliminar esta anotación?')){setFeatures(f=>({...f,features:f.features.filter(x=>x.id!==selected)}));setSelected(null)}}}>Eliminar anotación</button></div>}</section>
</aside><main className="map-wrap"><div className="map" ref={node}/><div className="overlay"><b>Visor geoespacial</b> · Santa Fe</div><div className="bottom"><span>{message}</span></div></main>
</div>
}
createRoot(document.getElementById('root')).render(<App/>);
