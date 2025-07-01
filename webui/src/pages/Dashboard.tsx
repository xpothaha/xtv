import React from 'react';
import { Card, Row, Col, Statistic, Progress, Alert, Badge } from 'antd';
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
        <Alert
          message="Real-time connection not available"
          description="Using API polling for system stats. Real-time updates will be available when WebSocket connection is established."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={24}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="CPU Usage"
              value={currentStats?.cpu_usage || 0}
              suffix="%"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: currentStats?.cpu_usage && currentStats.cpu_usage > 80 ? '#cf1322' : '#3f8600' }}
            />
            <Progress percent={currentStats?.cpu_usage || 0} size="small" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Memory Usage"
              value={currentStats?.memory_usage || 0}
              suffix="%"
              prefix={<DesktopOutlined />}
              valueStyle={{ color: currentStats?.memory_usage && currentStats.memory_usage > 80 ? '#cf1322' : '#3f8600' }}
            />
            <Progress percent={currentStats?.memory_usage || 0} size="small" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Disk Usage"
              value={currentStats?.disk_usage || 0}
              suffix="%"
              prefix={<HddOutlined />}
              valueStyle={{ color: currentStats?.disk_usage && currentStats.disk_usage > 80 ? '#cf1322' : '#3f8600' }}
            />
            <Progress percent={currentStats?.disk_usage || 0} size="small" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active VMs"
              value={runningVMs}
              suffix={`/ ${totalVMs}`}
              prefix={<WifiOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
            <div style={{ marginTop: 8 }}>
              <Badge 
                status={wsConnected ? "success" : "default"} 
                text={wsConnected ? "Real-time" : "Polling"} 
              />
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={24} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="System Status" loading={statsLoading}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Network RX"
                  value={currentStats?.network_in || 0}
                  suffix="MB/s"
                  precision={2}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Network TX"
                  value={currentStats?.network_out || 0}
                  suffix="MB/s"
                  precision={2}
                />
              </Col>
            </Row>
            {realTimeStats?.timestamp && (
              <div style={{ marginTop: 16, fontSize: '12px', color: '#666' }}>
                Last updated: {new Date(realTimeStats.timestamp).toLocaleString()}
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="VM Status" loading={vmsLoading}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Running"
                  value={runningVMs}
                  prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Stopped"
                  value={totalVMs - runningVMs}
                  prefix={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
                />
              </Col>
            </Row>
            {vms && vms.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4>Recent VMs:</h4>
                {vms.slice(0, 3).map(vm => (
                  <div key={vm.id} style={{ marginBottom: 8 }}>
                    <Badge 
                      status={vm.status === 'running' ? 'success' : 'default'} 
                      text={`${vm.name} (${vm.status})`} 
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default Dashboard; 