import React, { ChangeEvent } from "react";
import { DataSourcePluginOptionsEditorProps } from "@grafana/data";
import { FieldSet, InlineField, Input, SecretInput, Switch } from "@grafana/ui";
import { DaemonDataSourceOptions } from "./types";

interface Props extends DataSourcePluginOptionsEditorProps<DaemonDataSourceOptions> {}

export function DaemonConfigEditor({ options, onOptionsChange }: Props) {
  const { jsonData } = options;

  const onApiUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: { ...jsonData, apiUrl: e.currentTarget.value },
    });
  };

  const onTenantIdChange = (e: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: { ...jsonData, tenantId: e.currentTarget.value },
    });
  };

  const onAuthTokenChange = (e: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: { ...jsonData, authToken: e.currentTarget.value },
    });
  };

  const onOidcChange = (e: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: { ...jsonData, oidcEnabled: e.currentTarget.checked },
    });
  };

  return (
    <FieldSet label="DAEMON API Configuration">
      <InlineField
        label="API URL"
        labelWidth={20}
        tooltip="Base URL of your DAEMON API"
      >
        <Input
          value={jsonData.apiUrl ?? ""}
          onChange={onApiUrlChange}
          placeholder="https://daemon.company.com"
          width={40}
        />
      </InlineField>

      <InlineField
        label="Tenant ID"
        labelWidth={20}
        tooltip="DAEMON tenant identifier"
      >
        <Input
          value={jsonData.tenantId ?? ""}
          onChange={onTenantIdChange}
          placeholder="tenant-demo"
          width={30}
        />
      </InlineField>

      <InlineField
        label="Auth Token"
        labelWidth={20}
        tooltip="JWT Bearer token for API authentication"
      >
        <SecretInput
          value={jsonData.authToken ?? ""}
          onChange={onAuthTokenChange}
          placeholder="Bearer token"
          width={40}
          isConfigured={!!jsonData.authToken}
          onReset={() =>
            onOptionsChange({
              ...options,
              jsonData: { ...jsonData, authToken: "" },
            })
          }
        />
      </InlineField>

      <InlineField
        label="OIDC Auth"
        labelWidth={20}
        tooltip="Use OIDC authentication (requires separate OIDC provider config)"
      >
        <Switch value={jsonData.oidcEnabled ?? false} onChange={onOidcChange} />
      </InlineField>
    </FieldSet>
  );
}
