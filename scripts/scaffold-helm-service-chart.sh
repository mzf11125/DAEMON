#!/usr/bin/env bash
# Scaffold minimal Helm chart for a Go HTTP service (Phase 1).
set -euo pipefail
name="${1:?usage: scaffold-helm-service-chart.sh <chart-name> <http-port> [namespace-tier]}"
port="${2:?port required}"
tier="${3:-platform}"
root="$(cd "$(dirname "$0")/.." && pwd)"
dir="$root/infra/helm/$name"
mkdir -p "$dir/templates"

cat > "$dir/Chart.yaml" <<EOF
apiVersion: v2
name: $name
description: Daemon $name workload
type: application
version: 0.1.0
appVersion: "0.1.0"
EOF

cat > "$dir/values.yaml" <<EOF
replicaCount: 2
image:
  repository: ghcr.io/daemon-blockint-tech/$name
  digest: ""
  tag: "0.1.0"
  pullPolicy: IfNotPresent
config:
  httpPort: "$port"
  oidcRequired: "true"
  logLevel: "info"
service:
  type: ClusterIP
  port: $port
resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi
podSecurityContext:
  runAsNonRoot: true
  runAsUser: 65532
  fsGroup: 65532
containerSecurityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop: ["ALL"]
EOF

cp "$dir/values.yaml" "$dir/values.staging.yaml"
cp "$dir/values.yaml" "$dir/values.prod.yaml"

cat > "$dir/templates/_helpers.tpl" <<'HELPERS'
{{- define "daemon.name" -}}{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}{{- end }}
{{- define "daemon.fullname" -}}
{{- if .Values.fullnameOverride }}{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}{{- printf "%s-%s" .Release.Name (include "daemon.name" .) | trunc 63 | trimSuffix "-" }}{{- end }}
{{- end }}
{{- define "daemon.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/name: {{ include "daemon.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}
{{- define "daemon.selectorLabels" -}}
app.kubernetes.io/name: {{ include "daemon.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
{{- define "daemon.image" -}}
{{- if .Values.image.digest -}}
{{ .Values.image.repository }}@{{ .Values.image.digest }}
{{- else -}}
{{ .Values.image.repository }}:{{ .Values.image.tag }}
{{- end -}}
{{- end }}
HELPERS

cat > "$dir/templates/deployment.yaml" <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "daemon.fullname" . }}
  labels: {{- include "daemon.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels: {{- include "daemon.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels: {{- include "daemon.selectorLabels" . | nindent 8 }}
    spec:
      securityContext: {{- toYaml .Values.podSecurityContext | nindent 8 }}
      containers:
        - name: $name
          image: {{ include "daemon.image" . }}
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          securityContext: {{- toYaml .Values.containerSecurityContext | nindent 12 }}
          ports:
            - containerPort: {{ .Values.config.httpPort }}
          env:
            - name: HTTP_PORT
              value: {{ .Values.config.httpPort | quote }}
            - name: OIDC_REQUIRED
              value: {{ .Values.config.oidcRequired | quote }}
            - name: LOG_LEVEL
              value: {{ .Values.config.logLevel | quote }}
          livenessProbe:
            httpGet:
              path: /health
              port: {{ .Values.config.httpPort }}
            initialDelaySeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: {{ .Values.config.httpPort }}
            initialDelaySeconds: 5
          resources: {{- toYaml .Values.resources | nindent 12 }}
EOF

cat > "$dir/templates/service.yaml" <<EOF
apiVersion: v1
kind: Service
metadata:
  name: {{ include "daemon.fullname" . }}
  labels: {{- include "daemon.labels" . | nindent 4 }}
spec:
  type: {{ .Values.service.type }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: {{ .Values.config.httpPort }}
      protocol: TCP
      name: http
  selector: {{- include "daemon.selectorLabels" . | nindent 4 }}
EOF

echo "scaffold-helm-service-chart: wrote $dir"
