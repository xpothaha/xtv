//go:build !mock
// +build !mock

package vm

import (
	"fmt"
	"log"
	"sync"
	"time"

	libvirt "github.com/libvirt/libvirt-go"
	libvirtxml "github.com/libvirt/libvirt-go-xml"

	"xtv/internal/config"
	"xtv/internal/models"
)

// LibVirtManager implements VMManager using libvirt
type LibVirtManager struct {
	mu      sync.RWMutex
	config  *config.Config
	conn    *libvirt.Connect
	domains map[string]*libvirt.Domain
	ctx     chan struct{}
}

// NewLibVirtManager creates a new libvirt-based VM manager
func NewLibVirtManager(cfg *config.Config) (*LibVirtManager, error) {
	conn, err := libvirt.NewConnect(cfg.LibVirt.URI)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to libvirt: %v", err)
	}

	manager := &LibVirtManager{
		config:  cfg,
		conn:    conn,
		domains: make(map[string]*libvirt.Domain),
		ctx:     make(chan struct{}),
	}

	log.Println("LibVirt VM Manager initialized")
	return manager, nil
}

func (m *LibVirtManager) CreateVM(req *models.VMCreateRequest) (*models.VM, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Generate VM ID
	vmID := fmt.Sprintf("xtv-%s", req.Name)

	// Create domain XML
	domainXML := m.buildDomainXML(vmID, req)

	// Define domain in libvirt
	domain, err := m.conn.DomainDefineXML(domainXML)
	if err != nil {
		return nil, fmt.Errorf("failed to define domain: %v", err)
	}

	// Create VM object
	vm := &models.VM{
		ID:          vmID,
		Name:        req.Name,
		Description: req.Description,
		Status:      models.VMStatusStopped,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		CPU:         req.CPU,
		Memory:      req.Memory,
		Storage:     req.Storage,
		Network:     req.Network,
		GPU:         req.GPU,
		OS:          req.OS,
	}

	// Store domain reference
	m.domains[vmID] = domain

	log.Printf("Created LibVirt VM: %s (%s)", vm.Name, vmID)
	return vm, nil
}

func (m *LibVirtManager) GetVM(id string) (*models.VM, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	domain, exists := m.domains[id]
	if !exists {
		return nil, fmt.Errorf("VM not found: %s", id)
	}

	// Get domain info
	info, err := domain.GetInfo()
	if err != nil {
		return nil, fmt.Errorf("failed to get domain info: %v", err)
	}

	// Get domain XML
	xmlDesc, err := domain.GetXMLDesc(0)
	if err != nil {
		return nil, fmt.Errorf("failed to get domain XML: %v", err)
	}

	// Parse XML to get VM details
	vm := m.parseDomainXML(xmlDesc)
	vm.Status = m.getVMStatus(info.State)

	return vm, nil
}

func (m *LibVirtManager) ListVMs() []*models.VM {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var vms []*models.VM

	// Get all domains from libvirt
	domains, err := m.conn.ListAllDomains(libvirt.CONNECT_LIST_DOMAINS_ACTIVE | libvirt.CONNECT_LIST_DOMAINS_INACTIVE)
	if err != nil {
		log.Printf("Failed to list domains: %v", err)
		return vms
	}

	for _, domain := range domains {
		info, err := domain.GetInfo()
		if err != nil {
			log.Printf("Failed to get domain info: %v", err)
			continue
		}

		name, err := domain.GetName()
		if err != nil {
			log.Printf("Failed to get domain name: %v", err)
			continue
		}

		vm := &models.VM{
			ID:        name,
			Name:      name,
			Status:    m.getVMStatus(info.State),
			UpdatedAt: time.Now(),
		}

		vms = append(vms, vm)
	}

	return vms
}

