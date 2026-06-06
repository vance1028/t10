import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Modal, Statistic, Row, Col } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { fundApi } from '../../services/api';
import { FundPool, FundFlow } from '../../types';
import dayjs from 'dayjs';

const FundPools: React.FC = () => {
  const [pools, setPools] = useState<FundPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [flows, setFlows] = useState<FundFlow[]>([]);
  const [flowsModalVisible, setFlowsModalVisible] = useState(false);
  const [selectedPool, setSelectedPool] = useState<FundPool | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res: any = await fundApi.getPools();
      setPools(res);
    } finally {
      setLoading(false);
    }
  };

  const loadFlows = async (poolId: number) => {
    try {
      const res: any = await fundApi.getPoolFlows(poolId);
      setFlows(res);
    } catch (error) {
      console.error(error);
    }
  };

  const showFlows = (pool: FundPool) => {
    setSelectedPool(pool);
    loadFlows(pool.id);
    setFlowsModalVisible(true);
  };

  const columns = [
    {
      title: '资金池名称',
      dataIndex: 'name',
      render: (v: string, record: FundPool) => (
        <span>
          {v}
          {record.pool_type === 'general' && <Tag color="blue" style={{ marginLeft: 8 }}>总池</Tag>}
          {record.pool_type === 'project' && <Tag color="purple" style={{ marginLeft: 8 }}>项目池</Tag>}
        </span>
      )
    },
    {
      title: '关联项目',
      dataIndex: 'project_name',
      render: (v: string) => v || '-'
    },
    {
      title: '当前余额',
      dataIndex: 'balance',
      render: (v: number) => <span style={{ fontWeight: 'bold', color: '#3f8600' }}>¥{v.toFixed(2)}</span>,
      sorter: (a: FundPool, b: FundPool) => a.balance - b.balance
    },
    {
      title: '累计收入',
      dataIndex: 'total_in',
      render: (v: number) => <span style={{ color: '#3f8600' }}>+¥{v.toFixed(2)}</span>
    },
    {
      title: '累计支出',
      dataIndex: 'total_out',
      render: (v: number) => <span style={{ color: '#cf1322' }}>-¥{v.toFixed(2)}</span>
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: FundPool) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => showFlows(record)}>
          查看流水
        </Button>
      )
    }
  ];

  const flowColumns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '类型',
      dataIndex: 'flow_type',
      render: (v: string) => {
        const map: Record<string, string> = {
          'donation_in': '捐赠入账',
          'allocation_in': '拨款入账',
          'allocation_out': '拨出',
          'expenditure': '支出'
        };
        return map[v] || v;
      }
    },
    {
      title: '变动',
      dataIndex: 'amount',
      render: (v: number, record: FundFlow) => (
        <span style={{ color: record.direction === 'in' ? '#3f8600' : '#cf1322' }}>
          {record.direction === 'in' ? '+' : '-'}¥{v.toFixed(2)}
        </span>
      )
    },
    {
      title: '变动后余额',
      dataIndex: 'balance_after',
      render: (v: number) => `¥${v.toFixed(2)}`
    },
    {
      title: '备注',
      dataIndex: 'remark'
    }
  ];

  const totalBalance = pools.reduce((sum, p) => sum + p.balance, 0);

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="资金池总余额"
              value={totalBalance}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="资金池数量"
              value={pools.length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="资金池列表">
        <Table
          columns={columns}
          dataSource={pools}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={`${selectedPool?.name} - 资金流水`}
        open={flowsModalVisible}
        onCancel={() => setFlowsModalVisible(false)}
        footer={null}
        width={800}
      >
        <Table
          columns={flowColumns}
          dataSource={flows}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
        />
      </Modal>
    </div>
  );
};

export default FundPools;
