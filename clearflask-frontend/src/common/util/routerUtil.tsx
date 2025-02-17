// SPDX-FileCopyrightText: 2019-2021 Matus Faro <matus@smotana.com>
// SPDX-License-Identifier: AGPL-3.0-only
import React from 'react';
import { Redirect, Route, RouteComponentProps, StaticRouterContext } from "react-router";
import windowIso from '../windowIso';

// https://reactrouter.com/web/guides/server-rendering/404-401-or-any-other-status
export function RouteWithStatus(props: { httpCode: number, children }) {
  return (
    <Route
      render={({ staticContext }) => {
        if (staticContext) staticContext.statusCode = props.httpCode;
        return props.children;
      }}
    />
  );
}

// React-Router Redirect component (within domain)
export function RedirectIso(props: { to: string, httpCode?: number }) {
  return (
    <Route
      render={({ staticContext }) => {
        if (windowIso.isSsr && staticContext) {
          (staticContext as StaticRouterContext).statusCode = props.httpCode || 302;
          (staticContext as StaticRouterContext).url = props.to;
        }
        return <Redirect to={props.to} />;
      }}
    />
  );
}

// Redirect now (supports cross domain)
export function redirectIso(url: string, history: RouteComponentProps['history'], httpCode: number = 302) {
  if (windowIso.isSsr) {
    windowIso.staticRouterContext.statusCode = httpCode;
    windowIso.staticRouterContext.url = url;
  } else {
    history.push(url);
  }
}
