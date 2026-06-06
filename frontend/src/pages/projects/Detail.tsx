import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Button, Progress, Statistic, Row, Col, Space, Tag, message, Modal, Form, Input, Select, DatePicker } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import { projectApi, fundApi, auditApi } from '../../services/api';
import { Project, FundAllocation, Expenditure, Beneficiary } from '../../types';
import { isAdmin, isProjectManager, getUser } from '../../utils/auth';
import { formatMoney } from '../../utils/format';
import dayjs from 'dayjs';

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [allocations, setAllocations] = useState<FundAllocation[]>([]);
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [loading, setLoading] = useState(true);
  const [expModalVisible, setExpModalVisible] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [expForm] = Form.useForm();
  const user = getUser();

  useEffect(() => {
    if (id) {
      loadData(parseInt(id));
    }
  }, [id]);

  const loadData = async (projectId: number) => {
    setLoading(true);
    try {
      const [p, a, e, b] = await Promise.all([
        projectApi.getDetail(projectId),
        projectApi.getAllocations(projectId),
        fundApi.getExpenditures({ projectId }),
        fundApi.getBeneficiaries()
      ]);
      setProject(p as unknown as Project);
      setAllocations(a as unknown as FundAllocation[]);
      setExpenditures(e as unknown as Expenditure[]);
      setBeneficiaries(b as unknown as Beneficiary[]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob: any = await auditApi.exportProjectReport(parseInt(id!));
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `project_${id}_report.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  const handleCreateExpenditure = async (values: any) => {
    try {
      const data = {
        ...values,
        project_id: parseInt(id!),
        expenditure_date: values.expenditure_date.format('YYYY-MM-DD')
      };
      await fundApi.createExpenditure(data);
      message.success('登记成功');
      setExpModalVisible(false);
      expForm.resetFields();
      loadData(parseInt(id!));
    } catch (error: any) {
      message.error(error.response?.data?.message || '登记失败');
    }
  };

  const canManage = isAdmin() || (isProjectManager() && project?.project_manager_id === user?.id);

  const allocationColumns = [
    {
      title: '日期',
      dataIndex: 'created_at',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD')
    },
    {
      title: '金额',
      dataIndex: 'amount',
      render: (v: number) => `¥${formatMoney(v)}`
    },
    {
      title: '来源',
      dataIndex: 'source_pool',
      render: (v: string) => v === 'general' ? '总池' : '专项池'
    },
    {
      title: '备注',
      dataIndex: 'remark'
    }
  ];

  const expenditureColumns = [
    {
      title: '日期',
      dataIndex: 'expenditure_date'
    },
    {
      title: '受助人',
      dataIndex: 'beneficiary_name',
      render: (v: string) => v || '-'
    },
    {
      title: '金额',
      dataIndex: 'amount',
      render: (v: number) => <span style={{ color: '#cf1322' }}>-¥{v.toFixed(2)}</span>
    },
    {
      title: '用途',
      dataIndex: 'purpose'
    },
    {
      title: '凭证号',
      dataIndex: 'voucher_no',
      render: (v: string) => v || '-'
    }
  ];

  if (!project) return null;

  const progress = project.total_budget > 0
    ? Math.round((project.spent_amount / project.total_budget) * 100)
    : 0;

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')}>返回</Button>
        {(isAdmin() || isProjectManager()) && (
          <Button icon={<PlusOutlined />} type="primary" onClick={() => setExpModalVisible(true)}>
            登记支出
          </Button>
        )}
        <Button icon={<DownloadOutlined />} onClick={handleExport}>
          导出报告
        </Button>
      </Space>

      <Card title={project.name} loading={loading} style={{ marginBottom: 16 }}>
        <Descriptions column={3}>
          <Descriptions.Item label="项目类别">
            <Tag>{project.category}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="负责人">{project.manager_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={project.status === 'active' ? 'green' : 'orange'}>
              {project.status === 'active' ? '进行中' : project.status}
            </Tag>
          </Descriptions.Item>
        </Descriptions>

        <Row gutter={16} style={{ marginTop: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic title="总预算" value={project.total_budget} precision={2} prefix="¥" />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="已拨付" value={project.allocated_amount} precision={2} prefix="¥" valueStyle={{ color: '#1890ff' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="已使用" value={project.spent_amount} precision={2} prefix="¥" valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="剩余预算" value={project.remaining_budget} precision={2} prefix="¥" valueStyle={{ color: '#3f8600' }} />
            </Card>
          </Col>
        </Row>

        <div style={{ marginTop: 16 }}>
          <p>执行进度：{progress}%</p>
          <Progress percent={progress} />
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="拨付记录">
            <Table
              columns={allocationColumns}
              dataSource={allocations}
              rowKey="id"
              size="small"
              pagination={false}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="支出明细">
            <Table
              columns={expenditureColumns}
              dataSource={expenditures}
              rowKey="id"
              size="small"
              pagination={false}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title="登记支出"
        open={expModalVisible}
        onCancel={() => setExpModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={expForm} layout="vertical" onFinish={handleCreateExpenditure}>
          <Form.Item label="支出日期" name="expenditure_date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="受助人" name="beneficiary_id">
            <Select allowClear showSearch optionFilterProp="children">
              {beneficiaries.map(b => (
                <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="金额" name="amount" rules={[{ required: true }]}>
            <Input prefix="¥" type="number" step="0.01" />
          </Form.Item>
          <Form.Item label="用途" name="purpose" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="凭证号" name="voucher_no">
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>提交</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectDetail;
