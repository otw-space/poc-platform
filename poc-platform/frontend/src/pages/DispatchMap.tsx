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
  '南通':[120.9,32.0],'常州':[119.9,31.8],'唐山':[118.2,39.6],'保定':[115.5,38.9],
  '邯郸':[114.5,36.6],'包头':[109.8,40.6],'吉林':[126.5,43.8],'大庆':[125.0,46.6],
  '芜湖':[118.4,31.3],'蚌埠':[117.3,32.9],'岳阳':[113.1,29.4],'汕头':[116.7,23.4],
  '柳州':[109.4,24.3],'绵阳':[104.7,31.5],'遵义':[106.9,27.7],'咸阳':[108.7,34.3],
  '南宁市':[108.3,22.8],'拉萨市':[91.1,29.7],'日喀则':[88.9,29.3],'林芝':[94.3,29.6],
  '阿克苏':[80.3,41.2],'喀什':[75.9,39.5],'伊犁':[81.3,43.9],'齐齐哈尔':[123.9,47.3],
  '牡丹江':[129.6,44.5],'佳木斯':[130.3,46.8],'延边':[129.5,42.9],
};

const REGION_COORDS: Record<string, [number, number]> = {
  '华东':[118.8,32.1],'华南':[113.3,23.1],'华中':[114.3,30.6],
  '华北':[116.4,39.9],'西北':[108.9,34.3],'西南':[104.1,30.6],'东北':[123.4,41.8],
};

function shortName(n: string): string {
  return n.replace(/省|市|壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区/g, '');
}

function getCoord(city: string, region: string): [number, number] | null {
  for (const [k, c] of Object.entries(CITY_COORDS)) if (city.includes(k) || k.includes(city)) return c;
  if (REGION_COORDS[region]) return REGION_COORDS[region];
  if (city.length >= 2) {
    const s = city.substring(0, 2);
    for (const [k, c] of Object.entries(CITY_COORDS)) if (k.includes(s)) return c;
  }
  return null;
}

