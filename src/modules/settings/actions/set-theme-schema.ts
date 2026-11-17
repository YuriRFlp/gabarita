import { z } from 'zod';
import { THEME_PREFERENCES } from '../domain';

export const setThemeSchema = z.object({ theme: z.enum(THEME_PREFERENCES) });

export type SetThemeState = { status: 'idle' } | { status: 'error'; message: string };

export const INITIAL_SET_THEME_STATE: SetThemeState = { status: 'idle' };

export const THEME_FAILURE_MESSAGE = 'Não foi possível salvar o tema. Tente de novo.';
