import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, Select, DatePicker, message, Row, Col } from 'antd';
import { PlusOutlined, CheckCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { donationApi, projectApi } from '../../services/api';
import { Donation, Project, Donor } from '../../types';
import { isAdmin, isFinance } from '../../utils/auth';
import { formatMoney } from '../../utils/format';
import dayjs from 'dayjs';

const DonationList: React.FC = () => {
  const [list, setList] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [donorModalVisible, setDonorModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detail, setDetail] = useState<Donation | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [form] = Form.useForm();
  const [donorForm] = Form.useForm();
  const [filters, setFilters] = useState<any>({});

  useEffect(() => {
    loadData();
    loadProjects();
    loadDonors();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res: any = await donationApi.getList(filters);
      setList(res);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    const res: any = await projectApi.getList();
    setProjects(res);
  };

  const loadDonors = async () => {
    const res: any = await donationApi.getDonors();
    setDonors(res);
  };

  const handleConfirm = async (id: number) => {
    Modal.confirm({
      title: '确认到账',
      content: '确认该捐赠已到账？确认后资金将进入对应资金池',
      onOk: async () => {
        try {
          await donationApi.confirm(id, { received_date: dayjs().format('YYYY-MM-DD') });
          message.success('确认成功');
          loadData();
        } catch (error: any) {
          message.error(error.response?.data?.message || '操作失败');
        }
      }
    });
  };

  const handleCreate = async (values: any) => {
    try {
      const data = {
        ...values,
        donation_date: values.donation_date.format('YYYY-MM-DD')
      };
      await donationApi.create(data);
      message.success('创建成功');
      setModalVisible(false);
      form.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '创建失败');
    }
  };

  const handleCreateDonor = async (values: any) => {
    try {
      await donationApi.createDonor(values);
      message.success('捐赠人创建成功');
      setDonorModalVisible(false);
      donorForm.resetFields();
      loadDonors();
    } catch (error: any) {
      message.error(error.response?.data?.message || '创建失败');
    }
  };

  const columns = [
    {
      title: '捐赠编号',
      dataIndex: 'id',
      width: 80
    },
    {
      title: '捐赠人',
      dataIndex: 'donor_name',
      render: (v: string, record: Donation) => (
        <Space>
          {v}
          <Tag color={record.donor_type === 'enterprise' ? 'blue' : 'green'}>
            {record.donor_type === 'enterprise' ? '企业' : '个人'}
          </Tag>
        </Space>
      )
    },
    {
      title: '金额',
      dataIndex: 'amount',
      render: (v: number) => <span style={{ fontWeight: 'bold' }}>¥{formatMoney(v)}</span>,
      sorter: (a: Donation, b: Donation) => a.amount - b.amount
    },
    {
      title: '捐赠类型',
      dataIndex: 'donation_type',
      render: (v: string, record: Donation) => (
        <Tag color={v === 'designated' ? 'purple' : 'orange'}>
          {v === 'designated' ? `定向 - ${record.project_name}` : '非定向'}
        </Tag>
      )
    },
    {
      title: '捐赠日期',
      dataIndex: 'donation_date',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD')
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v: string) => {
        const colorMap: Record<string, string> = {
          'pending': 'orange',
          'received': 'green',
          'refunded': 'red'
        };
        const textMap: Record<string, string> = {
          'pending': '待到账',
          'received': '已到账',
          'refunded': '已退款'
        };
        return <Tag color={colorMap[v]}>{textMap[v]}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Donation) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setDetail(record);
              setDetailVisible(true);
            }}
          >
            详情
          </Button>
          {(isAdmin() || isFinance()) && record.status === 'pending' && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleConfirm(record.id)}
            >
              确认到账
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <Row justify="space-between" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <Select
              placeholder="状态"
              style={{ width: 120 }}
              allowClear
              onChange={(v) => setFilters({ ...filters, status: v })}
            >
              <Select.Option value="pending">待到账</Select.Option>
              <Select.Option value="received">已到账</Select.Option>
            </Select>
            <Select
              placeholder="类型"
              style={{ width: 120 }}
              allowClear
              onChange={(v) => setFilters({ ...filters, type: v })}
            >
              <Select.Option value="designated">定向</Select.Option>
              <Select.Option value="undesignated">非定向</Select.Option>
            </Select>
          </Space>
        </Col>
        <Col>
          <Space>
            <Button onClick={() => setDonorModalVisible(true)}>
              新增捐赠人
            </Button>
            {(isAdmin() || isFinance()) && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
                登记捐赠
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
        title="登记捐赠"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            label="捐赠人"
            name="donor_id"
            rules={[{ required: true, message: '请选择捐赠人' }]}
          >
            <Select>
              {donors.map(d => (
                <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="金额"
            name="amount"
            rules={[{ required: true, message: '请输入金额' }]}
          >
            <Input prefix="¥" type="number" step="0.01" />
          </Form.Item>
          <Form.Item
            label="捐赠日期"
            name="donation_date"
            rules={[{ required: true, message: '请选择日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="捐赠类型"
            name="donation_type"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select onChange={(v) => {
              if (v === 'undesignated') {
                form.setFieldsValue({ project_id: undefined });
              }
            }}>
              <Select.Option value="undesignated">非定向（进入总池）</Select.Option>
              <Select.Option value="designated">定向捐赠</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.donation_type !== curr.donation_type}
          >
            {({ getFieldValue }) =>
              getFieldValue('donation_type') === 'designated' ? (
                <Form.Item
                  label="指定项目"
                  name="project_id"
                  rules={[{ required: true, message: '请选择项目' }]}
                >
                  <Select>
                    {projects.map(p => (
                      <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item label="收据编号" name="receipt_no">
            <Input />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>提交</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新增捐赠人"
        open={donorModalVisible}
        onCancel={() => setDonorModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={donorForm} layout="vertical" onFinish={handleCreateDonor}>
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="类型"
            name="type"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select>
              <Select.Option value="individual">个人</Select.Option>
              <Select.Option value="enterprise">企业</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="联系人" name="contact_person">
            <Input />
          </Form.Item>
          <Form.Item label="电话" name="phone">
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>提交</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="捐赠详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
      >
        {detail && (
          <div>
            <p><strong>捐赠编号：</strong>{detail.id}</p>
            <p><strong>捐赠人：</strong>{detail.donor_name}</p>
            <p><strong>金额：</strong>¥{formatMoney(detail.amount)}</p>
            <p><strong>类型：</strong>{detail.donation_type === 'designated' ? `定向 - ${detail.project_name}` : '非定向'}</p>
            <p><strong>日期：</strong>{dayjs(detail.donation_date).format('YYYY-MM-DD')}</p>
            <p><strong>状态：</strong>{detail.status}</p>
            <p><strong>收据号：</strong>{detail.receipt_no || '-'}</p>
            <p><strong>备注：</strong>{detail.remark || '-'}</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DonationList;
