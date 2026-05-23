import { useEffect, useState } from 'react';
import { Card, Spin, Tag } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { getProjects } from '../api/projects';
import { getOptions } from '../api/options';

// Register map from built-in China GeoJSON
import chinaMap from '../assets/china.json';

let mapRegistered = false;

// City → [lng, lat]
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

// Region-level coordinates (approximate centers)
const REGION_COORDS: Record<string, [number, number]> = {
  '华东': [118.8, 32.1], '华南': [113.3, 23.1], '华中': [114.3, 30.6],
  '华北': [116.4, 39.9], '西北': [108.9, 34.3], '西南': [104.1, 30.6],
  '东北': [123.4, 41.8],
};

function getCoord(city: string, region: string): [number, number] | null {
  // Try direct city match
  for (const [key, coord] of Object.entries(CITY_COORDS)) {
    if (city.includes(key) || key.includes(city)) return coord;
  }
  // Try region
  if (REGION_COORDS[region]) return REGION_COORDS[region];
  // Fuzzy city match
  if (city.length >= 2) {
    const short = city.substring(0, 2);
    for (const [key, coord] of Object.entries(CITY_COORDS)) {
      if (key.includes(short)) return coord;
    }
  }
  return null;
}

export default function DispatchMap() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [options, setOptions] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      getProjects({ page: 1, page_size: 200 }),
      getOptions('status'),
    ]).then(([projRes, statusRes]) => {
      setProjects(projRes.data.items);
      const statusMap: Record<string, string> = {};
      statusRes.data.forEach((o: any) => { statusMap[o.id] = o.label; });
      setOptions(statusMap);
      setLoading(false);
    });
  }, []);

  // Register map on first load
  if (!mapRegistered) {
    echarts.registerMap('china', chinaMap as any);
    mapRegistered = true;
  }

  const projectMarkers: any[] = [];
  const regionCounts: Record<string, { lat: number; lng: number; count: number; projects: string[]; cities: Set<string> }> = {};

  projects.forEach((p: any) => {
    const coord = getCoord(p.city, p.region);
    if (coord) {
      projectMarkers.push({
        name: p.name,
        value: [...coord, p],
      });
      // Aggregate by city for scatter effect
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

  const mapOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.seriesType === 'scatter' || params.componentSubType === 'scatter') {
          const projList = (params.data?.projects || []).slice(0, 8).join('<br/>');
          const more = params.data?.projects?.length > 8 ? `<br/>...共 ${params.data.projects.length} 个项目` : '';
          return `<strong>${params.name}</strong><br/>项目数：${params.value?.[2] || 0}<br/>${projList}${more}`;
        }
        if (params.seriesType === 'map' || params.seriesName === 'projects') {
          return `${params.name}`;
        }
        return `${params.name}`;
      },
    },
    geo: {
      map: 'china',
      roam: true,
      zoom: 1.2,
      center: [104.4, 37.5],
      label: { show: false },
      itemStyle: {
        areaColor: '#e6f4ff',
        borderColor: '#1677ff',
        borderWidth: 0.5,
      },
      emphasis: {
        label: { show: true },
        itemStyle: { areaColor: '#bae0ff' },
      },
    },
    series: [
      {
        name: 'projects',
        type: 'scatter',
        coordinateSystem: 'geo',
        data: scatterData,
        symbolSize: (val: number[]) => Math.min(Math.max(val[2] * 10, 16), 48),
        itemStyle: {
          color: '#ff4d4f',
          shadowBlur: 8,
          shadowColor: 'rgba(255,77,79,0.3)',
        },
        label: {
          show: true,
          formatter: '{b}',
          position: 'right',
          fontSize: 11,
          color: '#333',
        },
        emphasis: {
          scale: 1.4,
          label: { fontSize: 13, fontWeight: 'bold' },
        },
      },
    ],
  };

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>派遣地图</h2>
      <Card>
        <ReactECharts option={mapOption} style={{ height: 600 }} />
        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Tag color="blue" icon={<EnvironmentOutlined />}>
            共 {projects.length} 个项目覆盖 {new Set(scatterData.map(d => d.name)).size} 个区域
          </Tag>
          {scatterData.slice(0, 8).map((d, i) => (
            <Tag key={i} color="red">📍 {d.name} ({d.value[2]})</Tag>
          ))}
          {scatterData.length > 8 && <Tag>...</Tag>}
        </div>
      </Card>
    </div>
  );
}
