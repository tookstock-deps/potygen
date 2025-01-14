/**
 * postgres-types-map.ts
 *
 * The maps for converting postgres types into typescript definitions
 */

import { UnaryOperatorTag, BinaryOperatorTag } from './grammar.types';
import {
  TypeJson,
  TypeNull,
  TypeUnknown,
  TypeString,
  TypeBoolean,
  TypeNumber,
  TypeBigInt,
  TypeDate,
  TypeArray,
  Type,
  TypeAny,
  TypeBuffer,
  TypeObjectLiteral,
  OperatorVariant,
  TypeName,
} from './query-interface.types';

export const typeJson: TypeJson = { type: TypeName.Json, postgresType: 'json' };
export const typeNull: TypeNull = { type: TypeName.Null, postgresType: 'null' };
export const typeUnknown: TypeUnknown = { type: TypeName.Unknown, postgresType: 'any' };
export const typeAny: TypeAny = { type: TypeName.Any, postgresType: 'any' };
export const typeString: TypeString = { type: TypeName.String, postgresType: 'text' };
export const typeBuffer: TypeBuffer = { type: TypeName.Buffer, postgresType: 'bytea' };
export const typeBoolean: TypeBoolean = { type: TypeName.Boolean, postgresType: 'bool' };
export const typeNumber: TypeNumber = { type: TypeName.Number, postgresType: 'float4' };
export const typeBigInt: TypeBigInt = { type: TypeName.BigInt, postgresType: 'int8' };
export const typeDate: TypeDate = { type: TypeName.Date, postgresType: 'date' };
const arr = (items: Type): TypeArray => ({
  type: TypeName.Array,
  items,
  postgresType: `${items.postgresType}[]`,
});

/**
 * Aliases for postgres data types
 */
export const pgTypeAliases: Record<string, keyof typeof pgTypes> = {
  bigint: 'int8',
  bigserial: 'serial8',
  'bit varying': 'varbit',
  boolean: 'bool',
  character: 'char',
  'character varying': 'varchar',
  'double precision': 'float8',
  integer: 'int4',
  int: 'int4',
  numeric: 'decimal',
  real: 'float4',
  float: 'float4',
  smallint: 'int2',
  smallserial: 'serial2',
  serial: 'serial4',
  'time with time zone': 'timetz',
  'time without time zone': 'time',
  'timestamp without time zone': 'timestamp',
  'timestamp with time zone': 'timestamptz',
  array: 'anyarray',
};

/**
 * _all_ the postgres data types, with their corresponding {@link Type} objects
 */
