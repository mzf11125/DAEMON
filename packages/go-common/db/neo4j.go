package db

import (
	"context"
	"fmt"

	neo4j "github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func NewNeo4j(ctx context.Context, uri, user, password string) (neo4j.DriverWithContext, error) {
	driver, err := neo4j.NewDriverWithContext(uri, neo4j.BasicAuth(user, password, ""))
	if err != nil {
		return nil, fmt.Errorf("neo4j driver: %w", err)
	}
	if err := driver.VerifyConnectivity(ctx); err != nil {
		driver.Close(ctx)
		return nil, fmt.Errorf("neo4j verify connectivity: %w", err)
	}
	return driver, nil
}
