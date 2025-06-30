package api

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io/ioutil"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"xtv/internal/config"
	"xtv/internal/models"
	"xtv/internal/monitor"
	"xtv/internal/vm"
	// เพิ่ม import ถ้ายังไม่มี
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Server struct {
	router     *gin.Engine
	server     *http.Server
	cfg        *config.Config
	vmMgr      vm.VMManager
	monitor    *monitor.SystemMonitor
	startTime  time.Time
	configPath string
}

var vgpuProfiles = []map[string]interface{}{
	{"model": "Tesla P100", "profile": "grid_p100-2q", "memory_gb": 2},
	{"model": "Tesla P100", "profile": "grid_p100-4q", "memory_gb": 4},
	{"model": "Tesla P100", "profile": "grid_p100-8q", "memory_gb": 8},
	{"model": "Quadro RTX6000", "profile": "nvidia-rtx6000-4q", "memory_gb": 4},
	{"model": "Quadro RTX6000", "profile": "nvidia-rtx6000-8q", "memory_gb": 8},
	{"model": "Quadro RTX6000", "profile": "nvidia-rtx6000-16q", "memory_gb": 16},
}

// Rate limiting (per IP)
var rateLimit = make(map[string][]time.Time)
var rateLimitMu sync.Mutex

const maxRequestsPerMinute = 60

func rateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		now := time.Now()
		rateLimitMu.Lock()
		times := rateLimit[ip]
		// Remove old requests
		var newTimes []time.Time
		for _, t := range times {
			if now.Sub(t) < time.Minute {
				newTimes = append(newTimes, t)
			}
		}
		if len(newTimes) >= maxRequestsPerMinute {
			rateLimitMu.Unlock()
			c.AbortWithStatusJSON(429, gin.H{"error": "Rate limit exceeded"})
			return
		}
		newTimes = append(newTimes, now)
		rateLimit[ip] = newTimes
		rateLimitMu.Unlock()
		c.Next()
	}
}

// Audit log middleware
func auditLogMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		log.Printf("AUDIT: %s %s %s %d %s", c.ClientIP(), c.Request.Method, c.Request.URL.Path, c.Writer.Status(), time.Since(start))
	}
}

// Auth middleware
func authMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip auth for installation and login endpoints
		if strings.HasPrefix(c.Request.URL.Path, "/install") ||
			c.Request.URL.Path == "/login" ||
			c.Request.URL.Path == "/install/status" ||
			c.Request.URL.Path == "/api/v1/install/status" ||
			c.Request.URL.Path == "/api/v1/login" ||
			c.Request.URL.Path == "/ws/stats" {
			c.Next()
			return
		}

		// Check if system is installed
		if !cfg.Install.Installed {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "System not installed"})
			c.Abort()
			return
		}

		// Check token in header
		token := c.GetHeader("Authorization")
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No token provided"})
			c.Abort()
			return
		}

		// Remove "Bearer " prefix if present
		token = strings.TrimPrefix(token, "Bearer ")

		// Validate token
		if token != cfg.Auth.Token {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Next()
	}
}

func NewServer(cfg *config.Config, vmMgr vm.VMManager, monitor *monitor.SystemMonitor, configPath string) *Server {
	gin.SetMode(gin.ReleaseMode)
	router := gin.Default()

	server := &Server{
		router:     router,
		cfg:        cfg,
		vmMgr:      vmMgr,
		monitor:    monitor,
		startTime:  time.Now(),
		configPath: configPath,
	}

	server.setupRoutes()
	return server
}

func (s *Server) setupRoutes() {
	s.router.Use(CORSMiddleware())
	s.router.Use(rateLimitMiddleware())
	s.router.Use(auditLogMiddleware())
	s.router.Use(authMiddleware(s.cfg))

	// WebSocket stats endpoint (outside /api/v1)
	s.router.GET("/ws/stats", s.wsHandler)

	// API versioning
	v1 := s.router.Group("/api/v1")

	// System endpoints
	v1.GET("/system/stats", s.getSystemStats)
	v1.GET("/system/info", s.getSystemInfo)
	v1.GET("/health", s.healthCheck)
	v1.GET("/gpu/usage", s.gpuUsage)
	v1.GET("/system/cpuinfo", s.getHostCPUInfo)

	// VM endpoints
	vms := v1.Group("/vms")
	{
		vms.GET("", s.listVMs)
		vms.POST("", s.createVM)
		vms.GET("/:id", s.getVM)
		vms.PUT("/:id", s.updateVM)
		vms.DELETE("/:id", s.deleteVM)
		vms.GET("/:id/stats", s.getVMStats)

		// VM control endpoints
		vms.POST("/:id/start", s.startVM)
		vms.POST("/:id/stop", s.stopVM)
		vms.POST("/:id/restart", s.restartVM)
		vms.POST("/:id/pause", s.pauseVM)
		vms.POST("/:id/resume", s.resumeVM)
	}

	// ISO endpoints
	v1.POST("/iso/upload", s.uploadISO)
	v1.GET("/iso", s.listISOs)

	// vGPU profiles
	v1.GET("/vgpu/profiles", s.listVGPUProfiles)

	// Auth endpoints
	v1.POST("/login", s.login)
	v1.POST("/change-password", s.changePassword)
	v1.POST("/reset-password", s.resetPassword)
	v1.POST("/logout", s.logout)
	v1.GET("/quota/:user", s.getQuota)

	// Installation endpoints
	v1.POST("/install", s.install)
	v1.GET("/install/status", s.installStatus)

	// Network management endpoints
	s.router.GET("/api/network/status", s.getNetworkStatus)
	s.router.PUT("/api/network/config", s.updateNetworkConfig)
	s.router.POST("/api/network/detect", s.detectNetwork)
	s.router.GET("/api/network/interfaces", s.getNetworkInterfaces)
	s.router.PUT("/api/network/update-ip", s.updateIPManually)
	s.router.GET("/api/network/migration-info", s.getMigrationInfo)
}

