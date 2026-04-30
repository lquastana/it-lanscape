import { z } from 'zod';
import { TrigrammeCodeSchema } from './trigramme.js';

const IPv4Schema = z.string().regex(
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/,
  { message: 'Adresse IPv4 invalide' },
);

const InfrastructureServerSchema = z.object({
  VM: z.string().min(1),
  PrimaryIPAddress: IPv4Schema,
  RoleServeur: z.string().min(1),
  CPUs: z.number().int().positive(),
  MemoryMiB: z.number().int().positive(),
  TotalDiskCapacityMiB: z.number().int().positive(),
  OS: z.string().min(1),
  Antivirus: z.string().min(1),
  Backup: z.string().min(1),
  Contact: z.string().min(1),
  Editeur: z.string().min(1),
  trigramme: TrigrammeCodeSchema,
});

export const InfrastructureFileSchema = z.object({
  etablissement: z.string().min(1),
  serveurs: z.array(InfrastructureServerSchema),
});

export { IPv4Schema, InfrastructureServerSchema };
