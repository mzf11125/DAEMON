# Logistics express-cargo — cross-domain signal map v0.1

Vendor-neutral mapping from **customer/commercial signals** to **operations triggers** and **transfer-pricing / OBL implications**. Machine-readable source: `ontology/v2/examples/packs/logistics-express-cargo/catalog/signals-map.yaml` (32 rows).

| ID | Customer signal | Ops trigger | TP implication | OBL impact |
|----|-----------------|-------------|----------------|------------|
| ec-sm-001 | leg_sla_miss_observation | express-leg-sla-breach | expedite_vendor_cost_review | service_credit_risk_flag |
| ec-sm-002 | routing_cost_variance | express-routing-anomaly | margin_compression_alert | lane_profitability_watch |
| ec-sm-003 | champion_departure_risk | express-champion-idle | account_revenue_at_risk | renewal_escalation |
| ec-sm-004 | pickup_delay_touchpoint | touchpoint_sla_miss | vendor_penalty_candidate | customer_sla_breach |
| ec-sm-005 | hub_congestion_indicator | hub_dwell_threshold | interco_rebalance | network_capacity_note |
| ec-sm-006 | manifest_mismatch | document_intake_exception | billing_hold | revenue_recognition_delay |
| ec-sm-007 | pod_missing | delivery_proof_gap | invoice_block | dso_extension |
| ec-sm-008 | weight_discrepancy | weighbridge_variance | repricing_line_item | dispute_reserve |
| ec-sm-009 | duplicate_bast_reference | intake_duplicate_check | duplicate_shipment_prevent | audit_trail_required |
| ec-sm-010 | silent_account_90d | activity_gap_alert | churn_playbook | account_health_downgrade |
| ec-sm-011 | tier_a_volume_drop | volume_trend_anomaly | forecast_adjustment | quota_miss_warning |
| ec-sm-012 | tier_b_upsell_window | growth_opportunity | bundled_rate_offer | expansion_target |
| ec-sm-013 | cross_hub_detour | route_deviation | fuel_surcharge | cost_to_serve_increase |
| ec-sm-014 | asset_idle_at_hub | asset_utilization_low | fleet_reassignment | capex_utilization_metric |
| ec-sm-015 | vendor_invoice_spike | vendor_cost_anomaly | allocation_run_review | gross_margin_alert |
| ec-sm-016 | interco_pending_aging | interco_sla_breach | settlement_acceleration | transfer_pricing_note |
| ec-sm-017 | invoice_dispute_open | ar_dispute_case | credit_memo_candidate | revenue_adjustment |
| ec-sm-018 | governance_audit_finding | compliance_exception | process_hold | control_remediation |
| ec-sm-019 | allocation_run_failure | finance_batch_error | manual_allocation | close_delay |
| ec-sm-020 | obl_score_drop | scorecard_threshold | executive_review | covenant_watch |
| ec-sm-021 | service_area_outage | network_incident | contingency_routing | force_majeure_log |
| ec-sm-022 | temperature_excursion | cold_chain_breach | spoilage_claim | insurance_notification |
| ec-sm-023 | hazmat_doc_missing | compliance_block | shipment_hold | regulatory_exposure |
| ec-sm-024 | customer_escalation_email | case_priority_boost | war_room_workorder | exec_briefing |
| ec-sm-025 | repeat_sla_breach_7d | chronic_sla_pattern | account_review | contract_penalty_clause |
| ec-sm-026 | new_lane_request | commercial_intake | pricing_approval | pipeline_add |
| ec-sm-027 | rate_card_expiry | contract_renewal | repricing_cycle | revenue_at_risk |
| ec-sm-028 | fuel_index_surge | surcharge_trigger | passthrough_invoice | margin_neutral_adjust |
| ec-sm-029 | weekend_delivery_request | capacity_override | premium_service_fee | ops_overtime_cost |
| ec-sm-030 | return_shipment_loop | reverse_logistics | credit_rebill | net_revenue_impact |
| ec-sm-031 | integration_edi_gap | connector_replay_fail | manual_entry_queue | data_quality_flag |
| ec-sm-032 | sim_sandbox_health | signal-logistics-express-cargo-001 | demo_only | none_sim |

## Seeded sim linkage

| Signal PK | Rule | Shipment / account |
|-----------|------|-------------------|
| signal-express-sla-001 | express-leg-sla-breach | shipment-express-001 |
| signal-express-routing-001 | express-routing-anomaly | shipment-express-001 |
| signal-express-champion-001 | express-champion-idle | account-tier-a-001 |
| signal-logistics-express-cargo-001 | (sandbox) | vertical pack |

## Related

- [logistics-express-cargo-assume-case-v1.md](./logistics-express-cargo-assume-case-v1.md)
- [logistics-express-cargo-action-catalog-v1.md](./logistics-express-cargo-action-catalog-v1.md)
