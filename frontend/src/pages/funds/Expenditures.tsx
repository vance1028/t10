import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, DatePicker, message, Row, Col } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { fundApi, projectApi } from '../../services/api';
import { Expenditure, Project, Beneficiary } from '../../types';
import { isAdmin, isFinance, isProjectManager, getUser } from '../../utils/auth';
import dayjs from 'dayjs';

const ExpenditureList: React.FC = () => {
  const [list, setList] = useState<Expenditure[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [benefModalVisible, setBenefModalVisible] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [form] = Form.useForm();
  const [benefForm] = Form.useForm();
  const [filters, setFilters] = useState<any>({});
  const user = getUser();

  useEffect(() => {
    loadData();
    loadProjects();
    loadBeneficiaries();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res: any = await fundApi.getExpenditures(filters);
      setList(res);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    const res: any = await projectApi.getList();
    setProjects(res);
  };

  const loadBeneficiaries = async () => {
    const res: any = await fundApi.getBeneficiaries();
    setBeneficiaries(res);
  };

  const handleCreate = async (values: any) => {
    try {
      const data = {
        ...values,
        expenditure_date: values.expenditure_date.format('YYYY-MM-DD')
      };
      await fundApi.createExpenditure(data);
      message.success('登记成功');
      setModalVisible(false);
      form.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '登记失败');
    }
  };

  const handleCreateBeneficiary = async (values: any) => {
    try {
      await fundApi.createBeneficiary(values);
      message.success('受助人创建成功');
      setBenefModalVisible(false);
      benefForm.resetFields();
      loadBeneficiaries();
    } catch (error: any) {
      message.error(error.response?.data?.message || '创建失败');
    }
  };

  const columns = [
    {
      title: '支出日期',
      dataIndex: 'expenditure_date'
    },
    {
      title: '项目',
      dataIndex: 'project_name'
    },
    {
      title: '受助人',
      dataIndex: 'beneficiary_name',
      render: (v: string) => v || '-'
    },
    {
      title: '金额',
      dataIndex: 'amount',
      render: (v: number) => <span style={{ color: '#cf1322', fontWeight: 'bold' }}>-¥{v.toFixed(2)}</span>,
      sorter: (a: Expenditure, b: Expenditure) => a.amount - b.amount
    },
    {
      title: '用途',
      dataIndex: 'purpose'
    },
    {
      title: '凭证号',
      dataIndex: 'voucher_no',
      render: (v: string) => v || '-'
    },
    {
      title: '登记人',
      dataIndex: 'creator_name'
    }
  ];

  const canCreate = isAdmin() || isFinance() || isProjectManager();

  return (
    <div>
      <Row justify="space-between" style={{ marginBottom: 16 }}>
        <Col>
          <Select
            placeholder="筛选项目"
            style={{ width: 200 }}
            allowClear
            onChange={(v) => setFilters({ ...filters, projectId: v })}
          >
            {projects.map(p => (
              <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
            ))}
          </Select>
        </Col>
        <Col>
          <Space>
            <Button onClick={() => setBenefModalVisible(true)}>新增受助人</Button>
            {canCreate && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
                登记支出
              </Button>
            )}
          </Space>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={list}
        rowKey="id"
        loading={loading}
      />

      <Modal
        title="登记支出"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item label="所属项目" name="project_id" rules={[{ required: true }]}>
            <Select>
              {projects.map(p => (
                <Select.Option key={p.id} value={p.id}>{p.name} (可用: ¥{(p.allocated_amount - p.spent_amount).toFixed(2)})</Select.Option>
              ))}
            </Select>
          </Form.Item>
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
          <Form.Item label="用途说明" name="purpose" rules={[{ required: true }]}>
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

      <Modal
        title="新增受助人"
        open={benefModalVisible}
        onCancel={() => setBenefModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={benefForm} layout="vertical" onFinish={handleCreateBeneficiary}>
          <Form.Item label="姓名" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="身份证号" name="id_card">
            <Input />
          </Form.Item>
          <Form.Item label="联系电话" name="phone">
            <Input />
          </Form.Item>
          <Form.Item label="类别" name="category">
            <Select>
              <Select.Option value="学生">学生</Select.Option>
              <Select.Option value="大病患者">大病患者</Select.Option>
              <Select.Option value="老人">老人</Select.Option>
              <Select.Option value="其他">其他</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="地址" name="address">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="情况说明" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>提交</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExpenditureList;
