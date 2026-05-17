export const CHART_TYPES = [
  { label: '柱状图', value: 'column' },
  { label: '条形图', value: 'bar' },
  { label: '饼图', value: 'pie' },
  { label: '折线图', value: 'line' },
  { label: '组合图', value: 'dual-axes' },
  { label: '统计卡', value: 'stat' },
];

export const DIMENSION_FIELDS = [
  { label: '区域', value: 'region' },
  { label: '城市', value: 'city' },
  { label: '销售', value: 'sales' },
  { label: '项目经理', value: 'pm' },
  { label: 'PoC类型', value: 'poc_type' },
  { label: '实施方式', value: 'impl_method' },
  { label: '状态', value: 'status' },
];

export const METRIC_FIELDS = [
  { label: '项目数量', value: 'count' },
  { label: '平均工期', value: 'avg_duration' },
];

export const FILTER_FIELDS = [
  ...DIMENSION_FIELDS,
  { label: '开始日期', value: 'start_date' },
  { label: '完成日期', value: 'end_date' },
];

export const TEXT_OPERATORS = [
  { label: '等于', value: 'eq' },
  { label: '不等于', value: 'neq' },
  { label: '包含', value: 'like' },
];

export const OPTION_OPERATORS = [
  { label: '等于', value: 'eq' },
  { label: '不等于', value: 'neq' },
  { label: '包含于', value: 'in' },
];

export const DATE_OPERATORS = [
  { label: '等于', value: 'eq' },
  { label: '大于等于', value: 'gte' },
  { label: '小于等于', value: 'lte' },
];

export const OPTION_FIELDS = ['poc_type', 'impl_method', 'status'];
export const DATE_FIELDS = ['start_date', 'end_date'];
