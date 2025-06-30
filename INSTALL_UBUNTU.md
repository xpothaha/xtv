# XTV Installation Guide for Ubuntu

## ระบบที่รองรับ
- Ubuntu 20.04 LTS หรือใหม่กว่า
- Ubuntu 22.04 LTS (แนะนำ)
- Ubuntu 24.04 LTS

## ความต้องการของระบบ
- CPU: 64-bit x86_64 หรือ ARM64
- RAM: ขั้นต่ำ 4GB (แนะนำ 8GB+)
- Storage: ขั้นต่ำ 20GB (แนะนำ 100GB+)
- Network: การเชื่อมต่ออินเทอร์เน็ต

## ขั้นตอนการติดตั้ง

### 1. อัปเดตระบบ
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. ติดตั้ง Go (ถ้ายังไม่มี)
```bash
# ติดตั้ง Go 1.21 หรือใหม่กว่า
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz

# เพิ่ม Go ไปยัง PATH
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# ตรวจสอบการติดตั้ง
go version
```

### 3. ติดตั้ง Dependencies
```bash
# ติดตั้ง system dependencies
sudo apt install -y build-essential pkg-config
sudo apt install -y libvirt-daemon-system qemu-kvm libvirt-clients
sudo apt install -y bridge-utils virt-manager libvirt-dev
sudo apt install -y git curl wget

# เพิ่ม user ไปยัง groups
sudo usermod -a -G libvirt $USER
sudo usermod -a -G kvm $USER

# เริ่มต้น libvirtd service
sudo systemctl start libvirtd
sudo systemctl enable libvirtd
```

### 4. Clone และ Build โปรเจค
```bash
# Clone โปรเจค
git clone https://github.com/your-repo/xtv.git
cd xtv

# ติดตั้ง Go dependencies
go mod download
go mod tidy

# Build โปรแกรมแบบ optimized
make build-optimized
```

### 5. ติดตั้งระบบ
```bash
# สร้าง directories ที่จำเป็น
sudo mkdir -p /var/lib/xtv/vms
sudo mkdir -p /var/lib/xtv/images
sudo mkdir -p /var/lib/xtv/backups
sudo mkdir -p /var/log/xtv

# เปลี่ยน ownership
sudo chown $USER:$USER /var/lib/xtv/vms
sudo chown $USER:$USER /var/lib/xtv/images
sudo chown $USER:$USER /var/lib/xtv/backups
sudo chown $USER:$USER /var/log/xtv

# รันการติดตั้ง
./build/xtv
```

### 6. ติดตั้งเป็น System Service (แนะนำ)
```bash
# ติดตั้งโปรแกรมไปยังระบบ
sudo cp build/xtv /usr/local/bin/xtv
sudo chmod +x /usr/local/bin/xtv

# สร้าง systemd service
sudo tee /etc/systemd/system/xtv.service > /dev/null <<EOF
[Unit]
Description=XTV Virtualization System
After=network.target libvirtd.service
Wants=libvirtd.service

[Service]
Type=simple
User=$USER
Group=$USER
WorkingDirectory=/var/lib/xtv
ExecStart=/usr/local/bin/xtv
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=xtv
Environment=GOMAXPROCS=4

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd และ enable service
sudo systemctl daemon-reload
sudo systemctl enable xtv
sudo systemctl start xtv

# ตรวจสอบสถานะ
sudo systemctl status xtv
```

## การใช้งาน

### เริ่มต้นโปรแกรม
```bash
# วิธีที่ 1: รันโดยตรง
./build/xtv

# วิธีที่ 2: ใช้ systemd service
sudo systemctl start xtv
sudo systemctl status xtv
```

### เข้าถึง Web UI
- URL: `http://your-server-ip:8888`
- API: `http://your-server-ip:8080`

### การจัดการ Service
```bash
# เริ่มต้น service
sudo systemctl start xtv

# หยุด service
sudo systemctl stop xtv

# Restart service
sudo systemctl restart xtv

# ดู logs
sudo journalctl -u xtv -f

# ดูสถานะ
sudo systemctl status xtv
```

## การตั้งค่า Firewall

