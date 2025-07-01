import React, { useState } from 'react';
import { SaveOutlined, ReloadOutlined, UserOutlined, LockOutlined, KeyOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-layout';
import { useChangePassword, useResetPassword, useQuota, useLogout } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const { TabPane } = Tabs;

const Settings: React.FC = () => {
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const navigate = useNavigate();

  const changePasswordMutation = useChangePassword();
  const resetPasswordMutation = useResetPassword();
  const logoutMutation = useLogout();
  const { data: quotaInfo, isLoading: quotaLoading } = useQuota('root');

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      // TODO: Implement settings save API call
      console.log('Saving settings:', values);
      message.success('Settings saved successfully');
    } catch (error) {
      message.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    message.info('Settings reset to defaults');
  };

  const handleChangePassword = async (values: any) => {
    try {
      await changePasswordMutation.mutateAsync(values);
      message.success('Password changed successfully');
      setPasswordModalVisible(false);
      passwordForm.resetFields();
    } catch (error) {
      message.error('Failed to change password');
    }
  };

  const handleResetPassword = async (values: any) => {
    try {
      await resetPasswordMutation.mutateAsync(values);
      message.success('Password reset successfully');
      setPasswordModalVisible(false);
      passwordForm.resetFields();
    } catch (error) {
      message.error('Failed to reset password');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      message.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      message.error('Failed to logout');
    }
  };

  return (
    <PageContainer>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>System Settings</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            Reset
          </Button>
          <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={() => form.submit()}>
            Save Settings
          </Button>
        </Space>
      </div>

      <Tabs defaultActiveKey="general">
        <TabPane tab="General" key="general">
          <form
            onFinish={handleSave}
            initialValues={{
              api_port: 8080,
              max_vms: 10,
              enable_monitoring: true,
              enable_audit_logs: true,
              default_memory: 2048,
              default_cpus: 2,
              storage_path: '/var/lib/xtv',
              backup_enabled: false,
              auto_start_vms: false,
            }}
          >
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
                  <h3>API Configuration</h3>
                  <Form.Item name="api_port" label="API Port">
                    <input type="number" min={1024} max={65535} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="api_host" label="API Host">
                    <input placeholder="0.0.0.0" />
                  </Form.Item>
                  <Form.Item name="enable_cors" label="Enable CORS" valuePropName="checked">
                    <input type="checkbox" />
                  </Form.Item>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
                  <h3>VM Limits</h3>
                  <Form.Item name="max_vms" label="Maximum VMs">
                    <input type="number" min={1} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="default_memory" label="Default Memory (MB)">
                    <input type="number" min={512} max={32768} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="default_cpus" label="Default CPUs">
                    <input type="number" min={1} max={32} style={{ width: '100%' }} />
                  </Form.Item>
                </div>
              </Col>
            </Row>

            <Divider />

            <Row gutter={24}>
              <Col xs={24} md={12}>
                <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
                  <h3>Storage</h3>
                  <Form.Item name="storage_path" label="Storage Path">
                    <input />
                  </Form.Item>
                  <Form.Item name="backup_enabled" label="Enable Backups" valuePropName="checked">
                    <input type="checkbox" />
                  </Form.Item>
                  <Form.Item name="backup_path" label="Backup Path">
                    <input />
                  </Form.Item>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
                  <h3>Monitoring</h3>
                  <Form.Item name="enable_monitoring" label="Enable System Monitoring" valuePropName="checked">
                    <input type="checkbox" />
                  </Form.Item>
                  <Form.Item name="monitoring_interval" label="Monitoring Interval (seconds)">
                    <input type="number" min={5} max={300} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="enable_audit_logs" label="Enable Audit Logs" valuePropName="checked">
                    <input type="checkbox" />
                  </Form.Item>
                </div>
              </Col>
            </Row>

            <Divider />

            <Row gutter={24}>
              <Col xs={24} md={12}>
                <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
                  <h3>VM Behavior</h3>
                  <Form.Item name="auto_start_vms" label="Auto-start VMs on Boot" valuePropName="checked">
                    <input type="checkbox" />
                  </Form.Item>
                  <Form.Item name="vm_timeout" label="VM Operation Timeout (seconds)">
                    <input type="number" min={30} max={300} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="enable_vnc" label="Enable VNC Console" valuePropName="checked">
                    <input type="checkbox" />
                  </Form.Item>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
                  <h3>Security</h3>
                  <Form.Item name="enable_ssl" label="Enable SSL/TLS" valuePropName="checked">
                    <input type="checkbox" />
                  </Form.Item>
                  <Form.Item name="ssl_cert_path" label="SSL Certificate Path">
                    <input />
                  </Form.Item>
                  <Form.Item name="ssl_key_path" label="SSL Private Key Path">
                    <input />
                  </Form.Item>
                </div>
              </Col>
            </Row>
          </form>
        </TabPane>

        <TabPane tab="Authentication" key="auth">
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
                <h3>Password Management</h3>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    icon={<LockOutlined />} 
                    onClick={() => setPasswordModalVisible(true)}
                    block
                  >
                    Change Password
                  </Button>
                  <Button 
                    icon={<KeyOutlined />} 
                    onClick={() => setPasswordModalVisible(true)}
                    block
                  >
                    Reset Password
                  </Button>
                  <Button 
                    icon={<UserOutlined />} 
                    onClick={handleLogout}
                    danger
                    block
                  >
                    Logout
                  </Button>
                </Space>
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
                <h3>User Quota</h3>
                {quotaInfo && (
                  <div>
                    <Row gutter={16}>
                      <Col span={12}>
                        <span style={{ fontWeight: 600 }}>{quotaInfo.usage.vms}</span>
                        <progress value={quotaInfo.usage.vms} max={quotaInfo.quota.max_vms} />
                      </Col>
                      <Col span={12}>
                        <span style={{ fontWeight: 600 }}>{quotaInfo.usage.cpu}</span>
                        <progress value={quotaInfo.usage.cpu} max={quotaInfo.quota.max_cpu} />
                      </Col>
                    </Row>
                    <Row gutter={16} style={{ marginTop: 16 }}>
                      <Col span={12}>
                        <span style={{ fontWeight: 600 }}>{quotaInfo.usage.memory}</span>
                        <progress value={quotaInfo.usage.memory} max={quotaInfo.quota.max_memory} />
                      </Col>
                      <Col span={12}>
                        <span style={{ fontWeight: 600 }}>{quotaInfo.usage.storage}</span>
                        <progress value={quotaInfo.usage.storage} max={quotaInfo.quota.max_storage} />
                      </Col>
                    </Row>
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </TabPane>
      </Tabs>

      {/* Password Change Modal */}
      <div style={{ background: '#fff', border: '1px solid #ccc', padding: 16 }}>
        <Tabs defaultActiveKey="change">
          <TabPane tab="Change Password" key="change">
            <form onFinish={handleChangePassword} layout="vertical">
              <Form.Item
                name="current_password"
                label="Current Password"
                rules={[{ required: true, message: 'Please enter current password' }]}
              >
                <input type="password" />
              </Form.Item>
              <Form.Item
                name="new_password"
                label="New Password"
                rules={[
                  { required: true, message: 'Please enter new password' },
                  { min: 8, message: 'Password must be at least 8 characters' }
                ]}
              >
                <input type="password" />
              </Form.Item>
              <Form.Item
                name="confirm_password"
                label="Confirm Password"
                dependencies={['new_password']}
                rules={[
                  { required: true, message: 'Please confirm password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('new_password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Passwords do not match'));
                    },
                  }),
                ]}
              >
                <input type="password" />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={changePasswordMutation.isPending}>
                    Change Password
                  </Button>
                  <Button onClick={() => setPasswordModalVisible(false)}>
                    Cancel
                  </Button>
                </Space>
              </Form.Item>
            </form>
          </TabPane>
          <TabPane tab="Reset Password" key="reset">
            <form onFinish={handleResetPassword} layout="vertical">
              <Form.Item
                name="new_password"
                label="New Password"
                rules={[
                  { required: true, message: 'Please enter new password' },
                  { min: 8, message: 'Password must be at least 8 characters' }
                ]}
              >
                <input type="password" />
              </Form.Item>
              <Form.Item
                name="confirm_password"
                label="Confirm Password"
                dependencies={['new_password']}
                rules={[
                  { required: true, message: 'Please confirm password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('new_password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Passwords do not match'));
                    },
                  }),
                ]}
              >
                <input type="password" />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={resetPasswordMutation.isPending}>
                    Reset Password
                  </Button>
                  <Button onClick={() => setPasswordModalVisible(false)}>
                    Cancel
                  </Button>
                </Space>
              </Form.Item>
            </form>
          </TabPane>
        </Tabs>
      </div>
    </PageContainer>
  );
};

export default Settings; 