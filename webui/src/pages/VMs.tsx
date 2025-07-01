import React, { useState } from 'react';
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
          alert('VM started successfully');
          break;
        case 'stop':
          await stopVMMutation.mutateAsync(vmId);
          alert('VM stopped successfully');
          break;
        case 'restart':
          await restartVMMutation.mutateAsync(vmId);
          alert('VM restarted successfully');
          break;
        case 'pause':
          await pauseVMMutation.mutateAsync(vmId);
          alert('VM paused successfully');
          break;
        case 'resume':
          await resumeVMMutation.mutateAsync(vmId);
          alert('VM resumed successfully');
          break;
        case 'delete':
          await deleteVMMutation.mutateAsync(vmId);
          alert('VM deleted successfully');
          break;
      }
    } catch (error) {
      alert(`Failed to ${operation} VM`);
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
        <span style={{background: '#eee', borderRadius: 4, padding: '2px 8px'}}>
          {status.toUpperCase()}
        </span>
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
        <div>
          {record.status === 'stopped' && (
            <button 
              onClick={() => handleVMOperation('start', record.id)}
              disabled={startVMMutation.isPending}
            >
              Start
            </button>
          )}
          
          {record.status === 'running' && (
            <>
              <button 
                onClick={() => handleVMOperation('pause', record.id)}
                disabled={pauseVMMutation.isPending}
              >
                Pause
              </button>
              <button 
                onClick={() => handleVMOperation('restart', record.id)}
                disabled={restartVMMutation.isPending}
              >
                Restart
              </button>
              <button 
                onClick={() => handleVMOperation('stop', record.id)}
                disabled={stopVMMutation.isPending}
              >
                Stop
              </button>
            </>
          )}

          {record.status === 'paused' && (
            <button 
              onClick={() => handleVMOperation('resume', record.id)}
              disabled={resumeVMMutation.isPending}
            >
              Resume
            </button>
          )}

          <button 
            onClick={() => {
              setSelectedVM(record.id);
              setStatsModalVisible(true);
            }}
          >
            Stats
          </button>

          <span>
            <button 
              onClick={() => handleVMOperation('delete', record.id)}
              disabled={deleteVMMutation.isPending}
            >
              Delete
            </button>
          </span>
        </div>
      ),
    },
  ];

  useVMEvents((event) => {
    if (event.type === 'created') {
      alert(`VM created: ${event.data?.name || event.data?.id}`);
    } else if (event.type === 'started') {
      alert(`VM started: ${event.data?.name || event.data?.id}`);
    } else if (event.type === 'stopped') {
      alert(`VM stopped: ${event.data?.name || event.data?.id}`);
    } else if (event.type === 'deleted') {
      alert(`VM deleted: ${event.data?.name || event.data?.id}`);
    }
    refetch(); // refresh VM list on any event
  });

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Virtual Machines</h2>
        <button onClick={() => refetch()}>
          Refresh
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>CPU</th>
            <th>Memory</th>
            <th>Created</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {vms.map((vm) => (
            <tr key={vm.id}>
              <td>{vm.name}</td>
              <td>{vm.status}</td>
              <td>{vm.cpu.cores} cores</td>
              <td>{vm.memory.size} MB</td>
              <td>{new Date(vm.created_at).toLocaleDateString()}</td>
              <td>{new Date(vm.updated_at).toLocaleDateString()}</td>
              <td>
                {vm.status === 'stopped' && (
                  <button 
                    onClick={() => handleVMOperation('start', vm.id)}
                    disabled={startVMMutation.isPending}
                  >
                    Start
                  </button>
                )}
                
                {vm.status === 'running' && (
                  <>
                    <button 
                      onClick={() => handleVMOperation('pause', vm.id)}
                      disabled={pauseVMMutation.isPending}
                    >
                      Pause
                    </button>
                    <button 
                      onClick={() => handleVMOperation('restart', vm.id)}
                      disabled={restartVMMutation.isPending}
                    >
                      Restart
                    </button>
                    <button 
                      onClick={() => handleVMOperation('stop', vm.id)}
                      disabled={stopVMMutation.isPending}
                    >
                      Stop
                    </button>
                  </>
                )}

                {vm.status === 'paused' && (
                  <button 
                    onClick={() => handleVMOperation('resume', vm.id)}
                    disabled={resumeVMMutation.isPending}
                  >
                    Resume
                  </button>
                )}

                <button 
                  onClick={() => {
                    setSelectedVM(vm.id);
                    setStatsModalVisible(true);
                  }}
                >
                  Stats
                </button>

                <span>
                  <button 
                    onClick={() => handleVMOperation('delete', vm.id)}
                    disabled={deleteVMMutation.isPending}
                  >
                    Delete
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* VM Stats Modal */}
      <div style={{background: '#fff', border: '1px solid #ccc', padding: 16}}>
        {selectedVM && <VMStatsModal vmId={selectedVM} />}
      </div>
    </>
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
      <span style={{fontWeight: 600}}>{stats.cpu_usage}%</span>
      <progress value={stats.cpu_usage} max={100} />
      
      <span style={{fontWeight: 600}}>{stats.memory_usage}%</span>
      <progress value={stats.memory_usage} max={100} />
      
      <span style={{fontWeight: 600}}>{stats.disk_usage}%</span>
      <progress value={stats.disk_usage} max={100} />
      
      <span style={{fontWeight: 600}}>{stats.uptime}</span>
      
      <span style={{fontWeight: 600}}>{stats.network_rx} MB/s</span>
      
      <span style={{fontWeight: 600}}>{stats.network_tx} MB/s</span>
    </div>
  );
};

export default VMs; 