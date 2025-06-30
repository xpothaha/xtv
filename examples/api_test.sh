#!/bin/bash

# XTV API Test Script
# ใช้สำหรับทดสอบ API endpoints ต่างๆ

BASE_URL="http://localhost:8080/api/v1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    
    if [ "$status" = "OK" ]; then
        echo -e "${GREEN}✓ $message${NC}"
    elif [ "$status" = "ERROR" ]; then
        echo -e "${RED}✗ $message${NC}"
    else
        echo -e "${YELLOW}⚠ $message${NC}"
    fi
}

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -n "Testing $description... "
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -w "%{http_code}" -X $method "$BASE_URL$endpoint")
    fi
    
    # Extract status code (last 3 characters)
    status_code=${response: -3}
    # Extract response body (everything except last 3 characters)
    body=${response%???}
    
    if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
        print_status "OK" "$description (HTTP $status_code)"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        print_status "ERROR" "$description (HTTP $status_code)"
        echo "$body"
    fi
    echo
}

# Check if server is running
echo "Checking if XTV server is running..."
if curl -s "$BASE_URL/../health" > /dev/null; then
    print_status "OK" "Server is running"
else
    print_status "ERROR" "Server is not running. Please start the server first."
    exit 1
fi

echo "Starting API tests..."
echo "===================="

# Test system endpoints
echo "1. System Endpoints"
echo "-------------------"

test_endpoint "GET" "/system/stats" "" "Get system statistics"
test_endpoint "GET" "/system/info" "" "Get system information"

# Test VM endpoints
echo "2. VM Management Endpoints"
echo "-------------------------"

# List VMs
test_endpoint "GET" "/vms" "" "List all VMs"

# Create a test VM
VM_DATA='{
    "name": "test-ubuntu",
    "description": "Test Ubuntu VM",
    "cpu": {
        "cores": 2,
        "threads": 4,
        "model": "host-model",
        "max_usage": 100
    },
    "memory": {
        "size": 2048,
        "max_size": 4096,
        "usage": 0
    },
    "storage": {
        "disks": [
            {
                "name": "main-disk",
                "path": "/var/lib/xtv/images/test-ubuntu.qcow2",
                "size": 20,
                "format": "qcow2",
                "bus": "virtio",
                "bootable": true
            }
        ]
    },
    "network": {
        "interfaces": [
            {
                "name": "eth0",
                "type": "bridge",
                "network": "default",
                "model": "virtio"
            }
        ]
    },
    "os": {
        "type": "linux",
        "arch": "x86_64",
        "version": "ubuntu-20.04"
    }
}'

test_endpoint "POST" "/vms" "$VM_DATA" "Create test VM"

# Get the created VM (assuming it has ID)
VM_ID="test-ubuntu"
test_endpoint "GET" "/vms/$VM_ID" "" "Get VM details"
test_endpoint "GET" "/vms/$VM_ID/stats" "" "Get VM statistics"

# Test VM control endpoints
echo "3. VM Control Endpoints"
echo "----------------------"

test_endpoint "POST" "/vms/$VM_ID/start" "" "Start VM"
sleep 2
test_endpoint "POST" "/vms/$VM_ID/pause" "" "Pause VM"
sleep 1
test_endpoint "POST" "/vms/$VM_ID/resume" "" "Resume VM"
sleep 1
test_endpoint "POST" "/vms/$VM_ID/stop" "" "Stop VM"

# Test VM update
echo "4. VM Update"
echo "------------"

UPDATE_DATA='{
    "description": "Updated test Ubuntu VM",
    "memory": {
        "size": 4096,
        "max_size": 8192,
        "usage": 0
    }
}'

test_endpoint "PUT" "/vms/$VM_ID" "$UPDATE_DATA" "Update VM"

# Test VM deletion
echo "5. VM Deletion"
echo "--------------"

test_endpoint "DELETE" "/vms/$VM_ID" "" "Delete VM"

echo "===================="
echo "API tests completed!" 