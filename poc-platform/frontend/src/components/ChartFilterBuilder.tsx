import { useEffect, useState } from 'react';
import { Button, DatePicker, Input, Select, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { getOptions, type PocOption } from '../api/options';
import {
  FILTER_FIELDS, TEXT_OPERATORS, OPTION_OPERATORS, DATE_OPERATORS,
  OPTION_FIELDS, DATE_FIELDS,
} from '../constants/chart';
import dayjs from 'dayjs';

export interface FilterItem {
  field: string;
  op: string;
  value: any;
}

interface Props {
  filters: FilterItem[];
  onChange: (filters: FilterItem[]) => void;
}

export default function ChartFilterBuilder({ filters, onChange }: Props) {
  // Cache option labels for poc_type/impl_method/status
  const [optionLabels, setOptionLabels] = useState<Record<string, PocOption[]>>({});

  useEffect(() => {
    ['poc_type', 'impl_method', 'status'].forEach((cat) => {
      getOptions(cat).then((r) => {
        setOptionLabels((prev) => ({ ...prev, [cat]: r.data }));
      });
    });
  }, []);

  const getOperators = (field: string) => {
    if (OPTION_FIELDS.includes(field)) return OPTION_OPERATORS;
    if (DATE_FIELDS.includes(field)) return DATE_OPERATORS;
    return TEXT_OPERATORS;
  };

  const getFieldType = (field: string) => {
    if (OPTION_FIELDS.includes(field)) return 'option';
    if (DATE_FIELDS.includes(field)) return 'date';
    return 'text';
  };

  const addFilter = () => {
    onChange([...filters, { field: 'region', op: 'eq', value: '' }]);
  };

  const removeFilter = (index: number) => {
    onChange(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, updates: Partial<FilterItem>) => {
    onChange(filters.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  const getCatForField = (field: string) => field === 'poc_type' ? 'poc_type' : field === 'impl_method' ? 'impl_method' : 'status';

  return (
    <div style={{ padding: '8px 0' }}>
      {filters.map((f, i) => {
        const fieldType = getFieldType(f.field);
        const operators = getOperators(f.field);
        const cat = getCatForField(f.field);
        const catOptions = optionLabels[cat] || [];

        return (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
            <Select
              size="small"
              value={f.field}
              onChange={(v) => {
                const newOps = getOperators(v);
                updateFilter(i, { field: v, op: newOps[0].value, value: '' });
              }}
              options={FILTER_FIELDS}
              style={{ width: 100, flexShrink: 0 }}
            />
            <Select
              size="small"
              value={f.op}
              onChange={(v) => updateFilter(i, { op: v, value: '' })}
              options={operators}
              style={{ width: 80, flexShrink: 0 }}
            />
            {fieldType === 'option' ? (
              <Select
                size="small"
                mode={f.op === 'in' ? 'multiple' : undefined}
                value={f.op === 'in' ? (Array.isArray(f.value) ? f.value : f.value ? [f.value] : []) : f.value || undefined}
                onChange={(v) => updateFilter(i, { value: v || '' })}
                options={catOptions.map((o) => ({ label: o.label, value: o.label }))}
                style={{ flex: 1 }}
                placeholder="选择值"
                allowClear
              />
            ) : fieldType === 'date' ? (
              <DatePicker
                size="small"
                value={f.value ? dayjs(f.value) : null}
                onChange={(d) => updateFilter(i, { value: d ? d.format('YYYY-MM-DD') : '' })}
                style={{ flex: 1 }}
              />
            ) : (
              <Input
                size="small"
                value={f.value}
                onChange={(e) => updateFilter(i, { value: e.target.value })}
                placeholder="输入值"
                style={{ flex: 1 }}
              />
            )}
            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeFilter(i)} />
          </div>
        );
      })}
      <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addFilter}>
        添加筛选条件
      </Button>
    </div>
  );
}
