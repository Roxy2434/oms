import {readFile} from 'node:fs/promises';
/** Derive business table names from versioned schema, not an obsolete hardcoded count. */
export async function expectedBusinessTables(){const schema=await readFile(new URL('../../prisma/schema.prisma',import.meta.url),'utf8');return [...schema.matchAll(/@@map\("([A-Z_]+)"\)/g)].map(m=>m[1]).sort();}
