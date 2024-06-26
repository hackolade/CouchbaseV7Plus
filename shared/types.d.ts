import { Cluster, Scope, Bucket } from 'couchbase';
import { PK_SEGMENT_TYPE } from './constants';

type UUID = string;

type FilePath = string;

type AppTarget = 'COUCHBASEV7PLUS';

type App = {
	require: (packageName: string) => any;
};

type AppLogger = {
	log: (logType: string, logData: { message: string }, title: string, hiddenKeys: string[]) => void;
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
	kv_port?: number;
	target: AppTarget;
	id: UUID;
	appVersion: string;
	tempFolder: FilePath;
	pluginVersion?: string;
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

type Logger = {
	error: (error: Error) => void;
	info: (message: string) => void;
	progress: (message: string, containerName: string, entityName: string) => void;
};

type Callback = (error: Error, result: any[], info?: { version?: string }, relationships?: any[]) => void;

type NameMap = {
	[key: string]: NameMap | string[];
};

type BucketCollectionNamesData = {
	dbName: string;
	scopeName?: string;
	dbCollections?: string[];
	status?: string;
	disabledTooltip?: string;
};

type Document = {
	[key: string]: any;
};

type DbCollectionData = {
	dbName: string;
	collectionName: string;
	documentKind: string;
	standardDoc: object;
	collectionDocs: object;
	bucketInfo: object;
	emptyBucket: boolean;
	indexes: object[];
	documents: Document[];
	entityLevel: object;
}

type InferenceProperty = {
	"#docs": number;
	"%docs": number;
	samples?: Array<any>;
	type: string | Array<string>
}

type PkSegment = {
	segmentType: Values<PK_SEGMENT_TYPE>;
	segmentValue: string;
	segmentPattern?: string;
	segmentSample?: string;
	segmentMeaning?: string;
	segmentRegex?: string;
	segmentKey?: Array<{ keyId: UUID }>;
};

export {
	App,
	AppLogger,
	AppTarget,
	Bucket,
	BucketCollectionNamesData,
	Callback,
	Cluster,
	ConnectionInfo,
	ConnectionParams,
	DbCollectionData,
	Document,
	FilePath,
	NameMap,
	Logger,
	Pagination,
	RecordSamplingSettings,
	Scope,
	UUID,
	InferenceProperty,
	PkSegment,
};
