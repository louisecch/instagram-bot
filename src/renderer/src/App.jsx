import { memo, useState, useEffect, useRef, useCallback } from 'react';
import {
  Paragraph,
  ResetIcon,
  LogOutIcon,
  StopIcon,
  PlayIcon,
  SettingsIcon,
  ListIcon,
  IssueIcon,
  TickIcon,
  Dialog,
  Tooltip,
  IconButton,
  HelpIcon,
  Button,
  TextInputField,
  SideSheet,
  TagInput,
  Checkbox,
  Badge,
  Label,
  Textarea,
} from 'evergreen-ui';
import Swal from 'sweetalert2';
import moment from 'moment';
import isEqual from 'lodash/isEqual';
import Lottie from 'react-lottie-player';
import withReactContent from 'sweetalert2-react-content';
import JSON5 from 'json5';

import runningLottie from './14470-phone-running.json';
import robotLottie from './10178-c-bot.json';
import robotDizzyLottie from './13680-robot-call.json';
import loveLottie from './13682-heart.json';

// eslint-disable-next-line unicorn/prefer-global-this
const { isDev } = window;

// eslint-disable-next-line unicorn/prefer-global-this
const electron = window.require('@electron/remote');

const {
  initInstautoDb,
  initInstauto,
  runBotNormalMode,
  runBotUnfollowNonMutualFollowers,
  runBotUnfollowOldFollowed,
  runBotUnfollowUserList,
  runBotFollowUserList,
  runBotLikePhotosOnly,
  cleanupInstauto,
  checkHaveCookies,
  deleteCookies,
  getInstautoData,
  runTestCode,
} = electron.require('./index.js');
const { store: configStore, defaults: configDefaults } = electron.require('./store.js');

const ReactSwal = withReactContent(Swal);

const cleanupAccounts = (accounts) => accounts.map((user) => user.replaceAll(/^@/g, ''));

function safeSetConfig(key, val) {
  configStore.set(key, val !== undefined ? val : null);
}

function onTroubleshootingClick() {
  Swal.fire({
    title: 'Troubleshooting',
    html: `
      <ul style="text-align: left">
        <li>Check that all @account names are correct.</li>
        <li>Check logs for any error</li>
        <li>Try to log out and then log back in</li>
        <li>Check that your firewall allows the app (listen to port)</li>
        <li>Restart the app</li>
      </ul>
    `,
  });
}

