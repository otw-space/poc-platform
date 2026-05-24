import { useEffect, useState, useRef } from 'react';
import { Card, Spin, Tag, message } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import * as echarts from 'echarts';
import { getProjects } from '../api/projects';
import { getOptions } from '../api/options';
import { useTheme } from '../context/ThemeContext';

const CITY_COORDS: Record<string, [number, number]> = {
  '北京': [116.4, 39.9], '上海': [121.5, 31.2], '广州': [113.3, 23.1],
  '深圳': [114.1, 22.5], '杭州': [120.2, 30.3], '成都': [104.1, 30.6],
  '武汉': [114.3, 30.6], '南京': [118.8, 32.1], '重庆': [106.5, 29.5],
  '天津': [117.2, 39.1], '苏州': [120.6, 31.3], '西安': [108.9, 34.3],
  '长沙': [113.0, 28.2], '青岛': [120.4, 36.1], '郑州': [113.7, 34.8],
  '大连': [121.6, 38.9], '宁波': [121.5, 29.9], '厦门': [118.1, 24.5],
  '福州': [119.3, 26.1], '济南': [117.0, 36.7], '合肥': [117.2, 31.8],
  '昆明': [102.7, 25.0], '贵阳': [106.7, 26.6], '南宁': [108.3, 22.8],
  '海口': [110.3, 20.0], '兰州': [103.8, 36.1], '西宁': [101.8, 36.6],
  '银川': [106.3, 38.5], '乌鲁木齐': [87.6, 43.8], '呼和浩特': [111.7, 40.8],
  '拉萨': [91.1, 29.7], '沈阳': [123.4, 41.8], '长春': [125.3, 43.9],
  '哈尔滨': [126.5, 45.8], '太原': [112.6, 37.9], '石家庄': [114.5, 38.0],
  '南昌': [115.9, 28.7], '无锡': [120.3, 31.6], '东莞': [113.8, 23.0],
  '佛山': [113.1, 23.0], '珠海': [113.6, 22.3],
};

const REGION_COORDS: Record<string, [number, number]> = {
  '华东': [118.8, 32.1], '华南': [113.3, 23.1], '华中': [114.3, 30.6],
  '华北': [116.4, 39.9], '西北': [108.9, 34.3], '西南': [104.1, 30.6],
  '东北': [123.4, 41.8],
};

function getCoord(city: string, region: string): [number, number] | null {
  for (const [key, coord] of Object.entries(CITY_COORDS)) {
    if (city.includes(key) || key.includes(city)) return coord;
  }
  if (REGION_COORDS[region]) return REGION_COORDS[region];
  if (city.length >= 2) {
    const short = city.substring(0, 2);
    for (const [key, coord] of Object.entries(CITY_COORDS)) {
      if (key.includes(short)) return coord;
    }
  }
  return null;
}

// Provincial color palette — soft pastels with variety
const PROVINCE_COLORS = [
  '#f0f7ff','#fef9f0','#f1f9f1','#fff4f4','#f5f0ff',
  '#eaf6ff','#fdf6e3','#e6f9e8','#fff0f0','#ede4ff',
  '#e0f2ff','#fef3e0','#daf5dc','#ffe8e8','#e1d4f7',
  '#d6ecff','#fcecd0','#cef0d0','#ffdde0','#d5c4f0',
  '#cce6ff','#fae6c0','#c2ebc4','#ffd2d5','#c9b4e9',
  '#c2dfff','#f8dfb0','#b7e6b8','#ffc8cc','#bda4e2',
  '#b8d8ff','#f6d8a0','#ace0ac','#ffbdc2','#b194db',
  '#aed1ff','#f4d290',
];

