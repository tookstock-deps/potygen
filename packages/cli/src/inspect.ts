import {
  AstTag,
  first,
  isBinaryExpression,
  isColumn,
  isIdentifier,
  isQualifiedIdentifier,
  isSetItem,
  isString,
  isTable,
  parser,
  partialParser,
  Tag,
} from '@potygen/ast';
import { toQueryInterface } from '@potygen/query';
import { markTextError, ParserError } from '@ikerin/rd-parse';
import { closestParent, closestParentPath, toPath } from './path';
import { Cache } from './cache';
import {
  LoadedData,
  Logger,
  Path,
  LoadedContext,
  CompletionEntry,
  InfoContext,
  InfoLoadedQuery,
  QuickInfo,
  InspectError,
  LoadedSource,
} from './types';
import { toLoadedContext, filterUnknownLoadedContext, throwOnUnknownLoadedContext } from './load';
import { isLoadedDataTable, isLoadedDataComposite, isLoadedDataEnum, isLoadedDataView } from './guards';
import { inspect } from 'util';
import { quickInfoColumn, quickInfoEnum, quickInfoSource, quickInfoTable, quickInfoView } from './formatters';
import { LoadError } from './errors';

interface InfoBase {
  type: string;
  start: number;
  end: number;
}

interface InfoColumn extends InfoBase {
  type: 'Column';
  name: string;
  source?: string;
  schema?: string;
}
interface InfoEnumVariant extends InfoBase {
  type: 'EnumVariant';
  column: InfoColumn;
}
interface InfoSource extends InfoBase {
  type: 'Source';
  name: string;
  schema?: string;
}
interface InfoTable extends InfoBase {
  type: 'Table';
  name: string;
  schema?: string;
}
interface InfoSchema extends InfoBase {
  name: string;
  type: 'Schema';
}
type Info = InfoColumn | InfoSource | InfoSchema | InfoTable | InfoEnumVariant;

interface LoadedInfo {
  info: Info;
  ast: AstTag;
  path: Path;
  query: LoadedContext;
}

const closestIdentifier = closestParent(isIdentifier);
const closestColumnPath = closestParentPath(isColumn);
const closestTable = closestParent(isTable);
const closestSetItem = closestParent(isSetItem);
const closestQualifiedIdentifierPath = closestParentPath(isQualifiedIdentifier);
const closestBinaryExpressionPath = closestParentPath(isBinaryExpression);
const closestString = closestParent(isString);

const toPos = ({ start, end }: Tag): { start: number; end: number } => ({ start, end });

