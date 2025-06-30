package config

import (
	"encoding/json"
	"fmt"
	"net"
	"os"
	"time"
)

// AuthConfig represents authentication configuration
type AuthConfig struct {
	Username    string    `json:"username"`
	Password    string    `json:"password"`
	Token       string    `json:"token,omitempty"`
	TokenExpiry time.Time `json:"token_expiry,omitempty"`
}

// NetworkConfig represents network configuration
type NetworkConfig struct {
	Interface      string    `json:"interface"`
	IPConfig       string    `json:"ip_config"` // "dhcp" or "static"
	StaticIP       string    `json:"static_ip,omitempty"`
	Gateway        string    `json:"gateway,omitempty"`
	Netmask        string    `json:"netmask,omitempty"`
	DNSServers     string    `json:"dns_servers,omitempty"`
	PublicIP       string    `json:"public_ip,omitempty"`
	OriginalIP     string    `json:"original_ip,omitempty"` // IP ตอนติดตั้งครั้งแรก
	AutoDetectIP   bool      `json:"auto_detect_ip"`
	LastDetected   string    `json:"last_detected,omitempty"`
	LastDetectedAt time.Time `json:"last_detected_at,omitempty"`
}

// InstallConfig represents installation configuration
type InstallConfig struct {
	ServerName  string        `json:"server_name"`
	Network     NetworkConfig `json:"network"`
	WebPort     int           `json:"web_port"`
	APIPort     int           `json:"api_port"`
	Installed   bool          `json:"installed"`
	InstallDate time.Time     `json:"install_date,omitempty"`
}

// Config represents the application configuration
type Config struct {
	Server  ServerConfig  `json:"server"`
	VM      VMConfig      `json:"vm"`
	LibVirt LibVirtConfig `json:"libvirt"`
	Auth    AuthConfig    `json:"auth"`
	Install InstallConfig `json:"install"`
}

type ServerConfig struct {
	Port string `json:"port"`
	Host string `json:"host"`
}

type VMConfig struct {
	StoragePath string `json:"storage_path"`
	ImagePath   string `json:"image_path"`
	NetworkName string `json:"network_name"`
}

type LibVirtConfig struct {
	URI string `json:"uri"`
}

// GetCurrentIP returns the current public IP address
func (c *Config) GetCurrentIP() (string, error) {
	// Try to get public IP from external service
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err != nil {
		return "", fmt.Errorf("failed to detect public IP: %v", err)
	}
	defer conn.Close()

	localAddr := conn.LocalAddr().(*net.UDPAddr)
	return localAddr.IP.String(), nil
}

// GetLocalIP returns the local IP address
func (c *Config) GetLocalIP() (string, error) {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "", fmt.Errorf("failed to get interface addresses: %v", err)
	}

	for _, addr := range addrs {
		if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				return ipnet.IP.String(), nil
			}
		}
	}
	return "", fmt.Errorf("no local IP found")
}

// UpdateNetworkInfo updates network information
func (c *Config) UpdateNetworkInfo() error {
	if c.Install.Network.AutoDetectIP {
		currentIP, err := c.GetCurrentIP()
		if err != nil {
			return fmt.Errorf("failed to detect current IP: %v", err)
		}

		// Only update if IP has changed
		if currentIP != c.Install.Network.LastDetected {
			c.Install.Network.LastDetected = currentIP
			c.Install.Network.LastDetectedAt = time.Now()
			c.Install.Network.PublicIP = currentIP

			fmt.Printf("[NETWORK] IP changed from %s to %s\n",
				c.Install.Network.LastDetected, currentIP)
		}
	}
	return nil
}

// SetOriginalIP sets the original IP (called during installation)
func (c *Config) SetOriginalIP() error {
	localIP, err := c.GetLocalIP()
	if err != nil {
		return fmt.Errorf("failed to get local IP: %v", err)
	}

	c.Install.Network.OriginalIP = localIP
	fmt.Printf("[CONFIG] Original IP set to: %s\n", localIP)
	return nil
}

// UpdateIPManually updates IP manually (for network migration)
func (c *Config) UpdateIPManually(newIP string) error {
	if newIP == "" {
		return fmt.Errorf("new IP cannot be empty")
	}

	oldIP := c.Install.Network.PublicIP
	c.Install.Network.PublicIP = newIP
	c.Install.Network.LastDetected = newIP
	c.Install.Network.LastDetectedAt = time.Now()

	fmt.Printf("[NETWORK] IP manually updated from %s to %s\n", oldIP, newIP)
	return nil
}

// GetMigrationInfo returns information needed for migration
func (c *Config) GetMigrationInfo() map[string]interface{} {
	return map[string]interface{}{
		"original_ip":  c.Install.Network.OriginalIP,
		"current_ip":   c.Install.Network.PublicIP,
		"web_url":      c.GetWebURL(),
		"api_url":      c.GetAPIURL(),
		"install_date": c.Install.InstallDate,
	}
}

// GetWebURL returns the web interface URL
func (c *Config) GetWebURL() string {
	ip := c.Install.Network.PublicIP
	if ip == "" {
		ip = c.Install.Network.StaticIP
	}
	if ip == "" {
		ip = "localhost"
	}
	return fmt.Sprintf("http://%s:%d", ip, c.Install.WebPort)
}

// GetAPIURL returns the API URL
func (c *Config) GetAPIURL() string {
	ip := c.Install.Network.PublicIP
	if ip == "" {
		ip = c.Install.Network.StaticIP
	}
	if ip == "" {
		ip = "localhost"
	}
	return fmt.Sprintf("http://%s:%d", ip, c.Install.APIPort)
}

func Load(configPath string) *Config {
	// Default configuration
	config := &Config{
		Server: ServerConfig{
			Port: "8080",
			Host: "0.0.0.0",
		},
		VM: VMConfig{
			StoragePath: "/var/lib/xtv/vms",
			ImagePath:   "/var/lib/xtv/images",
			NetworkName: "default",
		},
		LibVirt: LibVirtConfig{
			URI: "qemu:///system",
		},
		Auth: AuthConfig{
			Username: "",
			Password: "",
			Token:    "",
		},
		Install: InstallConfig{
			ServerName: "",
			Network: NetworkConfig{
				Interface:    "eth0",
				IPConfig:     "dhcp",
				AutoDetectIP: true,
			},
			WebPort:   8888,
			APIPort:   8080,
			Installed: false,
		},
	}

	// Try to load from config file
	if _, err := os.Stat(configPath); err == nil {
		file, err := os.Open(configPath)
		if err == nil {
			defer file.Close()
			json.NewDecoder(file).Decode(config)
			fmt.Printf("[CONFIG] Loaded from: %s\n", configPath)
		}
	}

	// Create directories if they don't exist
	os.MkdirAll(config.VM.StoragePath, 0755)
	os.MkdirAll(config.VM.ImagePath, 0755)

	// Update network information
	config.UpdateNetworkInfo()

	return config
}

// Save saves the configuration to file
func (c *Config) Save(configPath string) error {
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %v", err)
	}

	err = os.WriteFile(configPath, data, 0644)
	if err != nil {
		return fmt.Errorf("failed to write config file: %v", err)
	}
	fmt.Printf("[CONFIG] Saved to: %s\n", configPath)
	return nil
}
