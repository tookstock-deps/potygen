import { mkdir, writeFile } from 'fs';
import { promisify } from 'util';
import { dirname, parse, relative } from 'path';
import {
  factory,
  createSourceFile,
  ScriptTarget,
  SourceFile,
  TypeNode,
  SyntaxKind,
  createPrinter,
  NewLineKind,
  Statement,
  UnionTypeNode,
  PropertySignature,
  TypeLiteralNode,
} from 'typescript';
import { LoadedFile, LoadedQueryInterface } from './types';
import {
  isTypeArrayConstant,
  isTypeUnionConstant,
  TypeConstant,
  isTypeObjectLiteralConstant,
  isTypeLiteral,
  isTypeEqual,
  isCompositeConstant,
} from '@potygen/query';
import { isUniqueBy } from '@potygen/ast';

const mkdirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);

const parseTemplate = (root: string, template: string, path: string): string =>
  Object.entries({ ...parse(relative(root, path)), root }).reduce(
    (acc, [name, value]) => acc.replace(`{{${name}}}`, value),
    template,
  );

type Refs = string[];

interface TypeContext {
  name: string;
  refs: Refs;
  toJson: boolean;
}

export const compactTypes = (types: TypeConstant[]): TypeConstant[] =>
  types
    .filter((item, index, all) =>
      isTypeLiteral(item) && item.literal !== undefined
        ? !all.some(
            (other, otherIndex) => index !== otherIndex && other.type === item.type && other.literal === undefined,
          )
        : true,
    )
    .filter(isUniqueBy(isTypeEqual));

const toPropertyType =
  (context: TypeContext) =>
  (type: TypeConstant): TypeContext & { type: TypeNode } => {
    if (isCompositeConstant(type)) {
      return { ...context, type: factory.createToken(SyntaxKind.StringKeyword) };
    } else if (isTypeObjectLiteralConstant(type)) {
      return type.items.reduce<TypeContext & { type: TypeLiteralNode }>(
        (acc, item) => {
          const itemType = toPropertyType({ ...context, name: context.name + toClassCase(item.name) })(item.type);
          const memeber = factory.createPropertySignature(undefined, item.name, undefined, itemType.type);
          return { ...itemType, type: factory.createTypeLiteralNode(acc.type.members.concat(memeber)) };
        },
        { ...context, type: factory.createTypeLiteralNode([]) },
      );
    } else if (isTypeArrayConstant(type)) {
      const itemsType = toPropertyType(context)(type.items);
      return { ...itemsType, type: factory.createArrayTypeNode(itemsType.type) };
    } else if (isTypeUnionConstant(type)) {
      return compactTypes(type.items).reduce<TypeContext & { type: UnionTypeNode }>(
        (acc, item, index) => {
          const itemType = toPropertyType({ ...context, name: context.name + index })(item);
          return { ...itemType, type: factory.createUnionTypeNode(acc.type.types.concat(itemType.type)) };
        },
        { ...context, type: factory.createUnionTypeNode([]) },
      );
    } else {
      switch (type.type) {
        case 'Date':
        case 'Buffer':
          return { ...context, type: factory.createTypeReferenceNode(type.type) };
        case 'Boolean':
          return {
            ...context,
            type:
              type.literal !== undefined
                ? factory.createLiteralTypeNode(type.literal ? factory.createTrue() : factory.createFalse())
                : factory.createToken(SyntaxKind.BooleanKeyword),
          };
        case 'Json':
          return {
            ...context,
            refs: context.refs.concat(context.name),
            type: context.toJson
              ? factory.createTypeReferenceNode('Json', [factory.createTypeReferenceNode(context.name)])
              : factory.createTypeReferenceNode(context.name),
          };
        case 'Null':
          return { ...context, type: factory.createLiteralTypeNode(factory.createToken(SyntaxKind.NullKeyword)) };
        case 'Number':
          return {
            ...context,
            type:
              type.literal !== undefined
                ? factory.createLiteralTypeNode(factory.createStringLiteral(String(type.literal)))
                : factory.createToken(SyntaxKind.NumberKeyword),
          };
        case 'String':
          return {
            ...context,
            type:
              type.literal !== undefined
                ? factory.createLiteralTypeNode(factory.createStringLiteral(type.literal))
                : factory.createToken(SyntaxKind.StringKeyword),
          };
        case 'Unknown':
          return { ...context, type: factory.createToken(SyntaxKind.UnknownKeyword) };
        case 'Any':
          return { ...context, type: factory.createToken(SyntaxKind.AnyKeyword) };
      }
    }
  };

const toClassCase = (identifier: string) => identifier[0].toUpperCase() + identifier.slice(1);

