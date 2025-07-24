#!/bin/bash

# =================================================================
# 🏥 Rindwa Emergency Platform - Database Health Monitor
# =================================================================
# 
# This script monitors database health, performance, and integrity
# for the Rindwa Emergency Platform production database
# 
# Usage: ./scripts/database/monitor-health.sh [options]
# 
# Options:
#   --check-all         Run all health checks
#   --performance       Check database performance metrics
#   --integrity         Validate database schema integrity
#   --disk-usage        Monitor disk space usage
#   --connections       Monitor active connections
#   --slow-queries      Find slow queries
#   --alerts            Send alerts if issues found
#   --report            Generate detailed health report
#   --schedule CRON     Setup scheduled monitoring
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
LOG_FILE="/var/log/rindwa/db_health_${TIMESTAMP}.log"
ALERT_EMAIL="${ALERT_EMAIL:-admin@rindwa.com}"

# Health check thresholds
MAX_DISK_USAGE=80
MAX_CONNECTION_USAGE=70
SLOW_QUERY_THRESHOLD=5000
MAX_TABLE_BLOAT=20
MIN_CACHE_HIT_RATIO=95

# Default options
CHECK_ALL=false
CHECK_PERFORMANCE=false
CHECK_INTEGRITY=false
CHECK_DISK_USAGE=false
CHECK_CONNECTIONS=false
CHECK_SLOW_QUERIES=false
SEND_ALERTS=false
GENERATE_REPORT=false
SCHEDULE_MONITORING=""

# Database configuration
DB_HOST=""
DB_PORT=""
DB_NAME=""
DB_USER=""
DB_PASSWORD=""

# Health status tracking
HEALTH_ISSUES=()
HEALTH_WARNINGS=()
HEALTH_STATUS="HEALTHY"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --check-all)
            CHECK_ALL=true
            shift
            ;;
        --performance)
            CHECK_PERFORMANCE=true
            shift
            ;;
        --integrity)
            CHECK_INTEGRITY=true
            shift
            ;;
        --disk-usage)
            CHECK_DISK_USAGE=true
            shift
            ;;
        --connections)
            CHECK_CONNECTIONS=true
            shift
            ;;
        --slow-queries)
            CHECK_SLOW_QUERIES=true
            shift
            ;;
        --alerts)
            SEND_ALERTS=true
            shift
            ;;
        --report)
            GENERATE_REPORT=true
            shift
            ;;
        --schedule)
            SCHEDULE_MONITORING="$2"
            shift 2
            ;;
        --help)
            echo "Database Health Monitor for Rindwa Emergency Platform"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --check-all         Run all health checks"
            echo "  --performance       Check database performance metrics"
            echo "  --integrity         Validate database schema integrity"
            echo "  --disk-usage        Monitor disk space usage"
            echo "  --connections       Monitor active connections"
            echo "  --slow-queries      Find slow queries"
            echo "  --alerts            Send alerts if issues found"
            echo "  --report            Generate detailed health report"
            echo "  --schedule CRON     Setup scheduled monitoring"
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
error() {
    log "${RED}❌ ERROR: $1${NC}"
    HEALTH_ISSUES+=("ERROR: $1")
    HEALTH_STATUS="CRITICAL"
}

# Warning message
warning() {
    log "${YELLOW}⚠️  WARNING: $1${NC}"
    HEALTH_WARNINGS+=("WARNING: $1")
    if [[ "$HEALTH_STATUS" == "HEALTHY" ]]; then
        HEALTH_STATUS="WARNING"
    fi
}

# Success message
success() {
    log "${GREEN}✅ $1${NC}"
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
    info "Database health monitoring logged to: $LOG_FILE"
}

# Load environment configuration
load_environment() {
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        source "$PROJECT_ROOT/.env"
    else
        error "Environment file not found: $PROJECT_ROOT/.env"
        exit 1
    fi
    
    # Validate required environment variables
    if [[ -z "${DATABASE_URL:-}" ]]; then
        error "DATABASE_URL not found in environment"
        exit 1
    fi
}

# Parse database URL
parse_database_url() {
    if [[ $DATABASE_URL =~ ^postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/([^?]+)(\?.*)?$ ]]; then
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASSWORD="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="${BASH_REMATCH[4]}"
        DB_NAME="${BASH_REMATCH[5]}"
    else
        error "Invalid DATABASE_URL format"
        exit 1
    fi
}

