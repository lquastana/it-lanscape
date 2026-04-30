import { z } from 'zod';
import { TrigrammeCodeSchema } from './trigramme.js';

const CriticiteSchema = z.enum(['Critique', 'Standard']);

const InterfacesSchema = z.object({
  Planification: z.boolean(),
  Facturation: z.boolean(),
  Administrative: z.boolean(),
  Medicale: z.boolean(),
  Autre: z.boolean(),
});

const ApplicationSchema = z.object({
  nom: z.string().min(1),
  description: z.string(),
  editeur: z.string(),
  referent: z.string().nullable(),
  hebergement: z.string().min(1),
  criticite: CriticiteSchema,
  multiEtablissement: z.boolean(),
  lienPRTG: z.string().nullable(),
  interfaces: InterfacesSchema,
  trigramme: TrigrammeCodeSchema,
});

const ProcessusSchema = z.object({
  nom: z.string().min(1),
  description: z.string(),
  applications: z.array(ApplicationSchema),
});

const DomaineSchema = z.object({
  nom: z.string().min(1),
  description: z.string(),
  processus: z.array(ProcessusSchema),
});

const EtablissementSchema = z.object({
  nom: z.string().min(1),
  domaines: z.array(DomaineSchema),
});

export const LandscapeSchema = z.object({
  etablissements: z.array(EtablissementSchema).min(1),
});

export { CriticiteSchema, InterfacesSchema, ApplicationSchema, ProcessusSchema, DomaineSchema, EtablissementSchema };