export default function DispatchMap() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<string[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const zoomRef = useRef(1.2);
  const { dark } = useTheme();

  useEffect(() => {
    (async () => {
      try {
        const [projRes, statusRes, geoJsonMod] = await Promise.all([
          getProjects({ page: 1, page_size: 100 }),
          getOptions('status'),
          import('../assets/china.json'),
        ]);
        const geoJson = (geoJsonMod as any).default || geoJsonMod;

        let allProjects = projRes.data.items;
        const total = projRes.data.total;
        if (total > 100) {
          const pages = Math.ceil(total / 100);
          const extraReqs = [];
          for (let p = 2; p <= pages; p++) {
            extraReqs.push(getProjects({ page: p, page_size: 100 }));
          }
          const extraResults = await Promise.all(extraReqs);
          extraResults.forEach(r => { allProjects = allProjects.concat(r.data.items); });
        }

        // Extract province names from GeoJSON
        const names = (geoJson as any).features?.map((f: any) => f.properties?.name).filter(Boolean) || [];
        setProvinces(names);
        setProjects(allProjects);
        echarts.registerMap('china', geoJson);
        setLoading(false);
      } catch (err) {
        console.error('DispatchMap load error:', err);
        message.error('地图数据加载失败');
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (loading || !chartRef.current || projects.length === 0) return;

    if (chartInstance.current) chartInstance.current.dispose();
    const chart = echarts.init(chartRef.current, dark ? 'dark' : undefined);
    chartInstance.current = chart;

    const bg = dark ? '#1a1a2e' : '#f8faff';
    const borderColor = dark ? '#333' : '#c0d5e8';
    const textColor = dark ? '#aaa' : '#555';
    const scatterColor = dark ? '#ff6b6b' : '#e53e3e';

    const regionCounts: Record<string, { lat: number; lng: number; count: number; projects: string[]; cities: Set<string> }> = {};
    projects.forEach((p: any) => {
      const coord = getCoord(p.city, p.region);
      if (coord) {
        const key = `${coord[0].toFixed(2)},${coord[1].toFixed(2)}`;
        if (!regionCounts[key]) {
          regionCounts[key] = { lat: coord[1], lng: coord[0], count: 0, projects: [], cities: new Set() };
        }
        regionCounts[key].count++;
        regionCounts[key].projects.push(p.name);
        regionCounts[key].cities.add(p.city);
      }
    });

    const scatterData = Object.values(regionCounts).map((r) => ({
      name: Array.from(r.cities).join('/'),
      value: [r.lng, r.lat, r.count],
      projects: r.projects,
    }));

    const getZoomConfig = (z: number) => {
      if (z >= 4) return { showProvince: true, showScatter: true, labelSize: 10, scatterSize: 14 };
      if (z >= 2) return { showProvince: true, showScatter: true, labelSize: 12, scatterSize: 12 };
      if (z >= 1.3) return { showProvince: true, showScatter: false, labelSize: 13, scatterSize: 8 };
      return { showProvince: true, showScatter: false, labelSize: 14, scatterSize: 6 };
    };

    const zc = getZoomConfig(zoomRef.current);

    const option: any = {
      backgroundColor: bg,
      tooltip: {
        trigger: 'item',
        backgroundColor: dark ? '#2a2a2a' : '#fff',
        borderColor: dark ? '#444' : '#ddd',
        textStyle: { color: dark ? '#ddd' : '#333' },
        formatter: (params: any) => {
          if (params.seriesName === 'projects') {
            const projList = (params.data?.projects || []).slice(0, 8).join('<br/>');
            const more = params.data?.projects?.length > 8 ? `<br/>...共 ${params.data.projects.length} 个项目` : '';
            return `<strong>${params.name}</strong><br/>项目数：${params.value?.[2] || 0}<br/>${projList}${more}`;
          }
          return params.name;
        },
      },
      geo: {
        map: 'china',
        roam: true,
        zoom: zoomRef.current,
        center: [104.4, 37.5],
        scaleLimit: { min: 1, max: 10 },
        label: {
          show: true,
          fontSize: zc.labelSize,
          color: textColor,
          distance: 0,
        },
        itemStyle: {
          borderColor: borderColor,
          borderWidth: 0.8,
        },
        emphasis: {
          label: { fontSize: zc.labelSize + 2, color: dark ? '#fff' : '#000' },
          itemStyle: {
            borderColor: '#1677ff',
            borderWidth: 2,
            areaColor: dark ? '#2a3a5e' : '#cde0f5',
          },
        },
        regions: provinces.map((name, i) => ({
          name,
          itemStyle: { areaColor: PROVINCE_COLORS[i % PROVINCE_COLORS.length] },
          label: { color: textColor },
        })),
      },
      series: [{
        name: 'projects',
        type: 'scatter',
        coordinateSystem: 'geo',
        data: scatterData,
        symbolSize: (val: number[]) => Math.min(Math.max(val[2] * zc.scatterSize, 8), 48),
        itemStyle: {
          color: scatterColor,
          shadowBlur: 8,
          shadowColor: dark ? 'rgba(255,107,107,0.5)' : 'rgba(229,62,62,0.3)',
          opacity: zc.showScatter ? 1 : 0.6,
        },
        label: {
          show: zc.showScatter && scatterData.length <= 20,
          formatter: '{b}',
          position: 'right',
          fontSize: zc.scatterSize - 2,
          color: textColor,
          distance: 4,
        },
        emphasis: { scale: 1.5, label: { fontSize: zc.scatterSize + 1, fontWeight: 'bold' } },
      }],
    };

    chart.setOption(option);

    // Handle zoom — only update labels/regions, not the entire option
    chart.on('georoam', () => {
      const opt = chart.getOption();
      const geoOpt = (opt as any).geo?.[0];
      if (!geoOpt) return;
      const z = geoOpt.zoom || 1.2;
      if (Math.abs(z - zoomRef.current) < 0.05) return;
      zoomRef.current = z;
      const zc2 = getZoomConfig(z);
      chart.setOption({
        geo: [{
          label: { fontSize: zc2.labelSize },
          emphasis: { label: { fontSize: zc2.labelSize + 2 } },
          regions: provinces.map((name, i) => ({
            name,
            itemStyle: { areaColor: PROVINCE_COLORS[i % PROVINCE_COLORS.length] },
            label: { color: textColor },
          })),
        }],
        series: [{
          symbolSize: (val: number[]) => Math.min(Math.max(val[2] * zc2.scatterSize, 8), 48),
          label: { show: zc2.showScatter && scatterData.length <= 20, fontSize: zc2.scatterSize - 2 },
          itemStyle: { opacity: zc2.showScatter ? 1 : 0.6 },
        }],
      });
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [loading, projects, dark, provinces]);

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />;

  const cities = new Set<string>();
  projects.forEach((p: any) => {
    const c = getCoord(p.city, p.region);
    if (c) cities.add(p.city);
  });

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>派遣地图</h2>
      <Card>
        <div ref={chartRef} style={{ width: '100%', height: 600 }} />
        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Tag color="blue" icon={<EnvironmentOutlined />}>
            共 {projects.length} 个项目，覆盖 {cities.size || 0} 个城市
          </Tag>
        </div>
      </Card>
    </div>
  );
}