# Check database connectivity
check_connectivity() {
    info "🔌 Checking database connectivity..."
    
    if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; then
        success "Database is accepting connections"
    else
        error "Cannot connect to database at $DB_HOST:$DB_PORT"
        return 1
    fi
    
    # Test actual query execution
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        success "Database query execution successful"
    else
        error "Cannot execute queries on database"
        return 1
    fi
}

# Check database performance metrics
check_performance() {
    info "⚡ Checking database performance metrics..."
    
    local cache_hit_ratio=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "
        SELECT ROUND(
            100 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read))::numeric, 2
        ) AS cache_hit_ratio
        FROM pg_stat_database 
        WHERE datname = '$DB_NAME';
    ")
    
    if (( $(echo "$cache_hit_ratio >= $MIN_CACHE_HIT_RATIO" | bc -l) )); then
        success "Cache hit ratio: ${cache_hit_ratio}% (>= ${MIN_CACHE_HIT_RATIO}%)"
    else
        warning "Low cache hit ratio: ${cache_hit_ratio}% (< ${MIN_CACHE_HIT_RATIO}%)"
    fi
    
    # Check transaction statistics
    local transaction_stats=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            numbackends as active_connections,
            xact_commit as committed_transactions,
            xact_rollback as rolled_back_transactions,
            CASE 
                WHEN (xact_commit + xact_rollback) = 0 THEN 0
                ELSE ROUND(100.0 * xact_rollback / (xact_commit + xact_rollback), 2)
            END as rollback_ratio
        FROM pg_stat_database 
        WHERE datname = '$DB_NAME';
    ")
    
    info "Transaction Statistics:"
    echo "$transaction_stats" | tail -n +3
    
    # Check for table bloat
    local bloated_tables=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            tablename,
            ROUND(100 * (pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) / 
                  NULLIF(pg_relation_size(schemaname||'.'||tablename), 0), 2) as bloat_ratio
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND pg_relation_size(schemaname||'.'||tablename) > 0
        ORDER BY bloat_ratio DESC
        LIMIT 5;
    ")
    
    info "Table Bloat Analysis (Top 5):"
    echo "$bloated_tables" | tail -n +3
}

# Check database schema integrity
check_integrity() {
    info "🔍 Checking database schema integrity..."
    
    # Check required tables exist
    local required_tables=("users" "organizations" "stations" "incidents" "invitations" "audit_logs" "notifications")
    local missing_tables=()
    
    for table in "${required_tables[@]}"; do
        local exists=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = '$table' AND table_schema = 'public'
            );
        ")
        
        if [[ "$exists" == "t" ]]; then
            success "Required table exists: $table"
        else
            missing_tables+=("$table")
            error "Required table missing: $table"
        fi
    done
    
    # Check for foreign key constraint violations
    local constraint_violations=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            conname as constraint_name,
            conrelid::regclass as table_name
        FROM pg_constraint 
        WHERE contype = 'f' 
        AND NOT EXISTS (
            SELECT 1 FROM pg_constraint c2 
            WHERE c2.oid = pg_constraint.oid 
            AND pg_constraint_check(c2)
        );
    ")
    
    if [[ -z "$(echo "$constraint_violations" | tail -n +3 | grep -v '^$')" ]]; then
        success "All foreign key constraints are valid"
    else
        warning "Foreign key constraint violations found:"
        echo "$constraint_violations" | tail -n +3
    fi
    
    # Check for orphaned records
    local orphaned_incidents=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "
        SELECT COUNT(*) 
        FROM incidents i 
        LEFT JOIN users u ON i.\"reportedById\" = u.id 
        WHERE u.id IS NULL;
    ")
    
    if [[ "$orphaned_incidents" -eq 0 ]]; then
        success "No orphaned incident records found"
    else
        warning "Found $orphaned_incidents orphaned incident records"
    fi
}

