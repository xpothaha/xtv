import React, { useState } from 'react';
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
          <progress value={gpu.memory_used} max={gpu.memory_total} />
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
      render: (util: number) => <progress value={util} max={100} />,
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
        <span>
          {window.confirm('Are you sure you want to delete this profile?')}
        </span>
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
        <button onClick={() => refetchGPUs()}>
          Refresh
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ width: 'calc(100% - 200px)' }}>
          <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>GPU</th>
                  <th>Memory Usage</th>
                  <th>Utilization</th>
                  <th>Temperature</th>
                  <th>Power</th>
                  <th>Driver</th>
                </tr>
              </thead>
              <tbody>
                {gpus.map((gpu) => (
                  <tr key={gpu.id}>
                    <td>{gpu.name}</td>
                    <td>
                      <progress value={gpu.memory_used} max={gpu.memory_total} />
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {Math.round(gpu.memory_used / 1024 / 1024)}MB / {Math.round(gpu.memory_total / 1024 / 1024)}MB
                      </div>
                    </td>
                    <td>
                      <progress value={gpu.utilization} max={100} />
                    </td>
                    <td>{gpu.temperature}°C</td>
                    <td>{gpu.power_usage}W</td>
                    <td>{gpu.driver_version}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ width: '200px' }}>
          <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
            <button onClick={() => setProfileModalVisible(true)}>
              Create Profile
            </button>
            <table>
              <thead>
                <tr>
                  <th>Profile Name</th>
                  <th>Memory (MB)</th>
                  <th>Instances</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vgpuProfiles.map((profile) => (
                  <tr key={profile.id}>
                    <td>{profile.name}</td>
                    <td>{profile.memory}</td>
                    <td>{profile.current_instances}/{profile.max_instances}</td>
                    <td>
                      <span>
                        {window.confirm('Are you sure you want to delete this profile?')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8, marginTop: 24 }}>
        <h3>GPU Scheduling / Allocation</h3>
        <table>
          <thead>
            <tr>
              <th>VM</th>
              <th>GPU</th>
              <th>Profile</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {gpuAllocations.map((allocation) => (
              <tr key={allocation.id}>
                <td>{allocation.vm}</td>
                <td>{allocation.gpu}</td>
                <td>{allocation.profile}</td>
                <td style={{ color: allocation.status === 'active' ? '#3f8600' : '#faad14' }}>{allocation.status}</td>
                <td>
                  <button onClick={() => setGpuAllocations(gpuAllocations.filter(a => a.id !== allocation.id))}>Release</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => {
          const vm = prompt('Assign to VM:');
          const gpu = prompt('GPU:');
          const profile = prompt('Profile:');
          if (vm && gpu && profile) {
            setGpuAllocations([...gpuAllocations, {
              id: Date.now(), vm, gpu, profile, status: 'active'
            }]);
          }
        }}>+ Assign vGPU to VM</button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #ccc', padding: 16, marginTop: 24 }}>
        <h3>Create VGPU Profile</h3>
        <form onFinish={handleCreateProfile}>
          <div>
            <label htmlFor="name">Profile Name</label>
            <input id="name" name="name" required />
          </div>
          <div>
            <label htmlFor="memory">Memory (MB)</label>
            <input id="memory" name="memory" type="number" min={1} style={{ width: '100%' }} required />
          </div>
          <div>
            <label htmlFor="max_instances">Max Instances</label>
            <input id="max_instances" name="max_instances" type="number" min={1} style={{ width: '100%' }} required />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button type="submit">
              Create
            </button>
            <button onClick={() => setProfileModalVisible(false)}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </PageContainer>
  );
};

export default GPU; 