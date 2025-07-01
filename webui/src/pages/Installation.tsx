import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Select, Steps, Alert } from 'antd';
import { useInstall, useInstallationStatus } from '../hooks/useInstallation';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const Installation: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const installMutation = useInstall();
  const { data: installStatus, isLoading } = useInstallationStatus();
  const navigate = useNavigate();

  const steps = [
    {
      title: 'Welcome',
      content: (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Title level={2}>Welcome to XTV</Title>
          <Text type="secondary">
            Let's set up your virtualization platform. This will only take a few minutes.
          </Text>
        </div>
      ),
    },
    {
      title: 'Server Configuration',
      content: (
        <Form form={form} layout="vertical">
          <Form.Item
            name="server_name"
            label="Server Name"
            rules={[{ required: true, message: 'Please enter server name' }]}
          >
            <Input placeholder="e.g., xtv-server" />
          </Form.Item>

          <Form.Item
            name="ip_config"
            label="IP Configuration"
            rules={[{ required: true, message: 'Please select IP configuration' }]}
          >
            <Select placeholder="Select IP configuration">
              <Select.Option value="dhcp">DHCP (Automatic)</Select.Option>
              <Select.Option value="static">Static IP</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.ip_config !== currentValues.ip_config}
          >
            {({ getFieldValue }) => 
              getFieldValue('ip_config') === 'static' ? (
                <Form.Item
                  name="static_ip"
                  label="Static IP Address"
                  rules={[{ required: true, message: 'Please enter static IP' }]}
                >
                  <Input placeholder="e.g., 192.168.1.100" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      ),
    },
    {
      title: 'Security',
      content: (
        <Form form={form} layout="vertical">
          <Form.Item
            name="password"
            label="Root Password"
            rules={[
              { required: true, message: 'Please enter password' },
              { min: 8, message: 'Password must be at least 8 characters' }
            ]}
          >
            <Input.Password placeholder="Enter root password" />
          </Form.Item>

          <Form.Item
            name="confirm_password"
            label="Confirm Password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirm root password" />
          </Form.Item>
        </Form>
      ),
    },
    {
      title: 'Installation',
      content: (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Title level={3}>Ready to Install</Title>
          <Text type="secondary">
            Click Install to complete the setup. This may take a few minutes.
          </Text>
        </div>
      ),
    },
  ];

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleInstall = async () => {
    try {
      const values = await form.validateFields();
      await installMutation.mutateAsync(values);
      message.success('Installation completed successfully!');
      navigate('/login');
    } catch (error) {
      message.error('Installation failed. Please try again.');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (installStatus?.installed) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Card style={{ width: 500, textAlign: 'center' }}>
          <Title level={2}>XTV Already Installed</Title>
          <Text type="secondary">
            XTV is already installed and running on this server.
          </Text>
          <br />
          <Button type="primary" onClick={() => navigate('/login')}>
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card style={{ width: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ color: '#1890ff' }}>XTV Installation</Title>
        </div>

        <Steps current={currentStep} style={{ marginBottom: 32 }}>
          {steps.map(item => (
            <Steps.Step key={item.title} title={item.title} />
          ))}
        </Steps>

        <div style={{ minHeight: 200 }}>
          {steps[currentStep].content}
        </div>

        {installMutation.isError && (
          <Alert message="Install failed" description={installMutation.error?.message} type="error" showIcon style={{ marginBottom: 16 }} />
        )}

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          {currentStep > 0 && (
            <Button style={{ marginRight: 8 }} onClick={prev}>
              Previous
            </Button>
          )}
          {currentStep < steps.length - 1 && (
            <Button type="primary" onClick={next}>
              Next
            </Button>
          )}
          {currentStep === steps.length - 1 && (
            <Button 
              type="primary" 
              onClick={handleInstall}
              loading={installMutation.isPending}
            >
              Install
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Installation; 