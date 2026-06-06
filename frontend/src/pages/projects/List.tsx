import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, Select, DatePicker, Progress, message, Row, Col } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, MoneyCollectOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { projectApi, userApi, fundApi } from '../../services/api';
import { Project } from '../../types';
import { isAdmin, isProjectManager, getUser } from '../../utils/auth';
import dayjs from 'dayjs';

const ProjectList: React.FC = () => {
  const [list, setList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [allocModalVisible, setAllocModalVisible] = useState(false);
  const [managers, setManagers] = useState<any[]>([]);
  const [pools, setPools] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [form] = Form.useForm();
  const [allocForm] = Form.useForm();
  const navigate = useNavigate();
  const user = getUser();

  useEffect(() => {
    loadData();
    loadManagers();
    loadPools();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res: any = await projectApi.getList();
      setList(res);
    } finally {
      setLoading(false);
    }
  };

  const loadManagers = async () => {
    const res: any = await userApi.getProjectManagers();
    setManagers(res);
  };

  const loadPools = async () => {
    const res: any = await fundApi.getPools();
    setPools(res);
  };

  const handleCreate = async (values: any) => {
    try {
      const data = {
        ...values,
        start_date: values.start_date?.format('YYYY-MM-DD'),
        end_date: values.end_date?.format('YYYY-MM-DD')
      };
      await projectApi.create(data);
      message.success('创建成功');
      setModalVisible(false);
      form.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '创建失败');
    }
  };

  const handleApplyAllocation = async (values: any) => {
    try {
      const data = {
        ...values,
        project_id: selectedProject?.id
      };
      await projectApi.applyAllocation(data);
      message.success('申请已提交');
      setAllocModalVisible(false);
      allocForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.message || '申请失败');
    }
  };

  const columns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      render: (v: string, record: Project) => (
        <a onClick={() => navigate(`/projects/${record.id}`)}>{v}</a>
      )
    },
    {
      title: '类别',
      dataIndex: 'category',
      render: (v: string) => {
        const map: Record<string, string> = {
          'education': '助学',
          'medical': '大病救助',
          'elderly': '养老',
          'disaster': '灾后重建'
        };
        return <Tag>{map[v] || v}</Tag>;
      }
    },
    {
      title: '负责人',
      dataIndex: 'manager_name'
    },
    {
      title: '预算',
      dataIndex: 'total_budget',
      render: (v: number) => `¥${v.toFixed(0)}`
    },
    {
      title: '执行进度',
      dataIndex: 'progress',
      render: (_: any, record: Project) => {
        const percent = record.total_budget > 0
          ? Math.round((record.spent_amount / record.total_budget) * 100)
          : 0;
        return (
          <div style={{ width: 150 }}>
            <Progress percent={percent} size="small" />
          </div>
        );
      }
    },
    {
      title: '已拨付',
      dataIndex: 'allocated_amount',
      render: (v: number) => `¥${v.toFixed(0)}`
    },
    {
      title: '已使用',
      dataIndex: 'spent_amount',
      render: (v: number) => `¥${v.toFixed(0)}`
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v: string) => {
        const map: Record<string, string> = {
          'active': '进行中',
          'draft': '草稿',
          'completed': '已完成',
          'suspended': '暂停'
        };
        const colorMap: Record<string, string> = {
          'active': 'green',
          'draft': 'default',
          'completed': 'blue',
          'suspended': 'orange'
        };
        return <Tag color={colorMap[v]}>{map[v]}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Project) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/projects/${record.id}`)}>
            详情
          </Button>
          {(isAdmin() || (isProjectManager() && record.project_manager_id === user?.id)) && (
            <Button
              type="link"
              size="small"
              icon={<MoneyCollectOutlined />}
              onClick={() => {
                setSelectedProject(record);
                setAllocModalVisible(true);
              }}
            >
              申请拨付
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <Row justify="space-between" style={{ marginBottom: 16 }}>
        <Col></Col>
        <Col>
          {isAdmin() && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
              新建项目
            </Button>
          )}
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={list}
        rowKey="id"
        loading={loading}
      />

      <Modal
        title="新建项目"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="项目名称" name="name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="项目类别" name="category" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="education">助学</Select.Option>
                  <Select.Option value="medical">大病救助</Select.Option>
                  <Select.Option value="elderly">养老</Select.Option>
                  <Select.Option value="disaster">灾后重建</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="总预算" name="total_budget" rules={[{ required: true }]}>
                <Input prefix="¥" type="number" step="0.01" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="项目负责人" name="project_manager_id">
                <Select>
                  {managers.map(m => (
                    <Select.Option key={m.id} value={m.id}>{m.real_name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="开始日期" name="start_date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="结束日期" name="end_date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="项目描述" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>提交</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="拨付申请"
        open={allocModalVisible}
        onCancel={() => setAllocModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={allocForm} layout="vertical" onFinish={handleApplyAllocation}>
          <Form.Item label="项目" >
            <Input value={selectedProject?.name} disabled />
          </Form.Item>
          <Form.Item label="资金来源" name="source_pool" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="general">基金会总池</Select.Option>
              <Select.Option value="designated">项目专项池</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="申请金额" name="amount" rules={[{ required: true }]}>
            <Input prefix="¥" type="number" step="0.01" />
          </Form.Item>
          <Form.Item label="用途说明" name="purpose" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>提交申请</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectList;
