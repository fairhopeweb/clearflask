// SPDX-FileCopyrightText: 2019-2021 Matus Faro <matus@smotana.com>
// SPDX-License-Identifier: AGPL-3.0-only
/// <reference path="../@types/transform-media-imports.d.ts"/>
import { Box, Grid, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@material-ui/core';
import { createStyles, Theme, useTheme, withStyles, WithStyles } from '@material-ui/core/styles';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import CheckIcon from '@material-ui/icons/CheckRounded';
import classNames from 'classnames';
import React, { Component } from 'react';
import ReactGA from 'react-ga';
import { withTranslation, WithTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router';
import PricingImg from '../../public/img/landing/pricing.svg';
import * as Admin from '../api/admin';
import ServerAdmin, { ReduxStateAdmin } from '../api/serverAdmin';
import Loader from '../app/utils/Loader';
import HelpPopper from '../common/HelpPopper';
import ImgIso from '../common/ImgIso';
import { isProd } from '../common/util/detectEnv';
import { trackingBlock } from '../common/util/trackingDelay';
import { PRE_SELECTED_BASE_PLAN_ID, SIGNUP_PROD_ENABLED } from './AccountEnterPage';
import Background from './landing/Background';
import PricingPlan from './PricingPlan';

/** If changed, also update PlanStore.java */
export const StopTrialAfterActiveUsersReaches = 10;
export const EstimatedPercUsersBecomeTracked = 0.05;

const Faq: Array<{ heading: string, body: string | React.ReactNode }> = [
  {
    heading: 'Open-Source, Non-Profit or Non-Commercial?',
    body: (
      <>
        <p>
          We offer free plans for eligible organizations including open-source, non-profit or non-commercial projects. Contact us with your use case to see if you are eligible.
        </p>
      </>
    ),
  },
  {
    heading: 'Can I import/export data?',
    body: (
      <>
        <p>
          Yes, we provide both import and export functionality via CSV format. You can easily switch between our cloud-hosted plans and a self-hosted installation.
        </p>
      </>
    ),
  },
];

const styles = (theme: Theme) => createStyles({
  section: {
    maxWidth: theme.breakpoints.values.md,
    margin: 'auto',
    padding: theme.spacing(2, 6),
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(1),
    },
  },
  sectionPlans: {
    maxWidth: '100%',
    width: '100%',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  subSectionPlans: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    '& > *': {
      margin: theme.spacing(4),
      minWidth: 250,
    }
  },
  pricingSlider: {
    height: 250,
    maxWidth: 250,
    margin: 'auto',
  },
  header: {
    maxWidth: '100vw',
    display: 'flex',
    [theme.breakpoints.down('sm')]: {
      flexDirection: 'column-reverse',
      alignItems: 'center',
    },
    alignItems: 'flex-end',
  },
  box: {
    border: '1px solid ' + theme.palette.divider,
    borderBottom: 'none',
  },
  billingSelect: {
    margin: theme.spacing(3),
  },
  plansToggle: {
    display: 'flex',
    justifyContent: 'center',
  },
  plansToggleButton: {
    padding: theme.spacing(0, 2),
  },
  image: {
    maxWidth: theme.breakpoints.values.md,
    padding: theme.spacing(0, 8),
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(2),
      maxWidth: 300,
    },
    width: '100%',
  },
  faqItem: {
    margin: theme.spacing(4),
  },
});

interface Props {
}
interface ConnectProps {
  callOnMount?: () => void,
  plans?: Admin.Plan[];
  featuresTable?: Admin.FeaturesTable;
}
interface State {
  highlightedBasePlanid?: string;
  callForQuote?: boolean;
}
class PricingPage extends Component<Props & ConnectProps & WithTranslation<'site'> & RouteComponentProps & WithStyles<typeof styles, true>, State> {
  state: State = {};

  constructor(props) {
    super(props);

    props.callOnMount?.();
  }