// eslint-disable-next-line react/display-name
const AdvancedSettings = memo(
  ({
    advancedSettings,
    onChange,
    dryRun,
    setDryRun,
    instantStart,
    setInstantStart,
    onClose,
  }) => {
    const [advancedSettingsTxt, setAdvancedSettingsTxt] = useState();
    const [advancedSettingsParsed, setAdvancedSettingsParsed] = useState(advancedSettings);

    const onTextareaChange = useCallback((e) => {
      const { value } = e.target;
      setAdvancedSettingsTxt(value);
      try {
        setAdvancedSettingsParsed(JSON5.parse(value));
      } catch (err) {
        setAdvancedSettingsParsed();
        console.error(err);
      }
    }, []);

    const tooHighWarning = 'NOTE: setting this too high may cause Action Blocked';
    const optsData = {
      dontUnfollowUntilDaysElapsed: {
        description:
          'Automatically unfollow auto-followed users after this number of days',
      },
      followUserMinFollowing: {
        description: 'Skip users who follow less users than this',
      },
      followUserMinFollowers: {
        description: 'Skip users who have less followers than this',
      },
      followUserMaxFollowers: {
        description: 'Skip users who have more followers than this',
      },
      followUserMaxFollowing: {
        description: 'Skip users who are following more than this',
      },
      followUserRatioMin: {
        description:
          'Skip users that have a followers/following ratio lower than this',
      },
      followUserRatioMax: {
        description:
          'Skip users that have a followers/following ratio higher than this',
      },
      maxFollowsPerHour: {
        description: `Limit follow and unfollow operations per hour. ${tooHighWarning}`,
      },
      maxFollowsPerDay: {
        description: `Limit follow and unfollow operations over 24 hours. ${tooHighWarning}`,
      },
      maxLikesPerUser: {
        description:
          "Like up to this number of photos on each user's profile. Set to 0 to deactivate liking photos",
      },
      enableFollowUnfollow: {
        description:
          'Enable follow/unfollow users? (can be disabled if you only want to like photos)',
      },
      maxLikesPerDay: {
        description: `Limit total photo likes per 24 hours. ${tooHighWarning}`,
      },
      runAtHour: {
        description: 'Repeat at this hour (24hr based) every day',
      },
      userAgent: {
        description: "Set the browser's user agent to this value",
      },
    };

    const onResetClick = useCallback(() => {
      setAdvancedSettingsTxt();
      setAdvancedSettingsParsed(advancedSettings);
    }, [advancedSettings]);

    const onSaveClick = useCallback(() => {
      if (!advancedSettingsParsed) return;

      onChange(advancedSettingsParsed);
      setAdvancedSettingsTxt();

      onClose();
    }, [advancedSettingsParsed, onChange, onClose]);

    const formatValue = (value) => (value ? String(value) : 'unset');

    return (
      <>
        <Lottie
          loop
          play
          animationData={robotDizzyLottie}
          style={{ width: 100, height: 100, margin: 0 }}
        />

        {Object.entries(advancedSettingsParsed || advancedSettings).map(
          ([key, value]) => {
            const defaultValue = configDefaults[key];
            const hasChanged = !isEqual(defaultValue, value);

            return (
              <div key={key} style={{ margin: '10px 0' }}>
                <b>{key}</b>
                &nbsp;
                <Badge color={value != null ? 'green' : undefined}>
                  {formatValue(value)}
                </Badge>
                {hasChanged && (
                  <>
                    &nbsp;
                    <Badge>default {formatValue(defaultValue)}</Badge>
                  </>
                )}
                <div>{optsData[key].description}</div>
              </div>
            );
          },
        )}

        <Label
          htmlFor="textarea"
          marginBottom={4}
          marginTop={10}
          display="block"
        >
          Change settings here (JSON):
        </Label>
        <Textarea
          isInvalid={!advancedSettingsParsed}
          rows={10}
          fontSize={16}
          lineHeight="1.2em"
          id="textarea"
          spellCheck={false}
          onChange={onTextareaChange}
          value={
            advancedSettingsTxt != null
              ? advancedSettingsTxt
              : JSON5.stringify(advancedSettings, null, 2)
          }
        />

        {!advancedSettingsParsed && (
          <Paragraph color="danger">
            The JSON has a syntax error, please fix.
          </Paragraph>
        )}

        <div style={{ margin: '30px 0' }}>
          <Checkbox
            label="Dry run - If checked, the bot will not perform any real actions (useful for testing)"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
          />

          <Checkbox
            label="Start immediately - If unchecked, the bot will sleep until the hour 'runAtHour' when Start button is pressed"
            checked={instantStart}
            onChange={(e) => setInstantStart(e.target.checked)}
          />
        </div>

        <Button
          iconBefore={TickIcon}
          type="button"
          disabled={!advancedSettingsParsed}
          onClick={onSaveClick}
        >
          Save &amp; Close
        </Button>
        <IconButton icon={ResetIcon} intent="danger" onClick={onResetClick} />
      </>
    );
  },
);

// eslint-disable-next-line react/display-name
const LogView = memo(({ logs, style, fontSize } = {}) => {
  const logViewRef = useRef();
  useEffect(() => {
    if (logViewRef.current) logViewRef.current.scrollTop = logViewRef.current.scrollHeight;
  }, [logs]);

  return (
    <div
      ref={logViewRef}
      style={{
        width: '100%',
        height: 100,
        overflowY: 'scroll',
        overflowX: 'hidden',
        textAlign: 'left',
        ...style,
      }}
    >
      {logs.map(({ args, level, time }, i) => {
        const color = {
          warn: '#f37121',
          error: '#d92027',
        }[level] || 'rgba(0,0,0,0.6)';

        return (
          // eslint-disable-next-line react/no-array-index-key
          <div key={i}>
            <span style={{ marginRight: 5, whiteSpace: 'pre-wrap', fontSize }}>
              {moment(time).format('LT')}
            </span>
            <span
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                fontSize,
                color,
              }}
            >
              {args.map(String).join(' ')}
            </span>
          </div>
        );
      })}
    </div>
  );
});

// eslint-disable-next-line react/display-name
const AccountsList = memo(
  ({ hasWarning, accounts, setAccounts, label, placeholder, tooltip }) => {
    const onChange = useCallback(
      (newVal) => {
        // Some people try hashtags
        setAccounts(newVal.filter((v) => !v.startsWith('#')));
      },
      [setAccounts],
    );

    return (
      <>
        <Label>
          {label}
          <br />
          <b>Press ENTER between each account</b>
        </Label>
        {tooltip && (
          <Tooltip content={tooltip}>
            <IconButton icon={HelpIcon} appearance="minimal" />
          </Tooltip>
        )}
        <TagInput
          inputProps={{ placeholder }}
          style={{ border: hasWarning ? '1px solid orange' : undefined }}
          values={accounts}
          onChange={onChange}
          separator={/[,\s]/}
        />
      </>
    );
  },
);

