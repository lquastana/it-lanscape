import { z } from 'zod';
import { TrigrammeCodeSchema } from './trigramme.js';

const ProtocolSchema = z.enum([
  'HL7',
  'FHIR',
  'DICOM',
  'API',
  'HTTPS',
  'SFTP',
  'SMTP/TLS',
]);

const InterfaceTypeSchema = z.enum([
  'Administrative',
  'Medicale',
  'Planification',
  'Facturation',
  'Autre',
]);

const FluxItemSchema = z.object({
  id: z.string().min(1).optional(),
  sourceTrigramme: TrigrammeCodeSchema,
  targetTrigramme: TrigrammeCodeSchema,
  protocol: ProtocolSchema,
  port: z.number().int().min(1).max(65535),
  messageType: z.string().min(1),
  interfaceType: InterfaceTypeSchema,
  eaiName: z.string().min(1),
  description: z.string(),
});

export const FluxFileSchema = z.object({
  etablissement: z.string().min(1),
  flux: z.array(FluxItemSchema),
});

export { ProtocolSchema, InterfaceTypeSchema, FluxItemSchema };
