import { DataSourcePlugin } from "@grafana/data";
import { DaemonDataSource } from "./datasource/datasource";
import { DaemonConfigEditor } from "./datasource/config-editor";
import { DaemonQueryEditor } from "./datasource/query-editor";
import { DaemonDataSourceOptions, DaemonQuery } from "./datasource/types";

export const plugin = new DataSourcePlugin<
  DaemonDataSource,
  DaemonQuery,
  DaemonDataSourceOptions
>(DaemonDataSource)
  .setConfigEditor(DaemonConfigEditor)
  .setQueryEditor(DaemonQueryEditor);
