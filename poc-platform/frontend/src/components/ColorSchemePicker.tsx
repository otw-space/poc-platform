import { Select, Space } from 'antd';

export const COLOR_SCHEMES: Record<string, { name: string; colors: string[] }> = {
  'default-blue':  { name: '默认蓝', colors: ['#1677FF', '#69B1FF', '#4096FF', '#91CAFF'] },
  'tech-purple':   { name: '科技紫', colors: ['#722ED1', '#D3ADF7', '#9254DE', '#EFDBFF'] },
  'fresh-green':   { name: '清新绿', colors: ['#52C41A', '#B7EB8F', '#73D13D', '#D9F7BE'] },
  'warm-orange':   { name: '暖橙',   colors: ['#FA8C16', '#FFD591', '#FFA940', '#FFE7BA'] },
  'dark-theme':    { name: '深色系', colors: ['#141414', '#434343', '#595959', '#8C8C8C'] },
  'macaron':       { name: '马卡龙', colors: ['#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA'] },
  'coast':         { name: '海岸',   colors: ['#13C2C2', '#87E8DE', '#36CFC9', '#B5F5EC'] },
  'sunset':        { name: '日落',   colors: ['#F5222D', '#FA8C16', '#FADB14', '#FF9C6E'] },
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
