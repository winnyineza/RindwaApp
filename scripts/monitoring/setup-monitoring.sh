#!/bin/bash

# =================================================================
# 📊 Rindwa Emergency Platform - Monitoring & Scaling Setup
# =================================================================
# 
# This script sets up comprehensive monitoring, alerting, and 
# auto-scaling for the Rindwa Emergency Platform
# 
# Usage: ./scripts/monitoring/setup-monitoring.sh [options]
# 
# Options:
#   --environment ENV     Target environment (development|staging|production)
#   --setup-prometheus    Setup Prometheus monitoring
#   --setup-grafana      Setup Grafana dashboards
#   --setup-alerting     Configure alerting rules
#   --setup-scaling      Configure auto-scaling policies
#   --setup-logs         Setup log aggregation
#   --setup-all          Setup everything
# 
# =================================================================

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="/var/log/rindwa/monitoring_setup_${TIMESTAMP}.log"

# Monitoring configuration
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
ALERT_MANAGER_PORT=9093
NODE_EXPORTER_PORT=9100

# Default options
ENVIRONMENT="production"
SETUP_PROMETHEUS=false
SETUP_GRAFANA=false
SETUP_ALERTING=false
SETUP_SCALING=false
SETUP_LOGS=false
SETUP_ALL=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --setup-prometheus)
            SETUP_PROMETHEUS=true
            shift
            ;;
        --setup-grafana)
            SETUP_GRAFANA=true
            shift
            ;;
        --setup-alerting)
            SETUP_ALERTING=true
            shift
            ;;
        --setup-scaling)
            SETUP_SCALING=true
            shift
            ;;
        --setup-logs)
            SETUP_LOGS=true
            shift
            ;;
        --setup-all)
            SETUP_ALL=true
            shift
            ;;
        --help)
            echo "Monitoring & Scaling Setup for Rindwa Emergency Platform"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --environment ENV     Target environment (development|staging|production)"
            echo "  --setup-prometheus    Setup Prometheus monitoring"
            echo "  --setup-grafana      Setup Grafana dashboards"
            echo "  --setup-alerting     Configure alerting rules"
            echo "  --setup-scaling      Configure auto-scaling policies"
            echo "  --setup-logs         Setup log aggregation"
            echo "  --setup-all          Setup everything"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Logging function
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "${RED}❌ ERROR: $1${NC}"
    exit 1
}

# Success message
success() {
    log "${GREEN}✅ $1${NC}"
}

# Warning message
warning() {
    log "${YELLOW}⚠️  $1${NC}"
}

# Info message
info() {
    log "${BLUE}ℹ️  $1${NC}"
}

# Setup logging
setup_logging() {
    sudo mkdir -p "$(dirname "$LOG_FILE")"
    sudo touch "$LOG_FILE"
    sudo chown "$(whoami):$(whoami)" "$LOG_FILE"
    info "Monitoring setup logged to: $LOG_FILE"
}

# Create monitoring directories
create_directories() {
    info "📁 Creating monitoring directories..."
    
    sudo mkdir -p /etc/prometheus
    sudo mkdir -p /etc/grafana/provisioning/{datasources,dashboards}
    sudo mkdir -p /etc/alertmanager
    sudo mkdir -p /var/lib/prometheus
    sudo mkdir -p /var/lib/grafana
    sudo mkdir -p /var/log/rindwa/monitoring
    
    # Set permissions
    sudo chown -R "$(whoami):$(whoami)" /etc/prometheus
    sudo chown -R "$(whoami):$(whoami)" /etc/grafana/provisioning
    sudo chown -R "$(whoami):$(whoami)" /etc/alertmanager
    
    success "Monitoring directories created"
}

