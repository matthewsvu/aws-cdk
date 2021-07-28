import * as eks from '@aws-cdk/aws-eks';
import * as iam from '@aws-cdk/aws-iam';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as cdk from '@aws-cdk/core';
import { Construct } from 'constructs';
import { integrationResourceArn, validatePatternSupported } from '../private/task-utils';

/**
 * Class for supported types of EMR Containers' Container Providers
 *
 * @default - EKS
 */
export class ContainerProviderTypes {

  /**
   * Supported container provider type for a EKS Cluster
   *
   * @returns 'EKS'
   */
  static readonly EKS = new ContainerProviderTypes('EKS');

  /**
   * Use a literal string for a new ContainerProviderType.
   * Can be extended in case a new ContainerProviderType is needed.
   *
   * @param type A new ContainerProvider type ex. 'EKS'
   */
  constructor(public readonly type: string) {
  }
}

/**
 * Class that supports methods which return the EKS cluster's id depending on input type.
 */
export class EksClusterInput {

  /**
   * Use an EKS Cluster for the EKS Cluster name
   *
   * @param cluster - An EKS cluster
   * @returns The name of the EKS Cluster
   */
  static fromCluster(cluster: eks.ICluster): EksClusterInput {
    return new EksClusterInput(cluster.clusterName);
  }

  /**
   * Use a Task Input for the cluster name.
   *
   * @param taskInput Task Input object that accepts multiple types of payloads, in this case a literal string.
   * @returns The value of a Task Input object, or a literal string.
   */
  static fromTaskInput(taskInput: sfn.TaskInput): EksClusterInput {
    return new EksClusterInput(taskInput.value);
  }

  /**
   * Initializes the clusterName
   *
   * @param clusterName The name of the EKS Cluster
   */
  private constructor(readonly clusterName: string) { }
}

/**
 * The props for a EMR Containers EKS CreateVirtualCluster Task.
 */
export interface EmrContainersCreateVirtualClusterProps extends sfn.TaskStateBaseProps {

  /**
   * EKS Cluster or TaskInput that contains the id of the cluster
   *
   * @default - No EKS Cluster
   */
  readonly eksCluster: EksClusterInput;

  /**
   * The namespace of an EKS cluster
   *
   * @default - 'default'
   */
  readonly eksNamespace?: string;

  /**
   * Name of the specified virtual cluster.
   * If not provided defaults to Names.uniqueId()
   *
   * @default - Automatically generated
   */
  readonly virtuaClusterName?: string;

  /**
   * The tags assigned to the virtual cluster
   *
   * @default {}
   */
  readonly tags?: { [key: string]: string };
}

/**
 * Creates a Virtual Cluster from a EKS cluster in a Task State
 *
 * @see https://docs.amazonaws.cn/en_us/step-functions/latest/dg/connect-emr-eks.html
 */
export class EmrContainersCreateVirtualCluster extends sfn.TaskStateBase {

  private static readonly SUPPORTED_INTEGRATION_PATTERNS: sfn.IntegrationPattern[] = [
    sfn.IntegrationPattern.REQUEST_RESPONSE,
  ];

  protected readonly taskMetrics?: sfn.TaskMetricsConfig;
  protected readonly taskPolicies?: iam.PolicyStatement[];

  private readonly integrationPattern: sfn.IntegrationPattern;

  constructor(scope: Construct, id: string, private readonly props: EmrContainersCreateVirtualClusterProps) {
    super(scope, id, props);
    this.integrationPattern = props.integrationPattern ?? sfn.IntegrationPattern.REQUEST_RESPONSE;
    validatePatternSupported(this.integrationPattern, EmrContainersCreateVirtualCluster.SUPPORTED_INTEGRATION_PATTERNS);

    this.taskPolicies = this.createPolicyStatements();
  }

  /**
   * @internal
   */
  protected _renderTask(): any {
    return {
      Resource: integrationResourceArn('emr-containers', 'createVirtualCluster', this.integrationPattern),
      Parameters: sfn.FieldUtils.renderObject({
        Name: this.props.virtuaClusterName ?? cdk.Names.uniqueId(this),
        ContainerProvider: {
          Id: this.props.eksCluster.clusterName,
          Info: {
            EksInfo: {
              Namespace: this.props.eksNamespace ?? 'default',
            },
          },
          Type: ContainerProviderTypes.EKS.type,
        },
        Tags: this.props.tags,
      }),
    };
  };

  private createPolicyStatements(): iam.PolicyStatement[] {
    return [
      new iam.PolicyStatement({
        resources: ['*'], // We need * permissions for creating a virtual cluster https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/setting-up-iam.html
        actions: ['emr-containers:CreateVirtualCluster'],
      }),
      new iam.PolicyStatement({
        resources: [
          cdk.Stack.of(this).formatArn({
            service: 'iam',
            region: '',
            resource: 'role/aws-service-role/emr-containers.amazonaws.com',
            resourceName: 'AWSServiceRoleForAmazonEMRContainers',
          }),
        ],
        actions: ['iam:CreateServiceLinkedRole'],
        conditions: {
          StringLike: { 'iam:AWSServiceName': 'emr-containers.amazonaws.com' },
        },
      }),
    ];
  }
}
