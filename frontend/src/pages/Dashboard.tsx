import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, List, Tag, Table } from 'antd';
import {
  HeartOutlined,
  ProjectOutlined,
  DollarOutlined,
  BankOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import { auditApi } from '../services/api';
import { Statistics, FundFlow } from '../types';
import dayjs from 'dayjs';
import { formatMoney, toNumber } from '../utils/format';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res: any = await auditApi.getStatistics();
      setStats(res);
    } finally {
      setLoading(false);
    }
  };

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
      title: '资金池',
      dataIndex: 'pool_name'
    },
    {
      title: '金额',
      dataIndex: 'amount',
      render: (v: number, record: FundFlow) => (
        <span style={{ color: record.direction === 'in' ? '#3f8600' : '#cf1322' }}>
          {record.direction === 'in' ? '+' : '-'}{formatMoney(v)}
        </span>
      )
    },
    {
      title: '余额',
      dataIndex: 'balance_after',
      render: (v: number) => formatMoney(v)
    }
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="累计募款"
              value={stats?.donationStats.total_received || 0}
              precision={2}
              prefix={<HeartOutlined style={{ color: '#cf1322' }} />}
              suffix="元"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="公益项目"
              value={stats?.projectStats.total_projects || 0}
              prefix={<ProjectOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="累计拨付"
              value={stats?.projectStats.total_allocated || 0}
              precision={2}
              prefix={<DollarOutlined style={{ color: '#722ed1' }} />}
              suffix="元"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="资金池总余额"
              value={stats?.poolStats.total_balance || 0}
              precision={2}
              prefix={<BankOutlined style={{ color: '#3f8600' }} />}
              suffix="元"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="待处理" loading={loading}>
            <List
              dataSource={[
                { title: '待确认捐赠', value: stats?.donationStats.total_pending || 0, tag: 'orange' },
                { title: '待审批拨付', value: 1, tag: 'blue' }
              ]}
              renderItem={(item) => (
                <List.Item>
                  <span>{item.title}</span>
                  <Tag color={item.tag as any}>{item.value} 笔</Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="近期资金流水" loading={loading}>
            <Table
              columns={flowColumns}
              dataSource={stats?.recentFlows || []}
              pagination={false}
              size="small"
              rowKey="id"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