export const pgTypes = {
  aclitem: { ...typeString, postgresType: 'aclitem' },
  cid: { ...typeString, postgresType: 'cid' },
  macaddr: { ...typeString, postgresType: 'macaddr' },
  macaddr8: { ...typeString, postgresType: 'macaddr8' },
  smgr: { ...typeString, postgresType: 'smgr' },
  tid: { ...typeString, postgresType: 'tid' },
  uuid: { ...typeString, postgresType: 'uuid' },
  xid: { ...typeString, postgresType: 'xid' },
  xid8: { ...typeString, postgresType: 'xid8' },
  interval: {
    type: TypeName.ObjectLiteral,
    postgresType: 'interval',
    items: [
      { name: 'years', type: typeNumber },
      { name: 'months', type: typeNumber },
      { name: 'days', type: typeNumber },
      { name: 'hours', type: typeNumber },
      { name: 'minutes', type: typeNumber },
      { name: 'seconds', type: typeNumber },
      { name: 'milliseconds', type: typeNumber },
    ],
  } as TypeObjectLiteral,
  bytea: typeBuffer,
  reltime: { ...typeString, postgresType: 'reltime' },
  tinterval: { ...typeString, postgresType: 'tinterval' },
  char: { ...typeString, postgresType: 'char' },
  cstring: { ...typeString, postgresType: 'cstring' },
  daterange: { ...typeString, postgresType: 'daterange' },
  decimal: { ...typeNumber, postgresType: 'decimal' },
  name: { ...typeString, postgresType: 'name' },
  any: { ...typeAny, postgresType: 'any' },
  anycompatible: { ...typeAny, postgresType: 'anycompatible' },
  anyelement: { ...typeAny, postgresType: 'anyelement' },
  anycompatibleelement: { ...typeAny, postgresType: 'anycompatibleelement' },
  anyenum: arr({ ...typeString, postgresType: 'anyenum' }),
  anycompatiblenoneenum: { ...typeString, postgresType: 'anycompatiblenoneenum' },
  anynonarray: { ...typeAny, postgresType: 'anynonarray' },
  anycompatiblenonarray: { ...typeAny, postgresType: 'anycompatiblenonarray' },
  anyarray: arr({ ...typeAny, postgresType: 'anyarray' }),
  anycompatiblearray: { ...typeAny, postgresType: 'anycompatiblearray' },
  anyrange: arr({ ...typeString, postgresType: 'anyarray' }),
  anycompatiblerange: { ...typeString, postgresType: 'anycompatiblerange' },
  event_trigger: { ...typeString, postgresType: 'event_trigger' },
  fdw_handler: { ...typeString, postgresType: 'fdw_handler' },
  index_am_handler: { ...typeString, postgresType: 'index_am_handler' },
  table_am_handler: { ...typeString, postgresType: 'table_am_handler' },
  internal: { ...typeString, postgresType: 'internal' },
  language_handler: { ...typeString, postgresType: 'language_handler' },
  opaque: { ...typeString, postgresType: 'opaque' },
  pg_aggregate: { ...typeString, postgresType: 'pg_aggregate' },
  pg_am: { ...typeString, postgresType: 'pg_am' },
  pg_amop: { ...typeString, postgresType: 'pg_amop' },
  pg_amproc: { ...typeString, postgresType: 'pg_amproc' },
  pg_attrdef: { ...typeString, postgresType: 'pg_attrdef' },
  pg_attribute: { ...typeString, postgresType: 'pg_attribute' },
  pg_auth_members: { ...typeString, postgresType: 'pg_auth_members' },
  pg_authid: { ...typeString, postgresType: 'pg_authid' },
  pg_available_extension_versions: { ...typeString, postgresType: 'pg_available_extension_versions' },
  pg_available_extensions: { ...typeString, postgresType: 'pg_available_extensions' },
  pg_cast: { ...typeString, postgresType: 'pg_cast' },
  pg_class: { ...typeString, postgresType: 'pg_class' },
  pg_collation: { ...typeString, postgresType: 'pg_collation' },
  pg_config: { ...typeString, postgresType: 'pg_config' },
  pg_constraint: { ...typeString, postgresType: 'pg_constraint' },
  pg_conversion: { ...typeString, postgresType: 'pg_conversion' },
  pg_cursors: { ...typeString, postgresType: 'pg_cursors' },
  pg_database: { ...typeString, postgresType: 'pg_database' },
  pg_db_role_setting: { ...typeString, postgresType: 'pg_db_role_setting' },
  pg_ddl_command: { ...typeString, postgresType: 'pg_ddl_command' },
  pg_default_acl: { ...typeString, postgresType: 'pg_default_acl' },
  pg_depend: { ...typeString, postgresType: 'pg_depend' },
  pg_dependencies: { ...typeString, postgresType: 'pg_dependencies' },
  pg_description: { ...typeString, postgresType: 'pg_description' },
  pg_enum: { ...typeString, postgresType: 'pg_enum' },
  pg_event_trigger: { ...typeString, postgresType: 'pg_event_trigger' },
  pg_extension: { ...typeString, postgresType: 'pg_extension' },
  pg_file_settings: { ...typeString, postgresType: 'pg_file_settings' },
  pg_foreign_data_wrapper: { ...typeString, postgresType: 'pg_foreign_data_wrapper' },
  pg_foreign_server: { ...typeString, postgresType: 'pg_foreign_server' },
  pg_foreign_table: { ...typeString, postgresType: 'pg_foreign_table' },
  pg_group: { ...typeString, postgresType: 'pg_group' },
  pg_hba_file_rules: { ...typeString, postgresType: 'pg_hba_file_rules' },
  pg_index: { ...typeString, postgresType: 'pg_index' },
  pg_indexes: { ...typeString, postgresType: 'pg_indexes' },
  pg_inherits: { ...typeString, postgresType: 'pg_inherits' },
  pg_init_privs: { ...typeString, postgresType: 'pg_init_privs' },
  pg_language: { ...typeString, postgresType: 'pg_language' },
  pg_largeobject: { ...typeString, postgresType: 'pg_largeobject' },
  pg_largeobject_metadata: { ...typeString, postgresType: 'pg_largeobject_metadata' },
  pg_locks: { ...typeString, postgresType: 'pg_locks' },
  pg_lsn: { ...typeString, postgresType: 'pg_lsn' },
  pg_matviews: { ...typeString, postgresType: 'pg_matviews' },
  pg_mcv_list: { ...typeString, postgresType: 'pg_mcv_list' },
  pg_namespace: { ...typeString, postgresType: 'pg_namespace' },
  pg_ndistinct: { ...typeString, postgresType: 'pg_ndistinct' },
  pg_node_tree: { ...typeString, postgresType: 'pg_node_tree' },
  pg_opclass: { ...typeString, postgresType: 'pg_opclass' },
  pg_operator: { ...typeString, postgresType: 'pg_operator' },
  pg_opfamily: { ...typeString, postgresType: 'pg_opfamily' },
  pg_partitioned_table: { ...typeString, postgresType: 'pg_partitioned_table' },
  pg_pltemplate: { ...typeString, postgresType: 'pg_pltemplate' },
  pg_policies: { ...typeString, postgresType: 'pg_policies' },
  pg_policy: { ...typeString, postgresType: 'pg_policy' },
  pg_prepared_statements: { ...typeString, postgresType: 'pg_prepared_statements' },
  pg_prepared_xacts: { ...typeString, postgresType: 'pg_prepared_xacts' },
  pg_proc: { ...typeString, postgresType: 'pg_proc' },
  pg_publication: { ...typeString, postgresType: 'pg_publication' },
  pg_publication_rel: { ...typeString, postgresType: 'pg_publication_rel' },
  pg_publication_tables: { ...typeString, postgresType: 'pg_publication_tables' },
  pg_range: { ...typeString, postgresType: 'pg_range' },
  pg_replication_origin: { ...typeString, postgresType: 'pg_replication_origin' },
  pg_replication_origin_status: { ...typeString, postgresType: 'pg_replication_origin_status' },
  pg_replication_slots: { ...typeString, postgresType: 'pg_replication_slots' },
  pg_rewrite: { ...typeString, postgresType: 'pg_rewrite' },
  pg_roles: { ...typeString, postgresType: 'pg_roles' },
  pg_rules: { ...typeString, postgresType: 'pg_rules' },
  pg_seclabel: { ...typeString, postgresType: 'pg_seclabel' },
  pg_seclabels: { ...typeString, postgresType: 'pg_seclabels' },
  pg_sequence: { ...typeString, postgresType: 'pg_sequence' },
  pg_sequences: { ...typeString, postgresType: 'pg_sequences' },
  pg_settings: { ...typeString, postgresType: 'pg_settings' },
  pg_shadow: { ...typeString, postgresType: 'pg_shadow' },
  pg_shdepend: { ...typeString, postgresType: 'pg_shdepend' },
  pg_shdescription: { ...typeString, postgresType: 'pg_shdescription' },
  pg_shseclabel: { ...typeString, postgresType: 'pg_shseclabel' },
  pg_stats: { ...typeString, postgresType: 'pg_stats' },
  pg_snapshot: { ...typeString, postgresType: 'pg_snapshot' },
  pg_subscription: { ...typeString, postgresType: 'pg_subscription' },
  pg_subscription_rel: { ...typeString, postgresType: 'pg_subscription_rel' },
  pg_tables: { ...typeString, postgresType: 'pg_tables' },
  pg_tablespace: { ...typeString, postgresType: 'pg_tablespace' },
  pg_timezone_abbrevs: { ...typeString, postgresType: 'pg_timezone_abbrevs' },
  pg_timezone_names: { ...typeString, postgresType: 'pg_timezone_names' },
  pg_transform: { ...typeString, postgresType: 'pg_transform' },
  pg_trigger: { ...typeString, postgresType: 'pg_trigger' },
  pg_ts_config: { ...typeString, postgresType: 'pg_ts_config' },
  pg_ts_config_map: { ...typeString, postgresType: 'pg_ts_config_map' },
  pg_ts_dict: { ...typeString, postgresType: 'pg_ts_dict' },
  pg_ts_parser: { ...typeString, postgresType: 'pg_ts_parser' },
  pg_ts_template: { ...typeString, postgresType: 'pg_ts_template' },
  pg_type: { ...typeString, postgresType: 'pg_type' },
  pg_user: { ...typeString, postgresType: 'pg_user' },
  pg_user_mapping: { ...typeString, postgresType: 'pg_user_mapping' },
  pg_user_mappings: { ...typeString, postgresType: 'pg_user_mappings' },
  pg_views: { ...typeString, postgresType: 'pg_views' },
  trigger: { ...typeString, postgresType: 'trigger' },
  tsm_handler: { ...typeString, postgresType: 'tsm_handler' },
  gtsvector: { ...typeString, postgresType: 'gtsvector' },
  bit: { ...typeString, postgresType: 'bit' },
  bpchar: { ...typeString, postgresType: 'bpchar' },
  cidr: { ...typeString, postgresType: 'cidr' },
  inet: { ...typeString, postgresType: 'inet' },
  void: { ...typeString, postgresType: 'void' },
  float4: { ...typeNumber, postgresType: 'float4' },
  float8: { ...typeNumber, postgresType: 'float8' },
  int2vector: { ...typeString, postgresType: 'int2vector' },
  int4range: { ...typeString, postgresType: 'int4range' },
  int2: { ...typeNumber, postgresType: 'int2' },
  int4: { ...typeNumber, postgresType: 'int4' },
  int8range: { ...typeString, postgresType: 'int8range' },
  int8: typeBigInt,
  money: { ...typeString, postgresType: 'money' },
  jsonb: { ...typeJson, postgresType: 'jsonb' },
  json: typeJson,
  jsonpath: { ...typeString, postgresType: 'jsonpath' },
  oid: { ...typeNumber, postgresType: 'oid' },
  regclass: { ...typeString, postgresType: 'regclass' },
  regcollation: { ...typeString, postgresType: 'regcollation' },
  regconfig: { ...typeString, postgresType: 'regconfig' },
  regdictionary: { ...typeString, postgresType: 'regdictionary' },
  regnamespace: { ...typeString, postgresType: 'regnamespace' },
  regoper: { ...typeString, postgresType: 'regoper' },
  regoperator: { ...typeString, postgresType: 'regoperator' },
  regproc: { ...typeString, postgresType: 'regproc' },
  regprocedure: { ...typeString, postgresType: 'regprocedure' },
  regrole: { ...typeString, postgresType: 'regrole' },
  regtype: { ...typeString, postgresType: 'regtype' },
  box: { ...typeString, postgresType: 'box' },
  path: { ...typeString, postgresType: 'path' },
  polygon: { ...typeString, postgresType: 'polygon' },
  circle: {
    type: TypeName.ObjectLiteral,
    postgresType: 'circle',
    items: [
      { name: 'x', type: typeNumber },
      { name: 'y', type: typeNumber },
      { name: 'radius', type: typeNumber },
    ],
  } as TypeObjectLiteral,
  line: { ...typeString, postgresType: 'line' },
  lseg: { ...typeString, postgresType: 'lseg' },
  point: {
    type: TypeName.ObjectLiteral,
    postgresType: 'point',
    items: [
      { name: 'x', type: typeNumber },
      { name: 'y', type: typeNumber },
    ],
  } as TypeObjectLiteral,
  abstime: { ...typeString, postgresType: 'abstime' },
  date: { ...typeDate, postgresType: 'date' },
  time: { ...typeString, postgresType: 'time' },
  timestamp: { ...typeDate, postgresType: 'timestamp' },
  timestamptz: { ...typeDate, postgresType: 'timestamptz' },
  timetz: { ...typeDate, postgresType: 'timetz' },
  bool: typeBoolean,
  tsrange: { ...typeString, postgresType: 'tsrange' },
  numrange: { ...typeString, postgresType: 'numrange' },
  tstzrange: { ...typeString, postgresType: 'tstzrange' },
  oidvector: { ...typeString, postgresType: 'oidvector' },
  record: { ...typeString, postgresType: 'record' },
  refcursor: { ...typeString, postgresType: 'refcursor' },
  serial8: { ...typeNumber, postgresType: 'serial8' },
  serial4: { ...typeNumber, postgresType: 'serial4' },
  serial2: { ...typeNumber, postgresType: 'serial2' },
  text: { ...typeString, postgresType: 'text' },
  tsquery: { ...typeString, postgresType: 'tsquery' },
  tsvector: { ...typeString, postgresType: 'tsvector' },
  txid_snapshot: { ...typeString, postgresType: 'txid_snapshot' },
  unknown: typeUnknown,
  varbit: { ...typeString, postgresType: 'varbit' },
  varchar: { ...typeString, postgresType: 'varchar' },
  xml: { ...typeString, postgresType: 'xml' },
  null: typeNull,
};

