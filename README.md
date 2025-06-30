# XTV - Virtualization System

XTV เป็นระบบ Virtualization ที่พัฒนาด้วย Go สำหรับจัดการ Virtual Machines ผ่าน libvirt/QEMU-KVM พร้อม REST API และ Web UI ที่ทันสมัย

## ✨ Features

### 🚀 Performance Optimizations
- **Memory Management**: Optimized garbage collection และ memory limits
- **Connection Pooling**: Efficient connection management สำหรับ high concurrency
- **Rate Limiting**: Built-in rate limiting เพื่อป้องกัน overload
- **Compression**: Gzip compression สำหรับ API responses
- **Caching**: Response caching สำหรับ frequently accessed data
- **Load Balancing**: Support สำหรับ multiple instances

### 🖥️ VM Management
- **CPU Configuration**: Advanced CPU settings (cores, model, topology)
- **Memory Management**: Flexible memory allocation และ optimization
- **Storage Options**: Multiple storage types (local, network, SSD optimization)
- **Network Configuration**: Advanced networking (VLAN, VXLAN, SDN)
- **GPU Support**: vGPU profiles และ GPU monitoring
- **BIOS/UEFI**: Boot options และ secure boot support

### 📊 Monitoring & Analytics
- **Real-time Monitoring**: WebSocket-based real-time updates
- **Performance Metrics**: CPU, memory, disk, network monitoring
- **Health Checks**: Automated health monitoring และ alerts
- **Resource Quotas**: User resource limits และ quotas
- **Audit Logs**: Comprehensive audit trail

### 🔒 Security
- **Authentication**: Basic auth และ JWT support
- **Rate Limiting**: API rate limiting และ DDoS protection
- **Security Headers**: Comprehensive security headers
- **Input Validation**: Strict input validation และ sanitization

### 🟢 Real-time WebSocket Integration
- **VM Events**: Real-time updates for VM create/start/stop/delete via WebSocket (`/ws/vm`)
- **GPU Events**: Real-time GPU usage and vGPU profile changes via WebSocket (`/ws/gpu`)
- **Network Events**: Real-time network status, migration, and IP changes via WebSocket (`/ws/network`)
- **Web UI**: Toast notifications and auto-refresh on real-time events in VMs, GPU, and Network pages

## 🚀 Quick Start

### Prerequisites
- Go 1.21+ 
- libvirt และ QEMU-KVM (สำหรับ production)
- Node.js 18+ (สำหรับ Web UI)

### 1. รัน XTV Backend

#### รันแบบ Production (libvirt จริง)
```bash
# รันด้วย Go โดยตรง (แนะนำ)
go run main.go

# หรือ build เป็น binary
go build -o xtv
./xtv
```

#### รันแบบ Development/Mock (ข้อมูลจำลอง)
```bash
# รันด้วย Go โดยตรง
go run main.go --mock

# หรือ build เป็น binary
go build -o xtv
./xtv --mock
```

### 2. รัน Web UI (Optional)
```bash
cd webui
npm install
npm start
```

