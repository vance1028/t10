import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, message, Row, Col, Select } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { projectApi } from '../../services/api';
import { AllocationApplication } from '../../types';
import { isAdmin, isFinance, isProjectManager, getUser } from '../../utils/auth';
import { formatMoney } from '../../utils/format';
import dayjs from 'dayjs';

const AllocationApplications: React.FC = () => {
  const [list, setList] = useState<AllocationApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AllocationApplication | null>(null);
  const [reviewForm] = Form.useForm();
  const [approveForm] = Form.useForm();
  const user = getUser();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res: any = await projectApi.getApplications();
      setList(res);
    } finally {
      setLoading(false);
    }
  };

  const handleFinanceReview = async (values: any) => {
    try {
      await projectApi.financeReview(selectedRecord!.id, values);
      message.success('操作成功');
      setReviewModalVisible(false);
      reviewForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleAdminApprove = async (values: any) => {
    try {
      await projectApi.adminApprove(selectedRecord!.id, values);
      message.success('操作成功');
      setApproveModalVisible(false);
      approveForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  const statusMap: Record<string, { text: string; color: string }> = {
    'pending_finance': { text: '待财务复核', color: 'orange' },
    'pending_admin': { text: '待管理员审批', color: 'blue' },
    'approved': { text: '已批准', color: 'green' },
    'rejected': { text: '已驳回', color: 'red' }
  };

  const columns = [
    {
      title: '申请编号',
      dataIndex: 'id',
      width: 80
    },
    {
      title: '项目名称',
      dataIndex: 'project_name'
    },
    {
      title: '申请金额',
      dataIndex: 'amount',
      render: (v: number) => <span style={{ fontWeight: 'bold' }}>¥{formatMoney(v, 2)}</span>
    },
    {
      title: '资金来源',
      dataIndex: 'source_pool',
      render: (v: string) => v === 'general' ? '总池' : '项目专项池'
    },
    {
      title: '申请人',
      dataIndex: 'applicant_name'
    },
    {
      title: '申请时间',
      dataIndex: 'created_at',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v: string) => (
        <Tag color={statusMap[v]?.color}>{statusMap[v]?.text}</Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: AllocationApplication) => (
        <Space>
          {isFinance() && record.status === 'pending_finance' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => {
                  setSelectedRecord(record);
                  reviewForm.setFieldsValue({ approved: true });
                  setReviewModalVisible(true);
                }}
              >
                复核
              </Button>
            </>
          )}
          {isAdmin() && record.status === 'pending_admin' && (
            <Button
              type="link"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => {
                setSelectedRecord(record);
                approveForm.setFieldsValue({ approved: true });
                setApproveModalVisible(true);
              }}
            >
              审批
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <Table
        columns={columns}
        dataSource={list}
        rowKey="id"
        loading={loading}
      />

      <Modal
        title="财务复核"
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        {selectedRecord && (
          <div style={{ marginBottom: 16 }}>
            <p><strong>项目：</strong>{selectedRecord.project_name}</p>
            <p><strong>金额：</strong>¥{formatMoney(selectedRecord.amount)}</p>
            <p><strong>用途：</strong>{selectedRecord.purpose}</p>
          </div>
        )}
        <Form form={reviewForm} layout="vertical" onFinish={handleFinanceReview}>
          <Form.Item label="复核结果" name="approved" rules={[{ required: true }]}>
            <Select>
              <Select.Option value={true}>通过</Select.Option>
              <Select.Option value={false}>驳回</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="复核意见" name="comment">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>提交</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="管理员审批"
        open={approveModalVisible}
        onCancel={() => setApproveModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        {selectedRecord && (
          <div style={{ marginBottom: 16 }}>
            <p><strong>项目：</strong>{selectedRecord.project_name}</p>
            <p><strong>金额：</strong>¥{formatMoney(selectedRecord.amount)}</p>
            <p><strong>用途：</strong>{selectedRecord.purpose}</p>
            <p><strong>财务意见：</strong>{selectedRecord.finance_review_comment || '无'}</p>
          </div>
        )}
        <Form form={approveForm} layout="vertical" onFinish={handleAdminApprove}>
          <Form.Item label="审批结果" name="approved" rules={[{ required: true }]}>
            <Select>
              <Select.Option value={true}>批准拨付</Select.Option>
              <Select.Option value={false}>驳回</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="审批意见" name="comment">
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

export default AllocationApplications;
