import React, { useState } from 'react';
import { Card, Row, Col, Progress, Table, Button, Modal, Form, Input, InputNumber, message, Popconfirm, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { useGPUs, useVGPUProfiles, useCreateVGPUProfile, useDeleteVGPUProfile } from '../hooks/useGPU';
import { useGPUEvents } from '../hooks/useGPUEvents';
import { PageContainer } from '@ant-design/pro-layout';

const GPU: React.FC = () => {
  const { data: gpus, isLoading: gpusLoading, refetch: refetchGPUs } = useGPUs();
  const { data: vgpuProfiles, isLoading: profilesLoading } = useVGPUProfiles();
  const createProfileMutation = useCreateVGPUProfile();
  const deleteProfileMutation = useDeleteVGPUProfile();
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [gpuAllocations, setGpuAllocations] = useState([
    { id: 1, vm: 'vm01', gpu: 'NVIDIA A100', profile: 'profile1', status: 'active' },
    { id: 2, vm: 'vm02', gpu: 'NVIDIA A100', profile: 'profile2', status: 'active' },
  ]);

  const handleCreateProfile = async (values: any) => {
    try {
      await createProfileMutation.mutateAsync(values);
      message.success('VGPU profile created successfully');
      setProfileModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('Failed to create VGPU profile');
    }
  };

  const handleDeleteProfile = async (id: string) => {
    try {
      await deleteProfileMutation.mutateAsync(id);
      message.success('VGPU profile deleted successfully');
    } catch (error) {
      message.error('Failed to delete VGPU profile');
    }
  };

  const gpuColumns = [
    {
      title: 'GPU',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Memory Usage',
      key: 'memory',
      render: (gpu: any) => (
        <div>
          <Progress 
            percent={Math.round((gpu.memory_used / gpu.memory_total) * 100)} 
            format={(percent) => `${percent}%`}
          />
          <div style={{ fontSize: '12px', color: '#666' }}>
            {Math.round(gpu.memory_used / 1024 / 1024)}MB / {Math.round(gpu.memory_total / 1024 / 1024)}MB
          </div>
        </div>
      ),
    },
    {
      title: 'Utilization',
      dataIndex: 'utilization',
      key: 'utilization',
      render: (util: number) => <Progress percent={util} size="small" />,
    },
    {
      title: 'Temperature',
      dataIndex: 'temperature',
      key: 'temperature',
      render: (temp: number) => `${temp}°C`,
    },
    {
      title: 'Power',
      dataIndex: 'power_usage',
      key: 'power_usage',
      render: (power: number) => `${power}W`,
    },
    {
      title: 'Driver',
      dataIndex: 'driver_version',
      key: 'driver_version',
    },
  ];

  const profileColumns = [
    {
      title: 'Profile Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Memory (MB)',
      dataIndex: 'memory',
      key: 'memory',
    },
    {
      title: 'Instances',
      key: 'instances',
      render: (profile: any) => `${profile.current_instances}/${profile.max_instances}`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Popconfirm
          title="Are you sure you want to delete this profile?"
          onConfirm={() => handleDeleteProfile(record.id)}
          okText="Yes"
          cancelText="No"
        >
          <Button icon={<DeleteOutlined />} size="small" danger>
            Delete
          </Button>
        </Popconfirm>
      ),
    },
  ];

  useGPUEvents((event) => {
    if (event.type === 'usage') {
      message.info('GPU usage updated');
    } else if (event.type === 'profile_created') {
      message.success(`VGPU profile created: ${event.data?.name}`);
    } else if (event.type === 'profile_deleted') {
      message.error(`VGPU profile deleted: ${event.data?.name}`);
    }
    refetchGPUs(); // refresh GPU data on any event
  });

  return (
    <PageContainer>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>GPU Monitoring & Management</h2>
        <Button icon={<ReloadOutlined />} onClick={() => refetchGPUs()}>
          Refresh
        </Button>
      </div>

      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Card title="GPU Status" loading={gpusLoading}>
            <Table
              columns={gpuColumns}
              dataSource={gpus}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="VGPU Profiles" loading={profilesLoading}>
            <div style={{ marginBottom: 16 }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setProfileModalVisible(true)}
                block
              >
                Create Profile
              </Button>
            </div>
            <Table
              columns={profileColumns}
              dataSource={vgpuProfiles}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Card title="GPU Scheduling / Allocation" style={{ marginTop: 24 }}>
        <Table
          columns={[
            { title: 'VM', dataIndex: 'vm', key: 'vm' },
            { title: 'GPU', dataIndex: 'gpu', key: 'gpu' },
            { title: 'Profile', dataIndex: 'profile', key: 'profile' },
            { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => (
              <span style={{ color: status === 'active' ? '#3f8600' : '#faad14' }}>{status}</span>
            ) },
            { title: 'Action', key: 'action', render: (_: any, record: any) => (
              <Button danger size="small" onClick={() => setGpuAllocations(gpuAllocations.filter(a => a.id !== record.id))}>Release</Button>
            ) },
          ]}
          dataSource={gpuAllocations}
          rowKey="id"
          pagination={false}
          size="small"
        />
        <Button style={{ marginTop: 12 }} type="dashed" onClick={() => {
          const vm = prompt('Assign to VM:');
          const gpu = prompt('GPU:');
          const profile = prompt('Profile:');
          if (vm && gpu && profile) {
            setGpuAllocations([...gpuAllocations, {
              id: Date.now(), vm, gpu, profile, status: 'active'
            }]);
          }
        }}>+ Assign vGPU to VM</Button>
      </Card>

      <Modal
        title="Create VGPU Profile"
        open={profileModalVisible}
        onCancel={() => setProfileModalVisible(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleCreateProfile} layout="vertical">
          <Form.Item
            name="name"
            label="Profile Name"
            rules={[{ required: true, message: 'Please enter profile name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="memory"
            label="Memory (MB)"
            rules={[{ required: true, message: 'Please enter memory size' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="max_instances"
            label="Max Instances"
            rules={[{ required: true, message: 'Please enter max instances' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Create
              </Button>
              <Button onClick={() => setProfileModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default GPU; 