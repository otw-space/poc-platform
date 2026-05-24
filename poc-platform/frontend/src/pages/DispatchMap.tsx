import { useEffect, useState, useRef } from 'react';
import { Card, Spin, Tag, message } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import * as echarts from 'echarts';
import { getProjects } from '../api/projects';
import { useTheme } from '../context/ThemeContext';

const CITY_COORDS: Record<string, [number, number]> = {
  '北京':[116.4,39.9],'上海':[121.5,31.2],'广州':[113.3,23.1],'深圳':[114.1,22.5],
  '杭州':[120.2,30.3],'成都':[104.1,30.6],'武汉':[114.3,30.6],'南京':[118.8,32.1],
  '重庆':[106.5,29.5],'天津':[117.2,39.1],'苏州':[120.6,31.3],'西安':[108.9,34.3],
  '长沙':[113.0,28.2],'青岛':[120.4,36.1],'郑州':[113.7,34.8],'大连':[121.6,38.9],
  '宁波':[121.5,29.9],'厦门':[118.1,24.5],'福州':[119.3,26.1],'济南':[117.0,36.7],
  '合肥':[117.2,31.8],'昆明':[102.7,25.0],'贵阳':[106.7,26.6],'南宁':[108.3,22.8],
  '海口':[110.3,20.0],'兰州':[103.8,36.1],'西宁':[101.8,36.6],'银川':[106.3,38.5],
  '乌鲁木齐':[87.6,43.8],'呼和浩特':[111.7,40.8],'拉萨':[91.1,29.7],'沈阳':[123.4,41.8],
  '长春':[125.3,43.9],'哈尔滨':[126.5,45.8],'太原':[112.6,37.9],'石家庄':[114.5,38.0],
  '南昌':[115.9,28.7],'无锡':[120.3,31.6],'东莞':[113.8,23.0],'佛山':[113.1,23.0],
  '珠海':[113.6,22.3],'徐州':[117.2,34.3],'温州':[120.7,28.0],'泉州':[118.6,24.9],
  '洛阳':[112.4,34.6],'襄阳':[112.1,32.0],'宜昌':[111.3,30.7],'桂林':[110.3,25.3],
  '三亚':[109.5,18.3],'烟台':[121.4,37.5],'威海':[122.1,37.5],'扬州':[119.4,32.4],
  '南通':[120.9,32.0],'常州':[119.9,31.8],'嘉兴':[120.8,30.8],'金华':[119.7,29.1],
  '唐山':[118.2,39.6],'保定':[115.5,38.9],'邯郸':[114.5,36.6],'包头':[109.8,40.6],
  '吉林':[126.5,43.8],'大庆':[125.0,46.6],'芜湖':[118.4,31.3],'蚌埠':[117.3,32.9],
  '岳阳':[113.1,29.4],'株洲':[113.1,27.8],'汕头':[116.7,23.4],'柳州':[109.4,24.3],
  '绵阳':[104.7,31.5],'遵义':[106.9,27.7],'咸阳':[108.7,34.3],
};

const REGION_COORDS: Record<string,[number,number]>={
  '华东':[118.8,32.1],'华南':[113.3,23.1],'华中':[114.3,30.6],
  '华北':[116.4,39.9],'西北':[108.9,34.3],'西南':[104.1,30.6],'东北':[123.4,41.8],
};

const LABEL_FIX: Record<string,[number,number]>={
  '甘肃省':[103,38.5],'内蒙古自治区':[114,44.5],'黑龙江省':[128,48],
  '新疆维吾尔自治区':[84,41.5],'青海省':[95,35.5],'四川省':[102.5,30.5],
  '云南省':[101,25.5],'河北省':[114.5,38],'海南省':[109.5,19],
  '台湾省':[121,24],'西藏自治区':[91,31.5],
};

function shortName(n:string):string{return n.replace(/省|市|壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区/g,'');}

function getCoord(city:string,region:string):[number,number]|null{
  for(const[k,c]of Object.entries(CITY_COORDS))if(city.includes(k)||k.includes(city))return c;
  if(REGION_COORDS[region])return REGION_COORDS[region];
  if(city.length>=2){const s=city.substring(0,2);for(const[k,c]of Object.entries(CITY_COORDS))if(k.includes(s))return c;}
  return null;
}

const PROV_COLORS=['#f0f7ff','#fef9f0','#f1f9f1','#fff4f4','#f5f0ff','#eaf6ff','#fdf6e3','#e6f9e8','#fff0f0','#ede4ff','#e0f2ff','#fef3e0','#daf5dc','#ffe8e8','#e1d4f7','#d6ecff','#fcecd0','#cef0d0','#ffdde0','#d5c4f0','#cce6ff','#fae6c0','#c2ebc4','#ffd2d5','#c9b4e9','#c2dfff','#f8dfb0','#b7e6b8','#ffc8cc','#bda4e2','#b8d8ff','#f6d8a0','#ace0ac','#ffbdc2','#b194db','#aed1ff','#f4d290'];

