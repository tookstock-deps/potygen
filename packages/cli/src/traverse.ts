import { readFileSync, watchFile } from 'fs';
import { Readable, Writable } from 'stream';
import { glob } from './glob';
import {
  createSourceFile,
  ScriptTarget,
  isTaggedTemplateExpression,
  Node,
  isImportDeclaration,
  isStringLiteral,
  isNoSubstitutionTemplateLiteral,
  isNamedImports,
  SourceFile,
  isIdentifier,
} from 'typescript';
import { basename, relative } from 'path';
import { parser } from '@psql-ts/ast';
import { QueryInterface, toQueryInterface } from '@psql-ts/query';
import { loadQueryInterfacesData, toLoadedQueryInterface } from './load';
import { ClientBase } from 'pg';
import {
  LoadedData,
  LoadedFile,
  Logger,
  ParsedFile,
  ParsedSqlFile,
  ParsedTypescriptFile,
  TemplateTagQuery,
} from './types';
import { emitLoadedFile } from './emit';
import { LoadError, ParsedSqlFileLoadError, ParsedTypescriptFileLoadError, ParseError } from './errors';

const getTemplateTagQueries = (ast: SourceFile): TemplateTagQuery[] => {
  const queries: TemplateTagQuery[] = [];
  let tagPropertyName = 'sql';

  const visitor = (node: Node): void => {
    if (
      isImportDeclaration(node) &&
      isStringLiteral(node.moduleSpecifier) &&
      node.importClause?.namedBindings &&
      isNamedImports(node.importClause.namedBindings) &&
      node.moduleSpecifier.text === '@psql-ts/query'
    ) {
      tagPropertyName =
        node.importClause?.namedBindings.elements.find(
          ({ propertyName, name }) => (propertyName ?? name).text === 'sql',
        )?.name.text ?? tagPropertyName;
    } else if (
      isTaggedTemplateExpression(node) &&
      isNoSubstitutionTemplateLiteral(node.template) &&
      isIdentifier(node.tag) &&
      node.tag.text === tagPropertyName
    ) {
      const tag = {
        name: node.parent.getChildAt(0).getText(),
        pos: node.template.pos + 1,
        template: node.template.text,
      };
      try {
        const sqlAst = parser(node.template.text);
        if (sqlAst) {
          queries.push({ ...tag, queryInterface: toQueryInterface(sqlAst) });
        }
      } catch (error) {
        throw new ParseError(tag, `Error parsing sql: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      node.forEachChild(visitor);
    }
  };

  visitor(ast);
  return queries;
};

const toParsedTypescriptFile = (path: string): ParsedTypescriptFile => {
  const sourceText = readFileSync(path, 'utf-8');
  const source = createSourceFile(basename(path), sourceText, ScriptTarget.ES2021, true);
  return { type: 'ts', source, path, queries: getTemplateTagQueries(source) };
};

const toParsedSqlFile = (path: string): ParsedSqlFile | undefined => {
  const content = readFileSync(path, 'utf-8');
  const sqlAst = parser(content);
  return sqlAst ? { type: 'sql', path, content, queryInterface: toQueryInterface(sqlAst) } : undefined;
};

const toQueryInterfaces = (files: ParsedFile[]): QueryInterface[] =>
  files.flatMap((file) =>
    file.type === 'ts' ? file.queries.map((query) => query.queryInterface) : file.queryInterface,
  );

const loadDataFromParsedFiles = async (
  db: ClientBase,
  data: LoadedData[],
  files: ParsedFile[],
): Promise<LoadedData[]> => loadQueryInterfacesData(db, toQueryInterfaces(files), data);

const isError = (error: unknown): error is LoadError | ParseError =>
  error instanceof LoadError || error instanceof ParseError;

const loadFile =
  (data: LoadedData[]) =>
  (file: ParsedFile): LoadedFile => {
    if (file.type === 'sql') {
      try {
        return { ...file, loadedQuery: toLoadedQueryInterface(data)(file.queryInterface) };
      } catch (error) {
        throw isError(error) ? new ParsedSqlFileLoadError(file, error) : error;
      }
    } else {
      return {
        ...file,
        queries: file.queries.map((template) => {
          try {
            return { ...template, loadedQuery: toLoadedQueryInterface(data)(template.queryInterface) };
          } catch (error) {
            throw isError(error) ? new ParsedTypescriptFileLoadError(file, template, error) : error;
          }
        }),
      };
    }
  };

const parseFile = (path: string): ParsedFile | undefined => {
  if (path.endsWith('.ts')) {
    const file = toParsedTypescriptFile(path);
    return file.queries.length > 0 ? file : undefined;
  } else {
    return toParsedSqlFile(path);
  }
};

export class SqlRead extends Readable {
  public source: Generator<string, void, unknown>;
  public watchedFiles = new Set<string>();

  constructor(public options: { path: string; root: string; watch: boolean; logger: Logger }) {
    super({ objectMode: true });
    this.source = glob(options.path, options.root);
  }

  next() {
    let path: IteratorResult<string>;
    while (!(path = this.source.next()).done) {
      const file = parseFile(path.value);
      if (file) {
        return file;
      }
    }
    return undefined;
  }

  watchFile(path: string): () => void {
    return () => {
      const file = parseFile(path);
      if (file) {
        this.options.logger.info(`Processing ${relative(this.options.root ?? '.', path)}`);
        this.push(file);
      }
    };
  }

  _read() {
    const next = this.next();
    if (next) {
      if (this.options.watch && !this.watchedFiles.has(next.path)) {
        this.watchedFiles.add(next.path);
        watchFile(next.path, this.watchFile(next.path));
      }
      this.options.logger.info(`Processing ${relative(this.options.root ?? '.', next.path)}`);
      this.push(next);
    } else if (!this.options.watch) {
      this.options.logger.info(`Done`);
      this.push(null);
    }
  }
}

export class QueryLoader extends Writable {
  public data: LoadedData[] = [];
  constructor(public db: ClientBase, public root: string, public template: string) {
    super({ objectMode: true });
  }

  async _writev(
    chunks: Array<{ chunk: ParsedFile; encoding: BufferEncoding }>,
    callback: (error?: Error | null) => void,
  ): Promise<void> {
    try {
      const parsedFiles = chunks.map((file) => file.chunk);
      this.data = await loadDataFromParsedFiles(this.db, this.data, parsedFiles);
      await Promise.all(parsedFiles.map(loadFile(this.data)).map(emitLoadedFile(this.root, this.template)));
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
    callback();
  }

  async _write(
    file: ParsedTypescriptFile,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): Promise<void> {
    try {
      this.data = await loadDataFromParsedFiles(this.db, this.data, [file]);
      await emitLoadedFile(this.root, this.template)(loadFile(this.data)(file));
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
    callback();
  }
}
