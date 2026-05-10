import { Select, Space } from 'antd';

export const COLOR_SCHEMES: Record<string, { name: string; colors: string[] }> = {
  'default-blue':  { name: '默认蓝', colors: ['#0D3B66', '#1677FF', '#4096FF', '#91CAFF'] },
  'tech-purple':   { name: '科技紫', colors: ['#391085', '#722ED1', '#9254DE', '#D3ADF7'] },
  'fresh-green':   { name: '清新绿', colors: ['#135200', '#52C41A', '#73D13D', '#B7EB8F'] },
  'warm-orange':   { name: '暖橙',   colors: ['#AD4E00', '#FA8C16', '#FFA940', '#FFD591'] },
  'dark-theme':    { name: '深色系', colors: ['#141414', '#434343', '#8C8C8C', '#BFBFBF'] },
  'pink-macaron':  { name: '桃粉',   colors: ['#C7455C', '#FF8696', '#FFB3BA', '#FFE8EB'] },
  'coast':         { name: '海岸',   colors: ['#005B5B', '#13C2C2', '#36CFC9', '#87E8DE'] },
  'sunset':        { name: '日落',   colors: ['#A8071A', '#F5222D', '#FF7A45', '#FFBB96'] },
};

interface Props {
  value?: string;
  onChange?: (value: string) => void;
}

export default function ColorSchemePicker({ value = 'default-blue', onChange }: Props) {
  return (
    <Select
      value={value}
      onChange={onChange}
      style={{ width: 200 }}
      options={Object.entries(COLOR_SCHEMES).map(([key, scheme]) => ({
        value: key,
        label: (
          <Space>
            {scheme.colors.map((c, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  backgroundColor: c,
                  border: '1px solid rgba(0,0,0,0.1)',
                }}
              />
            ))}
            <span>{scheme.name}</span>
          </Space>
        ),
      }))}
    />
  );
}
