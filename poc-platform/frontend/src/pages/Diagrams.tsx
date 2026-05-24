import { useCallback, useEffect, useState, useRef } from 'react';
import { Card, Button, Space, Input, Table, Popconfirm, message, Select, Modal } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined, SaveOutlined } from '@ant-design/icons';
import { listDiagrams, createDiagram, updateDiagram, deleteDiagram, getDiagram, type Diagram } from '../api/diagrams';
import dayjs from 'dayjs';

type Shape = 'rect' | 'circle' | 'diamond' | 'text';

interface ShapeItem {
  id: string;
  type: Shape;
  x: number; y: number; w: number; h: number;
  text: string;
}

interface LineItem {
  id: string;
  from: string; to: string;
}

interface DiagramData { shapes: ShapeItem[]; lines: LineItem[]; }

const SHAPE_SIZES: Record<Shape, { w: number; h: number }> = {
  rect: { w: 120, h: 60 },
  circle: { w: 80, h: 80 },
  diamond: { w: 100, h: 70 },
  text: { w: 140, h: 40 },
};

const SHAPE_COLORS: Record<Shape, string> = {
  rect: '#e6f4ff', circle: '#f6ffed', diamond: '#fff7e6', text: '#f9f0ff',
};

const SHAPE_BORDERS: Record<Shape, string> = {
  rect: '#1677ff', circle: '#52c41a', diamond: '#fa8c16', text: '#722ed1',
};