func (s *Server) Start() error {
	// Create HTTP server
	s.server = &http.Server{
		Addr:    s.cfg.Server.Host + ":" + s.cfg.Server.Port,
		Handler: s.router,
	}

	// Start server in goroutine
	go func() {
		log.Printf("🚀 Starting XTV API server on %s:%s", s.cfg.Server.Host, s.cfg.Server.Port)
		if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	return nil
}

// Shutdown gracefully shuts down the server
func (s *Server) Shutdown(ctx context.Context) error {
	log.Println("🛑 Shutting down XTV server gracefully...")

	// Give server 30 seconds to finish current requests
	shutdownCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	if err := s.server.Shutdown(shutdownCtx); err != nil {
		log.Printf("Server shutdown error: %v", err)
		return err
	}

	log.Println("✅ Server shutdown completed")
	return nil
}

// Health check endpoint
func (s *Server) healthCheck(c *gin.Context) {
	// Basic health check
	status := gin.H{
		"status":    "healthy",
		"timestamp": time.Now().Unix(),
		"version":   "1.0.0",
		"uptime":    time.Since(s.startTime).String(),
	}

	// Check disk space
	if diskInfo, err := s.monitor.GetDiskInfo(); err == nil {
		status["disk"] = diskInfo
	} else {
		status["disk_error"] = "Failed to get disk info"
	}

	c.JSON(http.StatusOK, status)
}

// System endpoints
func (s *Server) getSystemStats(c *gin.Context) {
	stats := s.monitor.GetStats()
	c.JSON(http.StatusOK, stats)
}

func (s *Server) getSystemInfo(c *gin.Context) {
	cpuInfo, _ := s.monitor.GetCPUInfo()
	memInfo, _ := s.monitor.GetMemoryInfo()
	diskInfo, _ := s.monitor.GetDiskInfo()
	netInfo, _ := s.monitor.GetNetworkInfo()
	hostInfo, _ := s.monitor.GetHostInfo()

	c.JSON(http.StatusOK, gin.H{
		"cpu":     cpuInfo,
		"memory":  memInfo,
		"disk":    diskInfo,
		"network": netInfo,
		"host":    hostInfo,
	})
}

// VM endpoints
func (s *Server) listVMs(c *gin.Context) {
	vms := s.vmMgr.ListVMs()
	c.JSON(http.StatusOK, vms)
}

func isValidMAC(mac string) bool {
	_, err := net.ParseMAC(mac)
	return err == nil
}

// Validation functions
func isValidVMName(name string) bool {
	// VM name must be 3-63 characters, alphanumeric, hyphens, underscores only
	if len(name) < 3 || len(name) > 63 {
		return false
	}
	// Check for valid characters: alphanumeric, hyphens, underscores
	for _, char := range name {
		if !((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') ||
			(char >= '0' && char <= '9') || char == '-' || char == '_') {
			return false
		}
	}
	// Must start and end with alphanumeric
	if name[0] == '-' || name[0] == '_' || name[len(name)-1] == '-' || name[len(name)-1] == '_' {
		return false
	}
	return true
}

func isValidDiskSize(size int64) bool {
	return size >= 1 && size <= 2048 // 1GB to 2TB
}

func isValidMemorySize(size int64) bool {
	return size >= 128 && size <= 1048576 // 128MB to 1TB
}

func isValidCPUCores(cores int) bool {
	return cores >= 1 && cores <= 64
}

// Enhanced quota system
type QuotaManager struct {
	quotas map[string]*UserQuota
	usage  map[string]*UserUsage
	mu     sync.RWMutex
}

type UserQuota struct {
	UserID string `json:"user_id"`
	CPU    int    `json:"cpu"`
	RAM    int    `json:"ram"`  // MB
	Disk   int    `json:"disk"` // GB
	VGPU   int    `json:"vgpu"`
}

type UserUsage struct {
	UserID string   `json:"user_id"`
	CPU    int      `json:"cpu"`
	RAM    int      `json:"ram"`
	Disk   int      `json:"disk"`
	VGPU   int      `json:"vgpu"`
	VMs    []string `json:"vms"`
}

var quotaManager = &QuotaManager{
	quotas: make(map[string]*UserQuota),
	usage:  make(map[string]*UserUsage),
}

func (qm *QuotaManager) InitDefaultQuota() {
	qm.mu.Lock()
	defer qm.mu.Unlock()

	qm.quotas["root"] = &UserQuota{
		UserID: "root",
		CPU:    32,
		RAM:    65536, // 64GB
		Disk:   1000,  // 1TB
		VGPU:   8,
	}

	qm.usage["root"] = &UserUsage{
		UserID: "root",
		CPU:    0,
		RAM:    0,
		Disk:   0,
		VGPU:   0,
		VMs:    []string{},
	}
}

func (qm *QuotaManager) CheckQuota(userID string, cpu, ram, disk, vgpu int) error {
	qm.mu.RLock()
	defer qm.mu.RUnlock()

	quota, exists := qm.quotas[userID]
	if !exists {
		return fmt.Errorf("user %s not found", userID)
	}

	usage := qm.usage[userID]
	if usage == nil {
		usage = &UserUsage{UserID: userID}
	}

	if usage.CPU+cpu > quota.CPU {
		return fmt.Errorf("CPU quota exceeded: %d/%d", usage.CPU+cpu, quota.CPU)
	}
	if usage.RAM+ram > quota.RAM {
		return fmt.Errorf("RAM quota exceeded: %d/%d MB", usage.RAM+ram, quota.RAM)
	}
	if usage.Disk+disk > quota.Disk {
		return fmt.Errorf("Disk quota exceeded: %d/%d GB", usage.Disk+disk, quota.Disk)
	}
	if usage.VGPU+vgpu > quota.VGPU {
		return fmt.Errorf("vGPU quota exceeded: %d/%d", usage.VGPU+vgpu, quota.VGPU)
	}

	return nil
}

func (qm *QuotaManager) UpdateUsage(userID, vmID string, cpu, ram, disk, vgpu int) {
	qm.mu.Lock()
	defer qm.mu.Unlock()

	usage := qm.usage[userID]
	if usage == nil {
		usage = &UserUsage{UserID: userID}
		qm.usage[userID] = usage
	}

	usage.CPU += cpu
	usage.RAM += ram
	usage.Disk += disk
	usage.VGPU += vgpu
	usage.VMs = append(usage.VMs, vmID)
}

func (qm *QuotaManager) GetUsage(userID string) (*UserUsage, error) {
	qm.mu.RLock()
	defer qm.mu.RUnlock()

	usage, exists := qm.usage[userID]
	if !exists {
		return nil, fmt.Errorf("user %s not found", userID)
	}

	return usage, nil
}

// ReleaseUsage releases resources when VM is deleted
func (qm *QuotaManager) ReleaseUsage(userID, vmID string) {
	qm.mu.Lock()
	defer qm.mu.Unlock()

	usage := qm.usage[userID]
	if usage == nil {
		return
	}

	// Find and remove VM from list
	for i, vm := range usage.VMs {
		if vm == vmID {
			// Remove VM from list
			usage.VMs = append(usage.VMs[:i], usage.VMs[i+1:]...)
			break
		}
	}

	// TODO: Implement proper resource tracking per VM
	// Current implementation just removes VM from list without tracking actual resources
	// In a real implementation, you would:
	// 1. Store VM resource usage in a map or database
	// 2. Subtract the actual resources used by the VM from user's usage
	// 3. Update the usage counters accordingly
	//
	// Example structure:
	// type VMResourceUsage struct {
	//     VMID   string
	//     CPU    int
	//     RAM    int
	//     Disk   int
	//     VGPU   int
	// }
	//
	// Then ReleaseUsage would subtract the actual resources used by the VM
	// instead of just removing it from the list.
}

// validateSchedulingConfig validates affinity, anti-affinity, and overcommit settings
// TODO: Add unit tests for this function
func (s *Server) validateSchedulingConfig(req *models.VMCreateRequest) error {
	if req.Scheduling == nil {
		return nil
	}

	// Get all existing VMs for validation
	existingVMs := s.vmMgr.ListVMs()
	existingVMIDs := make(map[string]*models.VM)
	for _, vm := range existingVMs {
		existingVMIDs[vm.ID] = vm
	}

	// Validate orphan VM IDs in affinity list
	if len(req.Scheduling.Affinity) > 0 {
		for _, vmID := range req.Scheduling.Affinity {
			if _, exists := existingVMIDs[vmID]; !exists {
				return fmt.Errorf("affinity VM ID '%s' does not exist (orphan VM ID)", vmID)
			}
		}
	}

	// Validate orphan VM IDs in anti-affinity list
	if len(req.Scheduling.AntiAffinity) > 0 {
		for _, vmID := range req.Scheduling.AntiAffinity {
			if _, exists := existingVMIDs[vmID]; !exists {
				return fmt.Errorf("anti-affinity VM ID '%s' does not exist (orphan VM ID)", vmID)
			}
		}
	}

	// Check for conflicts in affinity/anti-affinity
	if len(req.Scheduling.Affinity) > 0 && len(req.Scheduling.AntiAffinity) > 0 {
		affinitySet := make(map[string]bool)
		for _, vmID := range req.Scheduling.Affinity {
			affinitySet[vmID] = true
		}
		for _, vmID := range req.Scheduling.AntiAffinity {
			if affinitySet[vmID] {
				return fmt.Errorf("VM ID '%s' cannot be in both affinity and anti-affinity lists", vmID)
			}
		}
	}

	// Validate overcommit settings
	if !req.Scheduling.Overcommit {
		// Check if resources are available without overcommit
		if err := s.validateResourceAvailability(req, existingVMs); err != nil {
			return fmt.Errorf("resource validation failed (overcommit disabled): %v", err)
		}
	}

	return nil
}

// validateResourceAvailability checks if host has enough resources for the new VM
// TODO: Add unit tests for this function
func (s *Server) validateResourceAvailability(req *models.VMCreateRequest, existingVMs []*models.VM) error {
	// Get host CPU and memory info
	hostInfo, err := monitor.GetHostCPUInfo()
	if err != nil {
		return fmt.Errorf("failed to get host CPU info: %v", err)
	}

	// Get host memory info from system monitor
	hostMemInfo, err := s.monitor.GetMemoryInfo()
	if err != nil {
		return fmt.Errorf("failed to get host memory info: %v", err)
	}

	// Calculate total resources used by running VMs
	totalUsedCPU := 0
	totalUsedMemory := int64(0)

	for _, vm := range existingVMs {
		if vm.Status == models.VMStatusRunning {
			totalUsedCPU += vm.CPU.Cores * vm.CPU.Sockets
			totalUsedMemory += vm.Memory.Size
		}
	}

	// Calculate required resources for new VM
	requiredCPU := req.CPU.Cores * req.CPU.Sockets
	requiredMemory := req.Memory.Size

	// Check CPU availability
	totalHostCPU := hostInfo.Cores * hostInfo.Sockets
	if totalUsedCPU+requiredCPU > totalHostCPU {
		return fmt.Errorf("insufficient CPU resources: requested %d cores, available %d cores (used: %d, total: %d)",
			requiredCPU, totalHostCPU-totalUsedCPU, totalUsedCPU, totalHostCPU)
	}

	// Check memory availability using actual host memory
	hostMemoryMB := int64(0)
	if memMap, ok := hostMemInfo.(map[string]interface{}); ok {
		if total, ok := memMap["total"].(float64); ok {
			hostMemoryMB = int64(total) // Convert from MB to MB (already in MB)
		}
	}

	// Fallback to default if we can't get memory info
	if hostMemoryMB == 0 {
		hostMemoryMB = int64(65536) // 64GB fallback
	}

	if totalUsedMemory+requiredMemory > hostMemoryMB {
		return fmt.Errorf("insufficient memory resources: requested %d MB, available %d MB (used: %d MB, total: %d MB)",
			requiredMemory, hostMemoryMB-totalUsedMemory, totalUsedMemory, hostMemoryMB)
	}

	return nil
}

// enforceAffinityRules applies affinity/anti-affinity rules during VM creation
// TODO: Add unit tests for this function
func (s *Server) enforceAffinityRules(req *models.VMCreateRequest) error {
	if req.Scheduling == nil {
		return nil
	}

	existingVMs := s.vmMgr.ListVMs()
	existingVMIDs := make(map[string]*models.VM)
	for _, vm := range existingVMs {
		existingVMIDs[vm.ID] = vm
	}

	// Enforce affinity rules
	if len(req.Scheduling.Affinity) > 0 {
		// Check if all affinity VMs are running on the same host
		// In a real implementation, you would check host placement
		// For now, we'll just validate that they exist
		for _, vmID := range req.Scheduling.Affinity {
			if vm, exists := existingVMIDs[vmID]; exists {
				if vm.Status != models.VMStatusRunning {
					return fmt.Errorf("affinity VM '%s' is not running (status: %s)", vmID, vm.Status)
				}
			}
		}
	}

	// Enforce anti-affinity rules
	if len(req.Scheduling.AntiAffinity) > 0 {
		// Check if any anti-affinity VMs are running on the same host
		// In a real implementation, you would check host placement
		// For now, we'll just validate that they exist
		for _, vmID := range req.Scheduling.AntiAffinity {
			if vm, exists := existingVMIDs[vmID]; exists {
				if vm.Status == models.VMStatusRunning {
					return fmt.Errorf("anti-affinity VM '%s' is running on the same host", vmID)
				}
			}
		}
	}

	return nil
}

// validateResourceQuota checks if the requested resources exceed user quota
// TODO: Add unit tests for this function
func (s *Server) validateResourceQuota(userID string, req *models.VMCreateRequest) error {
	// Calculate required resources
	requiredCPU := req.CPU.Cores * req.CPU.Sockets
	requiredMemory := int(req.Memory.Size)
	requiredDisk := int(req.Storage.Disks[0].Size)
	requiredVGPU := 0
	if req.GPU.Type == "vgpu" {
		requiredVGPU = 1
	}

	// Check quota
	if err := quotaManager.CheckQuota(userID, requiredCPU, requiredMemory, requiredDisk, requiredVGPU); err != nil {
		return fmt.Errorf("quota exceeded: %v", err)
	}

	return nil
}

// getDetailedResourceInfo returns detailed resource information for debugging
// TODO: Add unit tests for this function
func (s *Server) getDetailedResourceInfo(req *models.VMCreateRequest) map[string]interface{} {
	existingVMs := s.vmMgr.ListVMs()

	// Calculate current resource usage
	totalUsedCPU := 0
	totalUsedMemory := int64(0)
	runningVMs := 0

	for _, vm := range existingVMs {
		if vm.Status == models.VMStatusRunning {
			totalUsedCPU += vm.CPU.Cores * vm.CPU.Sockets
			totalUsedMemory += vm.Memory.Size
			runningVMs++
		}
	}

	// Get host info
	hostInfo, _ := monitor.GetHostCPUInfo()
	hostMemInfo, _ := s.monitor.GetMemoryInfo()

	hostMemoryMB := int64(65536) // Default fallback
	if memMap, ok := hostMemInfo.(map[string]interface{}); ok {
		if total, ok := memMap["total"].(float64); ok {
			hostMemoryMB = int64(total)
		}
	}

	return map[string]interface{}{
		"requested_resources": map[string]interface{}{
			"cpu_cores": req.CPU.Cores * req.CPU.Sockets,
			"memory_mb": req.Memory.Size,
			"disk_gb":   req.Storage.Disks[0].Size,
			"vgpu_count": func() int {
				if req.GPU.Type == "vgpu" {
					return 1
				}
				return 0
			}(),
		},
		"current_usage": map[string]interface{}{
			"running_vms":    runningVMs,
			"used_cpu_cores": totalUsedCPU,
			"used_memory_mb": totalUsedMemory,
		},
		"host_capacity": map[string]interface{}{
			"total_cpu_cores": hostInfo.Cores * hostInfo.Sockets,
			"total_memory_mb": hostMemoryMB,
		},
		"scheduling": map[string]interface{}{
			"affinity":      req.Scheduling.Affinity,
			"anti_affinity": req.Scheduling.AntiAffinity,
			"overcommit":    req.Scheduling.Overcommit,
		},
	}
}

func (s *Server) createVM(c *gin.Context) {
	var req models.VMCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request format"})
		return
	}

	// Step 1: Validate CPU features, pinning, NUMA node against host
	hostInfo, err := monitor.GetHostCPUInfo()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get host CPU info for validation"})
		return
	}

	// Validate CPU features
	if len(req.CPU.Features) > 0 {
		hostFlags := make(map[string]bool)
		for _, f := range hostInfo.Flags {
			hostFlags[f] = true
		}
		for _, f := range req.CPU.Features {
			if !hostFlags[f] {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Host does not support requested CPU feature: " + f})
				return
			}
		}
	}

	// Validate CPU pinning
	if len(req.CPU.Pinning) > 0 {
		totalCores := hostInfo.Cores * hostInfo.Sockets
		for _, core := range req.CPU.Pinning {
			if core < 0 || core >= totalCores {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid CPU pinning core ID (host has only " + fmt.Sprint(totalCores) + " cores)"})
				return
			}
		}
	}

	// Validate NUMA node
	if req.CPU.NUMANode < 0 || req.CPU.NUMANode >= hostInfo.NUMANodes {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid NUMA node (host has " + fmt.Sprint(hostInfo.NUMANodes) + " NUMA nodes)"})
		return
	}

	// Step 2: Basic validation (name, CPU, memory, storage, network)
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "VM name is required"})
		return
	}
	if !isValidVMName(req.Name) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid VM name. Must be 3-63 characters, alphanumeric, hyphens, underscores only"})
		return
	}

	// CPU validation
	if !isValidCPUCores(req.CPU.Cores) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "CPU cores must be 1-64"})
		return
	}
	if req.CPU.Sockets <= 0 || req.CPU.Sockets > 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "CPU sockets must be 1-8"})
		return
	}

	// Memory validation
	if !isValidMemorySize(req.Memory.Size) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Memory size must be 128MB-1TB"})
		return
	}

	// Storage validation
	if len(req.Storage.Disks) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one disk is required"})
		return
	}
	for i := range req.Storage.Disks {
		if req.Storage.Disks[i].Format == "" {
			req.Storage.Disks[i].Format = "qcow2"
		}
		if req.Storage.Disks[i].Bus == "" {
			req.Storage.Disks[i].Bus = "virtio"
		}
		if req.Storage.Disks[i].Type == "" {
			req.Storage.Disks[i].Type = "ssd"
		}
		if !isValidDiskSize(req.Storage.Disks[i].Size) {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Disk %d size must be 1-2048 GB", i+1)})
			return
		}
		if req.Storage.Disks[i].Path == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Disk %d path is required", i+1)})
			return
		}
		// Check for duplicate paths
		for j := 0; j < i; j++ {
			if req.Storage.Disks[j].Path == req.Storage.Disks[i].Path {
				c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Disk path %s is duplicated", req.Storage.Disks[i].Path)})
				return
			}
		}
	}

	// CDROM validation
	for i, cd := range req.Storage.CDROMs {
		if cd.Path == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("CDROM %d path is required", i+1)})
			return
		}
		if _, err := os.Stat(cd.Path); os.IsNotExist(err) {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("ISO file %s does not exist", cd.Path)})
			return
		}
	}

	// Network validation
	for i, iface := range req.Network.Interfaces {
		if iface.Model == "" {
			req.Network.Interfaces[i].Model = "virtio"
		}
		if iface.Type == "" {
			req.Network.Interfaces[i].Type = "bridge"
		}
		if iface.MAC != "" && !isValidMAC(iface.MAC) {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Interface %d MAC address invalid", i+1)})
			return
		}
		if iface.VLAN < 0 || iface.VLAN > 4094 {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Interface %d VLAN must be 1-4094", i+1)})
			return
		}
		if iface.MTU != 0 && (iface.MTU < 576 || iface.MTU > 9000) {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Interface %d MTU must be 576-9000", i+1)})
			return
		}
	}

	// Set defaults
	if req.GPU.Type == "" {
		req.GPU.Type = "qxl"
	}
	if req.OS.Firmware == "" {
		req.OS.Firmware = "uefi"
	}
	if len(req.OS.BootOrder) == 0 {
		req.OS.BootOrder = []string{"cdrom", "disk"}
	}

	// Step 3: vGPU validation
	if req.GPU.Type == "vgpu" && req.GPU.VGPU != nil {
		found := false
		for _, prof := range vgpuProfiles {
			if prof["model"] == req.GPU.VGPU.Model && prof["profile"] == req.GPU.VGPU.Profile && prof["memory_gb"] == req.GPU.VGPU.MemoryGB {
				found = true
				break
			}
		}
		if !found {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vGPU profile/model/memory for this host"})
			return
		}
	}

	// Step 4: Enhanced quota check with detailed validation
	userID := "root" // Default user
	if err := s.validateResourceQuota(userID, &req); err != nil {
		// Return detailed error information for debugging
		detailedInfo := s.getDetailedResourceInfo(&req)
		c.JSON(http.StatusForbidden, gin.H{
			"error":   err.Error(),
			"details": detailedInfo,
		})
		return
	}

	// Step 5: Validate scheduling configuration (affinity, anti-affinity, overcommit)
	if err := s.validateSchedulingConfig(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Step 6: Enforce affinity rules
	if err := s.enforceAffinityRules(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Step 7: Create VM
	vm, err := s.vmMgr.CreateVM(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Step 8: Update usage after successful creation
	quotaManager.UpdateUsage(userID, vm.ID, req.CPU.Cores, int(req.Memory.Size), int(req.Storage.Disks[0].Size), func() int {
		if req.GPU.Type == "vgpu" {
			return 1
		}
		return 0
	}())

	c.JSON(http.StatusCreated, vm)
}

func (s *Server) getVM(c *gin.Context) {
	id := c.Param("id")
	vm, err := s.vmMgr.GetVM(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "VM not found"})
		return
	}
	c.JSON(http.StatusOK, vm)
}

