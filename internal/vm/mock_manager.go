//go:build !libvirt
// +build !libvirt

package vm

import (
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"

	"xtv/internal/config"
	"xtv/internal/models"
)

// MockManager is a mock implementation of VM manager for testing
type MockManager struct {
	mu     sync.RWMutex
	config *config.Config
	vms    map[string]*models.VM
	ctx    chan struct{}
}

func NewMockManager(cfg *config.Config) *MockManager {
	manager := &MockManager{
		config: cfg,
		vms:    make(map[string]*models.VM),
		ctx:    make(chan struct{}),
	}

	log.Println("Mock VM Manager initialized")
	return manager
}

func (m *MockManager) CreateVM(req *models.VMCreateRequest) (*models.VM, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Generate VM ID
	vmID := uuid.New().String()

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

	// Store VM
	m.vms[vmID] = vm

	log.Printf("Created Mock VM: %s (%s)", vm.Name, vmID)
	return vm, nil
}

func (m *MockManager) GetVM(id string) (*models.VM, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	vm, exists := m.vms[id]
	if !exists {
		return nil, fmt.Errorf("VM not found: %s", id)
	}

	return vm, nil
}

func (m *MockManager) ListVMs() []*models.VM {
	m.mu.RLock()
	defer m.mu.RUnlock()

	vms := make([]*models.VM, 0, len(m.vms))
	for _, vm := range m.vms {
		vms = append(vms, vm)
	}

	return vms
}

func (m *MockManager) UpdateVM(id string, req *models.VMUpdateRequest) (*models.VM, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	vm, exists := m.vms[id]
	if !exists {
		return nil, fmt.Errorf("VM not found: %s", id)
	}

	// Update fields if provided
	if req.Name != nil {
		vm.Name = *req.Name
	}
	if req.Description != nil {
		vm.Description = *req.Description
	}
	if req.CPU != nil {
		vm.CPU = *req.CPU
	}
	if req.Memory != nil {
		vm.Memory = *req.Memory
	}
	if req.Storage != nil {
		vm.Storage = *req.Storage
	}
	if req.Network != nil {
		vm.Network = *req.Network
	}
	if req.GPU != nil {
		vm.GPU = *req.GPU
	}
	if req.OS != nil {
		vm.OS = *req.OS
	}

	vm.UpdatedAt = time.Now()

	log.Printf("Updated Mock VM: %s", id)
	return vm, nil
}

func (m *MockManager) DeleteVM(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	_, exists := m.vms[id]
	if !exists {
		return fmt.Errorf("VM not found: %s", id)
	}

	// Remove from map
	delete(m.vms, id)

	log.Printf("Deleted Mock VM: %s", id)
	return nil
}

func (m *MockManager) StartVM(id string) error {
	return m.controlVM(id, "start")
}

func (m *MockManager) StopVM(id string) error {
	return m.controlVM(id, "stop")
}

func (m *MockManager) RestartVM(id string) error {
	return m.controlVM(id, "restart")
}

func (m *MockManager) PauseVM(id string) error {
	return m.controlVM(id, "pause")
}

func (m *MockManager) ResumeVM(id string) error {
	return m.controlVM(id, "resume")
}

func (m *MockManager) controlVM(id, action string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	vm, exists := m.vms[id]
	if !exists {
		return fmt.Errorf("VM not found: %s", id)
	}

	// Simulate action with status changes
	switch action {
	case "start":
		vm.Status = models.VMStatusRunning
	case "stop":
		vm.Status = models.VMStatusStopped
	case "restart":
		vm.Status = models.VMStatusRunning
	case "pause":
		vm.Status = models.VMStatusPaused
	case "resume":
		vm.Status = models.VMStatusRunning
	}

	vm.UpdatedAt = time.Now()
	log.Printf("%s Mock VM: %s", action, id)
	return nil
}

func (m *MockManager) GetVMStats(id string) (*models.VMStats, error) {
	// Return mock stats
	return &models.VMStats{
		VMID:        id,
		Timestamp:   time.Now(),
		CPUUsage:    25.5,
		MemoryUsage: 45.2,
		DiskUsage:   30.1,
		NetworkIn:   1024000,
		NetworkOut:  512000,
		GPUUsage:    0.0,
	}, nil
}

func (m *MockManager) Shutdown() error {
	close(m.ctx)
	log.Println("Mock VM Manager shutdown")
	return nil
}
