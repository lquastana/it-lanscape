import { getIronSession } from 'iron-session';

export const sessionOptions = {
  password: process.env.SESSION_SECRET || 'un_secret_complexe_et_long_a_deviner_en_production',
  cookieName: 'it-landscape-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};

export function getSession(req, res) {
  return getIronSession(req, res, sessionOptions);
}
