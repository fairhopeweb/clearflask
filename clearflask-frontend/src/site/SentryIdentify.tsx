import * as Sentry from "@sentry/react";
import { shallowEqual, useSelector } from 'react-redux';
import * as Admin from '../api/admin';
import * as Client from '../api/client';
import { ReduxState } from "../api/server";
import { ReduxStateAdmin } from '../api/serverAdmin';
import { isDoNotTrack } from '../common/util/detectEnv';
import windowIso from "../common/windowIso";

export const SentryIdentifyAccount = () => {
  const account = useSelector<ReduxStateAdmin, Admin.AccountAdmin | undefined>(state => state.account.account.account, shallowEqual);
  if (windowIso.isSsr) {
    return null;
  } else if (isDoNotTrack() && account) {
    Sentry.setUser({
      id: account.accountId,
      email: account.email,
      username: account.name,
    });
  } else {
    Sentry.configureScope(scope => scope.setUser(null));
  }
  return null;
}

export const SentryIdentifyUser = () => {
  const user = useSelector<ReduxState, Client.UserMe | undefined>(state => state.users.loggedIn.user, shallowEqual);
  if (windowIso.isSsr) {
    return null;
  } else if (isDoNotTrack() && user) {
    Sentry.setUser({
      id: user.userId,
      username: user.name,
      email: user.email,
    });
  } else {
    Sentry.configureScope(scope => scope.setUser(null));
  }
  return null;
}
