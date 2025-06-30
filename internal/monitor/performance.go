package monitor

import (
	"fmt"
	"runtime"
	"runtime/debug"
	"sync"
	"time"

	"github.com/shirou/gopsutil/cpu"
	"github.com/shirou/gopsutil/disk"
	"github.com/shirou/gopsutil/mem"
)

// PerformanceStats holds performance metrics
type PerformanceStats struct {
	Timestamp   time.Time `json:"timestamp"`
	CPU         CPUStats  `json:"cpu"`
	Memory      MemStats  `json:"memory"`
	Disk        DiskStats `json:"disk"`
	Goroutines  int       `json:"goroutines"`
	HeapAlloc   uint64    `json:"heap_alloc"`
	HeapSys     uint64    `json:"heap_sys"`
	HeapIdle    uint64    `json:"heap_idle"`
	HeapInuse   uint64    `json:"heap_inuse"`
	HeapObjects uint64    `json:"heap_objects"`
	GC          GCStats   `json:"gc"`
}

// CPUStats holds CPU performance metrics
type CPUStats struct {
	UsagePercent float64   `json:"usage_percent"`
	LoadAverage  []float64 `json:"load_average"`
	Cores        int       `json:"cores"`
}

// MemStats holds memory performance metrics
type MemStats struct {
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Free        uint64  `json:"free"`
	UsedPercent float64 `json:"used_percent"`
	Available   uint64  `json:"available"`
}

// DiskStats holds disk performance metrics
type DiskStats struct {
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Free        uint64  `json:"free"`
	UsedPercent float64 `json:"used_percent"`
}

// GCStats holds garbage collection metrics
type GCStats struct {
	NumGC      uint32        `json:"num_gc"`
	PauseTotal time.Duration `json:"pause_total"`
	PauseNs    uint64        `json:"pause_ns"`
}

// PerformanceMonitor monitors system performance
type PerformanceMonitor struct {
	stats    []PerformanceStats
	maxStats int
	interval time.Duration
	stopChan chan bool
	mutex    sync.RWMutex
	enabled  bool
}

// NewPerformanceMonitor creates a new performance monitor
func NewPerformanceMonitor(interval time.Duration, maxStats int) *PerformanceMonitor {
	return &PerformanceMonitor{
		stats:    make([]PerformanceStats, 0, maxStats),
		maxStats: maxStats,
		interval: interval,
		stopChan: make(chan bool),
		enabled:  false,
	}
}

// Start begins performance monitoring
func (pm *PerformanceMonitor) Start() {
	if pm.enabled {
		return
	}

	pm.enabled = true
	go pm.monitor()
}

// Stop stops performance monitoring
func (pm *PerformanceMonitor) Stop() {
	if !pm.enabled {
		return
	}

	pm.enabled = false
	pm.stopChan <- true
}

// GetStats returns current performance statistics
func (pm *PerformanceMonitor) GetStats() PerformanceStats {
	return pm.collectStats()
}

// GetHistory returns historical performance data
func (pm *PerformanceMonitor) GetHistory() []PerformanceStats {
	pm.mutex.RLock()
	defer pm.mutex.RUnlock()

	stats := make([]PerformanceStats, len(pm.stats))
	copy(stats, pm.stats)
	return stats
}

// GetLatestStats returns the most recent stats
func (pm *PerformanceMonitor) GetLatestStats() *PerformanceStats {
	pm.mutex.RLock()
	defer pm.mutex.RUnlock()

	if len(pm.stats) == 0 {
		return nil
	}

	latest := pm.stats[len(pm.stats)-1]
	return &latest
}

// monitor runs the monitoring loop
func (pm *PerformanceMonitor) monitor() {
	ticker := time.NewTicker(pm.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			stats := pm.collectStats()
			pm.addStats(stats)
		case <-pm.stopChan:
			return
		}
	}
}

