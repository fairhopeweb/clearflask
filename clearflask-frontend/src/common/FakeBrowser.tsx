// SPDX-FileCopyrightText: 2019-2021 Matus Faro <matus@smotana.com>
// SPDX-License-Identifier: AGPL-3.0-only
import { createStyles, Theme, withStyles, WithStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import React from 'react';
import { contentScrollApplyStyles, ContentScrollProps, Orientation } from './ContentScroll';
import LockSimpleIcon from './icon/LockSimpleIcon';

const styles = (theme: Theme) => createStyles({
  container: {
    boxShadow: (props: Props) => `-3px 12px 41px -9px rgba(0,0,0,${props.darkMode ? '.7' : '.2'})`,
    display: 'flex',
    flexDirection: 'column',
    width: (props: Props) => props.fixedWidth,
  },
  navbar: {
    backgroundColor: (props: Props) => theme.palette.grey[props.darkMode ? 500 : 100],
    padding: 5,
    display: 'flex',
  },
  button: {
    backgroundColor: (props: Props) => theme.palette.grey[props.darkMode ? 600 : 300],
    minWidth: 12,
    minHeight: 12,
    borderRadius: 10,
    margin: 5,
    marginRight: 0,
  },
  addrbar: {
    marginLeft: 10,
    borderRadius: 4,
    padding: '1px 10px',
    color: theme.palette.text.hint,
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    width: 500,
    maxWidth: '100%',
  },
  content: {
    backgroundColor: (props: Props) => props.darkMode ? 'black' : 'white',
    flexGrow: 1,
    padding: (props: Props) => props.contentPadding,
    height: (props: Props) => props.fixedHeight,
  },
  lockIcon: {
    fontSize: 13,
    color: (props: Props) => theme.palette.grey[props.darkMode ? 600 : 300],
    marginRight: 5,
  },
  codeContainer: {
    margin: 0,
    padding: theme.spacing(1),
    borderTopWidth: 5,
    borderTopStyle: 'solid',
    overflowX: 'initial',
    borderTopColor: (props: Props) => theme.palette.grey[props.darkMode ? 500 : 100],
    maxHeight: (props: Props) => props.codeMaxHeight,
    whiteSpace: 'pre',
    fontFamily: 'monospace',
  },
});
interface Props {
  className?: string;
  children?: React.ReactNode;
  darkMode?: boolean;
  fixedWidth?: number | string;
  fixedHeight?: number | string;
  contentPadding?: number | string;
  showAddressBar?: boolean;
  addressBarContent?: React.ReactNode;
  codeContent?: string;
  codeLanguage?: 'html';
  codeMaxHeight?: number | string;
  scroll?: Omit<ContentScrollProps, 'theme'> & Partial<Pick<ContentScrollProps, 'theme'>>;
}
class FakeBrowser extends React.Component<Props & WithStyles<typeof styles, true>> {
  render() {

    var code;
    if (this.props.codeContent) {
      const backgroundColor = (this.props.darkMode ? 'rgb(28, 27, 27)' : 'rgb(246, 246, 246)');
      code = (
        <div
          className={this.props.classes.codeContainer}
          style={{
            ...contentScrollApplyStyles({
              theme: this.props.theme,
              backgroundColor,
              orientation: Orientation.Both,
            }),
            backgroundColor,
          }}
        >
          {this.props.codeContent}
        </div>
      );
    }

    const addrBarBackgroundColor = this.props.darkMode ? this.props.theme.palette.grey[400] : 'white';

    return (
      <div className={classNames(this.props.classes.container, this.props.className)}>
        <div className={this.props.classes.navbar}>
          <div className={this.props.classes.button} />
          <div className={this.props.classes.button} />
          <div className={this.props.classes.button} />
          {(this.props.showAddressBar || this.props.addressBarContent) && (
            <>
              <div className={this.props.classes.addrbar} style={{
                ...contentScrollApplyStyles({
                  theme: this.props.theme,
                  orientation: Orientation.Horizontal,
                  backgroundColor: addrBarBackgroundColor,
                }),
              }}>
                <LockSimpleIcon fontSize='inherit' className={this.props.classes.lockIcon} />
                {this.props.addressBarContent}
              </div>
            </>
          )}
        </div>
        <div className={this.props.classes.content} style={{
          ...(!this.props.scroll ? {} : contentScrollApplyStyles({
            theme: this.props.theme,
            ...this.props.scroll,
          })),
        }}>
          {this.props.children}
        </div>
        {code}
      </div>
    );
  }
}

export default withStyles(styles, { withTheme: true })(FakeBrowser);
