import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../api';
import { useNetworkEvents } from '../hooks/useNetworkEvents';

interface NetworkStatus {
  interface: string;
  current_ip: string;
  public_ip: string;
  gateway: string;
  netmask: string;
  dns_servers: string;
  ip_config: string;
  auto_detect_ip: boolean;
  last_detected: string;
  last_detected_at: string;
  web_url: string;
  api_url: string;
}

interface NetworkConfig {
  interface: string;
  ip_config: string;
  static_ip?: string;
  gateway?: string;
  netmask?: string;
  dns_servers?: string;
  auto_detect_ip: boolean;
}

interface MigrationStatus {
  status: string;
  message: string;
  progress: number;
  started_at: string;
  completed_at?: string;
}

export default function Network() {
  const { token } = useAuth();
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [networkConfig, setNetworkConfig] = useState<NetworkConfig>({
    interface: 'eth0',
    ip_config: 'dhcp',
    auto_detect_ip: true,
  });
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [vlans, setVlans] = useState<number[]>([10, 20]);
  const [vxlanIds, setVxlanIds] = useState<number[]>([1001]);
  const [floatingIPs, setFloatingIPs] = useState<string[]>(['203.0.113.10']);
  const [firewallRules, setFirewallRules] = useState<any[]>([
    { id: 1, action: 'allow', protocol: 'tcp', port: '22', source: '0.0.0.0/0', dest: 'any' },
  ]);
  const [natRules, setNatRules] = useState<any[]>([
    { id: 1, extIP: '203.0.113.10', extPort: '2222', intIP: '192.168.1.10', intPort: '22' },
  ]);

  useEffect(() => {
    loadNetworkStatus();
    loadInterfaces();
  }, []);

  useNetworkEvents((event) => {
    if (event.type === 'ip_changed') {
      console.log(`IP changed: ${event.data?.new_ip}`);
    } else if (event.type === 'migration') {
      console.log(`Network migration: ${event.data?.status}`);
    } else if (event.type === 'error') {
      console.log(`Network error: ${event.data?.message}`);
    }
    loadNetworkStatus(); // refresh network status on any event
  });

  const loadNetworkStatus = async () => {
    try {
      const response = await api.get('/api/v1/network/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNetworkStatus(response.data);
      setNetworkConfig({
        interface: response.data.interface,
        ip_config: response.data.ip_config,
        static_ip: response.data.public_ip,
        gateway: response.data.gateway,
        netmask: response.data.netmask,
        dns_servers: response.data.dns_servers,
        auto_detect_ip: response.data.auto_detect_ip,
      });
    } catch (err) {
      setError('Failed to load network status');
    }
  };

  const loadInterfaces = async () => {
    try {
      const response = await api.get('/api/v1/network/interfaces', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInterfaces(response.data.interfaces);
    } catch (err) {
      setError('Failed to load network interfaces');
    }
  };

  const updateNetworkConfig = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.put('/api/v1/network/config', networkConfig, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(response.data.message);
      await loadNetworkStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update network configuration');
    } finally {
      setLoading(false);
    }
  };

  const detectNetwork = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post('/api/v1/network/detect', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(response.data.message);
      await loadNetworkStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to detect network');
    } finally {
      setLoading(false);
    }
  };

  const prepareMigration = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post('/api/v1/migration/prepare', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMigrationStatus(response.data);
      setSuccess('Migration preparation completed');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to prepare migration');
    } finally {
      setLoading(false);
    }
  };

  const completeMigration = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post('/api/v1/migration/complete', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(response.data.message);
      await loadNetworkStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to complete migration');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'preparing': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {loading && <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-50"><span>Loading...</span></div>}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Network Management</h1>
        <button 
          onClick={detectNetwork} 
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Detect Network
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Current Network Status */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Current Network Status</h3>
        </div>
        <div className="px-6 py-4">
          {networkStatus && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">Interface</label>
                <p className="text-sm text-gray-600">{networkStatus.interface}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Current IP</label>
                <p className="text-sm text-gray-600">{networkStatus.current_ip}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Public IP</label>
                <p className="text-sm text-gray-600">{networkStatus.public_ip}</p>
              </div>
              <div>
                <label className="text-sm font-medium">IP Config</label>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  networkStatus.ip_config === 'dhcp' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {networkStatus.ip_config.toUpperCase()}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium">Web URL</label>
                <a href={networkStatus.web_url} target="_blank" rel="noopener noreferrer" 
                   className="text-sm text-blue-600 hover:underline block">
                  {networkStatus.web_url}
                </a>
              </div>
              <div>
                <label className="text-sm font-medium">API URL</label>
                <a href={networkStatus.api_url} target="_blank" rel="noopener noreferrer"
                   className="text-sm text-blue-600 hover:underline block">
                  {networkStatus.api_url}
                </a>
              </div>
              <div>
                <label className="text-sm font-medium">Auto Detect IP</label>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  networkStatus.auto_detect_ip ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {networkStatus.auto_detect_ip ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium">Last Detected</label>
                <p className="text-sm text-gray-600">
                  {networkStatus.last_detected_at ? new Date(networkStatus.last_detected_at).toLocaleString() : 'Never'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Network Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Network Configuration</h3>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="interface" className="text-sm font-medium block mb-2">Network Interface</label>
              <select
                id="interface"
                value={networkConfig.interface}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNetworkConfig({...networkConfig, interface: e.target.value})}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {interfaces.map((iface) => (
                  <option key={iface} value={iface}>{iface}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ip_config" className="text-sm font-medium block mb-2">IP Configuration</label>
              <select
                id="ip_config"
                value={networkConfig.ip_config}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNetworkConfig({...networkConfig, ip_config: e.target.value})}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="dhcp">DHCP</option>
                <option value="static">Static IP</option>
              </select>
            </div>

            {networkConfig.ip_config === 'static' && (
              <>
                <div>
                  <label htmlFor="static_ip" className="text-sm font-medium block mb-2">Static IP</label>
                  <input
                    id="static_ip"
                    type="text"
                    value={networkConfig.static_ip || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNetworkConfig({...networkConfig, static_ip: e.target.value})}
                    placeholder="192.168.1.100"
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="gateway" className="text-sm font-medium block mb-2">Gateway</label>
                  <input
                    id="gateway"
                    type="text"
                    value={networkConfig.gateway || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNetworkConfig({...networkConfig, gateway: e.target.value})}
                    placeholder="192.168.1.1"
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="netmask" className="text-sm font-medium block mb-2">Netmask</label>
                  <input
                    id="netmask"
                    type="text"
                    value={networkConfig.netmask || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNetworkConfig({...networkConfig, netmask: e.target.value})}
                    placeholder="255.255.255.0"
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="dns_servers" className="text-sm font-medium block mb-2">DNS Servers</label>
                  <input
                    id="dns_servers"
                    type="text"
                    value={networkConfig.dns_servers || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNetworkConfig({...networkConfig, dns_servers: e.target.value})}
                    placeholder="8.8.8.8,8.8.4.4"
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                role="switch"
                aria-checked={networkConfig.auto_detect_ip}
                onClick={() => setNetworkConfig({...networkConfig, auto_detect_ip: !networkConfig.auto_detect_ip})}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  networkConfig.auto_detect_ip ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    networkConfig.auto_detect_ip ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <label htmlFor="auto_detect" className="text-sm font-medium">Auto-detect IP address</label>
            </div>
          </div>

          <button 
            onClick={updateNetworkConfig} 
            disabled={loading} 
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Configuration'}
          </button>
        </div>
      </div>

      {/* Network Migration */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Network Migration</h3>
        </div>
        <div className="px-6 py-4 space-y-4">
          <p className="text-sm text-gray-600">
            Use this section when moving the server to a different network. 
            The system will automatically detect the new IP address and update all URLs.
          </p>

          {migrationStatus && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(migrationStatus.status)} text-white`}>
                  {migrationStatus.status}
                </span>
                <span className="text-sm">{migrationStatus.message}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(Math.max(migrationStatus.progress, 0), 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                Started: {new Date(migrationStatus.started_at).toLocaleString()}
                {migrationStatus.completed_at && 
                  ` | Completed: ${new Date(migrationStatus.completed_at).toLocaleString()}`}
              </p>
            </div>
          )}

          <div className="flex space-x-2">
            <button 
              onClick={prepareMigration} 
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Prepare Migration
            </button>
            {migrationStatus?.status === 'ready' && (
              <button 
                onClick={completeMigration} 
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                Complete Migration
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Network Advanced Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mt-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Network Advanced</h3>
        </div>
        <div className="px-6 py-4 space-y-6">
          {/* VLAN */}
          <div>
            <h4 className="font-semibold mb-2">VLANs</h4>
            <div className="flex flex-wrap gap-2 mb-2">
              {vlans.map(vlan => (
                <span key={vlan} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                  VLAN {vlan}
                  <button onClick={() => setVlans(vlans.filter(v => v !== vlan))} className="ml-2 text-red-500">×</button>
                </span>
              ))}
              <button onClick={() => {
                const newVlan = prompt('Add VLAN ID:');
                if (newVlan && !vlans.includes(Number(newVlan))) setVlans([...vlans, Number(newVlan)]);
              }} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">+ Add VLAN</button>
            </div>
          </div>
          {/* VXLAN */}
          <div>
            <h4 className="font-semibold mb-2">VXLANs</h4>
            <div className="flex flex-wrap gap-2 mb-2">
              {vxlanIds.map(id => (
                <span key={id} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium">
                  VXLAN {id}
                  <button onClick={() => setVxlanIds(vxlanIds.filter(v => v !== id))} className="ml-2 text-red-500">×</button>
                </span>
              ))}
              <button onClick={() => {
                const newId = prompt('Add VXLAN ID:');
                if (newId && !vxlanIds.includes(Number(newId))) setVxlanIds([...vxlanIds, Number(newId)]);
              }} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">+ Add VXLAN</button>
            </div>
          </div>
          {/* Floating IPs */}
          <div>
            <h4 className="font-semibold mb-2">Floating IPs</h4>
            <div className="flex flex-wrap gap-2 mb-2">
              {floatingIPs.map(ip => (
                <span key={ip} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">
                  {ip}
                  <button onClick={() => setFloatingIPs(floatingIPs.filter(f => f !== ip))} className="ml-2 text-red-500">×</button>
                </span>
              ))}
              <button onClick={() => {
                const newIp = prompt('Add Floating IP:');
                if (newIp && !floatingIPs.includes(newIp)) setFloatingIPs([...floatingIPs, newIp]);
              }} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">+ Add IP</button>
            </div>
          </div>
          {/* Firewall Rules */}
          <div>
            <h4 className="font-semibold mb-2">Firewall Rules</h4>
            <table className="min-w-full text-xs border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-2 py-1">Action</th>
                  <th className="px-2 py-1">Protocol</th>
                  <th className="px-2 py-1">Port</th>
                  <th className="px-2 py-1">Source</th>
                  <th className="px-2 py-1">Destination</th>
                  <th className="px-2 py-1">Remove</th>
                </tr>
              </thead>
              <tbody>
                {firewallRules.map(rule => (
                  <tr key={rule.id}>
                    <td className="px-2 py-1">{rule.action}</td>
                    <td className="px-2 py-1">{rule.protocol}</td>
                    <td className="px-2 py-1">{rule.port}</td>
                    <td className="px-2 py-1">{rule.source}</td>
                    <td className="px-2 py-1">{rule.dest}</td>
                    <td className="px-2 py-1">
                      <button onClick={() => setFirewallRules(firewallRules.filter(r => r.id !== rule.id))} className="text-red-500">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => {
              const action = prompt('Action (allow/deny):', 'allow');
              const protocol = prompt('Protocol (tcp/udp):', 'tcp');
              const port = prompt('Port:', '80');
              const source = prompt('Source:', '0.0.0.0/0');
              const dest = prompt('Destination:', 'any');
              if (action && protocol && port && source && dest) {
                setFirewallRules([...firewallRules, {
                  id: Date.now(), action, protocol, port, source, dest
                }]);
              }
            }} className="mt-2 bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">+ Add Rule</button>
          </div>
          {/* NAT/Port Forwarding */}
          <div>
            <h4 className="font-semibold mb-2">NAT / Port Forwarding</h4>
            <table className="min-w-full text-xs border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-2 py-1">External IP</th>
                  <th className="px-2 py-1">External Port</th>
                  <th className="px-2 py-1">Internal IP</th>
                  <th className="px-2 py-1">Internal Port</th>
                  <th className="px-2 py-1">Remove</th>
                </tr>
              </thead>
              <tbody>
                {natRules.map(rule => (
                  <tr key={rule.id}>
                    <td className="px-2 py-1">{rule.extIP}</td>
                    <td className="px-2 py-1">{rule.extPort}</td>
                    <td className="px-2 py-1">{rule.intIP}</td>
                    <td className="px-2 py-1">{rule.intPort}</td>
                    <td className="px-2 py-1">
                      <button onClick={() => setNatRules(natRules.filter(r => r.id !== rule.id))} className="text-red-500">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => {
              const extIP = prompt('External IP:', '203.0.113.10');
              const extPort = prompt('External Port:', '2222');
              const intIP = prompt('Internal IP:', '192.168.1.10');
              const intPort = prompt('Internal Port:', '22');
              if (extIP && extPort && intIP && intPort) {
                setNatRules([...natRules, {
                  id: Date.now(), extIP, extPort, intIP, intPort
                }]);
              }
            }} className="mt-2 bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">+ Add NAT Rule</button>
          </div>
        </div>
      </div>
    </div>
  );
} 