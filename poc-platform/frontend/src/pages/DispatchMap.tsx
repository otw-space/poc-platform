import { useEffect, useState, useRef } from 'react';
import { Card, Spin, Tag, message } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import * as echarts from 'echarts';
import { getProjects } from '../api/projects';
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
  '徐州': [117.2, 34.3], '温州': [120.7, 28.0], '泉州': [118.6, 24.9],
  '洛阳': [112.4, 34.6], '襄阳': [112.1, 32.0], '宜昌': [111.3, 30.7],
  '桂林': [110.3, 25.3], '三亚': [109.5, 18.3], '烟台': [121.4, 37.5],
  '威海': [122.1, 37.5], '扬州': [119.4, 32.4], '南通': [120.9, 32.0],
  '常州': [119.9, 31.8], '嘉兴': [120.8, 30.8], '金华': [119.7, 29.1],
  '唐山': [118.2, 39.6], '保定': [115.5, 38.9], '邯郸': [114.5, 36.6],
  '包头': [109.8, 40.6], '吉林': [126.5, 43.8], '大庆': [125.0, 46.6],
  '芜湖': [118.4, 31.3], '蚌埠': [117.3, 32.9], '岳阳': [113.1, 29.4],
  '株洲': [113.1, 27.8], '汕头': [116.7, 23.4], '柳州': [109.4, 24.3],
  '绵阳': [104.7, 31.5], '遵义': [106.9, 27.7], '咸阳': [108.7, 34.3],
};

const REGION_COORDS: Record<string, [number, number]> = {
  '华东': [118.8, 32.1], '华南': [113.3, 23.1], '华中': [114.3, 30.6],
  '华北': [116.4, 39.9], '西北': [108.9, 34.3], '西南': [104.1, 30.6],
  '东北': [123.4, 41.8],
};

// Fix province label positions
const LABEL_OFFSETS: Record<string, [number, number]> = {
  '甘肃省': [103, 38.5],
  '内蒙古自治区': [114, 44.5],
  '黑龙江省': [128, 48],
  '新疆维吾尔自治区': [84, 41.5],
  '青海省': [95, 35.5],
  '四川省': [102.5, 30.5],
  '云南省': [101, 25.5],
  '河北省': [114.5, 38],
  '海南省': [109.5, 19],
  '台湾省': [121, 24],
  '西藏自治区': [91, 31.5],
};

// Strip provincial suffixes for display
function shortName(name: string): string {
  return name.replace(/省|市|壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区/g, '');
}

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

let cityMapRegistered = false;

