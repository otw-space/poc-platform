import { useEffect, useState, useRef, useCallback } from 'react';
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

// Province color palette — alternating warm/cool tones
const PROVINCE_COLORS = [
  '#e8f4f8', '#fef9e7', '#eaf7ee', '#fdf2f0', '#f3e8ff',
  '#e6f7ff', '#fff7e6', '#f0fdf4', '#fff1f0', '#f9f0ff',
  '#e3f2fd', '#fff8e1', '#e8f5e9', '#fce4ec', '#ede7f6',
  '#dcedc8', '#fff9c4', '#e1f5fe', '#f3e5f5', '#ffebee',
  '#c8e6c9', '#ffe0b2', '#b3e5fc', '#e1bee7', '#ffcdd2',
  '#d7ccc8', '#cfd8dc', '#f0f4c3', '#d1c4e9', '#ffccbc',
  '#b2dfdb', '#fff3e0', '#c5cae9', '#f8bbd0',
];

export default function DispatchMap() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [statusLabels, setStatusLabels] = useState<Record<string, string>>({});
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
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

        setProjects(allProjects);
        const sm: Record<string, string> = {};
        statusRes.data.forEach((o: any) => { sm[o.id] = o.label; });
        setStatusLabels(sm);
        echarts.registerMap('china', geoJson);
        setLoading(false);
      } catch (err) {
        console.error('DispatchMap load error:', err);
        message.error('地图数据加载失败');
        setLoading(false);
      }
    })();
  }, []);

  const buildOption = useCallback((zoom: number) => {
    // Zoom levels: <2 → province labels, 2-4 → city labels, >4 → detailed
    const showProvince = zoom < 4;
    const showDetail = zoom >= 4;

    const bg = dark ? '#1a1a2e' : '#f0f5ff';
    const borderColor = dark ? '#2a2a4a' : '#b8d4e8';
    const textColor = dark ? '#888' : '#555';
    const emphasisBg = dark ? '#2a3a5e' : '#cde0f5';
    const emphasisBorder = dark ? '#4a6fa5' : '#7baed4';
    const labelColor = dark ? '#ccc' : '#333';
    const scatterColor = dark ? '#ff6b6b' : '#ff4d4f';

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

    return {
      backgroundColor: bg,
      tooltip: {
        trigger: 'item',
        backgroundColor: dark ? '#2a2a2a' : '#fff',
        borderColor: dark ? '#444' : '#ddd',
        textStyle: { color: dark ? '#ddd' : '#333' },
        formatter: (params: any) => {
          if (params.componentSubType === 'scatter') {
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
        zoom: 1.2,
        center: [104.4, 37.5],
        scaleLimit: { min: 1, max: 10 },
        label: {
          show: showProvince,
          fontSize: showDetail ? 9 : 11,
          color: labelColor,
          formatter: showDetail ? '{b}' : undefined,
        },
        itemStyle: {
          areaColor: '#e8f4f8',
          borderColor: borderColor,
          borderWidth: 1,
          shadowColor: dark ? 'rgba(0,0,0,0.5)' : 'rgba(167,189,210,0.3)',
          shadowBlur: 3,
          shadowOffsetY: 1,
        },
        emphasis: {
          label: { show: true, color: dark ? '#fff' : '#333', fontSize: 13 },
          itemStyle: {
            areaColor: emphasisBg,
            borderColor: emphasisBorder,
            borderWidth: 1.5,
          },
        },
        regions: scatterData.map((d, i) => ({
          name: d.name,
          itemStyle: {
            areaColor: PROVINCE_COLORS[i % PROVINCE_COLORS.length],
          },
        })),
      },
      series: [{
        name: 'projects',
        type: 'scatter',
        coordinateSystem: 'geo',
        data: scatterData,
        symbolSize: (val: number[]) => Math.min(Math.max(val[2] * 10, 16), 52),
        itemStyle: {
          color: scatterColor,
          shadowBlur: 10,
          shadowColor: dark ? 'rgba(255,107,107,0.5)' : 'rgba(255,77,79,0.3)',
        },
        label: {
          show: scatterData.length <= 15 || zoom >= 2,
          formatter: '{b}',
          position: 'right',
          fontSize: 10,
          color: labelColor,
          distance: 6,
        },
        emphasis: {
          scale: 1.6,
          label: { fontSize: 12, fontWeight: 'bold' },
          itemStyle: { shadowBlur: 20 },
        },
      }],
    };
  }, [projects, dark]);

  useEffect(() => {
    if (loading || !chartRef.current || projects.length === 0) return;

    if (chartInstance.current) chartInstance.current.dispose();
    const chart = echarts.init(chartRef.current, dark ? 'dark' : undefined);
    chartInstance.current = chart;

    let currentZoom = 1.2;
    chart.setOption(buildOption(currentZoom));

    chart.on('georoam', (params: any) => {
      const opt = chart.getOption();
      const geo = (opt as any).geo?.[0];
      if (geo?.zoom && geo.zoom !== currentZoom) {
        currentZoom = geo.zoom;
        chart.setOption(buildOption(currentZoom));
      }
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [loading, projects, buildOption]);

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
