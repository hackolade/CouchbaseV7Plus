import { Cluster, Scope, Bucket } from '@types/couchbase';

type UUID = string;

type FilePath = string;

type AppTarget = 'COUCHBASEV7PLUS';

type App = {
  require: (packageName: string) => any;
};

type Pagination = {
	enabled: boolean;
	value: number;
};

type RecordSamplingType = 'relative' | 'absolute';

type RecordSamplingSettings = {
	[key: RecordSamplingType]: {
		value: number;
	};
	active: RecordSamplingType;
	maxValue: number;
};

enum AuthTypeEnum {
	usernamePassword = 'username_password',
	securityCertificate = 'security_certificate',
}

type AuthType = `${AuthTypeEnum}`;

type ConnectionInfo = {
	name: string;
	host: string;
	authType: AuthType;
	couchbase_bucket: string;
	couchbase_username: string;
	couchbase_password: string;
	security_certificate: FilePath;
	security_certificate_key: FilePath;
	kv_port: number | undefined;
	target: AppTarget;
	id: UUID;
	appVersion: string;
	tempFolder: FilePath;
	pluginVersion: string | undefined;
	includeSystemCollection: boolean;
	includeEmptyCollection: boolean;
	pagination: Pagination;
	recordSamplingSettings: RecordSamplingSettings;
	queryRequestTimeout: number;
	applyToInstanceQueryRequestTimeout: number;
	activeProxyPool: string[];
	hiddenKeys: string[];
	options: any;
};

type ConnectionParams = {
	url: string;
	options: CouchbaseTypes.ClassicAuthenticator;
};

type LoggerMethod = (message: string) => void;

type Logger = {
	log?: LoggerMethod;
	info?: LoggerMethod;
	error?: LoggerMethod;
};

type Callback = (error: Error, result: any[], info?: { version?: string }, relationships?: any[]) => void;

type NameMap = {
	[key: string]: NameMap | string[];
};

type ConnectionDataItem = {
	dbName: string;
	scopeName?: string;
	dbCollections?: string[];
	status?: string;
	disabledTooltip?: string;
};

export {
  App,
	AppTarget,
  Bucket,
	Callback,
  Cluster,
	ConnectionDataItem,
	ConnectionInfo,
	ConnectionParams,
	FilePath,
  NameMap,
  Logger,
	Pagination,
	RecordSamplingSettings,
  Scope,
	UUID,
};
