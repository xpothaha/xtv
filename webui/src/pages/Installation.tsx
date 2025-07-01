import React, { useState } from 'react';
import { useInstall, useInstallationStatus } from '../hooks/useInstallation';
import { useNavigate } from 'react-router-dom';

const Installation: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const installMutation = useInstall();
  const { data: installStatus, isLoading } = useInstallationStatus();
  const navigate = useNavigate();

  const steps = [
    {
      title: 'Welcome',
      content: (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <h2>Welcome to XTV</h2>
          <span>
            Let's set up your virtualization platform. This will only take a few minutes.
          </span>
        </div>
      ),
    },
    {
      title: 'Server Configuration',
      content: (
        <form>
          <form.Item
            name="server_name"
            label="Server Name"
            rules={[{ required: true, message: 'Please enter server name' }]}
          >
            <input placeholder="e.g., xtv-server" />
          </form.Item>

          <form.Item
            name="ip_config"
            label="IP Configuration"
            rules={[{ required: true, message: 'Please select IP configuration' }]}
          >
            <select placeholder="Select IP configuration">
              <option value="dhcp">DHCP (Automatic)</option>
              <option value="static">Static IP</option>
            </select>
          </form.Item>

          <form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.ip_config !== currentValues.ip_config}
          >
            {({ getFieldValue }) => 
              getFieldValue('ip_config') === 'static' ? (
                <form.Item
                  name="static_ip"
                  label="Static IP Address"
                  rules={[{ required: true, message: 'Please enter static IP' }]}
                >
                  <input placeholder="e.g., 192.168.1.100" />
                </form.Item>
              ) : null
            }
          </form.Item>
        </form>
      ),
    },
    {
      title: 'Security',
      content: (
        <form>
          <form.Item
            name="password"
            label="Root Password"
            rules={[
              { required: true, message: 'Please enter password' },
              { min: 8, message: 'Password must be at least 8 characters' }
            ]}
          >
            <input type="password" placeholder="Enter root password" />
          </form.Item>

          <form.Item
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
            <input type="password" placeholder="Confirm root password" />
          </form.Item>
        </form>
      ),
    },
    {
      title: 'Installation',
      content: (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <h2>Ready to Install</h2>
          <span>
            Click Install to complete the setup. This may take a few minutes.
          </span>
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
        <div style={{ width: 500, textAlign: 'center' }}>
          <h2>XTV Already Installed</h2>
          <span>
            XTV is already installed and running on this server.
          </span>
          <br />
          <button type="primary" onClick={() => navigate('/login')}>
            Go to Login
          </button>
        </div>
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
      <div style={{ width: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ color: '#1890ff' }}>XTV Installation</h2>
        </div>

        <div style={{ marginBottom: 32 }}>
          {steps.map(item => (
            <div key={item.title} style={{ display: 'inline-block', marginRight: 8 }}>
              <button onClick={() => setCurrentStep(steps.indexOf(item))} style={{ background: currentStep === steps.indexOf(item) ? '#1890ff' : 'transparent', color: currentStep === steps.indexOf(item) ? '#fff' : 'inherit', border: 'none', padding: '8px 16px', cursor: 'pointer' }}>
                {item.title}
              </button>
            </div>
          ))}
        </div>

        <div style={{ minHeight: 200 }}>
          {steps[currentStep].content}
        </div>

        {installMutation.isError && (
          <div style={{ marginBottom: 16 }}>
            <Alert message="Install failed" description={installMutation.error?.message} type="error" showIcon />
          </div>
        )}

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          {currentStep > 0 && (
            <button style={{ marginRight: 8 }} onClick={prev}>
              Previous
            </button>
          )}
          {currentStep < steps.length - 1 && (
            <button type="primary" onClick={next}>
              Next
            </button>
          )}
          {currentStep === steps.length - 1 && (
            <button 
              type="primary" 
              onClick={handleInstall}
              loading={installMutation.isPending}
            >
              Install
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Installation; 