func (m *LibVirtManager) UpdateVM(id string, req *models.VMUpdateRequest) (*models.VM, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	domain, exists := m.domains[id]
	if !exists {
		return nil, fmt.Errorf("VM not found: %s", id)
	}

	// Get current XML
	xmlDesc, err := domain.GetXMLDesc(0)
	if err != nil {
		return nil, fmt.Errorf("failed to get domain XML: %v", err)
	}

	// Update XML with new configuration
	updatedXML := m.updateDomainXML(xmlDesc, req)

	// Undefine and redefine domain
	if err := domain.Undefine(); err != nil {
		return nil, fmt.Errorf("failed to undefine domain: %v", err)
	}

	newDomain, err := m.conn.DomainDefineXML(updatedXML)
	if err != nil {
		return nil, fmt.Errorf("failed to redefine domain: %v", err)
	}

	m.domains[id] = newDomain

	// Get updated VM info
	vm, err := m.GetVM(id)
	if err != nil {
		return nil, err
	}

	log.Printf("Updated LibVirt VM: %s", id)
	return vm, nil
}

func (m *LibVirtManager) DeleteVM(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	domain, exists := m.domains[id]
	if !exists {
		return fmt.Errorf("VM not found: %s", id)
	}

	// Destroy domain if running
	info, err := domain.GetInfo()
	if err == nil && info.State == libvirt.DOMAIN_RUNNING {
		if err := domain.Destroy(); err != nil {
			return fmt.Errorf("failed to destroy domain: %v", err)
		}
	}

	// Undefine domain
	if err := domain.Undefine(); err != nil {
		return fmt.Errorf("failed to undefine domain: %v", err)
	}

	delete(m.domains, id)

	log.Printf("Deleted LibVirt VM: %s", id)
	return nil
}

func (m *LibVirtManager) StartVM(id string) error {
	return m.controlVM(id, "start")
}

func (m *LibVirtManager) StopVM(id string) error {
	return m.controlVM(id, "stop")
}

func (m *LibVirtManager) RestartVM(id string) error {
	if err := m.StopVM(id); err != nil {
		return err
	}
	time.Sleep(2 * time.Second)
	return m.StartVM(id)
}

func (m *LibVirtManager) PauseVM(id string) error {
	return m.controlVM(id, "pause")
}

func (m *LibVirtManager) ResumeVM(id string) error {
	return m.controlVM(id, "resume")
}

func (m *LibVirtManager) controlVM(id, action string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	domain, exists := m.domains[id]
	if !exists {
		return fmt.Errorf("VM not found: %s", id)
	}

	var err error
	switch action {
	case "start":
		err = domain.Create()
	case "stop":
		err = domain.Destroy()
	case "pause":
		err = domain.Suspend()
	case "resume":
		err = domain.Resume()
	}

	if err != nil {
		return fmt.Errorf("failed to %s VM: %v", action, err)
	}

	log.Printf("%s LibVirt VM: %s", action, id)
	return nil
}

func (m *LibVirtManager) GetVMStats(id string) (*models.VMStats, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	domain, exists := m.domains[id]
	if !exists {
		return nil, fmt.Errorf("VM not found: %s", id)
	}

	// Get domain stats
	stats, err := domain.GetCPUStats(0, 0, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to get CPU stats: %v", err)
	}

	// Parse stats
	var cpuUsage float64
	if len(stats) > 0 {
		cpuUsage = float64(stats[0].CpuTime) / 1000000.0 // Convert to percentage
	}

	return &models.VMStats{
		VMID:        id,
		Timestamp:   time.Now(),
		CPUUsage:    cpuUsage,
		MemoryUsage: 0, // TODO: Get memory stats
		DiskUsage:   0, // TODO: Get disk stats
		NetworkIn:   0, // TODO: Get network stats
		NetworkOut:  0,
		GPUUsage:    0, // TODO: Get GPU stats
	}, nil
}

func (m *LibVirtManager) Shutdown() error {
	close(m.ctx)
	if m.conn != nil {
		return m.conn.Close()
	}
	return nil
}

