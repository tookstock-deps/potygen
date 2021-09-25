import { Parser } from '@ikerin/rd-parse';
import { Client } from 'pg';
import { sqlTs } from '../src/document';
import { loadQuery } from '../src/load-types';
import { convertTag } from '../src/query-interface';
import { SqlGrammar } from '../src/sql.grammar';

const parser = Parser(SqlGrammar);
let db: Client;

describe('Query Interface', () => {
  beforeAll(async () => {
    db = new Client({ database: 'sql-ast', user: 'sql-ast', password: 'dev-pass' });
    await db.connect();
  });

  afterAll(async () => {
    await db.end();
  });

  it.each<[string, string]>([
    ['function result single', `SELECT ABS(integer_col) FROM all_types`],
    ['function result double', `SELECT ABS(ABS(integer_col)) FROM all_types`],
    ['nested function guess type', `SELECT ABS(ARRAY_LENGTH(ARRAY_AGG(integer_col), 1)) FROM all_types GROUP BY id`],
    ['nested function explicit type', `SELECT (ARRAY_AGG(integer_col), 1)::int[] FROM all_types GROUP BY id`],
    ['operators integer', `SELECT integer_col + integer_col AS "test1" FROM all_types WHERE id = $id`],
    [
      'operators string',
      `SELECT integer_varchar + integer_col AS "test1" FROM all_types WHERE integer_varchar = $text`,
    ],
    ['different result types', `SELECT * FROM all_types`],
    ['enum', `SELECT 'Pending'::account_levelisation_state`],
    ['enum column', `SELECT state FROM account_levelisations`],
    ['simple', `SELECT id, character_col FROM all_types WHERE id = :id`],
  ])('Should convert %s sql (%s)', async (_, sql) => {
    const ast = parser(sql);
    const query = convertTag(ast);
    const loadedQuery = await loadQuery(db, query);
    const ts = sqlTs(loadedQuery.query);
    expect(ts).toMatchSnapshot();
  });
});