  render() {
    const communityPlan = (
      <PricingPlan
        key='community'
        plan={{
          basePlanId: 'community',
          title: 'Community',
          pricing: { basePrice: 0, baseMau: 0, unitPrice: 0, unitMau: 0, period: Admin.PlanPricingPeriodEnum.Monthly },
          perks: [
            { desc: 'Open-source AGPLv3' },
            { desc: 'Quickstart deploy' },
            { desc: 'Community supported' },
          ],
        }}
        overrideMauTerms={[
          'Self-hosted',
          'Own your data',
        ]}
        actionTitle='Install it'
        remark='Join our community'
        actionOnClick={() => {
          trackingBlock(() => {
            ReactGA.event({
              category: 'pricing',
              action: 'click-plan',
              label: 'community',
            });
          });
        }}
        actionToExt='https://github.com/clearflask/clearflask#self-hosting'
      />
    );
    const plansAll: JSX.Element[] = [communityPlan];
    for (const plan of this.props.plans || []) {
      const pricingPlan = (
        <PricingPlan
          key={plan.basePlanId}
          customPrice={plan.basePlanId === 'flat-yearly' ? '1000+' : undefined}
          overrideMauTerms={plan.basePlanId === 'starter-unlimited' ? [
            'Free forever',
            'Upgrade anytime',
          ] : undefined}
          plan={plan}
          selected={this.state.highlightedBasePlanid === plan.basePlanId
            || this.state.callForQuote && plan.basePlanId === 'flat-yearly'}
          actionTitle={plan.basePlanId !== 'flat-yearly' && (SIGNUP_PROD_ENABLED || !isProd()) ? 'Get started' : 'Talk to us'}
          remark={plan.basePlanId === 'starter-unlimited'
            ? this.props.t('free-forever')
            : (plan.pricing
              ? this.props.t('free-14-day-trial')
              : this.props.t('let-us-help-you'))}
          actionOnClick={() => {
            trackingBlock(() => {
              ReactGA.event({
                category: 'pricing',
                action: 'click-plan',
                label: plan.basePlanId,
              });
            });
          }}
          actionTo={plan.basePlanId !== 'flat-yearly' && (SIGNUP_PROD_ENABLED || !isProd())
            ? {
              pathname: '/signup',
              state: { [PRE_SELECTED_BASE_PLAN_ID]: plan.basePlanId },
            }
            : '/contact/sales'}
        />
      );
      plansAll.push(pricingPlan);
    }

    const plansAllGrouped = this.groupPlans(plansAll);

    return (
      <>
        <Background svg={{
          d: 'M 0 49.98 C 0 120 16 137 94 136 C 361 122 252 -31 500 49.98 L 500 0 L 0 0 Z',
          viewBox: '0 0 500 150',
          flexible: true,
        }} height={500} align='top'>
          <div className={this.props.classes.section}>
            <div className={this.props.classes.header}>
              <div>
                <Typography component="h2" variant="h2" color="textPrimary">{this.props.t('pricing')}</Typography>
              </div>
              <ImgIso
                alt=''
                className={this.props.classes.image}
                src={PricingImg.pathname}
                aspectRatio={PricingImg.aspectRatio}
                maxWidth={PricingImg.width}
                maxHeight={PricingImg.height}
              />
            </div>
          </div>
          <br />
          <br />
          <Loader loaded={!!this.props.plans} skipFade>
            <div className={classNames(this.props.classes.section, this.props.classes.sectionPlans)}>
              {plansAllGrouped}
            </div>
            {/* TODO remove this, at the removal of tracked users from plans, I have retired the pricing slider, but I can't let go of it just yet. Please let's keep it commented for some time until I have the courage to delete it permanently.
            <PricingSlider
              className={this.props.classes.pricingSlider}
              plans={this.props.plans || []}
              onSelectedPlanChange={(basePlanId, callForQuote) => this.setState({
                highlightedBasePlanid: callForQuote ? undefined : basePlanId,
                callForQuote,
              })}
            /> */}
          </Loader>
          <br />
          <br />
          <br />
          {this.props.featuresTable && (
            <div className={this.props.classes.section}>
              <FeatureList name='Features' planNames={this.props.featuresTable.plans}>
                {this.props.featuresTable.features.map((feature, index) => (
                  <FeatureListItem
                    key={feature.feature}
                    planContents={this.mapFeaturesTableValues(feature.values)}
                    name={feature.feature}
                    helpText={feature.terms}
                  />
                ))}
              </FeatureList>
              {this.props.featuresTable.extraTerms && (
                <Box display='flex' justifyContent='center'>
                  <Typography variant='caption' component='div'>{this.props.featuresTable.extraTerms}</Typography>
                </Box>
              )}
            </div>
          )}
          <br />
          <br />
          <br />
          <div className={this.props.classes.section}>
            <Grid container spacing={5} alignItems='stretch' justify='center'>
              {Faq.map((faqItem, index) => (
                <Grid key={index} item xs={12} sm={6}>
                  <div className={this.props.classes.faqItem}>
                    <Typography component='div' variant='h5'>
                      {faqItem.heading}
                    </Typography>
                    <br />
                    <Typography component='div' variant='body1' color='textSecondary'>
                      {faqItem.body}
                    </Typography>
                  </div>
                </Grid>
              ))}
            </Grid>
          </div>
        </Background>
      </>
    );
  }

