# XTV Web UI

Modern React-based web interface for XTV virtualization platform with complete feature coverage.

## Features

### 🎯 Core Features
- **Dashboard**: Real-time system monitoring with live stats and WebSocket integration
- **VM Management**: Complete VM lifecycle management (Create, Start, Stop, Pause, Resume, Restart, Delete)
- **System Monitoring**: Comprehensive CPU, memory, disk, network monitoring with health status
- **ISO Management**: Upload, download, delete ISO images with drag & drop
- **GPU Management**: GPU monitoring and vGPU profile management with real-time updates
- **Settings**: System configuration and user preferences with authentication management

### 🔐 Authentication & Security
- **Login System**: Secure authentication with JWT tokens
- **Password Management**: Change password, reset password functionality
- **Protected Routes**: Route protection for authenticated users only
- **User Quota**: Resource usage monitoring and limits
- **Session Management**: Automatic token handling and logout

### 🔄 Real-time Monitoring
- **WebSocket Integration**: Bidirectional real-time communication
- **Live System Statistics**: CPU, memory, disk, network monitoring
- **VM Status Monitoring**: Real-time VM state updates
- **GPU Usage Tracking**: Live GPU utilization and VRAM monitoring
- **Health Status**: System health checks and alerts
- **Auto-reconnection**: Robust connection handling with fallback

### 🎨 Modern UI/UX
- **Ant Design Pro**: Professional layout and components
- **Responsive Design**: Mobile-friendly interface
- **Installation Wizard**: Step-by-step first-time setup
- **Real-time Updates**: Live data with visual indicators
- **Interactive Charts**: Progress bars and statistics
- **Modal Dialogs**: Clean user interactions

### 🚀 Advanced VM Controls
- **Full VM Lifecycle**: Start, Stop, Pause, Resume, Restart operations
- **VM Statistics**: Detailed performance metrics (CPU, Memory, Disk, Network)
- **Resource Monitoring**: Real-time resource usage tracking
- **Status Indicators**: Visual status representation
- **Bulk Operations**: Efficient VM management

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Ant Design** - UI component library
- **Ant Design ProLayout** - Professional layout system
- **React Query (TanStack Query)** - Data fetching and caching
- **React Router** - Client-side routing with protected routes
- **Axios** - HTTP client for API communication

### Real-time Communication
- **Native WebSocket** - Real-time bidirectional communication
- **Custom WebSocket Hook** - Reusable WebSocket management
- **Auto-reconnection** - Robust connection handling
- **Fallback Strategy** - API polling when WebSocket unavailable

### State Management
- **React Query** - Server state management
- **Local Storage** - Token persistence
- **Context API** - Authentication state

## Project Structure

```
webui/
├── public/                 # Static assets
├── src/
│   ├── hooks/             # Custom React hooks
│   │   ├── useAuth.ts     # Authentication management
│   │   ├── useInstallation.ts # Installation wizard
│   │   ├── useVMs.ts      # VM management & controls
│   │   ├── useSystemStats.ts # System monitoring
│   │   ├── useSystemInfo.ts  # System information
│   │   ├── useSystemHealth.ts # Health & GPU monitoring
│   │   ├── useISOs.ts     # ISO management
│   │   ├── useGPU.ts      # GPU management
│   │   ├── useWebSocket.ts # WebSocket connection
│   │   └── useRealTimeStats.ts # Real-time monitoring
│   ├── pages/             # Page components
│   │   ├── Login.tsx      # Authentication page
│   │   ├── Installation.tsx # Setup wizard
│   │   ├── Dashboard.tsx  # Main dashboard
│   │   ├── VMs.tsx        # VM management
│   │   ├── System.tsx     # System monitoring
│   │   ├── ISO.tsx        # ISO management
│   │   ├── GPU.tsx        # GPU monitoring
│   │   └── Settings.tsx   # System settings
│   ├── api.ts             # API configuration
│   ├── App.tsx            # Main app with routing
│   └── index.tsx          # App entry point
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript configuration
```

## Key Components

### Authentication System
- **Login Page**: Secure authentication with validation
- **Password Management**: Change/reset password functionality
- **Protected Routes**: Route protection for authenticated users
- **Token Management**: JWT token handling and persistence
- **Logout**: Secure session termination

### Installation Wizard
- **First-time Setup**: Guided system installation
- **Server Configuration**: Hostname and network setup
- **Security Setup**: Root password configuration
- **Step-by-step Process**: Multi-step installation flow
- **Validation**: Input validation and error handling

### Dashboard
- **Real-time Statistics**: Live system performance data
- **VM Overview**: Current VM status and counts
- **Resource Monitoring**: CPU, memory, disk usage
- **Network Traffic**: Real-time network statistics
- **Connection Status**: WebSocket connection indicator
- **Fallback Mode**: API polling when real-time unavailable

### VM Management
- **Complete Lifecycle**: Full VM control operations
- **Advanced Controls**: Start, Stop, Pause, Resume, Restart
- **Real-time Status**: Live VM state updates
- **Resource Allocation**: CPU, memory, storage display
- **Statistics Modal**: Detailed VM performance metrics
- **Bulk Operations**: Efficient multi-VM management

### System Monitoring
- **Health Status**: System health checks and alerts
- **GPU Usage**: Real-time GPU utilization monitoring
- **CPU Information**: Detailed CPU specifications
- **Memory Management**: Memory usage and allocation
- **Disk Monitoring**: Storage usage and I/O statistics
- **Network Analysis**: Network interface monitoring

