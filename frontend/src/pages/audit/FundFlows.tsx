import React, { useEffect, useState } from 'react';
import { Table, Card, Tag, Space, DatePicker, Select, Row, Col, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { auditApi, fundApi, projectApi } from '../../services/api';
import { FundFlow, FundPool, Project } from '../../types';
import dayjs from 'dayjs';

const FundFlows: React.FC = () => {
  const [list, setList] = useState<FundFlow[]>([]);
  const [pools, setPools] = useState<FundPool[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<any>({});

  useEffect(() => {
    loadData();
    loadPools();
    loadProjects();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res: any = await auditApi.getAllFlows(filters);
      setList(res);
    } finally {
      setLoading(false);
    }
  };

  const loadPools = async () => {
    const res: any = await fundApi.getPools();
    setPools(res);
  };

  const loadProjects = async () => {
    const res: any = await projectApi.getList();
    setProjects(res);
  };

  const handleExport = () => {
    alert('请在项目详情页导出项目财务报告');
  };

  const flowTypeMap: Record<string, { text: string; color: string }> = {
    'donation_in': { text: '捐赠入账', color: 'green' },
    'allocation_in': { text: '拨款入账', color: 'blue' },
    'allocation_out': { text: '拨出', color: 'orange' },
    'expenditure': { text: '支出', color: 'red' }
  };

  const columns = [
    {
      title: '流水编号',
      dataIndex: 'id',
      width: 80
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss'),
      width: 170
    },
    {
      title: '类型',
      dataIndex: 'flow_type',
      render: (v: string) => (
        <Tag color={flowTypeMap[v]?.color}>{flowTypeMap[v]?.text}</Tag>
      ),
      width: 100
    },
    {
      title: '资金池',
      dataIndex: 'pool_name',
      width: 180
    },
    {
      title: '关联项目',
      dataIndex: 'project_name',
      render: (v: string) => v || '-'
    },
    {
      title: '变动金额',
      dataIndex: 'amount',
      render: (v: number, record: FundFlow) => (
        <span style={{
          color: record.direction === 'in' ? '#3f8600' : '#cf1322',
          fontWeight: 'bold'
        }}>
          {record.direction === 'in' ? '+' : '-'}¥{v.toFixed(2)}
        </span>
      ),
      width: 120
    },
    {
      title: '变动后余额',
      dataIndex: 'balance_after',
      render: (v: number) => `¥${v.toFixed(2)}`,
      width: 120
    },
    {
      title: '备注',
      dataIndex: 'remark'
    }
  ];

  const totalIn = list.filter(f => f.direction === 'in').reduce((sum, f) => sum + f.amount, 0);
  const totalOut = list.filter(f => f.direction === 'out').reduce((sum, f) => sum + f.amount, 0);

  return (
    <div>
      <Card title="流水审计" extra={
        <Button icon={<DownloadOutlined />} onClick={handleExport}>
          导出报告
        </Button>
      }>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col>
            <Space>
              <DatePicker.RangePicker
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setFilters({
                      ...filters,
                      startDate: dates[0].format('YYYY-MM-DD'),
                      endDate: dates[1].format('YYYY-MM-DD')
                    });
                  } else {
                    const { startDate, endDate, ...rest } = filters;
                    setFilters(rest);
                  }
                }}
              />
              <Select
                placeholder="资金池"
                style={{ width: 180 }}
                allowClear
                onChange={(v) => setFilters({ ...filters, poolId: v })}
              >
                {pools.map(p => (
                  <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                ))}
              </Select>
              <Select
                placeholder="流向类型"
                style={{ width: 140 }}
                allowClear
                onChange={(v) => setFilters({ ...filters, flowType: v })}
              >
                <Select.Option value="donation_in">捐赠入账</Select.Option>
                <Select.Option value="allocation_in">拨款入账</Select.Option>
                <Select.Option value="allocation_out">拨出</Select.Option>
                <Select.Option value="expenditure">支出</Select.Option>
              </Select>
              <Select
                placeholder="方向"
                style={{ width: 120 }}
                allowClear
                onChange={(v) => setFilters({ ...filters, direction: v })}
              >
                <Select.Option value="in">流入</Select.Option>
                <Select.Option value="out">流出</Select.Option>
              </Select>
            </Space>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card size="small">
              <span style={{ color: '#999' }}>本次筛选流入：</span>
              <span style={{ color: '#3f8600', fontWeight: 'bold', fontSize: 16 }}>+¥{totalIn.toFixed(2)}</span>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <span style={{ color: '#999' }}>本次筛选流出：</span>
              <span style={{ color: '#cf1322', fontWeight: 'bold', fontSize: 16 }}>-¥{totalOut.toFixed(2)}</span>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <span style={{ color: '#999' }}>净变动：</span>
              <span style={{
                color: totalIn - totalOut >= 0 ? '#3f8600' : '#cf1322',
                fontWeight: 'bold',
                fontSize: 16
              }}>
                {totalIn - totalOut >= 0 ? '+' : ''}¥{(totalIn - totalOut).toFixed(2)}
              </span>
            </Card>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={list}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  );
};

export default FundFlows;