func (s *Server) updateVM(c *gin.Context) {
	id := c.Param("id")

	var req models.VMUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate that VM exists before updating
	existingVM, err := s.vmMgr.GetVM(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "VM not found"})
		return
	}

	// If updating CPU or memory, validate resource availability
	if req.CPU != nil || req.Memory != nil {
		// Create a temporary request to validate resources
		tempReq := models.VMCreateRequest{
			CPU:    *req.CPU,
			Memory: *req.Memory,
		}
		if req.CPU == nil {
			tempReq.CPU = existingVM.CPU
		}
		if req.Memory == nil {
			tempReq.Memory = existingVM.Memory
		}

		// Get existing VMs excluding the current one
		allVMs := s.vmMgr.ListVMs()
		var otherVMs []*models.VM
		for _, vm := range allVMs {
			if vm.ID != id {
				otherVMs = append(otherVMs, vm)
			}
		}

		// Validate resource availability
		if err := s.validateResourceAvailability(&tempReq, otherVMs); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   fmt.Sprintf("Resource validation failed: %v", err),
				"details": s.getDetailedResourceInfo(&tempReq),
			})
			return
		}
	}

	// If updating scheduling configuration, validate it
	if req.Scheduling != nil {
		// Create a temporary request to validate scheduling
		tempReq := models.VMCreateRequest{
			Scheduling: req.Scheduling,
		}

		if err := s.validateSchedulingConfig(&tempReq); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	vm, err := s.vmMgr.UpdateVM(id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, vm)
}