// Helper methods

func (m *LibVirtManager) buildDomainXML(vmID string, req *models.VMCreateRequest) string {
	// Build libvirt domain XML
	domain := &libvirtxml.Domain{
		Type: "kvm",
		Name: vmID,
		Memory: &libvirtxml.DomainMemory{
			Value: uint(req.Memory.Size),
			Unit:  "MiB",
		},
		VCPU: &libvirtxml.DomainVCPU{
			Value: uint(req.CPU.Cores * req.CPU.Sockets),
		},
		CPU: &libvirtxml.DomainCPU{
			Mode:     req.CPU.Model,
			Features: m.buildCPUFeatures(req.CPU.Features),
		},
		OS: &libvirtxml.DomainOS{
			Type: &libvirtxml.DomainOSType{
				Arch: req.OS.Arch,
				Type: req.OS.Type,
			},
			Loader: m.buildFirmwareLoader(req.OS.Firmware),
		},
		Devices: &libvirtxml.DomainDeviceList{
			Disks:      m.buildDiskXML(req.Storage),
			Interfaces: m.buildNetworkXML(req.Network),
		},
	}
	// CPU pinning
	if len(req.CPU.Pinning) > 0 {
		var pinList []libvirtxml.DomainVCPUPin
		for vcpu, pcore := range req.CPU.Pinning {
			pinList = append(pinList, libvirtxml.DomainVCPUPin{VCPU: uint(vcpu), CPUSet: fmt.Sprintf("%d", pcore)})
		}
		domain.CPUTune = &libvirtxml.DomainCPUTune{VCPUPin: pinList}
	}
	// NUMA
	if req.CPU.NUMANode > 0 {
		cpuRange := fmt.Sprintf("0-%d", req.CPU.Cores*req.CPU.Sockets-1)
		domain.CPU.NUMA = &libvirtxml.DomainNUMA{
			Cells: []libvirtxml.DomainNUMACell{{ID: uint(req.CPU.NUMANode), CPUs: cpuRange, Memory: &libvirtxml.DomainNUMACellMemory{Value: uint(req.Memory.Size), Unit: "MiB"}}},
		}
	}
	// Scheduling (affinity/anti-affinity/overcommit) - placeholder for now
	// ...
	if len(req.OS.BootOrder) > 0 {
		domain.OS.BootDevices = m.buildBootOrder(req.OS.BootOrder)
	}
	xml, err := domain.Marshal()
	if err != nil {
		log.Printf("Failed to marshal domain XML: %v", err)
		return ""
	}
	return xml
}

func (m *LibVirtManager) buildCPUFeatures(features []string) []libvirtxml.DomainCPUFeature {
	var out []libvirtxml.DomainCPUFeature
	for _, f := range features {
		out = append(out, libvirtxml.DomainCPUFeature{Name: f, Policy: "require"})
	}
	return out
}

func (m *LibVirtManager) buildFirmwareLoader(firmware string) *libvirtxml.DomainLoader {
	if firmware == "uefi" {
		return &libvirtxml.DomainLoader{Path: "/usr/share/OVMF/OVMF_CODE.fd", Readonly: "yes", Type: "pflash"}
	}
	return nil // SeaBIOS default
}

func (m *LibVirtManager) buildBootOrder(order []string) []libvirtxml.DomainBootDevice {
	var out []libvirtxml.DomainBootDevice
	for _, dev := range order {
		out = append(out, libvirtxml.DomainBootDevice{Dev: dev})
	}
	return out
}

