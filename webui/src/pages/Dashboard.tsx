import React from 'react';
import { useSystemStats } from '../hooks/useSystemStats';
import { useVMs } from '../hooks/useVMs';
import { useRealTimeStats } from '../hooks/useRealTimeStats';
import { PageContainer } from '@ant-design/pro-layout';
import { 
  DesktopOutlined, 
  HddOutlined, 
  ThunderboltOutlined, 
  WifiOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';

const Dashboard: React.FC = () => {
  const { data: systemStats, isLoading: statsLoading } = useSystemStats();
  const { data: vms, isLoading: vmsLoading } = useVMs();
  const { stats: realTimeStats, isConnected: wsConnected } = useRealTimeStats();

  // Use real-time stats if available, otherwise fall back to API stats
  const currentStats = realTimeStats || systemStats;

  const runningVMs = vms?.filter(vm => vm.status === 'running').length || 0;
  const totalVMs = vms?.length || 0;

  return (
    <PageContainer>
      <h2>Dashboard</h2>
      <p>Real-time system monitoring and VM overview.</p>

      {!wsConnected && (
        <div style={{color: 'red'}}>Real-time connection not available</div>
      )}

      <div style={{display: 'flex', flexWrap: 'wrap', gap: 24}}>
        <div style={{border: '1px solid #eee', padding: 16, borderRadius: 8, width: 'calc(25% - 24px)'}}>
          <span style={{fontWeight: 600}}>CPU Usage</span>
          <progress value={currentStats?.cpu_usage || 0} max={100} />
        </div>
        <div style={{border: '1px solid #eee', padding: 16, borderRadius: 8, width: 'calc(25% - 24px)'}}>
          <span style={{fontWeight: 600}}>Memory Usage</span>
          <progress value={currentStats?.memory_usage || 0} max={100} />
        </div>
        <div style={{border: '1px solid #eee', padding: 16, borderRadius: 8, width: 'calc(25% - 24px)'}}>
          <span style={{fontWeight: 600}}>Disk Usage</span>
          <progress value={currentStats?.disk_usage || 0} max={100} />
        </div>
        <div style={{border: '1px solid #eee', padding: 16, borderRadius: 8, width: 'calc(25% - 24px)'}}>
          <span style={{fontWeight: 600}}>Active VMs</span>
          <span style={{color: '#3f8600'}}>{runningVMs} / {totalVMs}</span>
          <div style={{marginTop: 8}}>
            <span style={{background: wsConnected ? '#87d068' : '#eee', borderRadius: 4, padding: '2px 8px'}}>{wsConnected ? "Real-time" : "Polling"}</span>
          </div>
        </div>
      </div>

      <div style={{display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 24}}>
        <div style={{width: 'calc(50% - 24px)'}}>
          <div style={{border: '1px solid #eee', padding: 16, borderRadius: 8}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
              <span style={{fontWeight: 600}}>Network RX</span>
              <span>{currentStats?.network_in || 0} MB/s</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
              <span style={{fontWeight: 600}}>Network TX</span>
              <span>{currentStats?.network_out || 0} MB/s</span>
            </div>
          </div>
          {realTimeStats?.timestamp && (
            <div style={{marginTop: 16, fontSize: '12px', color: '#666'}}>
              Last updated: {new Date(realTimeStats.timestamp).toLocaleString()}
            </div>
          )}
        </div>
        <div style={{width: 'calc(50% - 24px)'}}>
          <div style={{border: '1px solid #eee', padding: 16, borderRadius: 8}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
              <span style={{fontWeight: 600}}>Running</span>
              <span>{runningVMs}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
              <span style={{fontWeight: 600}}>Stopped</span>
              <span>{totalVMs - runningVMs}</span>
            </div>
          </div>
          {vms && vms.length > 0 && (
            <div style={{marginTop: 16}}>
              <h4>Recent VMs:</h4>
              {vms.slice(0, 3).map(vm => (
                <div key={vm.id} style={{marginBottom: 8}}>
                  <span style={{background: vm.status === 'running' ? '#87d068' : '#eee', borderRadius: 4, padding: '2px 8px'}}>{`${vm.name} (${vm.status})`}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default Dashboard; 