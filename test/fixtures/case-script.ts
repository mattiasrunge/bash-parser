export default {
  sourceCode: `#!/bin/bash

# A simple script to demonstrate the use of the case statement

echo "Enter a command (start, stop, status, restart):"
read command

case $command in
  start)
    echo "Starting the service..."
    # Add commands to start the service here
    ;;
  stop)
    echo "Stopping the service..."
    # Add commands to stop the service here
    ;;
  status)
    echo "Checking the status of the service..."
    # Add commands to check the status of the service here
    ;;
  restart)
    echo "Restarting the service..."
    # Add commands to restart the service here
    ;;
  *)
    echo "Invalid command. Please use start, stop, status, or restart."
    ;;
esac`,
  result: {
    type: 'Script',
    commands: [
      {
        type: 'Command',
        name: {
          text: 'echo',
          type: 'Word',
        },
        suffix: [
          {
            text: 'Enter a command (start, stop, status, restart):',
            type: 'Word',
          },
        ],
      },
      {
        type: 'Command',
        name: {
          text: 'read',
          type: 'Word',
        },
        suffix: [
          {
            text: 'command',
            type: 'Word',
          },
        ],
      },
      {
        type: 'Case',
        clause: {
          text: '$command',
          expansion: [
            {
              loc: {
                start: 0,
                end: 7,
              },
              parameter: 'command',
              type: 'ParameterExpansion',
            },
          ],
          type: 'Word',
        },
        cases: [
          {
            type: 'CaseItem',
            pattern: [
              {
                text: 'start',
                type: 'Word',
              },
            ],
            body: {
              type: 'CompoundList',
              commands: [
                {
                  type: 'Command',
                  name: {
                    text: 'echo',
                    type: 'Word',
                  },
                  suffix: [
                    {
                      text: 'Starting the service...',
                      type: 'Word',
                    },
                  ],
                },
              ],
            },
          },
          {
            type: 'CaseItem',
            pattern: [
              {
                text: 'stop',
                type: 'Word',
              },
            ],
            body: {
              type: 'CompoundList',
              commands: [
                {
                  type: 'Command',
                  name: {
                    text: 'echo',
                    type: 'Word',
                  },
                  suffix: [
                    {
                      text: 'Stopping the service...',
                      type: 'Word',
                    },
                  ],
                },
              ],
            },
          },
          {
            type: 'CaseItem',
            pattern: [
              {
                text: 'status',
                type: 'Word',
              },
            ],
            body: {
              type: 'CompoundList',
              commands: [
                {
                  type: 'Command',
                  name: {
                    text: 'echo',
                    type: 'Word',
                  },
                  suffix: [
                    {
                      text: 'Checking the status of the service...',
                      type: 'Word',
                    },
                  ],
                },
              ],
            },
          },
          {
            type: 'CaseItem',
            pattern: [
              {
                text: 'restart',
                type: 'Word',
              },
            ],
            body: {
              type: 'CompoundList',
              commands: [
                {
                  type: 'Command',
                  name: {
                    text: 'echo',
                    type: 'Word',
                  },
                  suffix: [
                    {
                      text: 'Restarting the service...',
                      type: 'Word',
                    },
                  ],
                },
              ],
            },
          },
          {
            type: 'CaseItem',
            pattern: [
              {
                text: '*',
                type: 'Word',
                expansion: [
                  {
                    type: 'PathExpansion',
                    pattern: '*',
                    resolved: false,
                    loc: { start: 0, end: 1 },
                  },
                ],
              },
            ],
            body: {
              type: 'CompoundList',
              commands: [
                {
                  type: 'Command',
                  name: {
                    text: 'echo',
                    type: 'Word',
                  },
                  suffix: [
                    {
                      text: 'Invalid command. Please use start, stop, status, or restart.',
                      type: 'Word',
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
  },
};
