import { getIronSession } from 'iron-session';
import { sessionOptions } from './session';

export function withSessionSsr(handler) {
  return async function (context) {
    const session = await getIronSession(context.req, context.res, sessionOptions);

    if (!session.user?.isLoggedIn) {
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      };
    }

    // Pass the user to the page props
    context.req.session = session;
    const result = await handler(context);

    const props = ("props" in result) ? result.props : {};

    return {
        ...result,
        props: { ...props, user: session.user }
    };
  };
}
