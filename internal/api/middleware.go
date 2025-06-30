package api

import (
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// RateLimiter holds rate limiting information
type RateLimiter struct {
	limiters map[string]*rate.Limiter
	mutex    sync.RWMutex
	rate     rate.Limit
	burst    int
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(rps int, burst int) *RateLimiter {
	return &RateLimiter{
		limiters: make(map[string]*rate.Limiter),
		rate:     rate.Limit(rps),
		burst:    burst,
	}
}

// getLimiter returns or creates a limiter for the given key
func (rl *RateLimiter) getLimiter(key string) *rate.Limiter {
	rl.mutex.Lock()
	defer rl.mutex.Unlock()

	limiter, exists := rl.limiters[key]
	if !exists {
		limiter = rate.NewLimiter(rl.rate, rl.burst)
		rl.limiters[key] = limiter
	}

	return limiter
}

// RateLimitMiddleware provides rate limiting functionality
func RateLimitMiddleware(rps int, burst int) gin.HandlerFunc {
	limiter := NewRateLimiter(rps, burst)

	return func(c *gin.Context) {
		// Get client IP
		clientIP := c.ClientIP()

		// Get limiter for this client
		clientLimiter := limiter.getLimiter(clientIP)

		// Check if request is allowed
		if !clientLimiter.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "Rate limit exceeded",
				"retry_after": time.Now().Add(time.Second).Unix(),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// CORSMiddleware provides CORS functionality
func CORSMiddleware() gin.HandlerFunc {
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"*"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"}
	config.ExposeHeaders = []string{"Content-Length", "X-Total-Count"}
	config.AllowCredentials = true
	config.MaxAge = 12 * time.Hour

	return cors.New(config)
}

// GzipMiddleware provides compression
func GzipMiddleware() gin.HandlerFunc {
	return gzip.Gzip(gzip.DefaultCompression)
}

// RequestIDMiddleware adds a unique request ID to each request
func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}

		c.Header("X-Request-ID", requestID)
		c.Set("request_id", requestID)
		c.Next()
	}
}

// LoggingMiddleware provides request logging
func LoggingMiddleware() gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		return fmt.Sprintf("%s - [%s] \"%s %s %s %d %s \"%s\" %s\"\n",
			param.ClientIP,
			param.TimeStamp.Format(time.RFC1123),
			param.Method,
			param.Path,
			param.Request.Proto,
			param.StatusCode,
			param.Latency,
			param.Request.UserAgent(),
			param.ErrorMessage,
		)
	})
}

// SecurityMiddleware provides security headers
func SecurityMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Security headers
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		c.Header("Content-Security-Policy", "default-src 'self'")

		c.Next()
	}
}

// PerformanceMiddleware adds performance monitoring
func PerformanceMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// Process request
		c.Next()

		// Calculate duration
		duration := time.Since(start)

		// Add performance headers
		c.Header("X-Response-Time", duration.String())
		c.Header("X-Request-Duration", fmt.Sprintf("%d", duration.Milliseconds()))

		// Log slow requests
		if duration > 1*time.Second {
			log.Printf("Slow request: %s %s took %v", c.Request.Method, c.Request.URL.Path, duration)
		}
	}
}

// RecoveryMiddleware provides panic recovery
func RecoveryMiddleware() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		if err, ok := recovered.(string); ok {
			c.String(http.StatusInternalServerError, fmt.Sprintf("error: %s", err))
		}
		c.AbortWithStatus(http.StatusInternalServerError)
	})
}

// AuthMiddleware provides basic authentication
func AuthMiddleware(username, password string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip auth for certain endpoints
		if c.Request.URL.Path == "/health" || c.Request.URL.Path == "/metrics" {
			c.Next()
			return
		}

		// Get credentials from header
		auth := c.GetHeader("Authorization")
		if auth == "" {
			c.Header("WWW-Authenticate", "Basic realm=Authorization Required")
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		// Validate credentials
		if !validateBasicAuth(auth, username, password) {
			c.Header("WWW-Authenticate", "Basic realm=Authorization Required")
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		c.Next()
	}
}

// validateBasicAuth validates basic authentication
func validateBasicAuth(auth, username, password string) bool {
	// This is a simplified implementation
	// In production, use proper password hashing
	return auth == "Basic "+base64Encode(username+":"+password)
}

// base64Encode encodes string to base64
func base64Encode(s string) string {
	// Simplified base64 encoding
	// In production, use proper base64 encoding
	return s // Placeholder
}

// generateRequestID generates a unique request ID
func generateRequestID() string {
	return fmt.Sprintf("req_%d_%d", time.Now().UnixNano(), rand.Int63())
}

// ConnectionPoolMiddleware manages connection pooling
type ConnectionPoolMiddleware struct {
	maxConnections int
	semaphore      chan struct{}
}

// NewConnectionPoolMiddleware creates a new connection pool middleware
func NewConnectionPoolMiddleware(maxConnections int) *ConnectionPoolMiddleware {
	return &ConnectionPoolMiddleware{
		maxConnections: maxConnections,
		semaphore:      make(chan struct{}, maxConnections),
	}
}

// Handle manages connection pooling
func (cpm *ConnectionPoolMiddleware) Handle() gin.HandlerFunc {
	return func(c *gin.Context) {
		select {
		case cpm.semaphore <- struct{}{}:
			defer func() { <-cpm.semaphore }()
			c.Next()
		default:
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error": "Too many concurrent requests",
			})
			c.Abort()
		}
	}
}

// CacheMiddleware provides response caching
func CacheMiddleware(duration time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip caching for non-GET requests
		if c.Request.Method != "GET" {
			c.Next()
			return
		}

		// Add cache headers
		c.Header("Cache-Control", fmt.Sprintf("public, max-age=%d", int(duration.Seconds())))
		c.Header("Expires", time.Now().Add(duration).Format(time.RFC1123))

		c.Next()
	}
}

// MetricsMiddleware collects request metrics
type MetricsMiddleware struct {
	requestCount int64
	errorCount   int64
	responseTime time.Duration
	mutex        sync.RWMutex
}

// NewMetricsMiddleware creates a new metrics middleware
func NewMetricsMiddleware() *MetricsMiddleware {
	return &MetricsMiddleware{}
}

// Handle collects metrics
func (mm *MetricsMiddleware) Handle() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// Increment request count
		mm.mutex.Lock()
		mm.requestCount++
		mm.mutex.Unlock()

		// Process request
		c.Next()

		// Calculate response time
		duration := time.Since(start)

		// Update metrics
		mm.mutex.Lock()
		mm.responseTime = duration
		if c.Writer.Status() >= 400 {
			mm.errorCount++
		}
		mm.mutex.Unlock()
	}
}

// GetMetrics returns current metrics
func (mm *MetricsMiddleware) GetMetrics() map[string]interface{} {
	mm.mutex.RLock()
	defer mm.mutex.RUnlock()

	return map[string]interface{}{
		"total_requests":     mm.requestCount,
		"error_count":        mm.errorCount,
		"last_response_time": mm.responseTime.String(),
		"error_rate":         float64(mm.errorCount) / float64(mm.requestCount) * 100,
	}
}
