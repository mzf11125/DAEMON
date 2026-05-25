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
