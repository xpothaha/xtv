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

	pass := "o"
	fail := "x"

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

	// 3. CPU Virtualization (VT-x/AMD-V)
	virt := false
	if out, err := exec.Command("egrep", "-c", "(vmx|svm)", "/proc/cpuinfo").Output(); err == nil {
		virt = strings.TrimSpace(string(out)) != "0"
	}
	if virt {
		results = append(results, fmt.Sprintf("[%s] CPU Virtualization (VT-x/AMD-V)", pass))
	} else {
		results = append(results, fmt.Sprintf("[%s] CPU Virtualization (VT-x/AMD-V)", fail))
		ok = false
	}

	// 4. IOMMU (VT-d/AMD-Vi)
	iommu := false
	if out, err := exec.Command("dmesg").Output(); err == nil {
		iommu = strings.Contains(string(out), "DMAR") || strings.Contains(string(out), "IOMMU")
	}
	if cmdline, err := os.ReadFile("/proc/cmdline"); err == nil {
		if strings.Contains(string(cmdline), "intel_iommu=on") || strings.Contains(string(cmdline), "amd_iommu=on") {
			iommu = true
		}
	}
	if iommu {
		results = append(results, fmt.Sprintf("[%s] IOMMU (VT-d/AMD-Vi)", pass))
	} else {
		results = append(results, fmt.Sprintf("[%s] IOMMU (VT-d/AMD-Vi)", fail))
		ok = false
	}

	// 5. Hyper-Threading (HT)
	ht := false
	if out, err := exec.Command("lscpu").Output(); err == nil {
		for _, line := range strings.Split(string(out), "\n") {
			if strings.HasPrefix(line, "Thread(s) per core:") {
				fields := strings.Fields(line)
				if len(fields) >= 4 && fields[3] != "1" {
					ht = true
				}
			}
		}
	}
	if ht {
		results = append(results, fmt.Sprintf("[%s] Hyper-Threading (HT)", pass))
	} else {
		results = append(results, fmt.Sprintf("[%s] Hyper-Threading (HT)", fail))
		ok = false
	}

	// 6. KVM kernel module loaded
	kvm := false
	if out, err := exec.Command("lsmod").Output(); err == nil {
		kvm = strings.Contains(string(out), "kvm")
	}
	if kvm {
		results = append(results, fmt.Sprintf("[%s] KVM kernel module loaded", pass))
	} else {
		results = append(results, fmt.Sprintf("[%s] KVM kernel module loaded", fail))
		ok = false
	}

	// 7. libvirt installed
	libvirtOK := false
	if _, err := exec.LookPath("libvirtd"); err == nil {
		libvirtOK = true
	}
	if libvirtOK {
		results = append(results, fmt.Sprintf("[%s] libvirt installed", pass))
	} else {
		results = append(results, fmt.Sprintf("[%s] libvirt installed", fail))
		ok = false
	}

	// 8. QEMU installed
	qemuOK := false
	if _, err := exec.LookPath("qemu-system-x86_64"); err == nil {
		qemuOK = true
	}
	if qemuOK {
		results = append(results, fmt.Sprintf("[%s] QEMU installed", pass))
	} else {
		results = append(results, fmt.Sprintf("[%s] QEMU installed", fail))
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
		results = append(results, fmt.Sprintf("[%s] Disk space check failed", fail))
		ok = false
	}

	return ok, results
}
