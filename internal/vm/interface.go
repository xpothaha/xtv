package vm

import "xtv/internal/models"

// VMManager defines the interface for VM management
type VMManager interface {
	CreateVM(req *models.VMCreateRequest) (*models.VM, error)
	GetVM(id string) (*models.VM, error)
	ListVMs() []*models.VM
	UpdateVM(id string, req *models.VMUpdateRequest) (*models.VM, error)
	DeleteVM(id string) error
	StartVM(id string) error
	StopVM(id string) error
	RestartVM(id string) error
	PauseVM(id string) error
	ResumeVM(id string) error
	GetVMStats(id string) (*models.VMStats, error)
	Shutdown() error
}