let cityMapReady=false;

export default function DispatchMap(){
  const[loading,setLoading]=useState(true);
  const[chartReady,setChartReady]=useState(false);
  const cr=useRef<HTMLDivElement>(null);
  const ci=useRef<echarts.ECharts|null>(null);
  const projs=useRef<any[]>([]);
  const provinces=useRef<string[]>([]);
  const cityColors=useRef<Record<string,string>>({});
  const zoom=useRef(1.2);
  const {dark}=useTheme();

  useEffect(()=>{(async()=>{
    try{
      const[projRes,gj]=await Promise.all([getProjects({page:1,page_size:100}),import('../assets/china.json')]);
      const geo=(gj as any).default||gj;
      let all=projRes.data.items;const tot=projRes.data.total;
      if(tot>100){const ps=[];for(let p=2;p<=Math.ceil(tot/100);p++)ps.push(getProjects({page:p,page_size:100}));
      (await Promise.all(ps)).forEach(r=>{all=all.concat(r.data.items)});}
      const names=(geo as any).features?.map((f:any)=>f.properties?.name).filter(Boolean)||[];
      provinces.current=names;projs.current=all;echarts.registerMap('china',geo);setChartReady(true);
    }catch(err){console.error(err);message.error('地图数据加载失败');}
    finally{setLoading(false);}
  })()},[]);

  // Preload city GeoJSON
  useEffect(()=>{
    if(!chartReady)return;
    (async()=>{
      try{
        const m=await import('../assets/china_cities_filtered.json');
        const data=(m as any).default||m;
        const provColorMap:Record<string,string>={};
        provinces.current.forEach((p,i)=>{provColorMap[p]=PROV_COLORS[i%PROV_COLORS.length]});
        const feats=(data as any).features.map((f:any)=>{
          const prov=f.properties?.province||'';
          const base=provColorMap[prov]||'#e8e8e8';
          // Derive slightly different color for city within province
          cityColors.current[f.properties?.name||'']=base;
          return {...f,properties:{...f.properties,cp:base}};
        });
        echarts.registerMap('china_cities',{type:'FeatureCollection',features:feats});
        cityMapReady=true;
      }catch(e){}
    })();
  },[chartReady]);

  useEffect(()=>{
    if(!chartReady||!cr.current||projs.current.length===0)return;
    if(ci.current)ci.current.dispose();
    const chart=echarts.init(cr.current,dark?'dark':undefined);
    ci.current=chart;
    const projects=projs.current;
    const provs=provinces.current;
    const lc=dark?'rgba(255,255,255,0.9)':'rgba(0,0,0,0.7)';
    const lblBg=dark?'rgba(0,0,0,0.5)':'rgba(255,255,255,0.7)';
    const sc=dark?'#ff6b6b':'#e53e3e';

    const rcs:Record<string,{lat:number;lng:number;cnt:number;projs:string[];cities:Set<string>}>={};
    const pc=new Set<string>();
    projects.forEach((p:any)=>{
      const coord=getCoord(p.city,p.region);
      if(coord){pc.add(p.city);const k=`${coord[0].toFixed(2)},${coord[1].toFixed(2)}`;
      if(!rcs[k])rcs[k]={lat:coord[1],lng:coord[0],cnt:0,projs:[],cities:new Set()};
      rcs[k].cnt++;rcs[k].projs.push(p.name);rcs[k].cities.add(p.city);}
    });
    const sd=Object.values(rcs).map(r=>({name:Array.from(r.cities).join('/'),value:[r.lng,r.lat,r.cnt],projects:r.projs}));
    const cm=Object.entries(CITY_COORDS).filter(([n])=>!pc.has(n)).map(([n,c])=>({name:n,value:[c[0],c[1],0]}));

    function zc(z:number){
      if(z>=4)return{cl:8,cso:1,sso:14,pl:9,clbl:8};
      if(z>=2.5)return{cl:6,cso:0.7,sso:12,pl:10,clbl:7};
      if(z>=2)return{cl:0,cso:0.35,sso:10,pl:11,clbl:6};
      if(z>=1.5)return{cl:0,cso:0,sso:8,pl:13,clbl:0};
      return{cl:0,cso:0,sso:5,pl:14,clbl:0};
    }
    const c=zc(zoom.current);

    function opt(z:number){
      const cfg=zc(z);
      return{
        backgroundColor:dark?'#1a1a2e':'#f8faff',
        tooltip:{trigger:'item',backgroundColor:dark?'#2a2a2a':'#fff',borderColor:dark?'#444':'#ddd',
          textStyle:{color:dark?'#ddd':'#333'},
          formatter:(p:any)=>{
            if(p.seriesName==='poc'){const l=(p.data?.projects||[]).slice(0,8).join('<br/>');
            const m=p.data?.projects?.length>8?`<br/>...共 ${p.data.projects.length} 个项目`:'';return`<strong>${p.name}</strong><br/>项目数：${p.value?.[2]||0}<br/>${l}${m}`;}
            return p.name||'';}},
        geo:{map:'china',roam:true,zoom:zoom.current,center:[104.4,37.5],scaleLimit:{min:1,max:10},
          label:{show:true,fontSize:cfg.pl,color:lc,backgroundColor:lblBg,borderRadius:2,padding:[1,3],
            formatter:(p:any)=>shortName(p.name||'')},
          itemStyle:{borderColor:dark?'#3a3a5a':'#c0d5e8',borderWidth:0.8},
          emphasis:{label:{fontSize:cfg.pl+2,color:dark?'#fff':'#000'},
            itemStyle:{borderColor:'#1677ff',borderWidth:2,areaColor:dark?'#2a3a5e':'#cde0f5'}},
          regions:provs.map((name,i)=>({name,itemStyle:{areaColor:PROV_COLORS[i%PROV_COLORS.length]},
            label:{position:LABEL_FIX[name]||undefined}}))},
        series:[
          {name:'city_layer',type:'map',map:'china_cities',geoIndex:0,
            itemStyle:{borderColor:dark?'#4a4a6a':'#d0dae5',borderWidth:0.3,
              areaColor:dark?'rgba(30,144,255,0.08)':'rgba(30,144,255,0.06)'},
            label:{show:cfg.cso>0,fontSize:cfg.clbl,color:dark?'rgba(255,255,255,0.5)':'rgba(0,0,0,0.35)'},
            emphasis:{label:{fontSize:cfg.clbl+1},itemStyle:{areaColor:dark?'rgba(30,144,255,0.2)':'rgba(30,144,255,0.15)'}},
            silent:true,zlevel:1,
          },
          {name:'poc',type:'scatter',coordinateSystem:'geo',
            data:cfg.sso>0?sd:[],symbolSize:(v:number[])=>Math.min(Math.max(v[2]*cfg.sso,cfg.sso*2),48),
            itemStyle:{color:sc,shadowBlur:8,shadowColor:dark?'rgba(255,107,107,0.5)':'rgba(229,62,62,0.3)',opacity:cfg.sso<8?0.6:1},
            label:{show:false},emphasis:{scale:1.5}},
          {name:'city_marks',type:'scatter',coordinateSystem:'geo',
            data:cfg.cl>0?cm:[],symbolSize:cfg.cl,itemStyle:{color:dark?'rgba(255,255,255,0.3)':'rgba(0,0,0,0.15)'},
            label:{show:cfg.cl>0,formatter:'{b}',position:'right',fontSize:cfg.clbl-1,
              color:dark?'rgba(255,255,255,0.5)':'rgba(0,0,0,0.3)',distance:3},silent:true},
        ]};
    }

    chart.setOption(opt(zoom.current));

    chart.on('georoam',()=>{
      const o=chart.getOption();const g=(o as any).geo?.[0];if(!g)return;
      const z=(g.zoom as number)||1.2;if(Math.abs(z-zoom.current)<0.1)return;zoom.current=z;
      const cfg=zc(z);
      chart.setOption({
        geo:[{label:{fontSize:cfg.pl},emphasis:{label:{fontSize:cfg.pl+2}},
          regions:provs.map((name,i)=>({name,itemStyle:{areaColor:PROV_COLORS[i%PROV_COLORS.length]},
            label:{position:LABEL_FIX[name]||undefined}}))}],
        series:[
          {label:{show:cfg.cso>0,fontSize:cfg.clbl},itemStyle:{opacity:cfg.cso}},
          {data:cfg.sso>0?sd:[],symbolSize:(v:number[])=>Math.min(Math.max(v[2]*cfg.sso,cfg.sso*2),48)},
          {data:cfg.cl>0?cm:[],symbolSize:cfg.cl,label:{show:cfg.cl>0,fontSize:cfg.clbl-1}},
        ]});
    });

    const hr=()=>chart.resize();window.addEventListener('resize',hr);
    return()=>{window.removeEventListener('resize',hr);chart.dispose();};
  },[chartReady,dark]);

  if(loading)return<Spin style={{display:'block',margin:'100px auto'}}/>;
  const cities=new Set<string>();
  projs.current.forEach((p:any)=>{const c=getCoord(p.city,p.region);if(c)cities.add(p.city);});
  return(<div><h2 style={{marginBottom:24}}>派遣地图</h2><Card><div ref={cr} style={{width:'100%',height:600}}/>
    <div style={{marginTop:16,display:'flex',flexWrap:'wrap',gap:8}}>
      <Tag color="blue" icon={<EnvironmentOutlined/>}>共 {projs.current.length} 个项目，覆盖 {cities.size||0} 个城市</Tag></div></Card></div>);
}
