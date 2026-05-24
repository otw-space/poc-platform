import { useState } from 'react';
import { Input, Select, Button, Space, Dropdown, Tag } from 'antd';
import { SearchOutlined, FilterOutlined, SortAscendingOutlined, GroupOutlined, PlusOutlined, CloseOutlined } from '@ant-design/icons';
import type { PocOption } from '../../api/projects';

export interface ToolbarState {
  search: string;
  filters: { field: string; op: string; value: string }[];
  filterMode: 'and' | 'or';
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  groupBy: string;
}

interface Props {
  value: ToolbarState;
  onChange: (v: Partial<ToolbarState>) => void;
  statusOptions: PocOption[];
  typeOptions: PocOption[];
  showGroup?: boolean;
}

const FILTER_FIELDS = [
  { label: '区域', value: 'region' },
  { label: '城市', value: 'city' },
  { label: '状态', value: 'status_id' },
  { label: 'PoC类型', value: 'poc_type_id' },
  { label: '销售', value: 'sales' },
  { label: '项目经理', value: 'pm' },
];

const SORT_FIELDS = [
  { label: '项目名称', value: 'name' },
  { label: '开始日期', value: 'start_date' },
  { label: '完成日期', value: 'end_date' },
  { label: '创建时间', value: 'created_at' },
  { label: '状态', value: 'status_id' },
];

const GROUP_FIELDS = [
  { label: '状态', value: 'status_id' },
  { label: 'PoC类型', value: 'poc_type_id' },
  { label: '区域', value: 'region' },
  { label: '实施方式', value: 'impl_method_id' },
  { label: '销售', value: 'sales' },
  { label: '项目经理', value: 'pm' },
];

export default function ProjectToolbar({ value, onChange, statusOptions, typeOptions, showGroup = true }: Props) {
  const [addingFilter, setAddingFilter] = useState(false);

  const addFilter = () => {
    onChange({ filters: [...value.filters, { field: 'region', op: 'eq', value: '' }] });
  };
  const removeFilter = (index: number) => {
    onChange({ filters: value.filters.filter((_, i) => i !== index) });
  };
  const updateFilter = (index: number, updates: Partial<typeof value.filters[0]>) => {
    onChange({ filters: value.filters.map((f, i) => i === index ? { ...f, ...updates } : f) });
  };

  const getFilterValues = (field: string) => {
    if (field === 'status_id') return statusOptions.map(o => ({ label: o.label, value: String(o.id) }));
    if (field === 'poc_type_id') return typeOptions.map(o => ({ label: o.label, value: String(o.id) }));
    return [];
  };

  return (
    <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <Input
        size="small"
        placeholder="搜索项目..."
        prefix={<SearchOutlined />}
        value={value.search}
        onChange={e => onChange({ search: e.target.value })}
        style={{ width: 200 }}
        allowClear
      />
      <Select
        size="small"
        placeholder="排序"
        allowClear
        value={value.sortBy ? `${value.sortBy}-${value.sortOrder}` : undefined}
        onChange={v => {
          if (!v) { onChange({ sortBy: '', sortOrder: 'desc' }); return; }
          const [sortBy, sortOrder] = (v as string).split('-');
          onChange({ sortBy, sortOrder: sortOrder as 'asc' | 'desc' });
        }}
        options={SORT_FIELDS.flatMap(f => [
          { label: `${f.label} ↑`, value: `${f.value}-asc` },
          { label: `${f.label} ↓`, value: `${f.value}-desc` },
        ])}
        style={{ width: 130 }}
      />
      {showGroup && (
        <Select
          size="small"
          placeholder="分组"
          allowClear
          value={value.groupBy || undefined}
          onChange={v => onChange({ groupBy: v || '' })}
          options={GROUP_FIELDS}
          style={{ width: 110 }}
        />
      )}
      <Popconfirm
        title="添加筛选条件"
        description={
          <Select size="small" style={{ width: 120 }} placeholder="选择字段"
            onChange={v => { if (v) { addFilter(); setAddingFilter(false); } }}
            options={FILTER_FIELDS} />
        }
        open={addingFilter}
        onOpenChange={setAddingFilter}
        onConfirm={() => setAddingFilter(false)}
      >
        <Button size="small" icon={<FilterOutlined />}>筛选</Button>
      </Popconfirm>
      {value.filters.length > 0 && (
        <Select size="small" value={value.filterMode}
          onChange={v => onChange({ filterMode: v })}
          options={[{ label: '全部满足', value: 'and' }, { label: '任一满足', value: 'or' }]}
          style={{ width: 100 }} />
      )}

      {value.filters.filter(f => f.value).length > 0 && (
        <Space size={4} wrap>
          {value.filters.filter(f => f.value).map((f, i) => {
            const label = FILTER_FIELDS.find(ff => ff.value === f.field)?.label || f.field;
            const vals = getFilterValues(f.field);
            const valLabel = vals.find(v => v.value === f.value)?.label || f.value;
            return (
              <Tag key={i} closable onClose={() => removeFilter(i)}>
                {label}: {valLabel}
              </Tag>
            );
          })}
        </Space>
      )}
    </div>
  );
}