export const unaryOperatorTypes: { [type in UnaryOperatorTag['value']]: Type } = {
  '+': typeNumber,
  '-': typeNumber,
  NOT: typeBoolean,
  ISNULL: typeBoolean,
  NOTNULL: typeBoolean,
};

export const binaryOperatorTypes: {
  [type in BinaryOperatorTag['value']]: OperatorVariant[];
} = {
  '^': [
    [typeNumber, typeNumber, typeNumber],
    [typeBigInt, typeBigInt, typeBigInt],
  ],
  '%': [
    [typeNumber, typeNumber, typeNumber],
    [typeBigInt, typeBigInt, typeBigInt],
  ],
  '+': [
    [typeNumber, typeNumber, typeNumber],
    [typeBigInt, typeBigInt, typeNumber],
    [typeDate, typeString, typeDate],
  ],
  '-': [
    [typeNumber, typeNumber, typeNumber],
    [typeBigInt, typeBigInt, typeNumber],
    [typeJson, typeString, typeJson],
    [typeJson, arr(typeString), typeJson],
    [typeDate, typeString, typeDate],
    [typeDate, typeDate, typeDate],
  ],
  '/': [[typeNumber, typeNumber, typeNumber]],
  '*': [
    [typeNumber, typeNumber, typeNumber],
    [typeBigInt, typeBigInt, typeBigInt],
    [typeNumber, typeString, typeString],
    [typeDate, typeString, typeDate],
  ],
  OR: [[typeAny, typeAny, typeBoolean]],
  AND: [[typeAny, typeAny, typeBoolean]],
  '||': [
    [typeString, typeString, typeString],
    [typeJson, typeJson, typeJson],
    [arr(typeAny), arr(typeAny), typeBoolean],
  ],
  '>=': [
    [typeBoolean, typeBoolean, typeBoolean],
    [typeDate, typeDate, typeBoolean],
    [typeNumber, typeNumber, typeBoolean],
    [typeBigInt, typeBigInt, typeBoolean],
  ],
  '<=': [
    [typeBoolean, typeBoolean, typeBoolean],
    [typeDate, typeDate, typeBoolean],
    [typeNumber, typeNumber, typeBoolean],
    [typeBigInt, typeBigInt, typeBoolean],
  ],
  '>': [
    [typeBoolean, typeBoolean, typeBoolean],
    [typeDate, typeDate, typeBoolean],
    [typeNumber, typeNumber, typeBoolean],
    [typeBigInt, typeBigInt, typeBoolean],
  ],
  '<': [
    [typeBoolean, typeBoolean, typeBoolean],
    [typeDate, typeDate, typeBoolean],
    [typeNumber, typeNumber, typeBoolean],
    [typeBigInt, typeBigInt, typeBoolean],
  ],
  '=': [
    [typeNumber, typeNumber, typeBoolean],
    [typeBigInt, typeBigInt, typeBoolean],
    [typeDate, typeDate, typeBoolean],
    [typeString, typeString, typeBoolean],
    [typeBoolean, typeBoolean, typeBoolean],
    [typeJson, typeJson, typeBoolean],
  ],
  '!=': [
    [typeNumber, typeNumber, typeBoolean],
    [typeBigInt, typeBigInt, typeBoolean],
    [typeDate, typeDate, typeBoolean],
    [typeString, typeString, typeBoolean],
    [typeBoolean, typeBoolean, typeBoolean],
    [typeJson, typeJson, typeBoolean],
  ],
  '<>': [
    [typeNumber, typeNumber, typeBoolean],
    [typeBigInt, typeBigInt, typeBoolean],
    [typeDate, typeDate, typeBoolean],
    [typeString, typeString, typeBoolean],
    [typeBoolean, typeBoolean, typeBoolean],
    [typeJson, typeJson, typeBoolean],
  ],
  IN: [[typeAny, typeAny, typeBoolean]],
  '@@': [[typeString, typeString, typeBoolean]],
  LIKE: [[typeString, typeString, typeBoolean]],
  ILIKE: [[typeString, typeString, typeBoolean]],
  IS: [[typeAny, typeAny, typeBoolean]],
  '->': [
    [typeJson, typeNumber, typeJson],
    [typeJson, typeString, typeJson],
  ],
  '->>': [
    [typeJson, typeNumber, typeString],
    [typeJson, typeString, typeString],
  ],
  '#>': [[typeJson, arr(typeString), typeJson]],
  '#-': [[typeJson, arr(typeString), typeJson]],
  '#>>': [[typeJson, arr(typeString), typeString]],
  '?': [[typeJson, typeString, typeBoolean]],
  '?|': [[typeJson, arr(typeString), typeBoolean]],
  '?&': [[typeJson, arr(typeString), typeBoolean]],
  '@>': [
    [typeString, typeString, typeBoolean],
    [arr(typeAny), arr(typeAny), typeBoolean],
    [typeJson, typeJson, typeBoolean],
  ],
  '<->': [[typeString, typeString, typeString]],
  '<@': [
    [typeString, typeString, typeBoolean],
    [typeJson, typeJson, typeBoolean],
    [arr(typeAny), arr(typeAny), typeBoolean],
  ],
  '|': [
    [typeJson, typeJson, typeBoolean],
    [typeString, typeString, typeString],
  ],
  '&&': [[arr(typeAny), arr(typeAny), typeBoolean]],
  '&': [[typeString, typeString, typeString]],
  '#': [[typeString, typeString, typeString]],
  '~': [[typeString, typeString, typeString]],
  '~*': [[typeString, typeString, typeString]],
  '!~': [[typeString, typeString, typeString]],
  '!~*': [[typeString, typeString, typeString]],
  '<<': [[typeString, typeNumber, typeString]],
  '>>': [[typeString, typeNumber, typeString]],
  OVERLAPS: [[typeAny, typeAny, typeBoolean]],
  'AT TIME ZONE': [
    [typeDate, typeString, typeDate],
    [typeAny, typeString, typeDate],
  ],
  'IS DISTINCT FROM': [[typeAny, typeAny, typeBoolean]],
  'IS NOT DISTINCT FROM': [[typeAny, typeAny, typeBoolean]],
};
