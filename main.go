package main

import (
	"bufio"
	"context"
	"flag"
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
	"runtime"
	"runtime/debug"
	"strings"
	"syscall"
	"time"

	"xtv/internal/api"
	"xtv/internal/config"
	"xtv/internal/monitor"
	"xtv/internal/vm"

	"github.com/shirou/gopsutil/mem"
)

// Version and build info
var (
	Version   = "dev"
	BuildTime = "unknown"
)

func init() {
	// Set GOMAXPROCS to number of CPU cores for better performance
	runtime.GOMAXPROCS(runtime.NumCPU())

	// Set memory limit for garbage collection
	debug.SetMemoryLimit(1 << 30) // 1GB limit

	// Set GC percentage for better memory management
	debug.SetGCPercent(100)
}

func printLogo() {
	fmt.Println(`
__   __    _______   ___      ___ 
__   __    _______   ___      ___
\ \ / /   |__   __|  \  \    /  /
 \ V /       | |      \  \  /  / 
  > <        | |       \  \/  /  
 / . \       | |        \    /   
/_/ \_\      |_|         \__/ 

  X   T   V
XTV - Virtualization System v` + Version + `
`)
}

func printSystemInfo() {
	host, _ := os.Hostname()
	fmt.Println("Hostname:", host)
	fmt.Println("OS:", runtime.GOOS)
	fmt.Println("ARCH:", runtime.GOARCH)
	fmt.Println("CPU Cores:", runtime.NumCPU())
	fmt.Println("GOMAXPROCS:", runtime.GOMAXPROCS(0))

	// Get memory info
	if vmstat, err := mem.VirtualMemory(); err == nil {
		fmt.Printf("RAM: %.2f GB / %.2f GB (%.1f%% used)\n",
			float64(vmstat.Used)/1e9,
			float64(vmstat.Total)/1e9,
			vmstat.UsedPercent)
	}

	// Get network interfaces
	if addrs, err := net.InterfaceAddrs(); err == nil {
		for _, addr := range addrs {
			if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() && ipnet.IP.To4() != nil {
				fmt.Println("IP:", ipnet.IP.String())
			}
		}
	}
}

func main() {
	// เพิ่ม flag สำหรับ mock mode และ config path
	useMock := flag.Bool("mock", false, "Use mock managers and data")
	configPath := flag.String("config", "config.json", "Path to config file")
	flag.Parse()

	// Set up logging
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Printf("Starting XTV v%s (built: %s)", Version, BuildTime)

	// Check if system is installed
	cfg := config.Load(*configPath)

	if !cfg.Install.Installed {
		fmt.Println("=== XTV Installation ===")
		if err := runInstallation(cfg, *configPath); err != nil {
			log.Fatalf("Installation failed: %v", err)
		}
		fmt.Println("\n✅ Installation completed successfully!")
		fmt.Println("You can now start the server with: ./xtv --config %s", *configPath)
		return
	}

	printLogo()
	printSystemInfo()

	// Initialize VM manager
	var vmMgr vm.VMManager
	if *useMock {
		vmMgr = vm.NewMockManager(cfg)
		fmt.Println("🟡 Running in MOCK mode")
	} else {
		if cfg.LibVirt.URI != "" {
			libvirtMgr, err := vm.NewLibVirtManager(cfg)
			if err != nil {
				log.Printf("[WARN] Failed to initialize LibVirtManager: %v, fallback to MockManager", err)
				vmMgr = vm.NewMockManager(cfg)
				fmt.Println("🟡 Running in MOCK mode (LibVirt init failed)")
			} else {
				vmMgr = libvirtMgr
				fmt.Println("🟢 Running in PRODUCTION mode (LibVirt)")
			}
		} else {
			vmMgr = vm.NewMockManager(cfg)
			fmt.Println("🟡 Running in MOCK mode (no LibVirt URI)")
		}
	}

	// Initialize system monitor with optimized polling
	monitor := monitor.NewSystemMonitor()

	// Start API server with optimized settings
	server := api.NewServer(cfg, vmMgr, monitor, *configPath)

	fmt.Printf("🚀 Starting XTV server on %s:%s\n", cfg.Server.Host, cfg.Server.Port)
	fmt.Printf("📊 System Monitor: http://%s:%s/monitor\n", cfg.Server.Host, cfg.Server.Port)
	fmt.Printf("🌐 Web UI: http://%s:8888\n", cfg.Server.Host)
	fmt.Printf("🔧 Version: %s\n", Version)
	fmt.Printf("⏰ Build Time: %s\n", BuildTime)

	// Start server in goroutine for graceful shutdown
	go func() {
		if err := server.Start(); err != nil {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Setup graceful shutdown with multiple signals
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)

	// Wait for shutdown signal
	<-quit
	log.Println("Received shutdown signal...")

	// Create context with timeout for shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Graceful shutdown
	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Error during shutdown: %v", err)
	}

	log.Println("XTV server stopped")
}

