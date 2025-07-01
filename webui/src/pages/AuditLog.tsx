import React, { useState } from 'react';
import { Card, Table, Tag, Alert, Button } from 'antd';
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
      <Card title="Audit Log & Rate Limit">
        {rateLimited && (
          <Alert
            message="API Rate Limit Exceeded"
            description="You have reached the maximum number of API requests. Please wait and try again."
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <Button onClick={() => setRateLimited(!rateLimited)} style={{ marginBottom: 16 }}>
          {rateLimited ? 'Clear Rate Limit Alert' : 'Simulate Rate Limit'}
        </Button>
        <Table
          columns={[
            { title: 'Time', dataIndex: 'time', key: 'time' },
            { title: 'User', dataIndex: 'user', key: 'user' },
            { title: 'Action', dataIndex: 'action', key: 'action' },
            { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => (
              <Tag color={status === 'success' ? 'green' : 'red'}>{status.toUpperCase()}</Tag>
            ) },
            { title: 'IP', dataIndex: 'ip', key: 'ip' },
          ]}
          dataSource={mockLogs}
          rowKey="id"
          pagination={false}
        />
      </Card>
    </PageContainer>
  );
};

export default AuditLog; 