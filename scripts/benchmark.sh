#!/bin/bash

# XTV Performance Benchmark Script
# This script runs various performance tests on XTV

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
XTV_URL="http://localhost:8080"
WEB_URL="http://localhost:8888"
BENCHMARK_DURATION=60
CONCURRENT_USERS=10
REQUESTS_PER_SECOND=100

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if XTV is running
check_xtv_running() {
    if curl -s "$XTV_URL/health" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to run API benchmark
run_api_benchmark() {
    print_status "Running API benchmark..."
    
    # Check if hey is installed
    if ! command -v hey &> /dev/null; then
        print_warning "hey not found. Installing..."
        go install github.com/rakyll/hey@latest
    fi
    
    # Run benchmark tests
    echo "=== API Endpoints Benchmark ==="
    
    # Test GET /vms
    print_status "Testing GET /vms endpoint..."
    hey -z $BENCHMARK_DURATION -c $CONCURRENT_USERS -q $REQUESTS_PER_SECOND "$XTV_URL/vms"
    
    # Test GET /monitor
    print_status "Testing GET /monitor endpoint..."
    hey -z $BENCHMARK_DURATION -c $CONCURRENT_USERS -q $REQUESTS_PER_SECOND "$XTV_URL/monitor"
    
    # Test POST /vms (create VM)
    print_status "Testing POST /vms endpoint..."
    hey -z $BENCHMARK_DURATION -c $CONCURRENT_USERS -q $REQUESTS_PER_SECOND \
        -m POST \
        -H "Content-Type: application/json" \
        -d '{"name":"benchmark-vm","cpu":{"cores":1,"model":"generic"},"memory":{"size":1024},"storage":{"size":10},"network":{"type":"bridge","bridge":"virbr0"}}' \
        "$XTV_URL/vms"
}

# Function to run memory benchmark
run_memory_benchmark() {
    print_status "Running memory benchmark..."
    
    echo "=== Memory Usage Benchmark ==="
    
    # Get initial memory usage
    initial_memory=$(ps aux | grep xtv | grep -v grep | awk '{print $6}' | head -1)
    print_status "Initial memory usage: ${initial_memory}KB"
    
    # Run stress test
    for i in {1..10}; do
        print_status "Memory test iteration $i/10"
        
        # Create multiple concurrent requests
        for j in {1..50}; do
            curl -s "$XTV_URL/vms" > /dev/null &
        done
        wait
        
        # Check memory usage
        current_memory=$(ps aux | grep xtv | grep -v grep | awk '{print $6}' | head -1)
        print_status "Memory usage after iteration $i: ${current_memory}KB"
    done
    
    # Final memory usage
    final_memory=$(ps aux | grep xtv | grep -v grep | awk '{print $6}' | head -1)
    print_status "Final memory usage: ${final_memory}KB"
    
    # Calculate memory growth
    if [[ -n "$initial_memory" && -n "$final_memory" ]]; then
        growth=$((final_memory - initial_memory))
        print_status "Memory growth: ${growth}KB"
    fi
}

# Function to run CPU benchmark
run_cpu_benchmark() {
    print_status "Running CPU benchmark..."
    
    echo "=== CPU Usage Benchmark ==="
    
    # Get initial CPU usage
    initial_cpu=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    print_status "Initial CPU usage: ${initial_cpu}%"
    
    # Run CPU intensive operations
    for i in {1..5}; do
        print_status "CPU test iteration $i/5"
        
        # Create multiple concurrent requests with complex operations
        for j in {1..100}; do
            curl -s "$XTV_URL/monitor" > /dev/null &
            curl -s "$XTV_URL/vms" > /dev/null &
        done
        wait
        
        # Check CPU usage
        current_cpu=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
        print_status "CPU usage after iteration $i: ${current_cpu}%"
    done
    
    # Final CPU usage
    final_cpu=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    print_status "Final CPU usage: ${final_cpu}%"
}

# Function to run latency benchmark
run_latency_benchmark() {
    print_status "Running latency benchmark..."
    
    echo "=== Latency Benchmark ==="
    
    # Test different endpoints
    endpoints=("/health" "/vms" "/monitor" "/system/info")
    
    for endpoint in "${endpoints[@]}"; do
        print_status "Testing latency for $endpoint"
        
        # Run 100 requests and calculate average latency
        total_time=0
        count=0
        
        for i in {1..100}; do
            start_time=$(date +%s%N)
            curl -s "$XTV_URL$endpoint" > /dev/null
            end_time=$(date +%s%N)
            
            duration=$((end_time - start_time))
            total_time=$((total_time + duration))
            count=$((count + 1))
        done
        
        if [[ $count -gt 0 ]]; then
            avg_latency=$((total_time / count))
            print_status "Average latency for $endpoint: ${avg_latency}ns (${avg_latency:0:-6}ms)"
        fi
    done
}

# Function to run throughput benchmark
run_throughput_benchmark() {
    print_status "Running throughput benchmark..."
    
    echo "=== Throughput Benchmark ==="
    
    # Test different concurrency levels
    concurrency_levels=(1 5 10 20 50 100)
    
    for concurrency in "${concurrency_levels[@]}"; do
        print_status "Testing with $concurrency concurrent users"
        
        # Run hey for 30 seconds with different concurrency
        hey -z 30 -c $concurrency -q $REQUESTS_PER_SECOND "$XTV_URL/health" | grep -E "(Requests/sec|Average|Fastest|Slowest)"
    done
}

# Function to run WebSocket benchmark
run_websocket_benchmark() {
    print_status "Running WebSocket benchmark..."
    
    echo "=== WebSocket Benchmark ==="
    
    # Check if websocat is installed
    if ! command -v websocat &> /dev/null; then
        print_warning "websocat not found. Installing..."
        wget -O /tmp/websocat https://github.com/vi/websocat/releases/download/v1.11.0/websocat.x86_64-unknown-linux-musl
        chmod +x /tmp/websocat
        export PATH="/tmp:$PATH"
    fi
    
    # Test WebSocket connection
    print_status "Testing WebSocket connection..."
    
    # Start WebSocket connection and send messages
    (
        echo '{"type":"subscribe","channel":"system_monitor"}'
        sleep 5
        echo '{"type":"unsubscribe","channel":"system_monitor"}'
    ) | websocat ws://localhost:8080/ws &
    
    websocket_pid=$!
    sleep 10
    kill $websocket_pid 2>/dev/null || true
    
    print_success "WebSocket benchmark completed"
}

# Function to generate benchmark report
generate_report() {
    print_status "Generating benchmark report..."
    
    report_file="benchmark_report_$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
XTV Performance Benchmark Report
Generated: $(date)
Duration: $BENCHMARK_DURATION seconds
Concurrent Users: $CONCURRENT_USERS
Requests per Second: $REQUESTS_PER_SECOND

=== System Information ===
$(uname -a)
$(cat /proc/cpuinfo | grep "model name" | head -1)
$(cat /proc/meminfo | grep MemTotal)

=== Benchmark Results ===
$(cat /tmp/benchmark_results.txt 2>/dev/null || echo "No detailed results available")

=== Recommendations ===
- Monitor memory usage over time
- Consider connection pooling for high concurrency
- Implement caching for frequently accessed data
- Use load balancing for production deployments
EOF
    
    print_success "Benchmark report saved to: $report_file"
}

# Function to run all benchmarks
run_all_benchmarks() {
    print_status "Starting comprehensive XTV performance benchmark..."
    
    # Check if XTV is running
    if ! check_xtv_running; then
        print_error "XTV is not running. Please start XTV first."
        exit 1
    fi
    
    # Create temporary file for results
    echo "" > /tmp/benchmark_results.txt
    
    # Run all benchmarks
    run_api_benchmark | tee -a /tmp/benchmark_results.txt
    run_memory_benchmark | tee -a /tmp/benchmark_results.txt
    run_cpu_benchmark | tee -a /tmp/benchmark_results.txt
    run_latency_benchmark | tee -a /tmp/benchmark_results.txt
    run_throughput_benchmark | tee -a /tmp/benchmark_results.txt
    run_websocket_benchmark | tee -a /tmp/benchmark_results.txt
    
    # Generate report
    generate_report
    
    print_success "All benchmarks completed!"
}

# Function to show help
show_help() {
    echo "XTV Performance Benchmark Script"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  --api          Run API benchmark only"
    echo "  --memory       Run memory benchmark only"
    echo "  --cpu          Run CPU benchmark only"
    echo "  --latency      Run latency benchmark only"
    echo "  --throughput   Run throughput benchmark only"
    echo "  --websocket    Run WebSocket benchmark only"
    echo "  --all          Run all benchmarks (default)"
    echo "  --help         Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  XTV_URL              XTV API URL (default: http://localhost:8080)"
    echo "  BENCHMARK_DURATION   Duration in seconds (default: 60)"
    echo "  CONCURRENT_USERS     Number of concurrent users (default: 10)"
    echo "  REQUESTS_PER_SECOND  Requests per second (default: 100)"
}

# Main function
main() {
    case "${1:---all}" in
        --api)
            run_api_benchmark
            ;;
        --memory)
            run_memory_benchmark
            ;;
        --cpu)
            run_cpu_benchmark
            ;;
        --latency)
            run_latency_benchmark
            ;;
        --throughput)
            run_throughput_benchmark
            ;;
        --websocket)
            run_websocket_benchmark
            ;;
        --all)
            run_all_benchmarks
            ;;
        --help)
            show_help
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 