import React, { useState } from 'react';
import { useChangePassword, useResetPassword, useQuota, useLogout } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const Settings: React.FC = () => {
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
      alert('Settings saved successfully');
    } catch (error) {
      alert('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    alert('Settings reset to defaults');
  };

  const handleChangePassword = async (values: any) => {
    try {
      await changePasswordMutation.mutateAsync(values);
      alert('Password changed successfully');
      setPasswordModalVisible(false);
    } catch (error) {
      alert('Failed to change password');
    }
  };

  const handleResetPassword = async (values: any) => {
    try {
      await resetPasswordMutation.mutateAsync(values);
      alert('Password reset successfully');
      setPasswordModalVisible(false);
    } catch (error) {
      alert('Failed to reset password');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      alert('Logged out successfully');
      navigate('/login');
    } catch (error) {
      alert('Failed to logout');
    }
  };

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>System Settings</h2>
        <div>
          <button onClick={handleReset}>
            Reset
          </button>
          <button type="primary" loading={loading} onClick={() => handleSave({})}>
            Save Settings
          </button>
        </div>
      </div>

      <section>
        <Tabs defaultActiveKey="general">
          <div tab="General" key="general">
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
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '48%' }}>
                  <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
                    <h3>API Configuration</h3>
                    <label>API Port</label>
                    <input type="number" min={1024} max={65535} style={{ width: '100%' }} />
                    <label>API Host</label>
                    <input placeholder="0.0.0.0" />
                    <label>Enable CORS</label>
                    <input type="checkbox" />
                  </div>
                </div>
                <div style={{ width: '48%' }}>
                  <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
                    <h3>VM Limits</h3>
                    <label>Maximum VMs</label>
                    <input type="number" min={1} max={100} style={{ width: '100%' }} />
                    <label>Default Memory (MB)</label>
                    <input type="number" min={512} max={32768} style={{ width: '100%' }} />
                    <label>Default CPUs</label>
                    <input type="number" min={1} max={32} style={{ width: '100%' }} />
                  </div>
                </div>
              </div>

              <hr />

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '48%' }}>
                  <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
                    <h3>Storage</h3>
                    <label>Storage Path</label>
                    <input />
                    <label>Enable Backups</label>
                    <input type="checkbox" />
                    <label>Backup Path</label>
                    <input />
                  </div>
                </div>
                <div style={{ width: '48%' }}>
                  <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
                    <h3>Monitoring</h3>
                    <label>Enable System Monitoring</label>
                    <input type="checkbox" />
                    <label>Monitoring Interval (seconds)</label>
                    <input type="number" min={5} max={300} style={{ width: '100%' }} />
                    <label>Enable Audit Logs</label>
                    <input type="checkbox" />
                  </div>
                </div>
              </div>

              <hr />

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '48%' }}>
                  <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
                    <h3>VM Behavior</h3>
                    <label>Auto-start VMs on Boot</label>
                    <input type="checkbox" />
                    <label>VM Operation Timeout (seconds)</label>
                    <input type="number" min={30} max={300} style={{ width: '100%' }} />
                    <label>Enable VNC Console</label>
                    <input type="checkbox" />
                  </div>
                </div>
                <div style={{ width: '48%' }}>
                  <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
                    <h3>Security</h3>
                    <label>Enable SSL/TLS</label>
                    <input type="checkbox" />
                    <label>SSL Certificate Path</label>
                    <input />
                    <label>SSL Private Key Path</label>
                    <input />
                  </div>
                </div>
              </div>
            </form>
          </div>

          <div tab="Authentication" key="auth">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: '48%' }}>
                <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
                  <h3>Password Management</h3>
                  <button 
                    onClick={() => setPasswordModalVisible(true)}
                    style={{ width: '100%', padding: '8px 16px' }}
                  >
                    Change Password
                  </button>
                  <button 
                    onClick={() => setPasswordModalVisible(true)}
                    style={{ width: '100%', padding: '8px 16px' }}
                  >
                    Reset Password
                  </button>
                  <button 
                    onClick={handleLogout}
                    style={{ width: '100%', padding: '8px 16px', backgroundColor: 'red', color: 'white' }}
                  >
                    Logout
                  </button>
                </div>
              </div>
              <div style={{ width: '48%' }}>
                <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
                  <h3>User Quota</h3>
                  {quotaInfo && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600 }}>{quotaInfo.usage.vms}</span>
                        <progress value={quotaInfo.usage.vms} max={quotaInfo.quota.max_vms} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                        <span style={{ fontWeight: 600 }}>{quotaInfo.usage.cpu}</span>
                        <progress value={quotaInfo.usage.cpu} max={quotaInfo.quota.max_cpu} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                        <span style={{ fontWeight: 600 }}>{quotaInfo.usage.memory}</span>
                        <progress value={quotaInfo.usage.memory} max={quotaInfo.quota.max_memory} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                        <span style={{ fontWeight: 600 }}>{quotaInfo.usage.storage}</span>
                        <progress value={quotaInfo.usage.storage} max={quotaInfo.quota.max_storage} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Tabs>
      </section>

      {/* Password Change Modal */}
      <div style={{ background: '#fff', border: '1px solid #ccc', padding: 16 }}>
        <section>
          <div tab="Change Password" key="change">
            <form onFinish={handleChangePassword} layout="vertical">
              <label>Current Password</label>
              <input type="password" />
              <label>New Password</label>
              <input type="password" />
              <label>Confirm Password</label>
              <input type="password" />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button type="primary" htmlType="submit" loading={changePasswordMutation.isPending}>
                  Change Password
                </button>
                <button onClick={() => setPasswordModalVisible(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
          <div tab="Reset Password" key="reset">
            <form onFinish={handleResetPassword} layout="vertical">
              <label>New Password</label>
              <input type="password" />
              <label>Confirm Password</label>
              <input type="password" />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button type="primary" htmlType="submit" loading={resetPasswordMutation.isPending}>
                  Reset Password
                </button>
                <button onClick={() => setPasswordModalVisible(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </>
  );
};

export default Settings; 