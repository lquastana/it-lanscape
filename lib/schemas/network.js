import { z } from 'zod';
import { IPv4Schema } from './infrastructure.js';

const CidrSchema = z.string().regex(
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}\/([0-9]|[12]\d|3[0-2])$/,
  { message: 'CIDR IPv4 invalide' },
);

const NetworkServerSchema = z.object({
  ip: IPv4Schema,
  nom: z.string().min(1),
});

const VlanSchema = z.object({
  id: z.number().int().min(1).max(4094),
  nom: z.string().min(1),
  description: z.string(),
  network: CidrSchema,
  interco: z.string().min(1),
  gateway: IPv4Schema,
  serveurs: z.array(NetworkServerSchema),
});

export const NetworkFileSchema = z.object({
  etablissement: z.string().min(1),
  vlans: z.array(VlanSchema),
});

export { CidrSchema, NetworkServerSchema, VlanSchema };
