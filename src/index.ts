import { createTool } from '@clanker/core';
import { z } from 'zod';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { spawn } from 'child_process';

const ActionSchema = z.enum(['schedule', 'list', 'remove', 'run', 'clear']);

const FrequencySchema = z.enum(['once', 'hourly', 'daily', 'weekly', 'monthly']);

interface CronJob {
  id: string;
  name: string;
  command: string;
  frequency: string;
  time?: string;
  date?: string;
  weekday?: string;
  dayOfMonth?: string;
  context?: Record<string, any>;
  createdAt: string;
  lastRun?: string;
  nextRun: string;
  enabled: boolean;
}

const ScheduleArgsSchema = z.object({
  action: ActionSchema,
  name: z.string().optional(),
  command: z.string().optional(),
  frequency: FrequencySchema.optional(),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  weekday: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  id: z.string().optional(),
  context: z.record(z.any()).optional(),
});

type ScheduleArgs = z.infer<typeof ScheduleArgsSchema>;

export default createTool({
  name: 'cron',
  description: 'Schedule Clanker commands to run at specific times or intervals',
  version: '1.0.0',
  author: 'Clanker',
  category: 'System',
  capabilities: ['FileRead', 'FileWrite', 'SystemExecute'],
  args: ScheduleArgsSchema,
  run: async ({ args, print }) => {
    const configDir = join(homedir(), '.clanker', 'cron');
    const configFile = join(configDir, 'jobs.json');

    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }

    let jobs: CronJob[] = [];
    if (existsSync(configFile)) {
      try {
        const data = readFileSync(configFile, 'utf-8');
        jobs = JSON.parse(data);
      } catch (error) {
        print.error('Failed to read cron jobs file');
      }
    }

    const saveJobs = () => {
      writeFileSync(configFile, JSON.stringify(jobs, null, 2));
    };

    const calculateNextRun = (frequency: string, time?: string, date?: string, weekday?: string, dayOfMonth?: number): string => {
      const now = new Date();
      let next = new Date(now);

      switch (frequency) {
        case 'once':
          if (date && time) {
            const [hours, minutes] = time.split(':').map(Number);
            next = new Date(`${date}T${time}:00`);
          }
          break;

        case 'hourly':
          next.setHours(next.getHours() + 1);
          next.setMinutes(0);
          next.setSeconds(0);
          break;

        case 'daily':
          if (time) {
            const [hours, minutes] = time.split(':').map(Number);
            next.setHours(hours, minutes, 0, 0);
            if (next <= now) {
              next.setDate(next.getDate() + 1);
            }
          }
          break;

        case 'weekly':
          if (weekday && time) {
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const targetDay = days.indexOf(weekday);
            const currentDay = next.getDay();
            let daysUntilTarget = targetDay - currentDay;
            
            if (daysUntilTarget < 0) {
              daysUntilTarget += 7;
            } else if (daysUntilTarget === 0 && time) {
              const [hours, minutes] = time.split(':').map(Number);
              const targetTime = new Date(next);
              targetTime.setHours(hours, minutes, 0, 0);
              if (targetTime <= now) {
                daysUntilTarget = 7;
              }
            }
            
            next.setDate(next.getDate() + daysUntilTarget);
            if (time) {
              const [hours, minutes] = time.split(':').map(Number);
              next.setHours(hours, minutes, 0, 0);
            }
          }
          break;

        case 'monthly':
          if (dayOfMonth && time) {
            const [hours, minutes] = time.split(':').map(Number);
            next.setDate(dayOfMonth);
            next.setHours(hours, minutes, 0, 0);
            if (next <= now) {
              next.setMonth(next.getMonth() + 1);
            }
          }
          break;
      }

      return next.toISOString();
    };

    switch (args.action) {
      case 'schedule':
        if (!args.name || !args.command || !args.frequency) {
          print.error('Name, command, and frequency are required for scheduling');
          return;
        }

        if (args.frequency === 'once' && (!args.date || !args.time)) {
          print.error('Date and time are required for one-time scheduling');
          return;
        }

        if (args.frequency === 'daily' && !args.time) {
          print.error('Time is required for daily scheduling');
          return;
        }

        if (args.frequency === 'weekly' && (!args.weekday || !args.time)) {
          print.error('Weekday and time are required for weekly scheduling');
          return;
        }

        if (args.frequency === 'monthly' && (!args.dayOfMonth || !args.time)) {
          print.error('Day of month and time are required for monthly scheduling');
          return;
        }

        const newJob: CronJob = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2),
          name: args.name,
          command: args.command,
          frequency: args.frequency,
          time: args.time,
          date: args.date,
          weekday: args.weekday,
          dayOfMonth: args.dayOfMonth,
          context: args.context,
          createdAt: new Date().toISOString(),
          nextRun: calculateNextRun(args.frequency, args.time, args.date, args.weekday, args.dayOfMonth),
          enabled: true,
        };

        jobs.push(newJob);
        saveJobs();

        print.success(`Scheduled job "${newJob.name}" (ID: ${newJob.id})`);
        print.info(`Next run: ${new Date(newJob.nextRun).toLocaleString()}`);
        break;

      case 'list':
        if (jobs.length === 0) {
          print.info('No scheduled jobs found');
          return;
        }

        print.table(
          ['ID', 'Name', 'Command', 'Frequency', 'Next Run', 'Enabled'],
          jobs.map(job => [
            job.id,
            job.name,
            job.command.length > 30 ? job.command.substring(0, 27) + '...' : job.command,
            job.frequency,
            new Date(job.nextRun).toLocaleString(),
            job.enabled ? '✓' : '✗',
          ])
        );
        break;

      case 'remove':
        if (!args.id) {
          print.error('Job ID is required for removal');
          return;
        }

        const jobIndex = jobs.findIndex(job => job.id === args.id);
        if (jobIndex === -1) {
          print.error(`Job with ID "${args.id}" not found`);
          return;
        }

        const removedJob = jobs.splice(jobIndex, 1)[0];
        saveJobs();
        print.success(`Removed job "${removedJob.name}" (ID: ${removedJob.id})`);
        break;

      case 'run':
        if (!args.id) {
          print.error('Job ID is required to run');
          return;
        }

        const jobToRun = jobs.find(job => job.id === args.id);
        if (!jobToRun) {
          print.error(`Job with ID "${args.id}" not found`);
          return;
        }

        print.info(`Running job "${jobToRun.name}"...`);
        
        const env = { ...process.env };
        if (jobToRun.context) {
          Object.entries(jobToRun.context).forEach(([key, value]) => {
            env[`CRON_${key.toUpperCase()}`] = String(value);
          });
        }

        const child = spawn('clanker', jobToRun.command.split(' '), {
          stdio: 'inherit',
          env,
        });

        child.on('close', (code) => {
          if (code === 0) {
            print.success(`Job "${jobToRun.name}" completed successfully`);
            jobToRun.lastRun = new Date().toISOString();
            
            if (jobToRun.frequency !== 'once') {
              jobToRun.nextRun = calculateNextRun(
                jobToRun.frequency,
                jobToRun.time,
                jobToRun.date,
                jobToRun.weekday,
                jobToRun.dayOfMonth
              );
            } else {
              jobToRun.enabled = false;
            }
            
            saveJobs();
          } else {
            print.error(`Job "${jobToRun.name}" failed with code ${code}`);
          }
        });
        break;

      case 'clear':
        jobs = [];
        saveJobs();
        print.success('All scheduled jobs have been cleared');
        break;
    }
  },
});