import React from 'react';
import { useSystemInfo } from '../hooks/useSystemInfo';
import { useHealthStatus, useGPUUsage, useCPUInfo } from '../hooks/useSystemHealth';

const System: React.FC = () => {
  const { data: systemInfo, isLoading: infoLoading } = useSystemInfo();
  const { data: healthStatus, isLoading: healthLoading } = useHealthStatus();
  const { data: gpuUsage, isLoading: gpuLoading } = useGPUUsage();
  const { data: cpuInfo, isLoading: cpuLoading } = useCPUInfo();

  const isLoading = infoLoading || healthLoading || gpuLoading || cpuLoading;

  return (
    <div>
      <h2>System Information</h2>
      <p>Host hardware and OS details with real-time monitoring.</p>

      {/* Health Status */}
      <div className="card">
        <h3>System Health</h3>
        {healthStatus && (
          <div className="row">
            <div className="col-6">
              <div className="statistic">
                <strong>Status</strong>
                {healthStatus.status === 'healthy' ? (
                  <span>✔️</span>
                ) : (
                  <span>⚠️</span>
                )}
              </div>
            </div>
            <div className="col-6">
              <div className="statistic">
                <strong>Version</strong>
                {healthStatus.version}
              </div>
            </div>
            <div className="col-6">
              <div className="statistic">
                <strong>Uptime</strong>
                {healthStatus.uptime}
              </div>
            </div>
            <div className="col-6">
              <div className="statistic">
                <strong>Last Check</strong>
                {new Date(healthStatus.timestamp * 1000).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* GPU Usage */}
      {gpuUsage && (
        <div className="card">
          <h3>GPU Usage</h3>
          <div className="row">
            {gpuUsage.gpus.map((gpu, index) => (
              <div className="col-6" key={index}>
                <div className="card-small">
                  <h4>{gpu.model}</h4>
                  <div className="row">
                    <div className="col-6">
                      <div className="statistic">
                        <strong>Utilization</strong>
                        {gpu.utilization}%
                      </div>
                      <div className="progress">
                        <div style={{ width: `${gpu.utilization}%` }}></div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="statistic">
                        <strong>VRAM</strong>
                        {`${gpu.vram_used}/${gpu.vram_total} GB`}
                      </div>
                      <div className="progress">
                        <div style={{ width: `${Math.round((gpu.vram_used / gpu.vram_total) * 100)}%` }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="tag">
                    {gpu.used > 0 ? 'Used' : 'Not Used'}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="note">
            {gpuUsage.note}
          </div>
        </div>
      )}

      {/* CPU Information */}
      {cpuInfo && (
        <div className="card">
          <h3>CPU Information</h3>
          <div className="row">
            <div className="col-8">
              <div className="statistic">
                <strong>Model</strong>
                {cpuInfo.model}
              </div>
            </div>
            <div className="col-4">
              <div className="statistic">
                <strong>Cores</strong>
                {cpuInfo.cores}
              </div>
            </div>
            <div className="col-4">
              <div className="statistic">
                <strong>Sockets</strong>
                {cpuInfo.sockets}
              </div>
            </div>
            <div className="col-4">
              <div className="statistic">
                <strong>Threads</strong>
                {cpuInfo.threads}
              </div>
            </div>
            <div className="col-4">
              <div className="statistic">
                <strong>NUMA Nodes</strong>
                {cpuInfo.numa_nodes}
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-8">
              <div className="statistic">
                <strong>Frequency</strong>
                {cpuInfo.frequency} MHz
              </div>
            </div>
            <div className="col-8">
              <div className="statistic">
                <strong>Cache</strong>
                {cpuInfo.cache} KB
              </div>
            </div>
          </div>
          <div className="note">
            <h4>CPU Flags:</h4>
            <div className="flags">
              {cpuInfo.flags.map((flag, index) => (
                <span key={index} className="flag">{flag}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* System Details */}
      <div className="row">
        <div className="col-24 col-md-12">
          <div className="card">
            <h3>CPU Details</h3>
            <table>
              <tbody>
                {systemInfo?.cpu && Object.entries(systemInfo.cpu).map(([k, v]) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td>{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="col-24 col-md-12">
          <div className="card">
            <h3>Memory Details</h3>
            <table>
              <tbody>
                {systemInfo?.memory && Object.entries(systemInfo.memory).map(([k, v]) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td>{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="col-24 col-md-12">
          <div className="card">
            <h3>Disk Information</h3>
            <table>
              <tbody>
                {Array.isArray(systemInfo?.disk) ? systemInfo?.disk.map((disk: any, i: number) => (
                  <tr key={i}>
                    <td>{disk.device || `Disk ${i+1}`}</td>
                    <td>{disk.total ? `${disk.total} bytes` : JSON.stringify(disk)}</td>
                  </tr>
                )) : null}
              </tbody>
            </table>
          </div>
        </div>
        <div className="col-24 col-md-12">
          <div className="card">
            <h3>Network Information</h3>
            <table>
              <tbody>
                {Array.isArray(systemInfo?.network) ? systemInfo?.network.map((iface: any, i: number) => (
                  <tr key={i}>
                    <td>{iface.name || `NIC ${i+1}`}</td>
                    <td>{iface.bytes_recv ? `${iface.bytes_recv} bytes received` : JSON.stringify(iface)}</td>
                  </tr>
                )) : null}
              </tbody>
            </table>
          </div>
        </div>
        <div className="col-24">
          <div className="card">
            <h3>Host Information</h3>
            <table>
              <tbody>
                {systemInfo?.host && Object.entries(systemInfo.host).map(([k, v]) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td>{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default System; 