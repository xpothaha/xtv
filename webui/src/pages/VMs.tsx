import React, { useState } from 'react';
import { Table, Button, Space, Card, Modal, message, Popconfirm, Tag, Progress, Statistic, Row, Col } from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  StopOutlined, 
  ReloadOutlined,
  DeleteOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useVMs, useStartVM, useStopVM, useRestartVM, usePauseVM, useResumeVM, useDeleteVM, useVMStats } from '../hooks/useVMs';
import { useVMEvents } from '../hooks/useVMEvents';
import { PageContainer } from '@ant-design/pro-layout';

const VMs: React.FC = () => {
  const { data: vms, isLoading, refetch } = useVMs();
  const startVMMutation = useStartVM();
  const stopVMMutation = useStopVM();
  const restartVMMutation = useRestartVM();
  const pauseVMMutation = usePauseVM();
  const resumeVMMutation = useResumeVM();
  const deleteVMMutation = useDeleteVM();
  const [selectedVM, setSelectedVM] = useState<string | null>(null);
  const [statsModalVisible, setStatsModalVisible] = useState(false);

  const handleVMOperation = async (operation: string, vmId: string) => {
    try {
      switch (operation) {
        case 'start':
          await startVMMutation.mutateAsync(vmId);
          message.success('VM started successfully');
          break;
        case 'stop':
          await stopVMMutation.mutateAsync(vmId);
          message.success('VM stopped successfully');
          break;
        case 'restart':
          await restartVMMutation.mutateAsync(vmId);
          message.success('VM restarted successfully');
          break;
        case 'pause':
          await pauseVMMutation.mutateAsync(vmId);
          message.success('VM paused successfully');
          break;
        case 'resume':
          await resumeVMMutation.mutateAsync(vmId);
          message.success('VM resumed successfully');
          break;
        case 'delete':
          await deleteVMMutation.mutateAsync(vmId);
          message.success('VM deleted successfully');
          break;
      }
    } catch (error) {
      message.error(`Failed to ${operation} VM`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'green';
      case 'stopped': return 'red';
      case 'paused': return 'orange';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>ID: {record.id}</div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'CPU',
      key: 'cpu',
      render: (record: any) => (
        <div>
          <div>{record.cpu.cores} cores</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.cpu.sockets} socket{record.cpu.sockets > 1 ? 's' : ''}
          </div>
        </div>
      ),
    },
    {
      title: 'Memory',
      key: 'memory',
      render: (record: any) => (
        <div>
          <div>{record.memory.size} MB</div>
        </div>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Updated',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: any) => (
        <Space>
          {record.status === 'stopped' && (
            <Button 
              icon={<PlayCircleOutlined />} 
              size="small" 
              type="primary"
              onClick={() => handleVMOperation('start', record.id)}
              loading={startVMMutation.isPending}
            >
              Start
            </Button>
          )}
          
          {record.status === 'running' && (
            <>
              <Button 
                icon={<PauseCircleOutlined />} 
                size="small"
                onClick={() => handleVMOperation('pause', record.id)}
                loading={pauseVMMutation.isPending}
              >
                Pause
              </Button>
              <Button 
                icon={<ReloadOutlined />} 
                size="small"
                onClick={() => handleVMOperation('restart', record.id)}
                loading={restartVMMutation.isPending}
              >
                Restart
              </Button>
              <Button 
                icon={<StopOutlined />} 
                size="small" 
                danger
                onClick={() => handleVMOperation('stop', record.id)}
                loading={stopVMMutation.isPending}
              >
                Stop
              </Button>
            </>
          )}

          {record.status === 'paused' && (
            <Button 
              icon={<PlayCircleOutlined />} 
              size="small" 
              type="primary"
              onClick={() => handleVMOperation('resume', record.id)}
              loading={resumeVMMutation.isPending}
            >
              Resume
            </Button>
          )}

          <Button 
            icon={<EyeOutlined />} 
            size="small"
            onClick={() => {
              setSelectedVM(record.id);
              setStatsModalVisible(true);
            }}
          >
            Stats
          </Button>

          <Popconfirm
            title="Are you sure you want to delete this VM?"
            onConfirm={() => handleVMOperation('delete', record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button 
              icon={<DeleteOutlined />} 
              size="small" 
              danger
              loading={deleteVMMutation.isPending}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  useVMEvents((event) => {
    if (event.type === 'created') {
      message.info(`VM created: ${event.data?.name || event.data?.id}`);
    } else if (event.type === 'started') {
      message.success(`VM started: ${event.data?.name || event.data?.id}`);
    } else if (event.type === 'stopped') {
      message.warning(`VM stopped: ${event.data?.name || event.data?.id}`);
    } else if (event.type === 'deleted') {
      message.error(`VM deleted: ${event.data?.name || event.data?.id}`);
    }
    refetch(); // refresh VM list on any event
  });

  return (
    <PageContainer>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Virtual Machines</h2>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Refresh
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={vms}
          loading={isLoading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />

        {/* VM Stats Modal */}
        <Modal
          title="VM Statistics"
          open={statsModalVisible}
          onCancel={() => setStatsModalVisible(false)}
          footer={null}
          width={600}
        >
          {selectedVM && <VMStatsModal vmId={selectedVM} />}
        </Modal>
      </Card>
    </PageContainer>
  );
};

// VM Stats Modal Component
const VMStatsModal: React.FC<{ vmId: string }> = ({ vmId }) => {
  const { data: stats, isLoading } = useVMStats(vmId);

  if (isLoading) {
    return <div>Loading stats...</div>;
  }

  if (!stats) {
    return <div>No stats available</div>;
  }

  return (
    <div>
      <Row gutter={16}>
        <Col span={12}>
          <Statistic
            title="CPU Usage"
            value={stats.cpu_usage}
            suffix="%"
            valueStyle={{ color: stats.cpu_usage > 80 ? '#cf1322' : '#3f8600' }}
          />
          <Progress percent={stats.cpu_usage} size="small" />
        </Col>
        <Col span={12}>
          <Statistic
            title="Memory Usage"
            value={stats.memory_usage}
            suffix="%"
            valueStyle={{ color: stats.memory_usage > 80 ? '#cf1322' : '#3f8600' }}
          />
          <Progress percent={stats.memory_usage} size="small" />
        </Col>
      </Row>
      
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Statistic
            title="Disk Usage"
            value={stats.disk_usage}
            suffix="%"
            valueStyle={{ color: stats.disk_usage > 80 ? '#cf1322' : '#3f8600' }}
          />
          <Progress percent={stats.disk_usage} size="small" />
        </Col>
        <Col span={12}>
          <Statistic
            title="Uptime"
            value={stats.uptime}
          />
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Statistic
            title="Network RX"
            value={stats.network_rx}
            suffix="MB/s"
            precision={2}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="Network TX"
            value={stats.network_tx}
            suffix="MB/s"
            precision={2}
          />
        </Col>
      </Row>
    </div>
  );
};

export default VMs; 