// collectStats collects current performance statistics
func (pm *PerformanceMonitor) collectStats() PerformanceStats {
	stats := PerformanceStats{
		Timestamp:  time.Now(),
		Goroutines: runtime.NumGoroutine(),
	}

	// Collect CPU stats
	if cpuPercent, err := cpu.Percent(0, false); err == nil && len(cpuPercent) > 0 {
		stats.CPU.UsagePercent = cpuPercent[0]
	}

	// Get load average using host info
	if hostInfo, err := cpu.Info(); err == nil && len(hostInfo) > 0 {
		stats.CPU.Cores = int(hostInfo[0].Cores)
	} else {
		stats.CPU.Cores = runtime.NumCPU()
	}

	// Load average is not directly available in gopsutil, so we'll use a placeholder
	stats.CPU.LoadAverage = []float64{0, 0, 0} // Placeholder values

	// Collect memory stats
	if vmstat, err := mem.VirtualMemory(); err == nil {
		stats.Memory.Total = vmstat.Total
		stats.Memory.Used = vmstat.Used
		stats.Memory.Free = vmstat.Free
		stats.Memory.UsedPercent = vmstat.UsedPercent
		stats.Memory.Available = vmstat.Available
	}

	// Collect disk stats
	if diskStat, err := disk.Usage("/"); err == nil {
		stats.Disk.Total = diskStat.Total
		stats.Disk.Used = diskStat.Used
		stats.Disk.Free = diskStat.Free
		stats.Disk.UsedPercent = diskStat.UsedPercent
	}

	// Collect Go runtime stats
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	stats.HeapAlloc = m.HeapAlloc
	stats.HeapSys = m.HeapSys
	stats.HeapIdle = m.HeapIdle
	stats.HeapInuse = m.HeapInuse
	stats.HeapObjects = m.HeapObjects

	stats.GC.NumGC = m.NumGC
	stats.GC.PauseTotal = time.Duration(m.PauseTotalNs)
	stats.GC.PauseNs = m.PauseNs[(m.NumGC+255)%256]

	return stats
}

// addStats adds stats to the history
func (pm *PerformanceMonitor) addStats(stats PerformanceStats) {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()

	pm.stats = append(pm.stats, stats)

	// Keep only the most recent stats
	if len(pm.stats) > pm.maxStats {
		pm.stats = pm.stats[1:]
	}
}

// GetPerformanceSummary returns a summary of performance metrics
func (pm *PerformanceMonitor) GetPerformanceSummary() map[string]interface{} {
	latest := pm.GetLatestStats()
	if latest == nil {
		return nil
	}

	summary := map[string]interface{}{
		"timestamp": latest.Timestamp,
		"cpu": map[string]interface{}{
			"usage_percent": fmt.Sprintf("%.2f%%", latest.CPU.UsagePercent),
			"cores":         latest.CPU.Cores,
			"load_1m":       fmt.Sprintf("%.2f", latest.CPU.LoadAverage[0]),
			"load_5m":       fmt.Sprintf("%.2f", latest.CPU.LoadAverage[1]),
			"load_15m":      fmt.Sprintf("%.2f", latest.CPU.LoadAverage[2]),
		},
		"memory": map[string]interface{}{
			"total":        fmt.Sprintf("%.2f GB", float64(latest.Memory.Total)/1e9),
			"used":         fmt.Sprintf("%.2f GB", float64(latest.Memory.Used)/1e9),
			"free":         fmt.Sprintf("%.2f GB", float64(latest.Memory.Free)/1e9),
			"used_percent": fmt.Sprintf("%.2f%%", latest.Memory.UsedPercent),
			"available":    fmt.Sprintf("%.2f GB", float64(latest.Memory.Available)/1e9),
		},
		"disk": map[string]interface{}{
			"total":        fmt.Sprintf("%.2f GB", float64(latest.Disk.Total)/1e9),
			"used":         fmt.Sprintf("%.2f GB", float64(latest.Disk.Used)/1e9),
			"free":         fmt.Sprintf("%.2f GB", float64(latest.Disk.Free)/1e9),
			"used_percent": fmt.Sprintf("%.2f%%", latest.Disk.UsedPercent),
		},
		"runtime": map[string]interface{}{
			"goroutines":   latest.Goroutines,
			"heap_alloc":   fmt.Sprintf("%.2f MB", float64(latest.HeapAlloc)/1e6),
			"heap_sys":     fmt.Sprintf("%.2f MB", float64(latest.HeapSys)/1e6),
			"heap_objects": latest.HeapObjects,
			"gc_count":     latest.GC.NumGC,
		},
	}

	return summary
}

