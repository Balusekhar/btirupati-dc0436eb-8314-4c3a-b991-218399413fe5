import { SetMetadata } from '@nestjs/common';

export const PUBLIC_KEY = 'public';
/** Mark route as public (e.g. login) — skip JWT auth. */
export const Public = () => SetMetadata(PUBLIC_KEY, true);