const AccountsListDialog = ({ isShown, onCloseComplete, onConfirm, label }) => {
  const [accounts, setAccounts] = useState([]);

  return (
    <Dialog
      confirmLabel={label}
      isShown={isShown}
      onCloseComplete={onCloseComplete}
      onConfirm={() => onConfirm(accounts)}
    >
      <AccountsList
        accounts={accounts}
        setAccounts={setAccounts}
        placeholder="@account1 @account2"
      />
    </Dialog>
  );
};

// eslint-disable-next-line react/display-name
const App = memo(() => {
  const [advancedSettings, setAdvancedSettings] = useState(() => ({
    userAgent: configStore.get('userAgent'),
    maxFollowsPerDay: configStore.get('maxFollowsPerDay'),
    maxFollowsPerHour: configStore.get('maxFollowsPerHour'),
    maxLikesPerDay: configStore.get('maxLikesPerDay'),
    maxLikesPerUser: configStore.get('maxLikesPerUser'),
    enableFollowUnfollow: configStore.get('enableFollowUnfollow'),
    followUserRatioMin: configStore.get('followUserRatioMin'),
    followUserRatioMax: configStore.get('followUserRatioMax'),
    followUserMaxFollowers: configStore.get('followUserMaxFollowers'),
    followUserMaxFollowing: configStore.get('followUserMaxFollowing'),
    followUserMinFollowers: configStore.get('followUserMinFollowers'),
    followUserMinFollowing: configStore.get('followUserMinFollowing'),
    dontUnfollowUntilDaysElapsed: configStore.get(
      'dontUnfollowUntilDaysElapsed',
    ),
    runAtHour: configStore.get('runAtHour'),
  }));

  function setAdvancedSetting(key, value) {
    setAdvancedSettings((s) => ({ ...s, [key]: value }));
  }

  useEffect(
    () => safeSetConfig('userAgent', advancedSettings.userAgent),
    [advancedSettings.userAgent],
  );
  useEffect(
    () => safeSetConfig('maxFollowsPerDay', advancedSettings.maxFollowsPerDay),
    [advancedSettings.maxFollowsPerDay],
  );
  useEffect(
    () => safeSetConfig('maxFollowsPerHour', advancedSettings.maxFollowsPerHour),
    [advancedSettings.maxFollowsPerHour],
  );
  useEffect(
    () => safeSetConfig('maxLikesPerDay', advancedSettings.maxLikesPerDay),
    [advancedSettings.maxLikesPerDay],
  );
  useEffect(
    () => safeSetConfig('maxLikesPerUser', advancedSettings.maxLikesPerUser),
    [advancedSettings.maxLikesPerUser],
  );
  useEffect(
    () => safeSetConfig(
      'enableFollowUnfollow',
      advancedSettings.enableFollowUnfollow,
    ),
    [advancedSettings.enableFollowUnfollow],
  );
  useEffect(
    () => safeSetConfig('followUserRatioMin', advancedSettings.followUserRatioMin),
    [advancedSettings.followUserRatioMin],
  );
  useEffect(
    () => safeSetConfig('followUserRatioMax', advancedSettings.followUserRatioMax),
    [advancedSettings.followUserRatioMax],
  );
  useEffect(
    () => safeSetConfig(
      'followUserMaxFollowers',
      advancedSettings.followUserMaxFollowers,
    ),
    [advancedSettings.followUserMaxFollowers],
  );
  useEffect(
    () => safeSetConfig(
      'followUserMaxFollowing',
      advancedSettings.followUserMaxFollowing,
    ),
    [advancedSettings.followUserMaxFollowing],
  );
  useEffect(
    () => safeSetConfig(
      'followUserMinFollowers',
      advancedSettings.followUserMinFollowers,
    ),
    [advancedSettings.followUserMinFollowers],
  );
  useEffect(
    () => safeSetConfig(
      'followUserMinFollowing',
      advancedSettings.followUserMinFollowing,
    ),
    [advancedSettings.followUserMinFollowing],
  );
  useEffect(
    () => safeSetConfig(
      'dontUnfollowUntilDaysElapsed',
      advancedSettings.dontUnfollowUntilDaysElapsed,
    ),
    [advancedSettings.dontUnfollowUntilDaysElapsed],
  );
  useEffect(
    () => safeSetConfig('runAtHour', advancedSettings.runAtHour),
    [advancedSettings.runAtHour],
  );

  const [haveCookies, setHaveCookies] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [running, setRunning] = useState(false);
  const [advancedVisible, setAdvancedVisible] = useState(false);
  const [logsVisible, setLogsVisible] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [skipPrivate, setSkipPrivate] = useState(
    configStore.get('skipPrivate'),
  );
  const [usersToFollowFollowersOf, setUsersToFollowFollowersOf] = useState(
    configStore.get('usersToFollowFollowersOf'),
  );

  const [currentUsername, setCurrentUsername] = useState(
    configStore.get('currentUsername'),
  );
  useEffect(
    () => (currentUsername
      ? safeSetConfig('currentUsername', currentUsername)
      : configStore.delete('currentUsername')),
    [currentUsername],
  );

  const [instantStart, setInstantStart] = useState(true);

  // Testing
  // useEffect(() => isDev && setRunning(true), []);

  const [shouldPlayAnimations, setSouldPlayAnimations] = useState(true);

  const [unfollowUserListDialogShown, setUnfollowUserListDialogShown] = useState(false);
  const [followUserListDialogShown, setFollowUserListDialogShown] = useState(false);

  useEffect(() => {
    if (running) {
      const t = setTimeout(
        () => {
          setSouldPlayAnimations(false);
        },
        isDev ? 5000 : 60000,
      );

      return () => clearTimeout(t);
    }
    return undefined;
  }, [running]);

  const [logs, setLogs] = useState([]);

  const [instautoData, setInstautoData] = useState();

  useEffect(() => safeSetConfig('skipPrivate', skipPrivate), [skipPrivate]);
  useEffect(
    () => safeSetConfig('usersToFollowFollowersOf', usersToFollowFollowersOf),
    [usersToFollowFollowersOf],
  );

  const fewUsersToFollowFollowersOf = usersToFollowFollowersOf.length < 5;

  async function updateCookiesState() {
    setHaveCookies(await checkHaveCookies());
  }

  const refreshInstautoData = useCallback(() => {
    setInstautoData(getInstautoData());
  }, []);

  const isLoggedIn = !!(currentUsername && haveCookies);

  useEffect(() => {
    (async () => {
      if (!isLoggedIn) return;
      await initInstautoDb(currentUsername);
      refreshInstautoData();
    })().catch(console.error);
  }, [currentUsername, isLoggedIn, refreshInstautoData]);

  useEffect(() => {
    updateCookiesState();
  }, []);

  const onLogoutClick = useCallback(async () => {
    await deleteCookies();
    await updateCookiesState();
    setCurrentUsername();
    cleanupInstauto();

    refreshInstautoData();
  }, [refreshInstautoData]);

  const startInstautoAction = useCallback(
    async (instautoAction) => {
      if (running) {
        const result = await Swal.fire({
          title: 'Are you sure?',
          text: 'This will terminate the bot and you will lose any log text. Note that the bot will still remember which users it has followed, and will unfollow them in the future.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Stop the bot',
          cancelButtonText: 'Leave it running',
        });
        if (result.value) electron.app.quit();
        return;
      }

      if (usersToFollowFollowersOf.length === 0) {
        await Swal.fire({
          icon: 'error',
          text: 'Please add at least 1 account to the list!',
        });
        return;
      }

      if (!isLoggedIn && (username.length === 0 || password.length === 0)) {
        await Swal.fire({
          icon: 'error',
          text: 'Please enter your username and password',
        });
        return;
      }

      if (fewUsersToFollowFollowersOf) {
        const { value } = await Swal.fire({
          icon: 'warning',
          text: 'We recommended to provide at least 5 users',
          showCancelButton: true,
          confirmButtonText: 'Run anyway',
        });
        if (!value) return;
      }

      setLogs([]);
      setRunning(true);

      function log(level, ...args) {
        console[level](...args);
        setLogs((l) => [...l, { time: new Date(), level, args }]);
      }

      const logger = {
        log: (...args) => log('log', ...args),
        error: (...args) => log('error', ...args),
        warn: (...args) => log('warn', ...args),
        info: (...args) => log('info', ...args),
        debug: (...args) => log('debug', ...args),
      };

      try {
        if (isLoggedIn) {
          await initInstautoDb(currentUsername);
        } else {
          await deleteCookies(); // Maybe they had cookies but not yet any currentUsername (old version)
          setCurrentUsername(username);
          await initInstautoDb(username);
        }
        refreshInstautoData();

        await initInstauto({
          userAgent: advancedSettings.userAgent,
          dontUnfollowUntilDaysElapsed:
            advancedSettings.dontUnfollowUntilDaysElapsed,
          maxFollowsPerHour: advancedSettings.maxFollowsPerHour,
          maxFollowsPerDay: advancedSettings.maxFollowsPerDay,
          maxLikesPerDay: advancedSettings.maxLikesPerDay,
          followUserRatioMin: advancedSettings.followUserRatioMin,
          followUserRatioMax: advancedSettings.followUserRatioMax,
          followUserMaxFollowers: advancedSettings.followUserMaxFollowers,
          followUserMaxFollowing: advancedSettings.followUserMaxFollowing,
          followUserMinFollowers: advancedSettings.followUserMinFollowers,
          followUserMinFollowing: advancedSettings.followUserMinFollowing,

          excludeUsers: [],

          dryRun,

          username: isLoggedIn ? currentUsername : username,
          password: isLoggedIn ? '' : password,

          logger,
        });

        await instautoAction();
      } catch (err) {
        logger.error('Failed to run', err);
        await ReactSwal.fire({
          icon: 'error',
          title: 'Failed to run',
          html: (
            <div style={{ textAlign: 'left' }}>
              Try the troubleshooting button. Error:
              <div style={{ color: '#aa0000' }}>{err.message}</div>
            </div>
          ),
        });
        if (!isDev) await onLogoutClick();
      } finally {
        setRunning(false);
        cleanupInstauto();
      }
    },
    [
      advancedSettings,
      currentUsername,
      dryRun,
      fewUsersToFollowFollowersOf,
      isLoggedIn,
      onLogoutClick,
      password,
      refreshInstautoData,
      running,
      username,
      usersToFollowFollowersOf.length,
    ],
  );

  const onStartPress = useCallback(async () => {
    await startInstautoAction(async () => {
      await runBotNormalMode({
        usernames: cleanupAccounts(usersToFollowFollowersOf),
        ageInDays: advancedSettings.dontUnfollowUntilDaysElapsed,
        skipPrivate,
        runAtHour: advancedSettings.runAtHour,
        enableFollowUnfollow: advancedSettings.enableFollowUnfollow,
        maxLikesPerUser: advancedSettings.maxLikesPerUser,
        maxFollowsTotal: advancedSettings.maxFollowsPerDay, // This could be improved in the future
        instantStart,
      });
    });
  }, [
    advancedSettings.dontUnfollowUntilDaysElapsed,
    advancedSettings.enableFollowUnfollow,
    advancedSettings.maxFollowsPerDay,
    advancedSettings.maxLikesPerUser,
    advancedSettings.runAtHour,
    instantStart,
    skipPrivate,
    startInstautoAction,
    usersToFollowFollowersOf,
  ]);

  const onUnfollowNonMutualFollowersPress = useCallback(async () => {
    await startInstautoAction(async () => runBotUnfollowNonMutualFollowers());
  }, [startInstautoAction]);

  const onUnfollowOldFollowedPress = useCallback(async () => {
    await startInstautoAction(async () => runBotUnfollowOldFollowed({
      ageInDays: advancedSettings.dontUnfollowUntilDaysElapsed,
    }));
  }, [advancedSettings.dontUnfollowUntilDaysElapsed, startInstautoAction]);

  const onUnfollowUserList = useCallback(
    async (accounts) => {
      const accountsCleaned = cleanupAccounts(accounts);
      if (accountsCleaned.length === 0) return;
      setUnfollowUserListDialogShown(false);
      await startInstautoAction(async () => runBotUnfollowUserList({ usersToUnfollow: accountsCleaned }));
    },
    [startInstautoAction],
  );

  const onFollowUserList = useCallback(
    async (accounts) => {
      const accountsCleaned = cleanupAccounts(accounts);
      if (accountsCleaned.length === 0) return;
      setFollowUserListDialogShown(false);
      await startInstautoAction(async () => runBotFollowUserList({ users: accountsCleaned, skipPrivate }));
    },
    [skipPrivate, startInstautoAction],
  );

  const onLikePhotosOnlyPress = useCallback(async () => {
    if (dryRun) {
      const { value } = await Swal.fire({
        icon: 'warning',
        title: 'Dry Run is enabled',
        text: 'Dry Run mode is on — the bot will NOT actually like any photos. Uncheck "Dry Run" in Advanced Settings to perform real actions.',
        showCancelButton: true,
        confirmButtonText: 'Run anyway (simulation)',
        cancelButtonText: 'Cancel',
      });
      if (!value) return;
    }
    await startInstautoAction(async () => runBotLikePhotosOnly({
      maxLikesPerUser: advancedSettings.maxLikesPerUser || 3,
      maxUsersToVisit: advancedSettings.maxFollowsPerDay || 50,
    }));
  }, [
    dryRun,
    advancedSettings.maxFollowsPerDay,
    advancedSettings.maxLikesPerUser,
    startInstautoAction,
  ]);

  const onRunTestCode = useCallback(async () => {
    await startInstautoAction(async () => runTestCode());
  }, [startInstautoAction]);

  const onDonateClick = () => electron.shell.openExternal('https://mifi.no/thanks');

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f5f5f7 0%, #ffffff 100%)',
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
    },
    contentWrapper: {
      flex: 1,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '40px 20px',
    },
    card: {
      background: '#ffffff',
      borderRadius: '20px',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
      padding: '48px',
      maxWidth: '880px',
      width: '100%',
    },
    runningCard: {
      background: '#ffffff',
      borderRadius: '20px',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
      padding: '48px',
      maxWidth: '560px',
      width: '100%',
      textAlign: 'center',
    },
    title: {
      fontSize: '34px',
      fontWeight: '700',
      letterSpacing: '-0.5px',
      color: '#1d1d1f',
      marginBottom: '12px',
      lineHeight: '1.2',
    },
    subtitle: {
      fontSize: '17px',
      color: '#6e6e73',
      marginBottom: '32px',
      lineHeight: '1.5',
    },
    sectionTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#1d1d1f',
      marginBottom: '16px',
      marginTop: '32px',
    },
    primaryButton: {
      minHeight: '48px',
      fontSize: '17px',
      fontWeight: '500',
      borderRadius: '12px',
      padding: '0 32px',
      marginTop: '24px',
    },
    secondaryButton: {
      minHeight: '44px',
      fontSize: '15px',
      borderRadius: '10px',
      margin: '8px 6px',
    },
    inputField: {
      marginBottom: '20px',
    },
    checkboxWrapper: {
      margin: '16px 0',
      padding: '12px',
      background: '#f5f5f7',
      borderRadius: '12px',
    },
    infoBox: {
      background: '#f5f5f7',
      borderRadius: '12px',
      padding: '20px',
      marginTop: '24px',
      fontSize: '15px',
      lineHeight: '1.6',
      color: '#1d1d1f',
    },
    statsContainer: {
      display: 'flex',
      justifyContent: 'space-around',
      marginTop: '32px',
      padding: '24px',
      background: '#f5f5f7',
      borderRadius: '16px',
    },
    statItem: {
      textAlign: 'center',
    },
    statNumber: {
      fontSize: '32px',
      fontWeight: '700',
      color: '#007aff',
      lineHeight: '1',
    },
    statLabel: {
      fontSize: '13px',
      color: '#6e6e73',
      marginTop: '8px',
      fontWeight: '500',
    },
    footer: {
      textAlign: 'center',
      padding: '24px',
      fontSize: '13px',
      color: '#6e6e73',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.contentWrapper}>
        {running ? (
          <div style={styles.runningCard}>
            <Lottie
              loop
              play={shouldPlayAnimations}
              animationData={runningLottie}
              style={{ maxWidth: 180, width: '100%', margin: '0 auto 24px' }}
            />

            <div style={styles.title}>Bot is Running</div>
            <div style={styles.subtitle}>
              Leave the app running and connected to power. The bot will work
              automatically while you focus on other things.
            </div>

            <div style={styles.infoBox}>
              <div style={{ marginBottom: '12px' }}>
                <strong>Keep the browser window open</strong>
              </div>
              <div style={{ fontSize: '13px', color: '#6e6e73' }}>
                Don&apos;t close or minimize the bot&apos;s browser window for
                proper operation.
              </div>
            </div>

            <div
              style={{
                marginTop: '32px',
                fontSize: '15px',
                lineHeight: '1.6',
                color: '#1d1d1f',
              }}
            >
              <strong>No ads. No tracking. Just open source.</strong>
              <div
                style={{ fontSize: '13px', color: '#6e6e73', marginTop: '8px' }}
              >
                This app is free for everyone. Consider supporting development
                to keep it updated.
              </div>
              <div
                role="button"
                tabIndex="0"
                style={{
                  cursor: 'pointer',
                  color: '#007aff',
                  fontWeight: '600',
                  marginTop: '12px',
                }}
                onClick={onDonateClick}
              >
                Support Development ❤️
              </div>
            </div>

            <div style={{ marginTop: '32px' }}>
              <LogView
                fontSize={11}
                logs={logs}
                style={{ maxHeight: '200px' }}
              />
            </div>

            <Button
              iconBefore={StopIcon}
              height={48}
              type="button"
              intent="danger"
              onClick={onStartPress}
              style={{
                ...styles.primaryButton,
                width: '100%',
                marginTop: '32px',
              }}
            >
              Stop Bot
            </Button>
          </div>
        ) : (
          <div style={styles.card}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <Lottie
                loop
                play
                animationData={robotLottie}
                style={{ width: 160, height: 160, margin: '0 auto 16px' }}
              />
              <div style={styles.title}>SimpleInstaBot</div>
              <div style={styles.subtitle}>
                Grow your Instagram following automatically with smart
                automation
              </div>
            </div>

            {isLoggedIn ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '32px',
                  background: '#f5f5f7',
                  borderRadius: '16px',
                  marginBottom: '32px',
                }}
              >
                <div
                  style={{
                    fontSize: '17px',
                    fontWeight: '600',
                    color: '#34c759',
                    marginBottom: '16px',
                  }}
                >
                  ✓ Bot is logged in and ready
                </div>
                <Button
                  iconBefore={LogOutIcon}
                  type="button"
                  intent="danger"
                  onClick={onLogoutClick}
                  style={{ minHeight: '44px', borderRadius: '10px' }}
                >
                  Log Out
                </Button>
              </div>
            ) : (
              <div style={{ marginBottom: '32px' }}>
                <div style={styles.sectionTitle}>Instagram Account</div>
                <TextInputField
                  isInvalid={username.length === 0}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  label="Username"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  height={48}
                  style={styles.inputField}
                />

                <TextInputField
                  value={password}
                  isInvalid={password.length < 4}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  label="Password"
                  description="We do not store your password"
                  height={48}
                  style={styles.inputField}
                />
              </div>
            )}

            <div style={{ ...styles.sectionTitle, marginTop: '60px' }}>
              Target Accounts
            </div>
            <div style={{ marginBottom: '24px' }}>
              <AccountsList
                accounts={usersToFollowFollowersOf}
                setAccounts={setUsersToFollowFollowersOf}
                hasWarning={fewUsersToFollowFollowersOf}
                label="Accounts whose followers to target"
                placeholder="@influencer1 @influencer2 @celebrity"
                tooltip={`Choose 5+ accounts with large followings (100k+) in your target niche. The bot will follow their recent followers, and unfollow them after ${advancedSettings.dontUnfollowUntilDaysElapsed} days.`}
              />
            </div>

            <div style={styles.checkboxWrapper}>
              <Checkbox
                label="Follow private accounts"
                checked={!skipPrivate}
                onChange={(e) => setSkipPrivate(!e.target.checked)}
              />
            </div>

            <div style={styles.checkboxWrapper}>
              <Checkbox
                label="Like photos after following users"
                checked={advancedSettings.maxLikesPerUser > 0}
                onChange={(e) => setAdvancedSetting(
                  'maxLikesPerUser',
                  e.target.checked ? 2 : 0,
                )}
              />
            </div>

            <div style={styles.infoBox}>
              <strong>Important Tips</strong>
              <ul
                style={{
                  margin: '12px 0 0 0',
                  paddingLeft: '20px',
                  lineHeight: '1.7',
                }}
              >
                <li>Use the same WiFi as your phone&apos;s Instagram app</li>
                <li>
                  Don&apos;t use a VPN - this may trigger security warnings
                </li>
                <li>
                  Bot runs daily at {advancedSettings.runAtHour}:00 until
                  stopped
                </li>
              </ul>
            </div>

            <div style={{ textAlign: 'center' }}>
              <Tooltip content="Start the bot in primary mode (follow/unfollow/like)">
                <Button
                  iconBefore={PlayIcon}
                  height={56}
                  type="button"
                  intent="success"
                  onClick={onStartPress}
                  style={{
                    ...styles.primaryButton,
                    width: '100%',
                    minHeight: '56px',
                    fontSize: '19px',
                  }}
                >
                  Start Bot
                </Button>
              </Tooltip>

              <div
                style={{
                  marginTop: '32px',
                  paddingTop: '24px',
                  borderTop: '1px solid #e5e5e7',
                }}
              >
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#6e6e73',
                    marginBottom: '16px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Special Operations
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <Tooltip
                    content={`Unfollow accounts followed more than ${advancedSettings.dontUnfollowUntilDaysElapsed} days ago`}
                  >
                    <Button
                      height={44}
                      type="button"
                      onClick={onUnfollowOldFollowedPress}
                      style={styles.secondaryButton}
                    >
                      Unfollow Old
                    </Button>
                  </Tooltip>
                  <Tooltip content="Unfollow accounts not following you back">
                    <Button
                      height={44}
                      type="button"
                      onClick={onUnfollowNonMutualFollowersPress}
                      style={styles.secondaryButton}
                    >
                      Unfollow Non-Mutual
                    </Button>
                  </Tooltip>
                  <Tooltip content="Like photos only without following users">
                    <Button
                      height={44}
                      type="button"
                      onClick={onLikePhotosOnlyPress}
                      style={styles.secondaryButton}
                    >
                      Like Photos Only
                    </Button>
                  </Tooltip>
                  {isDev && (
                    <Button
                      height={44}
                      type="button"
                      onClick={() => onRunTestCode()}
                      style={styles.secondaryButton}
                    >
                      Test Code
                    </Button>
                  )}
                </div>
              </div>

              <div
                style={{
                  marginTop: '24px',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  iconBefore={SettingsIcon}
                  type="button"
                  onClick={() => setAdvancedVisible(true)}
                  appearance="minimal"
                >
                  Advanced Settings
                </Button>
                {logs.length > 0 && (
                  <Button
                    iconBefore={ListIcon}
                    type="button"
                    onClick={() => setLogsVisible(true)}
                    appearance="minimal"
                  >
                    View Logs
                  </Button>
                )}
                <Button
                  iconBefore={IssueIcon}
                  type="button"
                  onClick={onTroubleshootingClick}
                  appearance="minimal"
                >
                  Troubleshooting
                </Button>
              </div>
            </div>

            {instautoData && (
              <div style={styles.statsContainer}>
                <div style={styles.statItem}>
                  <div style={styles.statNumber}>
                    {instautoData.numFollowedLastDay}
                  </div>
                  <div style={styles.statLabel}>Followed Today</div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#86868b',
                      marginTop: '4px',
                    }}
                  >
                    {instautoData.numTotalFollowedUsers} total
                  </div>
                </div>
                <div style={styles.statItem}>
                  <div style={styles.statNumber}>
                    {instautoData.numUnfollowedLastDay}
                  </div>
                  <div style={styles.statLabel}>Unfollowed Today</div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#86868b',
                      marginTop: '4px',
                    }}
                  >
                    {instautoData.numTotalUnfollowedUsers} total
                  </div>
                </div>
                <div style={styles.statItem}>
                  <div style={styles.statNumber}>
                    {instautoData.numLikedLastDay}
                  </div>
                  <div style={styles.statLabel}>Liked Today</div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#86868b',
                      marginTop: '4px',
                    }}
                  >
                    {instautoData.numTotalLikedPhotos} total
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={styles.footer}>
        <Button
          appearance="minimal"
          onClick={() => electron.shell.openExternal('https://mifi.no/')}
          style={{ fontSize: '13px' }}
        >
          More apps by mifi.no
        </Button>
        <Lottie
          loop
          play={!running}
          goTo={running ? 50 : undefined}
          animationData={loveLottie}
          style={{
            width: 40,
            height: 40,
            display: 'inline-block',
            verticalAlign: 'middle',
            marginLeft: '8px',
          }}
        />
      </div>

      <SideSheet
        containerProps={{ style: { maxWidth: '100%' } }}
        isShown={advancedVisible}
        onCloseComplete={() => setAdvancedVisible(false)}
      >
        <div style={{ margin: 20 }}>
          <h3>Advanced settings</h3>

          <AdvancedSettings
            dryRun={dryRun}
            setDryRun={setDryRun}
            advancedSettings={advancedSettings}
            onChange={setAdvancedSettings}
            instantStart={instantStart}
            setInstantStart={setInstantStart}
            onClose={() => setAdvancedVisible(false)}
          />
        </div>
      </SideSheet>

      <SideSheet
        isShown={logsVisible}
        onCloseComplete={() => setLogsVisible(false)}
      >
        <div style={{ margin: 20 }}>
          <h3>Logs from last run</h3>

          <LogView logs={logs} fontSize={13} style={{ height: '100%' }} />
        </div>
      </SideSheet>

      <AccountsListDialog
        label="Unfollow accounts"
        isShown={unfollowUserListDialogShown}
        onCloseComplete={() => setUnfollowUserListDialogShown(false)}
        onConfirm={onUnfollowUserList}
      />
      <AccountsListDialog
        label="Follow accounts"
        isShown={followUserListDialogShown}
        onCloseComplete={() => setFollowUserListDialogShown(false)}
        onConfirm={onFollowUserList}
      />
    </div>
  );
});

export default App;