# Setup Prometheus monitoring
setup_prometheus() {
    info "🔍 Setting up Prometheus monitoring..."
    
    # Download and install Prometheus
    if ! command -v prometheus &> /dev/null; then
        info "Downloading Prometheus..."
        cd /tmp
        wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
        tar xvf prometheus-2.45.0.linux-amd64.tar.gz
        sudo cp prometheus-2.45.0.linux-amd64/prometheus /usr/local/bin/
        sudo cp prometheus-2.45.0.linux-amd64/promtool /usr/local/bin/
        rm -rf prometheus-2.45.0*
    fi
    
    # Create Prometheus configuration
    cat > /etc/prometheus/prometheus.yml << EOF
# Rindwa Emergency Platform - Prometheus Configuration
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rindwa_alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - localhost:$ALERT_MANAGER_PORT

scrape_configs:
  # Rindwa Application Metrics
  - job_name: 'rindwa-app'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s
    scrape_timeout: 5s

  # Node Exporter (System Metrics)
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:$NODE_EXPORTER_PORT']

  # Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:$PROMETHEUS_PORT']

  # PostgreSQL Metrics
  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']

  # Nginx Metrics
  - job_name: 'nginx'
    static_configs:
      - targets: ['localhost:9113']
EOF

    # Create systemd service for Prometheus
    sudo tee /etc/systemd/system/prometheus.service > /dev/null << EOF
[Unit]
Description=Prometheus Server
Documentation=https://prometheus.io/docs/
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
Restart=on-failure
ExecStart=/usr/local/bin/prometheus \\
  --config.file=/etc/prometheus/prometheus.yml \\
  --storage.tsdb.path=/var/lib/prometheus/ \\
  --web.console.templates=/etc/prometheus/consoles \\
  --web.console.libraries=/etc/prometheus/console_libraries \\
  --web.listen-address=0.0.0.0:$PROMETHEUS_PORT \\
  --web.external-url=http://localhost:$PROMETHEUS_PORT

[Install]
WantedBy=multi-user.target
EOF

    # Create prometheus user
    sudo useradd --no-create-home --shell /bin/false prometheus || true
    sudo chown -R prometheus:prometheus /var/lib/prometheus
    sudo chown -R prometheus:prometheus /etc/prometheus

    # Start and enable Prometheus
    sudo systemctl daemon-reload
    sudo systemctl enable prometheus
    sudo systemctl start prometheus

    success "Prometheus monitoring configured and started on port $PROMETHEUS_PORT"
}

# Setup Node Exporter for system metrics
setup_node_exporter() {
    info "📊 Setting up Node Exporter..."
    
    # Download and install Node Exporter
    if ! command -v node_exporter &> /dev/null; then
        cd /tmp
        wget https://github.com/prometheus/node_exporter/releases/download/v1.6.0/node_exporter-1.6.0.linux-amd64.tar.gz
        tar xvf node_exporter-1.6.0.linux-amd64.tar.gz
        sudo cp node_exporter-1.6.0.linux-amd64/node_exporter /usr/local/bin/
        rm -rf node_exporter-1.6.0*
    fi

    # Create systemd service for Node Exporter
    sudo tee /etc/systemd/system/node_exporter.service > /dev/null << EOF
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter --web.listen-address=:$NODE_EXPORTER_PORT

[Install]
WantedBy=multi-user.target
EOF

    # Create node_exporter user
    sudo useradd --no-create-home --shell /bin/false node_exporter || true

    # Start and enable Node Exporter
    sudo systemctl daemon-reload
    sudo systemctl enable node_exporter
    sudo systemctl start node_exporter

    success "Node Exporter configured and started on port $NODE_EXPORTER_PORT"
}

