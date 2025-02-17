// SPDX-FileCopyrightText: 2019-2021 Matus Faro <matus@smotana.com>
// SPDX-License-Identifier: AGPL-3.0-only
import { createMuiTheme, CssBaseline, Theme } from '@material-ui/core';
import { MuiThemeProvider, StylesProvider } from '@material-ui/core/styles';
import { Breakpoint } from '@material-ui/core/styles/createBreakpoints';
import { ComponentsProps } from '@material-ui/core/styles/props';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import * as Client from '../api/client';
import { ReduxState } from '../api/server';
import { vh } from '../common/util/screenUtil';
import windowIso from '../common/windowIso';

interface ThemeCustomProps {
  disableTransitions?: boolean;
  funding?: string;
  isInsideContainer?: boolean;
  expressionGrayscale?: number;
  explorerExpandTimeout?: number;
  vh: (heightPerc: number) => number;
}

declare module '@material-ui/core/styles/createMuiTheme' {
  interface Theme extends ThemeCustomProps { }
  interface ThemeOptions extends ThemeCustomProps { }
}

export const ComponentPropsOverrides: ComponentsProps = {
  MuiModal: {
    disableEnforceFocus: true,
  },
  MuiWithWidth: {
    noSSR: true,
  },
};

interface Props {
  containerStyle?: (theme: Theme) => React.CSSProperties,
  supressCssBaseline?: boolean;
  isInsideContainer?: boolean;
  forceBreakpoint?: Breakpoint;
  appRootId: string;
  seed: string;
  // connect
  config?: Client.Config;
}
class AppThemeProvider extends Component<Props> {
  render() {
    var expressionGrayscale: number | undefined = undefined;
    switch (this.props.config && this.props.config.style.palette.expressionColor) {
      case Client.PaletteExpressionColorEnum.Gray:
        expressionGrayscale = 100;
        break;
      case Client.PaletteExpressionColorEnum.Washed:
        expressionGrayscale = 50;
        break;
    }
    var breakpoints;
    if (this.props.forceBreakpoint) {
      breakpoints = {};
      var bpSeen;
      ['xs', 'sm', 'md', 'lg', 'xl'].forEach(bp => {
        breakpoints[bp] = !bpSeen ? 0 : 10000;
        if (!bpSeen && bp === this.props.forceBreakpoint) {
          bpSeen = true;
        };
      })
    }
    var theme: Theme | undefined;
    if (this.props.config) {
      theme = createMuiTheme({
        disableTransitions: !this.props.config.style.animation.enableTransitions,
        funding: this.props.config.style.palette.funding
          || this.props.config.style.palette.primary,
        // Optional green color
        // || ( this.props.config.style.palette.darkMode ? '#6ca869' : '#89c586' ),
        isInsideContainer: !!this.props.isInsideContainer,
        expressionGrayscale: expressionGrayscale,
        explorerExpandTimeout: 500,
        vh,
        palette: {
          type: this.props.config.style.palette.darkMode ? 'dark' : 'light',
          primary: {
            main: this.props.config.style.palette.primary
              || (this.props.config.style.palette.darkMode ? '#2dbaa1' : '#218774'),
          },
          secondary: {
            main: this.props.config.style.palette.primary
              || (this.props.config.style.palette.darkMode ? '#2dbaa1' : '#218774'),
          },
          ...(this.props.config.style.palette.text ? {
            text: {
              primary: this.props.config.style.palette.text,
            }
          } : {}),
          background: {
            ...(this.props.config.style.palette.background ? { default: this.props.config.style.palette.background } : {}),
            ...(this.props.config.style.palette.backgroundPaper ? { paper: this.props.config.style.palette.backgroundPaper } : {}),
          },
        },
        typography: {
          // TODO sanitize input, currently you can inject custom css with "; inject: me"
          /* If changed, change in index.html, Main.tsx */
          fontFamily: this.props.config.style.typography.fontFamily || '"Inter", -apple-system-body, BlinkMacSystemFont, SFUI, HelveticaNeue, Helvetica, Arial, sans-serif',
          fontSize: this.props.config.style.typography.fontSize || 14,
        },
        transitions: {
          ...(this.props.config.style.animation.enableTransitions ? {} : {
            create: () => 'none',
            duration: {
              shortest: 0,
              shorter: 0,
              short: 0,
              standard: 0,
              complex: 0,
              enteringScreen: 0,
              leavingScreen: 0,
            },
          }),
        },
        breakpoints: {
          ...(breakpoints ? {
            values: breakpoints,
          } : {}),
        },
        props: {
          ...ComponentPropsOverrides,
          MuiDialog: {
            ...(!windowIso.isSsr ? {
              container: () => document.getElementById(this.props.appRootId)!,
            } : {}),
            ...(this.props.isInsideContainer ? {
              style: { position: 'absolute' },
              BackdropProps: { style: { position: 'absolute' } },
            } : {}),
          },
          MuiButtonBase: {
            ...(!this.props.config.style.animation.enableTransitions ? {
              disableRipple: true,
            } : {}),
          },
        },
      })
    } else {
      theme = createMuiTheme();
    }

    return (
      <StylesProvider injectFirst>
        <MuiThemeProvider theme={theme}>
          {!this.props.supressCssBaseline && (<CssBaseline />)}
          <div style={{
            height: '100%',
            ...(this.props.containerStyle?.(theme) || {}),
            background: theme.palette.background.default,
            color: theme.palette.text.primary,
          }}>
            {this.props.children}
          </div>
        </MuiThemeProvider>
      </StylesProvider>
    );
  }
}

export default connect<any, any, any, any>((state: ReduxState, ownProps: Props) => {
  return {
    configver: state.conf.ver, // force rerender on config change
    config: state.conf.conf,
  }
})(AppThemeProvider);
