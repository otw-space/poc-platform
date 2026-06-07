import { useState } from 'react';
import { Input, Select, Button, Space, Tag, Modal, Radio } from 'antd';
import { SearchOutlined, FilterOutlined, SortAscendingOutlined, GroupOutlined, PlusOutlined, CloseOutlined } from '@ant-design/icons';
import { useTheme } from '../../context/ThemeContext';
import type { PocOption } from '../../api/options';

export interface ToolbarState {
  searchField: string;
  search: string;
  filters: { field: string; op: string; value: string }[];
  filterMode: 'and' | 'or';
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  groupBy: string[];
}

interface Props {
  value: ToolbarState;
  onChange: (v: Partial<ToolbarState>) => void;
  statusOptions: PocOption[];
  typeOptions: PocOption[];
  showGroup?: boolean;
  locked?: boolean;
}

const SEARCH_FIELDS = [
  { label: '项目名称', value: 'name' },
  { label: '区域', value: 'region' },
  { label: '城市', value: 'city' },
  { label: '销售', value: 'sales' },
  { label: '项目经理', value: 'pm' },
];

const FILTER_FIELDS = [
  { label: '区域', value: 'region' },
  { label: '城市', value: 'city' },
  { label: '状态', value: 'status_id' },
  { label: 'PoC类型', value: 'poc_type_id' },
  { label: '实施方式', value: 'impl_method_id' },
  { label: '销售', value: 'sales' },
  { label: '项目经理', value: 'pm' },
];

const SORT_FIELDS = [
  { label: '项目名称', value: 'name' },
  { label: '开始日期', value: 'start_date' },
  { label: '完成日期', value: 'end_date' },
  { label: '创建时间', value: 'created_at' },
  { label: '状态', value: 'status_id' },
  { label: '区域', value: 'region' },
];

const GROUP_FIELDS = [
  { label: '状态', value: 'status_id' },
  { label: 'PoC类型', value: 'poc_type_id' },
  { label: '实施方式', value: 'impl_method_id' },
  { label: '区域', value: 'region' },
  { label: '城市', value: 'city' },
  { label: '销售', value: 'sales' },
  { label: '项目经理', value: 'pm' },
];

export default function ProjectToolbar({ value, onChange, statusOptions, typeOptions, showGroup = true, locked }: Props) {
  const { token } = useTheme();
  const [filterOpen, setFilterOpen] = useState(false);

  const addFilter = () => {
    onChange({ filters: [...value.filters, { field: 'region', op: 'eq', value: '' }] });
  };
  const removeFilter = (i: number) => {
    onChange({ filters: value.filters.filter((_, idx) => idx !== i) });
  };
  const updateFilter = (i: number, u: Partial<typeof value.filters[0]>) => {
    onChange({ filters: value.filters.map((f, idx) => idx === i ? { ...f, ...u } : f) });
  };

  const getFieldVals = (field: string) => {
    if (field === 'status_id') return statusOptions.map(o => ({ label: o.label, value: String(o.id) }));
    if (field === 'poc_type_id') return typeOptions.map(o => ({ label: o.label, value: String(o.id) }));
    return [];
  };

  return (
    <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {/* Search */}
      <Space.Compact>
        <Select size="small" value={value.searchField || 'name'} style={{ width: 110 }}
          onChange={v => onChange({ searchField: v })}
          options={SEARCH_FIELDS} />
        <Input size="small" placeholder="搜索..."
          prefix={<SearchOutlined />} value={value.search}
          onChange={e => onChange({ search: e.target.value })}
          style={{ width: 160 }} allowClear />
      </Space.Compact>

      {/* Sort */}
      <Select size="small" placeholder="排序" allowClear style={{ width: 130 }} disabled={locked}
        value={value.sortBy ? `${value.sortBy}-${value.sortOrder}` : undefined}
        onChange={v => {
          if (!v) { onChange({ sortBy: '', sortOrder: 'desc' }); return; }
          const [s, o] = (v as string).split('-');
          onChange({ sortBy: s, sortOrder: o as 'asc' | 'desc' });
        }}
        options={SORT_FIELDS.flatMap(f => [
          { label: `${f.label} ↑`, value: `${f.value}-asc` },
          { label: `${f.label} ↓`, value: `${f.value}-desc` },
        ])} />

      {/* Group (multi-select) */}
      {showGroup && (
        <Select size="small" mode="multiple" placeholder="分组" allowClear style={{ minWidth: 120, maxWidth: 240 }} disabled={locked}
          value={value.groupBy} onChange={v => onChange({ groupBy: v })}
          options={GROUP_FIELDS}
          maxTagCount={2} />
      )}

      {/* Filter button + modal */}
      <Button size="small" icon={<FilterOutlined />}
        type={value.filters.length > 0 ? 'primary' : 'default'}
        disabled={locked}
        onClick={() => setFilterOpen(true)}>
        筛选{value.filters.length > 0 ? ` (${value.filters.length})` : ''}
      </Button>
      <Modal title="筛选条件" open={filterOpen} onCancel={() => setFilterOpen(false)}
        onOk={() => setFilterOpen(false)} width={640} destroyOnClose>
        {value.filters.length === 0 && <div style={{ color: token.colorTextTertiary, textAlign: 'center', padding: 20 }}>暂无筛选条件，点击下方按钮添加</div>}
        {value.filters.map((f, i) => {
          const vals = getFieldVals(f.field);
          const hasVals = vals.length > 0;
          return (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <Select size="small" value={f.field} style={{ width: 110 }}
                onChange={v => updateFilter(i, { field: v, value: '' })}
                options={FILTER_FIELDS} />
              <Select size="small" value={f.op} style={{ width: 90 }}
                onChange={v => updateFilter(i, { op: v })}
                options={[
                  { label: '等于', value: 'eq' },
                  { label: '不等于', value: 'neq' },
                  { label: '包含', value: 'like' },
                ]} />
              {hasVals ? (
                <Select size="small" value={f.value || undefined} style={{ flex: 1 }}
                  onChange={v => updateFilter(i, { value: v || '' })}
                  options={vals} placeholder="选择值" allowClear />
              ) : (
                <Input size="small" value={f.value} style={{ flex: 1 }}
                  onChange={e => updateFilter(i, { value: e.target.value })}
                  placeholder="输入值" />
              )}
              <Button size="small" type="text" danger icon={<CloseOutlined />} onClick={() => removeFilter(i)} />
            </div>
          );
        })}
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button size="small" icon={<PlusOutlined />} onClick={addFilter}>添加条件</Button>
          {value.filters.length > 1 && (
            <Radio.Group value={value.filterMode} size="small"
              onChange={e => onChange({ filterMode: e.target.value })}>
              <Radio.Button value="and">全部满足</Radio.Button>
              <Radio.Button value="or">任一满足</Radio.Button>
            </Radio.Group>
          )}
        </div>
      </Modal>

      {/* Active filter tags */}
      {value.filters.filter(f => f.value).map((f, i) => {
        const fieldLabel = FILTER_FIELDS.find(ff => ff.value === f.field)?.label || f.field;
        const vals = getFieldVals(f.field);
        const valLabel = vals.find(v => v.value === f.value)?.label || f.value;
        return (
          <Tag key={i} closable onClose={() => removeFilter(i)} style={{ margin: 0 }}>
            {fieldLabel}: {valLabel}
          </Tag>
        );
      })}
    </div>
  );
}
