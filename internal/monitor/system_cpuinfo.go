package monitor

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"runtime"
	"strings"

	"github.com/shirou/gopsutil/cpu"
)

type CPUFeatureInfo struct {
	ModelName      string   `json:"model_name"`
	VendorID       string   `json:"vendor_id"`
	Cores          int      `json:"cores"`
	Threads        int      `json:"threads"`
	Sockets        int      `json:"sockets"`
	Flags          []string `json:"flags"`
	Virtualization []string `json:"virtualization"`
	Cache          string   `json:"cache"`
	NUMANodes      int      `json:"numa_nodes"`
	TurboBoost     bool     `json:"turbo_boost"`
	PowerMgmt      bool     `json:"power_management"`
	Frequency      float64  `json:"frequency_ghz"`
}

func GetHostCPUInfo() (*CPUFeatureInfo, error) {
	info := &CPUFeatureInfo{}
	cpuInfos, err := cpu.Info()
	if err != nil || len(cpuInfos) == 0 {
		return nil, err
	}
	info.ModelName = cpuInfos[0].ModelName
	info.VendorID = cpuInfos[0].VendorID
	info.Cores = int(cpuInfos[0].Cores)
	info.Threads = runtime.NumCPU()
	info.Sockets = len(cpuInfos) / int(cpuInfos[0].Cores)
	info.Frequency = cpuInfos[0].Mhz / 1000.0
	info.Flags = cpuInfos[0].Flags

	// Virtualization flags
	virtFlags := []string{}
	for _, flag := range info.Flags {
		if flag == "vmx" || flag == "svm" {
			virtFlags = append(virtFlags, flag)
		}
		if flag == "ept" {
			virtFlags = append(virtFlags, "ept")
		}
		if flag == "vt-d" {
			virtFlags = append(virtFlags, "vt-d")
		}
	}
	info.Virtualization = virtFlags

	// Cache info (Linux only)
	if cache, err := getCPUCacheInfo(); err == nil {
		info.Cache = cache
	}

	// NUMA nodes
	if nodes, err := getNUMANodes(); err == nil {
		info.NUMANodes = nodes
	}

	// Turbo Boost
	info.TurboBoost = hasTurboBoost()

	// Power Management
	info.PowerMgmt = hasPowerManagement()

	return info, nil
}

func getCPUCacheInfo() (string, error) {
	out, err := exec.Command("lscpu", "-J").Output()
	if err != nil {
		return "", err
	}
	var data map[string]interface{}
	if err := json.Unmarshal(out, &data); err != nil {
		return "", err
	}
	if fields, ok := data["lscpu"].([]interface{}); ok {
		for _, f := range fields {
			m := f.(map[string]interface{})
			if m["field"] == "L3 cache:" {
				return m["data"].(string), nil
			}
		}
	}
	return "", nil
}

func getNUMANodes() (int, error) {
	out, err := exec.Command("lscpu").Output()
	if err != nil {
		return 0, err
	}
	lines := strings.Split(string(out), "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "NUMA node(s):") {
			parts := strings.Fields(line)
			if len(parts) >= 3 {
				return parseInt(parts[2]), nil
			}
		}
	}
	return 1, nil
}

func hasTurboBoost() bool {
	out, err := exec.Command("cat", "/sys/devices/system/cpu/intel_pstate/no_turbo").Output()
	if err != nil {
		return false
	}
	return strings.TrimSpace(string(out)) == "0"
}

func hasPowerManagement() bool {
	out, err := exec.Command("cpupower", "frequency-info").Output()
	if err != nil {
		return false
	}
	return strings.Contains(string(out), "boost state support")
}

func parseInt(s string) int {
	var i int
	_, _ = fmt.Sscanf(s, "%d", &i)
	return i
}