export default function DispatchMap() {
  const [loading, setLoading] = useState(true);
  const cr = useRef<HTMLDivElement>(null);
  const ci = useRef<echarts.ECharts | null>(null);
  const projs = useRef<any[]>([]);
  const zoom = useRef(1.2);
  const { dark } = useTheme();

  useEffect(() => {
    (async () => {
      try {
        const [projRes, gj] = await Promise.all([
          getProjects({ page: 1, page_size: 100 }),
          import('../assets/china.json'),
        ]);
        const geo = (gj as any).default || gj;
        let all = projRes.data.items;
        const tot = projRes.data.total;
        if (tot > 100) {
          const ps = [];
          for (let p = 2; p <= Math.ceil(tot / 100); p++) ps.push(getProjects({ page: p, page_size: 100 }));
          (await Promise.all(ps)).forEach(r => { all = all.concat(r.data.items); });
        }
        projs.current = all;
        echarts.registerMap('china', geo);
        setLoading(false);
      } catch (err) {
        console.error(err);
        message.error('地图数据加载失败');
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (loading || !cr.current || projs.current.length === 0) return;
    if (ci.current) ci.current.dispose();
    const chart = echarts.init(cr.current, dark ? 'dark' : undefined);
    ci.current = chart;

    const labelColor = dark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)';
    const scatterRed = dark ? '#ff6b6b' : '#e53e3e';

    // Build project markers
    const rcs: Record<string, { lat: number; lng: number; cnt: number; projs: string[]; cities: Set<string> }> = {};
    const pc = new Set<string>();
    projs.current.forEach((p: any) => {
      const coord = getCoord(p.city, p.region);
      if (coord) {
        pc.add(p.city);
        const k = `${coord[0].toFixed(2)},${coord[1].toFixed(2)}`;
        if (!rcs[k]) rcs[k] = { lat: coord[1], lng: coord[0], cnt: 0, projs: [], cities: new Set() };
        rcs[k].cnt++; rcs[k].projs.push(p.name); rcs[k].cities.add(p.city);
      }
    });
    const scatterData = Object.values(rcs).map(r => ({
      name: Array.from(r.cities).join('/'),
      value: [r.lng, r.lat, r.cnt],
      projects: r.projs,
    }));

    // City label markers (non-project cities)
    const cityLabels = Object.entries(CITY_COORDS)
      .filter(([n]) => !pc.has(n.replace(/市$/,'')))
      .map(([n, c]) => ({ name: n.replace(/市$/, ''), value: [c[0], c[1]] }));

    function zoomCfg(z: number) {
      // Smooth thresholds based on zoom level
      // <1.3: only "中华人民共和国"
      // 1.3-2: province names appear, fade in
      // 2-4: city labels appear, fade in
      // >4: all labels large
      const provAlpha = Math.max(0, Math.min(1, (z - 1.3) / 0.7)); // 1.3→2 goes 0→1
      const cityAlpha = Math.max(0, Math.min(1, (z - 2) / 2));     // 2→4 goes 0→1
      const provSize = Math.round(10 + provAlpha * 6);              // 10→16
      const citySize = Math.round(7 + cityAlpha * 5);              // 7→12
      const scatterScale = z < 1.5 ? 3 : z < 2 ? 5 : z < 3 ? 7 : 10;
      return { provAlpha, cityAlpha, provSize, citySize, scatterScale };
    }

    function buildOption(z: number) {
      const cfg = zoomCfg(z);
      return {
        backgroundColor: dark ? '#1a1a2e' : '#f8faff',
        tooltip: {
          trigger: 'item',
          backgroundColor: dark ? '#2a2a2a' : '#fff',
          borderColor: dark ? '#444' : '#ddd',
          textStyle: { color: dark ? '#ddd' : '#333' },
          formatter: (p: any) => {
            if (p.seriesName === 'projects') {
              const l = (p.data?.projects || []).slice(0, 8).join('<br/>');
              const m = p.data?.projects?.length > 8 ? `<br/>...共 ${p.data.projects.length} 个项目` : '';
              return `<strong>${p.name}</strong><br/>项目数：${p.value?.[2] || 0}<br/>${l}${m}`;
            }
            return p.name || '';
          },
        },
        geo: {
          map: 'china',
          roam: true,
          zoom: z,
          center: [104.4, 37.5],
          scaleLimit: { min: 1.0, max: 10 },
          label: {
            show: z >= 1.3,
            fontSize: cfg.provSize,
            color: `rgba(${dark ? '255,255,255' : '0,0,0'},${0.3 + cfg.provAlpha * 0.6})`,
            formatter: (p: any) => shortName(p.name || ''),
          },
          itemStyle: {
            areaColor: dark ? '#1a2a4a' : '#e8f0f8',
            borderColor: dark ? '#3a4a6a' : '#b0c8e0',
            borderWidth: 0.6,
          },
          emphasis: {
            label: { fontSize: cfg.provSize + 2, color: dark ? '#fff' : '#000' },
            itemStyle: {
              areaColor: dark ? '#253560' : '#d0e5f5',
              borderColor: '#1677ff',
              borderWidth: 1.5,
            },
          },
        },
        series: [
          // City label points (fade in at zoom 2+)
          {
            name: 'city_labels',
            type: 'scatter',
            coordinateSystem: 'geo',
            data: cfg.cityAlpha > 0 ? cityLabels : [],
            symbolSize: 3,
            itemStyle: { color: `rgba(${dark ? '255,255,255' : '0,0,0'},${cfg.cityAlpha * 0.5})` },
            label: {
              show: cfg.cityAlpha > 0,
              formatter: '{b}',
              position: 'right',
              fontSize: cfg.citySize,
              color: `rgba(${dark ? '255,255,255' : '0,0,0'},${cfg.cityAlpha * 0.55})`,
              distance: 4,
            },
            silent: true,
          },
          // Project markers
          {
            name: 'projects',
            type: 'scatter',
            coordinateSystem: 'geo',
            data: scatterData,
            symbolSize: (v: number[]) => Math.min(Math.max(v[2] * cfg.scatterScale, cfg.scatterScale * 2), 48),
            itemStyle: { color: scatterRed, shadowBlur: 8, shadowColor: dark ? 'rgba(255,107,107,0.5)' : 'rgba(229,62,62,0.3)' },
            label: { show: false },
            emphasis: { scale: 1.5 },
          },
        ],
      };
    }

    chart.setOption(buildOption(zoom.current));

    // First render - add "中华人民共和国" title as graphic
    chart.setOption({
      graphic: [{
        type: 'text',
        left: 'center',
        top: 'middle',
        style: {
          text: z => (zoom.current < 1.3 ? '中华人民共和国' : ''),
          fontSize: 22,
          fontWeight: 'bold',
          fill: dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.2)',
        },
        silent: true,
      }],
    });

    chart.on('georoam', () => {
      const o = chart.getOption();
      const g = (o as any).geo?.[0];
      if (!g) return;
      const z = (g.zoom as number) || 1.2;
      if (Math.abs(z - zoom.current) < 0.05) return;
      zoom.current = z;
      const cfg = zoomCfg(z);

      chart.setOption({
        graphic: [{ style: { text: z < 1.3 ? '中华人民共和国' : '', fill: dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.2)' } }],
        geo: [{
          label: {
            show: z >= 1.3,
            fontSize: cfg.provSize,
            color: `rgba(${dark ? '255,255,255' : '0,0,0'},${0.3 + cfg.provAlpha * 0.6})`,
          },
          emphasis: { label: { fontSize: cfg.provSize + 2 } },
        }],
        series: [
          {
            data: cfg.cityAlpha > 0 ? cityLabels : [],
            itemStyle: { color: `rgba(${dark ? '255,255,255' : '0,0,0'},${cfg.cityAlpha * 0.5})` },
            label: { show: cfg.cityAlpha > 0, fontSize: cfg.citySize, color: `rgba(${dark ? '255,255,255' : '0,0,0'},${cfg.cityAlpha * 0.55})` },
          },
          { symbolSize: (v: number[]) => Math.min(Math.max(v[2] * cfg.scatterScale, cfg.scatterScale * 2), 48) },
        ],
      });
    });

    const hr = () => chart.resize();
    window.addEventListener('resize', hr);
    return () => { window.removeEventListener('resize', hr); chart.dispose(); };
  }, [loading, dark]);

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />;

  const cities = new Set<string>();
  projs.current.forEach((p: any) => {
    const c = getCoord(p.city, p.region);
    if (c) cities.add(p.city);
  });

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>派遣地图</h2>
      <Card>
        <div ref={cr} style={{ width: '100%', height: 600 }} />
        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Tag color="blue" icon={<EnvironmentOutlined />}>
            共 {projs.current.length} 个项目，覆盖 {cities.size || 0} 个城市
          </Tag>
        </div>
      </Card>
    </div>
  );
}
