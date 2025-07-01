import React from 'react';
import { Card, Row, Col, Descriptions, Statistic, Progress, Tag } from 'antd';
import { useSystemInfo } from '../hooks/useSystemInfo';
import { useHealthStatus, useGPUUsage, useCPUInfo } from '../hooks/useSystemHealth';
import { PageContainer } from '@ant-design/pro-layout';
import { CheckCircleOutlined, ExclamationCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';

const System: React.FC = () => {
  const { data: systemInfo, isLoading: infoLoading } = useSystemInfo();
  const { data: healthStatus, isLoading: healthLoading } = useHealthStatus();
  const { data: gpuUsage, isLoading: gpuLoading } = useGPUUsage();
  const { data: cpuInfo, isLoading: cpuLoading } = useCPUInfo();

  const isLoading = infoLoading || healthLoading || gpuLoading || cpuLoading;

  return (
    <PageContainer>
      <h2>System Information</h2>
      <p>Host hardware and OS details with real-time monitoring.</p>

      {/* Health Status */}
      <Card title="System Health" style={{ marginBottom: 24 }}>
        {healthStatus && (
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="Status"
                value={healthStatus.status}
                prefix={healthStatus.status === 'healthy' ? 
                  <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
                  <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                }
                valueStyle={{ 
                  color: healthStatus.status === 'healthy' ? '#52c41a' : '#faad14' 
                }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Version"
                value={healthStatus.version}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Uptime"
                value={healthStatus.uptime}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Last Check"
                value={new Date(healthStatus.timestamp * 1000).toLocaleString()}
              />
            </Col>
          </Row>
        )}
      </Card>

      {/* GPU Usage */}
      {gpuUsage && (
        <Card title="GPU Usage" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            {gpuUsage.gpus.map((gpu, index) => (
              <Col span={12} key={index}>
                <Card size="small" title={gpu.model}>
                  <Row gutter={8}>
                    <Col span={12}>
                      <Statistic
                        title="Utilization"
                        value={gpu.utilization}
                        suffix="%"
                        valueStyle={{ color: gpu.utilization > 80 ? '#cf1322' : '#3f8600' }}
                      />
                      <Progress percent={gpu.utilization} size="small" />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="VRAM"
                        value={`${gpu.vram_used}/${gpu.vram_total} GB`}
                        valueStyle={{ color: (gpu.vram_used / gpu.vram_total) > 0.8 ? '#cf1322' : '#3f8600' }}
                      />
                      <Progress 
                        percent={Math.round((gpu.vram_used / gpu.vram_total) * 100)} 
                        size="small" 
                      />
                    </Col>
                  </Row>
                  <div style={{ marginTop: 8 }}>
                    <Tag color={gpu.used > 0 ? 'green' : 'default'}>
                      {gpu.used} used / {gpu.total} total
                    </Tag>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
          <div style={{ marginTop: 16, fontSize: '12px', color: '#666' }}>
            {gpuUsage.note}
          </div>
        </Card>
      )}

      {/* CPU Information */}
      {cpuInfo && (
        <Card title="CPU Information" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="Model"
                value={cpuInfo.model}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="Cores"
                value={cpuInfo.cores}
                prefix={<ThunderboltOutlined />}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="Sockets"
                value={cpuInfo.sockets}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="Threads"
                value={cpuInfo.threads}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="NUMA Nodes"
                value={cpuInfo.numa_nodes}
              />
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={8}>
              <Statistic
                title="Frequency"
                value={cpuInfo.frequency}
                suffix="MHz"
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Cache"
                value={cpuInfo.cache}
                suffix="KB"
              />
            </Col>
          </Row>
          <div style={{ marginTop: 16 }}>
            <h4>CPU Flags:</h4>
            <div style={{ maxHeight: 100, overflowY: 'auto' }}>
              {cpuInfo.flags.map((flag, index) => (
                <Tag key={index} style={{ margin: '2px' }}>{flag}</Tag>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* System Details */}
      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Card title="CPU Details" loading={isLoading}>
            <Descriptions column={1} size="small">
              {systemInfo?.cpu && Object.entries(systemInfo.cpu).map(([k, v]) => (
                <Descriptions.Item key={k} label={k}>{String(v)}</Descriptions.Item>
              ))}
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Memory Details" loading={isLoading}>
            <Descriptions column={1} size="small">
              {systemInfo?.memory && Object.entries(systemInfo.memory).map(([k, v]) => (
                <Descriptions.Item key={k} label={k}>{String(v)}</Descriptions.Item>
              ))}
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Disk Information" loading={isLoading}>
            <Descriptions column={1} size="small">
              {Array.isArray(systemInfo?.disk) ? systemInfo?.disk.map((disk: any, i: number) => (
                <Descriptions.Item key={i} label={disk.device || `Disk ${i+1}`}>
                  {disk.total ? `${disk.total} bytes` : JSON.stringify(disk)}
                </Descriptions.Item>
              )) : null}
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Network Information" loading={isLoading}>
            <Descriptions column={1} size="small">
              {Array.isArray(systemInfo?.network) ? systemInfo?.network.map((iface: any, i: number) => (
                <Descriptions.Item key={i} label={iface.name || `NIC ${i+1}`}>
                  {iface.bytes_recv ? `${iface.bytes_recv} bytes received` : JSON.stringify(iface)}
                </Descriptions.Item>
              )) : null}
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24}>
          <Card title="Host Information" loading={isLoading}>
            <Descriptions column={2} size="small">
              {systemInfo?.host && Object.entries(systemInfo.host).map(([k, v]) => (
                <Descriptions.Item key={k} label={k}>{String(v)}</Descriptions.Item>
              ))}
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default System; 