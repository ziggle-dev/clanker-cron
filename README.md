# @clanker/cron

Schedule Clanker commands to run at specific times or intervals. This tool provides a platform-agnostic cron-like scheduler that can execute any Clanker command with custom context at scheduled times.

## Installation

```bash
clanker install cron
```

## Features

- **Multiple scheduling frequencies**: once, hourly, daily, weekly, monthly
- **Platform agnostic**: Works on any system where Clanker is installed
- **Context support**: Pass custom environment variables to scheduled commands
- **Job management**: List, remove, and manually run scheduled jobs
- **Persistent storage**: Jobs are saved and persist between sessions

## Usage

### Schedule a Job

Schedule a command to run at specific intervals:

```bash
# One-time execution
clanker cron --action schedule --name "backup" --command "backup create" --frequency once --date 2024-12-25 --time 09:00

# Daily execution
clanker cron --action schedule --name "daily-report" --command "report generate" --frequency daily --time 14:30

# Weekly execution (every Monday at 9 AM)
clanker cron --action schedule --name "weekly-cleanup" --command "cleanup old-files" --frequency weekly --weekday monday --time 09:00

# Monthly execution (15th of each month at midnight)
clanker cron --action schedule --name "monthly-audit" --command "audit system" --frequency monthly --dayOfMonth 15 --time 00:00

# Hourly execution
clanker cron --action schedule --name "health-check" --command "health check" --frequency hourly
```

### Schedule with Context

Pass custom context/environment variables to your scheduled commands:

```bash
clanker cron --action schedule \
  --name "deploy-staging" \
  --command "deploy app" \
  --frequency daily \
  --time 03:00 \
  --context '{"environment": "staging", "region": "us-west-2"}'
```

The context will be available as environment variables prefixed with `CRON_`:
- `CRON_ENVIRONMENT=staging`
- `CRON_REGION=us-west-2`

### List Scheduled Jobs

View all scheduled jobs:

```bash
clanker cron --action list
```

Output:
```
┌─────────────┬──────────────────┬─────────────────────┬───────────┬─────────────────────┬─────────┐
│ ID          │ Name             │ Command             │ Frequency │ Next Run            │ Enabled │
├─────────────┼──────────────────┼─────────────────────┼───────────┼─────────────────────┼─────────┤
│ abc123      │ daily-report     │ report generate     │ daily     │ 2024-01-15 14:30:00 │ ✓       │
│ def456      │ weekly-cleanup   │ cleanup old-files   │ weekly    │ 2024-01-22 09:00:00 │ ✓       │
└─────────────┴──────────────────┴─────────────────────┴───────────┴─────────────────────┴─────────┘
```

### Run a Job Manually

Execute a scheduled job immediately:

```bash
clanker cron --action run --id abc123
```

### Remove a Job

Delete a scheduled job:

```bash
clanker cron --action remove --id abc123
```

### Clear All Jobs

Remove all scheduled jobs:

```bash
clanker cron --action clear
```

## Arguments

| Argument | Type | Description | Required |
|----------|------|-------------|----------|
| `action` | enum | Action to perform: `schedule`, `list`, `remove`, `run`, `clear` | Yes |
| `name` | string | Name of the scheduled job | For `schedule` |
| `command` | string | Clanker command to execute | For `schedule` |
| `frequency` | enum | How often to run: `once`, `hourly`, `daily`, `weekly`, `monthly` | For `schedule` |
| `time` | string | Time in HH:MM format (e.g., "14:30") | Depends on frequency |
| `date` | string | Date in YYYY-MM-DD format | For `once` frequency |
| `weekday` | enum | Day of week: `monday`, `tuesday`, etc. | For `weekly` frequency |
| `dayOfMonth` | number | Day of month (1-31) | For `monthly` frequency |
| `id` | string | Job ID | For `remove` and `run` |
| `context` | object | Custom context/environment variables | Optional |

## Examples

### Automated Backups

Schedule daily backups at 2 AM:

```bash
clanker cron --action schedule \
  --name "nightly-backup" \
  --command "backup create --type full" \
  --frequency daily \
  --time 02:00
```

### Development Environment Refresh

Refresh development database every Monday:

```bash
clanker cron --action schedule \
  --name "dev-db-refresh" \
  --command "db refresh --env development" \
  --frequency weekly \
  --weekday monday \
  --time 06:00 \
  --context '{"source": "production", "target": "development"}'
```

### Monitoring and Alerts

Run health checks every hour:

```bash
clanker cron --action schedule \
  --name "health-monitor" \
  --command "monitor health --notify slack" \
  --frequency hourly
```

### Scheduled Reports

Generate monthly reports on the 1st of each month:

```bash
clanker cron --action schedule \
  --name "monthly-metrics" \
  --command "report metrics --format pdf --email team@company.com" \
  --frequency monthly \
  --dayOfMonth 1 \
  --time 08:00
```

## Storage Location

Scheduled jobs are stored in `~/.clanker/cron/jobs.json`. This file persists between sessions and can be backed up or synced across machines.

## Important Notes

1. **Time Zone**: All times are in the system's local time zone
2. **Persistence**: Jobs are stored locally and persist between Clanker sessions
3. **Execution**: This tool requires a cron daemon or task scheduler to actually run the scheduled commands
4. **One-time Jobs**: Jobs with `once` frequency are automatically disabled after execution
5. **Context Variables**: Context is passed as environment variables prefixed with `CRON_`

## Integration with System Schedulers

To actually execute the scheduled jobs, you need to integrate with your system's scheduler:

### Linux/macOS (crontab)

Add this line to your crontab to check for due jobs every minute:

```bash
* * * * * /usr/local/bin/clanker-cron-runner
```

### Windows (Task Scheduler)

Create a task that runs `clanker-cron-runner.exe` every minute.

## Capabilities

This tool requires the following capabilities:
- `FileRead`: Read the jobs configuration
- `FileWrite`: Save scheduled jobs
- `SystemExecute`: Execute Clanker commands

## License

MIT