package testutil

import (
	"fmt"
	"net"
	"testing"
)

// FreeTCPPort returns an available localhost TCP port for integration service binds.
func FreeTCPPort(t *testing.T) string {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	port := ln.Addr().(*net.TCPAddr).Port
	if err := ln.Close(); err != nil {
		t.Fatal(err)
	}
	return fmt.Sprintf("%d", port)
}
