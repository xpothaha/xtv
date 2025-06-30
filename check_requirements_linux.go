//go:build linux

package main

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"syscall"
)

func checkRequirements() (bool, []string) {
	results := []string{}
	ok := true

	pass := "✔"
	fail := "✗"

	// 1. Check RAM >= 4GB
	ramOK := false
	ramGB := 0.0
	if data, err := os.ReadFile("/proc/meminfo"); err == nil {
		lines := strings.Split(string(data), "\n")
		for _, line := range lines {
			if strings.HasPrefix(line, "MemTotal:") {
				fields := strings.Fields(line)
				if len(fields) >= 2 {
					memKB, _ := strconv.Atoi(fields[1])
					ramGB = float64(memKB) / 1024.0 / 1024.0
					if ramGB >= 4.0 {
						ramOK = true
					}
				}
			}
		}
	}
	if ramOK {
		results = append(results, fmt.Sprintf("[%s] RAM >= 4GB (%.1f GB)", pass, ramGB))
	} else {
		results = append(results, fmt.Sprintf("[%s] RAM >= 4GB (%.1f GB)", fail, ramGB))
		ok = false
	}

	// 2. Check CPU cores >= 2
	cpuOK := runtime.NumCPU() >= 2
	if cpuOK {
		results = append(results, fmt.Sprintf("[%s] CPU Cores >= 2 (%d cores)", pass, runtime.NumCPU()))
	} else {
		results = append(results, fmt.Sprintf("[%s] CPU Cores >= 2 (%d cores)", fail, runtime.NumCPU()))
		ok = false
	}

	// 3. Check virtualization support (VT-x/AMD-V)
	virt := false
	if data, err := os.ReadFile("/proc/cpuinfo"); err == nil {
		cpuinfo := string(data)
		if strings.Contains(cpuinfo, "vmx") || strings.Contains(cpuinfo, "svm") {
			virt = true
		}
	}
	if virt {
		results = append(results, "[%s] CPU Virtualization (VT-x/AMD-V)")
	} else {
		results = append(results, "[%s] CPU Virtualization (VT-x/AMD-V)")
		ok = false
	}

	// 4. Check IOMMU (Intel VT-d/AMD-Vi)
	iommu := false
	if data, err := os.ReadFile("/proc/cmdline"); err == nil {
		cmdline := string(data)
		if strings.Contains(cmdline, "intel_iommu=on") || strings.Contains(cmdline, "amd_iommu=on") {
			iommu = true
		}
	}
	if iommu {
		results = append(results, "[%s] IOMMU (VT-d/AMD-Vi)")
	} else {
		results = append(results, "[%s] IOMMU (VT-d/AMD-Vi)")
		ok = false
	}

	// 5. Check Hyper-Threading (HT)
	ht := false
	if data, err := os.ReadFile("/proc/cpuinfo"); err == nil {
		lines := strings.Split(string(data), "\n")
		coreCount := 0
		cpuCount := 0
		for _, line := range lines {
			if strings.HasPrefix(line, "cpu cores") {
				coreCount++
			}
			if strings.HasPrefix(line, "processor") {
				cpuCount++
			}
		}
		if cpuCount > coreCount {
			ht = true
		}
	}
	if ht {
		results = append(results, "[%s] Hyper-Threading (HT)")
	} else {
		results = append(results, "[%s] Hyper-Threading (HT)")
		ok = false
	}

	// 6. Check KVM kernel module
	kvm := false
	if data, err := os.ReadFile("/proc/modules"); err == nil {
		if strings.Contains(string(data), "kvm") {
			kvm = true
		}
	}
	if kvm {
		results = append(results, "[%s] KVM kernel module loaded")
	} else {
		results = append(results, "[%s] KVM kernel module loaded")
		ok = false
	}

	// 7. Check libvirt installed
	libvirtOK := false
	if _, err := exec.LookPath("libvirtd"); err == nil {
		libvirtOK = true
	}
	if libvirtOK {
		results = append(results, "[%s] libvirt installed")
	} else {
		results = append(results, "[%s] libvirt installed (sudo apt install libvirt-daemon-system)")
		ok = false
	}

	// 8. Check qemu installed
	qemuOK := false
	if _, err := exec.LookPath("qemu-system-x86_64"); err == nil {
		qemuOK = true
	}
	if qemuOK {
		results = append(results, "[%s] QEMU installed")
	} else {
		results = append(results, "[%s] QEMU installed (sudo apt install qemu-kvm)")
		ok = false
	}

	// 9. Check disk space >= 20GB
	diskOK := false
	var fs syscall.Statfs_t
	if err := syscall.Statfs("/", &fs); err == nil {
		freeGB := float64(fs.Bavail) * float64(fs.Bsize) / 1e9
		if freeGB >= 20.0 {
			diskOK = true
			results = append(results, fmt.Sprintf("[%s] Disk space >= 20GB (%.1f GB free)", pass, freeGB))
		} else {
			results = append(results, fmt.Sprintf("[%s] Disk space >= 20GB (%.1f GB free)", fail, freeGB))
			ok = false
		}
	}
	if !diskOK {
		results = append(results, "[%s] Disk space check failed")
		ok = false
	}

	return ok, results
}
