package main

import (
	"flag"
	"fmt"
	"os"
	"time"

	"xtv/internal/config"
)

func main() {
	var (
		configPath = flag.String("config", "config.json", "Path to config file")
		newIP      = flag.String("ip", "", "New IP address")
		showInfo   = flag.Bool("info", false, "Show migration information")
		help       = flag.Bool("help", false, "Show help")
	)
	flag.Parse()

	if *help {
		fmt.Println("XTV IP Update Tool")
		fmt.Println("Usage:")
		fmt.Println("  update_ip -ip <new_ip> [-config <config_file>]")
		fmt.Println("  update_ip -info [-config <config_file>]")
		fmt.Println("")
		fmt.Println("Examples:")
		fmt.Println("  update_ip -ip 192.168.1.100")
		fmt.Println("  update_ip -ip 10.0.0.50 -config /etc/xtv/config.json")
		fmt.Println("  update_ip -info")
		return
	}

	// Load configuration
	cfg := config.Load(*configPath)

	if *showInfo {
		showMigrationInfo(cfg)
		return
	}

	if *newIP == "" {
		fmt.Println("Error: New IP address is required")
		fmt.Println("Use -help for usage information")
		os.Exit(1)
	}

	// Update IP
	if err := cfg.UpdateIPManually(*newIP); err != nil {
		fmt.Printf("Error updating IP: %v\n", err)
		os.Exit(1)
	}

	// Save configuration
	if err := cfg.Save(*configPath); err != nil {
		fmt.Printf("Error saving configuration: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("✅ IP updated successfully!\n")
	fmt.Printf("   Old IP: %s\n", cfg.Install.Network.LastDetected)
	fmt.Printf("   New IP: %s\n", *newIP)
	fmt.Printf("   Web URL: %s\n", cfg.GetWebURL())
	fmt.Printf("   API URL: %s\n", cfg.GetAPIURL())
	fmt.Printf("   Config saved to: %s\n", *configPath)
}

func showMigrationInfo(cfg *config.Config) {
	fmt.Println("=== XTV Migration Information ===")
	fmt.Printf("Original IP (Installation): %s\n", cfg.Install.Network.OriginalIP)
	fmt.Printf("Current IP: %s\n", cfg.Install.Network.PublicIP)
	fmt.Printf("Last Detected: %s\n", cfg.Install.Network.LastDetected)
	fmt.Printf("Last Detected At: %s\n", cfg.Install.Network.LastDetectedAt.Format(time.RFC3339))
	fmt.Printf("Install Date: %s\n", cfg.Install.InstallDate.Format(time.RFC3339))
	fmt.Printf("Web URL: %s\n", cfg.GetWebURL())
	fmt.Printf("API URL: %s\n", cfg.GetAPIURL())
	fmt.Printf("Auto Detect IP: %t\n", cfg.Install.Network.AutoDetectIP)
	fmt.Printf("IP Config: %s\n", cfg.Install.Network.IPConfig)

	if cfg.Install.Network.IPConfig == "static" {
		fmt.Printf("Static IP: %s\n", cfg.Install.Network.StaticIP)
		fmt.Printf("Gateway: %s\n", cfg.Install.Network.Gateway)
		fmt.Printf("Netmask: %s\n", cfg.Install.Network.Netmask)
		fmt.Printf("DNS Servers: %s\n", cfg.Install.Network.DNSServers)
	}
}
