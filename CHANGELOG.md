# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-30

### Added
- Initial release of the Clanker Cron tool
- Support for scheduling commands with multiple frequencies: once, hourly, daily, weekly, monthly
- Job management capabilities: list, remove, run, and clear scheduled jobs
- Context support for passing custom environment variables to scheduled commands
- Persistent storage of scheduled jobs in `~/.clanker/cron/jobs.json`
- Platform-agnostic design that works on any system where Clanker is installed
- Comprehensive validation for scheduling parameters
- Automatic calculation of next run times based on frequency and parameters
- Support for time-based scheduling with HH:MM format
- Support for date-based scheduling with YYYY-MM-DD format
- Support for weekday-based scheduling for weekly jobs
- Support for day-of-month scheduling for monthly jobs
- Automatic disabling of one-time jobs after execution
- Clear table-based output for listing scheduled jobs