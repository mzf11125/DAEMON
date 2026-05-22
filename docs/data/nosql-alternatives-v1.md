# NoSQL alternatives v1

## DynamoDB

Rejected as primary store: rules engine requires ad hoc SQL on observations; relational jobs/lineage fit Postgres.

## MongoDB

Rejected as primary analytics store: duplicates ClickHouse role; would rewrite all repositories.

## Status quo

Postgres + ClickHouse + Neo4j retained for demo and near-term product paths.
