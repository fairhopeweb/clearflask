import { createMuiTheme, Theme } from '@material-ui/core';
import CssBaseline from '@material-ui/core/CssBaseline';
import { MuiThemeProvider } from '@material-ui/core/styles';
import { ProviderContext } from 'notistack';
import React, { Component, Suspense } from 'react';
import ReactGA from 'react-ga';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import ServerAdmin from './api/serverAdmin';
import CaptchaChallenger from './app/utils/CaptchaChallenger';
import EnvironmentNotifier from './app/utils/EnvironmentNotifier';
import Loading from './app/utils/Loading';
import MuiSnackbarProvider from './app/utils/MuiSnackbarProvider';
import ServerErrorNotifier from './app/utils/ServerErrorNotifier';
import { closeLoadingScreen } from './common/loadingScreen';
import { detectEnv, Environment, isTracking } from './common/util/detectEnv';
import ScrollAnchor from './common/util/ScrollAnchor';
import { vh } from './common/util/vhUtil';

const notistackRef = React.createRef<ProviderContext>();
const importSuccess = i => {
  closeLoadingScreen();
  return i;
};
const importFailed = e => {
  notistackRef.current?.enqueueSnackbar("Network connectivity issues, please reload the page", {
    variant: 'error',
    preventDuplicate: true,
    persist: true,
  });
};
const App = React.lazy(() => import('./app/App'/* webpackChunkName: "app" */).then(importSuccess).catch(importFailed));
const Dashboard = React.lazy(() => import('./site/Dashboard'/* webpackChunkName: "dashboard" */).then(importSuccess).catch(importFailed));
const Site = React.lazy(() => import('./site/Site'/* webpackChunkName: "site" */).then(importSuccess).catch(importFailed));
const Invoice = React.lazy(() => import('./site/InvoicePage'/* webpackChunkName: "invoice" */).then(importSuccess).catch(importFailed));
const PostStatus = React.lazy(() => import('./app/PostStatus'/* webpackChunkName: "postStatus" */).then(importSuccess).catch(importFailed));

const theme: Theme = createMuiTheme({
  palette: {
    // type: 'dark',
    background: {
      default: '#fff',
      paper: '#fff',
    },
    primary: {
      main: '#218774',
    },
  },
  overrides: {
    MuiAppBar: {
      colorDefault: {
        backgroundColor: '#fff',
      },
    }
  },
});

class Main extends Component {

  constructor(props) {
    super(props);

    if (isTracking()) {
      ReactGA.initialize('UA-127162051-3', {
        gaOptions: {}
      });
      ReactGA.set({
        anonymizeIp: true,
        forceSSL: true
      });
      ReactGA.pageview(window.location.pathname + window.location.search);
    }
  }

  render() {
    const subdomain = this.getSubdomain();
    if (subdomain === 'www') {
      // Redirect www to homepage
      window.location.replace(window.location.origin.replace(`${subdomain}.`, ''));
    }
    return (
      // <React.StrictMode>
      <MuiThemeProvider theme={theme}>
        <MuiSnackbarProvider notistackRef={notistackRef}>
          <CssBaseline />
          <ServerErrorNotifier />
          <CaptchaChallenger />
          <div style={{
            minHeight: vh(100),
            display: 'flex',
            flexDirection: 'column',
            background: theme.palette.background.default,
          }}>
            <Router>
              <ScrollAnchor scrollOnNavigate />
              {isTracking() && (
                <Route path="/" render={({ location }) => {
                  ReactGA.set({ page: location.pathname + location.search });
                  ReactGA.pageview(location.pathname + location.search);
                  return null;
                }} />
              )}
              <Route render={({ location }) => location.pathname.startsWith('/embed-status') ? null : (
                <EnvironmentNotifier key='env-notifier' />
              )} />
              <Suspense fallback={<Loading />}>
                <Switch>
                  {subdomain ? ([(
                    <Route key='embed-status' path="/embed-status/post/:postId" render={props => (
                      <PostStatus
                        {...props}
                        slug={subdomain}
                        postId={props.match.params['postId'] || ''}
                      />
                    )} />
                  ), (
                    <Route key='app' path="/" render={props => (
                      <App slug={subdomain} {...props} />
                    )} />
                  )]) : ([(
                    <Route key='dashboard' path="/dashboard/:path?/:subPath*" render={props => (
                      <Provider store={ServerAdmin.get().getStore()}>
                        <Dashboard {...props} />
                      </Provider>
                    )} />
                  ), (
                    <Route key='invoice' path="/invoice/:invoiceNumber" render={props => (
                      <Provider store={ServerAdmin.get().getStore()}>
                        <Invoice invoiceNumber={parseInt(props.match.params['invoiceNumber'])} />
                      </Provider>
                    )} />
                  ), (
                    <Route key='site' render={props => (
                      <Provider store={ServerAdmin.get().getStore()}>
                        <Site {...props} />
                      </Provider>
                    )} />
                  )])}
                </Switch>
              </Suspense>
            </Router>
          </div>
        </MuiSnackbarProvider>
      </MuiThemeProvider>
      // </React.StrictMode>
    );
  }

  getSubdomain(): string | undefined {
    const hostSplit = window.location.host.split('.');
    var subdomain: string | undefined = undefined;
    switch (detectEnv()) {
      case Environment.PRODUCTION:
        if (hostSplit.length === 3) {
          subdomain = hostSplit[0];
        }
        break;
      case Environment.DEVELOPMENT_FRONTEND:
      case Environment.DEVELOPMENT_LOCAL:
        if (hostSplit.length === 2 && hostSplit[1] === 'localhost') {
          subdomain = hostSplit[0];
        } else if (hostSplit.length === 3) {
          subdomain = hostSplit[0];
        }
        break;
    }
    return subdomain;
  }
}

export default Main;
