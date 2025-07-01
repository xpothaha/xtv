import React, { useState } from 'react';
import { PageContainer } from '@ant-design/pro-layout';

const mockLogs = [
  { id: 1, time: '2024-05-01 10:00:00', user: 'root', action: 'Login', status: 'success', ip: '192.168.1.10' },
  { id: 2, time: '2024-05-01 10:05:00', user: 'root', action: 'Create VM', status: 'success', ip: '192.168.1.10' },
  { id: 3, time: '2024-05-01 10:10:00', user: 'root', action: 'Delete VM', status: 'fail', ip: '192.168.1.10' },
  { id: 4, time: '2024-05-01 10:15:00', user: 'root', action: 'Update Network', status: 'success', ip: '192.168.1.10' },
];

const AuditLog: React.FC = () => {
  const [rateLimited, setRateLimited] = useState(false);

  return (
    <PageContainer>
      <div className="card">
        <h2>Audit Log & Rate Limit</h2>
        {rateLimited && (
          <div className="alert">
            API Rate Limit Exceeded
            <br />
            You have reached the maximum number of API requests. Please wait and try again.
          </div>
        )}
        <button onClick={() => setRateLimited(!rateLimited)} style={{ marginBottom: 16 }}>
          {rateLimited ? 'Clear Rate Limit Alert' : 'Simulate Rate Limit'}
        </button>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Status</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {mockLogs.map((log) => (
              <tr key={log.id}>
                <td>{log.time}</td>
                <td>{log.user}</td>
                <td>{log.action}</td>
                <td>{log.status.toUpperCase()}</td>
                <td>{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
};

export default AuditLog; 