# XTV Network Migration Guide

คู่มือการย้ายเครื่อง XTV ไปยังเน็ตเวิร์คใหม่

## ภาพรวม

เมื่อย้ายเครื่อง XTV ไปยังเน็ตเวิร์คใหม่ IP address จะเปลี่ยน แต่ระบบจะยังคงทำงานได้ปกติ โดยมีหลายวิธีในการอัปเดต IP:

## วิธีที่ 1: ใช้ CLI Tool (แนะนำ)

### 1.1 ดูข้อมูลการย้ายเครื่อง
```bash
# Build tool
make update_ip

# ดูข้อมูลการย้ายเครื่อง
./bin/update_ip -info
```

### 1.2 อัปเดต IP
```bash
# อัปเดต IP ใหม่
./bin/update_ip -ip 192.168.1.100

# หรือระบุ config file
./bin/update_ip -ip 10.0.0.50 -config /etc/xtv/config.json
```

## วิธีที่ 2: ใช้ Simple Migration Script

```bash
# ให้สิทธิ์การรัน
chmod +x scripts/simple_migrate.sh

# รัน script
sudo ./scripts/simple_migrate.sh
```

Script จะ:
- Backup config เก่า
- แสดงข้อมูลปัจจุบัน
- ให้ใส่ IP ใหม่
- อัปเดต config.json
- แสดง URLs ใหม่

## วิธีที่ 3: แก้ไข config.json โดยตรง

### 3.1 Backup config เก่า
```bash
cp /etc/xtv/config.json /etc/xtv/config.json.backup
```

### 3.2 แก้ไข config.json
```json
{
  "install": {
    "network": {
      "public_ip": "192.168.1.100",
      "last_detected": "192.168.1.100",
      "last_detected_at": "2024-01-01T12:00:00Z"
    }
  }
}
```

### 3.3 Restart service
```bash
systemctl restart xtv
```

## วิธีที่ 4: ใช้ Web UI (ถ้ายังเข้าถึงได้)

1. เข้าไปที่หน้า Network Management
2. กด "Detect Network" เพื่อตรวจจับ IP ใหม่
3. หรือใช้ "Network Migration" section

## วิธีที่ 5: ใช้ API (ถ้ายังเข้าถึงได้)

```bash
# อัปเดต IP ผ่าน API
curl -X PUT "http://localhost:8080/api/network/update-ip" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"new_ip": "192.168.1.100"}'

# ดูข้อมูลการย้ายเครื่อง
curl -X GET "http://localhost:8080/api/network/migration-info" \
     -H "Authorization: Bearer YOUR_TOKEN"
```

## ขั้นตอนการย้ายเครื่อง

### ก่อนย้ายเครื่อง
1. **Backup ข้อมูล**
   ```bash
   # Backup config
   cp /etc/xtv/config.json /backup/xtv_config_$(date +%Y%m%d).json
   
   # Backup VMs (ถ้าจำเป็น)
   cp -r /var/lib/xtv/vms /backup/
   ```

2. **บันทึกข้อมูลปัจจุบัน**
   ```bash
   ./bin/update_ip -info
   ```

### ระหว่างย้ายเครื่อง
1. ย้ายเครื่องไปยังเน็ตเวิร์คใหม่
2. เชื่อมต่อเครือข่าย
3. ตรวจสอบ IP ใหม่: `ip addr show`

### หลังย้ายเครื่อง
1. **อัปเดต IP ใน config**
   ```bash
   ./bin/update_ip -ip <NEW_IP>
   ```

2. **Restart service**
   ```bash
   systemctl restart xtv
   ```

3. **ทดสอบการทำงาน**
   ```bash
   # ทดสอบ Web UI
   curl http://<NEW_IP>:8888
   
   # ทดสอบ API
   curl http://<NEW_IP>:8080/api/v1/health
   ```

## ข้อมูลที่สำคัญ

### Original IP
- IP ตอนติดตั้งครั้งแรก
- เก็บไว้ใน `config.json` เพื่ออ้างอิง
- ไม่เปลี่ยนแปลงเมื่อย้ายเครื่อง

### Current IP
- IP ปัจจุบันที่ใช้งาน
- อัปเดตเมื่อย้ายเครื่อง
- ใช้สำหรับสร้าง URLs

### URLs ที่อัปเดตอัตโนมัติ
- Web UI: `http://<current_ip>:<web_port>`
- API: `http://<current_ip>:<api_port>`

## การแก้ไขปัญหา

### ปัญหา: เข้า Web UI ไม่ได้
```bash
# ตรวจสอบ service
systemctl status xtv

# ตรวจสอบ port
netstat -tlnp | grep :8888

# ตรวจสอบ firewall
ufw status
```

### ปัญหา: API ไม่ตอบสนอง
```bash
# ตรวจสอบ API
curl http://localhost:8080/api/v1/health

# ตรวจสอบ log
journalctl -u xtv -f
```

### ปัญหา: IP ไม่อัปเดต
```bash
# ตรวจสอบ config
cat /etc/xtv/config.json | jq '.install.network'

# อัปเดต IP ใหม่
./bin/update_ip -ip <NEW_IP>
```

## ตัวอย่างการใช้งาน

### ตัวอย่าง 1: ย้ายจาก 192.168.1.100 ไป 10.0.0.50

```bash
# 1. ดูข้อมูลปัจจุบัน
./bin/update_ip -info

# 2. อัปเดต IP
./bin/update_ip -ip 10.0.0.50

# 3. Restart service
systemctl restart xtv

# 4. ทดสอบ
curl http://10.0.0.50:8888
```

### ตัวอย่าง 2: ใช้ script แบบ interactive

```bash
# รัน script
sudo ./scripts/simple_migrate.sh

# ตามขั้นตอนที่ script แนะนำ
```

## หมายเหตุ

- **VMs และข้อมูล**: จะยังคงอยู่เมื่อย้ายเครื่อง
- **Configuration**: จะถูก backup อัตโนมัติ
- **Logs**: การย้ายเครื่องจะถูกบันทึกใน log
- **Security**: Token และ authentication จะยังคงทำงานปกติ

## การสนับสนุน

หากมีปัญหาในการย้ายเครื่อง:
1. ตรวจสอบ log: `/var/log/xtv/`
2. ตรวจสอบ backup: `/var/backups/xtv/`
3. ใช้ `./bin/update_ip -info` เพื่อดูข้อมูลปัจจุบัน
``` 