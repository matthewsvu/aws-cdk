import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as cdk from '@aws-cdk/core';
import { EksClusterInput, EmrContainersEksCreateVirtualCluster } from '../../lib/emrcontainers/create-virtual-cluster';

/**
 * Stack verification steps:
 * Everything in the link below besides the last step must be setup before running the state machine.
 * @see https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/setting-up.html
 *
 * aws stepfunctions start-execution --state-machine-arn <deployed state machine arn> : should return execution arn
 * aws stepfunctions describe-execution --execution-arn <exection-arn generated before> : should return status as SUCCEEDED
 */

const app = new cdk.App();
const stack = new cdk.Stack(app, 'aws-stepfunctions-tasks-emr-containers-create-virtual-cluster-integ');

const createVirtualClusterJob = new EmrContainersEksCreateVirtualCluster(stack, 'Create a Virtual Cluster Job', {
  virtualClusterName: 'emr-containers-test-cluster',
  eksCluster: EksClusterInput.fromTaskInput(sfn.TaskInput.fromText('test-eks')),
  eksNamespace: 'spark',
  integrationPattern: sfn.IntegrationPattern.REQUEST_RESPONSE,
});

const chain = sfn.Chain.start(createVirtualClusterJob);

const sm = new sfn.StateMachine(stack, 'StateMachine', {
  definition: chain,
  timeout: cdk.Duration.seconds(30),
});

new cdk.CfnOutput(stack, 'stateMachineArn', {
  value: sm.stateMachineArn,
});


app.synth();