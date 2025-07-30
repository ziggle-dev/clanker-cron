/**
 * Schedule tool - Schedule Clanker commands to run after a delay
 */

import { createTool, ToolCategory, ToolCapability } from '@ziggler/clanker';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Schedule tool - Schedules commands to run after a specified delay
 */
export default createTool()
    .id('schedule')
    .name('Schedule Task')
    .description('Schedule a Clanker command to run after a delay. USE THIS instead of bash/sleep/at/cron commands for scheduling tasks, reminders, or delayed execution.')
    .category(ToolCategory.System)
    .capabilities(ToolCapability.SystemExecute)
    .tags('schedule', 'delay', 'timer', 'reminder', 'cron', 'later', 'postpone', 'defer')

    // Arguments
    .stringArg('task', 'The Clanker command to execute (e.g., "Use elevenlabs-tts to say Hello")', { required: true })
    .stringArg('when', 'When to execute: "10 seconds", "5 minutes", "2 hours", "3:30pm", etc.', { required: true })

    // Examples
    .examples([
        {
            description: 'Remind me in 5 minutes to take a break',
            arguments: {
                task: 'Use elevenlabs-tts to say "Time to take a break!" with voice Rachel',
                when: '5 minutes'
            },
            result: 'Task scheduled for 5 minutes from now'
        },
        {
            description: 'Schedule a reminder for 30 seconds',
            arguments: {
                task: 'Use elevenlabs-tts to say "Your reminder is here" with voice Clyde',
                when: '30 seconds'
            },
            result: 'Task scheduled for 30 seconds from now'
        },
        {
            description: 'Set an alarm for 3:30pm',
            arguments: {
                task: 'Use elevenlabs-tts to say "It is now 3:30 PM" with voice Rachel',
                when: '3:30pm'
            },
            result: 'Task scheduled for 3:30 PM'
        },
        {
            description: 'Remind me to use the bathroom in 10 seconds',
            arguments: {
                task: 'Use elevenlabs-tts to say "Time to use the bathroom" with voice Rachel',
                when: '10 seconds'
            },
            result: 'Task scheduled for 10 seconds from now'
        }
    ])

    // Execute function
    .execute(async (args: any, context: any) => {
        const print = {
            success: (msg: string) => console.log(`✅ ${msg}`),
            info: (msg: string) => console.log(`ℹ️  ${msg}`),
            error: (msg: string) => console.error(`❌ ${msg}`)
        };
        // Parse the "when" parameter to determine delay
        const now = new Date();
        let delayMs: number;
        
        const whenLower = args.when.toLowerCase();
        
        if (whenLower.includes('second')) {
            const seconds = parseInt(whenLower.match(/(\d+)\s*second/)?.[1] || '1');
            delayMs = seconds * 1000;
        } else if (whenLower.includes('minute')) {
            const minutes = parseInt(whenLower.match(/(\d+)\s*minute/)?.[1] || '1');
            delayMs = minutes * 60 * 1000;
        } else if (whenLower.includes('hour')) {
            const hours = parseInt(whenLower.match(/(\d+)\s*hour/)?.[1] || '1');
            delayMs = hours * 60 * 60 * 1000;
        } else if (whenLower === 'now') {
            delayMs = 0;
        } else {
            // Try to parse as a specific time
            const timeMatch = whenLower.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/);
            if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = parseInt(timeMatch[2]);
                const ampm = timeMatch[3];
                
                if (ampm === 'pm' && hours < 12) hours += 12;
                if (ampm === 'am' && hours === 12) hours = 0;
                
                const targetTime = new Date(now);
                targetTime.setHours(hours, minutes, 0, 0);
                
                // If the time is in the past, assume tomorrow
                if (targetTime <= now) {
                    targetTime.setDate(targetTime.getDate() + 1);
                }
                
                delayMs = targetTime.getTime() - now.getTime();
            } else {
                throw new Error(`Cannot parse time: ${args.when}`);
            }
        }

        const executionTime = new Date(now.getTime() + delayMs);
        print.success(`Task scheduled for: ${executionTime.toLocaleString()}`);
        print.info(`Will execute in ${Math.round(delayMs / 1000)} seconds`);
        
        // Create a detached process that will wait and then execute
        const scriptContent = `
const { spawn } = require('child_process');
const os = require('os');

// Wait for the specified time
setTimeout(() => {
  console.log('Executing scheduled task...');
  
  // Set up environment for proper audio handling
  const env = { ...process.env };
  
  // Spawn clanker with the task
  const clanker = spawn('clanker', ['-p', ${JSON.stringify(args.task)}], {
    stdio: 'inherit',
    env: env,
    cwd: process.cwd()
  });
  
  clanker.on('error', (err) => {
    console.error('Failed to execute clanker:', err);
    process.exit(1);
  });
  
  clanker.on('close', (code) => {
    console.log('Task completed with code:', code);
    process.exit(code || 0);
  });
}, ${delayMs});

console.log('Scheduler running in background...');
console.log('Scheduled for: ${executionTime.toISOString()}');
`;

        // Write to a temporary file and execute it in the background
        const scriptPath = path.join(os.tmpdir(), `clanker_schedule_${Date.now()}.js`);
        
        fs.writeFileSync(scriptPath, scriptContent);
        
        // Spawn the script in the background
        const child = spawn('node', [scriptPath], {
            detached: true,
            stdio: ['ignore', 'ignore', 'ignore']
        });
        
        // Allow the parent process to exit while child continues
        child.unref();
        
        print.success(`Background scheduler started (PID: ${child.pid})`);
        print.info(`\nThe task will execute at ${executionTime.toLocaleTimeString()}`);
        print.info(`You can close this terminal - the task will still run.`);
        
        // Clean up script file after a delay
        setTimeout(() => {
            try {
                fs.unlinkSync(scriptPath);
            } catch (e) {
                // Ignore cleanup errors
            }
        }, 5000);

        return {
            success: true,
            output: `Task scheduled successfully! It will run at ${executionTime.toLocaleTimeString()}`,
            data: {
                scheduled: true,
                executionTime: executionTime.toISOString(),
                pid: child.pid
            }
        };
    })
    .build();