### ISO Management
- **File Upload**: Drag & drop ISO file upload
- **File Management**: List, download, delete operations
- **Progress Tracking**: Upload progress indicators
- **File Validation**: Format and size validation
- **Storage Management**: File size and space monitoring

### GPU Management
- **Usage Monitoring**: Real-time GPU utilization
- **VRAM Tracking**: Memory usage monitoring
- **vGPU Profiles**: Profile management and creation
- **Performance Metrics**: Temperature and power monitoring
- **Real-time Updates**: 5-second refresh intervals

### Settings
- **System Configuration**: API, VM, storage settings
- **Authentication Management**: Password and user settings
- **User Quota**: Resource usage monitoring
- **Security Settings**: SSL/TLS configuration
- **Monitoring Configuration**: Performance monitoring settings

## Real-time Architecture

### WebSocket Implementation
```typescript
// WebSocket connection with auto-reconnection
const { isConnected, lastMessage, sendMessage } = useWebSocket({
  url: 'ws://localhost:8080/ws/stats',
  onMessage: (message) => {
    if (message.type === 'system_stats') {
      setStats(message.data);
    }
  },
  reconnectInterval: 5000,
  maxReconnectAttempts: 5,
});
```

### Authentication Flow
```typescript
// Login with token management
const loginMutation = useLogin();
const { data } = await loginMutation.mutateAsync(credentials);
// Token automatically stored and used for subsequent requests
```

### Data Flow
1. **Installation Check**: Verify system installation status
2. **Authentication**: Login with credentials
3. **Token Management**: JWT token handling
4. **Protected Routes**: Route protection
5. **Real-time Updates**: WebSocket + API polling
6. **State Management**: React Query for server state

## API Integration

### Complete API Coverage
- **Authentication**: `POST /login`, `POST /logout`, `POST /change-password`, `POST /reset-password`
- **Installation**: `POST /install`, `GET /install/status`
- **VM Management**: Full CRUD + control operations
- **System Monitoring**: Health, stats, GPU, CPU info
- **ISO Management**: Upload, list, download, delete
- **GPU Management**: Usage monitoring, vGPU profiles
- **User Quota**: Resource usage and limits

### React Query Integration
```typescript
// Automatic caching and background updates
const { data: vms, isLoading, refetch } = useVMs();

// Optimistic updates for mutations
const startVMMutation = useMutation({
  mutationFn: (id: string) => api.post(`/vms/${id}/start`),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['vms'] });
  },
});
```

## Development

### Prerequisites
- Node.js 16+
- npm or yarn
- XTV API server running

### Installation
```bash
cd webui
npm install
```

### Development Server
```bash
npm start
```

### Build for Production
```bash
npm run build
```

### Environment Configuration
Create `.env` file:
```env
REACT_APP_API_URL=http://localhost:8080
REACT_APP_WS_URL=ws://localhost:8080
```

## Features in Detail

### Authentication & Security
- **JWT Token Management**: Automatic token handling
- **Route Protection**: Protected routes for authenticated users
- **Password Validation**: Secure password requirements
- **Session Persistence**: Token persistence across sessions
- **Secure Logout**: Complete session cleanup

### Real-time Monitoring
- **WebSocket Connection**: Bidirectional communication
- **Auto-reconnection**: Handles network interruptions
- **Fallback Strategy**: API polling when WebSocket unavailable
- **Performance**: 5-30 second update intervals
- **Error Handling**: Graceful degradation

### Installation & Setup
- **First-time Wizard**: Guided installation process
- **Configuration Validation**: Input validation and error handling
- **Progress Tracking**: Step-by-step progress indication
- **Error Recovery**: Installation error handling
- **Post-installation**: Automatic redirect to login

### VM Advanced Controls
- **State Management**: Complete VM state handling
- **Operation Validation**: Pre-operation checks
- **Progress Indicators**: Operation status feedback
- **Error Handling**: Comprehensive error management
- **Real-time Updates**: Live status updates

### Responsive Design
- **Mobile-first**: Optimized for all screen sizes
- **ProLayout**: Professional sidebar navigation
- **Ant Design**: Consistent UI components
- **Grid System**: Flexible layout system
- **Touch Support**: Mobile-friendly interactions

### Data Management
- **React Query**: Efficient data fetching and caching
- **Optimistic Updates**: Immediate UI feedback
- **Background Refetching**: Always fresh data
- **Error Boundaries**: Graceful error handling
- **Loading States**: Clear feedback during operations

### User Experience
- **Loading States**: Clear feedback during operations
- **Confirmation Dialogs**: Prevent accidental actions
- **Success/Error Messages**: Clear operation feedback
- **Progress Indicators**: Upload and operation progress
- **Real-time Indicators**: Connection and status indicators

## Future Enhancements

### Planned Features
- **VM Console**: Integrated VNC/SPICE console
- **Resource Graphs**: Historical performance charts
- **User Management**: Multi-user support with roles
- **Backup Management**: VM backup and restore
- **Network Management**: Advanced networking features
- **Storage Management**: Storage pool management
- **Audit Logs**: User activity tracking
- **Notifications**: Real-time alerts and notifications

### Technical Improvements
- **Service Workers**: Offline support
- **PWA Features**: Installable web app
- **Advanced Charts**: D3.js or Chart.js integration
- **Internationalization**: Multi-language support
- **Theme Customization**: User-defined themes
- **Advanced Security**: 2FA, SSO integration
- **Performance Optimization**: Code splitting, lazy loading

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## License

MIT License - see LICENSE file for details