เปิดเบราว์เซอร์ไปที่ [http://localhost:3000](http://localhost:3000)

### 3. เข้าถึงระบบ
- **API Server**: http://localhost:8080
- **Web UI**: http://localhost:3000
- **System Monitor**: http://localhost:8080/monitor

## 🔧 Configuration

### Performance Settings
```json
{
  "performance": {
    "max_connections": 1000,
    "rate_limit_rps": 100,
    "rate_limit_burst": 200,
    "memory_limit_gb": 1,
    "gc_percent": 100,
    "enable_compression": true,
    "enable_caching": true
  }
}
```

### System Requirements
- **Minimum**: 4GB RAM, 2 CPU cores, 20GB storage
- **Recommended**: 8GB+ RAM, 4+ CPU cores, 100GB+ storage
- **Production**: 16GB+ RAM, 8+ CPU cores, 500GB+ storage

## 🛠️ Development

### รันแบบ Development (Hot Reload)
```bash
# ติดตั้ง air สำหรับ hot reload
go install github.com/cosmtrek/air@latest

# รันด้วย air
air
```

### Testing
```bash
# รัน tests
go test ./...

# รัน tests พร้อม coverage
go test -cover ./...
```

## 📈 Monitoring

### Health Check
```bash
curl http://localhost:8080/health
```

### Performance Metrics
```bash
curl http://localhost:8080/metrics
```

### System Monitor
```bash
curl http://localhost:8080/monitor
```

## 🔄 API Endpoints

### VM Management
- `GET /vms` - List all VMs
- `POST /vms` - Create new VM
- `GET /vms/{id}` - Get VM details
- `PUT /vms/{id}` - Update VM
- `DELETE /vms/{id}` - Delete VM
- `POST /vms/{id}/start` - Start VM
- `POST /vms/{id}/stop` - Stop VM
- `POST /vms/{id}/restart` - Restart VM

### System Monitoring
- `GET /monitor` - System performance metrics
- `GET /monitor/performance` - Detailed performance stats
- `GET /monitor/health` - System health status
- `GET /metrics` - Prometheus metrics

### WebSocket Events
- `WS /ws` - Real-time system events
- `WS /ws/vm` - Real-time VM events (create/start/stop/delete)
- `WS /ws/gpu` - Real-time GPU/vGPU events (usage, profile changes)
- `WS /ws/network` - Real-time network events (IP change, migration, error)
- Subscribe to: `system_monitor`, `vm_events`, `gpu_events`, `network_events`, `performance_alerts`

## 🔧 Troubleshooting

### Common Issues

#### 1. Permission Denied
```bash
# Add user to libvirt group
sudo usermod -a -G libvirt $USER
# Logout และ login ใหม่
```

#### 2. Port Already in Use
```bash
# Check port usage
sudo netstat -tlnp | grep :8080
# Kill process
sudo kill -9 <PID>
```

#### 3. Memory Issues
```bash
# Check memory usage
free -h
# Optimize memory
curl -X POST http://localhost:8080/monitor/optimize
```

### Performance Tuning

#### 1. System Level
```bash
# Increase file descriptors
echo '* soft nofile 65536' | sudo tee -a /etc/security/limits.conf
echo '* hard nofile 65536' | sudo tee -a /etc/security/limits.conf

# Optimize memory
echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

#### 2. Application Level
```bash
# Set environment variables
export GOMAXPROCS=4
export GOGC=100
export GOMEMLIMIT=1GiB
```

## 📚 Documentation

- [API Documentation](docs/api.md)
- [Configuration Guide](docs/config.md)
- [Performance Tuning](docs/performance.md)
- [Security Guide](docs/security.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [libvirt](https://libvirt.org/) - Virtualization API
- [QEMU](https://www.qemu.org/) - Machine emulator
- [Gin](https://gin-gonic.com/) - Web framework
- [gopsutil](https://github.com/shirou/gopsutil) - System monitoring

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/xtv/issues)
- **Documentation**: [Wiki](https://github.com/your-repo/xtv/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/xtv/discussions)

---

**XTV** - Empowering virtualization with performance and simplicity 🚀

## ✅ System & Web UI Completeness

- ระบบ XTV พร้อมใช้งานจริง (single user, ไม่ต้องใช้ฐานข้อมูล)
- Web UI ครบทุกฟีเจอร์: Dashboard, VMs, Network, GPU, ISO, Settings, Audit Log, Login, Installation
- รองรับ Real-time events (WebSocket) ทุกส่วน: VM, GPU, Network
- Quota/Usage แสดงผลแบบ real-time ต่อ user/project
- Network Advanced: VLAN, VXLAN, Floating IP, Firewall, NAT, Port Forwarding (UI พร้อมต่อยอด API จริง)
- GPU Scheduling/Allocation: ตาราง assign vGPU profile ให้ VM, release/assign ได้ (mock UI)
- Audit Log & Rate Limit: มีหน้าแสดง log และแจ้งเตือน rate limit
- UI/UX: แจ้งเตือน error/success, loading/progress bar, responsive design รองรับ mobile/tablet
- ระบบ Auth: ใช้ session token แบบ random string (secure, ไม่ใช่ JWT), redirect อัตโนมัติเมื่อหมดอายุ
- ติดตั้งง่าย, มี interactive CLI, config.json, รองรับ network migration

> **หมายเหตุ:** ฟีเจอร์บางส่วน (Network Advanced, GPU Scheduling) เป็น mock UI พร้อมต่อยอดเชื่อมต่อ API จริงในอนาคต 

## 🛡️ Installation & System Requirements Check

XTV มาพร้อมระบบติดตั้งอัตโนมัติและตรวจสอบความพร้อมของระบบก่อนติดตั้งจริง เพื่อความปลอดภัยและประสิทธิภาพสูงสุด

### ฟีเจอร์สำคัญ
- **Auto System Requirements Check**: ตรวจสอบอัตโนมัติเมื่อรัน `go run main.go` หรือ `./xtv`
  - RAM >= 4GB
  - CPU Cores >= 2
  - Virtualization (VT-x/AMD-V)
  - IOMMU (VT-d/AMD-Vi)
  - Hyper-Threading (HT)
  - KVM kernel module
  - libvirt, qemu ติดตั้งครบ
  - Disk space >= 20GB
- **แนะนำวิธีแก้ไข**: ถ้าไม่ผ่านจะแนะนำวิธีเปิด/ติดตั้งแต่ละ requirement
- **ไม่อนุญาตติดตั้งถ้าไม่ครบ**: ระบบจะหยุดและแจ้งปัญหา
- **ถามก่อน overwrite config.json**: ถ้ามีไฟล์อยู่แล้วจะถามก่อนเสมอ
- **ตรวจสอบความแข็งแรงของรหัสผ่าน root**: ต้องมีตัวพิมพ์ใหญ่-เล็ก ตัวเลข และอักขระพิเศษ ความยาว >= 8 ตัวอักษร
- **ซ่อน input password**: ขณะพิมพ์รหัสผ่านจะไม่แสดงบนหน้าจอ
- **Log การติดตั้ง**: ทุกขั้นตอนจะถูกบันทึกลงไฟล์ install.log เพื่อความโปร่งใสและ debug ง่าย
- **Flag --check**: สามารถรัน `go run main.go --check` เพื่อเช็ค requirement เฉยๆ ได้

### หลักการทำงาน (Step-by-step)
1. **รันโปรแกรมครั้งแรก** (ยังไม่มี config.json)
2. ระบบเช็ค hardware/software requirements ทั้งหมด
   - แสดงผลลิสต์ ✔/✗ พร้อมรายละเอียดและคำแนะนำ
   - ถ้าไม่ครบ หยุดติดตั้งทันที
3. ถ้าผ่าน requirement:
   - ถามว่าจะ overwrite config.json เดิมหรือไม่ (ถ้ามี)
   - ถาม server name, network (dhcp/static), static IP (ถ้าเลือก static)
   - ถาม root password (ต้องแข็งแรงและซ่อน input)
   - ยืนยันรหัสผ่านอีกครั้ง
4. แสดง progress bar/step
5. สร้าง config.json และ log install
6. แสดงข้อมูลสรุปการติดตั้งและวิธีรัน server

## 🚀 Deploy XTV บน Ubuntu Server

### ขั้นตอนติดตั้งและรัน (Production)

1. **อัปโหลดไฟล์โปรเจกต์ (ยกเว้น config.json) ไปยังเครื่อง Ubuntu**
2. ติดตั้ง Go, libvirt, qemu, Node.js (ถ้าจะ build webui)
   ```bash
   sudo apt update
   sudo apt install -y golang-go qemu-kvm libvirt-daemon-system libvirt-clients bridge-utils
   ```
3. **ลบ config.json ถ้ามี**
   ```bash
   rm -f config.json
   ```
4. **Build หรือรันโปรแกรม**
   - **รันแบบ Go ตรงๆ (แนะนำสำหรับติดตั้งครั้งแรก):**
     ```bash
     go run main.go
     ```
   - **หรือ build เป็น binary แล้วรัน:**
     ```bash
     go build -o xtv
     ./xtv
     ```
5. **ทำตามขั้นตอนติดตั้งใน CLI**  
   - ระบบจะเช็ค requirement และถามข้อมูล server name, network, password ฯลฯ
   - ถ้าผ่าน requirement จะสร้าง config.json ใหม่ให้อัตโนมัติ

6. **(Optional) Build Web UI**
   ```bash
   cd webui
   npm install
   npm run build
   ```

7. **เริ่มใช้งาน XTV**
   - API: http://<server-ip>:8080
   - Web UI: http://<server-ip>:8888

--- 