const pathToInfo = (path: Path): Info | undefined => {
  const identifier = closestIdentifier(path);

  if (identifier) {
    const parentColumnPath = closestColumnPath(path);
    if (parentColumnPath) {
      const index = parentColumnPath.index;
      const parts = parentColumnPath.tag.values;

      if (parts.length === 1 && index === 0) {
        return { type: 'Column', name: parts[0].value, ...toPos(parts[0]) };
      } else if (parts.length === 2 && index === 0) {
        return { type: 'Source', name: parts[0].value, ...toPos(parts[0]) };
      } else if (parts.length === 2 && index === 1) {
        return { type: 'Column', source: parts[0].value, name: parts[1].value, ...toPos(parts[1]) };
      } else if (parts.length === 3 && index === 0) {
        return { type: 'Schema', name: parts[0].value, ...toPos(parts[0]) };
      } else if (parts.length === 3 && index === 1) {
        return { type: 'Source', schema: parts[0].value, name: parts[1].value, ...toPos(parts[1]) };
      } else if (parts.length === 3 && index === 2) {
        return {
          type: 'Column',
          schema: parts[0].value,
          source: parts[1].value,
          name: parts[2].value,
          ...toPos(parts[2]),
        };
      }
    }

    const setItem = closestSetItem(path);
    if (setItem) {
      return { type: 'Column', name: setItem.values[0].value, ...toPos(setItem.values[0]) };
    }

    const tablePath = closestTable(path);
    const qualifedIdentifier = closestQualifiedIdentifierPath(path);
    if (tablePath && qualifedIdentifier) {
      const index = qualifedIdentifier.index;
      const parts = qualifedIdentifier.tag.values;

      if (parts.length === 1 && index === 0) {
        return { type: 'Table', name: parts[0].value, ...toPos(parts[0]) };
      } else if (parts.length === 2 && index === 0) {
        return { type: 'Schema', name: parts[0].value, ...toPos(parts[0]) };
      } else if (parts.length === 2 && index === 1) {
        return { type: 'Table', schema: parts[0].value, name: parts[1].value, ...toPos(parts[1]) };
      }
    }
  }

  const str = closestString(path);
  if (str) {
    const binaryExpressionPath = closestBinaryExpressionPath(path);
    const oppositeBinaryArgument =
      binaryExpressionPath?.tag.values[0] === str
        ? binaryExpressionPath?.tag.values[2]
        : binaryExpressionPath?.tag.values[0];
    if (binaryExpressionPath && oppositeBinaryArgument && isColumn(oppositeBinaryArgument)) {
      const oppositeBinaryArgumentPath = toPath(binaryExpressionPath.tag, oppositeBinaryArgument.end - 1);
      if (oppositeBinaryArgumentPath) {
        const otherInfo = pathToInfo(oppositeBinaryArgumentPath);
        if (otherInfo?.type === 'Column') {
          return { type: 'EnumVariant', column: otherInfo, ...toPos(str) };
        }
      }
    }
  }

  return undefined;
};

const toInfoLoadedContext = (data: LoadedData[], sql: string): InfoLoadedQuery => {
  const { ast } = partialParser(sql);
  const { sources } = toQueryInterface(ast);
  return { ast, query: filterUnknownLoadedContext(toLoadedContext({ data, sources })) };
};

const toLoadedInfo = (ctx: InfoContext, sql: string, offset: number): LoadedInfo | undefined => {
  const { ast, query } = ctx.cache.get(sql) ?? ctx.cache.set(sql, toInfoLoadedContext(ctx.data, sql));

  if (!ast) {
    return undefined;
  }

  const path = toPath(ast, offset);

  if (!path) {
    return undefined;
  }
  const info = pathToInfo(path);

  if (!info) {
    return undefined;
  }
  return { ast, path, info, query };
};

export const toInfoContext = (data: LoadedData[], logger: Logger): InfoContext => ({
  data,
  logger,
  cache: new Cache<string, InfoLoadedQuery>(),
});

const toNamedData = <T extends LoadedData>(
  ctx: InfoContext,
  predicate: (item: LoadedData) => item is T,
  { name, schema }: { name?: string; schema?: string },
) =>
  ctx.data
    .filter(predicate)
    .filter((table) => table.name.schema === (schema ?? 'public') && table.name.name === (name ?? table.name.name));

const toNamedSource = (query: LoadedContext, name: { source?: string; name: string }): LoadedSource | undefined =>
  name.source
    ? query.sources.find((source) => source.name === name.source)
    : query.sources.find((source) => name.name in source.items);

export const completionAtOffset = (ctx: InfoContext, sql: string, offset: number): CompletionEntry[] | undefined => {
  const loadedInfo = toLoadedInfo(ctx, sql, offset);

  if (!loadedInfo) {
    return undefined;
  }
  const { info, query } = loadedInfo;

  ctx.logger.debug(
    `Completion Info found in: \n${markTextError(sql, `${info.type}: ${info.start}...${info.end}`, offset)}`,
  );

  switch (info.type) {
    case 'EnumVariant':
      const column = toNamedSource(query, info.column)?.items[info.column.name];
      const dataEnum = first(
        toNamedData(ctx, isLoadedDataEnum, { schema: info.column.schema, name: column?.postgresType }),
      );
      return dataEnum?.data.map((name) => ({ name }));
    case 'Column':
      return (
        info.source
          ? Object.entries(query.sources.find((source) => source.name === info.source)?.items ?? {})
          : query.sources.flatMap((source) => Object.entries(source.items))
      ).map(([name, type]) => ({ name, source: type.comment }));
    case 'Source':
      return query.sources
        .map((source) => ({ name: source.name }))
        .concat(
          query.sources
            .flatMap((source) => Object.entries(source.items))
            .map(([name, type]) => ({ name, source: type.comment })),
        );
    case 'Table':
      return toNamedData(ctx, isLoadedDataTable, { schema: info.schema }).map((table) => ({
        name: table.name.name,
        source: table.comment,
      }));
    case 'Schema':
      return [];
  }
};

