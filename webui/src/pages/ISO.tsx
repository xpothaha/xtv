import React, { useState } from 'react';
import { UploadOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { useISOs, useUploadISO, useDeleteISO } from '../hooks/useISOs';
import { PageContainer } from '@ant-design/pro-layout';

const ISO: React.FC = () => {
  const { data: isos, isLoading, error } = useISOs();
  const uploadMutation = useUploadISO();
  const deleteMutation = useDeleteISO();
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      await uploadMutation.mutateAsync(formData);
      message.success('ISO uploaded successfully');
      setUploadModalVisible(false);
      setUploadProgress(0);
    } catch (error) {
      message.error('Failed to upload ISO');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      message.success('ISO deleted successfully');
    } catch (error) {
      message.error('Failed to delete ISO');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => formatFileSize(size),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button 
            icon={<DownloadOutlined />} 
            size="small"
            onClick={() => window.open(`/api/isos/${record.id}/download`)}
          >
            Download
          </Button>
          <span onClick={() => handleDelete(record.id)} style={{ cursor: 'pointer', color: 'red', marginLeft: 8 }}>
            Delete
          </span>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>ISO Images</h2>
          <Button 
            type="primary" 
            icon={<UploadOutlined />}
            onClick={() => setUploadModalVisible(true)}
          >
            Upload ISO
          </Button>
        </div>

        {error && <div style={{ color: 'red', marginBottom: 16 }}>Failed to load ISOs: {error.message}</div>}

        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isos.map((iso) => (
              <tr key={iso.id}>
                {columns.map((column) => (
                  <td key={`${iso.id}-${column.key}`}>{column.render ? column.render(iso[column.dataIndex as keyof typeof iso]) : iso[column.dataIndex as keyof typeof iso]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <Modal
          title="Upload ISO Image"
          open={uploadModalVisible}
          onCancel={() => setUploadModalVisible(false)}
          footer={null}
        >
          <input type="file"
            accept=".iso"
            onChange={(e) => {
              if (e.target.files) {
                handleUpload(e.target.files[0]);
              }
            }}
          />
          {uploadProgress > 0 && <progress value={uploadProgress} max={100} />}
        </Modal>
      </Card>
    </PageContainer>
  );
};

export default ISO; 