import React, { useState } from 'react';
import { Tabs, Input, Button, Card, Table, Tag, Timeline, Space, message, Select } from 'antd';
import { SearchOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { auditApi, donationApi, fundApi } from '../../services/api';
import { Donation, Expenditure, FundAllocation, Beneficiary } from '../../types';
import dayjs from 'dayjs';

const Trail: React.FC = () => {
  const [activeTab, setActiveTab] = useState('donation');
  const [donationId, setDonationId] = useState<string>('');
  const [beneficiaryId, setBeneficiaryId] = useState<string>('');
  const [donationData, setDonationData] = useState<any>(null);
  const [beneficiaryData, setBeneficiaryData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);

  const searchDonationTrail = async () => {
    if (!donationId) {
      message.warning('请输入或选择捐赠编号');
      return;
    }
    setLoading(true);
    try {
      const res: any = await auditApi.getTrailByDonation(parseInt(donationId));
      setDonationData(res);
    } catch (error: any) {
      message.error(error.response?.data?.message || '查询失败');
    } finally {
      setLoading(false);
    }
  };

  const searchBeneficiaryTrail = async () => {
    if (!beneficiaryId) {
      message.warning('请选择受助人');
      return;
    }
    setLoading(true);
    try {
      const res: any = await auditApi.getTrailByBeneficiary(parseInt(beneficiaryId));
      setBeneficiaryData(res);
    } catch (error: any) {
      message.error(error.response?.data?.message || '查询失败');
    } finally {
      setLoading(false);
    }
  };

  const searchDonations = async (keyword: string) => {
    if (keyword) {
      const res: any = await donationApi.getList();
      setDonations(res.filter((d: Donation) =>
        d.id.toString().includes(keyword) ||
        d.donor_name?.includes(keyword)
      ).slice(0, 20));
    }
  };

  const searchBeneficiaries = async (keyword: string) => {
    if (keyword) {
      const res: any = await fundApi.getBeneficiaries({ keyword });
      setBeneficiaries(res.slice(0, 20));
    }
  };

  const trailItems = [
    {
      key: 'donation',
      label: '按捐赠追溯',
      children: (
        <div>
          <Space.Compact style={{ width: '100%', marginBottom: 24 }}>
            <Select
              showSearch
              placeholder="输入捐赠编号或捐赠人姓名搜索"
              style={{ width: '80%' }}
              allowClear
              onSearch={searchDonations}
              onChange={(v) => setDonationId(v?.toString() || '')}
              filterOption={false}
            >
              {donations.map(d => (
                <Select.Option key={d.id} value={d.id}>
                  #{d.id} - {d.donor_name} - ¥{d.amount}
                </Select.Option>
              ))}
            </Select>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={searchDonationTrail}
              loading={loading}
            >
              查询流向
            </Button>
          </Space.Compact>

          {donationData && (
            <div>
              <Card title="捐赠信息" style={{ marginBottom: 16 }}>
                <p><strong>捐赠编号：</strong>#{donationData.donation.id}</p>
                <p><strong>捐赠人：</strong>{donationData.donation.donor_name}</p>
                <p><strong>金额：</strong>¥{donationData.donation.amount.toFixed(2)}</p>
                <p><strong>类型：</strong>
                  <Tag color={donationData.donation.donation_type === 'designated' ? 'purple' : 'orange'}>
                    {donationData.donation.donation_type === 'designated' ? `定向 - ${donationData.donation.project_name}` : '非定向'}
                  </Tag>
                </p>
                <p><strong>状态：</strong>
                  <Tag color={donationData.donation.status === 'received' ? 'green' : 'orange'}>
                    {donationData.donation.status === 'received' ? '已到账' : '待到账'}
                  </Tag>
                </p>
              </Card>

              <Card title="资金流向追溯">
                {donationData.donation.status !== 'received' ? (
                  <p style={{ color: '#999' }}>捐赠尚未到账，暂无流向</p>
                ) : (
                  <Timeline mode="left">
                    <Timeline.Item color="green">
                      <p style={{ fontWeight: 'bold' }}>捐赠入账</p>
                      <p>¥{donationData.donation.amount.toFixed(2)} 进入{donationData.donation.donation_type === 'designated' ? '项目专项池' : '基金会总池'}</p>
                      <p style={{ color: '#999' }}>{dayjs(donationData.donation.received_date || donationData.donation.created_at).format('YYYY-MM-DD')}</p>
                    </Timeline.Item>

                    {donationData.allocations.length > 0 && (
                      <>
                        <Timeline.Item color="blue">
                          <p style={{ fontWeight: 'bold' }}>拨付至项目</p>
                          {donationData.allocations.map((a: FundAllocation) => (
                            <p key={a.id}>
                              ¥{a.amount.toFixed(2)} → {a.project_name}
                              <Tag color="blue" style={{ marginLeft: 8 }}>{a.source_pool === 'general' ? '总池' : '专项池'}</Tag>
                            </p>
                          ))}
                        </Timeline.Item>
                      </>
                    )}

                    {donationData.expenditures.length > 0 && (
                      <Timeline.Item color="red">
                        <p style={{ fontWeight: 'bold' }}>支出使用</p>
                        {donationData.expenditures.map((e: Expenditure) => (
                          <p key={e.id}>
                            ¥{e.amount.toFixed(2)} → {e.beneficiary_name || '物资/服务'}
                            <span style={{ color: '#999', marginLeft: 8 }}>{e.purpose}</span>
                          </p>
                        ))}
                      </Timeline.Item>
                    )}
                  </Timeline>
                )}
              </Card>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'beneficiary',
      label: '按受助人反查',
      children: (
        <div>
          <Space.Compact style={{ width: '100%', marginBottom: 24 }}>
            <Select
              showSearch
              placeholder="输入受助人姓名搜索"
              style={{ width: '80%' }}
              allowClear
              onSearch={searchBeneficiaries}
              onChange={(v) => setBeneficiaryId(v?.toString() || '')}
              filterOption={false}
            >
              {beneficiaries.map(b => (
                <Select.Option key={b.id} value={b.id}>
                  {b.name} - {b.category || '未分类'}
                </Select.Option>
              ))}
            </Select>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={searchBeneficiaryTrail}
              loading={loading}
            >
              查询来源
            </Button>
          </Space.Compact>

          {beneficiaryData && (
            <div>
              <Card title="受助人信息" style={{ marginBottom: 16 }}>
                <p><strong>姓名：</strong>{beneficiaryData.beneficiary.name}</p>
                <p><strong>类别：</strong>{beneficiaryData.beneficiary.category || '-'}</p>
                <p><strong>电话：</strong>{beneficiaryData.beneficiary.phone || '-'}</p>
                <p><strong>说明：</strong>{beneficiaryData.beneficiary.description || '-'}</p>
              </Card>

              <Card title="资助明细">
                <Table
                  columns={[
                    {
                      title: '日期',
                      dataIndex: 'expenditure_date',
                      width: 120
                    },
                    {
                      title: '项目',
                      dataIndex: 'project_name'
                    },
                    {
                      title: '金额',
                      dataIndex: 'amount',
                      render: (v: number) => <span style={{ color: '#cf1322' }}>¥{v.toFixed(2)}</span>
                    },
                    {
                      title: '用途',
                      dataIndex: 'purpose'
                    }
                  ]}
                  dataSource={beneficiaryData.expenditures}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  summary={(pageData) => {
                    const total = pageData.reduce((sum, item: any) => sum + item.amount, 0);
                    return (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={2}>合计资助</Table.Summary.Cell>
                        <Table.Summary.Cell index={1}>
                          <span style={{ color: '#cf1322', fontWeight: 'bold' }}>¥{total.toFixed(2)}</span>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2}></Table.Summary.Cell>
                      </Table.Summary.Row>
                    );
                  }}
                />
              </Card>

              {beneficiaryData.relatedDonations.length > 0 && (
                <Card title="相关捐赠来源" style={{ marginTop: 16 }}>
                  <Table
                    columns={[
                      {
                        title: '捐赠编号',
                        dataIndex: 'id',
                        width: 80,
                        render: (v: number) => `#${v}`
                      },
                      {
                        title: '捐赠人',
                        dataIndex: 'donor_name'
                      },
                      {
                        title: '金额',
                        dataIndex: 'amount',
                        render: (v: number) => `¥${v.toFixed(2)}`
                      },
                      {
                        title: '类型',
                        dataIndex: 'donation_type',
                        render: (v: string, record: Donation) => (
                          v === 'designated' ? `定向 - ${record.project_name}` : '非定向'
                        )
                      }
                    ]}
                    dataSource={beneficiaryData.relatedDonations}
                    rowKey="id"
                    pagination={false}
                    size="small"
                  />
                </Card>
              )}
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={trailItems} />
      </Card>
    </div>
  );
};

export default Trail;