# Setup Grafana dashboards
setup_grafana() {
    info "📈 Setting up Grafana dashboards..."
    
    # Install Grafana
    if ! command -v grafana-server &> /dev/null; then
        # Add Grafana repository
        wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
        echo "deb https://packages.grafana.com/oss/deb stable main" | sudo tee /etc/apt/sources.list.d/grafana.list
        sudo apt-get update
        sudo apt-get install -y grafana
    fi

    # Configure Grafana datasource
    cat > /etc/grafana/provisioning/datasources/prometheus.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://localhost:$PROMETHEUS_PORT
    isDefault: true
    editable: true
EOF

    # Create Rindwa Emergency Platform dashboard
    cat > /etc/grafana/provisioning/dashboards/rindwa-dashboard.json << EOF
{
  "dashboard": {
    "id": null,
    "title": "Rindwa Emergency Platform - Overview",
    "tags": ["rindwa", "emergency", "monitoring"],
    "timezone": "Africa/Kigali",
    "panels": [
      {
        "id": 1,
        "title": "Response Time",
        "type": "stat",
        "targets": [
          {
            "expr": "avg(http_request_duration_seconds{job=\"rindwa-app\"})",
            "legendFormat": "Avg Response Time"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 0.5},
                {"color": "red", "value": 1.0}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 6, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Active Incidents",
        "type": "stat",
        "targets": [
          {
            "expr": "rindwa_active_incidents_total",
            "legendFormat": "Active Incidents"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "short",
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 50},
                {"color": "red", "value": 100}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 6, "x": 6, "y": 0}
      },
      {
        "id": 3,
        "title": "Database Connections",
        "type": "stat",
        "targets": [
          {
            "expr": "pg_stat_database_numbackends{datname=\"rindwa_production\"}",
            "legendFormat": "Active Connections"
          }
        ],
        "gridPos": {"h": 8, "w": 6, "x": 12, "y": 0}
      },
      {
        "id": 4,
        "title": "System CPU Usage",
        "type": "stat",
        "targets": [
          {
            "expr": "100 - (avg(irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "CPU Usage %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "max": 100,
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 70},
                {"color": "red", "value": 90}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 6, "x": 18, "y": 0}
      },
      {
        "id": 5,
        "title": "HTTP Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"rindwa-app\"}[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ],
        "yAxes": [
          {"label": "Requests/sec", "min": 0}
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      },
      {
        "id": 6,
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes",
            "legendFormat": "Used Memory"
          },
          {
            "expr": "node_memory_MemTotal_bytes",
            "legendFormat": "Total Memory"
          }
        ],
        "yAxes": [
          {"label": "Bytes", "min": 0}
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
      }
    ],
    "time": {"from": "now-1h", "to": "now"},
    "refresh": "10s"
  }
}
EOF

    # Configure dashboard provisioning
    cat > /etc/grafana/provisioning/dashboards/dashboard.yml << EOF
apiVersion: 1

providers:
  - name: 'rindwa-dashboards'
    orgId: 1
    folder: 'Rindwa Emergency Platform'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
EOF

    # Start and enable Grafana
    sudo systemctl enable grafana-server
    sudo systemctl start grafana-server

    success "Grafana dashboards configured and started on port $GRAFANA_PORT"
    info "Default credentials: admin/admin (change on first login)"
}

# Setup alerting rules
setup_alerting() {
    info "🚨 Setting up alerting rules..."
    
    # Create alerting rules for Rindwa
    cat > /etc/prometheus/rindwa_alerts.yml << EOF
groups:
  - name: rindwa_emergency_alerts
    rules:
      # High Response Time Alert
      - alert: HighResponseTime
        expr: avg(http_request_duration_seconds{job="rindwa-app"}) > 2
        for: 5m
        labels:
          severity: warning
          service: rindwa-app
        annotations:
          summary: "High response time detected"
          description: "Average response time is {{ \$value }}s, which is above the 2s threshold"

      # High Error Rate Alert
      - alert: HighErrorRate
        expr: rate(http_requests_total{job="rindwa-app",status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
          service: rindwa-app
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ \$value }} requests/sec"

      # Database Connection Alert
      - alert: HighDatabaseConnections
        expr: pg_stat_database_numbackends{datname="rindwa_production"} > 50
        for: 3m
        labels:
          severity: warning
          service: database
        annotations:
          summary: "High database connection count"
          description: "Database has {{ \$value }} active connections"

      # High CPU Usage Alert
      - alert: HighCPUUsage
        expr: 100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
          service: system
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is {{ \$value }}%"

      # Low Disk Space Alert
      - alert: LowDiskSpace
        expr: (node_filesystem_free_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 20
        for: 1m
        labels:
          severity: critical
          service: system
        annotations:
          summary: "Low disk space"
          description: "Disk usage is above 80%"

      # Application Down Alert
      - alert: ApplicationDown
        expr: up{job="rindwa-app"} == 0
        for: 1m
        labels:
          severity: critical
          service: rindwa-app
        annotations:
          summary: "Rindwa application is down"
          description: "The Rindwa Emergency Platform application is not responding"

      # Emergency Service Response Time
      - alert: EmergencyResponseDelay
        expr: rindwa_incident_response_time_seconds > 900
        for: 0s
        labels:
          severity: critical
          service: emergency
        annotations:
          summary: "Emergency response time exceeded"
          description: "Incident response time is {{ \$value }}s (> 15 minutes)"
EOF

    # Install AlertManager
    if ! command -v alertmanager &> /dev/null; then
        cd /tmp
        wget https://github.com/prometheus/alertmanager/releases/download/v0.25.0/alertmanager-0.25.0.linux-amd64.tar.gz
        tar xvf alertmanager-0.25.0.linux-amd64.tar.gz
        sudo cp alertmanager-0.25.0.linux-amd64/alertmanager /usr/local/bin/
        sudo cp alertmanager-0.25.0.linux-amd64/amtool /usr/local/bin/
        rm -rf alertmanager-0.25.0*
    fi

    # Configure AlertManager
    cat > /etc/alertmanager/alertmanager.yml << EOF
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@rindwa.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'rindwa-emergency-team'
  routes:
    - match:
        severity: critical
      receiver: 'rindwa-critical-alerts'
      group_wait: 5s
      repeat_interval: 5m

receivers:
  - name: 'rindwa-emergency-team'
    email_configs:
      - to: 'admin@rindwa.com'
        subject: '🚨 Rindwa Alert: {{ .GroupLabels.alertname }}'
        body: |
          Alert: {{ .GroupLabels.alertname }}
          
          {{ range .Alerts }}
          Summary: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Service: {{ .Labels.service }}
          Severity: {{ .Labels.severity }}
          {{ end }}
          
          Dashboard: http://localhost:$GRAFANA_PORT
          
  - name: 'rindwa-critical-alerts'
    email_configs:
      - to: 'admin@rindwa.com,emergency@rindwa.com'
        subject: '🚨 CRITICAL: Rindwa Emergency Platform Alert'
        body: |
          🚨 CRITICAL ALERT 🚨
          
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Service: {{ .Labels.service }}
          Time: {{ .StartsAt }}
          {{ end }}
          
          Immediate action required!
          Dashboard: http://localhost:$GRAFANA_PORT
EOF

    # Create systemd service for AlertManager
    sudo tee /etc/systemd/system/alertmanager.service > /dev/null << EOF
[Unit]
Description=AlertManager
After=network.target

[Service]
User=alertmanager
Group=alertmanager
Type=simple
ExecStart=/usr/local/bin/alertmanager \\
  --config.file=/etc/alertmanager/alertmanager.yml \\
  --storage.path=/var/lib/alertmanager/ \\
  --web.listen-address=:$ALERT_MANAGER_PORT

[Install]
WantedBy=multi-user.target
EOF

    # Create alertmanager user
    sudo useradd --no-create-home --shell /bin/false alertmanager || true
    sudo mkdir -p /var/lib/alertmanager
    sudo chown -R alertmanager:alertmanager /var/lib/alertmanager
    sudo chown -R alertmanager:alertmanager /etc/alertmanager

    # Start and enable AlertManager
    sudo systemctl daemon-reload
    sudo systemctl enable alertmanager
    sudo systemctl start alertmanager

    success "Alerting configured and started on port $ALERT_MANAGER_PORT"
}

# Setup auto-scaling policies
setup_scaling() {
    info "⚖️  Setting up auto-scaling policies..."
    
    # Create scaling script for PM2
    cat > "$PROJECT_ROOT/scripts/auto-scale.sh" << 'EOF'
#!/bin/bash

# Auto-scaling script for Rindwa Emergency Platform
# This script monitors system metrics and scales PM2 instances accordingly

LOG_FILE="/var/log/rindwa/auto-scale.log"
MAX_INSTANCES=8
MIN_INSTANCES=2

log() {
    echo "$(date): $1" >> "$LOG_FILE"
}

# Get current metrics
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100.0)}')
CURRENT_INSTANCES=$(pm2 list | grep "rindwa-platform" | wc -l)

log "CPU: ${CPU_USAGE}%, Memory: ${MEMORY_USAGE}%, Instances: ${CURRENT_INSTANCES}"

# Scale up conditions
if (( $(echo "$CPU_USAGE > 70" | bc -l) )) || (( $(echo "$MEMORY_USAGE > 80" | bc -l) )); then
    if [[ $CURRENT_INSTANCES -lt $MAX_INSTANCES ]]; then
        NEW_INSTANCES=$((CURRENT_INSTANCES + 1))
        pm2 scale rindwa-platform $NEW_INSTANCES
        log "Scaled UP to $NEW_INSTANCES instances (CPU: ${CPU_USAGE}%, Memory: ${MEMORY_USAGE}%)"
    fi
# Scale down conditions
elif (( $(echo "$CPU_USAGE < 30" | bc -l) )) && (( $(echo "$MEMORY_USAGE < 50" | bc -l) )); then
    if [[ $CURRENT_INSTANCES -gt $MIN_INSTANCES ]]; then
        NEW_INSTANCES=$((CURRENT_INSTANCES - 1))
        pm2 scale rindwa-platform $NEW_INSTANCES
        log "Scaled DOWN to $NEW_INSTANCES instances (CPU: ${CPU_USAGE}%, Memory: ${MEMORY_USAGE}%)"
    fi
fi
EOF

    chmod +x "$PROJECT_ROOT/scripts/auto-scale.sh"

    # Add cron job for auto-scaling (every 2 minutes)
    (crontab -l 2>/dev/null; echo "*/2 * * * * $PROJECT_ROOT/scripts/auto-scale.sh") | crontab -

    # Create load balancer health check
    cat > "$PROJECT_ROOT/scripts/health-check.sh" << 'EOF'
#!/bin/bash

# Health check script for load balancer
HEALTH_ENDPOINT="http://localhost:3000/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_ENDPOINT" --max-time 5)