func (s *Server) deleteVM(c *gin.Context) {
	id := c.Param("id")

	// Check if VM exists before deletion
	_, err := s.vmMgr.GetVM(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "VM not found"})
		return
	}

	if err := s.vmMgr.DeleteVM(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete VM"})
		return
	}

	// Release quota usage after successful deletion
	userID := "root" // Default user
	quotaManager.ReleaseUsage(userID, id)

	c.JSON(http.StatusOK, gin.H{"message": "VM deleted successfully"})
}

func (s *Server) getVMStats(c *gin.Context) {
	id := c.Param("id")

	stats, err := s.vmMgr.GetVMStats(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// VM control endpoints
func (s *Server) startVM(c *gin.Context) {
	id := c.Param("id")
	if err := s.vmMgr.StartVM(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start VM"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "VM started successfully"})
}

func (s *Server) stopVM(c *gin.Context) {
	id := c.Param("id")
	if err := s.vmMgr.StopVM(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to stop VM"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "VM stopped successfully"})
}

func (s *Server) restartVM(c *gin.Context) {
	id := c.Param("id")
	if err := s.vmMgr.RestartVM(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to restart VM"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "VM restarted successfully"})
}

func (s *Server) pauseVM(c *gin.Context) {
	id := c.Param("id")

	if err := s.vmMgr.PauseVM(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "VM paused successfully"})
}

func (s *Server) resumeVM(c *gin.Context) {
	id := c.Param("id")

	if err := s.vmMgr.ResumeVM(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "VM resumed successfully"})
}

// ISO upload endpoint
func (s *Server) uploadISO(c *gin.Context) {
	file, err := c.FormFile("iso")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Validate file size (max 4GB)
	if file.Size > 4*1024*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size too large (max 4GB)"})
		return
	}

	// Validate file extension
	if !strings.HasSuffix(strings.ToLower(file.Filename), ".iso") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file format. Only ISO files are allowed"})
		return
	}

	// Save file
	filename := fmt.Sprintf("%s/%s", s.cfg.VM.ImagePath, file.Filename)
	if err := c.SaveUploadedFile(file, filename); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "ISO uploaded successfully",
		"filename": file.Filename,
		"size":     file.Size,
	})
}

