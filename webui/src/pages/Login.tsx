import React from 'react';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useLogin } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const loginMutation = useLogin();
  const navigate = useNavigate();

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      await loginMutation.mutateAsync(values);
      message.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      message.error('Login failed. Please check your credentials.');
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <strong style={{ color: '#1890ff', fontSize: '24px' }}>XTV</strong>
          <h2 style={{ color: '#1890ff' }}>XTV</h2>
          <span style={{ color: '#1890ff' }}>Virtualization Platform</span>
        </div>

        <form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
        >
          <form.Item
            name="username"
            rules={[{ required: true, message: 'Please input your username!' }]}
          >
            <input 
              prefix={<UserOutlined />} 
              placeholder="Username" 
              size="large"
            />
          </form.Item>

          <form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <input.Password 
              prefix={<LockOutlined />} 
              placeholder="Password" 
              size="large"
            />
          </form.Item>

          <form.Item>
            <button 
              type="primary" 
              htmlType="submit" 
              size="large" 
              block
              loading={loginMutation.isPending}
            >
              Log in
            </button>
          </form.Item>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <span style={{ color: '#1890ff' }}>Default: root / your-installation-password</span>
        </div>
      </div>
    </div>
  );
};

export default Login; 