export default function DispatchMap() {
  const [loading, setLoading] = useState(true);
  const [chartReady, setChartReady] = useState(false);
  const [hasCityMap, setHasCityMap] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const projectsRef = useRef<any[]>([]);
  const provincesRef = useRef<string[]>([]);
  const cityParentRef = useRef<Record<string, string>>({});
  const zoomRef = useRef(1.2);
  const inCityMode = useRef(false);
  const { dark } = useTheme();

  // Load data
  useEffect(() => {
    (async () => {
      try {
        const [projRes, geoJsonMod] = await Promise.all([
          getProjects({ page: 1, page_size: 100 }),
          import('../assets/china.json'),
        ]);
        const geoJson = (geoJsonMod as any).default || geoJsonMod;

        let allProjects = projRes.data.items;
        const total = projRes.data.total;
        if (total > 100) {
          const pages = Math.ceil(total / 100);
          const reqs = [];
          for (let p = 2; p <= pages; p++) reqs.push(getProjects({ page: p, page_size: 100 }));
          const extra = await Promise.all(reqs);
          extra.forEach(r => { allProjects = allProjects.concat(r.data.items); });
        }

        const names = (geoJson as any).features?.map((f: any) => f.properties?.name).filter(Boolean) || [];
        provincesRef.current = names;
        projectsRef.current = allProjects;
        echarts.registerMap('china', geoJson);
        setChartReady(true);
      } catch (err) {
        console.error('DispatchMap load error:', err);
        message.error('地图数据加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Lazy-load city GeoJSON
  const loadCityMap = async () => {
    if (cityMapRegistered) return;
    try {
      const mod = await import('../assets/china_cities_filtered.json');
      const data = (mod as any).default || mod;
      // Build province color lookup by name
      const provinceColorMap: Record<string, string> = {};
      provincesRef.current.forEach((p, i) => {
        provinceColorMap[p] = PROVINCE_COLORS[i % PROVINCE_COLORS.length];
      });
      // Assign colors based on parent province
      const featuresWithColor = (data as any).features.map((f: any) => {
        const prov = f.properties?.province || '';
        cityParentRef.current[f.properties?.name || ''] = prov;
        return {
          ...f,
          properties: {
            ...f.properties,
            cp: provinceColorMap[prov] || '#e8e8e8',
          },
        };
      });
      const coloredGeoJSON = { type: 'FeatureCollection', features: featuresWithColor };
      echarts.registerMap('china_cities', coloredGeoJSON);
      cityMapRegistered = true;
      setHasCityMap(true);
    } catch (err) {
      console.error('Failed to load city map:', err);
    }
  };

  // Build charts
  useEffect(() => {
    if (!chartReady || !chartRef.current || projectsRef.current.length === 0) return;

    if (chartInstance.current) chartInstance.current.dispose();
    const chart = echarts.init(chartRef.current, dark ? 'dark' : undefined);
    chartInstance.current = chart;

    const projects = projectsRef.current;
    const provinces = provincesRef.current;
    const labelColor = dark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.7)';
    const bgLabelColor = dark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)';
    const scatterColor = dark ? '#ff6b6b' : '#e53e3e';

    const regionCounts: Record<string, { lat: number; lng: number; count: number; projects: string[]; cities: Set<string> }> = {};
    const projectCities = new Set<string>();

    projects.forEach((p: any) => {
      const coord = getCoord(p.city, p.region);
      if (coord) {
        projectCities.add(p.city);
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

    const cityMarkers = Object.entries(CITY_COORDS)
      .filter(([name]) => !projectCities.has(name))
      .map(([name, coord]) => ({ name, value: [coord[0], coord[1], 0] }));

    const getZoomCfg = (z: number) => {
      if (z >= 4)  return { useCityMap: true, showCityLabels: true,  showScatter: true,  scatterSize: 14, labelSize: 9,  cityLabelSize: 8 };
      if (z >= 2)  return { useCityMap: true, showCityLabels: true,  showScatter: true,  scatterSize: 12, labelSize: 11, cityLabelSize: 7 };
      if (z >= 1.5)return { useCityMap: false,showCityLabels: false, showScatter: false, scatterSize: 9,  labelSize: 13, cityLabelSize: 0 };
      return               { useCityMap: false,showCityLabels: false, showScatter: false, scatterSize: 6,  labelSize: 14, cityLabelSize: 0 };
    };

    const zc = getZoomCfg(zoomRef.current);

    const buildOption = (z: number, useCity: boolean) => {
      const c = getZoomCfg(z);
      const mapName = useCity ? 'china_cities' : 'china';
      const regions = useCity
        ? undefined
        : provinces.map((name, i) => ({
            name,
            itemStyle: { areaColor: PROVINCE_COLORS[i % PROVINCE_COLORS.length] },
            label: { position: LABEL_OFFSETS[name] || undefined, formatter: shortName(name) },
          }));

      return {
        backgroundColor: dark ? '#1a1a2e' : '#f8faff',
        tooltip: {
          trigger: 'item',
          backgroundColor: dark ? '#2a2a2a' : '#fff',
          borderColor: dark ? '#444' : '#ddd',
          textStyle: { color: dark ? '#ddd' : '#333' },
          formatter: (params: any) => {
            if (params.seriesName === 'poc_projects') {
              const list = (params.data?.projects || []).slice(0, 8).join('<br/>');
              const more = params.data?.projects?.length > 8 ? `<br/>...共 ${params.data.projects.length} 个项目` : '';
              return `<strong>${params.name}</strong><br/>项目数：${params.value?.[2] || 0}<br/>${list}${more}`;
            }
            return params.name || '';
          },
        },
        geo: {
          map: mapName,
          roam: true,
          zoom: zoomRef.current,
          center: [104.4, 37.5],
          scaleLimit: { min: 1, max: 10 },
          label: {
            show: !useCity,
            fontSize: c.labelSize,
            color: labelColor,
            backgroundColor: bgLabelColor,
            borderRadius: 2,
            padding: [1, 3],
            formatter: (p: any) => shortName(p.name || ''),
          },
          itemStyle: {
            borderColor: dark ? '#3a3a5a' : useCity ? '#d5dde8' : '#c0d5e8',
            borderWidth: useCity ? 0.3 : 0.8,
          },
          emphasis: {
            label: { show: true, fontSize: (c.labelSize || 10) + 2, color: dark ? '#fff' : '#000' },
            itemStyle: { borderColor: '#1677ff', borderWidth: 1.5 },
          },
          regions: regions as any,
        },
        series: [
          {
            name: 'poc_projects',
            type: 'scatter',
            coordinateSystem: 'geo',
            data: c.showScatter ? scatterData : [],
            symbolSize: (val: number[]) => Math.min(Math.max(val[2] * c.scatterSize, c.scatterSize * 2), 48),
            itemStyle: { color: scatterColor, shadowBlur: 8, shadowColor: dark ? 'rgba(255,107,107,0.5)' : 'rgba(229,62,62,0.3)' },
            label: { show: false },
            emphasis: { scale: 1.5 },
          },
          {
            name: 'city_labels',
            type: 'scatter',
            coordinateSystem: 'geo',
            data: c.showCityLabels ? cityMarkers : [],
            symbolSize: 3,
            itemStyle: { color: dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.12)' },
            label: {
              show: c.showCityLabels,
              formatter: '{b}',
              position: 'right',
              fontSize: c.cityLabelSize,
              color: dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.35)',
              distance: 3,
            },
            silent: true,
          },
        ],
      };
    };

    chart.setOption(buildOption(zoomRef.current, false));
    const cityMapPromise: Promise<void> | null = null;

    chart.on('georoam', async () => {
      const opt = chart.getOption();
      const geoOpt = (opt as any).geo?.[0];
      if (!geoOpt) return;
      const z = (geoOpt.zoom as number) || 1.2;
      if (Math.abs(z - zoomRef.current) < 0.1) return;
      zoomRef.current = z;

      const c = getZoomCfg(z);
      const wantCity = c.useCityMap;

      // Lazy load city GeoJSON when first zooming in past threshold
      if (wantCity && !cityMapRegistered) {
        await loadCityMap();
      }

      if (wantCity !== inCityMode.current && cityMapRegistered) {
        // Switch map
        inCityMode.current = wantCity;
        const full = buildOption(z, wantCity);
        chart.setOption(full, true); // true = notMerge, full replace
      } else {
        // Incremental update
        chart.setOption({
          geo: [{
            label: { fontSize: c.labelSize, show: !wantCity },
            emphasis: { label: { fontSize: (c.labelSize || 10) + 2 } },
            regions: wantCity ? undefined : provinces.map((name, i) => ({
              name,
              itemStyle: { areaColor: PROVINCE_COLORS[i % PROVINCE_COLORS.length] },
              label: { position: LABEL_OFFSETS[name] || undefined, formatter: shortName(name) },
            })),
          }],
          series: [
            { data: c.showScatter ? scatterData : [], symbolSize: (val: number[]) => Math.min(Math.max(val[2] * c.scatterSize, c.scatterSize * 2), 48) },
            { data: c.showCityLabels ? cityMarkers : [], label: { show: c.showCityLabels, fontSize: c.cityLabelSize } },
          ],
        });
      }
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [chartReady, dark]);

  if (loading) return <Spin style={{ display: 'block', margin: '100px auto' }} />;

  const cities = new Set<string>();
  projectsRef.current.forEach((p: any) => {
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
            共 {projectsRef.current.length} 个项目，覆盖 {cities.size || 0} 个城市
          </Tag>
        </div>
      </Card>
    </div>
  );
}