// ISO list endpoint
func (s *Server) listISOs(c *gin.Context) {
	files, err := ioutil.ReadDir(s.cfg.VM.ImagePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read ISO directory"})
		return
	}

	var isos []map[string]interface{}
	for _, file := range files {
		if strings.HasSuffix(strings.ToLower(file.Name()), ".iso") {
			isos = append(isos, map[string]interface{}{
				"name": file.Name(),
				"size": file.Size(),
				"date": file.ModTime(),
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{"isos": isos})
}

func (s *Server) listVGPUProfiles(c *gin.Context) {
	// เช็คว่ามี nvidia-smi หรือไม่ (production)
	if _, err := exec.LookPath("nvidia-smi"); err != nil {
		// ไม่มี driver nvidia ไม่ต้องแสดง profiles
		c.JSON(http.StatusOK, gin.H{"profiles": []interface{}{}, "note": "NVIDIA driver not found"})
		return
	}
	// TODO: ถ้าต้องการดึง profiles จริงจากระบบ สามารถ implement เพิ่มเติมได้
	// ตอนนี้ fallback เป็น mock profiles
	c.JSON(http.StatusOK, gin.H{"profiles": vgpuProfiles})
}

func (s *Server) wsHandler(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()
	for {
		msg := map[string]interface{}{
			"type": "system_stats",
			"data": map[string]interface{}{
				"cpu_usage":    23.5 + float64(time.Now().Second()%10),
				"memory_usage": 68.2 + float64(time.Now().Second()%10),
				"disk_usage":   55.1 + float64(time.Now().Second()%10),
				"network_in":   12.3 + float64(time.Now().Second()%10),
				"network_out":  8.7 + float64(time.Now().Second()%10),
				"active_vms":   3 + time.Now().Second()%2,
				"timestamp":    time.Now().UTC().Format(time.RFC3339),
			},
		}
		if err := conn.WriteJSON(msg); err != nil {
			break // client ปิด connection
		}
		time.Sleep(2 * time.Second)
	}
}

// Static web server for Web UI
func StartWebUIServer() {
	r := gin.Default()
	r.Static("/", "./webui") // ใส่ไฟล์ web UI ไว้ในโฟลเดอร์ webui
	go r.Run(":8888")
}

func (s *Server) gpuUsage(c *gin.Context) {
	// Try to get real GPU info using nvidia-smi
	gpuInfo, err := s.getRealGPUInfo()
	if err != nil {
		// Fallback to mock data (สมจริงขึ้น)
		c.JSON(http.StatusOK, gin.H{
			"gpus": []map[string]interface{}{
				{
					"model":       "Tesla P100",
					"total":       2,
					"used":        1,
					"free":        1,
					"vram_total":  16384,
					"vram_used":   8192,
					"vram_free":   8192,
					"utilization": 55,
				},
				{
					"model":       "Quadro RTX6000",
					"total":       1,
					"used":        0,
					"free":        1,
					"vram_total":  24576,
					"vram_used":   4096,
					"vram_free":   20480,
					"utilization": 12,
				},
				{
					"model":       "GeForce RTX 3080",
					"total":       1,
					"used":        1,
					"free":        0,
					"vram_total":  10240,
					"vram_used":   10240,
					"vram_free":   0,
					"utilization": 99,
				},
			},
			"note": "Using mock data - nvidia-smi not available",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"gpus": gpuInfo,
		"note": "Real GPU data from nvidia-smi",
	})
}

func (s *Server) getRealGPUInfo() ([]map[string]interface{}, error) {
	// Execute nvidia-smi command
	cmd := exec.Command("nvidia-smi", "--query-gpu=name,memory.total,memory.used,utilization.gpu", "--format=csv,noheader,nounits")
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("nvidia-smi not available: %v", err)
	}

	var gpus []map[string]interface{}
	lines := strings.Split(strings.TrimSpace(string(output)), "\n")

	for _, line := range lines {
		fields := strings.Split(line, ", ")
		if len(fields) >= 4 {
			name := strings.TrimSpace(fields[0])
			memoryTotal, _ := strconv.Atoi(strings.TrimSpace(fields[1]))
			memoryUsed, _ := strconv.Atoi(strings.TrimSpace(fields[2]))
			utilization, _ := strconv.Atoi(strings.TrimSpace(fields[3]))

			gpu := map[string]interface{}{
				"model":       name,
				"total":       1,
				"used":        utilization,
				"free":        100 - utilization,
				"vram_total":  memoryTotal,
				"vram_used":   memoryUsed,
				"vram_free":   memoryTotal - memoryUsed,
				"utilization": utilization,
			}
			gpus = append(gpus, gpu)
		}
	}

	return gpus, nil
}

func (s *Server) login(c *gin.Context) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Printf("LOGIN DEBUG: req.Username=[%s], req.Password=[%s], cfg.Username=[%s], cfg.Password=[%s]", req.Username, req.Password, s.cfg.Auth.Username, s.cfg.Auth.Password)

	if req.Username == s.cfg.Auth.Username && req.Password == s.cfg.Auth.Password {
		// Generate token if not exists
		if s.cfg.Auth.Token == "" {
			token := generateToken()
			s.cfg.Auth.Token = token
			// Save config
			if err := s.cfg.Save(s.configPath); err != nil {
				log.Printf("Failed to save config: %v", err)
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"token": s.cfg.Auth.Token,
			"user":  req.Username,
		})
	} else {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
	}
}

func (s *Server) getQuota(c *gin.Context) {
	userID := c.Param("user")
	usage, err := quotaManager.GetUsage(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	quota := quotaManager.quotas[userID]
	c.JSON(http.StatusOK, gin.H{
		"user":  userID,
		"quota": quota,
		"usage": usage,
	})
}

func (s *Server) install(c *gin.Context) {
	var req struct {
		ServerName string `json:"server_name"`
		IPConfig   string `json:"ip_config"`
		StaticIP   string `json:"static_ip,omitempty"`
		WebPort    int    `json:"web_port"`
		APIPort    int    `json:"api_port"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update configuration
	s.cfg.Install.ServerName = req.ServerName
	s.cfg.Install.Network.IPConfig = req.IPConfig
	s.cfg.Install.Network.StaticIP = req.StaticIP
	s.cfg.Install.WebPort = req.WebPort
	s.cfg.Install.APIPort = req.APIPort
	s.cfg.Install.Installed = true
	s.cfg.Install.InstallDate = time.Now()

	// Set original IP (IP ตอนติดตั้งครั้งแรก)
	if err := s.cfg.SetOriginalIP(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Update current IP
	if err := s.cfg.UpdateNetworkInfo(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Generate authentication token
	s.cfg.Auth.Token = generateToken()
	s.cfg.Auth.TokenExpiry = time.Now().AddDate(0, 1, 0) // 1 month

	// Save configuration
	if err := s.cfg.Save(s.configPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Installation completed successfully",
		"token":       s.cfg.Auth.Token,
		"web_url":     s.cfg.GetWebURL(),
		"api_url":     s.cfg.GetAPIURL(),
		"original_ip": s.cfg.Install.Network.OriginalIP,
		"current_ip":  s.cfg.Install.Network.PublicIP,
	})
}

func (s *Server) installStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"installed":   s.cfg.Install.Installed,
		"server_name": s.cfg.Install.ServerName,
		"web_port":    s.cfg.Install.WebPort,
		"api_port":    s.cfg.Install.APIPort,
	})
}

func generateToken() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

func (s *Server) changePassword(c *gin.Context) {
	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
		ConfirmPassword string `json:"confirm_password"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Validate current password
	if req.CurrentPassword != s.cfg.Auth.Password {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Current password is incorrect"})
		return
	}

	// Validate new password
	if len(req.NewPassword) < 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "New password must be at least 8 characters"})
		return
	}

	if req.NewPassword != req.ConfirmPassword {
		c.JSON(http.StatusBadRequest, gin.H{"error": "New password and confirm password do not match"})
		return
	}

	// Update password
	s.cfg.Auth.Password = req.NewPassword
	// Clear token to force re-login
	s.cfg.Auth.Token = ""

	// Save config
	if err := s.cfg.Save(s.configPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save configuration"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}

func (s *Server) resetPassword(c *gin.Context) {
	var req struct {
		NewPassword     string `json:"new_password"`
		ConfirmPassword string `json:"confirm_password"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Validate new password
	if len(req.NewPassword) < 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "New password must be at least 8 characters"})
		return
	}

	if req.NewPassword != req.ConfirmPassword {
		c.JSON(http.StatusBadRequest, gin.H{"error": "New password and confirm password do not match"})
		return
	}

	// Update password (only root can reset password)
	s.cfg.Auth.Password = req.NewPassword
	// Clear token to force re-login
	s.cfg.Auth.Token = ""

	// Save config
	if err := s.cfg.Save(s.configPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save configuration"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully"})
}

func (s *Server) logout(c *gin.Context) {
	// Clear token
	s.cfg.Auth.Token = ""

	// Save config
	if err := s.cfg.Save(s.configPath); err != nil {
		log.Printf("Failed to save config: %v", err)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

func (s *Server) getHostCPUInfo(c *gin.Context) {
	info, err := monitor.GetHostCPUInfo()
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, info)
}

// NetworkStatus represents current network status
type NetworkStatus struct {
	Interface      string    `json:"interface"`
	CurrentIP      string    `json:"current_ip"`
	PublicIP       string    `json:"public_ip"`
	Gateway        string    `json:"gateway"`
	Netmask        string    `json:"netmask"`
	DNSServers     string    `json:"dns_servers"`
	IPConfig       string    `json:"ip_config"`
	AutoDetectIP   bool      `json:"auto_detect_ip"`
	LastDetected   string    `json:"last_detected"`
	LastDetectedAt time.Time `json:"last_detected_at"`
	WebURL         string    `json:"web_url"`
	APIURL         string    `json:"api_url"`
}

// NetworkConfig represents network configuration update
type NetworkConfig struct {
	Interface    string `json:"interface"`
	IPConfig     string `json:"ip_config"`
	StaticIP     string `json:"static_ip,omitempty"`
	Gateway      string `json:"gateway,omitempty"`
	Netmask      string `json:"netmask,omitempty"`
	DNSServers   string `json:"dns_servers,omitempty"`
	AutoDetectIP bool   `json:"auto_detect_ip"`
}

func (s *Server) getNetworkStatus(c *gin.Context) {
	status := NetworkStatus{
		Interface:      s.cfg.Install.Network.Interface,
		CurrentIP:      s.cfg.Install.Network.PublicIP,
		PublicIP:       s.cfg.Install.Network.PublicIP,
		Gateway:        s.cfg.Install.Network.Gateway,
		Netmask:        s.cfg.Install.Network.Netmask,
		DNSServers:     s.cfg.Install.Network.DNSServers,
		IPConfig:       s.cfg.Install.Network.IPConfig,
		AutoDetectIP:   s.cfg.Install.Network.AutoDetectIP,
		LastDetected:   s.cfg.Install.Network.LastDetected,
		LastDetectedAt: s.cfg.Install.Network.LastDetectedAt,
		WebURL:         s.cfg.GetWebURL(),
		APIURL:         s.cfg.GetAPIURL(),
	}

	// Get current IP if auto-detect is enabled
	if s.cfg.Install.Network.AutoDetectIP {
		if currentIP, err := s.cfg.GetCurrentIP(); err == nil {
			status.CurrentIP = currentIP
		}
	}

	c.JSON(http.StatusOK, status)
}

func (s *Server) updateNetworkConfig(c *gin.Context) {
	var config NetworkConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update configuration
	s.cfg.Install.Network.Interface = config.Interface
	s.cfg.Install.Network.IPConfig = config.IPConfig
	s.cfg.Install.Network.StaticIP = config.StaticIP
	s.cfg.Install.Network.Gateway = config.Gateway
	s.cfg.Install.Network.Netmask = config.Netmask
	s.cfg.Install.Network.DNSServers = config.DNSServers
	s.cfg.Install.Network.AutoDetectIP = config.AutoDetectIP

	// Update network information
	if err := s.cfg.UpdateNetworkInfo(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Save configuration
	if err := s.cfg.Save(s.configPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Network configuration updated successfully",
		"web_url": s.cfg.GetWebURL(),
		"api_url": s.cfg.GetAPIURL(),
	})
}

func (s *Server) detectNetwork(c *gin.Context) {
	if err := s.cfg.UpdateNetworkInfo(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Save configuration
	if err := s.cfg.Save(s.configPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Network detection completed",
		"current_ip": s.cfg.Install.Network.PublicIP,
		"web_url":    s.cfg.GetWebURL(),
		"api_url":    s.cfg.GetAPIURL(),
	})
}

func (s *Server) getNetworkInterfaces(c *gin.Context) {
	interfaces := []string{"eth0", "eth1", "wlan0", "wlan1"}
	c.JSON(http.StatusOK, gin.H{"interfaces": interfaces})
}

func (s *Server) updateIPManually(c *gin.Context) {
	var req struct {
		NewIP string `json:"new_ip"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update IP manually
	if err := s.cfg.UpdateIPManually(req.NewIP); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Save configuration
	if err := s.cfg.Save(s.configPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "IP updated successfully",
		"new_ip":  req.NewIP,
		"web_url": s.cfg.GetWebURL(),
		"api_url": s.cfg.GetAPIURL(),
	})
}

func (s *Server) getMigrationInfo(c *gin.Context) {
	info := s.cfg.GetMigrationInfo()
	c.JSON(http.StatusOK, info)
}