export const inspectError = (ctx: InfoContext, sql: string): InspectError | undefined => {
  try {
    const { ast } = parser(sql);
    const { sources } = toQueryInterface(ast);
    throwOnUnknownLoadedContext(toLoadedContext({ data: ctx.data, sources }));
  } catch (error) {
    if (error instanceof ParserError) {
      return {
        message: error.message,
        code: 1,
        start: error.parseStack.lastSeen.pos,
        end: error.parseStack.lastSeen.pos + 2,
      };
    } else if (error instanceof LoadError) {
      return { message: error.message, code: 2, start: error.tag.start, end: error.tag.end };
    }
  }
  return undefined;
};

export const quickInfoAtOffset = (ctx: InfoContext, sql: string, offset: number): QuickInfo | undefined => {
  const loadedInfo = toLoadedInfo(ctx, sql, offset);

  if (!loadedInfo) {
    return undefined;
  }
  const { info, query } = loadedInfo;

  ctx.logger.debug(`Quick Info found: ${inspect(info)}:`);

  switch (info.type) {
    case 'Column':
      const columnSource = toNamedSource(query, info);
      const column = columnSource?.items[info.name];

      const additionalEnum = first(
        toNamedData(ctx, isLoadedDataEnum, { schema: info.schema, name: column?.postgresType }),
      );
      const additionalComposite = first(
        toNamedData(ctx, isLoadedDataComposite, { schema: info.schema, name: column?.postgresType }),
      );

      ctx.logger.debug(`Quick Info Column: ${inspect({ column, additionalEnum, additionalComposite })}:`);

      return columnSource && column
        ? {
            ...quickInfoColumn(columnSource, info.name, column, additionalEnum ?? additionalComposite),
            start: info.start,
            end: info.end,
          }
        : undefined;
    case 'Source':
      const source = query.sources.find((item) => item.name === info.name);
      ctx.logger.debug(`Quick Info Source: ${inspect(source)}:`);
      return source ? { ...quickInfoSource(source), start: info.start, end: info.end } : undefined;

    case 'EnumVariant':
      const columnEnumType = toNamedSource(query, info.column)?.items[info.column.name];
      const dataEnum = first(
        toNamedData(ctx, isLoadedDataEnum, { schema: info.column.schema, name: columnEnumType?.postgresType }),
      );
      return dataEnum ? { ...quickInfoEnum(dataEnum), start: info.start, end: info.end } : undefined;

    case 'Table':
      const tableSource = query.sources.find((item) => item.name === info.name);

      if (tableSource?.type === 'View') {
        const dataView = first(toNamedData(ctx, isLoadedDataView, info));
        ctx.logger.debug(`Quick Info View: ${inspect(tableSource)}:`);
        return tableSource && dataView
          ? { ...quickInfoView(tableSource, dataView), start: info.start, end: info.end }
          : undefined;
      } else {
        const dataTable = first(toNamedData(ctx, isLoadedDataTable, info));
        ctx.logger.debug(`Quick Info Table: ${inspect(tableSource)}:`);
        return tableSource && dataTable
          ? { ...quickInfoTable(tableSource, dataTable), start: info.start, end: info.end }
          : undefined;
      }
    default:
      return undefined;
  }
};