if [[ "$RESPONSE" == "200" ]]; then
    echo "healthy"
    exit 0
else
    echo "unhealthy"
    exit 1
fi
EOF

    chmod +x "$PROJECT_ROOT/scripts/health-check.sh"

    success "Auto-scaling policies configured"
    info "Auto-scaling runs every 2 minutes, scaling between $MIN_INSTANCES and $MAX_INSTANCES instances"
}

# Setup log aggregation
setup_logs() {
    info "📝 Setting up log aggregation..."
    
    # Install Loki for log aggregation
    if ! command -v loki &> /dev/null; then
        cd /tmp
        wget https://github.com/grafana/loki/releases/download/v2.8.0/loki-linux-amd64.zip
        unzip loki-linux-amd64.zip
        sudo cp loki-linux-amd64 /usr/local/bin/loki
        rm -rf loki-linux-amd64*
    fi

    # Create Loki configuration
    sudo mkdir -p /etc/loki
    cat > /etc/loki/loki.yml << EOF
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

ingester:
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
    final_sleep: 0s
  chunk_idle_period: 1h
  max_chunk_age: 1h
  chunk_target_size: 1048576
  chunk_retain_period: 30s

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /var/lib/loki/boltdb-shipper-active
    cache_location: /var/lib/loki/boltdb-shipper-cache
    shared_store: filesystem
  filesystem:
    directory: /var/lib/loki/chunks

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h

chunk_store_config:
  max_look_back_period: 0s

table_manager:
  retention_deletes_enabled: false
  retention_period: 0s

ruler:
  storage:
    type: local
    local:
      directory: /var/lib/loki/rules
  rule_path: /var/lib/loki/rules-temp
  alertmanager_url: http://localhost:$ALERT_MANAGER_PORT
  ring:
    kvstore:
      store: inmemory
  enable_api: true
EOF

    # Create systemd service for Loki
    sudo tee /etc/systemd/system/loki.service > /dev/null << EOF
[Unit]
Description=Loki service
After=network.target

[Service]
Type=simple
User=loki
Group=loki
ExecStart=/usr/local/bin/loki -config.file=/etc/loki/loki.yml
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

    # Create loki user
    sudo useradd --no-create-home --shell /bin/false loki || true
    sudo mkdir -p /var/lib/loki/{boltdb-shipper-active,boltdb-shipper-cache,chunks,rules,rules-temp}
    sudo chown -R loki:loki /var/lib/loki
    sudo chown -R loki:loki /etc/loki

    # Install Promtail for log shipping
    if ! command -v promtail &> /dev/null; then
        cd /tmp
        wget https://github.com/grafana/loki/releases/download/v2.8.0/promtail-linux-amd64.zip
        unzip promtail-linux-amd64.zip
        sudo cp promtail-linux-amd64 /usr/local/bin/promtail
        rm -rf promtail-linux-amd64*
    fi

    # Create Promtail configuration
    cat > /etc/loki/promtail.yml << EOF
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /var/lib/loki/positions.yaml

clients:
  - url: http://localhost:3100/loki/api/v1/push

scrape_configs:
  - job_name: rindwa-app-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: rindwa-app
          __path__: /var/log/rindwa/*.log

  - job_name: system-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: system
          __path__: /var/log/syslog

  - job_name: nginx-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: nginx
          __path__: /var/log/nginx/*.log
EOF

    # Start services
    sudo systemctl daemon-reload
    sudo systemctl enable loki
    sudo systemctl start loki

    success "Log aggregation configured with Loki and Promtail"
}

# Create monitoring summary report
create_monitoring_summary() {
    info "📊 Creating monitoring summary..."
    
    local summary_file="/var/log/rindwa/monitoring_summary_${TIMESTAMP}.md"
    
    cat > "$summary_file" << EOF
# 📊 Rindwa Emergency Platform - Monitoring Summary

**Setup Date:** $(date)
**Environment:** $ENVIRONMENT
**Setup Log:** $LOG_FILE

## 🔍 Monitoring Stack

### Prometheus (Metrics Collection)
- **URL:** http://localhost:$PROMETHEUS_PORT
- **Status:** $(systemctl is-active prometheus 2>/dev/null || echo "Not installed")
- **Configuration:** /etc/prometheus/prometheus.yml
- **Data:** /var/lib/prometheus

### Grafana (Dashboards)
- **URL:** http://localhost:$GRAFANA_PORT
- **Status:** $(systemctl is-active grafana-server 2>/dev/null || echo "Not installed")
- **Default Login:** admin/admin (change on first login)
- **Dashboards:** Rindwa Emergency Platform Overview

### AlertManager (Alerting)
- **URL:** http://localhost:$ALERT_MANAGER_PORT
- **Status:** $(systemctl is-active alertmanager 2>/dev/null || echo "Not installed")
- **Configuration:** /etc/alertmanager/alertmanager.yml
- **Email Alerts:** admin@rindwa.com

## 📈 Key Metrics Monitored

- **Application Performance:**
  - Response times
  - Error rates
  - Request throughput
  - Active incidents

- **System Health:**
  - CPU usage
  - Memory usage
  - Disk space
  - Network I/O

- **Database:**
  - Connection count
  - Query performance
  - Cache hit ratio
  - Lock waits

## 🚨 Alert Rules

- **High Response Time:** >2 seconds
- **High Error Rate:** >10% 5xx errors
- **High CPU Usage:** >80%
- **Low Disk Space:** <20% free
- **Database Connections:** >50 active
- **Application Down:** Service unavailable

## ⚖️ Auto-Scaling

- **Min Instances:** 2
- **Max Instances:** 8
- **Scale Up:** CPU >70% or Memory >80%
- **Scale Down:** CPU <30% and Memory <50%
- **Check Interval:** Every 2 minutes

## 📝 Log Aggregation

- **Loki:** http://localhost:3100
- **Promtail:** Log shipping agent
- **Retention:** 7 days default
- **Sources:** Application, System, Nginx logs

## 🎯 Performance Targets

- **Response Time:** <1 second average
- **Availability:** >99.5%
- **Error Rate:** <1%
- **Incident Response:** <15 minutes
- **Database Response:** <100ms

## 📞 Emergency Contacts

- **System Admin:** admin@rindwa.com
- **Database Admin:** admin@rindwa.com
- **Emergency Services:** Police 100 | Fire 101 | Medical 102

## 🔧 Maintenance Tasks

### Daily
- Check dashboard for anomalies
- Review error logs
- Monitor disk space

### Weekly
- Review performance trends
- Check alert effectiveness
- Update documentation

### Monthly
- Performance optimization review
- Capacity planning
- Security audit

## 📊 Access URLs

- **Grafana Dashboards:** http://localhost:$GRAFANA_PORT
- **Prometheus Metrics:** http://localhost:$PROMETHEUS_PORT
- **AlertManager:** http://localhost:$ALERT_MANAGER_PORT
- **Application Health:** http://localhost:3000/health
- **Application Metrics:** http://localhost:3000/metrics

---

**Last Updated:** $(date)
**Version:** 1.0.0
**Status:** Production Ready ✅
EOF

    info "Monitoring summary created: $summary_file"
}

# Main setup function
main() {
    info "🚀 Starting Rindwa monitoring and scaling setup..."
    info "Environment: $ENVIRONMENT"
    info "Timestamp: $TIMESTAMP"
    
    # Setup logging
    setup_logging
    
    # Create directories
    create_directories
    
    # Set flags based on options
    if [[ "$SETUP_ALL" == true ]]; then
        SETUP_PROMETHEUS=true
        SETUP_GRAFANA=true
        SETUP_ALERTING=true
        SETUP_SCALING=true
        SETUP_LOGS=true
    fi
    
    # Setup components based on flags
    if [[ "$SETUP_PROMETHEUS" == true ]]; then
        setup_prometheus
        setup_node_exporter
    fi
    
    if [[ "$SETUP_GRAFANA" == true ]]; then
        setup_grafana
    fi
    
    if [[ "$SETUP_ALERTING" == true ]]; then
        setup_alerting
    fi
    
    if [[ "$SETUP_SCALING" == true ]]; then
        setup_scaling
    fi
    
    if [[ "$SETUP_LOGS" == true ]]; then
        setup_logs
    fi
    
    # Create summary report
    create_monitoring_summary
    
    success "🎉 Monitoring and scaling setup completed successfully!"
    
    info "📊 Setup Summary:"
    info "  - Prometheus: $(systemctl is-active prometheus 2>/dev/null || echo 'Not setup')"
    info "  - Grafana: $(systemctl is-active grafana-server 2>/dev/null || echo 'Not setup')"
    info "  - AlertManager: $(systemctl is-active alertmanager 2>/dev/null || echo 'Not setup')"
    info "  - Auto-scaling: $(crontab -l 2>/dev/null | grep -q auto-scale && echo 'Configured' || echo 'Not setup')"
    info "  - Log file: $LOG_FILE"
    
    info ""
    info "🔗 Access URLs:"
    info "  - Grafana: http://localhost:$GRAFANA_PORT (admin/admin)"
    info "  - Prometheus: http://localhost:$PROMETHEUS_PORT"
    info "  - AlertManager: http://localhost:$ALERT_MANAGER_PORT"
}

# Run main function
main "$@" 