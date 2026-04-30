import _CredentialsProvider from 'next-auth/providers/credentials';
import _AzureADProvider from 'next-auth/providers/azure-ad';

const CredentialsProvider = _CredentialsProvider.default ?? _CredentialsProvider;
const AzureADProvider = _AzureADProvider.default ?? _AzureADProvider;
import bcrypt from 'bcrypt';
import { loadAccessRules } from './accessControl.js';
import { loadEntraGroupMap, resolveRoleFromGroups } from './entraGroupMap.js';

const providers = [
  CredentialsProvider({
    name: 'Identifiants',
    credentials: {
      username: { label: 'Utilisateur', type: 'text' },
      password: { label: 'Mot de passe', type: 'password' },
    },
    async authorize(credentials) {
      const rules = await loadAccessRules();
      const user = rules.establishments?.find(e => e.username === credentials?.username);
      if (!user) return null;
      const valid = await bcrypt.compare(credentials.password, user.password);
      if (!valid) return null;
      return { id: user.id, name: user.username, username: user.username, role: user.role || 'editor' };
    },
  }),
];

if (process.env.AZURE_AD_CLIENT_ID) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID,
    })
  );
}

export const authOptions = {
  providers,
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === 'azure-ad' && profile) {
        token.username = profile.preferred_username || profile.email || profile.name;
        token.id = profile.oid || profile.sub;

        // Azure AD may omit groups from the token when count exceeds ~200 (overage claim).
        // In that case groups must be fetched via Graph API — configure groupMembershipClaims
        // in the app registration to avoid overage for typical tenant sizes.
        const groups = Array.isArray(profile.groups) ? profile.groups : [];
        if (profile._claim_names?.groups) {
          console.warn('[entra] groups overage claim detected — Graph API fetch not implemented, applying defaultRole');
        }

        const groupMap = await loadEntraGroupMap();
        token.role = resolveRoleFromGroups(groups, groupMap);
      } else if (user) {
        token.username = user.username || user.name;
        token.id = user.id;
        token.role = user.role || 'viewer';
      }
      return token;
    },
    async session({ session, token }) {
      session.user.username = token.username;
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.isLoggedIn = true;
      return session;
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
};