# Check disk usage
check_disk_usage() {
    info "💾 Checking disk usage..."
    
    # Database size
    local db_size=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "
        SELECT pg_size_pretty(pg_database_size('$DB_NAME'));
    ")
    
    info "Database size: $db_size"
    
    # Table sizes (top 10)
    local table_sizes=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
            pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY size_bytes DESC 
        LIMIT 10;
    ")
    
    info "Largest Tables:"
    echo "$table_sizes" | tail -n +3
    
    # Check disk space on data directory
    local disk_usage=$(df -h /var/lib/postgresql 2>/dev/null | tail -n 1 | awk '{print $5}' | sed 's/%//' || echo "0")
    
    if [[ "$disk_usage" -gt "$MAX_DISK_USAGE" ]]; then
        error "Disk usage is ${disk_usage}% (> ${MAX_DISK_USAGE}%)"
    else
        success "Disk usage is ${disk_usage}% (<= ${MAX_DISK_USAGE}%)"
    fi
}

# Check active connections
check_connections() {
    info "🔗 Checking database connections..."
    
    local connection_stats=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            count(*) as active_connections,
            count(*) filter (where state = 'active') as active_queries,
            count(*) filter (where state = 'idle') as idle_connections,
            count(*) filter (where state = 'idle in transaction') as idle_in_transaction
        FROM pg_stat_activity 
        WHERE datname = '$DB_NAME';
    ")
    
    info "Connection Statistics:"
    echo "$connection_stats" | tail -n +3
    
    local active_connections=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "
        SELECT count(*) FROM pg_stat_activity WHERE datname = '$DB_NAME';
    ")
    
    local max_connections=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "
        SHOW max_connections;
    ")
    
    local connection_usage=$(( 100 * active_connections / max_connections ))
    
    if [[ "$connection_usage" -gt "$MAX_CONNECTION_USAGE" ]]; then
        warning "High connection usage: ${connection_usage}% (${active_connections}/${max_connections})"
    else
        success "Connection usage: ${connection_usage}% (${active_connections}/${max_connections})"
    fi
    
    # Check for long-running transactions
    local long_transactions=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            pid,
            now() - xact_start as duration,
            query
        FROM pg_stat_activity 
        WHERE xact_start IS NOT NULL 
        AND now() - xact_start > interval '10 minutes'
        AND datname = '$DB_NAME';
    ")
    
    if [[ -z "$(echo "$long_transactions" | tail -n +3 | grep -v '^$')" ]]; then
        success "No long-running transactions found"
    else
        warning "Long-running transactions detected:"
        echo "$long_transactions" | tail -n +3
    fi
}

# Check for slow queries
check_slow_queries() {
    info "🐌 Checking for slow queries..."
    
    # Enable pg_stat_statements if available
    local slow_queries=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            query,
            calls,
            ROUND(mean_exec_time::numeric, 2) as avg_time_ms,
            ROUND(total_exec_time::numeric, 2) as total_time_ms
        FROM pg_stat_statements 
        WHERE mean_exec_time > $SLOW_QUERY_THRESHOLD
        ORDER BY mean_exec_time DESC 
        LIMIT 10;
    " 2>/dev/null || echo "pg_stat_statements extension not available")
    
    if [[ "$slow_queries" == "pg_stat_statements extension not available" ]]; then
        warning "pg_stat_statements extension not available for slow query analysis"
    else
        info "Slow Queries (> ${SLOW_QUERY_THRESHOLD}ms):"
        echo "$slow_queries" | tail -n +3
        
        local slow_query_count=$(echo "$slow_queries" | tail -n +3 | grep -v '^$' | wc -l)
        if [[ "$slow_query_count" -gt 0 ]]; then
            warning "Found $slow_query_count slow queries"
        else
            success "No slow queries detected"
        fi
    fi
    
    # Check for currently running slow queries
    local current_slow=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            pid,
            now() - query_start as duration,
            state,
            substring(query, 1, 100) as query_snippet
        FROM pg_stat_activity 
        WHERE query_start IS NOT NULL 
        AND now() - query_start > interval '30 seconds'
        AND state = 'active'
        AND datname = '$DB_NAME';
    ")
    
    if [[ -z "$(echo "$current_slow" | tail -n +3 | grep -v '^$')" ]]; then
        success "No currently running slow queries"
    else
        warning "Currently running slow queries:"
        echo "$current_slow" | tail -n +3
    fi
}

