//go:build mock
// +build mock

package vm

import "xtv/internal/config"

func NewLibVirtManager(cfg *config.Config) (VMManager, error) {
	return nil, ErrLibVirtNotSupported
}

var ErrLibVirtNotSupported = &LibVirtNotSupportedError{}

type LibVirtNotSupportedError struct{}

func (e *LibVirtNotSupportedError) Error() string {
	return "libvirt is not supported in mock/dev build"
}
