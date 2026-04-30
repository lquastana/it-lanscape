import { z } from 'zod';

// Trigramme code: 3 uppercase alphanumeric characters
const TrigrammeCodeSchema = z.string().regex(/^[A-Z0-9]{3}$/, {
  message: 'Le trigramme doit être exactement 3 caractères alphanumériques en majuscules',
});

// { "GAP": "Maincare iGAP", ... }
export const TrigrammeSchema = z
  .record(TrigrammeCodeSchema, z.string().min(1, 'Le nom de l\'application ne peut pas être vide'))
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'Le fichier trigrammes ne peut pas être vide',
  });

export { TrigrammeCodeSchema };