export default function Diagrams() {
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [shapes, setShapes] = useState<ShapeItem[]>([]);
  const [lines, setLines] = useState<LineItem[]>([]);
  const [selShape, setSelShape] = useState<Shape>('rect');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOff, setDragOff] = useState({ x: 0, y: 0 });
  const [lineFrom, setLineFrom] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    listDiagrams().then(r => setDiagrams(r.data)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { fetch(); }, [fetch]);

  const handleNew = async () => {
    const name = newName.trim() || `未命名_${dayjs().format('MMDD_HHmm')}`;
    try {
      const r = await createDiagram({ name, data: '{"shapes":[],"lines":[]}' });
      setEditingId(r.data.id); setEditingName(r.data.name); setNewName('');
      setShapes([]); setLines([]); message.success('已创建'); fetch();
    } catch { message.error('创建失败'); }
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await updateDiagram(editingId, { name: editingName, data: JSON.stringify({ shapes, lines }) });
      message.success('已保存'); fetch();
    } catch { message.error('保存失败'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (d: Diagram) => {
    try {
      const r = await getDiagram(d.id);
      const parsed: DiagramData = JSON.parse(r.data.data || '{}');
      setShapes(parsed.shapes || []); setLines(parsed.lines || []);
    } catch { setShapes([]); setLines([]); }
    setEditingId(d.id); setEditingName(d.name);
  };

  const handleDelete = async (id: string) => {
    try { await deleteDiagram(id); if (editingId === id) { setEditingId(null); } message.success('已删除'); fetch(); }
    catch { message.error('删除失败'); }
  };

  // Canvas click — add shape or create line
  const handleSvgClick = (e: React.MouseEvent) => {
    if (e.target !== svgRef.current) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left - SHAPE_SIZES[selShape].w / 2;
    const y = e.clientY - rect.top - SHAPE_SIZES[selShape].h / 2;
    const id = `${Date.now()}`;
    const sizes = SHAPE_SIZES[selShape];
    setShapes(s => [...s, { id, type: selShape, x, y, w: sizes.w, h: sizes.h, text: selShape === 'text' ? '文本' : '新节点' }]);
  };

  // Drag shape
  const handleShapeMouseDown = (e: React.MouseEvent, id: string) => {
    if (lineFrom) return;
    e.stopPropagation();
    const shape = shapes.find(s => s.id === id);
    if (!shape) return;
    setDragId(id);
    setDragOff({ x: e.clientX - shape.x, y: e.clientY - shape.y });
  };

  const handleSvgMouseMove = (e: React.MouseEvent) => {
    if (!dragId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setShapes(s => s.map(sh => sh.id === dragId ? { ...sh, x: e.clientX - rect.left - dragOff.x, y: e.clientY - rect.top - dragOff.y } : sh));
  };

  const handleSvgMouseUp = () => { setDragId(null); };

  // Connect two shapes with a line
  const handleShapeClick = (id: string) => {
    if (!lineFrom) { setLineFrom(id); return; }
    if (lineFrom === id) { setLineFrom(null); return; }
    if (!lines.some(l => (l.from === lineFrom && l.to === id) || (l.from === id && l.to === lineFrom))) {
      setLines(l => [...l, { id: `l${Date.now()}`, from: lineFrom, to: id }]);
    }
    setLineFrom(null);
  };

  // Double-click shape to edit text
  const handleDblClick = (id: string) => { setEditingText(id); };

  // Delete selected
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (editingText) return;
      setShapes(s => s.filter(sh => sh.id !== dragId));
      setLines(l => l.filter(li => !(li.from === dragId || li.to === dragId)));
    }
  };

  // Line endpoint calculation
  const getConnectPoint = (shape: ShapeItem, targetShape: ShapeItem) => {
    const cx1 = shape.x + shape.w / 2, cy1 = shape.y + shape.h / 2;
    const cx2 = targetShape.x + targetShape.w / 2, cy2 = targetShape.y + targetShape.h / 2;
    const dx = cx2 - cx1, dy = cy2 - cy1;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / dist, ny = dy / dist;
    const hw = shape.w / 2, hh = shape.h / 2;
    const tx = Math.abs(nx) < 0.001 ? 0 : (nx > 0 ? hw : -hw);
    const ty = Math.abs(ny) < 0.001 ? 0 : (ny > 0 ? hh : -hh);
    if (Math.abs(nx) > Math.abs(ny)) {
      const scale = tx / nx;
      return { x: cx1 + nx * (Math.abs(scale) < Math.abs(hw / (Math.abs(nx) || 0.001)) ? Math.abs(hw) : Math.abs(hw)), y: cy1 + ny * Math.abs(hw / (Math.abs(nx) || 0.001)) };
    }
    return { x: cx1 + nx * Math.abs(hh / (Math.abs(ny) || 0.001)), y: cy1 + ny * Math.abs(hh / (Math.abs(ny) || 0.001)) };
  };

  const renderLine = (line: LineItem) => {
    const from = shapes.find(s => s.id === line.from);
    const to = shapes.find(s => s.id === line.to);
    if (!from || !to) return null;
    const p1 = getConnectPoint(from, to);
    const p2 = getConnectPoint(to, from);
    return <line key={line.id} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#999" strokeWidth={2} markerEnd="url(#arrow)" />;
  };

  const renderShape = (s: ShapeItem) => {
    const isDrag = dragId === s.id;
    const opacity = isDrag ? 0.7 : 1;
    const common = {
      stroke: lineFrom === s.id ? '#ff4d4f' : SHAPE_BORDERS[s.type],
      strokeWidth: lineFrom === s.id ? 3 : 2,
      fill: SHAPE_COLORS[s.type],
      opacity,
      cursor: 'pointer',
    };
    const onMouseDown = (e: React.MouseEvent) => { handleShapeMouseDown(e, s.id); };
    const onClick = (e: React.MouseEvent) => { e.stopPropagation(); handleShapeClick(s.id); };
    const onDbClick = (e: React.MouseEvent) => { e.stopPropagation(); handleDblClick(s.id); };

    let shapeEl;
    switch (s.type) {
      case 'circle': shapeEl = <ellipse cx={s.x + s.w/2} cy={s.y + s.h/2} rx={s.w/2} ry={s.h/2} {...common} onMouseDown={onMouseDown} onClick={onClick} onDoubleClick={onDbClick} />; break;
      case 'diamond': {
        const cx = s.x + s.w/2, cy = s.y + s.h/2, hw = s.w/2, hh = s.h/2;
        const pts = `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`;
        shapeEl = <polygon points={pts} {...common} onMouseDown={onMouseDown} onClick={onClick} onDoubleClick={onDbClick} />; break;
      }
      default: shapeEl = <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.type === 'text' ? 4 : 6} {...common} onMouseDown={onMouseDown} onClick={onClick} onDoubleClick={onDbClick} />;
    }

    const textX = s.x + s.w / 2;
    const textY = s.y + s.h / 2;
    return (
      <g key={s.id}>
        {shapeEl}
        {editingText === s.id ? (
          <foreignObject x={s.x} y={s.y} width={s.w} height={s.h}>
            <input autoFocus defaultValue={s.text} style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontSize: 13, outline: 'none' }}
              onBlur={e => { setShapes(ss => ss.map(sh => sh.id === s.id ? { ...sh, text: e.target.value || sh.text } : sh)); setEditingText(null); }}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              onClick={e => e.stopPropagation()} />
          </foreignObject>
        ) : (
          <text x={textX} y={textY} textAnchor="middle" dominantBaseline="central" fontSize={13} fill="#333" style={{ pointerEvents: 'none', userSelect: 'none' }}>{s.text}</text>
        )}
      </g>
    );
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true,
      render: (v: string, r: Diagram) => <a onClick={() => handleEdit(r)}>{v}</a> },
    { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 140,
      render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
    { title: '操作', key: 'actions', width: 100,
      render: (_: any, r: Diagram) => (
        <Space>
          <a onClick={() => handleEdit(r)}><EditOutlined /></a>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)}>
            <a style={{ color: '#ff4d4f' }}><DeleteOutlined /></a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={<span><PictureOutlined style={{ marginRight: 8 }} />绘图工具</span>}
        extra={
          <Space>
            <Input size="small" placeholder="名称" value={newName} onChange={e => setNewName(e.target.value)}
              onPressEnter={handleNew} style={{ width: 140 }} />
            <Button icon={<PlusOutlined />} onClick={handleNew}>新建</Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Table rowKey="id" columns={columns} dataSource={diagrams} loading={loading}
          pagination={false} size="small" />
      </Card>

      {editingId && (
        <Card
          title={<Input value={editingName} onChange={e => setEditingName(e.target.value)} style={{ width: 240 }} bordered={false} onPressEnter={handleSave} />}
          extra={
            <Space>
              <Select size="small" value={selShape} onChange={setSelShape} style={{ width: 100 }}
                options={[{label:'矩形',value:'rect'},{label:'圆形',value:'circle'},{label:'菱形',value:'diamond'},{label:'文本',value:'text'}]} />
              <span style={{ fontSize: 12, color: '#999' }}>{lineFrom ? '点击目标节点连线' : '点击节点间连线'}</span>
              <Button size="small" onClick={() => setLineFrom(null)} disabled={!lineFrom}>取消连线</Button>
              <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>保存</Button>
              <Button onClick={() => { setEditingId(null); setShapes([]); setLines([]); }}>关闭</Button>
            </Space>
          }
          styles={{ body: { padding: 0 } }}
        >
          <svg
            ref={svgRef}
            style={{ width: '100%', height: 'calc(100vh - 260px)', minHeight: 500, background: '#fcfcfc', cursor: 'crosshair' }}
            onClick={handleSvgClick}
            onMouseMove={handleSvgMouseMove}
            onMouseUp={handleSvgMouseUp}
            onKeyDown={handleKeyDown}
            tabIndex={0}
          >
            <defs><marker id="arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#999" /></marker></defs>
            {shapes.map(renderShape)}
            {lines.map(renderLine)}
          </svg>
        </Card>
      )}
    </div>
  );
}