  mapFeaturesTableValues(values: string[]): (string | boolean)[] {
    return values.map(value => {
      switch (value) {
        case 'Yes': return true;
        case 'No': return false;
        default: return value;
      }
    });
  }

  groupPlans(plans: JSX.Element[]): JSX.Element[] {
    const plansGrouped: JSX.Element[] = [];
    for (var i = 0; i < plans.length; i += 2) {
      const left = plans[i];
      const right = plans[i + 1];
      plansGrouped.push((
        <div key={`${left?.key}-${right?.key}`} className={classNames(this.props.classes.subSectionPlans)}>
          {left}
          {right}
        </div>
      ));
    }
    return plansGrouped;
  }
}

const FeatureList = withStyles(styles, { withTheme: true })((props: WithStyles<typeof styles, true> & {
  planNames: string[],
  name: string,
  children?: any,
}) => {
  const theme = useTheme();
  const mdUp = useMediaQuery(theme.breakpoints.up('sm'));
  return (
    <div className={props.classes.box}>
      <Table
        size={mdUp ? 'medium' : 'small'}
      >
        <TableHead>
          <TableRow>
            <TableCell key='feature'><Typography variant='h6'>{props.name}</Typography></TableCell>
            {props.planNames.map(planName => (
              <TableCell key={planName}>{planName}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {props.children}
        </TableBody>
      </Table>
    </div>
  );
});

const FeatureListItem = (props: {
  planContents: (boolean | React.ReactNode | string)[],
  name: string,
  helpText?: string
}) => {
  return (
    <TableRow key='name'>
      <TableCell key='feature'>
        {props.name}
        {props.helpText && (
          <>
            &nbsp;
            <HelpPopper description={props.helpText} />
          </>
        )}
      </TableCell>
      {props.planContents.map((content, index) => (
        <TableCell key={index}>
          {content === true
            ? (<CheckIcon fontSize='inherit' />)
            : content}
        </TableCell>
      ))}
    </TableRow>
  );
}

export default connect<ConnectProps, {}, Props, ReduxStateAdmin>((state, ownProps) => {
  const newProps: ConnectProps = {
    plans: state.plans.plans.plans,
    featuresTable: state.plans.plans.featuresTable,
  };
  if (state.plans.plans.status === undefined) {
    newProps.callOnMount = () => {
      ServerAdmin.get().dispatchAdmin({ ssr: true }).then(d => d.plansGet());
    };
  }
  return newProps;
})(withStyles(styles, { withTheme: true })(withRouter(withTranslation('site', { withRef: true })(PricingPage))));
