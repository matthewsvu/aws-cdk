import '@aws-cdk/assert-internal/jest';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import { Stack } from '@aws-cdk/core';
import { EmrContainersDeleteVirtualCluster } from '../../lib/emrcontainers/delete-virtual-cluster';

let stack: Stack;
let virtualClusterId: string;

/**
 * To do for testing
 * 1. Needs to test for default case i.e just an Id provided - completed
 * 2. Needs to test ALL supported integration patterns and throw errors when needed - completed
 * 3. Need to finish testing for all policy statements - completed
 * 4. Need to test for sfn task input payloads '$.id' - completed
 */

beforeEach(() => {
  stack = new Stack();
  virtualClusterId = 'x01f27i9a7cv1td52keaktr6j';
});

test('Invoke EMR Containers DeleteVirtualCluster with valid cluster ID', () => {
  // WHEN
  const task = new EmrContainersDeleteVirtualCluster(stack, 'Task', {
    virtualClusterId: sfn.TaskInput.fromText(virtualClusterId),
    integrationPattern: sfn.IntegrationPattern.REQUEST_RESPONSE,
  });

  // THEN
  expect(stack.resolve(task.toStateJson())).toEqual({
    Type: 'Task',
    Resource: {
      'Fn::Join': [
        '',
        [
          'arn:',
          {
            Ref: 'AWS::Partition',
          },
          ':states:::emr-containers:deleteVirtualCluster',
        ],
      ],
    },
    End: true,
    Parameters: {
      Id: virtualClusterId,
    },
  });
});

test('Invoke EMR Containers DeleteVirtualCluster with a RUN_JOB call', () => {
  // WHEN
  const task = new EmrContainersDeleteVirtualCluster(stack, 'Task', {
    virtualClusterId: sfn.TaskInput.fromText(virtualClusterId),
    integrationPattern: sfn.IntegrationPattern.RUN_JOB,
  });

  // THEN
  expect(stack.resolve(task.toStateJson())).toEqual({
    Type: 'Task',
    Resource: {
      'Fn::Join': [
        '',
        [
          'arn:',
          {
            Ref: 'AWS::Partition',
          },
          ':states:::emr-containers:deleteVirtualCluster.sync',
        ],
      ],
    },
    End: true,
    Parameters: {
      Id: virtualClusterId,
    },
  });
});

test('Invoke EMR Containers DeleteVirtualCluster by passing in JSON Path', () => {
  // WHEN
  const task = new EmrContainersDeleteVirtualCluster(stack, 'Task', {
    virtualClusterId: sfn.TaskInput.fromJsonPathAt('$.VirtualClusterId'),
    integrationPattern: sfn.IntegrationPattern.RUN_JOB,
  });

  // THEN
  expect(stack.resolve(task.toStateJson())).toEqual({
    Type: 'Task',
    Resource: {
      'Fn::Join': [
        '',
        [
          'arn:',
          {
            Ref: 'AWS::Partition',
          },
          ':states:::emr-containers:deleteVirtualCluster.sync',
        ],
      ],
    },
    End: true,
    Parameters: {
      'Id.$': '$.VirtualClusterId',
    },
  });
});

test('Valid policy statements are passed to the state machine with a REQUEST_RESPONSE call', () => {
  // WHEN
  const task = new EmrContainersDeleteVirtualCluster(stack, 'Task', {
    virtualClusterId: sfn.TaskInput.fromText(virtualClusterId),
    integrationPattern: sfn.IntegrationPattern.REQUEST_RESPONSE,
  });

  new sfn.StateMachine(stack, 'SM', {
    definition: task,
  });

  // THEN
  expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [{
        Action: [
          'emr-containers:DeleteVirtualCluster',
        ],
      }],
    },
  });
});

test('Valid policy statements are passed to the state machine with a RUN_JOB call', () => {
  // WHEN
  const task = new EmrContainersDeleteVirtualCluster(stack, 'Task', {
    virtualClusterId: sfn.TaskInput.fromText(virtualClusterId),
    integrationPattern: sfn.IntegrationPattern.RUN_JOB,
  });

  new sfn.StateMachine(stack, 'SM', {
    definition: task,
  });

  // THEN
  expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [{
        Action: [
          'emr-containers:DescribeVirtualCluster',
          'emr-containers:DeleteVirtualCluster',
        ],
      }],
    },
  });
});

test('Task throws if WAIT_FOR_TASK_TOKEN is supplied as service integration pattern', () => {
  expect(() => {
    new EmrContainersDeleteVirtualCluster(stack, 'EMR Containers DeleteVirtualCluster Job', {
      virtualClusterId: sfn.TaskInput.fromText(virtualClusterId),
      integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
    });
  }).toThrow(/Unsupported service integration pattern. Supported Patterns: REQUEST_RESPONSE,RUN_JOB,. Received: WAIT_FOR_TASK_TOKEN/);
});