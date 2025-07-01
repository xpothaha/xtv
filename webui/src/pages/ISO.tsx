import React, { useState } from 'react';
import { Table, Button, Upload, Modal, message, Popconfirm, Space, Card, Progress } from 'antd';
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
          <Popconfirm
            title="Are you sure you want to delete this ISO?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button 
              icon={<DeleteOutlined />} 
              size="small" 
              danger
            >
              Delete
            </Button>
          </Popconfirm>
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

        <Table
          columns={columns}
          dataSource={isos}
          loading={isLoading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />

        <Modal
          title="Upload ISO Image"
          open={uploadModalVisible}
          onCancel={() => setUploadModalVisible(false)}
          footer={null}
        >
          <Upload.Dragger
            beforeUpload={(file) => {
              handleUpload(file);
              return false;
            }}
            accept=".iso"
            showUploadList={false}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">Click or drag ISO file to upload</p>
            <p className="ant-upload-hint">Support for .iso files only</p>
          </Upload.Dragger>
          {uploadProgress > 0 && <Progress percent={uploadProgress} />}
        </Modal>
      </Card>
    </PageContainer>
  );
};

export default ISO; 