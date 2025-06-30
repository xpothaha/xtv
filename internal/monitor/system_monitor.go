package monitor

import (
	"context"
	"log"
	"sync"
	"time"

	"xtv/internal/models"
)

type SystemMonitor struct {
	mu           sync.RWMutex
	stats        *models.SystemStats
	lastStats    *models.SystemStats
	ctx          context.Context
	cancel       context.CancelFunc
	updateTicker *time.Ticker
}

func NewSystemMonitor() *SystemMonitor {
	ctx, cancel := context.WithCancel(context.Background())

	monitor := &SystemMonitor{
		ctx:       ctx,
		cancel:    cancel,
		stats:     &models.SystemStats{},
		lastStats: &models.SystemStats{},
	}

	// Start monitoring
	go monitor.startMonitoring()

	return monitor
}

func (sm *SystemMonitor) startMonitoring() {
	sm.updateTicker = time.NewTicker(5 * time.Second) // Update every 5 seconds
	defer sm.updateTicker.Stop()

	// Initial stats
	sm.updateStats()

	for {
		select {
		case <-sm.ctx.Done():
			return
		case <-sm.updateTicker.C:
			sm.updateStats()
		}
	}
}

func (sm *SystemMonitor) updateStats() {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	// Store last stats for rate calculations
	sm.lastStats = sm.stats
	sm.stats = &models.SystemStats{
		Timestamp: time.Now(),
	}

	// Mock system stats (in a real implementation, these would come from gopsutil)
	sm.stats.CPUUsage = 25.5 + float64(time.Now().Second()%10) // Simulate varying CPU usage
	sm.stats.MemoryUsage = 45.2 + float64(time.Now().Second()%5)
	sm.stats.DiskUsage = 30.1 + float64(time.Now().Second()%3)
	sm.stats.NetworkIn = 1024000 + int64(time.Now().Second()*1000)
	sm.stats.NetworkOut = 512000 + int64(time.Now().Second()*500)
	sm.stats.GPUUsage = 0.0

	// VM Counts (placeholder - will be updated by VM manager)
	sm.stats.VMRunning = 0
	sm.stats.VMTotal = 0
}

func (sm *SystemMonitor) GetStats() *models.SystemStats {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	// Return a copy to avoid race conditions
	stats := *sm.stats
	return &stats
}

// Mock system info functions
func (sm *SystemMonitor) GetCPUInfo() (interface{}, error) {
	// Return mock CPU info
	return map[string]interface{}{
		"model":     "Intel(R) Core(TM) i7-8700K CPU @ 3.70GHz",
		"cores":     6,
		"threads":   12,
		"frequency": 3700,
	}, nil
}

func (sm *SystemMonitor) GetMemoryInfo() (interface{}, error) {
	// Return mock memory info
	return map[string]interface{}{
		"total":        16777216, // 16GB in MB
		"used":         7549747,
		"free":         9227469,
		"used_percent": 45.0,
	}, nil
}

func (sm *SystemMonitor) GetDiskInfo() (interface{}, error) {
	// Return mock disk info
	return []map[string]interface{}{
		{
			"device":       "/dev/sda",
			"mountpoint":   "/",
			"fstype":       "ext4",
			"total":        500107862016, // 500GB
			"used":         150032358604,
			"free":         350075503412,
			"used_percent": 30.0,
		},
	}, nil
}

func (sm *SystemMonitor) GetNetworkInfo() (interface{}, error) {
	// Return mock network info
	return []map[string]interface{}{
		{
			"name":         "eth0",
			"bytes_sent":   1024000,
			"bytes_recv":   2048000,
			"packets_sent": 1000,
			"packets_recv": 2000,
		},
	}, nil
}

func (sm *SystemMonitor) GetHostInfo() (interface{}, error) {
	// Return mock host info
	return map[string]interface{}{
		"hostname":         "xtv-server",
		"platform":         "linux",
		"platform_version": "Ubuntu 20.04.3 LTS",
		"kernel_version":   "5.4.0-74-generic",
		"uptime":           86400, // 24 hours in seconds
	}, nil
}

func (sm *SystemMonitor) UpdateVMCounts(running, total int) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	sm.stats.VMRunning = running
	sm.stats.VMTotal = total
}

func (sm *SystemMonitor) Shutdown() {
	sm.cancel()
	if sm.updateTicker != nil {
		sm.updateTicker.Stop()
	}
	log.Println("System monitor shutdown")
}
