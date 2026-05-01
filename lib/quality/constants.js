export const DIMENSIONS = {
  completeness: {
    label: 'Complétude',
    weight: 0.3,
  },
  coherence: {
    label: 'Cohérence',
    weight: 0.3,
  },
  validity: {
    label: 'Validité',
    weight: 0.2,
  },
  exploitability: {
    label: 'Exploitabilité',
    weight: 0.2,
  },
};

export const SEVERITY_WEIGHT = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const SEVERITY_LABEL = {
  critical: 'Critique',
  high: 'Forte',
  medium: 'Moyenne',
  low: 'Faible',
};

export const VALID_CRITICITIES = new Set(['Critique', 'Standard']);
export const VALID_PROTOCOLS = new Set(['HL7', 'FHIR', 'DICOM', 'API', 'HTTPS', 'SFTP', 'SMTP/TLS']);
export const VALID_INTERFACE_TYPES = new Set(['Administrative', 'Medicale', 'Planification', 'Facturation', 'Autre']);

export const TRIGRAMME_RE = /^[A-Z0-9]{3}$/;
export const IPV4_RE = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
export const CIDR_RE = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}\/([0-9]|[12]\d|3[0-2])$/;