func (m *LibVirtManager) buildDiskXML(storage models.StorageConfig) []libvirtxml.DomainDisk {
	var disks []libvirtxml.DomainDisk

	for _, disk := range storage.Disks {
		domainDisk := libvirtxml.DomainDisk{
			Device: "disk",
			Driver: &libvirtxml.DomainDiskDriver{
				Name:  "qemu",
				Type:  disk.Format,
				Cache: disk.Cache,
			},
			Source: &libvirtxml.DomainDiskSource{
				File: &libvirtxml.DomainDiskSourceFile{
					File: disk.Path,
				},
			},
			Target: &libvirtxml.DomainDiskTarget{
				Dev: disk.Name,
				Bus: disk.Bus,
			},
		}
		disks = append(disks, domainDisk)
	}

	for _, cd := range storage.CDROMs {
		domainCD := libvirtxml.DomainDisk{
			Device: "cdrom",
			Target: &libvirtxml.DomainDiskTarget{
				Dev: "hdc",
				Bus: "ide",
			},
			Source: &libvirtxml.DomainDiskSource{
				File: &libvirtxml.DomainDiskSourceFile{
					File: cd.Path,
				},
			},
			ReadOnly: &libvirtxml.DomainDiskReadOnly{},
		}
		disks = append(disks, domainCD)
	}

	return disks
}

func (m *LibVirtManager) buildNetworkXML(network models.NetworkConfig) []libvirtxml.DomainInterface {
	var interfaces []libvirtxml.DomainInterface

	for _, iface := range network.Interfaces {
		domainIface := libvirtxml.DomainInterface{
			Source: &libvirtxml.DomainInterfaceSource{
				Network: &libvirtxml.DomainInterfaceSourceNetwork{
					Network: iface.Network,
				},
			},
			Model: &libvirtxml.DomainInterfaceModel{
				Type: iface.Model,
			},
		}
		if iface.MAC != "" {
			domainIface.MAC = &libvirtxml.DomainInterfaceMAC{Address: iface.MAC}
		}
		if iface.VLAN > 0 {
			domainIface.VLan = &libvirtxml.DomainInterfaceVLan{
				Tags: []libvirtxml.DomainInterfaceVLanTag{{ID: uint(iface.VLAN)}},
			}
		}
		if iface.MTU > 0 {
			domainIface.MTU = &libvirtxml.DomainInterfaceMTU{Size: uint(iface.MTU)}
		}
		interfaces = append(interfaces, domainIface)
	}

	return interfaces
}

func (m *LibVirtManager) buildVideoXML(gpu models.GPUConfig) []libvirtxml.DomainVideo {
	var videos []libvirtxml.DomainVideo
	videoType := "qxl"
	if gpu.Type != "" {
		videoType = gpu.Type
	}
	videos = append(videos, libvirtxml.DomainVideo{
		Model: &libvirtxml.DomainVideoModel{Type: videoType},
	})
	return videos
}

func (m *LibVirtManager) parseDomainXML(xmlDesc string) *models.VM {
	// Parse libvirt domain XML to VM model
	// This is a simplified implementation
	vm := &models.VM{
		UpdatedAt: time.Now(),
	}

	// TODO: Implement proper XML parsing
	return vm
}

func (m *LibVirtManager) updateDomainXML(xmlDesc string, req *models.VMUpdateRequest) string {
	// Update existing domain XML with new configuration
	// This is a simplified implementation
	return xmlDesc
}

func (m *LibVirtManager) getVMStatus(state libvirt.DomainState) models.VMStatus {
	switch state {
	case libvirt.DOMAIN_NOSTATE:
		return models.VMStatusStopped
	case libvirt.DOMAIN_RUNNING:
		return models.VMStatusRunning
	case libvirt.DOMAIN_BLOCKED:
		return models.VMStatusPaused
	case libvirt.DOMAIN_PAUSED:
		return models.VMStatusPaused
	case libvirt.DOMAIN_SHUTDOWN:
		return models.VMStatusStopping
	case libvirt.DOMAIN_SHUTOFF:
		return models.VMStatusStopped
	case libvirt.DOMAIN_CRASHED:
		return models.VMStatusError
	default:
		return models.VMStatusStopped
	}
}
