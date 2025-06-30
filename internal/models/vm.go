package models

import (
	"time"
)

// VM represents a virtual machine
type VM struct {
	ID          string    `json:"id" xml:"id"`
	Name        string    `json:"name" xml:"name"`
	Description string    `json:"description" xml:"description"`
	Status      VMStatus  `json:"status" xml:"status"`
	CreatedAt   time.Time `json:"created_at" xml:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" xml:"updated_at"`

	// Resources
	CPU     CPUConfig     `json:"cpu" xml:"cpu"`
	Memory  MemoryConfig  `json:"memory" xml:"memory"`
	Storage StorageConfig `json:"storage" xml:"storage"`
	Network NetworkConfig `json:"network" xml:"network"`
	GPU     GPUConfig     `json:"gpu" xml:"gpu"`

	// OS Configuration
	OS OSConfig `json:"os" xml:"os"`
}

// VMStatus represents the current status of a VM
type VMStatus string

const (
	VMStatusStopped  VMStatus = "stopped"
	VMStatusRunning  VMStatus = "running"
	VMStatusPaused   VMStatus = "paused"
	VMStatusStarting VMStatus = "starting"
	VMStatusStopping VMStatus = "stopping"
	VMStatusError    VMStatus = "error"
)

// CPUConfig represents CPU configuration
type CPUConfig struct {
	Cores    int      `json:"cores" xml:"cores"`
	Threads  int      `json:"threads" xml:"threads"`
	Sockets  int      `json:"sockets" xml:"sockets"`
	Model    string   `json:"model" xml:"model"`
	Features []string `json:"features" xml:"features"`
	MaxUsage int      `json:"max_usage" xml:"max_usage"`
	Pinning  []int    `json:"pinning" xml:"pinning"` // physical core IDs
	NUMANode int      `json:"numa_node" xml:"numa_node"`
}

// MemoryConfig represents memory configuration
type MemoryConfig struct {
	Size    int64 `json:"size" xml:"size"`         // in MB
	MaxSize int64 `json:"max_size" xml:"max_size"` // in MB
	Usage   int   `json:"usage" xml:"usage"`       // percentage
}

// StorageConfig represents storage configuration
type StorageConfig struct {
	Disks  []DiskConfig  `json:"disks" xml:"disks"`
	CDROMs []CDROMConfig `json:"cdroms" xml:"cdroms"`
}

// DiskConfig represents a disk configuration
type DiskConfig struct {
	ID       string `json:"id" xml:"id"`
	Name     string `json:"name" xml:"name"`
	Path     string `json:"path" xml:"path"`
	Size     int64  `json:"size" xml:"size"`
	Format   string `json:"format" xml:"format"`
	Bus      string `json:"bus" xml:"bus"`
	Type     string `json:"type" xml:"type"` // ssd, hdd, nvme
	Bootable bool   `json:"bootable" xml:"bootable"`
	Cache    string `json:"cache" xml:"cache"`
}

// CDROMConfig represents a CDROM/ISO configuration
type CDROMConfig struct {
	Path     string `json:"path" xml:"path"`
	Bootable bool   `json:"bootable" xml:"bootable"`
}

// NetworkConfig represents network configuration
type NetworkConfig struct {
	Interfaces []NetworkInterface `json:"interfaces" xml:"interfaces"`
	VXLANs     []VXLANConfig      `json:"vxlans,omitempty" xml:"vxlans,omitempty"`
	Firewalls  []FirewallRule     `json:"firewalls,omitempty" xml:"firewalls,omitempty"`
}

// NetworkInterface represents a network interface
type NetworkInterface struct {
	ID       string    `json:"id" xml:"id"`
	Name     string    `json:"name" xml:"name"`
	Type     string    `json:"type" xml:"type"`
	MAC      string    `json:"mac" xml:"mac"`
	IP       string    `json:"ip" xml:"ip"`
	Network  string    `json:"network" xml:"network"`
	Model    string    `json:"model" xml:"model"`
	VLAN     int       `json:"vlan" xml:"vlan"`
	MTU      int       `json:"mtu" xml:"mtu"`
	Floating string    `json:"floating_ip,omitempty" xml:"floating_ip,omitempty"`
	NAT      bool      `json:"nat,omitempty" xml:"nat,omitempty"`
	PortFwds []PortFwd `json:"port_fwds,omitempty" xml:"port_fwds,omitempty"`
}

// VXLANConfig represents VXLAN network
type VXLANConfig struct {
	ID      string   `json:"id" xml:"id"`
	VNI     int      `json:"vni" xml:"vni"`
	Subnets []string `json:"subnets" xml:"subnets"`
}

// FirewallRule represents firewall rule
type FirewallRule struct {
	ID     string `json:"id" xml:"id"`
	Action string `json:"action" xml:"action"` // allow/deny
	Proto  string `json:"proto" xml:"proto"`
	Port   string `json:"port" xml:"port"`
	Source string `json:"source" xml:"source"`
	Dest   string `json:"dest" xml:"dest"`
}

// PortFwd represents port forwarding rule
type PortFwd struct {
	Proto    string `json:"proto" xml:"proto"`
	HostPort int    `json:"host_port" xml:"host_port"`
	VMPort   int    `json:"vm_port" xml:"vm_port"`
}