const toAstImports = (names: string[]): Statement =>
  factory.createImportDeclaration(
    undefined,
    undefined,
    factory.createImportClause(
      false,
      undefined,
      factory.createNamedImports(
        names.map((name) => factory.createImportSpecifier(undefined, factory.createIdentifier(name))),
      ),
    ),
    factory.createStringLiteral('@potygen/query'),
  );

const toLoadedQueryTypeNodes = (
  refs: Refs,
  name: string,
  loadedQuery: LoadedQueryInterface,
): { resultRefs: Refs; statements: Statement[] } => {
  const params = loadedQuery.params.reduce<{ refs: Refs; props: PropertySignature[] }>(
    (acc, item) => {
      const itemType = toPropertyType({ toJson: false, name: 'TParam' + toClassCase(item.name), refs: acc.refs })(
        item.type,
      );
      const prop = factory.createPropertySignature(
        undefined,
        item.name,
        'nullable' in item.type && item.type.nullable ? factory.createToken(SyntaxKind.QuestionToken) : undefined,
        itemType.type,
      );
      return { ...itemType, props: acc.props.concat(prop) };
    },
    { refs, props: [] },
  );

  const results = loadedQuery.results.reduce<{ refs: Refs; props: PropertySignature[] }>(
    (acc, item) => {
      const itemType = toPropertyType({ toJson: true, name: 'T' + toClassCase(item.name), refs: acc.refs })(item.type);
      const prop = factory.createPropertySignature(
        undefined,
        item.name,
        'nullable' in item.type && item.type.nullable ? factory.createToken(SyntaxKind.QuestionToken) : undefined,
        itemType.type,
      );
      return { ...itemType, props: acc.props.concat(prop) };
    },
    { refs: [], props: [] },
  );

  return {
    resultRefs: results.refs,
    statements: [
      factory.createInterfaceDeclaration(
        undefined,
        [factory.createModifier(SyntaxKind.ExportKeyword)],
        `${name}Params`,
        params.refs.map((ref) =>
          factory.createTypeParameterDeclaration(ref, undefined, factory.createToken(SyntaxKind.UnknownKeyword)),
        ),
        undefined,
        params.props,
      ),
      factory.createInterfaceDeclaration(
        undefined,
        [factory.createModifier(SyntaxKind.ExportKeyword)],
        `${name}Result`,
        results.refs.map((ref) =>
          factory.createTypeParameterDeclaration(ref, undefined, factory.createToken(SyntaxKind.UnknownKeyword)),
        ),
        undefined,
        results.props,
      ),
      factory.createInterfaceDeclaration(
        undefined,
        [factory.createModifier(SyntaxKind.ExportKeyword)],
        `${name}Query`,
        [...params.refs, ...results.refs].map((ref) =>
          factory.createTypeParameterDeclaration(ref, undefined, factory.createToken(SyntaxKind.UnknownKeyword)),
        ),
        undefined,
        [
          factory.createPropertySignature(
            undefined,
            'params',
            undefined,
            factory.createTypeReferenceNode(
              `${name}Params`,
              params.refs.map((ref) => factory.createTypeReferenceNode(ref)),
            ),
          ),
          factory.createPropertySignature(
            undefined,
            'result',
            undefined,
            factory.createTypeReferenceNode(
              `${name}Result`,
              results.refs.map((ref) => factory.createTypeReferenceNode(ref)),
            ),
          ),
        ],
      ),
    ],
  };
};

export const toTypeSource = (file: LoadedFile): SourceFile => {
  const content =
    file.type === 'ts'
      ? file.queries.reduce<{ resultRefs: Refs; statements: Statement[] }>(
          (acc, query) => {
            const { statements, resultRefs } = toLoadedQueryTypeNodes(
              acc.resultRefs,
              toClassCase(query.name),
              query.loadedQuery,
            );
            return { resultRefs, statements: acc.statements.concat(statements) };
          },
          { resultRefs: [], statements: [] },
        )
      : toLoadedQueryTypeNodes([], '', file.loadedQuery);

  return factory.updateSourceFile(
    createSourceFile(file.path, '', ScriptTarget.ES2021, true),
    content.resultRefs.length > 0 ? [toAstImports(['Json']), ...content.statements] : content.statements,
  );
};

export const emitLoadedFile = (root: string, template: string) => {
  const printer = createPrinter({ newLine: NewLineKind.LineFeed });
  return async (file: LoadedFile): Promise<void> => {
    const outputFile = parseTemplate(root, template, file.path);
    const directory = dirname(outputFile);

    await mkdirAsync(directory, { recursive: true });
    await writeFileAsync(outputFile, printer.printFile(toTypeSource(file)));
  };
};