func runInstallation(cfg *config.Config, configPath string) error {
	reader := bufio.NewReader(os.Stdin)

	fmt.Println("Welcome to XTV Installation!")
	fmt.Println("Please provide the following information:")
	fmt.Println()

	// Server name
	fmt.Print("Server name (e.g., server1.vpsgame.cloud): ")
	serverName, err := reader.ReadString('\n')
	if err != nil {
		return fmt.Errorf("failed to read server name: %v", err)
	}
	serverName = strings.TrimSpace(serverName)
	if serverName == "" {
		return fmt.Errorf("server name cannot be empty")
	}

	// IP configuration
	fmt.Print("IP configuration (dhcp/static): ")
	ipConfig, err := reader.ReadString('\n')
	if err != nil {
		return fmt.Errorf("failed to read IP config: %v", err)
	}
	ipConfig = strings.TrimSpace(strings.ToLower(ipConfig))
	if ipConfig != "dhcp" && ipConfig != "static" {
		return fmt.Errorf("IP config must be 'dhcp' or 'static'")
	}

	var staticIP string
	if ipConfig == "static" {
		fmt.Print("Static IP address: ")
		staticIP, err = reader.ReadString('\n')
		if err != nil {
			return fmt.Errorf("failed to read static IP: %v", err)
		}
		staticIP = strings.TrimSpace(staticIP)
		if staticIP == "" {
			return fmt.Errorf("static IP cannot be empty")
		}
	}

	// Password
	fmt.Print("Password for root user: ")
	password, err := reader.ReadString('\n')
	if err != nil {
		return fmt.Errorf("failed to read password: %v", err)
	}
	password = strings.TrimSpace(password)
	if password == "" {
		return fmt.Errorf("password cannot be empty")
	}

	// Confirm password
	fmt.Print("Confirm password: ")
	confirmPassword, err := reader.ReadString('\n')
	if err != nil {
		return fmt.Errorf("failed to read confirm password: %v", err)
	}
	confirmPassword = strings.TrimSpace(confirmPassword)
	if password != confirmPassword {
		return fmt.Errorf("passwords do not match")
	}

	// Show installation progress
	fmt.Println("\nStarting installation...")
	showProgress("Initializing system", 10)
	showProgress("Configuring network", 30)
	showProgress("Setting up authentication", 50)
	showProgress("Creating default quotas", 70)
	showProgress("Saving configuration", 90)
	showProgress("Installation completed", 100)

	// Update configuration
	cfg.Install.ServerName = serverName
	cfg.Install.Network.IPConfig = ipConfig
	cfg.Install.Network.StaticIP = staticIP
	cfg.Install.WebPort = 8888
	cfg.Install.APIPort = 8080
	cfg.Install.Installed = true

	cfg.Auth.Username = "root"
	cfg.Auth.Password = password

	// Save configuration
	if err := cfg.Save(configPath); err != nil {
		return fmt.Errorf("failed to save configuration: %v", err)
	}

	// Show success message
	fmt.Println("\n🎉 Installation completed successfully!")
	fmt.Printf("Server Name: %s\n", serverName)
	fmt.Printf("Web UI URL: http://%s:8888\n", serverName)
	fmt.Printf("API URL: http://%s:8080\n", serverName)
	fmt.Printf("Username: root\n")
	fmt.Printf("Password: %s\n", strings.Repeat("*", len(password)))
	fmt.Println("\nYou can now start the server with: ./xtv --config %s", configPath)

	return nil
}

func showProgress(message string, percentage int) {
	fmt.Printf("\r%s... %d%%", message, percentage)
	time.Sleep(200 * time.Millisecond)
	if percentage == 100 {
		fmt.Println()
	}
}