### UFW (Ubuntu Firewall)
```bash
# เปิด port สำหรับ XTV
sudo ufw allow 8080/tcp  # API
sudo ufw allow 8888/tcp  # Web UI
sudo ufw allow 22/tcp    # SSH (ถ้าต้องการ)

# เปิดใช้งาน firewall
sudo ufw enable
```

### iptables
```bash
# เปิด port สำหรับ XTV
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8888 -j ACCEPT

# บันทึก rules
sudo iptables-save > /etc/iptables/rules.v4
```

## การ Backup และ Restore

### Backup Configuration
```bash
# Backup config
sudo cp /var/lib/xtv/config.json /var/lib/xtv/backups/config-$(date +%Y%m%d-%H%M%S).json

# Backup VMs
sudo cp -r /var/lib/xtv/vms /var/lib/xtv/backups/vms-$(date +%Y%m%d-%H%M%S)
```

### Restore Configuration
```bash
# Restore config
sudo cp /var/lib/xtv/backups/config-YYYYMMDD-HHMMSS.json /var/lib/xtv/config.json

# Restart service
sudo systemctl restart xtv
```

## การ Troubleshooting

### ตรวจสอบ Logs
```bash
# System logs
sudo journalctl -u xtv -f

# Application logs
tail -f /var/log/xtv/xtv.log

# Libvirt logs
sudo journalctl -u libvirtd -f
```

### ตรวจสอบ Dependencies
```bash
# ตรวจสอบ libvirt
virsh list --all

# ตรวจสอบ KVM
lsmod | grep kvm

# ตรวจสอบ network bridges
brctl show
```

### ปัญหาที่พบบ่อย

#### 1. Permission Denied
```bash
# ตรวจสอบ groups
groups $USER

# เพิ่ม user ไปยัง groups อีกครั้ง
sudo usermod -a -G libvirt,kvm $USER
# Logout และ login ใหม่
```

#### 2. Port Already in Use
```bash
# ตรวจสอบ port ที่ใช้งาน
sudo netstat -tlnp | grep :8080
sudo netstat -tlnp | grep :8888

# Kill process ที่ใช้ port
sudo kill -9 <PID>
```

#### 3. Libvirt Connection Failed
```bash
# ตรวจสอบ libvirtd service
sudo systemctl status libvirtd

# Restart libvirtd
sudo systemctl restart libvirtd

# ตรวจสอบ URI
virsh -c qemu:///system list
```

## การอัปเดต

### อัปเดต XTV
```bash
# หยุด service
sudo systemctl stop xtv

# Pull code ใหม่
cd /path/to/xtv
git pull origin main

# Build ใหม่
make build-optimized

# ติดตั้งใหม่
sudo cp build/xtv /usr/local/bin/xtv

# เริ่มต้น service
sudo systemctl start xtv
```

### อัปเดต Dependencies
```bash
# อัปเดต system packages
sudo apt update && sudo apt upgrade -y

# อัปเดต Go dependencies
go mod download
go mod tidy
```

## การ Monitor และ Performance

### ตรวจสอบ Performance
```bash
# ดู CPU และ Memory usage
htop

# ดู disk usage
df -h

# ดู network usage
iftop

# ดู process ของ XTV
ps aux | grep xtv
```

### การตั้งค่า Performance
```bash
# เพิ่ม file descriptors limit
echo '* soft nofile 65536' | sudo tee -a /etc/security/limits.conf
echo '* hard nofile 65536' | sudo tee -a /etc/security/limits.conf

# เพิ่ม memory limit
echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## การ Uninstall

### ลบ XTV
```bash
# หยุด service
sudo systemctl stop xtv
sudo systemctl disable xtv

# ลบ service file
sudo rm /etc/systemd/system/xtv.service
sudo systemctl daemon-reload

# ลบ binary
sudo rm /usr/local/bin/xtv

# ลบ data (ระวัง!)
sudo rm -rf /var/lib/xtv
sudo rm -rf /var/log/xtv
```

## Support และ Community

- GitHub Issues: [https://github.com/your-repo/xtv/issues](https://github.com/your-repo/xtv/issues)
- Documentation: [https://github.com/your-repo/xtv/docs](https://github.com/your-repo/xtv/docs)
- Wiki: [https://github.com/your-repo/xtv/wiki](https://github.com/your-repo/xtv/wiki)

## License

XTV is licensed under the MIT License. See LICENSE file for details. 