# Generate health report
generate_health_report() {
    info "📊 Generating comprehensive health report..."
    
    local report_file="/var/log/rindwa/db_health_report_${TIMESTAMP}.html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Rindwa Database Health Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
        .section { margin: 20px 0; padding: 15px; border-left: 4px solid #dc2626; }
        .healthy { border-left-color: #10b981; }
        .warning { border-left-color: #f59e0b; }
        .critical { border-left-color: #ef4444; }
        .metric { display: flex; justify-content: space-between; margin: 10px 0; }
        .status { padding: 5px 10px; border-radius: 3px; color: white; }
        .status.healthy { background: #10b981; }
        .status.warning { background: #f59e0b; }
        .status.critical { background: #ef4444; }
        pre { background: #f3f4f6; padding: 10px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏥 Rindwa Database Health Report</h1>
        <p>Generated: $(date)</p>
        <p>Database: $DB_NAME @ $DB_HOST:$DB_PORT</p>
        <span class="status ${HEALTH_STATUS,,}">Status: $HEALTH_STATUS</span>
    </div>

    <div class="section">
        <h2>📊 Executive Summary</h2>
        <div class="metric">
            <span>Overall Status:</span>
            <span class="status ${HEALTH_STATUS,,}">$HEALTH_STATUS</span>
        </div>
        <div class="metric">
            <span>Critical Issues:</span>
            <span>${#HEALTH_ISSUES[@]}</span>
        </div>
        <div class="metric">
            <span>Warnings:</span>
            <span>${#HEALTH_WARNINGS[@]}</span>
        </div>
        <div class="metric">
            <span>Report Time:</span>
            <span>$(date)</span>
        </div>
    </div>

    <div class="section">
        <h2>⚠️ Issues and Warnings</h2>
EOF

    if [[ ${#HEALTH_ISSUES[@]} -gt 0 ]]; then
        echo "<h3>Critical Issues:</h3><ul>" >> "$report_file"
        for issue in "${HEALTH_ISSUES[@]}"; do
            echo "<li style='color: #ef4444;'>$issue</li>" >> "$report_file"
        done
        echo "</ul>" >> "$report_file"
    fi

    if [[ ${#HEALTH_WARNINGS[@]} -gt 0 ]]; then
        echo "<h3>Warnings:</h3><ul>" >> "$report_file"
        for warning in "${HEALTH_WARNINGS[@]}"; do
            echo "<li style='color: #f59e0b;'>$warning</li>" >> "$report_file"
        done
        echo "</ul>" >> "$report_file"
    fi

    if [[ ${#HEALTH_ISSUES[@]} -eq 0 && ${#HEALTH_WARNINGS[@]} -eq 0 ]]; then
        echo "<p style='color: #10b981;'>✅ No issues or warnings detected</p>" >> "$report_file"
    fi

    cat >> "$report_file" << EOF
    </div>

    <div class="section">
        <h2>📈 Performance Metrics</h2>
        <pre>$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
            SELECT 
                'Cache Hit Ratio' as metric,
                ROUND(100 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read))::numeric, 2) || '%' as value
            FROM pg_stat_database WHERE datname = '$DB_NAME'
            UNION ALL
            SELECT 'Active Connections', count(*)::text FROM pg_stat_activity WHERE datname = '$DB_NAME'
            UNION ALL
            SELECT 'Database Size', pg_size_pretty(pg_database_size('$DB_NAME'));
        " | tail -n +3)</pre>
    </div>

    <div class="section">
        <h2>📝 Recommendations</h2>
        <ul>
            <li>Monitor slow queries and optimize as needed</li>
            <li>Schedule regular VACUUM and ANALYZE operations</li>
            <li>Consider connection pooling if connection usage is high</li>
            <li>Set up automated backups and test restore procedures</li>
            <li>Monitor disk space and plan for growth</li>
        </ul>
    </div>

    <div class="section">
        <h2>📞 Emergency Contacts</h2>
        <ul>
            <li>Database Admin: $ALERT_EMAIL</li>
            <li>System Admin: admin@rindwa.com</li>
            <li>Emergency Services: Police 100 | Fire 101 | Medical 102</li>
        </ul>
    </div>
</body>
</html>
EOF

    info "Health report generated: $report_file"
}

# Send alerts if issues found
send_alerts() {
    if [[ ${#HEALTH_ISSUES[@]} -eq 0 && ${#HEALTH_WARNINGS[@]} -eq 0 ]]; then
        return
    fi
    
    info "📧 Sending health alerts..."
    
    local subject="🚨 Rindwa Database Health Alert - $HEALTH_STATUS"
    local body="Database health check completed with issues:\n\n"
    
    if [[ ${#HEALTH_ISSUES[@]} -gt 0 ]]; then
        body+="CRITICAL ISSUES:\n"
        for issue in "${HEALTH_ISSUES[@]}"; do
            body+="- $issue\n"
        done
        body+="\n"
    fi
    
    if [[ ${#HEALTH_WARNINGS[@]} -gt 0 ]]; then
        body+="WARNINGS:\n"
        for warning in "${HEALTH_WARNINGS[@]}"; do
            body+="- $warning\n"
        done
        body+="\n"
    fi
    
    body+="Database: $DB_NAME @ $DB_HOST:$DB_PORT\n"
    body+="Time: $(date)\n"
    body+="Log: $LOG_FILE\n"
    
    # Send email alert (requires mail command)
    if command -v mail >/dev/null 2>&1; then
        echo -e "$body" | mail -s "$subject" "$ALERT_EMAIL"
        success "Alert sent to $ALERT_EMAIL"
    else
        warning "Mail command not available, cannot send email alerts"
        info "Alert would have been sent with subject: $subject"
    fi
}

# Setup scheduled monitoring
setup_scheduled_monitoring() {
    if [[ -z "$SCHEDULE_MONITORING" ]]; then
        return
    fi
    
    info "📅 Setting up scheduled monitoring..."
    
    local script_path=$(realpath "$0")
    local cron_entry="$SCHEDULE_MONITORING $script_path --check-all --alerts --report >> /var/log/rindwa/db_monitor_cron.log 2>&1"
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "$cron_entry") | crontab -
    
    success "Scheduled monitoring configured: $SCHEDULE_MONITORING"
    info "Logs will be written to: /var/log/rindwa/db_monitor_cron.log"
}

# Main monitoring function
main() {
    info "🚀 Starting Rindwa database health monitoring..."
    info "Timestamp: $TIMESTAMP"
    
    # Setup logging
    setup_logging
    
    # Load environment and parse database URL
    load_environment
    parse_database_url
    
    # Always check connectivity first
    if ! check_connectivity; then
        error "Database connectivity check failed"
        if [[ "$SEND_ALERTS" == true ]]; then
            send_alerts
        fi
        exit 1
    fi
    
    # Set check flags based on options
    if [[ "$CHECK_ALL" == true ]]; then
        CHECK_PERFORMANCE=true
        CHECK_INTEGRITY=true
        CHECK_DISK_USAGE=true
        CHECK_CONNECTIONS=true
        CHECK_SLOW_QUERIES=true
        GENERATE_REPORT=true
    fi
    
    # Run selected health checks
    if [[ "$CHECK_PERFORMANCE" == true ]]; then
        check_performance
    fi
    
    if [[ "$CHECK_INTEGRITY" == true ]]; then
        check_integrity
    fi
    
    if [[ "$CHECK_DISK_USAGE" == true ]]; then
        check_disk_usage
    fi
    
    if [[ "$CHECK_CONNECTIONS" == true ]]; then
        check_connections
    fi
    
    if [[ "$CHECK_SLOW_QUERIES" == true ]]; then
        check_slow_queries
    fi
    
    # Generate report if requested
    if [[ "$GENERATE_REPORT" == true ]]; then
        generate_health_report
    fi
    
    # Send alerts if issues found
    if [[ "$SEND_ALERTS" == true ]]; then
        send_alerts
    fi
    
    # Setup scheduled monitoring
    setup_scheduled_monitoring
    
    # Final status
    case "$HEALTH_STATUS" in
        "HEALTHY")
            success "🎉 Database health check completed - Status: HEALTHY"
            ;;
        "WARNING")
            warning "⚠️ Database health check completed - Status: WARNING"
            ;;
        "CRITICAL")
            error "🚨 Database health check completed - Status: CRITICAL"
            ;;
    esac
    
    info "📊 Health Summary:"
    info "  - Database: $DB_NAME"
    info "  - Status: $HEALTH_STATUS"
    info "  - Issues: ${#HEALTH_ISSUES[@]}"
    info "  - Warnings: ${#HEALTH_WARNINGS[@]}"
    info "  - Log file: $LOG_FILE"
}

# Run main function
main "$@" 