// GPUConfig represents GPU configuration
type GPUConfig struct {
	Enabled bool        `json:"enabled" xml:"enabled"`
	Type    string      `json:"type" xml:"type"` // qxl, virtio-gpu, passthrough, vgpu
	Devices []GPUDevice `json:"devices" xml:"devices"`
	VGPU    *VGPUConfig `json:"vgpu,omitempty" xml:"vgpu,omitempty"`
}

// VGPUConfig represents vGPU configuration for NVIDIA/AMD/Intel vGPU
type VGPUConfig struct {
	Model    string `json:"model" xml:"model"`         // เช่น "Tesla P100", "Quadro RTX6000"
	Profile  string `json:"profile" xml:"profile"`     // เช่น "grid_p100-2q", "nvidia-rtx6000-4q"
	MemoryGB int    `json:"memory_gb" xml:"memory_gb"` // 2, 4, 8, 16, 24 ฯลฯ
	UUID     string `json:"uuid" xml:"uuid"`           // (optional) vGPU instance UUID
}

// GPUDevice represents a GPU device
type GPUDevice struct {
	ID     string `json:"id" xml:"id"`
	Name   string `json:"name" xml:"name"`
	Type   string `json:"type" xml:"type"`     // passthrough, virtio-gpu, etc.
	Memory int    `json:"memory" xml:"memory"` // in MB
}

// OSConfig represents operating system configuration
type OSConfig struct {
	Type       string   `json:"type" xml:"type"`
	Arch       string   `json:"arch" xml:"arch"`
	Version    string   `json:"version" xml:"version"`
	Firmware   string   `json:"firmware" xml:"firmware"` // bios, uefi
	BootOrder  []string `json:"boot_order" xml:"boot_order"`
	Kernel     string   `json:"kernel" xml:"kernel"`
	Initrd     string   `json:"initrd" xml:"initrd"`
	KernelArgs string   `json:"kernel_args" xml:"kernel_args"`
	CDROM      string   `json:"cdrom" xml:"cdrom"`
}

// SchedulingConfig represents advanced scheduling options
type SchedulingConfig struct {
	Affinity     []string `json:"affinity" xml:"affinity"`           // VM IDs to co-locate
	AntiAffinity []string `json:"anti_affinity" xml:"anti_affinity"` // VM IDs to avoid
	Overcommit   bool     `json:"overcommit" xml:"overcommit"`
}

// VMCreateRequest represents a request to create a new VM
type VMCreateRequest struct {
	Name        string            `json:"name"`
	Description string            `json:"description"`
	CPU         CPUConfig         `json:"cpu"`
	Memory      MemoryConfig      `json:"memory"`
	Storage     StorageConfig     `json:"storage"`
	Network     NetworkConfig     `json:"network"`
	GPU         GPUConfig         `json:"gpu"`
	OS          OSConfig          `json:"os"`
	Scheduling  *SchedulingConfig `json:"scheduling,omitempty"`
}

// VMUpdateRequest represents a request to update a VM
type VMUpdateRequest struct {
	Name        *string           `json:"name"`
	Description *string           `json:"description"`
	CPU         *CPUConfig        `json:"cpu"`
	Memory      *MemoryConfig     `json:"memory"`
	Storage     *StorageConfig    `json:"storage"`
	Network     *NetworkConfig    `json:"network"`
	GPU         *GPUConfig        `json:"gpu"`
	OS          *OSConfig         `json:"os"`
	Scheduling  *SchedulingConfig `json:"scheduling,omitempty"`
}

// VMStats represents real-time statistics of a VM
type VMStats struct {
	VMID        string    `json:"vm_id"`
	Timestamp   time.Time `json:"timestamp"`
	CPUUsage    float64   `json:"cpu_usage"`
	MemoryUsage float64   `json:"memory_usage"`
	DiskUsage   float64   `json:"disk_usage"`
	NetworkIn   int64     `json:"network_in"`
	NetworkOut  int64     `json:"network_out"`
	GPUUsage    float64   `json:"gpu_usage"`
}

// SystemStats represents overall system statistics
type SystemStats struct {
	Timestamp   time.Time `json:"timestamp"`
	CPUUsage    float64   `json:"cpu_usage"`
	MemoryUsage float64   `json:"memory_usage"`
	DiskUsage   float64   `json:"disk_usage"`
	NetworkIn   int64     `json:"network_in"`
	NetworkOut  int64     `json:"network_out"`
	GPUUsage    float64   `json:"gpu_usage"`
	VMRunning   int       `json:"vm_running"`
	VMTotal     int       `json:"vm_total"`
}

// UserQuota represents resource quota for a user
type UserQuota struct {
	UserID string `json:"user_id"`
	CPU    int    `json:"cpu"`
	RAM    int    `json:"ram"`  // MB
	Disk   int    `json:"disk"` // GB
	VGPU   int    `json:"vgpu"`
}

// ProjectQuota represents resource quota for a project/group
type ProjectQuota struct {
	ProjectID string `json:"project_id"`
	CPU       int    `json:"cpu"`
	RAM       int    `json:"ram"`
	Disk      int    `json:"disk"`
	VGPU      int    `json:"vgpu"`
}
