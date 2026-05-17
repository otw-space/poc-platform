import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Tag, Popconfirm, message, Button, Space, Empty, Select, Modal } from 'antd';
import { UndoOutlined, DeleteOutlined, ClearOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getRecycleBin, restoreItem, permanentDeleteItem, type RecycleBinItem } from '../api/recycle-bin';

const TYPE_LABELS: Record<string, string> = {
  project: '项目', dashboard: '仪表盘', log: '日志', option: '选项', chart: '图表',
  sop_sop: 'PoC实施SOP', sop_plan: 'PoC实施方案', sop_report: 'PoC汇报报告',
  test_case: '测试用例', script: '脚本', sop_category: '客户端',
};

const TYPE_COLORS: Record<string, string> = {
  project: 'blue', dashboard: 'purple', log: 'cyan', option: 'orange', chart: 'geekblue',
  sop_sop: 'green', sop_plan: 'cyan', sop_report: 'blue',
  test_case: 'lime', script: 'gold', sop_category: 'volcano',
};

export default function RecycleBin() {
  const [items, setItems] = useState<RecycleBinItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  const fetch = useCallback(() => {
    setLoading(true);
    getRecycleBin().then(r => setItems(r.data.items)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const typeOptions = React.useMemo(() => {
    const seen = new Set<string>();
    const opts: { label: string; value: string }[] = [];
    for (const item of items) {
      if (!seen.has(item.type)) { seen.add(item.type); opts.push({ label: TYPE_LABELS[item.type] || item.type, value: item.type }); }
    }
    return opts;
  }, [items]);

  const filteredItems = activeTab === 'all' ? items : items.filter(i => i.type === activeTab);

  const handleRestore = async (type: string, id: string) => {
    await restoreItem(type, id); message.success('已恢复'); fetch();
  };

  const handlePermanentDelete = async (type: string, id: string) => {
    await permanentDeleteItem(type, id); message.success('已永久删除'); fetch();
  };

  const handleBatchRestore = async () => {
    setBatchLoading(true);
    const selected = filteredItems.filter(i => selectedKeys.includes(`${i.type}-${i.id}`));
    for (const item of selected) {
      await restoreItem(item.type, item.id).catch(() => {});
    }
    message.success(`已恢复 ${selected.length} 项`);
    setSelectedKeys([]);
    setBatchLoading(false);
    fetch();
  };

  const handleBatchDelete = () => {
    Modal.confirm({
      title: '批量永久删除',
      content: `确认永久删除选中的 ${selectedKeys.length} 项？此操作不可撤销！`,
      okText: '确认删除',
      okType: 'danger',
      onOk: async () => {
        setBatchLoading(true);
        const selected = filteredItems.filter(i => selectedKeys.includes(`${i.type}-${i.id}`));
        for (const item of selected) {
          await permanentDeleteItem(item.type, item.id).catch(() => {});
        }
        message.success(`已永久删除 ${selected.length} 项`);
        setSelectedKeys([]);
        setBatchLoading(false);
        fetch();
      },
    });
  };

  const handleRestoreAll = () => {
    Modal.confirm({
      title: '全部恢复',
      content: `确认恢复回收站中全部 ${filteredItems.length} 项？`,
      okText: '确认恢复',
      onOk: async () => {
        setBatchLoading(true);
        for (const item of filteredItems) {
          await restoreItem(item.type, item.id).catch(() => {});
        }
        message.success(`已恢复 ${filteredItems.length} 项`);
        setBatchLoading(false);
        fetch();
      },
    });
  };

  const handleClearAll = () => {
    Modal.confirm({
      title: '全部清空',
      content: `确认永久删除回收站中全部 ${filteredItems.length} 项？此操作不可撤销！`,
      okText: '确认清空',
      okType: 'danger',
      onOk: async () => {
        setBatchLoading(true);
        for (const item of filteredItems) {
          await permanentDeleteItem(item.type, item.id).catch(() => {});
        }
        message.success('回收站已清空');
        setBatchLoading(false);
        fetch();
      },
    });
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '类型', dataIndex: 'type', key: 'type', width: 120,
      render: (v: string) => <Tag color={TYPE_COLORS[v] || 'default'}>{TYPE_LABELS[v] || v}</Tag> },
    { title: '删除时间', dataIndex: 'deleted_at', key: 'deleted_at', width: 180,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss') },
    { title: '删除人员', dataIndex: 'deleted_by', key: 'deleted_by', width: 120 },
    { title: '操作', key: 'actions', width: 200,
      render: (_: any, record: RecycleBinItem) => (
        <Space>
          <Popconfirm title="确认恢复？" onConfirm={() => handleRestore(record.type, record.id)}>
            <Button type="link" icon={<UndoOutlined />}>恢复</Button>
          </Popconfirm>
          <Popconfirm title="确认永久删除？此操作不可撤销！" onConfirm={() => handlePermanentDelete(record.type, record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>永久删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card title="回收站">
      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <Select value={activeTab} onChange={setActiveTab} showSearch style={{ width: 220 }}
          placeholder="筛选类型..." filterOption={(input, option) => (option?.label as string)?.includes(input)}
          options={[{ label: `全部 (${items.length})`, value: 'all' }, ...typeOptions]} />
        {selectedKeys.length > 0 && (
          <>
            <Button icon={<UndoOutlined />} onClick={handleBatchRestore} loading={batchLoading}>
              批量恢复 ({selectedKeys.length})
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete} loading={batchLoading}>
              批量删除 ({selectedKeys.length})
            </Button>
          </>
        )}
        {filteredItems.length > 0 && (
          <>
            <Popconfirm title={`确认恢复全部 ${filteredItems.length} 项？`} onConfirm={handleRestoreAll}>
              <Button icon={<UndoOutlined />} loading={batchLoading}>全部恢复</Button>
            </Popconfirm>
            <Popconfirm title={`确认永久删除全部 ${filteredItems.length} 项？此操作不可撤销！`} onConfirm={handleClearAll}>
              <Button danger icon={<ClearOutlined />} loading={batchLoading}>全部清空</Button>
            </Popconfirm>
          </>
        )}
      </Space>
      <Table
        rowKey={r => `${r.type}-${r.id}`}
        columns={columns}
        dataSource={filteredItems}
        loading={loading}
        locale={{ emptyText: <Empty description="回收站为空" /> }}
        pagination={false}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: (keys) => setSelectedKeys(keys as string[]),
        }}
      />
    </Card>
  );
}
