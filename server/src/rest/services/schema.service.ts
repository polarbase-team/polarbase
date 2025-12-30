import pg from '../../plugins/pg';
import { getEnumTypes } from '../utils/schema';

export class SchemaService {
  async getEnumTypes({ schemaName = 'public' }: { schemaName?: string } = {}) {
    const enumTypes = await getEnumTypes(pg, schemaName);
    return enumTypes;
  }
}
