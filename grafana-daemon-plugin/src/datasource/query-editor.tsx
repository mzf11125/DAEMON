import React, { ChangeEvent } from "react";
import { QueryEditorProps, SelectableValue } from "@grafana/data";
import { InlineField, Input, Select } from "@grafana/ui";
import { DaemonDataSource } from "./datasource";
import { DaemonDataSourceOptions, DaemonQuery } from "./types";

type Props = QueryEditorProps<
  DaemonDataSource,
  DaemonQuery,
  DaemonDataSourceOptions
>;

const QUERY_TYPES: Array<SelectableValue<string>> = [
  { label: "List Signals", value: "listSignals" },
  { label: "List Cases", value: "listCases" },
  { label: "List Objects", value: "listObjects" },
  { label: "Audit Events", value: "auditEvents" },
  { label: "Geo Map", value: "geoMap" },
  { label: "Case Detail", value: "caseDetail" },
  { label: "Metric Query", value: "metricQuery" },
];

const OBJECT_TYPES: Array<SelectableValue<string>> = [
  { label: "Signal", value: "Signal" },
  { label: "Case", value: "Case" },
  { label: "WorkOrder", value: "WorkOrder" },
  { label: "Asset", value: "Asset" },
  { label: "Site", value: "Site" },
  { label: "Party", value: "Party" },
  { label: "Observation", value: "Observation" },
];

export function DaemonQueryEditor({ query, onChange }: Props) {
  const onQueryTypeChange = (item: SelectableValue<string>) => {
    onChange({ ...query, queryType: item.value as DaemonQuery["queryType"] });
  };

  const onObjectTypeChange = (item: SelectableValue<string>) => {
    onChange({ ...query, objectType: item.value ?? undefined });
  };

  const onLimitChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, limit: Number(e.currentTarget.value) || undefined });
  };

  const onCaseIdChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, caseId: e.currentTarget.value || undefined });
  };

  return (
    <>
      <InlineField label="Query Type" labelWidth={16}>
        <Select
          value={query.queryType ?? "listSignals"}
          options={QUERY_TYPES}
          onChange={onQueryTypeChange}
          width={30}
        />
      </InlineField>

      {(query.queryType === "listObjects" ||
        query.queryType === "metricQuery") && (
        <InlineField label="Object Type" labelWidth={16}>
          <Select
            value={query.objectType ?? ""}
            options={OBJECT_TYPES}
            onChange={onObjectTypeChange}
            width={30}
          />
        </InlineField>
      )}

      {query.queryType === "caseDetail" && (
        <InlineField label="Case ID" labelWidth={16}>
          <Input
            value={query.caseId ?? ""}
            onChange={onCaseIdChange}
            placeholder="case-001"
            width={30}
          />
        </InlineField>
      )}

      {query.queryType !== "caseDetail" && query.queryType !== "geoMap" && (
        <InlineField label="Limit" labelWidth={16}>
          <Input
            type="number"
            value={query.limit ?? 100}
            onChange={onLimitChange}
            width={10}
          />
        </InlineField>
      )}
    </>
  );
}