// OptimizeMemory triggers memory optimization
func (pm *PerformanceMonitor) OptimizeMemory() {
	// Force garbage collection
	debug.FreeOSMemory()

	// Set GC percentage for better memory management
	debug.SetGCPercent(100)
}

// SetMemoryLimit sets memory limit for the application
func (pm *PerformanceMonitor) SetMemoryLimit(limit uint64) {
	debug.SetMemoryLimit(int64(limit))
}

// GetMemoryLimit returns current memory limit
func (pm *PerformanceMonitor) GetMemoryLimit() uint64 {
	return uint64(debug.SetMemoryLimit(-1))
}

// IsHealthy checks if the system is healthy
func (pm *PerformanceMonitor) IsHealthy() bool {
	latest := pm.GetLatestStats()
	if latest == nil {
		return false
	}

	// Check CPU usage
	if latest.CPU.UsagePercent > 90 {
		return false
	}

	// Check memory usage
	if latest.Memory.UsedPercent > 90 {
		return false
	}

	// Check disk usage
	if latest.Disk.UsedPercent > 90 {
		return false
	}

	// Check goroutine count
	if latest.Goroutines > 10000 {
		return false
	}

	return true
}

// GetHealthStatus returns detailed health status
func (pm *PerformanceMonitor) GetHealthStatus() map[string]interface{} {
	latest := pm.GetLatestStats()
	if latest == nil {
		return map[string]interface{}{
			"healthy": false,
			"reason":  "No performance data available",
		}
	}

	status := map[string]interface{}{
		"healthy": true,
		"checks":  make(map[string]interface{}),
	}

	checks := status["checks"].(map[string]interface{})

	// CPU check
	if latest.CPU.UsagePercent > 90 {
		checks["cpu"] = map[string]interface{}{
			"healthy":   false,
			"value":     fmt.Sprintf("%.2f%%", latest.CPU.UsagePercent),
			"threshold": "90%",
		}
		status["healthy"] = false
	} else {
		checks["cpu"] = map[string]interface{}{
			"healthy": true,
			"value":   fmt.Sprintf("%.2f%%", latest.CPU.UsagePercent),
		}
	}

	// Memory check
	if latest.Memory.UsedPercent > 90 {
		checks["memory"] = map[string]interface{}{
			"healthy":   false,
			"value":     fmt.Sprintf("%.2f%%", latest.Memory.UsedPercent),
			"threshold": "90%",
		}
		status["healthy"] = false
	} else {
		checks["memory"] = map[string]interface{}{
			"healthy": true,
			"value":   fmt.Sprintf("%.2f%%", latest.Memory.UsedPercent),
		}
	}

	// Disk check
	if latest.Disk.UsedPercent > 90 {
		checks["disk"] = map[string]interface{}{
			"healthy":   false,
			"value":     fmt.Sprintf("%.2f%%", latest.Disk.UsedPercent),
			"threshold": "90%",
		}
		status["healthy"] = false
	} else {
		checks["disk"] = map[string]interface{}{
			"healthy": true,
			"value":   fmt.Sprintf("%.2f%%", latest.Disk.UsedPercent),
		}
	}

	// Goroutines check
	if latest.Goroutines > 10000 {
		checks["goroutines"] = map[string]interface{}{
			"healthy":   false,
			"value":     latest.Goroutines,
			"threshold": 10000,
		}
		status["healthy"] = false
	} else {
		checks["goroutines"] = map[string]interface{}{
			"healthy": true,
			"value":   latest.Goroutines,
		}
	}

	return status
}
